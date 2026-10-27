-- V3 migration: execute AFTER setup.sql and v2_migration.sql. Non-destructive.
create table if not exists public.product_cost_items (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 label text not null check(length(trim(label))>0),
 amount numeric(12,2) not null check(amount>=0),
 created_at timestamptz not null default now()
);
create index if not exists product_cost_items_product_idx on public.product_cost_items(product_id);
alter table public.product_cost_items enable row level security;
revoke all on public.product_cost_items from anon, authenticated;
grant select,insert,update,delete on public.product_cost_items to authenticated;
drop policy if exists v3_cost_read on public.product_cost_items;
create policy v3_cost_read on public.product_cost_items for select to authenticated using ((select public.is_staff()));
drop policy if exists v3_cost_insert on public.product_cost_items;
create policy v3_cost_insert on public.product_cost_items for insert to authenticated with check ((select public.is_staff()));
drop policy if exists v3_cost_update on public.product_cost_items;
create policy v3_cost_update on public.product_cost_items for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists v3_cost_delete on public.product_cost_items;
create policy v3_cost_delete on public.product_cost_items for delete to authenticated using ((select public.is_staff()));
