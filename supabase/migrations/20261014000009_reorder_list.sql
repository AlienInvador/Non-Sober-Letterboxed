-- One round trip reorder. Security invoker: list_items_update RLS still decides who may write.
create function public.reorder_list(p_list uuid, p_ids int[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_n int; v_u int;
begin
  select count(*) into v_n from public.list_items where list_id = p_list;
  if v_n is distinct from coalesce(array_length(p_ids, 1), 0)
     or (select count(distinct x) from unnest(p_ids) x) <> v_n
     or exists (select 1 from unnest(p_ids) x where not exists
       (select 1 from public.list_items i where i.list_id = p_list and i.tmdb_id = x)) then
    raise exception 'ids must match the list items';
  end if;
  update public.list_items i set position = o.ord - 1
  from unnest(p_ids) with ordinality as o(id, ord)
  where i.list_id = p_list and i.tmdb_id = o.id;
  get diagnostics v_u = row_count;
  -- RLS filters rows silently; fail if the caller could not write them all
  if v_u < v_n then
    raise exception 'not allowed';
  end if;
end $$;

revoke all on function public.reorder_list(uuid, int[]) from public, anon;
grant execute on function public.reorder_list(uuid, int[]) to authenticated;
