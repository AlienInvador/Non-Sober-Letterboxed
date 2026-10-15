# geeked-drunk

Social movie log for adults 21+. Next.js 15 (App Router) and Supabase.

## Demo data

`npm run seed:demo` loads 6 demo users, crews, ~60 sessions over 20 movies (idempotent; touches only `demo-*` users).

## Deploy (Netlify)

Build command `npm run build`, publish dir `.next` (see `netlify.toml`). The Next.js runtime is auto-detected.

Set these environment variables in the Netlify site settings (names only, never commit values):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `TMDB_API_KEY`

`SUPABASE_DB_URL` is not needed at runtime (only for `npm run test:db`).

After the first deploy, add the Netlify domain to the Supabase Auth redirect URLs (Authentication > URL Configuration), including `https://<your-site>/auth/callback`.
