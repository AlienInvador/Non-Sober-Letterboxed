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
create function crew_x() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000000ee'::uuid $$;
create function rec_b()  returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000007b0'::uuid $$;
create function rec_k()  returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000007c0'::uuid $$;

select mk_user(alice(), 'alice'), mk_user(bob(), 'bob'), mk_user(carol(), 'carol'), mk_user(dave(), 'dave');
insert into movies(tmdb_id, title, cached_at) values (1, 'Seed', now());
insert into friendships(user_a, user_b, status, requested_by) values (least(alice(), bob()), greatest(alice(), bob()), 'accepted', alice());
insert into crews(id, name, created_by) values (crew_k(), 'K', alice()), (crew_x(), 'X', carol());
insert into crew_members(crew_id, user_id, role) values (crew_k(), alice(), 'owner'), (crew_k(), dave(), 'member'), (crew_x(), carol(), 'owner');

insert into sessions(id, user_id, tmdb_id, influence, visibility, recommend) values ('00000000-0000-0000-0000-0000000005d1', dave(), 1, 'high', 'public', true);

select plan(16);

-- alice (sender)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a11c","role":"authenticated"}';
select lives_ok($$ insert into recommendations(id, from_user, to_user, tmdb_id, influence, note) values (rec_b(), alice(), bob(), 1, 'high', 'pause before the snow level') $$, 'alice can rec friend bob');
select throws_ok($$ insert into recommendations(from_user, to_user, tmdb_id, influence) values (alice(), carol(), 1, 'high') $$, '42501', null, 'alice cannot rec non-friend carol');
select lives_ok($$ insert into recommendations(id, from_user, crew_id, tmdb_id, influence) values (rec_k(), alice(), crew_k(), 1, 'drunk') $$, 'alice can rec her crew K');
select throws_ok($$ insert into recommendations(from_user, crew_id, tmdb_id, influence) values (alice(), crew_x(), 1, 'drunk') $$, '42501', null, 'alice cannot rec a crew she is not in');
select throws_ok($$ insert into recommendations(from_user, to_user, tmdb_id, influence) values (alice(), bob(), 1, 'sober') $$, '23514', null, 'sober influence rejected');
select throws_ok($$ insert into recommendations(from_user, to_user, crew_id, tmdb_id, influence) values (alice(), bob(), crew_k(), 1, 'high') $$, '23514', null, 'exactly one of to_user / crew_id');
select throws_ok($$ insert into recommendations(from_user, to_user, tmdb_id, influence, note) values (alice(), bob(), 1, 'high', repeat('x', 141)) $$, '23514', null, 'note capped at 140 chars');
select throws_ok($$ insert into recommendations(from_user, to_user, tmdb_id, influence) values (bob(), alice(), 1, 'high') $$, '42501', null, 'cannot send as someone else');
select throws_ok($$ insert into recommendations(from_user, to_user, tmdb_id, influence, session_id) values (alice(), bob(), 1, 'high', '00000000-0000-0000-0000-0000000005d1') $$, '42501', null, 'cannot attach someone else''s sesh');
reset role;

-- carol (stranger)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000ca01","role":"authenticated"}';
select is((select count(*) from recommendations), 0::bigint, 'carol sees no recs');
reset role;

-- dave (crew K)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000da7e","role":"authenticated"}';
select is((select array_agg(id) from recommendations), array[rec_k()], 'crew member sees only the crew rec');
with u as (update recommendations set dismissed_at = now() where id = rec_k() returning 1)
select is((select count(*) from u), 0::bigint, 'crew recs are not dismissible in v1');
reset role;

-- bob (recipient)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000b0b","role":"authenticated"}';
select is((select array_agg(id) from recommendations), array[rec_b()], 'bob sees his rec');
select lives_ok($$ update recommendations set dismissed_at = now() where id = rec_b() $$, 'bob can dismiss');
select throws_ok($$ update recommendations set note = 'edited' where id = rec_b() $$, '42501', null, 'bob cannot change the note');
reset role;
select isnt((select dismissed_at from recommendations where id = rec_b()), null, 'dismissal persisted');

select * from finish();
rollback;
