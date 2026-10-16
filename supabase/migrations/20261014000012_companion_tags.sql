-- A companion row is now a tag: the tagged friend approves it as their own sesh, or declines.
alter table session_companions
  add column status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  add column own_session_id uuid references sessions(id) on delete set null;
update session_companions set status = 'pending';

revoke update on session_companions from authenticated;
grant update (status, own_session_id) on session_companions to authenticated;

create policy session_companions_update on public.session_companions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (own_session_id is null
      or exists (select 1 from public.sessions s where s.id = own_session_id and s.user_id = (select auth.uid())))
  );
