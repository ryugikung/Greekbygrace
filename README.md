# Yogurt Studio V8 — Reliability & Test-Data Reset

**Cumulative update from V7.** All earlier styling, themes, floating decorations, Thai/English preferences, mobile navigation, product entry, and production screens remain. The website files are in `public/`, and Supabase scripts are in `sql/`.

## READ BEFORE ANY SQL

**Take a restorable database backup first.** The standard `sql/v8_migration.sql` is data-preserving; the optional test-data reset script is permanently destructive and is intentionally locked. Do not assume the in-browser JSON export is a full backup: it is a partial snapshot of currently loaded records.

### Install in the correct order

1. Confirm this is your **Yogurt Studio Supabase project**, not Tutor Desk. Verify V1–V3 and V7 migrations have already been run.
2. Preserve a validated backup/snapshot of the database. If you are already using real sales, payments, inventory, customers, or expenses, avoid any reset scripts.
3. In Supabase **SQL Editor**, run **only** `sql/v8_migration.sql`. Do **not** rerun `sql/setup.sql` or wipe the schema. If SQL returns an error, stop and resolve it before deployment.
4. Replace the repository contents with this ZIP's `public/`, `sql/`, and `README.md` (on GitHub's `main` branch). Keep Vercel settings: Framework **Other**, output directory **public**, no build command.
5. Deploy through Vercel. Hard refresh (`Ctrl+Shift+R`) to avoid the browser serving an older JavaScript version.
6. Verify login, add/edit product with cost lines, new order, payment, refund, report month, stock adjustment, owner archive, and mobile order form.

### Why #2 is shown after deleting records

`orders.order_no` is a PostgreSQL **identity** sequence. Deleting rows does not roll the sequence backward, and even rolled-back transactions may consume numbers. Seeing `#2` by itself is normal and **does not indicate an undeleted order**. If `#2` is still visibly listed after a fresh reload, that order row may still exist. Use `sql/v8_diagnostics_READ_ONLY.sql` to check.

**Choose one of these separate reset procedures (do not run either as part of normal upgrade):**

- **Keep data, restore numbering only if zero orders exist:** Run `sql/v8_restart_order_number_ONLY_WHEN_EMPTY.sql`. It refuses to change the sequence if any order remains. The next successful order will normally start at `#1`; sequence gaps can still occur later.
- **Erase all experimental business data and restart numbering:** Only if *all* orders, products, costs, payments, refunds, inventory, customers, production, and expenses are disposable test data, review `sql/v8_OPTIONAL_ERASE_ALL_TEST_STORE_DATA.sql`. After verifying a restorable backup, change its `confirmation` from `'NO'` to exactly `'ERASE_ALL_TEST_STORE_DATA'` and run that file alone. It preserves Auth users, profiles, store settings, templates, stickers, and appearance preferences. It cannot be undone without a backup.

## V8 correctness upgrades

- One-transaction order creation (order + first line item) using `create_store_order` RPC.
- Atomic product record and cost-component replacement using `save_store_product` RPC. A failed cost-item insertion rolls back the entire product save.
- Order payment recording uses row-level locking, server-side balance validation, and an idempotency UUID (`record_store_payment`). Duplicate concurrent full-payment requests cannot both succeed.
- Owner-only refunds tracked separately with amount, reason, method, timestamp, and request UUID. Refunds don't silently change old payment records.
- Direct browser writes to the payments, item, cost-component, and inventory-movement tables are blocked. The existing `adjust_inventory` RPC remains the authorized stock-adjustment path.
- Existing profiles remain active. New authentication users start **pending**; only approved staff can access store data. **Existing accounts are not removed.**
- Status-history events and `completed_at` are recorded on future status changes. Existing completed orders without known completion dates use their creation timestamp as a clearly labelled legacy fallback; no dates are invented.
- Owner-only archive/void for products, ingredients, customers, production batches, and expenses rather than permanent deletion of important history.
- Reports aggregate data in PostgreSQL (all-time and selected months, Bangkok local dates), not by summing the first 1,000 browser-loaded rows. Revenue, unit cost, collected payments, refunds and operating expenses appear separately.
- Orders initially load a recent page of 120 records; **Load older orders** retrieves more. Related order items/payments/refunds are fetched for visible order pages. The dashboard labels its order counts as recent-page counts rather than falsely implying all-time counts.
- V7's themed loading shell, mobile dialogs, font selection and customization features remain in place.

### Staff account approval after installing V8

Creating a new user under Supabase > Authentication > Users no longer automatically gives them operational access. After verifying their identity as a legitimate staff member, an owner can approve the profile in Supabase SQL Editor:

```sql
update public.profiles
set access_status='active'
where lower(email)=lower('verified-staff-email@example.com');
```

Do not enable public signup unless you have reviewed and tested the invitation/approval workflow. Supabase project configuration determines whether visitors can create Auth users.

### Reporting definitions

- **Completed sales:** value of currently completed orders, recognized by `completed_at` when available.
- **Gross receipts:** payments recorded within the chosen local calendar period.
- **Net receipts:** gross receipts minus recorded refunds in that same period.
- **Cost of goods sold:** item cost snapshots on completed orders, not ingredient purchases or a fully reconciled stock ledger.
- **Operating contribution:** completed sales − estimated unit costs − unvoided operating expenses.
- This is still a **management profit-and-loss report**, **not** a double-entry balance sheet. Bank balances, payables/receivables, capital, inventory valuation, tax and reconciliation are not implemented.

## Verification and current limitations

Checks performed offline: Node.js syntax validation, simulated browser flows at 320/390/1280 px, simulated product/order/payment RPC paths, reports page, mobile modal open/close. Real Supabase SQL migration execution, simultaneous two-user payment tests, RLS penetration tests, third-party CDN loading, and actual bank reconciliations have **not** been performed. Do those on a staging Supabase project before relying on production transactions.

Not yet implemented: automatic recipe-driven production consumption and finished-goods stock depletion, full balance sheet and double-entry ledger, complete Thai translations, offline-capable bundled build, automated CI against a real database. Those should not be described as fixed.

Do **not** upload a Supabase `service_role`/secret key or private database password to GitHub, even if the repo is private. The `public/config.js` contains only the browser publishable key; RLS remains essential.
