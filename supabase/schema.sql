-- ============================================================================
-- Save the Dates — database schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------- spaces
-- One row per couple. `data` holds the shared payload (places, dates,
-- reviews, milestones, categories, busy blocks, notifications) as a single
-- JSON document, so the app's existing rules keep working unchanged.
-- `version` gives us optimistic concurrency: two partners editing at the
-- same moment cannot silently overwrite each other.
create table if not exists public.spaces (
  id          uuid primary key default gen_random_uuid(),
  version     integer     not null default 1,
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- --------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null default '',
  emoji       text not null default '🌷',
  color       text not null default '#e8637a',
  -- One account, one partner. Set only by respond_pair_request().
  partner_id  uuid references public.profiles(id) on delete set null,
  space_id    uuid references public.spaces(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists profiles_space_idx on public.profiles (space_id);

-- ---------------------------------------------------------- pair_requests
create table if not exists public.pair_requests (
  id            uuid primary key default gen_random_uuid(),
  from_user_id  uuid not null references public.profiles(id) on delete cascade,
  from_email    text not null,
  from_name     text not null default '',
  to_email      text not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at    timestamptz not null default now()
);

create index if not exists pair_requests_to_idx on public.pair_requests (to_email);
create unique index if not exists pair_requests_one_pending
  on public.pair_requests (from_user_id, to_email)
  where status = 'pending';

-- --------------------------------------------------------- calendar_links
-- account_email is the PRIMARY KEY on purpose. A Google or iCloud account can
-- belong to exactly one Save the Dates account — this is the anti-cheating
-- rule, enforced by the database rather than by the client.
create table if not exists public.calendar_links (
  account_email text primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  provider      text not null check (provider in ('google', 'ios')),
  scopes        text[] not null default '{}',
  connected_at  timestamptz not null default now(),
  -- ...and one Google calendar + one iPhone calendar per account.
  unique (user_id, provider)
);

-- --------------------------------------------------------------- feedback
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('bug', 'idea', 'other')),
  message     text not null,
  screen      text not null default '',
  app_version text not null default '',
  user_agent  text not null default '',
  viewport    text not null default '',
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- Helpers. SECURITY DEFINER so that policies on `profiles` can read `profiles`
-- without recursing into their own row-level security.
-- ============================================================================

create or replace function public.my_email()
returns text language sql stable security definer set search_path = public as $$
  select email from public.profiles where id = auth.uid();
$$;

create or replace function public.my_partner_id()
returns uuid language sql stable security definer set search_path = public as $$
  select partner_id from public.profiles where id = auth.uid();
$$;

create or replace function public.my_space_id()
returns uuid language sql stable security definer set search_path = public as $$
  select space_id from public.profiles where id = auth.uid();
$$;

-- Create the profile row the moment someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row level security
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.spaces         enable row level security;
alter table public.pair_requests  enable row level security;
alter table public.calendar_links enable row level security;
alter table public.feedback       enable row level security;

-- profiles: you see yourself and your partner, nobody else.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or id = public.my_partner_id());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Column grants stop a client from writing partner_id / space_id directly;
-- only respond_pair_request() may change who you are matched with.
revoke update on public.profiles from authenticated;
grant update (name, emoji, color) on public.profiles to authenticated;

-- spaces: only the two members of that space.
drop policy if exists spaces_select on public.spaces;
create policy spaces_select on public.spaces
  for select using (id = public.my_space_id());

drop policy if exists spaces_update on public.spaces;
create policy spaces_update on public.spaces
  for update using (id = public.my_space_id()) with check (id = public.my_space_id());

-- pair_requests: the sender and the addressee. Writes go through the RPCs.
drop policy if exists pair_requests_select on public.pair_requests;
create policy pair_requests_select on public.pair_requests
  for select using (from_user_id = auth.uid() or to_email = public.my_email());

-- calendar_links: yours, plus read access to your partner's so the app can
-- compare free/busy. A link for an email someone else owns fails on the
-- primary key — without revealing who owns it.
drop policy if exists calendar_links_select on public.calendar_links;
create policy calendar_links_select on public.calendar_links
  for select using (user_id = auth.uid() or user_id = public.my_partner_id());

drop policy if exists calendar_links_insert on public.calendar_links;
create policy calendar_links_insert on public.calendar_links
  for insert with check (user_id = auth.uid());

drop policy if exists calendar_links_delete on public.calendar_links;
create policy calendar_links_delete on public.calendar_links
  for delete using (user_id = auth.uid());

-- feedback: your own reports only.
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
  for insert with check (user_id = auth.uid());

drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
  for select using (user_id = auth.uid());

drop policy if exists feedback_delete on public.feedback;
create policy feedback_delete on public.feedback
  for delete using (user_id = auth.uid());

-- ============================================================================
-- RPCs. Anything that touches two accounts at once lives here so it happens
-- atomically and cannot be forged by a client.
-- ============================================================================

-- Look up a would-be partner without exposing the user directory.
create or replace function public.find_partner_candidate(p_email text)
returns table (found boolean, display_name text, already_matched boolean)
language plpgsql stable security definer set search_path = public as $$
declare target public.profiles;
begin
  select * into target from public.profiles where email = lower(trim(p_email));
  if not found then
    return query select false, null::text, false;
  else
    return query select true, target.name, target.partner_id is not null;
  end if;
end;
$$;

create or replace function public.send_pair_request(p_email text)
returns public.pair_requests
language plpgsql security definer set search_path = public as $$
declare
  me     public.profiles;
  target public.profiles;
  req    public.pair_requests;
  clean  text := lower(trim(p_email));
begin
  select * into me from public.profiles where id = auth.uid();
  if not found then raise exception 'Not signed in'; end if;
  if me.email = clean then raise exception 'You cannot match with yourself'; end if;
  if me.partner_id is not null then
    raise exception 'You are already matched. One account, one person.';
  end if;

  select * into target from public.profiles where email = clean;
  if found and target.partner_id is not null then
    raise exception '% is already matched with someone else.', target.name;
  end if;

  insert into public.pair_requests (from_user_id, from_email, from_name, to_email)
  values (me.id, me.email, me.name, clean)
  returning * into req;

  return req;
end;
$$;

create or replace function public.respond_pair_request(p_id uuid, p_accept boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me        public.profiles;
  other     public.profiles;
  req       public.pair_requests;
  new_space uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if not found then raise exception 'Not signed in'; end if;

  select * into req from public.pair_requests where id = p_id for update;
  if not found or req.status <> 'pending' then
    raise exception 'That request is no longer available.';
  end if;
  if req.to_email <> me.email then
    raise exception 'That request is not addressed to you.';
  end if;

  if not p_accept then
    update public.pair_requests set status = 'declined' where id = p_id;
    return null;
  end if;

  select * into other from public.profiles where id = req.from_user_id;
  if not found then raise exception 'That account no longer exists.'; end if;
  if other.partner_id is not null or me.partner_id is not null then
    raise exception 'One of you is already matched.';
  end if;

  insert into public.spaces (data)
  values (jsonb_build_object(
    'couple',        jsonb_build_object('since', to_char(current_date, 'YYYY-MM-DD')),
    'places',        '[]'::jsonb,
    'dates',         '[]'::jsonb,
    'reviews',       '[]'::jsonb,
    'milestones',    '[]'::jsonb,
    'categories',    '[]'::jsonb,
    'busy',          '[]'::jsonb,
    'notifications', '[]'::jsonb
  ))
  returning id into new_space;

  update public.profiles set partner_id = other.id, space_id = new_space where id = me.id;
  update public.profiles set partner_id = me.id,    space_id = new_space where id = other.id;
  update public.pair_requests set status = 'accepted' where id = p_id;

  -- Every other pending request involving either of them is moot now.
  update public.pair_requests set status = 'cancelled'
   where status = 'pending'
     and id <> p_id
     and (from_user_id in (me.id, other.id) or to_email in (me.email, other.email));

  return new_space;
end;
$$;

-- Optimistic save. Returns the new version, or raises when the partner wrote
-- first — the client then refetches and replays its change.
create or replace function public.save_space(p_id uuid, p_version integer, p_data jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare next_version integer;
begin
  if p_id is distinct from public.my_space_id() then
    raise exception 'Not a member of that space.';
  end if;

  update public.spaces
     set data = p_data, version = version + 1, updated_at = now()
   where id = p_id and version = p_version
  returning version into next_version;

  if not found then
    raise exception 'conflict' using errcode = '40001';
  end if;

  return next_version;
end;
$$;

-- Deleting an account unlinks the partner and destroys the shared space.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if not found then return; end if;

  if me.partner_id is not null then
    update public.profiles set partner_id = null, space_id = null where id = me.partner_id;
  end if;
  if me.space_id is not null then
    delete from public.spaces where id = me.space_id;
  end if;

  delete from auth.users where id = me.id;  -- cascades to profiles and children
end;
$$;

grant execute on function public.find_partner_candidate(text) to authenticated;
grant execute on function public.send_pair_request(text)      to authenticated;
grant execute on function public.respond_pair_request(uuid, boolean) to authenticated;
grant execute on function public.save_space(uuid, integer, jsonb)    to authenticated;
grant execute on function public.delete_my_account()          to authenticated;

-- ============================================================================
-- Realtime: push the partner's changes to the other device.
-- ============================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.spaces;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.pair_requests;
  exception when duplicate_object then null;
  end;
end
$$;
