# Multi-tenant audit – NextTable

**Date:** 2026-02-21  
**Purpose:** Client meeting – isolation and bug check.

---

## Summary

- **Isolation:** Tenant data is scoped by `organization_id`. Supabase RLS enforces that users only see rows where `organization_id` is in their `user_organization_ids()` or NULL (legacy).
- **App:** All main flows (Dashboard, POS, Kitchen, Billing, Orders, Menu, Stock, Reports, Settings, Reservations, Suppliers, Purchases) use `organization?.id` or `localStorage.getItem('current_organization_id')` and pass it to queries. No app code was found that loads tenant data without an org scope.
- **Fixes applied today:** Settings floors (no query when `orgId` is null; floor update/delete scoped by `organization_id`), dashboard change-table flow (orders + tables updates scoped by `organization_id`).

---

## 1. Auth & org selection

| Item | Status |
|------|--------|
| Login clears `current_organization_id` so previous user’s org is not reused | OK |
| `loadOrganizations` sorts so **owner** org is first; new user gets their restaurant first | OK |
| `organizations` and `user_organizations` RLS (004) restrict SELECT to user’s orgs / own rows | OK |
| `refreshOrganization` loads org by id; RLS ensures user can only read orgs they belong to | OK |

---

## 2. App pages – org usage

All protected pages use:

```ts
const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
```

and guard with `if (!orgId) return` before loading data. Pages checked: Dashboard, POS, Kitchen, Billing, Orders, Menu, Stock, Stock Ledger, Reports, Reports Summary, Settings, Reservations, Suppliers, Purchases.

---

## 3. Supabase RLS (001 + 004)

- **Tenant tables:** `floors`, `tables`, `categories`, `menu_items`, `orders`, `order_items`, `reservations`, `suppliers`, `purchases`, `purchase_items`, `stock_movements`, `stock_summary`, `restaurant_settings`, `invoice_settings`  
  - SELECT: `organization_id IS NULL OR organization_id IN (user_organization_ids())`  
  - INSERT: `organization_id IN (user_organization_ids())`  
  - UPDATE/DELETE: same as SELECT for tenant scope  

- **Important:** Rows with `organization_id = NULL` are visible to **all** authenticated users (legacy). Recommendation: backfill NULLs to correct orgs, then tighten policies to remove the `OR organization_id IS NULL` clause.

- **organizations:** SELECT only where `id IN (user_organization_ids())`.  
- **user_organizations:** SELECT only where `user_id = auth.uid()`.

---

## 4. API routes

| Route | Multi-tenant safe? | Notes |
|-------|--------------------|--------|
| `GET/POST /api/settings` | No | Uses `tenant_id` and `NEXT_PUBLIC_DEMO_TENANT_ID`. **Not used** by the Settings page (which uses Supabase client + `organization_id`). Documented as legacy. |
| `GET /api/check-admin` | N/A | Only checks `super_admins` by `user_id`. |
| `GET/PATCH /api/admin/clients*` | Yes | Uses service_role; for super admin only; no tenant data mixed. |
| `POST /api/admin/create-client` | Yes | Creates org + user_organizations + seed data with new `organization_id`. |

---

## 5. Fixes applied in codebase

1. **Settings – fetchFloors**  
   - Before: Query ran even when `orgId` was null, so filter was missing.  
   - After: `if (!orgId) return` and always `.eq('organization_id', orgId)`.

2. **Settings – floor update/delete**  
   - Update and delete now include `.eq('organization_id', orgId)` so mutations are scoped to current org.

3. **Dashboard – change table**  
   - Order update and both table updates (available/occupied) now include `.eq('organization_id', orgId)`.

4. **Brutal multi-tenant check (final pass)**  
   - **Dashboard:** Table status change and merge-tables loop now use `.eq('organization_id', orgId)` on all `tables` updates; guard `handleStatusChange` with `if (!orgId) return`.  
   - **POS:** Table “occupied” update after creating order now includes `.eq('organization_id', orgId)`.  
   - **Kitchen:** Order and order_items inserts use `orgId` (not only `organization?.id`); delete order requires `orgId` and always scopes by `.eq('organization_id', orgId)` (no fallback delete without org).  
   - **Suppliers / Reservations / Purchases / Stock:** All inserts and upserts use `orgId` for `organization_id` (replacing `organization?.id` so data is never written without org scope when user has org from localStorage).

---

## 6. Recommendations for client

1. **RLS NULL clause:** Plan a migration to set `organization_id` on any remaining NULL rows, then remove `OR organization_id IS NULL` from SELECT/UPDATE/DELETE policies for strict per-org isolation.
2. **Legacy `/api/settings`:** Either remove it or refactor to use session + `organization_id` if you want a server-side settings API later.
3. **Testing:** Log in as two different tenant users in two browsers; confirm each sees only their own data (menu, orders, tables, settings, reports).

---

## 7. Quick checklist for meeting

- [x] Login / org selection uses current user’s orgs only; owner’s org first.
- [x] All main pages pass `organization_id` in queries.
- [x] RLS on all tenant tables + organizations + user_organizations.
- [x] Settings floors and dashboard change-table scoped by org.
- [x] Brutal check: Dashboard/POS/Kitchen table updates and Kitchen delete scoped by org; all inserts (orders, reservations, suppliers, purchases, stock) use orgId.
- [ ] Optional: Backfill NULL `organization_id` and tighten RLS (recommended later).

---

## 8. Brutal check – one client cannot see another’s data

| Question | Answer |
|----------|--------|
| Can one client see another client’s data? | **No.** RLS on every tenant table restricts SELECT/UPDATE/DELETE to rows where `organization_id` is in the current user’s orgs (or NULL legacy). App code always passes `orgId` from context/localStorage and uses `.eq('organization_id', orgId)` on queries and mutations. |
| Can a client see random/wrong data? | **No.** Org is resolved once per page from `organization?.id ?? localStorage ?? organizations?.[0]?.id`; all fetches and writes use that same `orgId`. No cross-tenant mix. |
| Does each client see their own data correctly? | **Yes.** Same `orgId` is used for all reads and writes on that session; RLS enforces that only rows belonging to that org are visible. |
| Legacy risk | Rows with `organization_id = NULL` are visible to all authenticated users until you backfill and remove the NULL clause from RLS. Legacy `/api/settings` uses env `tenant_id` and is **not** used by the Settings UI. |
