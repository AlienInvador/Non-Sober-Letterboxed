-- Owners may add friends only as plain members; promoting to owner is a separate update.
drop policy crew_members_insert on public.crew_members;
create policy crew_members_insert on public.crew_members for insert to authenticated
  with check (
    (private.is_crew_owner(crew_id, (select auth.uid())) and private.are_friends((select auth.uid()), user_id) and role = 'member')
    or (user_id = (select auth.uid()) and role = 'owner' and not private.crew_has_members(crew_id)
        and exists (select 1 from public.crews c where c.id = crew_id and c.created_by = (select auth.uid())))
  );
