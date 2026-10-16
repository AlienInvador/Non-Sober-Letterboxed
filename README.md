# geeked-drunk

Social movie log for adults 21+. Next.js 15 (App Router) and Supabase.

## Demo data

`npm run seed:demo` loads 6 demo users, crews, ~60 sessions over 20 movies (idempotent; touches only `demo-*` users and friendships between demo users).

## Environments

Use two Supabase projects:

- **Dev/test**: seeded with demo data and used by `npm run test:db` and Playwright (the e2e users have a committed test password).
- **Production**: a SEPARATE project. Run `npx supabase db push` against it, and never seed it or run e2e or `test:db` against it.

Playwright's global setup and teardown create and delete data owned by the `e2e-*` users, so they must never see production.

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
