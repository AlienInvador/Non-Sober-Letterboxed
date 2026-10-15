-- Social recs: a user sends a movie + influence (+ short note) to a friend or to one of their crews.
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid references public.profiles(id) on delete cascade,
  crew_id uuid references public.crews(id) on delete cascade,
  tmdb_id int not null references public.movies(tmdb_id),
  influence public.influence not null check (influence <> 'sober'),
  note text check (char_length(note) <= 140),
  session_id uuid references public.sessions(id) on delete set null,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((to_user is null) <> (crew_id is null))
);

create index recommendations_to_user_idx on public.recommendations (to_user, created_at desc);
create index recommendations_crew_idx on public.recommendations (crew_id, created_at desc);

alter table public.recommendations enable row level security;

revoke all on public.recommendations from anon;
-- Only the recipient's dismissal is mutable. v1: crew recs are not dismissible (no per-member dismissal state).
revoke update on public.recommendations from authenticated;
grant update (dismissed_at) on public.recommendations to authenticated;

create policy recs_insert on public.recommendations for insert to authenticated
  with check (
    from_user = (select auth.uid())
    and ((to_user is not null and private.are_friends((select auth.uid()), to_user))
      or (crew_id is not null and private.is_crew_member(crew_id, (select auth.uid()))))
    -- a rec may only point at the sender's own sesh
    and (session_id is null or exists (select 1 from public.sessions s where s.id = session_id and s.user_id = (select auth.uid())))
  );

create policy recs_select on public.recommendations for select to authenticated
  using (
    from_user = (select auth.uid())
    or to_user = (select auth.uid())
    or (crew_id is not null and private.is_crew_member(crew_id, (select auth.uid())))
  );

create policy recs_update on public.recommendations for update to authenticated
  using (to_user = (select auth.uid()))
  with check (to_user = (select auth.uid()));

create policy recs_delete on public.recommendations for delete to authenticated
  using (from_user = (select auth.uid()));
