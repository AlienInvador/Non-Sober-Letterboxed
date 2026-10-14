-- RLS hardening (Task 3 review): hide helpers from the API, hide birthdates, keep every crew owned.

-- 1. helpers move to a schema PostgREST/pg_graphql does not expose; policies reference functions by OID so they follow
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.are_friends(uuid, uuid) set schema private;
alter function public.is_crew_member(uuid, uuid) set schema private;
alter function public.is_crew_owner(uuid, uuid) set schema private;
alter function public.crew_has_members(uuid) set schema private;
alter function public.can_read_session(public.sessions) set schema private;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- 2. birthdate is PII: readable only via definer code / service role
revoke select on public.profiles from authenticated, anon;
grant select (id, username, display_name, avatar_url, created_at) on public.profiles to authenticated;

-- 3. a crew always keeps at least one owner (unless the crew or the owner's profile is being deleted)
create function public.crew_members_keep_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.crew_id <> old.crew_id)
     and exists (select 1 from public.crews where id = old.crew_id)
     and exists (select 1 from public.profiles where id = old.user_id)
     and not exists (select 1 from public.crew_members
                     where crew_id = old.crew_id and role = 'owner' and user_id <> old.user_id) then
    raise exception 'crew must keep an owner' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
revoke execute on function public.crew_members_keep_owner() from public, anon, authenticated;

create trigger crew_members_keep_owner before delete or update on public.crew_members
  for each row execute function public.crew_members_keep_owner();
