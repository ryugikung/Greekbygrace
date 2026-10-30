-- SAFE numbering-only fix. Does NOT delete any records.
-- Works ONLY if your orders table is empty.
-- Run separately from the V8 migration, ONLY if you want order numbers to start at #1.
do $$
begin
  if exists (select 1 from public.orders limit 1) then
    raise exception 'Order numbering NOT changed. Orders still exist; do not reuse numbers.';
  end if;
  execute 'alter table public.orders alter column order_no restart with 1';
  raise notice 'Orders are empty; next order number will be 1.';
end $$;
