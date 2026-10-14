begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

create function gen_random_uuid_user() returns uuid language plpgsql as $$
declare i uuid := gen_random_uuid();
begin
  insert into auth.users(id, email) values (i, i || '@test.local');
  return i;
end $$;

create function mk_profile(i uuid) returns uuid language plpgsql as $$
begin
  insert into auth.users(id, email) values (i, i || '@test.local');
  insert into profiles(id, username, birthdate) values (i, 'u' || right(replace(i::text, '-', ''), 20), '1990-01-01');
  return i;
end $$;

create function test_user() returns uuid language sql as $$ select mk_profile(gen_random_uuid()) $$;
create function u1() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000000a1'::uuid $$;
create function u2() returns uuid language sql as $$ select '00000000-0000-0000-0000-0000000000a2'::uuid $$;

select mk_profile(u1());
select mk_profile(u2());
insert into movies(tmdb_id, title, cached_at) values (1, 'Seed', now());

select plan(9);
select throws_ok($$ insert into profiles(id,username,birthdate) values (gen_random_uuid_user(),'kid', current_date - interval '21 years' + interval '1 day') $$, 'P0001', 'must be 21+');
select lives_ok ($$ insert into profiles(id,username,birthdate) values (gen_random_uuid_user(),'today21', current_date - interval '21 years') $$);
select lives_ok ($$ insert into profiles(id,username,birthdate) values (gen_random_uuid_user(),'leap', '2004-02-29') $$);
select throws_ok($$ insert into sessions(user_id,tmdb_id,influence,rating) values (test_user(),1,'high',5.5) $$, '23514');
select throws_ok($$ insert into sessions(user_id,tmdb_id,influence,rating) values (test_user(),1,'high',3.3) $$, '23514');
select throws_ok($$ insert into sessions(user_id,tmdb_id,influence,recommend) values (test_user(),1,'sober',true) $$, '23514');
select throws_ok($$ insert into sessions(user_id,tmdb_id,influence,visibility) values (test_user(),1,'drunk','crew') $$, '23514');
select throws_ok($$ insert into friendships(user_a,user_b,status,requested_by) values (u2(),u1(),'pending',u2()) $$, '23514');
select throws_ok($$ insert into profiles(id,username,birthdate) values (gen_random_uuid_user(),'a b!','1990-01-01') $$, '23514');
select * from finish();
rollback;
