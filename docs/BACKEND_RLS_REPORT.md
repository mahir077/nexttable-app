# Backend RLS & Multi-Tenant Verification Report

**Generated from:** codebase migrations (Supabase SQL in `docs/supabase-migrations/`)  
**Purpose:** Document current RLS setup and how to verify it in your Supabase project.

---

## 1. RLS Policies on Requested Tables

### 1.1 `tables`

| Policy            | Operation | Definition (from 001) |
|-------------------|-----------|------------------------|
| `tables_org_select`  | SELECT  | `organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())` |
| `tables_org_insert`  | INSERT  | `organization_id IN (SELECT public.user_organization_ids())` |
| `tables_org_update`  | UPDATE  | `organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())` |
| `tables_org_delete`  | DELETE  | `organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())` |

**Source:** `001_multi_tenant_organization_id.sql` (lines 70–85).

---

### 1.2 `floors`

| Policy             | Operation | Definition (from 001) |
|--------------------|-----------|------------------------|
| `floors_org_select`  | SELECT  | `organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())` |
| `floors_org_insert`  | INSERT  | `organization_id IN (SELECT public.user_organization_ids())` |
| `floors_org_update`  | UPDATE  | `organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())` |
| `floors_org_delete`  | DELETE  | `organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())` |

**Source:** `001_multi_tenant_organization_id.sql` (lines 51–66).

---

### 1.3 `organizations`

| Policy                     | Operation | Definition |
|----------------------------|-----------|------------|
| `organizations_select_own` | SELECT    | `id IN (SELECT public.user_organization_ids())` |
| `organizations_update_own` | UPDATE    | `USING (id IN (SELECT public.user_organization_ids()))` and `WITH CHECK (id IN (SELECT public.user_organization_ids()))` |

**Notes:**
- SELECT/UPDATE: `004_security_advisor_fixes.sql` (organizations SELECT), `007_allow_org_update_by_members.sql` (organizations UPDATE).
- INSERT/DELETE on `organizations`: no RLS policy for authenticated users; intended for **service_role** only (e.g. admin create-client API).

---

### 1.4 `user_organizations`

| Policy                          | Operation | Definition |
|---------------------------------|-----------|------------|
| `user_organizations_select_own` | SELECT    | `user_id = auth.uid()` |

**Notes:**
- INSERT/UPDATE/DELETE: no policy for authenticated users; intended for **service_role** (e.g. create-client, invites).
- **Source:** `004_security_advisor_fixes.sql` (lines 24–29).

---

## 2. SELECT Pattern vs Your Required Pattern

**Your required pattern:**
```sql
organization_id IN (
  SELECT organization_id
  FROM user_organizations
  WHERE user_id = auth.uid()
)
```

**What the codebase uses:**

- A helper function is defined in `001_multi_tenant_organization_id.sql`:
  ```sql
  CREATE OR REPLACE FUNCTION public.user_organization_ids()
  RETURNS setof uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid();
  $$;
  ```
- All org-scoped SELECT policies use:
  - **`tables` / `floors`:**  
    `organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())`
  - **`organizations`:**  
    `id IN (SELECT public.user_organization_ids())`  
  (same logic; `organizations` is keyed by `id`, not `organization_id`.)

So the **effective logic** for `tables` and `floors` is:

- Rows are visible if:
  - `organization_id` is NULL (legacy), **or**
  - `organization_id` is in the set returned by  
    `SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()`  

That matches your pattern, with the extra allowance for NULL `organization_id`. The `user_organization_ids()` function is equivalent to your subquery.

---

## 3. User Membership: `user_organizations`

- A user can only see **organizations** and **org-scoped data** (floors, tables, etc.) if they have a row in `user_organizations` linking `user_id = auth.uid()` to an `organization_id`.
- If a user has **no row** in `user_organizations`, then:
  - `user_organization_ids()` returns no rows.
  - They will not pass any `organization_id IN (SELECT ... user_organizations ...)` check (and for `organizations`, no `id IN (...)`).
- So **“check if user exists in user_organizations”** is the same as: for the current `auth.uid()`, there should be at least one row in `user_organizations`. The verification script below checks this.

---

## 4. Migration Order (for a clean backend)

Apply in this order so RLS and helper match this report:

1. `001_multi_tenant_organization_id.sql` – columns, indexes, `user_organization_ids()`, RLS for `floors`, `tables`, and other tenant tables.
2. `004_security_advisor_fixes.sql` – RLS for `organizations` (SELECT) and `user_organizations` (SELECT).
3. `007_allow_org_update_by_members.sql` – UPDATE policy for `organizations`.

---

## 5. Summary Table

| Table               | RLS enabled | SELECT pattern | Same as your pattern? |
|---------------------|------------|----------------|------------------------|
| **tables**          | Yes        | `organization_id IS NULL OR organization_id IN (user_organization_ids())` | Yes (plus NULL legacy) |
| **floors**          | Yes        | Same as above  | Yes (plus NULL legacy) |
| **organizations**   | Yes        | `id IN (user_organization_ids())` | Yes (column is `id`)   |
| **user_organizations** | Yes     | `user_id = auth.uid()` | N/A (table is membership; no org_id filter) |

**Conclusion:** SELECT policies on `tables`, `floors`, and `organizations` use the same logic as  
`organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())`, via `user_organization_ids()`. For `organizations`, the column used is `id` instead of `organization_id`.

Run the verification script in `docs/supabase-migrations/verify_rls_and_user.sql` (see below) in the Supabase SQL Editor to confirm current state and that the current user exists in `user_organizations`.
