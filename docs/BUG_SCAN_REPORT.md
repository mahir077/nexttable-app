# Bug scan report – Cursor codebase & Supabase

Scan date: 2026-02-23. Focus: Supabase client, auth/org, dashboard, API layer, RLS-related logic.

---

## CRITICAL / HIGH

### 1. Middleware – env vars can be undefined on Netlify (production)

**File:** `src/middleware.ts` (lines 10–12)

**Issue:** `createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, ...)` uses non-null assertion. On Netlify, if these env vars are not available in the edge runtime (or at build time for the bundle that runs middleware), they can be `undefined`. Passing `undefined` into `createServerClient` can cause auth to fail or throw, so protected routes may behave incorrectly in production while working locally.

**Fix:** Guard before creating the client; if missing, still return a response (e.g. redirect to login for protected routes) instead of relying on undefined.

**Status:** Fix applied below.

---

### 2. Non-null assertion on `orgId` / `oId` in mutations

**Files:**
- `src/app/billing/page.tsx` line 251: `.eq('organization_id', orgId!)`
- `src/app/kitchen/page.tsx` lines 643, 659: `.eq('organization_id', oId!)`
- `src/app/suppliers/page.tsx` line 83: `.eq('organization_id', orgId!)`

**Issue:** If due to timing or state `orgId` / `oId` is null, we still pass it into Supabase. RLS may block or return unexpected results; TypeScript is satisfied by `!` but runtime can be wrong.

**Fix:** Add an explicit guard before the mutation (e.g. `if (!orgId) return` or early return with toast) so we never call Supabase with null. Then remove the `!` and use `orgId` / `oId` as string.

**Status:** Recommended – add guards in each handler before the mutation.

---

## MEDIUM

### 3. Kitchen – order_items.insert without organization_id when oId is null

**File:** `src/app/kitchen/page.tsx` (lines 643–654)

**Issue:** `oId = organization?.id ?? orgId` then `...(oId && { organization_id: oId })` – if `oId` is null, we don’t send `organization_id` on insert. If RLS requires `organization_id`, the insert can fail. The delete/update use `oId!` which can pass null.

**Fix:** Before running edit order (delete + insert + update), check `if (!oId) { showToast('Organization not set'); return }`. Then use `oId` (no `!`) and always pass `organization_id: oId` in the insert.

---

### 4. Supabase client proxy – `.from` can be undefined

**File:** `src/lib/supabase-client.ts`

**Issue:** When `getSupabase()` returns `null` (e.g. missing env in browser), the proxy returns `undefined` for any property. So `supabase.from('floors')` is `undefined`, and in `tables.ts` the call becomes `undefined(...)`, which throws. This is expected when env is wrong; the console.error in `getSupabase()` helps. No code change strictly required; just be aware that any direct use of `supabase` (e.g. in API modules that run before provider or with bad env) can throw.

**Fix:** Optional: in `getFloors` / `getTablesByFloor` etc., check that `supabase.from` is a function before calling, and throw a clear error. Low priority.

---

### 5. RPC `generate_order_number` – no organization context

**File:** `src/app/lib/api/orders.ts` (line 60)

**Issue:** `supabase.rpc('generate_order_number')` is called without parameters. If the RPC or your RLS expects organization context (e.g. from `auth.uid()` or a parameter), ensure the DB function is correct. If the RPC doesn’t exist in production, the fallback (`ORD${Date.now()...}`) is used – that’s fine.

**Fix:** Verify in Supabase that `generate_order_number` exists and behaves correctly for multi-tenant (e.g. per-org sequences if required).

---

## LOW / INFORMATIONAL

### 6. Swallowed errors in catch blocks

**Files:** AuthContext (catch { /* ignore */ }), dashboard (catch { // keep current }), billing, settings, etc.

**Issue:** Several `catch` blocks don’t log or rethrow. They’re often intentional (fallback behavior), but can hide real bugs.

**Fix:** Prefer `catch (e) { console.error('...', e); ... }` at least in development, or use a small logger that no-ops in production.

---

### 7. Dashboard – debug console.logs in production

**File:** `src/app/dashboard/page.tsx`

**Issue:** Many `[Dashboard]` and `[getFloors]` logs. They help debugging but add noise in production.

**Fix:** Gate with `process.env.NODE_ENV === 'development'` or remove once floors/tables issues are resolved.

---

### 8. Supabase RLS – run fix migration if not done

**Issue:** If "Auth RLS Initialization Plan" warnings appear for `public.floors` / `public.tables`, queries can timeout or return no rows.

**Fix:** Run `docs/supabase-migrations/010_fix_floors_tables_rls.sql` in Supabase SQL Editor (see README in that folder).

---

## Summary

| Severity   | Count | Action |
|-----------|--------|--------|
| Critical/High | 2 | Middleware env guard (fix applied); add orgId guards where we use `!` |
| Medium    | 3 | Kitchen oId guard + org_id on insert; verify RPC; optional proxy check |
| Low       | 3 | Logging in catch blocks; gate or remove dashboard logs; run RLS migration if needed |

---

## Checks performed

- Supabase client creation and env usage (client, SupabaseContext, middleware)
- AuthContext: org loading, loading flag, localStorage fallback
- Dashboard: orgId / effectiveOrgId, floors/tables useEffects, timeouts
- All `.eq('organization_id', ...)` usages and `orgId!` / `oId!` in mutations
- Order creation and kitchen order edit (organization_id on insert/update/delete)
- Middleware: protected routes, auth, env
- Empty or silent catch blocks across the app
