-- DANGER: PERMANENTLY DELETES ALL STORE OPERATING DATA (NOT Auth users, store appearance or store_settings).
-- Take a database backup/export AND verify it before using this.
-- DO NOT run this on real business data.
-- This script is never invoked by the app or the v8_migration.
-- To authorize manually, change CONFIRMATION below to exactly: ERASE_ALL_TEST_STORE_DATA
-- Leaves store staff/login, appearance settings, palettes, images and notes intact.
do $$
declare
  confirmation text := 'NO'; -- Change ONLY after verified backup and explicit intent.
begin
  if confirmation <> 'ERASE_ALL_TEST_STORE_DATA' then
    raise exception 'Safety stop: nothing deleted. Change confirmation only if you intend to erase ALL store data.';
  end if;
  execute 'truncate table
    public.order_status_events, public.refunds, public.payments, public.order_items,
    public.orders, public.product_cost_items, public.production_batches,
    public.inventory_movements, public.expenses, public.products,
    public.ingredients, public.customers
    restart identity';
  raise notice 'All store operational data erased; order identity restarted at 1.';
end $$;
