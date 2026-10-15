-- Atomic crew creation: crew row + owner membership in one transaction. Takes no user id; owner is always the caller.
create function public.create_crew(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(p_name);
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if v_name is null or char_length(v_name) not between 1 and 60 then raise exception 'invalid crew name'; end if;
  insert into public.crews (name, created_by) values (v_name, auth.uid()) returning id into v_id;
  insert into public.crew_members (crew_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end $$;

revoke all on function public.create_crew(text) from public, anon;
grant execute on function public.create_crew(text) to authenticated;
