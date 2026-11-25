# Food Spots, Password Auth, Settings, Legal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Food spots become a second kind of sesh beside movies, with the same critic system. Login moves to email + password, and the app gains a settings page and beta terms/privacy pages. A parallel audit pass fixes design, motion and bugs.

**Architecture:** One `sessions` table whose row points at exactly one of `movies` (tmdb_id) or `places` (place_id). A place is a name-level brand identity keyed by a generated `name_key`. Readers map rows to a `Subject` union (`movie` | `place`), so feed, profile, tags and trending render both. Auth stays on Supabase Auth with password methods. The audit runs as a separate agent in its own git worktree.

**Tech Stack:** Next.js 15 app router, server actions, Supabase (Postgres, RLS, Auth, `@supabase/ssr`), zod 4, Tailwind 4, motion, radix-ui, vitest, Playwright, pgTAP (`npm run test:db`).

**Spec:** `docs/superpowers/specs/2026-11-24-food-spots-and-password-auth-design.md`

## Global Constraints

- Influence values stay `drunk | high | both | sober`. `recommend` is null iff sober (existing refine in `lib/session-schema.ts`).
- Every `sessions` row: `num_nonnulls(tmdb_id, place_id) = 1`.
- `places.name`: 1–80 chars after trim. `name_key = lower(regexp_replace(name, '[^[:alnum:]]', '', 'g'))`, unique, not empty.
- Place categories allowed: `restaurant, fast_food, cafe, bar, pub, ice_cream, food_court, bakery, deli, confectionery`, or null.
- Photon endpoint `https://photon.komoot.io/api/?q=…&limit=15&lang=en`, no location bias, generic User-Agent `geeked-drunk/0.1`, 3s timeout.
- Search returns at most 8 results; existing spots come before Photon results.
- Password minimum: 8 chars (`supabase/config.toml` `minimum_password_length = 8`; same check client-side).
- Lists, queue, recs, hitting tonight, Discover ranked rows, command palette and the movie page stay movie-only and must ignore place seshes.
- Legal pages show "Beta draft, not reviewed by a lawyer". The contact email is the literal placeholder `contact@REPLACE-ME.example`.
- Attribution strings, verbatim: "This product uses the TMDB API but is not endorsed or certified by TMDB." and "© OpenStreetMap contributors".
- Copy uses the existing lowercase brand voice. UI uses only `design/tokens` colors and the existing Tailwind tokens.
- The audit worktree must not edit `components/log-sheet.tsx`, `components/session-card.tsx`, `app/auth/**` or `lib/queries/**`.
- Never run `git add`, `git commit`, `git merge` or `git push`. The user stages and commits everything. Agents only write code and run checks.

## Review Focus

1. Photon down or slow: search still returns our own spots, and saving a typed name still works (Task 3 test `search degrades to db hits`).
2. A name that normalizes to empty (`"🌮"`, `"!!!"`) gets a friendly validation error, not a 500 or a DB error (Task 4 test).
3. Movie-only readers (hitting tonight, crew top picks, movie page, Discover rows) never crash or show null rows once place seshes exist (Task 2 pgTAP on the stats view; Task 8 e2e loads /discover and a crew page after logging a spot).
4. Delete account on a user who owns a crew, lists, queue, recs, tags and cheers fully succeeds (Task 10 pgTAP cascade test).
5. Approving a tag on a place sesh opens the log sheet prefilled with that place (Task 6 e2e).

---

### Task 0: Launch the audit agent (controller does this, no code)

- [ ] **Step 1:** Dispatch one background agent with `isolation: "worktree"` on branch `audit/polish`. Prompt: run the `charles-unslop`, `charles-ux-animation`, `charles-polish` and `ponytail:ponytail-audit` skills across `app/`, `components/` and `design/`. Fix what they find. Run `npx tsc --noEmit`, `npm test` and `npm run build` until green. Do not stage or commit; leave changes in the worktree for the user. It must NOT edit `components/log-sheet.tsx`, `components/session-card.tsx`, `app/auth/**` or `lib/queries/**`; findings for those go into `docs/superpowers/audit-2026-11-24.md`. Report the branch name and a findings summary.
- [ ] **Step 2:** Continue with Task 1 without waiting.

### Task 1: Places schema, subject check, stats, search RPC, default visibility

**Files:**
- Create: `supabase/migrations/20261124000013_places.sql`
- Create: `supabase/tests/places.test.sql`
- Modify: `supabase/config.toml` (`minimum_password_length = 8`)

**Interfaces:**
- Produces: table `public.places(id uuid, name text, name_key text, category text, created_at)`; `sessions.place_id uuid null`; `sessions.tmdb_id` nullable; constraint `sessions_subject_one`; view `place_influence_stats(place_id, influence, log_count, recommend_pct)`; function `public.search_places(q text) returns setof public.places` (stable, security invoker, max 8, ordered by `similarity(name_key, <normalized q>) desc`, matching `name_key % key or name_key like key || '%'`); column `profiles.default_visibility visibility not null default 'friends'`.

- [ ] **Step 1: Write `supabase/tests/places.test.sql`** (same harness style as `supabase/tests/tags.test.sql`: `mk_user`, `set local role authenticated`, jwt claims). Assertions:
  - `throws_ok` inserting a session with both `tmdb_id` and `place_id` null → `23514`
  - `throws_ok` inserting a session with both set → `23514`
  - `throws_ok` inserting place `'Taco Bell'` then `' taco-bell '` → `23505` (name_key merge)
  - `throws_ok` inserting place named `'🌮'` → `23514`
  - `is((select name_key from places where name = 'McDonald''s'), 'mcdonalds')`
  - as authenticated: `lives_ok` select from places; `throws_ok` insert into places → `42501`
  - a friends-visibility place sesh by alice is visible to friend bob and not to stranger carol
  - `place_influence_stats` counts only public seshes; `movie_influence_stats` returns no row with null `tmdb_id`
  - `search_places('tacobel')` returns the Taco Bell row first
  - `profiles.default_visibility` defaults to `'friends'`
- [ ] **Step 2:** Run `npm run test:db`. Expected: `places.test.sql` fails (relation "places" does not exist).
- [ ] **Step 3: Write the migration.** Use the DDL from the spec's Data model section with the updated `name_key` expression. Add `create extension if not exists pg_trgm with schema extensions` and `create index places_name_key_trgm on places using gin (name_key extensions.gin_trgm_ops)`. Enable RLS on places with a select policy for `authenticated`, and grant select only. Recreate `movie_influence_stats` with `where visibility = 'public' and tmdb_id is not null`, keeping the existing revoke/grant. Create `place_influence_stats` the same way (without `avg_rating`). Write `search_places`, and grant execute to authenticated.
- [ ] **Step 4:** Run `npx supabase db reset` then `npm run test:db`. Expected: all files pass, and the existing 99 assertions are still green.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat(db): places table, movie-or-place sesh, spot search`).

### Task 2: Shared subject type and place helpers

**Files:**
- Create: `lib/subject.ts`, `lib/places.ts`
- Test: `tests/unit/places.test.ts`

**Interfaces:**
- Produces (`lib/subject.ts`):
  - `type PlaceSummary = { id: string; name: string; category: string | null }`
  - `type Subject = { kind: 'movie'; movie: MovieSummary } | { kind: 'place'; place: PlaceSummary }`
  - `const SUBJECT = 'movies(tmdb_id, title, year, poster_path), places(id, name, category)'` (select fragment)
  - `subjectOf(row: { movies?: unknown; places?: unknown }): Subject | null`
  - `subjectHref(s: Subject): string` → `/movie/<tmdbId>` or `/place/<id>`
  - `subjectTitle(s: Subject): string`
- Produces (`lib/places.ts`, no `server-only`; pure helpers):
  - `PLACE_CATEGORIES` (readonly tuple from Global Constraints)
  - `type PlaceCategory`
  - `nameKey(name: string): string` (JS mirror of the SQL expression, using `/[^\p{L}\p{N}]/gu`)
  - `type SpotHit = { name: string; category: PlaceCategory | null; placeId?: string }`
  - `mapPhoton(json: unknown): SpotHit[]` (keeps features with `properties.name`; category = `osm_value` if it is in `PLACE_CATEGORIES`, else null; dedupes by `nameKey`)
  - `mergeHits(db: SpotHit[], photon: SpotHit[], max = 8): SpotHit[]` (db first, photon minus db keys)

- [ ] **Step 1: Write tests:**
  - `nameKey("Taco Bell") === nameKey(" taco-bell ") === "tacobell"`
  - `nameKey("McDonald's") === "mcdonalds"`
  - `nameKey("Café Lulu") === "cafélulu"`
  - `nameKey("🌮") === ""`
  - `mapPhoton` on a fixture with two "Wingstop" features plus one unnamed → one hit, `category: 'fast_food'`
  - `mergeHits([{name:'Taco Bell',placeId:'x',category:null}], [{name:'taco bell',category:'fast_food'},{name:'Chipotle',category:'fast_food'}])` → `['Taco Bell','Chipotle']`
  - `subjectOf({movies:null, places:{id:'p',name:'N',category:null}})?.kind === 'place'`
  - `subjectOf({movies:null, places:null}) === null`
- [ ] **Step 2:** Run `npx vitest run tests/unit/places.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement both files.
- [ ] **Step 4:** Rerun. Expected: PASS.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: subject and place helpers`).

### Task 3: Spot search route

**Files:**
- Create: `app/api/places/search/route.ts`
- Modify: `lib/supabase/middleware.ts` (treat `/api/places` like `/api/tmdb`: behind `age_ok`, no login redirect)
- Test: `tests/unit/places-route.test.ts` (mirror `tests/unit/tmdb-route.test.ts` mocking style)

**Interfaces:**
- Consumes: `mapPhoton`, `mergeHits`, `SpotHit` (Task 2); RPC `search_places` (Task 1).
- Produces: `GET /api/places/search?q=` → `200 SpotHit[]`, `401 {error:'unauthorized'}`. `q` is trimmed and sliced to 80 chars; an empty `q` returns `[]` without calling Photon.

- [ ] **Step 1: Tests:**
  - `401 when signed out`
  - `empty q returns [] and does not fetch`
  - `db hits come first`
  - `search degrades to db hits` (fetch rejects or times out → 200 with db hits only)
  - `builds the Photon URL with the osm_tag filters and no lat/lon`
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement: `Promise.all` over the `search_places` RPC and `fetch(photonUrl, { signal: AbortSignal.timeout(3000), headers: {'User-Agent':'geeked-drunk/0.1'} })`. The Photon branch catches to `[]`. Use one `osm_tag` param per allowed tag (`amenity:` for restaurant…food_court, `shop:` for bakery/deli/confectionery).
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: spot search route over our spots + Photon`).

### Task 4: Session input and createSession for places

**Files:**
- Modify: `lib/session-schema.ts`, `actions/sessions.ts`
- Create: `lib/place-cache.ts` (`server-only`)
- Test: `tests/unit/session-schema.test.ts` (extend)

**Interfaces:**
- Consumes: `PLACE_CATEGORIES`, `nameKey` (Task 2).
- Produces:
  - `sessionInput` now has `tmdbId?: number` and `place?: { name: string; category: PlaceCategory | null }`, with a refine for exactly one. The place name is trimmed, 1–80 chars, and `nameKey(name) !== ''`, with the message `'Give the spot a name with letters or numbers.'`
  - `ensurePlaceCached(p: { name: string; category: PlaceCategory | null }): Promise<string>` returns the place id. It uses the admin client: upsert `onConflict: 'name_key', ignoreDuplicates: true`, then select id by name_key. Mirror `lib/movies.ts` structure (injectable db for tests).
  - `createSession` inserts `tmdb_id` or `place_id` accordingly. Movie path unchanged.
  - `getLogContext` also returns `defaultVisibility`.
- [ ] **Step 1: Tests:**
  - both `tmdbId` and `place` → error
  - neither → error
  - `place.name: '🌮'` → error with that exact message
  - `place.name` of 81 chars → error
  - category `'gas_station'` → error
  - valid place with `category: null` → ok
  - all existing movie cases still pass
- [ ] **Step 2:** Run `npx vitest run tests/unit/session-schema.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the schema, `ensurePlaceCached`, and the action branch. The action maps an `ensurePlaceCached` failure to `'Could not save that spot. Try again.'`
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: log a sesh for a food spot`).

### Task 5: Readers render both subjects

**Files:**
- Modify: `lib/queries/feed.ts`, `lib/queries/profile.ts`, `lib/queries/tags.ts`, `lib/queries/crews.ts` (top picks: skip non-movie, unchanged otherwise), `lib/queries/discover.ts` (Discover rows guard only; trending is Task 8)
- Modify: `components/session-card.tsx`, `components/tags-inbox.tsx`, every other consumer of `FeedItem.movie` / `TagItem.movie` (find with `grep -rn "\.movie\b" app components`)
- Create: `components/place-tile.tsx`
- Test: `tests/unit/components.test.tsx` (extend)

**Interfaces:**
- Consumes: `Subject`, `SUBJECT`, `subjectOf`, `subjectHref`, `subjectTitle` (Task 2).
- Produces:
  - `FeedItem.movie` is replaced by `FeedItem.subject: Subject`
  - `TagItem.movie` is replaced by `TagItem.subject: Subject`
  - `<PlaceTile place={PlaceSummary} size="card" | "sm" />`: a fixed-size tile matching poster dimensions (108×162 for card), showing the name and a lucide icon per category (fallback `Utensils`)
- [ ] **Step 1: Tests:** a `SessionCard` with a place subject renders the name as heading, links to `/place/p1`, and renders no `<img>`; a `SessionCard` with a movie subject still links to `/movie/1`.
- [ ] **Step 2:** Run it. Expected: FAIL (type error / missing subject).
- [ ] **Step 3:** Implement. Queries select `SUBJECT` instead of `movies(...)` and drop a row only when `subjectOf` returns null. For place seshes, the card shows "been before" in place of rewatch wording if shown.
- [ ] **Step 4:** Run `npx tsc --noEmit && npm test`. Expected: PASS.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: feed, profile and tags show food spots`).

### Task 6: Log sheet Movie / Food toggle

**Files:**
- Modify: `components/log-sheet.tsx`, `components/tags-inbox.tsx` (place tags open with `preset.place`)
- Create: `components/spot-picker.tsx`
- Test: `tests/e2e/spots.spec.ts`

**Interfaces:**
- Consumes: `GET /api/places/search` (Task 3), `createSession` place input (Task 4), `PlaceTile` (Task 5), `getLogContext().defaultVisibility`.
- Produces:
  - `LogPreset` gains `place?: { name: string; category: PlaceCategory | null }`. `open(undefined, { place })` opens in Food mode with that spot picked.
  - `<SpotPicker onPick={(p: { name; category }) => void} />`: debounced 300ms, shows hits, plus a last row "use “<typed text>”" when the typed key matches no hit.
- [ ] **Step 1: Write e2e** (`page.route('**/api/places/search**', …)` returns a fixture):
  - toggle Food → type "taco" → pick "Taco Bell" → high + recommend → save → the feed shows "Taco Bell"; the profile shows it
  - typed-name path: "grandma's basement" → use typed → saves
  - `tag on a place sesh prefills the spot` (alice tags bob on a spot sesh; bob approves; the sheet shows the spot name)
  - visibility select defaults to the user's `default_visibility`
- [ ] **Step 2:** Run `npx playwright test tests/e2e/spots.spec.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Use a segmented toggle at the top of `LogForm` with `role="tablist"`. Movie mode is unchanged. Food mode replaces `MoviePicker` with `SpotPicker` and the header poster with `PlaceTile size="sm"`. The fields below are shared. The "Send this rec" offer is hidden for places (recs stay movie-only).
- [ ] **Step 4:** Run the spec plus `tests/e2e/log.spec.ts` and `tests/e2e/tags.spec.ts`. Expected: PASS.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: log sheet Movie/Food toggle with spot search`).

### Task 7: Place page

**Files:**
- Create: `app/(app)/place/[id]/page.tsx`, `lib/queries/place.ts`
- Modify: `components/how-it-hits.tsx` only if it is movie-typed (make its prop subject-neutral)
- Test: extend `tests/e2e/spots.spec.ts`

**Interfaces:**
- Consumes: `place_influence_stats`, `SUBJECT`, `FeedItem`, `SessionCard`, `useLogSheet().open(undefined, { place })`.
- Produces: `getPlace(id: string): Promise<{ place: PlaceSummary; stats: {influence; logCount; recommendPct}[]; seshes: FeedItem[] } | null>` (friends'/visible seshes via RLS, latest 50). A non-uuid id or a missing place → `notFound()`.
- [ ] **Step 1: e2e:** open `/place/<id>` from a feed card → shows the name, the "how it hits" block and the logs list; "Log this spot" opens the sheet in Food mode prefilled; `/place/not-a-uuid` → 404 page.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement, following `app/(app)/movie/[tmdbId]/page.tsx` structure.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: food spot page`).

### Task 8: Discover mixed trending

**Files:**
- Create: `lib/trending.ts`
- Modify: `lib/queries/discover.ts`, `app/(app)/discover/page.tsx`
- Test: `tests/unit/trending.test.ts`, extend `tests/e2e/discover.spec.ts`

**Interfaces:**
- Consumes: `Subject`, `subjectOf`, `PlaceTile`, `PosterTile`.
- Produces:
  - `rankTrending(rows: { user_id: string; tmdb_id: number | null; place_id: string | null; created_at: string }[], since: string, limit = 8): { kind: 'movie' | 'place'; id: string; friendCount: number }[]`. It counts distinct friends per subject for rows at or after `since`, sorts by count desc with ties broken by the newest row, and keys by `m:<tmdb_id>` / `p:<place_id>`.
  - `Trending = { subject: Subject; friendCount: number }`
- [ ] **Step 1: Unit tests:**
  - mixed input → movies and places interleaved by count
  - the same friend logging twice counts once
  - rows before `since` are ignored
  - the limit is respected
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. `getDiscover` selects `user_id, tmdb_id, place_id, influence, recommend, created_at, places(id, name, category)` from friends' sessions. Ranked rows and friend verdicts skip rows with null `tmdb_id`. Trending uses `rankTrending`. In the page, each item renders `PosterTile` or `PlaceTile` with the caption "N friends watched" / "N friends went".
- [ ] **Step 4:** Unit plus e2e: after a friend logs a spot, `/discover` shows it in "Trending with friends", and the crew page still loads. Expected: PASS.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: trending mixes movies and food spots`).

### Task 9: Email + password auth

**Files:**
- Modify: `app/auth/login/page.tsx`, `app/auth/callback/route.ts`, `lib/supabase/middleware.ts`
- Create: `app/auth/signup/page.tsx`, `app/auth/reset/page.tsx`, `app/auth/update-password/page.tsx`
- Test: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Produces:
  - The callback honors `?next=` through `safeNext` (the query param wins over the cookie).
  - Middleware: a signed-in user on `/auth/login`, `/auth/signup` or `/auth/reset` → `/`.
  - `/auth/update-password` renders a "sign in first" link when there is no user.
- [ ] **Step 1: e2e:**
  - sign up with new email + password (local confirmations off) → lands on onboarding
  - log out → log in with password → feed
  - a wrong password shows the Supabase error in `role="alert"`
  - password `"short"` is blocked client-side with "Use at least 8 characters."
  - the reset page submits and shows "Check your email"
  - a signed-in user setting a new password on `/auth/update-password` can log in with it
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement with `signInWithPassword`, `signUp({ email, password, options: { emailRedirectTo: origin + '/auth/callback' } })` (if `data.session` is null, show "Check your email to confirm"), `resetPasswordForEmail(email, { redirectTo: origin + '/auth/callback?next=/auth/update-password' })` and `updateUser({ password })`. Keep the existing try/catch error pattern. Remove the magic-link form.
- [ ] **Step 4:** Run `auth.spec.ts`, `gate.spec.ts` and `onboarding.spec.ts`. Expected: PASS.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: email + password login, sign-up and reset`).

### Task 10: Settings page and account deletion

**Files:**
- Create: `app/(app)/settings/page.tsx`, `actions/settings.ts`, `components/settings-forms.tsx`
- Modify: `components/nav-rail.tsx`, `components/tab-bar.tsx` (or the profile header, whichever holds account links), `app/(app)/u/[username]/page.tsx` (own profile: "settings" link)
- Test: `supabase/tests/account-delete.test.sql`, `tests/e2e/settings.spec.ts`

**Interfaces:**
- Produces (`actions/settings.ts`):
  - `setDefaultVisibility(v: 'private' | 'crew' | 'friends' | 'public'): Promise<Result>`
  - `deleteAccount(confirmUsername: string): Promise<Result>`: re-reads the caller's profile and compares case-insensitively; on mismatch returns `'Type your username exactly to confirm.'`; then `createAdminClient().auth.admin.deleteUser(me)`, `signOut`, `redirect('/')`
  - Password change and email change run client-side via `updateUser`. The reset link uses `resetPasswordForEmail`.
- [ ] **Step 1: pgTAP `account-delete.test.sql`:** create a user who owns a crew, a list with items, a queue row, a rec sent and received, a sesh with cheers and tags (both directions), a friendship and a place sesh. Then `lives_ok($$delete from auth.users where id = …$$)`. Every table has 0 rows for that user, and `places` and `movies` rows remain.
- [ ] **Step 2: e2e:**
  - change password → log out → log in with the new one
  - set default visibility to public → open the log sheet → public is preselected
  - delete with the wrong username → error; delete with the right username → lands on `/`, and logging in again fails
- [ ] **Step 3:** Run both. Expected: FAIL.
- [ ] **Step 4:** Implement. The danger zone sits last on the page, behind a radix `AlertDialog` with the username input. If the cascade test exposes a missing `on delete`, fix it in a new migration `20261124000014_delete_cascades.sql`.
- [ ] **Step 5:** Run both. Expected: PASS.
- [ ] **Step 6:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: settings page with password, visibility and account delete`).

### Task 11: Terms, privacy, attributions, sign-up consent

**Files:**
- Create: `app/terms/page.tsx`, `app/privacy/page.tsx`, `components/site-footer.tsx`
- Modify: `lib/supabase/middleware.ts` (`/terms` and `/privacy` are served before the age-gate check, signed in or out), `app/auth/signup/page.tsx` (required checkbox), `app/layout.tsx` or the landing + app layouts (footer)
- Test: `tests/e2e/legal.spec.ts`

**Interfaces:**
- Produces: static server pages containing the content bullets from the spec's "Terms and privacy" section, the beta-draft note, the placeholder contact email and both attribution strings verbatim.
- [ ] **Step 1: e2e:**
  - signed out with no `age_ok` cookie: `/terms` and `/privacy` return 200 and contain "Beta draft"
  - the footer shows both attribution strings
  - sign-up's submit is disabled until "I'm 21+ and agree to the Terms and Privacy Policy" is checked
  - axe passes on both pages (reuse `tests/e2e/a11y.spec.ts` helper)
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Stop. Leave changes unstaged; the user stages and commits (suggested message: `feat: beta terms, privacy and attributions`).

### Task 12: Merge audit, fold findings, verify, deploy

- [ ] **Step 1:** Ask the user to commit the audit worktree changes and merge `audit/polish` into `feat/afterhours`. Help resolve conflicts if asked, in favor of the feature behavior, keeping audit styling.
- [ ] **Step 2:** Apply the items in `docs/superpowers/audit-2026-11-24.md` that target the protected files. Leave unstaged for the user.
- [ ] **Step 3:** Run `npx tsc --noEmit && npm run lint && npm test && npm run test:db && npm run test:e2e && npm run build`. Expected: all green. Paste the summary lines.
- [ ] **Step 4:** Ask the user before running these:
  - apply the migrations to cloud Supabase (`npx supabase db push`),
  - run cloud pgTAP,
  - push to `origin`.
- [ ] **Step 5:** Tell the user the dashboard steps that remain: set "Confirm email" (off for beta, or keep the 2/hour limit), set the minimum password length to 8 in Auth settings, and replace `contact@REPLACE-ME.example`.
