# Geeked-Drunk — Design Spec

Date: 2026-10-14
Status: Approved in brainstorming, pending written-spec review

## 1. Purpose

Geeked-Drunk is a social movie tracker for adults (21+) who watch movies drunk, high, or both. Its core is logging **watch sessions** under the influence and sharing them with friends and small groups ("crews"). Public reviews and aggregate ratings exist but are secondary.

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

0. **Landing** (`/` when signed out, after the gate): editorial hero, poster fan, marquee, how it works 01/02/03, split-ratings section, crews section, closing CTA, TMDB attribution.
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

## 5. Design system — "Geeked-Drunk Cozy"

Approved prototype: https://claude.ai/artifact/SneR2fm2nbRL8UnJRqwmJ7 (the visual source of truth for layout, spacing, and copy).

Direction: cozy, warm, organic, flat. Like a dim living room, not a neon club. No glow, no backdrop blur, no glassmorphism, no background blobs, no colored card outlines.

### Color tokens

| Token | Value | Role |
|---|---|---|
| `bg` | `#2A2522` | page background (warm charcoal-brown) |
| `card` | `#332D29` | cards, nav hover |
| `raised` | `#3D3631` | sheets, secondary buttons, poster placeholder |
| `selected` | `#48403A` | selected segment / tab |
| `track` | `#524943` | empty stars, switch track off |
| `line` | `rgba(242,237,230,.06)` | dividers (rare) |
| `text` | `#F2EDE6` | primary text |
| `body` | `#DED6CF` | long-form text |
| `muted` | `#ABA29A` | metadata |
| `faint` | `#948B83` | decorative numerals, fine print |
| `accent` | `#8B5CFF` | links, icons, focus |
| `accent-fill` | `#7444EC` | primary buttons (white text) |
| `note` | `#C9B5FF` | handwritten notes, eyebrows |
| `drunk` | `#FF2E88` | Drunk signal |
| `high` | `#B6FF3B` | High signal |
| `both` | `#E8A0FF` solid; split dot `linear-gradient(90deg,#FF2E88 50%,#B6FF3B 50%)` | Both signal |
| `sober` | `#8A94A6` | Sober, low emphasis |

One accent per screen. Influence colors appear only as small signals: an 8px dot, a rating number, a label. The only gradient allowed in layout is the dark fade at the bottom of a backdrop hero.

### Typography

- Display: **Fraunces** with `font-variation-settings: "SOFT" 100, "WONK" 1`, letter-spacing about -0.015em to -0.035em.
- Body: **Figtree**.
- Numbers / stats / small eyebrows: **JetBrains Mono**.
- Personal notes, greetings, friend quotes: **Caveat** (sparingly).
- Sentence case everywhere.

### Shape, space, imagery

- Radius: poster 6px (8px large), control 12px, card 16px, hero/feature blocks 24-32px, primary buttons pill.
- Spacing scale 4, 8, 12, 16, 24, 32, 48, 64, 72; 56-72px between sections in the app, 120-180px on the landing page.
- Posters: TMDB `w342` (lists) / `w500` (detail), fixed 2:3, `object-fit: cover`, no border. Backdrops: `w1280`.
- Loading: neutral skeleton shimmer in poster shape, image fades in over 200ms. Missing poster: solid `raised` tile with the title in small text.
- Original line-art illustrations (couch, lamp, glass, smoke curl) as inline SVG for the gate, landing, and empty states.

### Components

`InfluenceSegment` (Drunk / High two-option segmented control; both selected = Both; small "I was sober" text button), `InfluenceDot`, `Stars` (half-step, influence-colored, no glow), `RecommendSwitch`, `PosterImage`, `SessionRow` (feed item: poster, who and when, title, dot + label + rating, review; cheers button fades in on hover), `SplitRatings` (plain columns separated by 1px dividers), `AvatarStack`, `CheersButton`, `LogSheet`, `CommandPalette`, `HeroBackdrop`, `Marquee`.

### Motion (`motion` library)

- 150-250ms, ease-out `cubic-bezier(.2,.8,.2,1)`, 8-12px slides, scale 0.98 to 1.
- List items stagger 35ms on load.
- Poster hover: translateY(-2px) scale(1.02); no glow.
- Shared-element transition: poster in a list/feed expands into the movie page hero (`layoutId`).
- Landing: sections reveal on scroll (fade + 12px rise); accent marquee band with wave edges scrolls continuously; poster fan lifts on hover.
- Log saved: calm check + "cheers to that." note, 200ms pop.
- `prefers-reduced-motion`: all of the above disabled except opacity fades.

### Voice

- Product name: **Geeked-Drunk**; wordmark lowercase `geeked-drunk` in Fraunces.
- A log is a **sesh** ("Log a sesh", "Your people's seshes").
- Copy is explicit about alcohol and weed and friendly about healthy use. Gate and landing carry: "Know your limits, never drive after, look out for each other."

### Accessibility

- WCAG AA contrast for text; white on `accent-fill` for buttons.
- Influence is never conveyed by color alone (always a label).
- Visible focus rings in `accent`; all interactive components keyboard operable (Radix).

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
- Hosting: Netlify (or Cloudflare) connected to the GitHub repo, auto-deploy on push to `main`; Supabase free tier. Not Vercel (user choice).

### TMDB layer

- Server-only route handlers proxy TMDB; the API key is never sent to the browser. The key in use is a TMDB v3 key (`?api_key=`); a read-access JWT (`Authorization: Bearer`) is also accepted, chosen by key length.
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
