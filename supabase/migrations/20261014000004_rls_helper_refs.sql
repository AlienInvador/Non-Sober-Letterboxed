-- can_read_session's body named public.* helpers (SQL bodies resolve at call time); point it at private.*
create or replace function private.can_read_session(s public.sessions) returns boolean
language sql stable security definer set search_path = '' as $$
  select s.user_id = auth.uid()
    or s.visibility = 'public'
    or (s.visibility = 'friends' and private.are_friends(s.user_id, auth.uid()))
    or (s.visibility = 'crew' and private.is_crew_member(s.crew_id, auth.uid()))
    or exists (select 1 from public.session_companions sc where sc.session_id = s.id and sc.user_id = auth.uid())
$$;
