-- Row Level Security (spec §3). All app access is `authenticated`; anon gets no policies.

-- helpers: security definer so policies can read friendships/crew_members/companions without RLS recursion
create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships
    where user_a = least(a, b) and user_b = greatest(a, b) and status = 'accepted'
  )
$$;

create function public.is_crew_member(c uuid, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.crew_members where crew_id = c and user_id = u)
$$;

create function public.is_crew_owner(c uuid, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.crew_members where crew_id = c and user_id = u and role = 'owner')
$$;

create function public.crew_has_members(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.crew_members where crew_id = c)
$$;

create function public.can_read_session(s public.sessions) returns boolean
language sql stable security definer set search_path = '' as $$
  select s.user_id = auth.uid()
    or s.visibility = 'public'
    or (s.visibility = 'friends' and public.are_friends(s.user_id, auth.uid()))
    or (s.visibility = 'crew' and public.is_crew_member(s.crew_id, auth.uid()))
    or exists (select 1 from public.session_companions sc where sc.session_id = s.id and sc.user_id = auth.uid())
$$;

revoke execute on function public.are_friends(uuid, uuid), public.is_crew_member(uuid, uuid),
  public.is_crew_owner(uuid, uuid), public.crew_has_members(uuid), public.can_read_session(public.sessions)
  from public, anon;
grant execute on function public.are_friends(uuid, uuid), public.is_crew_member(uuid, uuid),
  public.is_crew_owner(uuid, uuid), public.crew_has_members(uuid), public.can_read_session(public.sessions)
  to authenticated;

-- profiles
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- movies: read-only for users; writes via service role only
create policy movies_select on public.movies for select to authenticated using (true);

-- friendships: requests start pending; only the non-requester can accept
create policy friendships_select on public.friendships for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy friendships_insert on public.friendships for insert to authenticated
  with check (requested_by = (select auth.uid()) and (select auth.uid()) in (user_a, user_b) and status = 'pending');
create policy friendships_update on public.friendships for update to authenticated
  using ((select auth.uid()) in (user_a, user_b))
  with check ((select auth.uid()) in (user_a, user_b) and (status = 'pending' or requested_by <> (select auth.uid())));
create policy friendships_delete on public.friendships for delete to authenticated
  using ((select auth.uid()) in (user_a, user_b));
-- only status is mutable, so requested_by can't be rewritten to self-accept
revoke update on public.friendships from authenticated, anon;
grant update (status) on public.friendships to authenticated;

-- crews
create policy crews_select on public.crews for select to authenticated
  using (public.is_crew_member(id, (select auth.uid())) or created_by = (select auth.uid()));
create policy crews_insert on public.crews for insert to authenticated with check (created_by = (select auth.uid()));
create policy crews_update on public.crews for update to authenticated
  using (public.is_crew_owner(id, (select auth.uid()))) with check (public.is_crew_owner(id, (select auth.uid())));
create policy crews_delete on public.crews for delete to authenticated
  using (public.is_crew_owner(id, (select auth.uid())));

-- crew_members: members read; owners manage; creator bootstraps self as owner of an empty crew
create policy crew_members_select on public.crew_members for select to authenticated
  using (public.is_crew_member(crew_id, (select auth.uid())));
create policy crew_members_insert on public.crew_members for insert to authenticated
  with check (
    public.is_crew_owner(crew_id, (select auth.uid()))
    or (user_id = (select auth.uid()) and role = 'owner' and not public.crew_has_members(crew_id)
        and exists (select 1 from public.crews c where c.id = crew_id and c.created_by = (select auth.uid())))
  );
create policy crew_members_update on public.crew_members for update to authenticated
  using (public.is_crew_owner(crew_id, (select auth.uid()))) with check (public.is_crew_owner(crew_id, (select auth.uid())));
create policy crew_members_delete on public.crew_members for delete to authenticated
  using (public.is_crew_owner(crew_id, (select auth.uid())) or user_id = (select auth.uid()));

-- sessions
create policy sessions_select on public.sessions for select to authenticated using (public.can_read_session(sessions));
create policy sessions_insert on public.sessions for insert to authenticated
  with check (user_id = (select auth.uid()) and (visibility <> 'crew' or public.is_crew_member(crew_id, (select auth.uid()))));
create policy sessions_update on public.sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (visibility <> 'crew' or public.is_crew_member(crew_id, (select auth.uid()))));
create policy sessions_delete on public.sessions for delete to authenticated using (user_id = (select auth.uid()));

-- session_companions (subqueries on sessions are themselves filtered by sessions_select)
create policy session_companions_select on public.session_companions for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id));
create policy session_companions_insert on public.session_companions for insert to authenticated
  with check (
    exists (select 1 from public.sessions s where s.id = session_id and s.user_id = (select auth.uid()))
    and public.are_friends((select auth.uid()), user_id)
  );
create policy session_companions_delete on public.session_companions for delete to authenticated
  using (user_id = (select auth.uid())
    or exists (select 1 from public.sessions s where s.id = session_id and s.user_id = (select auth.uid())));

-- cheers
create policy cheers_select on public.cheers for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id));
create policy cheers_insert on public.cheers for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.sessions s where s.id = session_id));
create policy cheers_delete on public.cheers for delete to authenticated using (user_id = (select auth.uid()));

-- lists: personal lists follow session visibility; crew lists are read/write for members (public crew lists readable by all)
create policy lists_select on public.lists for select to authenticated
  using (
    owner_id = (select auth.uid())
    or visibility = 'public'
    or (crew_id is not null and public.is_crew_member(crew_id, (select auth.uid())))
    or (visibility = 'friends' and owner_id is not null and public.are_friends(owner_id, (select auth.uid())))
  );
create policy lists_insert on public.lists for insert to authenticated
  with check (owner_id = (select auth.uid()) or (crew_id is not null and public.is_crew_member(crew_id, (select auth.uid()))));
create policy lists_update on public.lists for update to authenticated
  using (owner_id = (select auth.uid()) or (crew_id is not null and public.is_crew_member(crew_id, (select auth.uid()))))
  with check (owner_id = (select auth.uid()) or (crew_id is not null and public.is_crew_member(crew_id, (select auth.uid()))));
create policy lists_delete on public.lists for delete to authenticated
  using (owner_id = (select auth.uid()) or (crew_id is not null and public.is_crew_member(crew_id, (select auth.uid()))));

-- list_items (subqueries on lists are filtered by lists_select)
create policy list_items_select on public.list_items for select to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id));
create policy list_items_insert on public.list_items for insert to authenticated
  with check (added_by = (select auth.uid()) and exists (select 1 from public.lists l where l.id = list_id
    and (l.owner_id = (select auth.uid()) or (l.crew_id is not null and public.is_crew_member(l.crew_id, (select auth.uid()))))));
create policy list_items_update on public.list_items for update to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id
    and (l.owner_id = (select auth.uid()) or (l.crew_id is not null and public.is_crew_member(l.crew_id, (select auth.uid()))))))
  with check (exists (select 1 from public.lists l where l.id = list_id
    and (l.owner_id = (select auth.uid()) or (l.crew_id is not null and public.is_crew_member(l.crew_id, (select auth.uid()))))));
create policy list_items_delete on public.list_items for delete to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id
    and (l.owner_id = (select auth.uid()) or (l.crew_id is not null and public.is_crew_member(l.crew_id, (select auth.uid()))))));

-- queue
create policy queue_own on public.queue for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- deleting a crew: crew sessions fall back to private (FK set null alone would break the visibility/crew_id check);
-- crew lists and memberships go via on delete cascade
create function public.crews_before_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.sessions set visibility = 'private', crew_id = null where crew_id = old.id;
  return old;
end $$;
revoke execute on function public.crews_before_delete() from public, anon, authenticated;

create trigger crews_before_delete before delete on public.crews
  for each row execute function public.crews_before_delete();

-- indexes
create index sessions_user_watched_idx on public.sessions (user_id, watched_on desc);
create index sessions_tmdb_idx on public.sessions (tmdb_id);
create index sessions_crew_idx on public.sessions (crew_id);
create index crew_members_user_idx on public.crew_members (user_id);
create index friendships_user_b_idx on public.friendships (user_b);
create index cheers_user_idx on public.cheers (user_id);
create index queue_tmdb_idx on public.queue (tmdb_id);
create index list_items_tmdb_idx on public.list_items (tmdb_id);
