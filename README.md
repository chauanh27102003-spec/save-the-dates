# Save the Dates — web test build

A mobile-first web prototype of the **Save the Dates** iOS app: two people, one
shared calendar view, one wishlist, one diary.

The whole thing runs in the browser with no backend. Accounts, calendars, Google
Maps and push notifications are simulated in `src/lib/` so the full flow can be
clicked through end to end before any of it is built for real.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. On a desktop browser the app is drawn inside a
phone frame; on a phone it fills the screen.

## Local mode vs cloud mode

Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` the app runs in **local
mode**: accounts and data live in one browser and nothing is shared. That is
enough to click through every flow, including pairing — sign up as the first
person, send a link request to the second address, sign out, sign up as the
second person and accept it.

For two real people on two phones, see [DEPLOY.md](DEPLOY.md): create a Supabase
project, run [`supabase/schema.sql`](supabase/schema.sql), then deploy to Vercel.

## The anti-cheating rules (the differentiator)

These are enforced in `src/lib/store.tsx` — and, once Supabase is wired up, by
the database itself in `supabase/schema.sql`:

1. **One account, one partner, permanently.** Linking with a second person is
   impossible; the only exit is deleting your account, which also deletes the
   shared wishlist, dates and diary. Pairing runs in a single transaction
   (`respond_pair_request`) so neither side can end up half-matched.
2. **One calendar account, one app account.** A Google or iCloud address can be
   bound to exactly one Save the Dates account, so a second, parallel date life
   cannot be run off the same calendar. It is *not* one address per calendar:
   most people keep their Google and iPhone calendar on the same address, and
   that address holds both of theirs. `calendar_links` is keyed on
   `(account_email, provider)`, and `link_calendar()` refuses an address that
   another account already claimed — without saying who holds it.
3. **One device, one account.** The session is remembered; signing in as someone
   else requires signing out first.

## Navigation

Four tabs — **Home · Dates | ✦ | Places · You** — two per side so the plan
button sits exactly on the centre line. The diary lives inside Dates (Upcoming /
Past / Diary) and the ranking inside Places (Wishlist / Ranking).

## What is implemented

- **Sign in by password or by email link** — password first, because sign-in
  links and codes come out of a small shared mail quota and a password sends
  nothing. Existing link users can set one from *You → Password*; forgotten ones
  go through a reset link. Remembered per device, sign out, delete account.
- **Linking is in-app, not by email** — sending a request writes it to the
  database, where it waits for whoever signs in with that address. Nothing
  emails the partner, so the sender gets a **Share the invite** action that
  copies (or opens the share sheet with) a link carrying the address.
- **Calendar permission** — Google Calendar and iPhone Calendar permission
  sheets, account binding, disconnect.
- **Wishlist** — search (mock Google Places), save with a Google Maps link,
  notes from both partners, favourites, ratings, and a ranking view.
- **Your own categories** — both the wishlist and the countdowns start from a
  built-in set and let either partner add their own (pick an emoji, name it).
  Custom categories are shared, filterable, and can only be deleted once nothing
  uses them.
- **Planning** — a four-step wizard: free-slot suggestions computed from both
  calendars, place search from the wishlist, an invitation template you can edit
  and add a photo to, then send.
- **Invitation** — blocking pop-up plus in-app notification for the partner,
  accept or decline with a message, choose Google or iPhone calendar on accept,
  and the event is written into both calendars.
- **After the date** — rate the place, write a shared diary entry with a photo,
  ratings sync back into the wishlist and feed a ranking leaderboard.
- **Countdowns** — days together, birthdays, anniversaries, custom dates, yearly
  repeats, and reminders that fire for both partners.
- **Bug reports** — *You → Report a problem*. Captures the screen you were on,
  app version, browser and viewport; saved on the device, copyable, and
  emailable when `VITE_FEEDBACK_EMAIL` is set.

## Where the fake parts live

Swap these modules when the real services are wired up; nothing else changes.

| File | Stands in for |
| --- | --- |
| `src/lib/calendar.ts` | Google Calendar `freebusy` / iOS EventKit, plus the slot-suggestion engine |
| `src/lib/places.ts` | Google Places autocomplete and details |
| `src/lib/store.tsx` | The backend: accounts, matching, invitations, notifications |

## Going to iOS

The screens are plain React and the rules live in `src/lib/`, separate from the
UI. Porting means rewriting `src/screens` and `src/components` in React Native
(or SwiftUI) and replacing the four modules above with real APIs — the domain
logic, types and flows carry over as-is.
