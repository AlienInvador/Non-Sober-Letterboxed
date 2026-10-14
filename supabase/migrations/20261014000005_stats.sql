-- Owner-privileged view (not security_invoker): exposes only public-session aggregates.
create view movie_influence_stats as
select tmdb_id,
  influence,
  count(*) as log_count,
  round(avg(rating), 2) as avg_rating,
  round(100.0 * count(*) filter (where recommend) / nullif(count(recommend), 0), 2) as recommend_pct
from sessions
where visibility = 'public'
group by tmdb_id, influence;

revoke all on movie_influence_stats from public, anon, authenticated;
grant select on movie_influence_stats to authenticated;
