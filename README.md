# Yogurt Studio V2

Cumulative replacement: upload **all contents of `public/`** to the same GitHub repo (preserve `public/` folder). Keep existing Supabase database; do NOT rerun setup.sql on an existing database. Optional `sql/v2_migration.sql` ensures owner-only deletion policies. Vercel: framework Other, output directory `public`, no build command.

## Changes
- Workflow sidebar: Dashboard → Inventory → Production → Products → Orders → Calendar → Customers → Expenses → Reports → Settings.
- Settings: seven palette templates, five editable colors, light/dark, font and text scale, English/Thai navigation and settings labels. Appearance is saved per browser, not synced across devices. The rest of the original content remains in English pending full translation.
- Delete buttons for products, ingredients, batches, expenses, and customers (owner only); deletion may be blocked by references. Orders can be cancelled/restored (not deleted), and cancellation does not issue refunds.
- Transparent ghost icon with black facial details preserved.

## Cost terminology
- **Unit cost** on a product is the estimated direct cost of making **one saleable unit**, including ingredients, toppings, packaging (if included in your costing).
- **Cost per unit** on an ingredient is the price per one recorded unit (e.g. THB per gram). Do not enter the price per kilogram when the inventory unit is grams.
- Product cost is a manual estimate in V2, not automatically calculated from recipes. Operating expenses are recorded separately.

## Cautions
- Test owner permissions and deletions with dummy data before production use.
- Financial records are not automatically refunded on order cancellation.
- Thai/English translation is currently partial; main navigation and appearance controls are translated.
