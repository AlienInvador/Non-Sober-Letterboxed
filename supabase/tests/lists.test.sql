begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-00000000a11c', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000b0b0', 'b@test.local');
insert into profiles(id, username, birthdate) values
  ('00000000-0000-0000-0000-00000000a11c', 'alice', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000b0b0', 'bob', '1990-01-01');
insert into movies(tmdb_id, title, cached_at) values (1, 'One', now()), (2, 'Two', now()), (3, 'Three', now());
insert into lists(id, owner_id, title, visibility) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000a11c', 'L', 'public');
insert into list_items(list_id, tmdb_id, position, added_by) values
  ('00000000-0000-0000-0000-0000000000a1', 1, 0, '00000000-0000-0000-0000-00000000a11c'),
  ('00000000-0000-0000-0000-0000000000a1', 2, 1, '00000000-0000-0000-0000-00000000a11c'),
  ('00000000-0000-0000-0000-0000000000a1', 3, 2, '00000000-0000-0000-0000-00000000b0b0');

insert into lists(id, owner_id, title, visibility) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000a11c', 'Empty', 'private'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000a11c', 'Secret', 'private');
insert into list_items(list_id, tmdb_id, position, added_by) values
  ('00000000-0000-0000-0000-0000000000a3', 1, 0, '00000000-0000-0000-0000-00000000a11c');
insert into crews(id, name, created_by) values ('00000000-0000-0000-0000-0000000000c1', 'K', '00000000-0000-0000-0000-00000000a11c');
insert into crew_members(crew_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000a11c', 'owner'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b0b0', 'member');
insert into lists(id, crew_id, title, visibility) values ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c1', 'Crew', 'friends');
insert into list_items(list_id, tmdb_id, position, added_by) values
  ('00000000-0000-0000-0000-0000000000a4', 1, 0, '00000000-0000-0000-0000-00000000a11c'),
  ('00000000-0000-0000-0000-0000000000a4', 2, 1, '00000000-0000-0000-0000-00000000a11c');

select plan(9);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a11c","role":"authenticated"}';
select lives_ok($$select public.reorder_list('00000000-0000-0000-0000-0000000000a1', '{3,1,2}')$$, 'owner reorders incl. item added by other');
select results_eq($$select tmdb_id from list_items where list_id = '00000000-0000-0000-0000-0000000000a1' order by position$$, $$values (3),(1),(2)$$, 'positions applied');
select throws_ok($$select public.reorder_list('00000000-0000-0000-0000-0000000000a1', '{1,2}')$$, 'ids must match the list items', 'missing id rejected');
select throws_ok($$select public.reorder_list('00000000-0000-0000-0000-0000000000a1', '{1,1,2}')$$, 'ids must match the list items', 'duplicate rejected');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000b0b0","role":"authenticated"}';
select throws_ok($$select public.reorder_list('00000000-0000-0000-0000-0000000000a1', '{1,2,3}')$$, 'not allowed', 'non-writer rejected by RLS');

-- bob is a crew member
select lives_ok($$select public.reorder_list('00000000-0000-0000-0000-0000000000a4', '{2,1}')$$, 'crew member reorders crew list');
-- bob cannot see or write alice's private list
select throws_ok($$select public.reorder_list('00000000-0000-0000-0000-0000000000a3', '{1}')$$, 'ids must match the list items', 'non-member cannot reorder private list');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a11c","role":"authenticated"}';
select lives_ok($$select public.reorder_list('00000000-0000-0000-0000-0000000000a2', '{}')$$, 'empty permutation on empty list is a no-op');

set local role anon;
select throws_ok($$select public.reorder_list('00000000-0000-0000-0000-0000000000a1', '{1,2,3}')$$, '42501', null, 'anon cannot execute');

select * from finish();
rollback;
