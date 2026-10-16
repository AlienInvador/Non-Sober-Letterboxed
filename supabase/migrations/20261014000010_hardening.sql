-- Final review hardening.

-- I1: crew owners can add only their friends (the owner branch used to accept any user).
drop policy crew_members_insert on public.crew_members;
create policy crew_members_insert on public.crew_members for insert to authenticated
  with check (
    (private.is_crew_owner(crew_id, (select auth.uid())) and private.are_friends((select auth.uid()), user_id))
    or (user_id = (select auth.uid()) and role = 'owner' and not private.crew_has_members(crew_id)
        and exists (select 1 from public.crews c where c.id = crew_id and c.created_by = (select auth.uid())))
  );

-- M3: length limits (direct PostgREST writes skip zod)
alter table public.sessions add constraint sessions_review_len check (review is null or char_length(review) <= 2000);
alter table public.lists add constraint lists_title_len check (char_length(title) <= 100);
alter table public.lists add constraint lists_description_len check (description is null or char_length(description) <= 500);
alter table public.crews add constraint crews_name_len check (char_length(name) <= 60);
alter table public.profiles add constraint profiles_display_name_len check (display_name is null or char_length(display_name) <= 50);

-- M4: users may edit only display_name and username (avatar_url would be a tracking-pixel vector; birthdate is write-once)
revoke update on public.profiles from authenticated, anon;
grant update (username, display_name) on public.profiles to authenticated;

-- M6: usernames are unique case-insensitively
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- M8: only content columns of lists / list_items are mutable (no owner_id / crew_id / added_by rewrites)
revoke update on public.lists, public.list_items from authenticated, anon;
grant update (title, description, visibility) on public.lists to authenticated;
grant update (position, note) on public.list_items to authenticated;

-- M9: future functions in private are not executable by public/anon
alter default privileges in schema private revoke execute on functions from public, anon;
