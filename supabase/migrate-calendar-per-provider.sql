-- Run this once on a project that was created before the calendar rule was
-- corrected. A fresh project gets all of it from schema.sql instead.
--
-- The old table made account_email the primary key, which read as "one
-- calendar account, one app account" but actually meant "one calendar, one
-- address". Google Calendar and iPhone Calendar normally sit on the same
-- address, so connecting the second one failed on the primary key — the rule
-- was rejecting the ordinary case it was never meant to catch.
--
-- Safe to run twice.

begin;

-- 1. Key on the address *and* the provider, so one address can hold both of
--    its own calendars.
alter table public.calendar_links drop constraint if exists calendar_links_pkey;
alter table public.calendar_links
  add constraint calendar_links_pkey primary key (account_email, provider);

-- 2. Still one Google and one iPhone calendar per account.
alter table public.calendar_links drop constraint if exists calendar_links_user_id_provider_key;
alter table public.calendar_links
  add constraint calendar_links_user_id_provider_key unique (user_id, provider);

create index if not exists calendar_links_user_idx on public.calendar_links (user_id);

-- 3. With the address no longer unique on its own, a direct insert could claim
--    an address another account owns. Route every link through the RPC.
drop policy if exists calendar_links_insert on public.calendar_links;

create or replace function public.link_calendar(
  p_provider text,
  p_email    text,
  p_scopes   text[] default '{}'
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  clean text := lower(trim(p_email));
  label text := case p_provider when 'google' then 'Google' else 'iPhone' end;
  taken uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_provider not in ('google', 'ios') then
    raise exception 'Unknown calendar provider.';
  end if;
  if clean !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid calendar account.';
  end if;

  perform pg_advisory_xact_lock(hashtext(clean));

  select user_id into taken
    from public.calendar_links
   where account_email = clean and user_id <> auth.uid()
   limit 1;
  if taken is not null then
    raise exception 'That calendar account is already linked to another Save the Dates account. One calendar account, one app account.';
  end if;

  if exists (
    select 1 from public.calendar_links
     where user_id = auth.uid() and provider = p_provider
  ) then
    raise exception 'You already linked a % calendar. Disconnect it first.', label;
  end if;

  insert into public.calendar_links (account_email, user_id, provider, scopes)
  values (clean, auth.uid(), p_provider, coalesce(p_scopes, '{}'));
end;
$$;

grant execute on function public.link_calendar(text, text, text[]) to authenticated;

commit;
