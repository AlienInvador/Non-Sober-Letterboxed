# Food spots, password login, and audit pass — design

Date: 2026-11-24 · Branch: feat/afterhours

## Intent

geeked-drunk is a social log for movies people watched drunk, high, or both. It is going to a closed beta. Before that, it grows in two ways:

1. **Food spots.** People log restaurants and food places they hit drunk or high, exactly like a movie sesh. A food log stands alone: it is not attached to a movie night. Movie and food logs appear together in the friends feed ("the couch", `app/(app)/page.tsx`), crew feeds and profiles.
2. **Username/password login.** Email + password through Supabase Auth replaces magic-link only login. Beta testers can sign in without waiting on an email every time.

In parallel, a design/animation/bug **audit pass** fixes AI-looking UI, motion and bugs.

## Goals

- One critic system for both kinds of log: same `influence` (drunk/high/both/sober), same `recommend` (would recommend, null when sober), same review, visibility, crew, companions/tags and cheers.
- Place search through Photon (komoot, free, OpenStreetMap data, no API key).
- Schema normalized so the place data source can change later (Foursquare, Google) without touching sessions.
- Email + password sign-up and log-in, plus forgot/reset password.
- Feed, crew feed and profile render movie and place logs in one list, in time order.

## Non-goals (this round)

- Lists, queue, recommendations ("send rec"), "hitting tonight", Discover's ranked rows and the command palette stay movie-only. They are guarded so place seshes never break them (filter `tmdb_id is not null`).
- No place photos, hours, menus or ratings from outside sources.
- No map view, addresses or per-location spots.
- No invite codes or beta waitlist. Anyone past the 21+ age gate can sign up.
- No Google/OAuth login.
- No Resend/custom SMTP setup now. The user will do that later.

## Anti-goals

- Two parallel critic systems. Movies and places must behave the same.
- Losing or breaking any existing movie sesh, cheer or tag.
- Exposing other users' emails (for example through a username to email lookup).

## Constraints

- Supabase built-in email: **2 emails/hour per project**. Sign-up confirmations and password resets both count against it. User accepts this for now. Recommendation for the user: turn off "Confirm email" in the cloud dashboard during beta (Authentication → Sign In / Providers → Email). Local `supabase/config.toml` already has `enable_confirmations = false`.
- Photon fair-use: no heavy bulk traffic. Debounce search on the client and proxy through our own route.
- Existing RLS, pgTAP tests (99 assertions) and Playwright e2e must stay green and be extended.
- Next.js app router + server actions + Supabase SSR, as today.

## Approaches considered

- **A. One `sessions` table; each row points at a movie or a place (chosen).** Add a `places` table. `sessions.tmdb_id` becomes nullable and `sessions.place_id` is added, with `check (num_nonnulls(tmdb_id, place_id) = 1)`. Cheers, companions, RLS and feeds already hang off `sessions`, so they keep working. Cost: code that assumes `tmdb_id` needs a guard.
- B. A separate `place_sessions` table. Rejected: it duplicates cheers, tags, RLS and stats, and the feed must merge two tables.
- C. A generic `items` supertype under both movies and places. Rejected for now: it rewrites keys on lists, queue, recs and list_items before beta. Approach A can migrate to C later if lists/queue ever need places.

The user picked A and asked that it be properly normalized for future tweaks.

## Design

### Data model (new migration `20261124000013_places.sql`)

A spot is a **brand or name, not a location**. Every Taco Bell is one spot; there are no addresses or coordinates. Two unrelated places that share a name (two "Joe's Pizza") merge into one spot. That's an accepted limit for beta. Future work: split by OSM `brand:wikidata` or let a spot carry a city when collisions show up in real data.

```sql
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- identity: letters/digits only, lowercased, so "Taco Bell", "TacoBell", "taco-bell" and "McDonald's"/"McDonalds" merge
  name_key text generated always as (lower(regexp_replace(name, '[^[:alnum:]]', '', 'g'))) stored unique check (name_key <> ''),
  category text,                     -- optional: fast_food, restaurant, cafe, bar, ... (from Photon when picked)
  created_at timestamptz not null default now()
);

alter table public.sessions alter column tmdb_id drop not null;
alter table public.sessions add column place_id uuid references public.places(id);
alter table public.sessions add constraint sessions_subject_one check (num_nonnulls(tmdb_id, place_id) = 1);
create index on public.sessions (place_id) where place_id is not null;
```

- `places` RLS: authenticated can select. There is no client insert. The server action does `upsert ... on conflict (name_key) do nothing` and then selects the id, through the admin client the same way `ensureMovieCached` works. The first spelling wins the display name.
- Normalization: a spot's identity lives only in `places`. Sessions reference it by `place_id`. A later move to brand ids (for example OSM `brand:wikidata`) only adds a column to `places`.
- `watched_on` keeps its column name. The UI says "date" or "went" for places.
- `rewatch` means "been before" for places. Same column, different label.
- New view `place_influence_stats`, mirroring `movie_influence_stats` (public seshes only, grouped by `place_id, influence`). `movie_influence_stats` gets `where tmdb_id is not null`.
- Existing movie rows are untouched. All have `tmdb_id` set, so the check holds.

### Spot search

- New route `app/api/places/search/route.ts` (GET `?q=`), the sibling of `app/api/tmdb/search`. It needs a signed-in user. It runs in parallel:
  1. Existing spots in our `places` table matching the name (`ilike`), so names already used rank first and spelling stays consistent.
  2. Photon `https://photon.komoot.io/api/?q=…&limit=15&lang=en`, filtered to food `osm_tag`s (`amenity:restaurant|fast_food|cafe|bar|pub|ice_cream|food_court`, `shop:bakery|deli|confectionery`). It sends a generic User-Agent, **no location bias**, and dedupes by normalized name.
- **Spelling fix:** the existing-spot lookup uses `pg_trgm` similarity on `name_key` (extension `pg_trgm` and a GIN trigram index), so "taco bel" or "tacobel" still surfaces "Taco Bell" first. The user picks it rather than creating a typo spot.
- A wrong display name can be corrected in the Supabase table editor (`places.name`) during beta. No admin UI.
- It returns `{ name, category, placeId? }[]`, at most 8 entries.
- The user can also save the exact text they typed ("use 'Grandma's basement wings'"), so a spot Photon doesn't know still works.
- Trust: the client only sends a name and an optional category. Those are validated (1–80 chars; the category must be in the allowed set or null). Nothing location-specific can be forged, so no signing is needed.

### Logging (UI)

- `components/log-sheet.tsx` gets a **Movie / Food** toggle at the top. Food swaps the TMDB search for place search. Everything below (influence, recommend, review, visibility, crew, companions, date, been-before) is shared.
- `lib/session-schema.ts`: input carries either `tmdbId` or `place: { name, category }`, refined so exactly one is present.
- `actions/sessions.ts#createSession`: branches only on caching (`ensureMovieCached` vs `ensurePlaceCached`), then inserts with `tmdb_id` or `place_id`.
- Tag approval ("they approve it as their own") works for place seshes too: the re-log pre-fills the same place.

### Reading (feed, crew, profile, tags)

- `FeedItem` gets a discriminated subject: `subject: { kind: 'movie'; movie: MovieSummary } | { kind: 'place'; place: PlaceSummary }`. Queries in `lib/queries/feed.ts`, `profile.ts`, `crews.ts`, `tags.ts` select both `movies(...)` and `places(...)` and map whichever is present, instead of dropping rows with no movie.
- `components/session-card.tsx` renders a poster for movies and a place tile for places (name, category icon), linking to the place page.
- New page `app/(app)/place/[id]/page.tsx`: name, category, "how it hits" breakdown by influence (reusing `how-it-hits` with `place_influence_stats`), and friends' logs. Includes a "log this spot" button.
- Profile stats (`lib/profile-stats.ts`) count movies and spots separately where shown.

### Discover trending

- `getDiscover` trending becomes one **mixed list**: friends' recent seshes (current tab's 14-day window, as now) are grouped by movie **or** spot. Each group is scored by distinct friend count, and the top 8 are shown together. Each item carries `kind: 'movie' | 'place'`.
- `Trending` type: `{ subject: Subject; friendCount: number }`, using the same `Subject` union as `FeedItem`.
- UI: the existing trending strip renders posters for movies and the place tile for spots, in one row. Nothing else on Discover changes.

### Auth

- `app/auth/login/page.tsx`: email + password form (`signInWithPassword`), with links to "create account" and "forgot password".
- New `app/auth/signup/page.tsx`: email + password (min 8 chars) via `signUp` with `emailRedirectTo` → `/auth/callback`. If confirmations are on, show "check your email". If off, the session exists, so go to onboarding, which already collects username and birthdate.
- New `app/auth/reset/page.tsx`: request a reset (`resetPasswordForEmail`, redirect to `/auth/callback?next=/auth/update-password`). New `app/auth/update-password/page.tsx` calls `updateUser({ password })`.
- Magic link is removed from the UI. `app/auth/callback` stays for confirmation and recovery links (it already honors `safeNext`).
- Middleware: `/auth/signup`, `/auth/reset` and `/auth/update-password` sit behind the age gate like `/auth/login`. `update-password` requires a session.
- **Existing magic-link users (my call):** `/auth/update-password` also works for any signed-in user, linked from their own profile as "set password". Anyone still signed in sets a password there with no email. Anyone signed out uses "forgot password".
- Username is chosen at onboarding, as today. Login is by email. No username to email lookup, so emails are never exposed.
- Local `supabase/config.toml`: `minimum_password_length = 8`.

### Settings page (`app/(app)/settings/page.tsx`)

- Change password while signed in (`updateUser({ password })`, no email).
- "Email me a reset link" (`resetPasswordForEmail`), for anyone who prefers that route.
- Change email (`updateUser({ email })`). This sends a confirmation email, so it counts against the 2/hour limit.
- Default visibility for new seshes. A new column `profiles.default_visibility visibility not null default 'friends'`, which the log sheet pre-selects.
- Sign out (the existing `signOut` action).
- Delete account. A danger zone at the bottom, kept apart from the other actions. The user types their username to confirm. A server action uses the admin client's `auth.admin.deleteUser(me)`, and existing `on delete cascade` FKs remove the profile, seshes, cheers, tags, lists, queue, recs, friendships and memberships. `places` and `movies` stay. The plan must verify every FK to profiles cascades or sets null, so the delete never fails halfway. Afterwards: sign out and redirect to `/`.
- Linked from the nav and from the user's own profile.
- Spelling policy for spots: auto-merge only on case, whitespace and punctuation (via `name_key`). Bigger typos are never merged automatically. Trigram search suggests the existing spot instead.

### Terms and privacy (`app/terms/page.tsx`, `app/privacy/page.tsx`)

- Plain-language **beta drafts**, with a visible "beta draft, not reviewed by a lawyer" note. They must get legal review before a public launch.
- Terms cover: 21+ only; users own their content and grant the app a license to display it; no content promoting drunk driving, illegal sales or harassment; cannabis laws vary by location and the user is responsible for following local law; the app gives no medical or safety advice; we can remove content and accounts; the beta is provided as-is; account deletion.
- Privacy covers: what we collect (email, username, birthdate, logs, reviews, friendships), why, who processes it (Supabase hosting, Netlify hosting, Photon/komoot for search queries, TMDB for movie data), no selling of data, visibility settings, deletion through Settings, and a contact email (placeholder for the user to fill in).
- Required attributions in the footer and on the pages: TMDB ("This product uses the TMDB API but is not endorsed or certified by TMDB") and OpenStreetMap ("© OpenStreetMap contributors").
- Sign-up shows a required "I'm 21+ and agree to the Terms and Privacy Policy" checkbox with links. Both pages are public: no login, and they sit outside the age gate.

### Tests

- pgTAP: `places` RLS (select allowed, client insert denied); the sessions subject check (both null and both set are rejected); place seshes obey the same visibility RLS; `place_influence_stats` exposes only public seshes.
- Unit: `sessionInput` exactly-one refinement; Photon mapper/filter/dedupe; mixed trending ranking. pgTAP also checks that `name_key` merges "Taco Bell" and " taco  bell".
- E2E: settings change password then log in with the new one; delete account removes the user and their seshes; /terms and /privacy load signed out.
- E2E: log a food spot (Photon mocked via route interception) and see it in the feed, on the profile and in Discover trending; sign up, log out, and log back in with a password. Update `tests/e2e/global-setup.ts` if it relies on magic link.

### Audit pass (parallel)

- A separate agent in its own git worktree runs the unslop, UX/animation and polish skills plus a ponytail audit across the app, then commits fixes on its own branch.
- To avoid merge conflicts it does **not** edit `components/log-sheet.tsx`, `components/session-card.tsx`, `app/auth/**` or `lib/queries/**`, which the places/auth work rewrites. It reports findings for those files instead, and they are folded in after the merge.
- Results merge into feat/afterhours after the places/auth work lands, then all checks rerun.
- The plan includes launching the audit agent at the start, merging its branch, and folding the reported findings into the files above (my call; the user asked for it in parallel).

## Left to the builder

- Exact Photon tag list, how category maps to icons, and the search result ordering.
- Place tile visual and the place page layout, within the existing design tokens (`design/tokens`).
- Whether `ensurePlaceCached` uses the admin client or a security-definer RPC (match whichever `ensureMovieCached` uses).
- Copy for the toggle, labels and empty states, in the existing brand voice.

## Deploy notes

- Apply the migration to cloud Supabase (same flow as migration 0012), then run cloud pgTAP.
- The user must decide on "Confirm email" in the cloud dashboard. With it on, beta sign-ups are throttled to about 2/hour until Resend is set up.
