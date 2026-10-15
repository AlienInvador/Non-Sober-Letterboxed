-- Stars removed: recommend (yes/no) is the only verdict.
drop view movie_influence_stats;
alter table sessions drop column rating;
update sessions set recommend = true where influence <> 'sober' and recommend is null;
update sessions set recommend = null where influence = 'sober';
do $$ declare c text; begin
  -- auto-named check from 0001: sober => recommend null
  select conname into c from pg_constraint
   where conrelid = 'sessions'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%recommend IS NULL%';
  if c is not null then execute format('alter table sessions drop constraint %I', c); end if;
end $$;
alter table sessions add constraint sessions_recommend_iff_not_sober check ((influence = 'sober') = (recommend is null));

-- Owner-privileged view (not security_invoker): exposes only public-session aggregates.
create view movie_influence_stats as
select tmdb_id,
  influence,
  count(*) as log_count,
  round(100.0 * count(*) filter (where recommend) / nullif(count(recommend), 0), 2) as recommend_pct
from sessions
where visibility = 'public'
group by tmdb_id, influence;

revoke all on movie_influence_stats from public, anon, authenticated;
grant select on movie_influence_stats to authenticated;
