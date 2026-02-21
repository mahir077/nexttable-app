# Codebase Audit – Issues by Category

Generated from audit for: Supabase `organization_id` filters, hardcoded values, error handling, console statements, TODOs, and empty/loading states.

---

## 1. Supabase query missing `.eq('organization_id', orgId)` filter

| File | Line(s) | Issue |
|------|---------|--------|
| **src/app/pos/page.tsx** | 442–446 | Table status check before KOT: `.from('tables').select('status').eq('id', selectedTable).single()` has no `.eq('organization_id', orgId)`. Allows reading table by id without org scope. |

All other tenant-scoped Supabase queries checked (billing, orders, kitchen, dashboard, settings, reservations, stock, stock/ledger, purchases, suppliers, menu, lib/api/orders) use `organization_id` where applicable. Admin and auth flows correctly use non-tenant tables (e.g. `super_admins`, `organizations`, `user_organizations`).

---

## 2. Hardcoded IDs or values that should be dynamic

| File | Line(s) | Issue |
|------|---------|--------|
| **src/app/settings/page.tsx** | 536, 556 | `invoice_settings` upsert uses `id: 1` and load uses `.eq('id', 1)` when `!orgId`. Fine for a single global row; risky if schema is per-org (prefer `organization_id` when available). |
| **src/api/settings/route.ts** | 6, 17, 44, 64, 65, 78 | Uses `process.env.NEXT_PUBLIC_DEMO_TENANT_ID` and `tenant_id` for all reads/writes. Single-tenant/demo only; not suitable for multi-org without request-scoped tenant. |
| **src/app/signup/page.tsx** | 51–52, 57 | Placeholder contact: `+880 1XXX-XXXXXX`, `tel:+8801XXXXXXXXX`, `wa.me/8801XXXXXXXXX`. Intentional placeholders; replace with real or config-driven values before production. |
| **src/app/admin/create-client/page.tsx** | 222 | Placeholder `+880 1XXX-XXXXXX` in phone input. Minor; replace for production. |

---

## 3. Missing error handling (try/catch or .catch)

| File | Line(s) | Issue |
|------|---------|--------|
| **src/app/dashboard/page.tsx** | 177–180 | `getAllTables(orgId).then(data => { ... })` has no `.catch()`. Rejection (e.g. network/API error) is unhandled. |
| **src/app/reservations/page.tsx** | 58–61 | `fetchTables` does `const data = await getAllTables(orgId)` with no try/catch. Thrown errors are unhandled and can leave UI in a bad state. |

Other async flows checked (POS, kitchen, billing, orders, menu, stock, purchases, suppliers, settings) use try/catch or equivalent.

---

## 4. console.log / console.warn / console.info in production code

| File | Line(s) | Type | Note |
|------|---------|------|------|
| src/app/admin/create-client/page.tsx | 62, 79, 82 | log | Request/response debug |
| src/app/reports/page.tsx | 57, 65, 96, 103, 160, 192 | warn | Fallback/error logging |
| src/app/kitchen/page.tsx | 348, 658 | log | Fetch success / edit debug |
| src/app/pos/page.tsx | 485 | log | Order created debug |
| src/app/stock/ledger/page.tsx | 106 | warn | Fetch error |
| src/app/settings/page.tsx | 195, 568 | log | Floors loaded / default invoice |
| src/app/billing/page.tsx | 120, 126, 130, 157, 185, 231, 250, 254, 267, 559, 563, 610 | log/warn | Fetch, payment, cash drawer debug |
| src/app/api/admin/create-client/route.ts | 28, 46, 49, 65, 78, 98, 103, 126, 128, 143, 145, 157, 159, 174, 176, 193, 195, 210, 212, 223, 225, 229 | log/warn | Admin flow progress and fallbacks |
| src/contexts/AuthContext.tsx | 281 | log | Org switch |
| src/app/stock/page.tsx | 64 | log | Stock fetch count |
| src/api/settings/route.ts | 21, 90, 108, 127 | error | Error logging (often acceptable in API routes) |

Recommendation: remove or guard `console.log`/`console.info` in app and context code; keep or replace with a logger for `console.warn`/`console.error` in API routes and critical paths.

---

## 5. TODO / FIXME comments

**None found** in `src` (search for `\bTODO\b`, `\bFIXME\b`, `\bXXX\b`).

---

## 6. Pages not handling empty or loading states

All audited pages have explicit loading and/or empty handling:

- **Dashboard**: loading spinner; empty floors/tables via `floors.length`, `tables.length` and loading flags.
- **POS**: loading for categories/items; “Cart is empty”; Suspense fallback.
- **Kitchen**: LoadingSpinner; EmptyState when no orders.
- **Billing**: loading; “All Clear! No pending bills” when `orders.length === 0`.
- **Orders**: loading; “No orders found” when `filteredOrders.length === 0`.
- **Reservations**: loading; “No pending reservations” when `reservations.length === 0`.
- **Menu**: loading; “No items in this category” when `filteredItems.length === 0`.
- **Stock**: loading; “No Stock Data Yet” when `stockData.length === 0`.
- **Stock Ledger**: loading; “No Movements Found” when `movements.length === 0`.
- **Suppliers**: loading; “No Suppliers Yet” when `suppliers.length === 0`.
- **Purchases**: loading; “No Purchases Yet” when `purchases.length === 0`.
- **Reports / Reports summary**: loading; data shown as 0 or empty where applicable.
- **Settings**: auth loading / “Loading org…”; Tables tab “No floors found!” when `floors.length === 0`.
- **Reservation/table**: loading; “No tables in this floor” when `!loading && tables.length === 0`.
- **Admin dashboard / create-client**: loading states present.

No pages were found that completely lack loading or empty-state handling.

---

## Summary

| Category | Count | Severity |
|----------|--------|----------|
| Missing `organization_id` filter | 1 | High (multi-tenant safety) |
| Hardcoded IDs/values | 4 locations | Medium (settings/invoice, API tenant) |
| Missing try/catch | 2 | Medium (unhandled rejections) |
| console.* in production | 11 files, many lines | Low (cleanup / logging policy) |
| TODO/FIXME | 0 | — |
| Missing empty/loading states | 0 | — |

Recommended order of fix: (1) add `organization_id` to POS table check, (2) add try/catch or `.catch()` for dashboard and reservations, (3) review invoice_settings and API tenant usage, (4) remove or centralize console usage.
