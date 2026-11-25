-- Food spots: a brand/name (not a location) as a second kind of sesh subject.
create extension if not exists pg_trgm with schema extensions;

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- identity: letters/digits only, lowercased, so "Taco Bell", "TacoBell", "taco-bell" merge
  name_key text generated always as (lower(regexp_replace(name, '[^[:alnum:]]', '', 'g'))) stored unique check (name_key <> ''),
  category text,
  created_at timestamptz not null default now()
);
create index places_name_key_trgm on public.places using gin (name_key extensions.gin_trgm_ops);

alter table public.places enable row level security;
revoke all on public.places from public, anon, authenticated;
grant select on public.places to authenticated;

alter table public.sessions alter column tmdb_id drop not null;
alter table public.sessions add column place_id uuid references public.places(id);
alter table public.sessions add constraint sessions_subject_one check (num_nonnulls(tmdb_id, place_id) = 1);
create index on public.sessions (place_id) where place_id is not null;
-- visible only via a session you can see (sessions RLS applies in the subquery), so private spot names don't leak
create policy places_select on public.places for select to authenticated using (exists (select 1 from public.sessions s where s.place_id = places.id));

-- Owner-privileged views (not security_invoker): expose only public-session aggregates.
drop view public.movie_influence_stats;
create view public.movie_influence_stats as
select tmdb_id,
  influence,
  count(*) as log_count,
  round(100.0 * count(*) filter (where recommend) / nullif(count(recommend), 0), 2) as recommend_pct
from public.sessions
where visibility = 'public' and tmdb_id is not null
group by tmdb_id, influence;
revoke all on public.movie_influence_stats from public, anon, authenticated;
grant select on public.movie_influence_stats to authenticated;

create view public.place_influence_stats as
select place_id,
  influence,
  count(*) as log_count,
  round(100.0 * count(*) filter (where recommend) / nullif(count(recommend), 0), 2) as recommend_pct
from public.sessions
where visibility = 'public' and place_id is not null
group by place_id, influence;
revoke all on public.place_influence_stats from public, anon, authenticated;
grant select on public.place_influence_stats to authenticated;

create function public.search_places(q text) returns setof public.places
language sql stable security invoker
set search_path = public, extensions as $$
  with k as (select lower(regexp_replace(q, '[^[:alnum:]]', '', 'g')) as key)
  select p.* from public.places p, k
  where k.key <> '' and (p.name_key % k.key or p.name_key like k.key || '%')
  order by similarity(p.name_key, k.key) desc
  limit 8
$$;
revoke all on function public.search_places(text) from public, anon;
grant execute on function public.search_places(text) to authenticated;

alter table public.profiles add column default_visibility visibility not null default 'friends';
grant select (default_visibility) on public.profiles to authenticated;
grant update (default_visibility) on public.profiles to authenticated;
