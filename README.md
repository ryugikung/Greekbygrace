# Yogurt Studio — Private Store Management

Static frontend (HTML/CSS/JavaScript) + Supabase Auth/Postgres, designed for deployment to Vercel.

## Deployment

1. In the **new** Supabase project, open SQL Editor and run `sql/setup.sql` once.
2. Go to **Authentication → Providers → Email**. Disable public email signups (admin-created accounts only).
3. In **Authentication → Users**, create the owner user with an email and password. Then run in SQL Editor (replace the placeholder):
   ```sql
   update public.profiles set role='owner' where email='OWNER_EMAIL@example.com';
   ```
4. Create a **private** GitHub repository, upload this project's files and folders, including `public/`, `sql/`, and `vercel.json`.
5. Import the repository in Vercel as an **Other** framework. Set **Root Directory** to repository root, **Build Command** empty/override, **Output Directory** `public`. (When output directory is `public`, you may remove `vercel.json`; it is not required.)
6. Visit the deployed URL and sign in with the owner credentials. Add products first, then customers and orders.
7. To add staff, create each account in Supabase Authentication; its profile is automatically created with the `staff` role.

## Credentials

`public/config.js` includes a **publishable** Supabase key. It is safe to ship in the browser only because database tables have RLS policies. **Never** place secret, service-role, or database passwords in this file. All signed-in staff currently have broad operational write permissions; the owner alone can delete data and modify roles.

## Features in v1

Dashboard, orders (walk-in/preorder/delivery), order statuses, scheduled fulfillment list, product prices and cost snapshots, payments, customers, ingredient inventory and adjustment ledger, production batch log, expenses, basic financial reporting, staff directory, JSON export, responsive interface, PWA icons.

## Known limits / future work

- This is a **management dashboard**, not a customer storefront or integrated POS/payment gateway.
- Delivery-platform orders are entered manually; no platform API sync.
- The Calendar is a chronological pickup list, not a full drag-and-drop month grid.
- Production batches are logged manually; recipes, automated ingredient consumption, lot traceability, automatic batch depletion, stock reservations, and expiry-based fulfillment are **not** implemented.
- Orders initially have one line item; staff can add more after creation. No edit/remove of individual lines in v1.
- Payments support receipts, not refund workflows. Do not use negative payments to represent refunds.
- Reports use lifetime completed orders and entered expenses; they are management estimates, not financial statements.
- SQL RLS limits access to authenticated profiles; staff can edit operational records. Further permission separation and database-side transactional validation are recommended before scaling.
- Exported JSON contains customer details: store securely.
- Product cost is an estimate, not an automated recipe cost calculation.

## Important

Do not reuse Tutor Desk's Supabase database. This project uses a new schema and must not run its SQL against an existing Tutor Desk project.
