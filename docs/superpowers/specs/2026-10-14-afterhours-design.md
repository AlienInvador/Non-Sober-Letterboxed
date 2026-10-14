# Afterhours — Design Spec

Date: 2026-10-14
Status: Approved in brainstorming, pending written-spec review

## 1. Purpose

Afterhours is a social movie tracker for adults (21+) who watch movies drunk, high, or both. Its core is logging **watch sessions** under the influence and sharing them with friends and small groups ("crews"). Public reviews and aggregate ratings exist but are secondary.

It borrows Letterboxd's core feature set (log, review, lists, watchlist, social feed) but is deliberately distinct in product focus, social model, and visual design.

**Current goal:** portfolio-grade prototype that can grow into a real launch with test users.
**Platform:** web first. Backend and design tokens are structured so a future React Native (Expo) app can reuse them.

### Success criteria

- A new user can pass the age gate, sign up, and log their first session in under a minute.
- Logging a session takes about 4 taps (movie, influence, stars, recommend).
- A movie page shows ratings split by influence (Drunk / High / Both, Sober if present).
- Discover ranks movies by "% recommend" per influence.
- Friends-only, crew, and private sessions never leak to unauthorized users (proven by tests).
- No visual element reads as a Letterboxd copy (see section 6).

### Out of scope (v1)

- Journalism / editorial content, games, paid stats tier, ads.
- Comments on sessions (only a single "cheers" reaction).
- Real ID verification (self-attested DOB only).
- Native mobile app.

## 2. Product model

| Letterboxd concept | Afterhours |
|---|---|
| Diary entry / log | **Session**: movie + influence + stars + recommend + companions + visibility + optional review |
| Review | Review text on a session; public sessions appear on the movie page |
| Lists | Personal lists and shared crew lists |
| Watchlist | **Tonight queue** |
| One-way follows | Mutual **friends** + **crews** (small groups) |
| Rating histogram | **Split ratings card** per influence with % recommend |
| Likes | **Cheers** (🍻) reaction |
| Journal, games, Pro stats | Dropped |

### Influence

Each session has exactly one `influence` value:

- `drunk`
- `high`
- `both` (drunk and high)
- `sober` (optional, low emphasis, no recommend toggle)

### Rating

- Stars: 0.5–5 in half steps, optional.
- Recommend: boolean "Recommend it [high / drunk / both]?", optional. Not shown for `sober`.

### Visibility

Each session has a `visibility`: `private`, `crew`, `friends` (default), or `public`. `crew` requires a `crew_id`.

## 3. Data model (Supabase Postgres)

### Tables

**profiles**
- `id uuid pk` → `auth.users.id`
- `username text unique not null`
- `display_name text`
- `avatar_url text`
- `birthdate date not null` — 21+ enforced by a BEFORE INSERT/UPDATE trigger (a CHECK using `current_date` is not immutable, so a trigger is used instead)
- `created_at timestamptz default now()`

**movies** (TMDB cache)
- `tmdb_id int pk`
- `title text not null`, `year int`, `poster_path text`, `backdrop_path text`
- `genres text[]`, `runtime int`
- `cached_at timestamptz not null`

**sessions**
- `id uuid pk`
- `user_id uuid not null` → profiles
- `tmdb_id int not null` → movies
- `watched_on date not null default current_date`
- `influence influence_enum not null` (`drunk | high | both | sober`)
- `rating numeric(2,1)` — check: null or 0.5–5.0 in 0.5 steps
- `recommend boolean` — check: null when `influence = 'sober'`
- `review text`
- `visibility visibility_enum not null default 'friends'` (`private | crew | friends | public`)
- `crew_id uuid` → crews — check: not null iff `visibility = 'crew'`
- `rewatch boolean not null default false`
- `created_at timestamptz default now()`

**session_companions**
- `session_id uuid` → sessions, `user_id uuid` → profiles; pk (session_id, user_id)
- Companions must be accepted friends of the session owner (enforced by insert policy).

**friendships**
- `user_a uuid`, `user_b uuid` with check `user_a < user_b`; pk (user_a, user_b)
- `status text` (`pending | accepted`)
- `requested_by uuid`

**crews**
- `id uuid pk`, `name text not null`, `created_by uuid`, `created_at`

**crew_members**
- `crew_id uuid`, `user_id uuid`, `role text` (`owner | member`); pk (crew_id, user_id)

**cheers**
- `session_id uuid`, `user_id uuid`; pk (session_id, user_id)

**lists**
- `id uuid pk`, `owner_id uuid` (nullable when crew-owned), `crew_id uuid` (nullable)
- check: exactly one of `owner_id`, `crew_id` set
- `title text not null`, `description text`, `visibility visibility_enum`

**list_items**
- `list_id uuid`, `tmdb_id int`, `position int`, `added_by uuid`, `note text`; pk (list_id, tmdb_id)

**queue**
- `user_id uuid`, `tmdb_id int`, `added_at timestamptz`; pk (user_id, tmdb_id)

### Stats view

`movie_influence_stats` (view over **public** sessions only):

- `tmdb_id`, `influence`, `log_count`, `avg_rating`, `recommend_pct`
- `recommend_pct` = recommend true / (recommend true + recommend false); null when no votes.

Discover ranks by `recommend_pct` with a minimum `log_count` (default 5, configurable constant) to stop single votes topping the charts.

### Row Level Security

All tables have RLS enabled. Session read access:

- owner: always
- `public`: everyone (authenticated)
- `friends`: accepted friends of the owner
- `crew`: members of `crew_id`
- tagged companions: always

Lists follow the same visibility rules; crew lists are readable and writable by crew members. Writes are owner-only except crew list items (any member) and cheers (any user who can read the session).

## 4. Screens and flows

### Navigation

Desktop: slim left rail. Mobile: bottom tab bar.
Items: **Tonight · Discover · ⊕ Log · Crews · Me**.
Search: ⌘K command palette (movies, people, lists).

### Screens

1. **Age gate** (`/gate`) — full-screen DOB entry. Under 21: polite exit screen. Pass: sets `age_ok` cookie.
2. **Tonight** (home) — feed of friend and crew sessions (poster, influence badge, stars, review snippet, cheers). Top rail "Hitting tonight": crew-recommended movies that are in your queue.
3. **Log sheet** — slides up from anywhere. Steps: search movie → influence chips (Drunk / High; both selected = Both; small "sober" link) → stars → recommend toggle (label follows influence). Collapsed optional section: companions, visibility (default friends), review, rewatch.
4. **Movie page** — backdrop, poster, split ratings card (Drunk / High / Both; Sober small), friends who watched with influence badges, public reviews filterable by influence, add to queue / list.
5. **Discover** — tabs Best High · Best Drunk · Best Both; genre filter; "Trending with friends".
6. **Crews** — list of crews; crew page with members, crew feed, shared lists, crew top picks.
7. **Me / profile** — session diary (month strip), influence breakdown, lists, friends. Other profiles respect visibility.
8. **Lists and queue** — view, drag reorder, item notes.
9. **Friends** — user search, incoming/outgoing requests, invite link.

### Empty and error states

- New user with no friends: "Log your first session" call to action plus invite link, not an empty feed.
- TMDB unavailable: cached movies still render; search shows a retry.
- Failed session save: sheet stays open with inputs preserved and an error message.

## 5. Design system — "Afterhours Neon"

### Color tokens

| Token | Value | Role |
|---|---|---|
| `bg` | `#07060B` | page background |
| `surface` | `#110E1A` | cards |
| `surface-2` | `#1A1526` | sheets, raised |
| `line` | `rgba(255,255,255,.08)` | borders |
| `text` | `#F4EEFF` | primary text |
| `muted` | `#9A90B3` | secondary text |
| `accent` | `#8B5CFF` | primary actions, focus |
| `drunk` | `#FF2E88` | Drunk data and UI |
| `high` | `#B6FF3B` | High data and UI |
| `both` | gradient `drunk → high` | Both |
| `sober` | `#7A8BA8` | Sober, low emphasis |

Influence colors are semantic: badges, poster glows, chart bars, and star fills use the session's influence color.

### Typography

- Display: **Unbounded**
- Body: **Manrope**
- Numbers / stats: **JetBrains Mono**
- Sentence case everywhere; no uppercase letter-spaced labels.

### Components

Built on shadcn/ui + Radix primitives, fully restyled:
`InfluenceChip`, `NeonStars`, `RecommendToggle`, `SessionCard`, `SplitRatingCard`, `PosterTile`, `AvatarStack`, `CheersButton`, `LogSheet`, `CommandPalette`.

- `SessionCard`: horizontal layout, slightly tilted poster, influence-colored edge glow.
- `PosterTile`: 14px radius, influence rim glow on hover.

### Motion (`motion` library)

- Background: slow animated smoke haze, low opacity, GPU-composited.
- Age gate: neon-sign flicker-on.
- Posters: 3D hover tilt with rim glow.
- Influence chips: selecting both morphs to the gradient.
- Session saved: glow burst + 🍻 clink particles.
- Badges: drunk wobble / high drift on hover.
- Page transitions: 200ms blur-fade.
- `prefers-reduced-motion`: haze, flicker, tilt, and wobble disabled.

### Accessibility

- WCAG AA contrast for all text.
- Glow is decoration only; influence is always also shown by label or icon.
- Visible focus rings in `accent`.
- All interactive components keyboard operable (Radix).

### Portability

Tokens defined once and exported as CSS variables, the Tailwind theme, and a TypeScript object for future React Native reuse.

## 6. Distinction from Letterboxd

Avoid all of these observed Letterboxd patterns:

- Three-dot logo, slate background, orange/green/blue palette.
- Uppercase letter-spaced top navigation and section headers with rules.
- Centered slate content column.
- Plain poster grid with eye / list / heart stat rows.
- Green "+ LOG" button.

No Letterboxd code, assets, copy, or branding is used.

## 7. Architecture

### Stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS v4, shadcn/ui, motion
- Supabase: Postgres, Auth (email magic link + Google), Storage (avatars), RLS
- `@supabase/ssr` for server/client auth
- Hosting: Vercel + Supabase free tier

### TMDB layer

- Server-only route handlers proxy TMDB; the API key is never sent to the browser.
- Movies are upserted into `movies` on first view or log; refreshed when `cached_at` is older than 24h.
- Footer attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB."

### Age gate

- Next.js middleware redirects requests without the `age_ok` cookie to `/gate`.
- Signup requires DOB; the `profiles.birthdate` trigger enforces 21+ server-side.
- Self-attested only in v1.

### Mobile readiness

- Business rules live in Postgres (constraints, RLS, views), not in web-only code.
- A future Expo app uses the same Supabase project and the exported design tokens.

## 8. Testing

- **RLS tests (SQL)** — highest priority. Prove private, friends, and crew sessions are not visible to unauthorized users; companions can see tagged sessions; crew list write rules.
- **Vitest** — stats/ranking logic (minimum log threshold, recommend percentage), influence → label mapping.
- **Playwright** — age gate (pass and fail) and the full log flow end-to-end.

## 9. Build phases

0. **Claude Design prototype** — design system plus key screens (Tonight, Log sheet, Movie page, Discover) with mock data. User approves before code.
1. Scaffold, design tokens, schema, RLS, RLS tests.
2. Auth, age gate, profiles.
3. TMDB layer, movie page, log sheet.
4. Friends, crews, feed, cheers.
5. Discover, stats view, lists, queue.
6. Motion polish, seeded demo users, deploy.
