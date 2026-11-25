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
create function p_taco() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000007a0'::uuid $$;

select mk_user(alice(), 'alice'), mk_user(bob(), 'bob'), mk_user(carol(), 'carol');
insert into movies(tmdb_id, title, cached_at) values (1, 'Seed', now());
insert into friendships(user_a, user_b, status, requested_by) values (least(alice(), bob()), greatest(alice(), bob()), 'accepted', alice());
insert into places(id, name) values (p_taco(), 'Taco Bell'), ('00000000-0000-0000-0000-0000000007a1', 'McDonald''s'),
  ('00000000-0000-0000-0000-0000000007a2', 'Secret Shack'), ('00000000-0000-0000-0000-0000000007a3', 'Orphan Diner');
insert into sessions(user_id, place_id, influence, visibility, recommend) values
  (alice(), p_taco(), 'high', 'friends', true),
  (alice(), p_taco(), 'drunk', 'public', true),
  (bob(), p_taco(), 'drunk', 'public', false);
insert into sessions(user_id, place_id, influence, visibility, recommend) values (alice(), '00000000-0000-0000-0000-0000000007a2', 'high', 'private', true);
insert into sessions(user_id, tmdb_id, influence, visibility, recommend) values (alice(), 1, 'high', 'public', true);

select plan(20);

select throws_ok($$insert into sessions(user_id, influence, visibility, recommend) values (alice(), 'high', 'friends', true)$$, '23514', null, 'subject required');
select throws_ok($$insert into sessions(user_id, tmdb_id, place_id, influence, visibility, recommend) values (alice(), 1, p_taco(), 'high', 'friends', true)$$, '23514', null, 'only one subject');
select throws_ok($$insert into places(name) values (' taco-bell ')$$, '23505', null, 'name_key merges spellings');
select throws_ok($$insert into places(name) values ('🌮')$$, '23514', null, 'name needs letters or digits');
select is((select name_key from places where name = 'McDonald''s'), 'mcdonalds', 'name_key normalized');
select is((select log_count::int from place_influence_stats where place_id = p_taco() and influence = 'drunk'), 2, 'place stats count public only');
select is((select count(*)::int from place_influence_stats where influence = 'high'), 0, 'friends-only place sesh not in stats');
select is((select count(*)::int from movie_influence_stats where tmdb_id is null), 0, 'movie stats skip place seshes');
select is((select default_visibility::text from profiles where id = alice()), 'friends', 'default_visibility defaults to friends');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000b0b","role":"authenticated"}';
select is((select count(*)::int from sessions where user_id = alice() and place_id = p_taco() and visibility = 'friends'), 1, 'friend sees friends place sesh');
select is((select name from search_places('tacobel') limit 1), 'Taco Bell', 'search tolerates typos');
select lives_ok($$select * from places$$, 'authenticated can read places');
select is((select count(*)::int from places where id = p_taco()), 1, 'friend sees place used by friends sesh');
select is((select count(*)::int from places where name = 'Secret Shack'), 0, 'friend cannot see private-only place');
select is((select count(*)::int from search_places('secretshack')), 0, 'search_places hides private-only place from friend');
select is((select count(*)::int from places where name = 'Orphan Diner'), 0, 'unused place invisible');
select throws_ok($$insert into places(name) values ('Wendys')$$, '42501', null, 'authenticated cannot insert places');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000ca01","role":"authenticated"}';
select is((select count(*)::int from sessions where user_id = alice() and place_id = p_taco() and visibility = 'friends'), 0, 'stranger cannot see it');
select is((select count(*)::int from places where name = 'Secret Shack'), 0, 'stranger cannot see private-only place');
select is((select count(*)::int from places where name = 'Orphan Diner'), 0, 'stranger cannot see unused place');

select * from finish();
rollback;
