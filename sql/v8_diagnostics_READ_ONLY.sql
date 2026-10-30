-- Safe read-only diagnostic checks for account, records, numbering and duplicate balances.
select count(*) as orders_count, min(order_no) as lowest_order_no, max(order_no) as highest_order_no from public.orders;
select id,order_no,status,created_at,completed_at from public.orders order by created_at desc limit 20;
select access_status,role,count(*) from public.profiles group by access_status,role;
select o.order_no,coalesce(i.gross,0)-o.discount as total,
 coalesce(p.received,0) as received,coalesce(r.refunded,0) as refunded
from public.orders o
left join (select order_id,sum(quantity*unit_price) gross from public.order_items group by order_id) i on i.order_id=o.id
left join (select order_id,sum(amount) received from public.payments group by order_id) p on p.order_id=o.id
left join (select order_id,sum(amount) refunded from public.refunds group by order_id) r on r.order_id=o.id
where coalesce(p.received,0)-coalesce(r.refunded,0) > coalesce(i.gross,0)-o.discount
order by o.order_no;
