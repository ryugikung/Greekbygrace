# V8 staging acceptance checklist

Use a throwaway Supabase project before running these checks in any real store.

- [ ] Existing owner login still works after migration; owner profile remains active.
- [ ] Newly created Auth user with `access_status='pending'` cannot SELECT products/orders or invoke write RPCs.
- [ ] Owner activates legitimate staff profile; staff can work; owner-only archive/refund is blocked for staff.
- [ ] Create product with three cost components; sum matches unit cost. Force a bad cost insert to check full rollback.
- [ ] Create one order: order and initial item appear together; simulate failure to verify no partial order remains.
- [ ] Two staff send simultaneous payment requests for the entire remaining amount: only one distinct payment succeeds.
- [ ] Retry same request UUID: no duplicate payment. Change amount using same UUID: rejected.
- [ ] Cancel paid order; display still shows received money. Owner records refund with reason; net receipts reflect it.
- [ ] Try direct browser writes to `payments`, `order_items`, `product_cost_items`, and `inventory_movements`: permission denied.
- [ ] `adjust_inventory` changes both stock and the movement history; insufficient-stock adjustment is rejected.
- [ ] Complete a newly created order; `completed_at` is set. Cancel it; completion time is cleared, history is appended.
- [ ] Monthly report uses Asia/Bangkok reporting day; verify transactions around 00:00 local time.
- [ ] More than 120 orders display the **Load older orders** action, older orders have accurate items and payments.
- [ ] Archive catalog item; historical order snapshots still show old sale and cost.
- [ ] Void expense; old record remains visible with void indicator and is excluded from current reports.
- [ ] Save and reload theme template, font, floating sticker and bilingual preferences.
- [ ] Test login, dashboard, new order, payment, report and mobile dialogs at 320px, 390px, tablet, desktop.
- [ ] Verify previously used business data was not deleted by normal V8 migration.

## Known accounting limitations

This release does not include full inventory reconciliation or a genuine balance sheet. Do not treat the management report as legally compliant financial statements.
