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
create function s_alice() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005a1'::uuid $$;
create function s_bob()   returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005b1'::uuid $$;
create function s_alice2() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005a2'::uuid $$;

select mk_user(alice(), 'alice'), mk_user(bob(), 'bob'), mk_user(carol(), 'carol');
insert into movies(tmdb_id, title, cached_at) values (1, 'Seed', now());
insert into friendships(user_a, user_b, status, requested_by) values (least(alice(), bob()), greatest(alice(), bob()), 'accepted', alice());
insert into sessions(id, user_id, tmdb_id, influence, visibility, recommend) values
  (s_alice(), alice(), 1, 'high', 'friends', true), (s_bob(), bob(), 1, 'drunk', 'friends', true),
  (s_alice2(), alice(), 1, 'both', 'friends', true);
insert into session_companions(session_id, user_id) values (s_alice(), bob());

select plan(11);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000b0b","role":"authenticated"}';
select is((select status from session_companions where user_id = bob()), 'pending', 'new tag is pending');
select lives_ok($$update session_companions set status = 'accepted', own_session_id = s_bob() where session_id = s_alice() and user_id = bob()$$, 'tagged friend accepts with own sesh');
select is((select own_session_id from session_companions where user_id = bob()), s_bob(), 'accept stored own_session_id');
select lives_ok($$update session_companions set status = 'declined', own_session_id = null where session_id = s_alice() and user_id = bob()$$, 'tagged friend declines');
select throws_ok($$update session_companions set own_session_id = s_alice() where session_id = s_alice() and user_id = bob()$$, '42501', null, 'cannot point at someone else''s sesh');
select throws_ok($$update session_companions set session_id = s_bob() where user_id = bob()$$, '42501', null, 'session_id not updatable');
select throws_ok($$update session_companions set user_id = alice() where user_id = bob()$$, '42501', null, 'user_id not updatable');

-- stranger and owner change nothing (rows invisible or filtered by the policy)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000ca01","role":"authenticated"}';
update session_companions set status = 'accepted' where user_id = bob();
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a11c","role":"authenticated"}';
update session_companions set status = 'accepted' where user_id = bob();
select throws_ok($$insert into session_companions(session_id, user_id, status) values (s_alice2(), bob(), 'accepted')$$, '42501', null, 'owner cannot insert a pre-approved tag');
select lives_ok($$insert into session_companions(session_id, user_id) values (s_alice2(), bob())$$, 'owner can tag a friend as pending');
reset role;
select is((select status from session_companions where user_id = bob() and session_id = s_alice()), 'declined', 'stranger and owner cannot change the tag');
select is((select count(*)::int from session_companions), 2, 'rows still there');

select * from finish();
rollback;
