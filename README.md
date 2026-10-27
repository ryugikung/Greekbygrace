# Yogurt Studio V4 — cumulative performance update

This package contains all V3 features and the V4 performance changes. Replace the existing GitHub repository files with the ZIP contents; keep Vercel output directory set to `public`.

## Database
No new SQL migration is required **if V1–V3 migrations were already run**. Do not reset Supabase. The `sql/` folder retains previous scripts for reference or fresh installations.

## V4 changes
- Renders a branded loading shell immediately after session initialization, instead of waiting on a blank page.
- Saves now refresh only the tables affected by the operation rather than all 12 tables.
- Database loads report explicit failures with a retry button.
- Preserves existing product, order, cost, reporting, appearance, and language features.

## Known limitations
- First authenticated visit still fetches all tables for compatibility with existing screens. This may be slow with very large databases; future work should implement server-side pagination and query-specific report aggregation.
- Saving an order may require separate requests for order items and payments; no optimistic updates yet.
- Remote ESM dependency remains; bundling requires a dedicated build toolchain.
- Not yet tested against your live Supabase database.


## V5 — visual and UX polish

- Consistent palette-aware cards, dialogs, inputs, table hover states and toasts.
- Smooth restrained transitions, modal entrance, and navigation feedback.
- Save buttons show an in-progress state and block accidental duplicate submissions.
- Escape closes open dialogs; navigation resets scroll to the top.
- Mobile modal and toast spacing improved; respects reduced-motion accessibility preferences.
- No database changes: use the same Supabase project and existing SQL migrations.
- This is a cumulative V4-based package. Browser/Supabase integration testing is still recommended.
