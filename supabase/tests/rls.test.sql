begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

create function mk_user(i uuid, name text) returns uuid language plpgsql as $$
begin
  insert into auth.users(id, email) values (i, name || '@test.local');
  insert into profiles(id, username, birthdate) values (i, name, '1990-01-01');
  return i;
end $$;

create function alice() returns uuid language sql as $$ select '00000000-0000-0000-0000-00000000a11c'::uuid $$;
create function bob()   returns uuid language sql as $$ select '00000000-0000-0000-0000-000000000b0b'::uuid $$;
create function carol() returns uuid language sql as $$ select '00000000-0000-0000-0000-00000000ca01'::uuid $$;
create function dave()  returns uuid language sql as $$ select '00000000-0000-0000-0000-00000000da7e'::uuid $$;
create function crew_k() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000000cc'::uuid $$;
create function list_k() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000001cc'::uuid $$;
create function s_private() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005a1'::uuid $$;
create function s_friends() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005a2'::uuid $$;
create function s_crew()    returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005a3'::uuid $$;
create function s_public()  returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005a4'::uuid $$;
create function s_dave_crew() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005d1'::uuid $$;

-- fixture (as postgres, bypasses RLS)
select mk_user(alice(), 'alice'), mk_user(bob(), 'bob'), mk_user(carol(), 'carol'), mk_user(dave(), 'dave');
insert into movies(tmdb_id, title, cached_at) values (1, 'Seed', now()), (2, 'Other', now());
insert into friendships(user_a, user_b, status, requested_by) values (least(alice(), bob()), greatest(alice(), bob()), 'accepted', alice());
insert into crews(id, name, created_by) values (crew_k(), 'K', alice());
insert into crew_members(crew_id, user_id, role) values (crew_k(), alice(), 'owner'), (crew_k(), dave(), 'member');
insert into lists(id, crew_id, title, visibility) values (list_k(), crew_k(), 'K picks', 'crew');
insert into sessions(id, user_id, tmdb_id, influence, visibility, crew_id) values
  (s_private(), alice(), 1, 'high', 'private', null),
  (s_friends(), alice(), 1, 'drunk', 'friends', null),
  (s_crew(),    alice(), 1, 'both', 'crew', crew_k()),
  (s_public(),  alice(), 1, 'sober', 'public', null),
  (s_dave_crew(), dave(), 2, 'high', 'crew', crew_k());

select plan(40);

select is((select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity), 0::bigint, 'RLS enabled on every public table');
select is((select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('are_friends', 'is_crew_member', 'is_crew_owner', 'crew_has_members', 'can_read_session')), 0::bigint, 'helpers no longer in public (not RPC-callable)');
select has_function('private', 'are_friends', array['uuid', 'uuid'], 'helpers live in private');

-- bob (friend)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000b0b","role":"authenticated"}';
select is((select count(*) from sessions where user_id = alice()), 2::bigint, 'friend sees friends + public');
select throws_ok($$ insert into sessions(user_id, tmdb_id, influence) values (alice(), 1, 'high') $$, '42501', null, 'bob cannot insert a session as alice');
select lives_ok($$ insert into cheers(session_id, user_id) values (s_friends(), bob()) $$, 'friend can cheer friends-only session');
select throws_ok($$ select birthdate from profiles $$, '42501', null, 'birthdate is not readable');
select lives_ok($$ select username, display_name, avatar_url from profiles $$, 'public profile columns readable');
reset role;

-- carol (stranger)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000ca01","role":"authenticated"}';
select is((select count(*) from sessions where user_id = alice()), 1::bigint, 'stranger sees public only');
select throws_ok($$ insert into sessions(user_id, tmdb_id, influence, visibility, crew_id) values (carol(), 1, 'high', 'crew', crew_k()) $$, '42501', null, 'non-member cannot post to crew');
select throws_ok($$ insert into list_items(list_id, tmdb_id, added_by) values (list_k(), 2, carol()) $$, '42501', null, 'non-member cannot add to crew list');
select throws_ok($$ insert into cheers(session_id, user_id) values (s_friends(), carol()) $$, '42501', null, 'stranger cannot cheer friends-only session');
with u as (update sessions set review = 'pwned' where id = s_public() returning 1)
select is((select count(*) from u), 0::bigint, 'stranger cannot update alice session');
with d as (delete from sessions where id = s_public() returning 1)
select is((select count(*) from d), 0::bigint, 'stranger cannot delete alice session');
select is((select count(*) from crews), 0::bigint, 'stranger cannot see crew K');
select is((select count(*) from lists), 0::bigint, 'stranger cannot see crew list');
select throws_ok($$ insert into friendships(user_a, user_b, status, requested_by) values (least(bob(), carol()), greatest(bob(), carol()), 'accepted', carol()) $$, '42501', null, 'cannot insert an already-accepted friendship');
select lives_ok($$ insert into friendships(user_a, user_b, requested_by) values (least(bob(), carol()), greatest(bob(), carol()), carol()) $$, 'can send a friend request');
select throws_ok($$ update friendships set status = 'accepted' where requested_by = carol() $$, '42501', null, 'requester cannot self-accept');
select throws_ok($$ update friendships set requested_by = bob() where requested_by = carol() $$, '42501', null, 'requested_by is immutable');
select lives_ok($$ insert into crews(id, name, created_by) values ('00000000-0000-0000-0000-0000000000dd', 'C', carol()) $$, 'can create a crew');
select lives_ok($$ insert into crew_members(crew_id, user_id, role) values ('00000000-0000-0000-0000-0000000000dd', carol(), 'owner') $$, 'creator adds self as owner');
select throws_ok($$ insert into crew_members(crew_id, user_id, role) values (crew_k(), carol(), 'owner') $$, '42501', null, 'cannot join crew created by someone else');
reset role;

-- dave (crew K)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000da7e","role":"authenticated"}';
select is((select count(*) from sessions where user_id = alice()), 2::bigint, 'crew member sees crew + public');
select lives_ok($$ insert into list_items(list_id, tmdb_id, added_by) values (list_k(), 1, dave()) $$, 'crew member can add to crew list');
select throws_ok($$ insert into crew_members(crew_id, user_id) values (crew_k(), carol()) $$, '42501', null, 'non-owner cannot add crew member');
reset role;

-- alice (owner)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a11c","role":"authenticated"}';
select is((select count(*) from sessions where user_id = alice()), 4::bigint, 'owner sees all 4');
select throws_ok($$ insert into session_companions(session_id, user_id) values (s_private(), carol()) $$, '42501', null, 'cannot tag a non-friend');
select lives_ok($$ insert into session_companions(session_id, user_id) values (s_private(), bob()) $$, 'can tag a friend');
select throws_ok($$ update sessions set visibility = 'crew', crew_id = '00000000-0000-0000-0000-0000000000dd' where id = s_public() $$, '42501', null, 'cannot move own session into a foreign crew');
select throws_ok($$ delete from crew_members where crew_id = crew_k() and user_id = alice() $$, 'P0001', 'crew must keep an owner', 'last owner cannot leave');
select throws_ok($$ update crew_members set role = 'member' where crew_id = crew_k() and user_id = alice() $$, 'P0001', 'crew must keep an owner', 'last owner cannot demote self');
reset role;

-- bob again: tagged on private session
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000b0b","role":"authenticated"}';
select is((select count(*) from sessions where user_id = alice()), 3::bigint, 'companion sees tagged private session');
reset role;

-- carol: children of unreadable parents stay hidden
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000ca01","role":"authenticated"}';
select is((select count(*) from session_companions), 0::bigint, 'stranger sees no companions of private session');
select is((select count(*) from cheers), 0::bigint, 'stranger sees no cheers on friends-only session');
select is((select count(*) from list_items), 0::bigint, 'stranger sees no crew list items');
reset role;

-- anon
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*) from sessions), 0::bigint, 'anon sees no sessions');
reset role;

-- alice deletes crew K under RLS; crew sessions fall back to private
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a11c","role":"authenticated"}';
select lives_ok($$ delete from crews where id = crew_k() $$, 'owner can delete crew with crew sessions');
reset role;
select is((select visibility::text || coalesce(crew_id::text, '-') from sessions where id = s_crew()), 'private-', 'crew session became private');
select is((select visibility::text || coalesce(crew_id::text, '-') from sessions where id = s_dave_crew()), 'private-', 'other member crew session became private');

select * from finish();
rollback;
