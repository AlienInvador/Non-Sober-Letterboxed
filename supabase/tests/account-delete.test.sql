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
create function p_taco() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000007a0'::uuid $$;
create function s_a() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005a1'::uuid $$;
create function s_a2() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005a2'::uuid $$;
create function s_b() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000005b1'::uuid $$;
create function c1() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000000c1'::uuid $$;
create function l1() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000000d1'::uuid $$;

select mk_user(alice(), 'alice'), mk_user(bob(), 'bob');
insert into movies(tmdb_id, title, cached_at) values (1, 'Seed', now());
insert into places(id, name) values (p_taco(), 'Delete Test Diner');
insert into crews(id, name, created_by) values (c1(), 'Crew', alice());
insert into crew_members(crew_id, user_id, role) values (c1(), alice(), 'owner'), (c1(), bob(), 'member');
insert into lists(id, owner_id, title) values (l1(), alice(), 'L');
insert into list_items(list_id, tmdb_id, added_by) values (l1(), 1, alice());
insert into queue(user_id, tmdb_id) values (alice(), 1);
insert into recommendations(from_user, to_user, tmdb_id, influence) values (alice(), bob(), 1, 'high'), (bob(), alice(), 1, 'drunk');
insert into friendships(user_a, user_b, status, requested_by) values (least(alice(), bob()), greatest(alice(), bob()), 'accepted', alice());
insert into sessions(id, user_id, tmdb_id, influence, visibility, recommend) values
  (s_a(), alice(), 1, 'high', 'friends', true), (s_b(), bob(), 1, 'drunk', 'friends', true);
insert into sessions(id, user_id, place_id, influence, visibility, recommend) values (s_a2(), alice(), p_taco(), 'drunk', 'public', true);
insert into cheers(session_id, user_id) values (s_a(), bob()), (s_b(), alice());
insert into session_companions(session_id, user_id) values (s_a(), bob()), (s_b(), alice());

select plan(12);

select lives_ok($$delete from auth.users where id = alice()$$, 'deleting the auth user succeeds');
select is((select count(*)::int from profiles where id = alice()), 0, 'profile gone');
select is((select count(*)::int from sessions where user_id = alice()), 0, 'seshes gone');
select is((select count(*)::int from cheers where user_id = alice() or session_id in (s_a(), s_a2())), 0, 'cheers both ways gone');
select is((select count(*)::int from session_companions where user_id = alice() or session_id in (s_a(), s_a2())), 0, 'tags both ways gone');
select is((select count(*)::int from friendships where alice() in (user_a, user_b, requested_by)), 0, 'friendships gone');
select is((select count(*)::int from recommendations where alice() in (from_user, to_user)), 0, 'recs sent and received gone');
select is((select count(*)::int from queue where user_id = alice()), 0, 'queue gone');
select is((select count(*)::int from lists where owner_id = alice()), 0, 'lists gone');
select is((select count(*)::int from list_items where list_id = l1()), 0, 'list items gone');
select is((select count(*)::int from crew_members where user_id = alice()), 0, 'membership gone');
select is((select count(*)::int from places where id = p_taco()) + (select count(*)::int from movies where tmdb_id = 1) + (select count(*)::int from sessions where id = s_b()), 3, 'places, movies and bob''s sesh remain');

select * from finish();
rollback;
