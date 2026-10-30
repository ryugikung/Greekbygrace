-- Yogurt Studio V8: data-preserving security & transaction migration.
-- Run AFTER v7_appearance_migration.sql. Back up your database first.
-- Run this ONCE from Supabase SQL Editor; rerunnable for recovery.
begin;
create extension if not exists pgcrypto;

-- Existing staff remain active; newly created Auth users are pending approval.
alter table public.profiles add column if not exists access_status text not null default 'active';
alter table public.profiles drop constraint if exists profiles_access_status_check;
alter table public.profiles add constraint profiles_access_status_check check(access_status in ('active','pending','disabled'));
alter table public.profiles alter column access_status set default 'pending';
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and access_status='active' and role in ('owner','staff'))
$$;
create or replace function public.is_owner() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and access_status='active' and role='owner')
$$;
create or replace function public.new_user_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,email,display_name,role,access_status)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)),'staff','pending')
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.is_staff() from public,anon;
revoke all on function public.is_owner() from public,anon;
grant execute on function public.is_staff(),public.is_owner() to authenticated;

-- Financial records become voidable, not erasable from the application.
alter table public.expenses add column if not exists voided_at timestamptz;
alter table public.expenses add column if not exists void_reason text;
alter table public.orders add column if not exists completed_at timestamptz;
alter table public.payments add column if not exists request_id uuid;
create unique index if not exists payments_request_id_unique on public.payments(request_id) where request_id is not null;
-- Do not invent completion dates for old completed orders: use created_at as legacy fallback in reports.
create table if not exists public.order_status_events(
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
  previous_status text, new_status text not null, changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.refunds(
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
  amount numeric(12,2) not null check(amount>0), method text not null default 'cash'
    check(method in ('cash','transfer','card','platform','other')),
  reason text not null check(length(trim(reason))>0), request_id uuid not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists refunds_order_idx on public.refunds(order_id);
create index if not exists orders_completed_idx on public.orders(completed_at desc) where status='completed';
create index if not exists order_events_order_idx on public.order_status_events(order_id,created_at);
alter table public.refunds enable row level security;
alter table public.order_status_events enable row level security;
drop policy if exists v8_refunds_select on public.refunds;
create policy v8_refunds_select on public.refunds for select to authenticated using(public.is_staff());
drop policy if exists v8_status_select on public.order_status_events;
create policy v8_status_select on public.order_status_events for select to authenticated using(public.is_staff());
grant select on public.refunds,public.order_status_events to authenticated;

create or replace function public.v8_status_trigger() returns trigger language plpgsql set search_path='' as $$
begin
  if TG_OP='INSERT' then
    if NEW.status='completed' and NEW.completed_at is null then NEW.completed_at=now(); end if;
  elsif NEW.status is distinct from OLD.status then
    if NEW.status='completed' then NEW.completed_at=now();
    elsif NEW.status='cancelled' then NEW.completed_at=null;
    elsif OLD.status='completed' then NEW.completed_at=null;
    end if;
  end if;
  return NEW;
end $$;
drop trigger if exists v8_order_completion_time on public.orders;
create trigger v8_order_completion_time before insert or update on public.orders for each row execute function public.v8_status_trigger();
create or replace function public.v8_status_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if TG_OP='INSERT' or NEW.status is distinct from OLD.status then
    insert into public.order_status_events(order_id,previous_status,new_status,changed_by)
    values (NEW.id,case when TG_OP='INSERT' then null else OLD.status end,NEW.status,auth.uid());
  end if;
  return NEW;
end $$;
drop trigger if exists v8_order_history on public.orders;
create trigger v8_order_history after insert or update of status on public.orders for each row execute function public.v8_status_history();

-- All amount-sensitive writes below run in a single PostgreSQL transaction.
create or replace function public.create_store_order(
 p_customer_id uuid,p_channel text,p_status text,p_fulfillment_at timestamptz,p_discount numeric,p_notes text,p_product_id uuid,p_quantity numeric
) returns public.orders language plpgsql security definer set search_path='' as $$
declare r public.orders; p public.products;
begin
 if not public.is_staff() then raise exception 'Access denied'; end if;
 if p_quantity is null or p_quantity<=0 or p_quantity>100000 then raise exception 'Invalid item quantity'; end if;
 if p_discount is null or p_discount<0 then raise exception 'Invalid discount'; end if;
 if p_status='cancelled' then raise exception 'Cannot create an already-cancelled order'; end if;
 select * into p from public.products where id=p_product_id and active=true for share;
 if not found then raise exception 'Product is not available'; end if;
 if p_discount > p_quantity*p.price then raise exception 'Discount exceeds order total'; end if;
 insert into public.orders(customer_id,channel,status,fulfillment_at,discount,notes)
 values(p_customer_id,p_channel,p_status,p_fulfillment_at,p_discount,p_notes) returning * into r;
 insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,unit_cost)
 values(r.id,p.id,p.name,p_quantity,p.price,p.unit_cost);
 return r;
end $$;

create or replace function public.save_store_product(
 p_id uuid,p_name text,p_category text,p_price numeric,p_unit_cost numeric,p_active boolean,p_cost_items jsonb
) returns public.products language plpgsql security definer set search_path='' as $$
declare r public.products; item jsonb; c numeric; summed numeric:=0;
begin
 if not public.is_staff() then raise exception 'Access denied'; end if;
 if trim(coalesce(p_name,''))='' or p_price is null or p_price<0 or p_unit_cost is null or p_unit_cost<0 then raise exception 'Invalid product data'; end if;
 if jsonb_typeof(p_cost_items) is distinct from 'array' or jsonb_array_length(p_cost_items)>80 then raise exception 'Cost items must be an array of at most 80 rows'; end if;
 for item in select value from jsonb_array_elements(p_cost_items) loop
   if trim(coalesce(item->>'label',''))='' or length(item->>'label')>120 or (item->>'amount') is null then raise exception 'Invalid cost component'; end if;
   c:=(item->>'amount')::numeric;
   if c<0 or c>100000000 then raise exception 'Cost must be nonnegative'; end if;
   summed:=summed+c;
 end loop;
 if jsonb_array_length(p_cost_items)>0 then p_unit_cost:=round(summed,2); end if;
 if p_id is null then
   insert into public.products(name,category,price,unit_cost,active)
   values(trim(p_name),p_category,p_price,p_unit_cost,coalesce(p_active,true)) returning * into r;
 else
   update public.products set name=trim(p_name),category=p_category,price=p_price,
     unit_cost=p_unit_cost,active=coalesce(p_active,true) where id=p_id returning * into r;
   if not found then raise exception 'Product not found'; end if;
 end if;
 delete from public.product_cost_items where product_id=r.id;
 insert into public.product_cost_items(product_id,label,amount)
 select r.id,x.label,x.amount
 from jsonb_to_recordset(p_cost_items) as x(label text,amount numeric);
 return r;
end $$;

create or replace function public.update_store_order(
 p_id uuid,p_customer_id uuid,p_channel text,p_status text,p_fulfillment_at timestamptz,p_discount numeric,p_notes text
) returns public.orders language plpgsql security definer set search_path='' as $$
declare r public.orders; gross numeric; received numeric;
begin
 if not public.is_staff() then raise exception 'Access denied'; end if;
 select * into r from public.orders where id=p_id for update;
 if not found then raise exception 'Order not found'; end if;
 if p_discount is null or p_discount<0 then raise exception 'Invalid discount'; end if;
 select coalesce(sum(quantity*unit_price),0) into gross from public.order_items where order_id=p_id;
 if p_discount>gross then raise exception 'Discount exceeds subtotal'; end if;
 if p_status='completed' and not exists(select 1 from public.order_items where order_id=p_id) then raise exception 'Cannot complete an empty order'; end if;
 select coalesce((select sum(amount) from public.payments where order_id=p_id),0)
        -coalesce((select sum(amount) from public.refunds where order_id=p_id),0) into received;
 if greatest(0,gross-p_discount)<received then raise exception 'Discount would make order smaller than net payments'; end if;
 update public.orders set customer_id=p_customer_id,channel=p_channel,status=p_status,
 fulfillment_at=p_fulfillment_at,discount=p_discount,notes=p_notes where id=p_id returning * into r;
 return r;
end $$;

create or replace function public.set_store_order_status(p_id uuid,p_status text) returns public.orders
language plpgsql security definer set search_path='' as $$
declare r public.orders;
begin
 if not public.is_staff() then raise exception 'Access denied'; end if;
 if p_status not in ('pending','cancelled') then raise exception 'Unsupported status change'; end if;
 select * into r from public.orders where id=p_id for update;
 if not found then raise exception 'Order not found'; end if;
 if p_status='pending' and r.status<>'cancelled' then raise exception 'Only cancelled orders can be restored'; end if;
 update public.orders set status=p_status where id=p_id returning * into r;
 return r;
end $$;

create or replace function public.add_store_order_item(p_order_id uuid,p_product_id uuid,p_quantity numeric)
returns public.order_items language plpgsql security definer set search_path='' as $$
declare o public.orders;p public.products;r public.order_items;
begin
 if not public.is_staff() then raise exception 'Access denied'; end if;
 if p_quantity is null or p_quantity<=0 or p_quantity>100000 then raise exception 'Invalid quantity'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.status in ('cancelled','completed') then raise exception 'Order cannot be changed'; end if;
 select * into p from public.products where id=p_product_id and active=true;
 if not found then raise exception 'Product unavailable'; end if;
 insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,unit_cost)
 values(o.id,p.id,p.name,p_quantity,p.price,p.unit_cost) returning * into r;
 return r;
end $$;

create or replace function public.record_store_payment(p_order_id uuid,p_amount numeric,p_method text,p_request_id uuid)
returns public.payments language plpgsql security definer set search_path='' as $$
declare o public.orders;r public.payments; gross numeric; collected numeric; returned numeric;
begin
 if not public.is_staff() then raise exception 'Access denied'; end if;
 if p_request_id is null or p_amount is null or p_amount<=0 then raise exception 'Payment amount and request id required'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 select * into r from public.payments where request_id=p_request_id;
 if found then
   if r.order_id<>p_order_id or r.amount<>p_amount or r.method<>p_method then raise exception 'Payment request id already used'; end if;
   return r;
 end if;
 if o.status='cancelled' then raise exception 'Cannot accept payment for a cancelled order'; end if;
 select coalesce(sum(quantity*unit_price),0) into gross from public.order_items where order_id=p_order_id;
 select coalesce(sum(amount),0) into collected from public.payments where order_id=p_order_id;
 select coalesce(sum(amount),0) into returned from public.refunds where order_id=p_order_id;
 if p_amount>greatest(0,gross-o.discount)-(collected-returned) then raise exception 'Payment exceeds outstanding balance'; end if;
 insert into public.payments(order_id,amount,method,request_id)
 values(p_order_id,p_amount,p_method,p_request_id) returning * into r;
 return r;
end $$;

create or replace function public.record_store_refund(p_order_id uuid,p_amount numeric,p_method text,p_reason text,p_request_id uuid)
returns public.refunds language plpgsql security definer set search_path='' as $$
declare o public.orders;r public.refunds; col numeric; ref numeric;
begin
 if not public.is_owner() then raise exception 'Only owner can record refunds'; end if;
 if p_request_id is null or p_amount is null or p_amount<=0 or trim(coalesce(p_reason,''))='' then raise exception 'Invalid refund'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 select * into r from public.refunds where request_id=p_request_id;
 if found then
   if r.order_id<>p_order_id or r.amount<>p_amount then raise exception 'Refund request id already used'; end if;
   return r;
 end if;
 select coalesce(sum(amount),0) into col from public.payments where order_id=p_order_id;
 select coalesce(sum(amount),0) into ref from public.refunds where order_id=p_order_id;
 if p_amount>col-ref then raise exception 'Refund exceeds payments collected'; end if;
 insert into public.refunds(order_id,amount,method,reason,request_id,created_by)
 values(p_order_id,p_amount,p_method,p_reason,p_request_id,auth.uid()) returning * into r;
 return r;
end $$;

create or replace function public.void_store_expense(p_id uuid,p_reason text) returns public.expenses
language plpgsql security definer set search_path='' as $$
declare r public.expenses;
begin
 if not public.is_owner() then raise exception 'Only owner can void an expense'; end if;
 if trim(coalesce(p_reason,''))='' then raise exception 'Void reason required'; end if;
 update public.expenses set voided_at=now(),void_reason=p_reason where id=p_id and voided_at is null returning * into r;
 if not found then raise exception 'Expense not found or already voided'; end if;
 return r;
end $$;

-- Server-side report: accurate across all records, local month = Asia/Bangkok.
create or replace function public.store_finance_summary(p_month text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_staff() then raise exception 'Access denied'; end if;
 if p_month is not null and p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid month YYYY-MM'; end if;
 with ot as (
   select o.id,o.channel,o.status,coalesce(o.completed_at,o.created_at) as recognized_at,
          greatest(0,coalesce(sum(i.quantity*i.unit_price),0)-o.discount)::numeric as sales,
          coalesce(sum(i.quantity*i.unit_cost),0)::numeric as cost,
          coalesce(sum(i.quantity),0)::numeric as units
   from public.orders o left join public.order_items i on i.order_id=o.id group by o.id
 ), sold as (
   select *,to_char(recognized_at at time zone 'Asia/Bangkok','YYYY-MM') as ym,
    to_char(recognized_at at time zone 'Asia/Bangkok','YYYY-MM-DD') as day
   from ot where status='completed'
 ), all_sales as (
   select coalesce(sum(sales),0) revenue,coalesce(sum(units),0) units from sold
 ), chosen as (
   select coalesce(sum(sales),0) revenue,coalesce(sum(cost),0) cost,coalesce(sum(units),0) units
   from sold where p_month is null or ym=p_month
 ), cash as (
   select coalesce(sum(amount),0) value from public.payments
   where p_month is null or to_char(created_at at time zone 'Asia/Bangkok','YYYY-MM')=p_month
 ), refunds as (
   select coalesce(sum(amount),0) value from public.refunds
   where p_month is null or to_char(created_at at time zone 'Asia/Bangkok','YYYY-MM')=p_month
 ), expense_sum as (
   select coalesce(sum(amount),0) value from public.expenses
   where voided_at is null and (p_month is null or to_char(expense_date,'YYYY-MM')=p_month)
 ), chart as (
   select case when p_month is null then ym else day end label,sum(sales) value
   from sold where p_month is null or ym=p_month group by 1 order by 1
 ), periods as (
   select ym from sold union select to_char(expense_date,'YYYY-MM') from public.expenses
   union select to_char(created_at at time zone 'Asia/Bangkok','YYYY-MM') from public.payments
   union select to_char(created_at at time zone 'Asia/Bangkok','YYYY-MM') from public.refunds
 )
 select jsonb_build_object(
 'revenue',(select revenue from chosen),'cost',(select cost from chosen),
 'units',(select units from chosen),'expenses',(select value from expense_sum),
 'receipts',(select value from cash),'refunds',(select value from refunds),
 'lifetime_revenue',(select revenue from all_sales),'lifetime_units',(select units from all_sales),
 'points',coalesce((select jsonb_agg(jsonb_build_object('key',label,'amount',value) order by label) from chart),'[]'::jsonb),
 'months',coalesce((select jsonb_agg(ym order by ym desc) from (select distinct ym from periods where ym is not null) x),'[]'::jsonb),
 'channels',coalesce((select jsonb_agg(jsonb_build_object('channel',channel,'amount',value)) from
    (select channel,sum(sales) value from sold where p_month is null or ym=p_month group by channel) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;

-- Replace permanent deletion of catalog/production records with a reversible archive state.
alter table public.ingredients add column if not exists active boolean not null default true;
alter table public.customers add column if not exists active boolean not null default true;
alter table public.production_batches add column if not exists voided_at timestamptz;
create or replace function public.archive_store_record(p_kind text,p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_owner() then raise exception 'Only owner can archive records'; end if;
 case p_kind
  when 'product' then update public.products set active=false where id=p_id;
  when 'ingredient' then update public.ingredients set active=false where id=p_id;
  when 'customer' then update public.customers set active=false where id=p_id;
  when 'batch' then update public.production_batches set voided_at=now() where id=p_id and voided_at is null;
  else raise exception 'Unknown archive type';
 end case;
 if not found then raise exception 'Record not found or already archived'; end if;
end $$;
revoke execute on function public.archive_store_record(text,uuid) from public,anon;
grant execute on function public.archive_store_record(text,uuid) to authenticated;

-- Lock down table writes even if older RLS policies remain in catalog.
revoke insert,update,delete on public.payments,public.order_items,public.inventory_movements,public.product_cost_items,public.refunds,public.order_status_events from public,anon,authenticated;
revoke insert,update,delete on public.orders,public.products from public,anon,authenticated;
revoke delete on public.expenses,public.orders,public.ingredients,public.products,public.payments,public.production_batches,public.customers from public,anon,authenticated;
revoke update on public.ingredients from public,anon,authenticated;
grant update(name,unit,reorder_level,unit_cost) on public.ingredients to authenticated;
-- Expense editing is allowed before voiding; a trigger prohibits editing voided records.
create or replace function public.v8_protect_void_expense() returns trigger language plpgsql set search_path='' as $$
begin if OLD.voided_at is not null then raise exception 'Voided expenses cannot be edited'; end if;return NEW;end $$;
drop trigger if exists v8_void_expense_guard on public.expenses;
create trigger v8_void_expense_guard before update on public.expenses for each row execute function public.v8_protect_void_expense();
-- Editing voided batches is blocked at the database, even if an older client allows it.
create or replace function public.v8_protect_void_batch() returns trigger language plpgsql set search_path='' as $$
begin if OLD.voided_at is not null then raise exception 'Voided batches cannot be edited'; end if;return NEW;end $$;
drop trigger if exists v8_void_batch_guard on public.production_batches;
create trigger v8_void_batch_guard before update on public.production_batches for each row execute function public.v8_protect_void_batch();
-- Prevent direct updates of payment/stock/refund ledgers even through lingering policies.
-- Removing old policies is defense in depth, REVOKE is the primary barrier.
drop policy if exists staff_insert on public.payments;
drop policy if exists staff_update on public.payments;
drop policy if exists owner_delete on public.payments;
drop policy if exists staff_insert on public.inventory_movements;
drop policy if exists staff_update on public.inventory_movements;
drop policy if exists owner_delete on public.inventory_movements;
drop policy if exists staff_insert on public.order_items;
drop policy if exists staff_update on public.order_items;
drop policy if exists owner_delete on public.order_items;
drop policy if exists v3_cost_insert on public.product_cost_items;
drop policy if exists v3_cost_update on public.product_cost_items;
drop policy if exists v3_cost_delete on public.product_cost_items;

-- Explicit RPC permissions; NEVER grant to anon/PUBLIC.
revoke execute on function public.new_user_profile() from public,anon,authenticated;
revoke execute on function public.create_store_order(uuid,text,text,timestamptz,numeric,text,uuid,numeric) from public,anon;
revoke execute on function public.save_store_product(uuid,text,text,numeric,numeric,boolean,jsonb) from public,anon;
revoke execute on function public.update_store_order(uuid,uuid,text,text,timestamptz,numeric,text) from public,anon;
revoke execute on function public.set_store_order_status(uuid,text) from public,anon;
revoke execute on function public.add_store_order_item(uuid,uuid,numeric) from public,anon;
revoke execute on function public.record_store_payment(uuid,numeric,text,uuid) from public,anon;
revoke execute on function public.record_store_refund(uuid,numeric,text,text,uuid) from public,anon;
revoke execute on function public.void_store_expense(uuid,text) from public,anon;
revoke execute on function public.store_finance_summary(text) from public,anon;
grant execute on function public.create_store_order(uuid,text,text,timestamptz,numeric,text,uuid,numeric),
public.save_store_product(uuid,text,text,numeric,numeric,boolean,jsonb),
public.update_store_order(uuid,uuid,text,text,timestamptz,numeric,text),
public.set_store_order_status(uuid,text),public.add_store_order_item(uuid,uuid,numeric),
public.record_store_payment(uuid,numeric,text,uuid),public.record_store_refund(uuid,numeric,text,text,uuid),
public.void_store_expense(uuid,text),public.store_finance_summary(text) to authenticated;
commit;
