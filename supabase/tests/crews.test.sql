begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

insert into auth.users(id, email) values ('00000000-0000-0000-0000-00000000a11c', 'a@test.local');
insert into profiles(id, username, birthdate) values ('00000000-0000-0000-0000-00000000a11c', 'alice', '1990-01-01');

select plan(5);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a11c","role":"authenticated"}';
create temp table made as select public.create_crew('  Couch Crew ') as id;
grant select on made to authenticated;
select isnt((select id from made), null, 'create_crew returns an id');
select is((select name from crews where id = (select id from made)), 'Couch Crew', 'name trimmed');
select is((select role from crew_members where crew_id = (select id from made) and user_id = '00000000-0000-0000-0000-00000000a11c'), 'owner', 'creator is owner');
select throws_ok($$select public.create_crew('   ')$$, 'invalid crew name', 'empty name rejected');

set local role anon;
select throws_ok($$select public.create_crew('x')$$, '42501', null, 'anon cannot execute');

select * from finish();
rollback;
