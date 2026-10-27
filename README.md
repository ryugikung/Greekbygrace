# Yogurt Studio V6 — responsive mobile + smooth overlays

Complete cumulative replacement of V5, preserving V1–V5 website features and existing Supabase data.

## Main fixes

- **Dialogs are mounted separately from the main dashboard.** Opening an order, product, or payment dialog no longer redraws the whole page or retriggers background entrance animations.
- **Lighter backdrop.** Removed costly `backdrop-filter` from dialogs (particularly problematic on mobile); a palette-aware tint remains.
- **Smooth overlay transitions.** Desktop modals fade and move subtly; phones use an animated bottom sheet with scrollable fields and visible footer buttons. Animated dismissal works with Cancel, close button, Escape, and tapping outside the dialog.
- **Responsive navigation.** On phones, fixed Dashboard / Orders / Products / Reports / More bottom navigation and a drawer for all ten pages, plus a compact branded top bar.
- **Responsive records.** On narrow screens, table records display as vertically stacked, labelled cards rather than requiring sideways scrolling.
- **Touch/mobile usability.** Safe-area spacing for modern phones, larger tap targets, input font sizing to avoid iOS auto-zoom, improved spacing for cards, dashboard and charts.
- Honors your saved color palettes and light/dark mode. Respects `prefers-reduced-motion`.

## Deploy

1. Upload **all extracted files** to the existing GitHub repository's `main` branch, retaining `public/`, `sql/` and `README.md` structure.
2. Vercel settings remain: Framework **Other**; Output directory **`public`**; no build command.
3. Redeploy and hard-refresh or fully close/reopen the mobile tab.
4. Test the product editor, order editor, payment dialog, mobile menu, tab switching, and form saves.

## Database

**No new SQL migration**. Keep your existing Supabase project. Do not reset it. The included SQL files are retained for fresh-install reference only.

## Known limitations

- This is a UI and mobile compatibility release, not a database-performance upgrade. Existing data flows and report limitations are unchanged.
- Multi-page application content is still rendered client-side. Initial authenticated loading still fetches all store tables.
- For live stores, test against Supabase using a nonproduction record before relying on business operations.
