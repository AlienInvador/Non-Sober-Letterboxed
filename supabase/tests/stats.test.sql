begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-00000000a11c', 'a@test.local'),
  ('00000000-0000-0000-0000-000000000b0b', 'b@test.local'),
  ('00000000-0000-0000-0000-00000000ca01', 'c@test.local');
insert into profiles(id, username, birthdate) values
  ('00000000-0000-0000-0000-00000000a11c', 'alice', '1990-01-01'),
  ('00000000-0000-0000-0000-000000000b0b', 'bob', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000ca01', 'carol', '1990-01-01');
insert into movies(tmdb_id, title, cached_at) values (1, 'A', now()), (2, 'B', now()), (3, 'C', now());
insert into sessions(user_id, tmdb_id, influence, visibility, recommend, rating) values
  ('00000000-0000-0000-0000-00000000a11c', 1, 'high', 'public', true, 4),
  ('00000000-0000-0000-0000-00000000a11c', 1, 'high', 'public', true, 5),
  ('00000000-0000-0000-0000-000000000b0b', 1, 'high', 'public', false, 3),
  ('00000000-0000-0000-0000-000000000b0b', 1, 'high', 'public', null, null),
  ('00000000-0000-0000-0000-00000000a11c', 1, 'high', 'friends', true, 1),
  ('00000000-0000-0000-0000-00000000a11c', 2, 'drunk', 'public', null, null),
  ('00000000-0000-0000-0000-00000000a11c', 2, 'drunk', 'public', null, null),
  ('00000000-0000-0000-0000-00000000a11c', 3, 'sober', 'public', null, 2);

select plan(7);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000ca01","role":"authenticated"}';
select is((select log_count from movie_influence_stats where tmdb_id = 1 and influence = 'high'), 4::bigint, 'stranger: friends-only excluded from log_count');
select is((select recommend_pct from movie_influence_stats where tmdb_id = 1 and influence = 'high'), 66.67::numeric, 'recommend_pct 2/3 = 66.67');
select is((select avg_rating from movie_influence_stats where tmdb_id = 1 and influence = 'high'), 4.00::numeric, 'avg_rating ignores nulls and friends-only');
select is((select count(*) from movie_influence_stats where tmdb_id = 2 and recommend_pct is null), 1::bigint, 'no votes -> null recommend_pct');
select is((select log_count from movie_influence_stats where tmdb_id = 3 and influence = 'sober'), 1::bigint, 'sober session counted, no recommend contribution');
reset role;

set local role anon;
select throws_ok($$ select * from movie_influence_stats $$, '42501', null, 'anon cannot select view');
reset role;
select is((select count(*) from information_schema.columns where table_name = 'movie_influence_stats' and column_name in ('tmdb_id','influence','log_count','avg_rating','recommend_pct')), 5::bigint, 'view columns');

select * from finish();
rollback;
