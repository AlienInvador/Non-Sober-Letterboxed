# Afterhours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Afterhours, a 21+ social movie tracker where friends and crews log watch sessions under the influence (drunk / high / both) and see ratings split by influence.

**Architecture:** Next.js App Router web app over a Supabase Postgres backend. Business rules (21+, rating/recommend validity, visibility) live in Postgres constraints, triggers, RLS, and a stats view so a future Expo app reuses them. TMDB is reached only through server code and cached in a `movies` table.

**Tech Stack:** Next.js 15 (TypeScript, App Router), Tailwind CSS v4, shadcn/ui + Radix, `motion`, Supabase (Postgres, Auth, Storage, RLS) via `@supabase/ssr`, zod, Vitest, Playwright, pgTAP (`supabase test db`).

**Spec:** `docs/superpowers/specs/2026-10-14-afterhours-design.md`

## Global Constraints

- Users must be 21+; enforced by a `profiles` BEFORE INSERT/UPDATE trigger, plus `/gate` + `age_ok` cookie in middleware.
- Influence values exactly: `drunk`, `high`, `both`, `sober`. Sober has no recommend (`recommend` must be null).
- Rating: null or 0.5–5.0 in 0.5 steps.
- Visibility values exactly: `private`, `crew`, `friends` (default), `public`. `crew_id` not null iff visibility is `crew`.
- Discover minimum log count: `MIN_LOGS = 5`.
- TMDB key only server-side (`TMDB_API_KEY`, no `NEXT_PUBLIC_` prefix). Movie cache refresh after 24h.
- Footer copy exactly: "This product uses the TMDB API but is not endorsed or certified by TMDB."
- Colors exactly: bg `#07060B`, surface `#110E1A`, surface-2 `#1A1526`, line `rgba(255,255,255,.08)`, text `#F4EEFF`, muted `#9A90B3`, accent `#8B5CFF`, drunk `#FF2E88`, high `#B6FF3B`, sober `#7A8BA8`, both = gradient drunk→high.
- Fonts: Unbounded (display), Manrope (body), JetBrains Mono (numbers). Sentence case; no uppercase letter-spaced labels.
- Nothing may reuse Letterboxd code, assets, copy, branding, or the patterns listed in spec §6.
- `prefers-reduced-motion` disables haze, flicker, tilt, wobble.
- Influence is never conveyed by color alone (always label or icon too).

**Prerequisites (one-time, user):** Node 20+, Docker Desktop running (for `supabase start`), Supabase CLI (`npm i -D supabase`), a TMDB API read key, a Supabase cloud project for deploy (Phase 6).

## Review Focus

1. Birthday edge cases: someone turning 21 today, and a Feb 29 birthdate, must be allowed on/after their 21st birthday and rejected one day before. → Task 2 trigger test + Task 5 `isAtLeast21` tests.
2. A session posted with `visibility='crew'` to a crew the author is not a member of must be rejected. → Task 3 RLS test.
3. Tagging a non-friend as a companion must be rejected. → Task 3 RLS test.
4. A movie with logs but zero recommend votes must show "—", not `NaN%` or `0%`. → Task 4 view test + Task 13 `formatRecommendPct` test.
5. Blank / whitespace-only TMDB search must return `[]` without calling TMDB. → Task 7 test.

---

## File Structure

```
app/
  layout.tsx                    root: fonts, tokens, Haze background, footer attribution
  globals.css                   Tailwind v4 @theme from design tokens
  gate/page.tsx                 age gate
  gate/actions.ts               verifyAge server action
  auth/login/page.tsx           magic link + Google
  auth/callback/route.ts        Supabase auth code exchange
  onboarding/page.tsx           username + birthdate → profiles insert
  (app)/layout.tsx              NavRail (desktop) / TabBar (mobile), CommandPalette, LogSheet host
  (app)/page.tsx                Tonight
  (app)/discover/page.tsx
  (app)/movie/[tmdbId]/page.tsx
  (app)/crews/page.tsx
  (app)/crews/[id]/page.tsx
  (app)/u/[username]/page.tsx   profile (Me = own username)
  (app)/lists/[id]/page.tsx
  (app)/queue/page.tsx
  (app)/friends/page.tsx
  api/tmdb/search/route.ts      GET ?q= → MovieSummary[]
middleware.ts                   session refresh + age gate + auth redirect
design/tokens.ts                single source of tokens (TS export)
lib/
  supabase/server.ts | client.ts | middleware.ts
  age.ts                        isAtLeast21
  influence.ts                  Influence type, chips mapping, labels
  session-schema.ts             zod schema for session input
  stats.ts                      rankForDiscover, formatRecommendPct
  tmdb.ts                       searchMovies, getMovie, ensureMovieCached
  queries/                      read helpers: feed.ts, movie.ts, profile.ts, crews.ts, discover.ts
actions/                        server actions: sessions.ts, friends.ts, crews.ts, lists.ts, queue.ts, cheers.ts
components/
  ui/                           shadcn primitives (restyled)
  influence-chip.tsx, neon-stars.tsx, recommend-toggle.tsx, session-card.tsx,
  split-rating-card.tsx, poster-tile.tsx, avatar-stack.tsx, cheers-button.tsx,
  log-sheet.tsx, command-palette.tsx, nav-rail.tsx, tab-bar.tsx, haze.tsx, empty-state.tsx
supabase/
  migrations/0001_schema.sql    enums, tables, constraints, age trigger
  migrations/0002_rls.sql       policies + helper functions
  migrations/0003_stats.sql     movie_influence_stats view
  tests/schema.test.sql         pgTAP constraints/trigger
  tests/rls.test.sql            pgTAP visibility
  tests/stats.test.sql          pgTAP view
  seed.sql                      demo users, crews, sessions
tests/unit/*.test.ts            Vitest
e2e/*.spec.ts                   Playwright
```

---

## Phase 0 — Design prototype (gate)

### Task 0: Claude Design prototype of the design system and key screens

**Files:** none in repo (published Artifact); export final tokens later in Task 1.

- [ ] **Step 1:** Run Artifact `quickstart` with `intent: "design"`; create the design from the returned type.
- [ ] **Step 2:** Build with mock data (no real Letterboxd assets): token sheet (spec §5 colors, fonts, components), Tonight feed, Log sheet (all four influence states incl. Both gradient), Movie page with SplitRatingCard, Discover (Best High tab). Include age gate flicker-on.
- [ ] **Step 3:** Check against spec §6: no uppercase tracked labels, no three-dot mark, no slate column, no green log button, no eye/list/heart rows.
- [ ] **Step 4:** Share link with user. **STOP until user approves.** Record any token changes in the spec before Task 1.

---

## Phase 1 — Foundation

### Task 1: Scaffold, tokens, test tooling

**Files:**
- Create: Next.js app (`npx create-next-app@15 . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"`), `design/tokens.ts`, `app/globals.css`, `app/layout.tsx`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`
- Test: `tests/unit/tokens.test.ts`

**Interfaces:**
- Produces: `tokens` from `@/design/tokens`: `{ color: { bg, surface, surface2, line, text, muted, accent, drunk, high, sober }, gradient: { both: string }, radius: { poster: '14px' }, font: { display: 'Unbounded', body: 'Manrope', mono: 'JetBrains Mono' } }`. Tailwind classes `bg-bg`, `text-muted`, `text-drunk`, `bg-high`, etc. via `@theme`.

- [ ] **Step 1: Write failing test**

```ts
import { tokens } from '@/design/tokens'
test('influence colors match spec', () => {
  expect(tokens.color.drunk).toBe('#FF2E88')
  expect(tokens.color.high).toBe('#B6FF3B')
  expect(tokens.color.sober).toBe('#7A8BA8')
  expect(tokens.color.accent).toBe('#8B5CFF')
  expect(tokens.gradient.both).toContain('#FF2E88')
  expect(tokens.gradient.both).toContain('#B6FF3B')
})
```

- [ ] **Step 2:** `npx vitest run tests/unit/tokens.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Scaffold; install `motion zod @supabase/ssr @supabase/supabase-js`, dev `vitest @vitejs/plugin-react @playwright/test supabase`; `npx shadcn@latest init`. Write `design/tokens.ts` (all Global Constraints values) and mirror them as CSS vars in `globals.css` `@theme`. Load fonts with `next/font/google` in `app/layout.tsx`; add footer with exact TMDB attribution copy. `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `TMDB_API_KEY`.
- [ ] **Step 4:** `npx vitest run` → PASS; `npm run build` → succeeds.
- [ ] **Step 5:** Commit `feat: scaffold app with Afterhours design tokens`.

### Task 2: Schema, constraints, age trigger

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `supabase/tests/schema.test.sql` (after `npx supabase init`)

**Interfaces:**
- Produces: enums `influence` (`drunk|high|both|sober`), `visibility` (`private|crew|friends|public`); tables exactly as spec §3; function `enforce_adult()` trigger on `profiles`.

- [ ] **Step 1: Write failing pgTAP tests** (`schema.test.sql`), using a helper that inserts an `auth.users` row then a profile:

```sql
select plan(8);
select throws_ok($$ insert into profiles(id,username,birthdate) values (gen_random_uuid_user(),'kid', current_date - interval '21 years' + interval '1 day') $$, 'P0001', 'must be 21+');
select lives_ok ($$ insert into profiles(id,username,birthdate) values (gen_random_uuid_user(),'today21', current_date - interval '21 years') $$);
select lives_ok ($$ insert into profiles(id,username,birthdate) values (gen_random_uuid_user(),'leap', '2004-02-29') $$); -- leap edge pinned in Task 5 unit test
select throws_ok($$ insert into sessions(user_id,tmdb_id,influence,rating) values (test_user(),1,'high',5.5) $$, '23514');
select throws_ok($$ insert into sessions(user_id,tmdb_id,influence,rating) values (test_user(),1,'high',3.3) $$, '23514');
select throws_ok($$ insert into sessions(user_id,tmdb_id,influence,recommend) values (test_user(),1,'sober',true) $$, '23514');
select throws_ok($$ insert into sessions(user_id,tmdb_id,influence,visibility) values (test_user(),1,'drunk','crew') $$, '23514');
select throws_ok($$ insert into friendships(user_a,user_b,status,requested_by) values (u2(),u1(),'pending',u2()) $$, '23514'); -- user_a < user_b
select * from finish();
```

Define helpers `gen_random_uuid_user()`, `test_user()`, `u1()`, `u2()` (with `u1() < u2()`) and a seed movie `tmdb_id=1` at the top of the test file.

- [ ] **Step 2:** `npx supabase start && npx supabase test db` → FAIL (tables missing).
- [ ] **Step 3:** Write `0001_schema.sql`: all spec §3 tables, checks (`rating is null or (rating between 0.5 and 5 and rating*2 = floor(rating*2))`, `influence <> 'sober' or recommend is null`, `(visibility = 'crew') = (crew_id is not null)`, `user_a < user_b`, lists exactly-one-owner). `enforce_adult()` raises `'must be 21+'` when `birthdate > current_date - interval '21 years'`.
- [ ] **Step 4:** `npx supabase db reset && npx supabase test db` → PASS.
- [ ] **Step 5:** Commit `feat(db): schema, constraints, 21+ trigger`.

### Task 3: Row Level Security

**Files:**
- Create: `supabase/migrations/0002_rls.sql`, `supabase/tests/rls.test.sql`

**Interfaces:**
- Produces SQL helpers (security definer, `stable`): `are_friends(a uuid, b uuid) returns bool`, `is_crew_member(c uuid, u uuid) returns bool`, `can_read_session(s sessions) returns bool`.

- [ ] **Step 1: Write failing pgTAP tests.** Fixture: alice, bob (friends), carol (stranger), crew K = {alice, dave}. Alice logs one session per visibility (private, friends, crew→K, public). Switch identity with `set local role authenticated; set local request.jwt.claims = '{"sub":"<id>"}'`.

```sql
-- as bob (friend): sees friends + public = 2
select is((select count(*) from sessions where user_id = alice()), 2::bigint);
-- as carol (stranger): sees public only = 1
-- as dave (crew K): sees crew + public = 2
-- as alice: sees 4
-- companion: alice tags bob on her private session → bob sees 3
-- as carol: insert session visibility crew, crew_id K → throws (not a member)
-- as alice: insert session_companions (s, carol) → throws (not a friend)
-- as dave: insert list_items into a K-owned list → lives; as carol → throws
-- as carol: insert cheers on alice's friends-only session → throws
```

- [ ] **Step 2:** `npx supabase test db` → FAIL.
- [ ] **Step 3:** Enable RLS on every table; write policies per spec §3 "Row Level Security" using the three helpers. Profiles: readable by any authenticated user; writable by self. Friendships: readable/updatable by either party; insert only with `requested_by = auth.uid()`.
- [ ] **Step 4:** `npx supabase db reset && npx supabase test db` → PASS.
- [ ] **Step 5:** Commit `feat(db): row level security with visibility tests`.

### Task 4: Stats view

**Files:**
- Create: `supabase/migrations/0003_stats.sql`, `supabase/tests/stats.test.sql`

**Interfaces:**
- Produces view `movie_influence_stats(tmdb_id int, influence influence, log_count bigint, avg_rating numeric, recommend_pct numeric)`; public sessions only; `recommend_pct` in 0–100, null when no votes.

- [ ] **Step 1: Write failing tests:** movie 1 has public high sessions with recommend (true, true, false, null) and one friends-only high session (true). Assert `log_count = 4`, `recommend_pct = 66.67` (rounded 2dp), friends-only row excluded. Movie 2 has public drunk sessions with recommend null only → `recommend_pct is null`.
- [ ] **Step 2:** `npx supabase test db` → FAIL.
- [ ] **Step 3:** Create the view (`security_invoker = false` is fine since it only exposes public rows; aggregate over `visibility = 'public'`).
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(db): movie influence stats view`.

---

## Phase 2 — Auth, age gate, profiles

### Task 5: Domain helpers (age, influence, session schema)

**Files:**
- Create: `lib/age.ts`, `lib/influence.ts`, `lib/session-schema.ts`
- Test: `tests/unit/age.test.ts`, `tests/unit/influence.test.ts`, `tests/unit/session-schema.test.ts`

**Interfaces:**
- Produces:
  - `isAtLeast21(birthdate: string /* YYYY-MM-DD */, today?: Date): boolean`
  - `type Influence = 'drunk' | 'high' | 'both' | 'sober'`
  - `influenceFromChips(c: { drunk: boolean; high: boolean; sober: boolean }): Influence | null` — drunk+high→both; sober only when neither; nothing → null
  - `recommendLabel(i: Influence): string | null` — `'Recommend it drunk?'`, `'Recommend it high?'`, `'Recommend it drunk and high?'`, sober → null
  - `influenceLabel(i: Influence): string` — `'Drunk' | 'High' | 'Both' | 'Sober'`
  - `sessionInput` zod schema → `SessionInput { tmdbId: number; influence: Influence; rating: number | null; recommend: boolean | null; review: string | null; visibility: 'private'|'crew'|'friends'|'public'; crewId: string | null; companionIds: string[]; rewatch: boolean; watchedOn: string }`

- [ ] **Step 1: Write failing tests**

```ts
expect(isAtLeast21('2005-10-14', new Date('2026-10-14'))).toBe(true)
expect(isAtLeast21('2005-10-15', new Date('2026-10-14'))).toBe(false)
expect(isAtLeast21('2004-02-29', new Date('2025-02-27'))).toBe(false)
expect(isAtLeast21('2004-02-29', new Date('2025-02-28'))).toBe(true)
expect(influenceFromChips({ drunk: true, high: true, sober: false })).toBe('both')
expect(influenceFromChips({ drunk: false, high: false, sober: false })).toBeNull()
expect(recommendLabel('sober')).toBeNull()
expect(sessionInput.safeParse({ ...valid, rating: 3.3 }).success).toBe(false)
expect(sessionInput.safeParse({ ...valid, influence: 'sober', recommend: true }).success).toBe(false)
expect(sessionInput.safeParse({ ...valid, visibility: 'crew', crewId: null }).success).toBe(false)
```

Leap rule matches Postgres: `'2004-02-29'::date + interval '21 years' = 2025-02-28`.

- [ ] **Step 2:** `npx vitest run tests/unit` → FAIL.
- [ ] **Step 3:** Implement. `isAtLeast21` adds 21 years with day clamped to month end (matches Postgres).
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: age, influence and session validation helpers`.

### Task 6: Supabase clients, middleware, gate, login, onboarding

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`, `middleware.ts`, `app/gate/page.tsx`, `app/gate/actions.ts`, `app/auth/login/page.tsx`, `app/auth/callback/route.ts`, `app/onboarding/page.tsx`, `components/haze.tsx`
- Test: `e2e/gate.spec.ts`

**Interfaces:**
- Consumes: `isAtLeast21` (Task 5).
- Produces: `createServerClient(): SupabaseClient` (server.ts), `createBrowserClient()` (client.ts); `verifyAge(formData): Promise<{ ok: false; reason: 'under21' } | void>` (redirects on pass); cookie `age_ok=1`, `httpOnly`, 1 year. Middleware order: refresh session → no `age_ok` and path not `/gate` → redirect `/gate` → no user on `(app)` routes → `/auth/login` → user without profile → `/onboarding`.

- [ ] **Step 1: Write failing e2e**

```ts
test('under 21 is turned away', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/gate/)
  await page.getByLabel('Date of birth').fill('2010-01-01')
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText('Come back when you’re 21')).toBeVisible()
})
test('21+ passes to login', async ({ page }) => {
  await page.goto('/gate')
  await page.getByLabel('Date of birth').fill('1995-05-05')
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page).toHaveURL(/\/auth\/login/)
})
```

- [ ] **Step 2:** `npx playwright test e2e/gate.spec.ts` → FAIL.
- [ ] **Step 3:** Implement per `@supabase/ssr` Next.js docs. Gate page: neon flicker-on headline (motion, disabled under reduced motion), DOB input labeled "Date of birth", button "Enter". Login: magic link + Google. Onboarding inserts profile; on trigger error show "You must be 21 or older to join." `Haze` = fixed full-screen blurred gradient blobs animated with CSS transforms, `aria-hidden`.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: auth, age gate, onboarding`.

---

## Phase 3 — Movies and logging

### Task 7: TMDB layer

**Files:**
- Create: `lib/tmdb.ts`, `app/api/tmdb/search/route.ts`
- Test: `tests/unit/tmdb.test.ts`

**Interfaces:**
- Produces:
  - `type MovieSummary = { tmdbId: number; title: string; year: number | null; posterPath: string | null }`
  - `type Movie = MovieSummary & { backdropPath: string | null; genres: string[]; runtime: number | null }`
  - `searchMovies(q: string, fetcher?: typeof fetch): Promise<MovieSummary[]>`
  - `getMovie(tmdbId: number, fetcher?: typeof fetch): Promise<Movie>`
  - `ensureMovieCached(tmdbId: number): Promise<Movie>` — reads `movies`; refetches if missing or `cached_at` older than 24h; upserts.
  - `posterUrl(path: string | null, size: 'w185' | 'w342' | 'w780'): string | null`

- [ ] **Step 1: Write failing tests** with a mock fetcher:

```ts
test('blank query returns [] without fetching', async () => {
  const f = vi.fn()
  expect(await searchMovies('   ', f)).toEqual([])
  expect(f).not.toHaveBeenCalled()
})
test('maps TMDB results', async () => {
  const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ id: 27205, title: 'Inception', release_date: '2010-07-15', poster_path: '/p.jpg' }] })))
  expect(await searchMovies('incep', f)).toEqual([{ tmdbId: 27205, title: 'Inception', year: 2010, posterPath: '/p.jpg' }])
})
test('missing release date gives null year', ...)
test('non-200 throws TmdbError', ...)
```

- [ ] **Step 2:** `npx vitest run tests/unit/tmdb.test.ts` → FAIL.
- [ ] **Step 3:** Implement with `Authorization: Bearer ${process.env.TMDB_API_KEY}`, `import 'server-only'`. Route handler returns `searchMovies` JSON; on `TmdbError` → 502 `{ error: 'tmdb_unavailable' }`.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: TMDB search and movie cache`.

### Task 8: Influence components

**Files:**
- Create: `components/influence-chip.tsx`, `components/neon-stars.tsx`, `components/recommend-toggle.tsx`, `components/poster-tile.tsx`
- Test: `tests/unit/components.test.tsx` (Vitest + @testing-library/react, jsdom)

**Interfaces:**
- Consumes: `Influence`, `influenceLabel`, `recommendLabel` (Task 5), `posterUrl` (Task 7).
- Produces:
  - `<InfluenceChip influence={Influence} selected? onToggle? size?: 'sm'|'lg' />` — always renders label text + icon
  - `<NeonStars value={number|null} onChange?={(v:number|null)=>void} influence={Influence} />` — half-step; arrow keys change by 0.5; clicking current value clears
  - `<RecommendToggle influence={Influence} value={boolean|null} onChange />` — renders nothing for sober
  - `<PosterTile movie={MovieSummary} influence?={Influence} href />` — 3D tilt + rim glow; static under reduced motion

- [ ] **Step 1: Write failing tests:** chip shows text "High"; NeonStars ArrowRight from 3 → onChange(3.5); RecommendToggle with sober renders null; RecommendToggle with both shows "Recommend it drunk and high?".
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implement with tokens; `useReducedMotion()` from `motion/react` gates tilt/wobble.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: influence chip, neon stars, recommend toggle, poster tile`.

### Task 9: Log sheet + createSession

**Files:**
- Create: `actions/sessions.ts`, `components/log-sheet.tsx`
- Modify: `app/(app)/layout.tsx` (create with NavRail/TabBar placeholders + LogSheet host)
- Test: `e2e/log.spec.ts`

**Interfaces:**
- Consumes: `sessionInput`, `influenceFromChips` (Task 5), `ensureMovieCached` (Task 7), Task 8 components.
- Produces: `createSession(input: SessionInput): Promise<{ ok: true; id: string } | { ok: false; error: string }>`; `deleteSession(id: string)`; `useLogSheet(): { open(movie?: MovieSummary): void }`.

- [ ] **Step 1: Write failing e2e** (seeded logged-in test user, TMDB mocked via `page.route('**/api/tmdb/search*')`):

```ts
test('log a session in four steps', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Log' }).click()
  await page.getByPlaceholder('Search a movie').fill('incep')
  await page.getByRole('option', { name: /Inception/ }).click()
  await page.getByRole('button', { name: 'Drunk' }).click()
  await page.getByRole('button', { name: 'High' }).click()     // → Both
  await page.getByRole('slider', { name: 'Rating' }).press('ArrowRight')
  await page.getByRole('switch', { name: 'Recommend it drunk and high?' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Logged')).toBeVisible()
})
test('failed save keeps inputs', async ({ page }) => { /* force action error; sheet stays open, rating still set, error text visible */ })
```

- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** `createSession`: validate with zod, `ensureMovieCached`, insert session, insert companions; return RLS errors as `{ ok:false }`. LogSheet: Radix Dialog as bottom sheet; collapsed "More" section with companions (friends only), visibility select (default friends; crew shows crew picker), review, rewatch; Save disabled until movie + influence chosen. On success: glow burst + 🍻 particles (skipped under reduced motion), toast "Logged".
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: log sheet and createSession`.

### Task 10: Movie page

**Files:**
- Create: `lib/queries/movie.ts`, `components/split-rating-card.tsx`, `components/avatar-stack.tsx`, `app/(app)/movie/[tmdbId]/page.tsx`
- Test: `tests/unit/split-rating-card.test.tsx`

**Interfaces:**
- Consumes: `ensureMovieCached` (Task 7), `formatRecommendPct` (Task 13 — implement it here first if Task 13 not done; it lives in `lib/stats.ts`).
- Produces: `getMoviePage(tmdbId: number): Promise<{ movie: Movie; stats: InfluenceStat[]; friends: { profile: ProfileLite; influence: Influence }[]; reviews: PublicReview[] }>`; `type InfluenceStat = { influence: Influence; logCount: number; avgRating: number | null; recommendPct: number | null }`; `type ProfileLite = { id: string; username: string; displayName: string | null; avatarUrl: string | null }`.

- [ ] **Step 1: Failing test:** SplitRatingCard renders Drunk/High/Both columns always; Sober column only when `logCount > 0`; column with `recommendPct: null` shows "—".
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implement page: backdrop, poster, SplitRatingCard, "Friends who watched" AvatarStack with influence badges, public reviews with influence filter (URL `?influence=`), buttons add to Queue / add to list (wired in Task 15).
- [ ] **Step 4:** → PASS; manual check `/movie/27205`.
- [ ] **Step 5:** Commit `feat: movie page with split ratings`.

---

## Phase 4 — Social

### Task 11: Friends

**Files:**
- Create: `actions/friends.ts`, `app/(app)/friends/page.tsx`
- Test: `tests/unit/friends.test.ts`

**Interfaces:**
- Produces: `orderedPair(a: string, b: string): [string, string]`; `requestFriend(userId)`, `acceptFriend(userId)`, `removeFriend(userId)` → `Promise<{ ok: boolean; error?: string }>`; invite link `/u/<username>?add=1`.

- [ ] **Step 1: Failing tests:** `orderedPair('b','a')` → `['a','b']`; requesting yourself returns `{ ok:false, error:'self' }`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implement; page has user search (by username prefix), incoming/outgoing requests, invite link copy button.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: friends`.

### Task 12: Crews, feed, cheers, Tonight

**Files:**
- Create: `actions/crews.ts`, `actions/cheers.ts`, `lib/queries/feed.ts`, `lib/queries/crews.ts`, `components/session-card.tsx`, `components/cheers-button.tsx`, `components/empty-state.tsx`, `components/nav-rail.tsx`, `components/tab-bar.tsx`, `app/(app)/page.tsx`, `app/(app)/crews/page.tsx`, `app/(app)/crews/[id]/page.tsx`
- Test: `e2e/social.spec.ts`

**Interfaces:**
- Produces: `createCrew(name: string)`, `addCrewMember(crewId, userId)`, `leaveCrew(crewId)`; `toggleCheers(sessionId): Promise<{ cheered: boolean; count: number }>`; `getFeed(opts: { crewId?: string; before?: string; limit?: number /* 20 */ }): Promise<FeedItem[]>`; `type FeedItem = { id: string; profile: ProfileLite; movie: MovieSummary; influence: Influence; rating: number | null; recommend: boolean | null; review: string | null; watchedOn: string; cheers: number; cheeredByMe: boolean }`; `getHittingTonight(): Promise<MovieSummary[]>` (queue ∩ crew sessions with recommend=true, max 10).

- [ ] **Step 1: Failing e2e:** seeded bob sees alice's friends-only session on Tonight; cheers toggles count 0→1→0; brand-new user sees "Log your first session" empty state with invite link.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implement. Feed relies on RLS (no app-side visibility logic). SessionCard: horizontal, poster rotated −3°, edge glow in influence color, label badge. NavRail desktop ≥ 768px, TabBar below; items Tonight · Discover · Log · Crews · Me. Crew page: members, crew feed (`getFeed({crewId})`), shared lists, crew top picks.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: crews, feed, cheers, Tonight`.

---

## Phase 5 — Discovery and collections

### Task 13: Discover

**Files:**
- Create: `lib/stats.ts`, `lib/queries/discover.ts`, `app/(app)/discover/page.tsx`
- Test: `tests/unit/stats.test.ts`

**Interfaces:**
- Produces: `MIN_LOGS = 5`; `rankForDiscover(rows: InfluenceStat[] & { tmdbId: number }[], influence: Exclude<Influence,'sober'>, minLogs = MIN_LOGS): typeof rows` — filter influence + `logCount >= minLogs` + `recommendPct != null`, sort by `recommendPct` desc then `logCount` desc; `formatRecommendPct(p: number | null): string` — null → `'—'`, else `Math.round(p) + '%'`.

- [ ] **Step 1: Failing tests:** movie with 4 logs excluded; tie on pct broken by log count; null pct excluded; `formatRecommendPct(null)` → `'—'`; `formatRecommendPct(66.67)` → `'67%'`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implement. Page tabs Best High · Best Drunk · Best Both (`?tab=`), genre filter (`?genre=`, from `movies.genres`), "Trending with friends" (friends' sessions last 14 days, by count).
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: discover rankings`.

### Task 14: Profile

**Files:**
- Create: `lib/queries/profile.ts`, `app/(app)/u/[username]/page.tsx`
- Test: `tests/unit/profile.test.ts`

**Interfaces:**
- Produces: `influenceBreakdown(rows: { influence: Influence }[]): Record<Influence, number>` (percent, sums to 100 after rounding fix; empty → all 0); `getProfile(username)` returning profile, visible sessions grouped by month, lists, friend status.

- [ ] **Step 1: Failing tests:** 3 high + 1 drunk → `{ high: 75, drunk: 25, both: 0, sober: 0 }`; 1/1/1 → sums to 100; empty → zeros.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implement; month strip diary; breakdown bar uses influence colors **and** labels.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: profile and influence breakdown`.

### Task 15: Lists and queue

**Files:**
- Create: `actions/lists.ts`, `actions/queue.ts`, `app/(app)/lists/[id]/page.tsx`, `app/(app)/queue/page.tsx`
- Modify: `app/(app)/movie/[tmdbId]/page.tsx` (wire buttons)
- Test: `tests/unit/reorder.test.ts`

**Interfaces:**
- Produces: `createList({ title, description?, visibility, crewId? })`, `addToList(listId, tmdbId, note?)`, `removeFromList`, `reorderList(listId, orderedTmdbIds: number[])`, `toggleQueue(tmdbId): Promise<{ queued: boolean }>`; pure `moveItem<T>(arr: T[], from: number, to: number): T[]`.

- [ ] **Step 1: Failing tests:** `moveItem([a,b,c],0,2)` → `[b,c,a]`; out-of-range `to` clamps.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implement; drag reorder via `motion` `Reorder.Group`, keyboard fallback up/down buttons.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: lists and tonight queue`.

### Task 16: Command palette

**Files:**
- Create: `components/command-palette.tsx`
- Modify: `app/(app)/layout.tsx`
- Test: `e2e/palette.spec.ts`

**Interfaces:**
- Consumes: `/api/tmdb/search`, profiles search, own lists.

- [ ] **Step 1: Failing e2e:** `Control+K` opens palette; typing "incep" shows Inception under "Movies"; Enter navigates to `/movie/27205`; TMDB 502 shows "Search is down — retry".
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implement with shadcn `Command` (cmdk), debounce 250ms, groups Movies / People / Lists.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: command palette search`.

---

## Phase 6 — Polish and ship

### Task 17: Motion polish, accessibility pass, seed, deploy

**Files:**
- Modify: components from Tasks 8–16 as needed; `app/layout.tsx` (200ms blur-fade page transition)
- Create: `supabase/seed.sql`, `e2e/a11y.spec.ts`

- [ ] **Step 1: Failing e2e:** `@axe-core/playwright` reports zero serious/critical violations on `/gate`, `/`, `/discover`, `/movie/27205`; with `reducedMotion: 'reduce'` the `[data-haze]` element has no running animation.
- [ ] **Step 2:** → FAIL (or pass parts).
- [ ] **Step 3:** Fix violations; add drunk wobble / high drift badge hover; seed 6 demo users, 2 crews, ~60 sessions over 20 real TMDB ids (ensure ≥ 5 public logs on several movies so Discover is populated).
- [ ] **Step 4:** Full suite: `npx supabase test db && npx vitest run && npx playwright test` → all PASS; `npm run build` succeeds.
- [ ] **Step 5:** Deploy: push migrations to the Supabase cloud project (`npx supabase db push`), set Vercel env vars, deploy; smoke-test gate → login → log → movie page on the live URL. Commit `chore: polish, seed, deploy config`.
