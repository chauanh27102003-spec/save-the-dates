# Going live: Supabase + Vercel

The app currently runs in **local mode** — accounts and data live in one
browser. To get two real people onto two real phones you need a backend. This
is the order to do it in.

Steps 1–3 are yours. Step 4 is mine (wiring the app to Supabase). Steps 5–7 are
yours again. Nothing here costs money; both free tiers are enough.

---

## 1. Create the Supabase project (≈5 minutes)

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. **New project**
   - Name: `save-the-dates`
   - Database password: generate one and save it in your password manager. You
     will not need it for the app, only for direct database access.
   - Region: **Southeast Asia (Singapore)** — closest to Vietnam.
3. Wait for provisioning (~2 minutes).

## 2. Create the tables

1. In the project, open **SQL Editor** → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) in this repo, copy the
   whole file, paste it into the editor, press **Run**.
3. You should see `Success. No rows returned`. Check **Table Editor** — five
   tables should be listed: `profiles`, `spaces`, `pair_requests`,
   `calendar_links`, `feedback`.

The file is safe to run again if you need to.

> **If your project was created before the calendar rule was corrected**, run
> [`supabase/migrate-calendar-per-provider.sql`](supabase/migrate-calendar-per-provider.sql)
> as well. `schema.sql` uses `create table if not exists`, so it will not
> restructure a table that already exists — and the old table keyed on
> `account_email` alone, which refused the second calendar on the address you
> already use for the first. A fresh project needs only `schema.sql`.

## 3. Check email sign-in and the redirect URLs

> There is **no "Magic Link" toggle** anywhere in the dashboard — magic links
> and email OTP are part of the Email provider and are on by default. If you
> went looking for that switch and could not find it, nothing is wrong.

1. **Authentication → Sign In / Providers → Email** — check that **Email** is
   enabled. **Confirm email** is on by default; see the password note below
   before you decide whether to leave it that way.
2. **Authentication → URL Configuration** — this is the part that actually
   matters. A magic link may only send the browser to a URL on this list.
   - Site URL: `http://localhost:5173` — a plain origin, **no `/**` glob**.
     You will change this to the Vercel domain in step 7.
   - Additional redirect URLs: `http://localhost:5173/**`
3. **Authentication → Emails → Magic Link** — add the 6-digit code to the
   template so there is a way in when the link itself fails (expired, already
   used, or opened in a different browser). Paste this as the template body:

   ```html
   <h2>Sign in to Save the Dates</h2>
   <p><a href="{{ .ConfirmationURL }}">Click here to sign in</a></p>
   <p>Or enter this code in the app: <b>{{ .Token }}</b></p>
   ```

   Without `{{ .Token }}` the email has no code in it and the code box in the
   app cannot help you.
4. **Project Settings → API**, copy these two values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Passwords, and why you probably want them

A Supabase project on the free tier sends a handful of auth emails per hour
through the shared sender. Sign-in links and 6-digit codes both come out of that
allowance, so a couple of testers can exhaust it in an afternoon and then nobody
can get in. The app therefore offers **Password** as the first sign-in method and
the email link as the second — a password sign-in sends no mail at all and has no
quota.

Two settings decide how that behaves:

- **Confirm email** (Authentication → Sign In / Providers → Email). Left **on**,
  creating an account still costs one email and the new account cannot sign in
  until it is opened; the app says so instead of pretending it worked. Turned
  **off**, signing up with a password works instantly and sends nothing. For a
  two-person app where you know both addresses, off is the sensible choice.
- **Authentication → URL Configuration** must already list your origin, because
  the password-reset link comes back to `/auth` the same way a magic link does.

Anyone who already signed in with a link can set a password from
**You → Password** without sending any email. Forgotten passwords use
**Forgot password?** on the sign-in screen, which does send one.

> The anon key is *designed* to sit in a browser bundle — it can only do what
> the row-level security policies allow. The **service_role** key on that same
> page is the opposite: it bypasses all security. Never put it in this project,
> in Vercel, or in a chat.

5. In the project folder, copy `.env.example` to `.env.local` and paste the two
   values in.

```bash
cp .env.example .env.local
```

## 4. ✅ Done — the app is wired to Supabase

`.env.local` is filled in and the app now runs in cloud mode. Verified against
your project: all five tables exist, RLS refuses anonymous reads, all five RPCs
answer correctly, the auth endpoint accepts the anon key, and the magic-link
verify endpoint honours `http://localhost:5173/auth` while refusing a redirect
to a domain that is not on the list.

### What still needs a human: the first real sign-in

Magic-link sign-in cannot be tested without an inbox, so this part is yours.

1. `npm run dev`, open <http://localhost:5173>.
2. Enter your email and a display name → **Email me a sign-in link**.
3. Open the email **on the same device and browser** you requested it from —
   the sign-in uses a PKCE code that only exists in that browser.
4. You should land on **Find your person**.

Then the two-person test, using a second browser profile (or a private window)
for the second account:

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Account A → send link request to B's email | "Request sent 💌" |
| 2 | Sign in as B in the other browser | Alpha's request waiting on /link |
| 3 | B accepts | Both land in the app, "Together for 0 days" |
| 4 | B connects a calendar, e.g. `b@gmail.com` | "Calendar connected ✅" |
| 5 | B connects their iPhone calendar with **the same** `b@gmail.com` | Accepted — one address, both of B's calendars |
| 5b | A tries to connect **the same** `b@gmail.com` | Refused — one calendar account, one app account |
| 6 | A plans a date and sends it | B's screen shows the pop-up **without reloading** |
| 7 | B accepts | A sees "B said yes" live |
| 8 | Sign out on A, sign in with a third email, request B | Refused — B already matched |

If any step misbehaves, use **You → Report a problem** and send me the report —
it captures the exact screen and browser.

> Email limits: Supabase's built-in mailer sends about **3 messages per hour**
> on the free tier, which the test above can hit. When you need more, add a free
> Resend account under *Authentication → Emails → SMTP Settings*.

---

## 5. Put the code on GitHub

A repo is already initialised locally with a first commit. Create an empty repo
on GitHub (no README, no .gitignore), then:

```bash
git remote add origin https://github.com/<your-username>/save-the-dates.git
git branch -M main
git push -u origin main
```

`.env.local` is git-ignored, so your keys stay off GitHub.

## 6. Deploy on Vercel

1. <https://vercel.com> → sign in with GitHub → **Add New… → Project**.
2. Import `save-the-dates`. Vercel detects Vite on its own — leave the build
   settings alone (`npm run build`, output `dist`).
3. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your anon public key |
   | `VITE_FEEDBACK_EMAIL` | the address bug reports should be emailed to |

   Apply each to **Production, Preview and Development**.
4. **Deploy**. You get a URL like `save-the-dates-xxxx.vercel.app`.

Vite only exposes variables that start with `VITE_`, and it reads them at build
time — after changing any of them you must **redeploy**, not just reload.

## 7. Point Supabase at the live URL

Back in Supabase → **Authentication → URL Configuration**:

- Site URL: `https://your-app.vercel.app`
- Additional redirect URLs: add `https://your-app.vercel.app/**` and keep
  `http://localhost:5173/**` so local development still works.

Miss this and the sign-in link in the email will bounce people to localhost.

## 8. Install it on the iPhone

Open the Vercel URL in Safari → Share → **Add to Home Screen**. It launches
full-screen without browser chrome, which is the closest thing to the real app
until the React Native build exists.

---

## Still simulated after all this

Being straight about what a green deploy does *not* buy you:

- **Google Calendar and iPhone Calendar** are still mock data. Real free/busy
  needs a Google Cloud project with the Calendar API and an OAuth consent
  screen, and on iOS it needs EventKit — which only exists in a native app.
- **Google Maps place search** still uses the built-in list of Hanoi places.
  Real search needs a Google Cloud billing account and a Places API key.
- **Push notifications** are in-app only. Real push needs a native app.

These are worth doing in that order once two people have actually used the app
for a couple of weeks and the flows have survived contact with reality.
