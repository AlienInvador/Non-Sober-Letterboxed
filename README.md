# geeked-drunk

Social movie log for adults 21+. Next.js 15 (App Router) and Supabase.

## Environments

The cloud Supabase project is production. It was wiped clean on 2026-10-16 and holds only real users.

- `npm run test:db` is safe to run against it: every test file runs in `begin … rollback`, so nothing persists.
- Playwright and `npm run seed:demo` create users with a committed test password, so they refuse to run against a non-local Supabase URL. `ALLOW_TEST_DATA=1` overrides the guard; never use it against production.

### Local Supabase for e2e and demo data

1. Start Docker Desktop, then run `npx supabase start`. It applies every migration in `supabase/migrations`.
2. Create `.env.e2e.local` (gitignored) from `npx supabase status -o env`:
   `NEXT_PUBLIC_SUPABASE_URL` = `API_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` = `SECRET_KEY`, `SUPABASE_DB_URL` = `DB_URL`.
3. `npx playwright test` and `npm run seed:demo` load `.env.e2e.local` first, so it wins over `.env.local`. Playwright runs its own dev server on port 3100, so a dev server on 3000 that points at production is never reused.
4. `npx supabase stop` when done.

## Demo data

`npm run seed:demo` (local only) loads 6 demo users, crews, ~60 sessions over 20 movies (idempotent; touches only `demo-*` users and friendships between demo users).

## Deploy (Netlify)

Build command `npm run build`, publish dir `.next` (see `netlify.toml`). The Next.js runtime is auto-detected.

Set these environment variables in the Netlify site settings (names only, never commit values):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `TMDB_API_KEY`

`SUPABASE_DB_URL` is not needed at runtime (only for `npm run test:db`).

After the first deploy, in the production Supabase project (Authentication > URL Configuration):

- Set **Site URL** to the Netlify domain (magic-link emails use it).
- Add the Netlify domain to the redirect URLs, including `https://<your-site>/auth/callback`.
- If Google sign-in is used, add the Supabase callback (`https://<project-ref>.supabase.co/auth/v1/callback`) to the Google OAuth client's authorized redirect URIs.

Netlify must build with Node 20 or newer. Point Netlify at the production project only (see Environments).
