-- V2: no database schema change is necessary for appearance preferences or owner deletion.
-- Run only if owner_delete policies were omitted in V1; safe to re-run.
do $$ declare t text; begin foreach t in array array['customers','products','orders','order_items','payments','expenses','ingredients','inventory_movements','production_batches'] loop execute format('drop policy if exists owner_delete on public.%I',t); execute format('create policy owner_delete on public.%I for delete to authenticated using(public.is_owner())',t); end loop; end $$;
