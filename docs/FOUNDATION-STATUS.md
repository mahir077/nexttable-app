# Foundation Status – NextTable

**Tumio bolecho: eta thik thakle sob thik, eta bhul hole sob bhul.** Ei doc e dekha hoy ekhon ki complete, ki missing.

---

## 📊 18 Features – Ek najare

| # | Feature | Hoise? | Ki hoy nai (jodi thake) |
|---|--------|--------|--------------------------|
| **Multi-tenant (8)** |
| 1 | Tenants table | ✅ | – |
| 2 | tenant_id in all tables | ✅ | – (amra `organization_id` use kori) |
| 3 | RLS policies | ✅ | – |
| 4 | Indexes | ✅ | – |
| 5 | Foreign keys | ✅ | – |
| 6 | Middleware | ✅ | – |
| 7 | Auto-filtering | ✅ | – |
| 8 | Basic admin UI | ✅ | – (Sidebar e org switcher) |
| **White-label (10)** |
| 9 | Branding table | ✅ | – (`restaurant_settings`) |
| 10 | Logo upload | ❌ | Logo URL/upload + Storage – nei |
| 11 | Primary color | ⚠️ | DB/API ache, **UI e apply hoy nai** |
| 12 | Secondary color | ⚠️ | Same |
| 13 | Restaurant name | ✅ | – |
| 14 | Powered-by toggle | ⚠️ | DB/API ache, **UI e show/hide use hoy nai** |
| 15 | Logo on dashboard | ❌ | nei |
| 16 | Logo on invoice | ❌ | nei |
| 17 | Logo on KOT | ❌ | nei |
| 18 | Color application | ❌ | App-wide theme – hoy nai |

**Summary:** Multi-tenant **8/8 done**. White-label **2 full + 2 partial + 6 missing** → foundation overall **~55%** (multi-tenant complete, white-label aro kaaj baki).

---

## 🧪 Deploy er por multi-tenant kaj kore kina kivabe bujhbo

Short checklist – ei steps follow korle bujhbe data org-wise alada thakche kina.

1. **Duita organization banao**
   - **Option A:** Duijon alada user (alada email diye sign up). Prothom user = Org A, ditiyo user = Org B.
   - **Option B:** Ek user diye sign up koro (Org A). Tarpor Supabase Dashboard → Table Editor → `user_organizations` e giye manually ekta notun org add koro (new org create kore oi user er user_id + organization_id insert). Tarpor app e login kore Sidebar e org dropdown theke switch koro → Org B.

2. **Org A te data dao**
   - Org A select kore thako. Menu theke ekta category + item add koro. Settings theke ekta floor/table add koro. POS theke (jodi table thake) ekta order dio.

3. **Org B te switch koro**
   - Sidebar e jodi dropdown ashe (multiple org) tahole **Org B** select koro. Naki alada browser/incognito diye Org B er user diye login koro.

4. **Check koro**
   - **Org B e:** Org A er menu item / table / order **dekhabe na** (list empty or different).
   - **Punoray Org A te switch** koro → Org A er data abar dekha uchit.
   - **Dashboard / Billing / Menu** – sob jaygay current org er data-i asbe.

**Conclusion:** Org A te je data dilo sheta Org B te na dekha + Org B te alada data add korle Org A te na dekha = **multi-tenant kaj korche**.

---

## 📋 Ekhon ki complete, ki hoy nai (short list)

### ✅ COMPLETE (18 er moddhe 10 ta – full)

**Multi-tenant (8 er 8 i complete – code/migration diye):**

| # | Feature | Status |
|---|--------|--------|
| 1 | Tenants table | ✅ `organizations` = tenant, SignUp e org create |
| 2 | tenant_id in all tables | ✅ Migration e `organization_id` + app e every INSERT e pathano hoy |
| 3 | RLS policies | ✅ Migration e sob table e org-based RLS |
| 4 | Indexes | ✅ Migration e `organization_id` index |
| 5 | Foreign keys | ✅ Migration e `REFERENCES organizations(id)` |
| 6 | Middleware | ✅ Auth middleware, protected routes |
| 7 | Auto-filtering | ✅ RLS diye auto (app theke .eq() lagbe na) |
| 8 | Basic admin UI | ✅ Sidebar e org switcher (multiple org thakle dropdown) |

**White-label (10 er 4 ta complete):**

| # | Feature | Status |
|---|--------|--------|
| 9 | Branding table | ✅ `restaurant_settings` |
| 13 | Restaurant name | ✅ `display_name` – dashboard, billing, settings e use |
| 11–12 | Primary / Secondary color | ⚠️ API/DB e ache, **UI e apply hoy nai** |
| 14 | Powered-by toggle | ⚠️ Type/API e ache, **UI e show/hide use hoy nai** |

---

### ❌ BAKI / INCOMPLETE (6 ta)

| # | Feature | Ki hoy nai |
|---|--------|------------|
| 10 | Logo upload | Logo URL/upload + Supabase Storage – nei |
| 15 | Logo on dashboard | Dashboard e logo load/display – nei |
| 16 | Logo on invoice | Invoice print e logo – nei |
| 17 | Logo on KOT | KOT print e logo – nei |
| 18 | Color application | Primary/secondary color app-wide (sidebar, buttons) – apply hoy ni |
| 11–12, 14 | Color + Powered-by | DB/API ready, **UI te use** (theme + powered-by hide) – kora hoy nai |

---

### ⚠️ Tomar ekta kaj

- **Multi-tenant fully on** korte hole: Supabase SQL Editor e **`docs/supabase-migrations/001_multi_tenant_organization_id.sql`** script ta **ekbar run** korte hobe. Na run korle DB e `organization_id` column + RLS thakbe na, app error dite pare.

---

## Multi-tenant (8) – Detail

| # | Feature | Status | Notes |
|---|--------|--------|--------|
| 1 | **Tenants table** | ✅ Done | `organizations` table; org = tenant. SignUp creates org. |
| 2 | **tenant_id in all tables** | ✅ Done | Migration adds `organization_id`; app sends it on every INSERT. |
| 3 | **RLS policies** | ✅ Done | Migration: `public.user_organization_ids()` + per-table RLS. |
| 4 | **Indexes** | ✅ Done | Migration: `idx_*_organization_id` on all tenant tables. |
| 5 | **Foreign keys** | ✅ Done | Migration: `organization_id uuid REFERENCES organizations(id)`. |
| 6 | **Middleware** | ✅ Done | Auth middleware – protected routes, login redirect. |
| 7 | **Auto-filtering** | ✅ Done | RLS filters by user’s orgs; app doesn’t need .eq() on SELECT. |
| 8 | **Basic admin UI** | ✅ Done | Sidebar: current org name + org switcher dropdown. |

---

## White-label (10) – Status

| # | Feature | Status | Notes |
|---|--------|--------|--------|
| 9 | **Branding table** | ✅ Done | `restaurant_settings` – display_name, primary_color, secondary_color, show_nexttable_branding, etc. |
| 10 | **Logo upload** | ❌ Missing | Logo URL/upload field + storage – code e nei. |
| 11 | **Primary color** | ⚠️ Partial | API/type e ache. **UI e color apply** (CSS variable / theme) kora hoy ni. |
| 12 | **Secondary color** | ⚠️ Partial | Same as primary – type/API only. |
| 13 | **Restaurant name** | ✅ Done | `display_name` – dashboard, billing, settings e use hoy. |
| 14 | **Powered-by toggle** | ⚠️ Partial | `show_nexttable_branding` in type/API. **UI e kothao use** (hide "Powered by NextTable") – check korte hobe. |
| 15 | **Logo on dashboard** | ❌ Missing | Logo load/display on dashboard – nei. |
| 16 | **Logo on invoice** | ❌ Missing | Invoice print e logo – nei. |
| 17 | **Logo on KOT** | ❌ Missing | KOT print e logo – nei. |
| 18 | **Color application** | ❌ Missing | primary/secondary color app-wide (sidebar, buttons, links) – apply hoy ni. |

**Summary white-label:** Branding table + name use hoy. Logo + color application + powered-by UI incomplete.

---

## Critical Gaps – ekhon sirf White-label

### ✅ Multi-tenant – done (migration run koro)
- Column, RLS, indexes, FK, middleware, org switcher – sob code/migration ready.

### ❌ White-label – baki (priority 2)
1. **Logo**: `restaurant_settings` e logo_url + upload (Supabase Storage); dashboard, invoice, KOT e show.
2. **Colors**: Load primary/secondary from settings; apply via CSS variables / Tailwind theme.
3. **Powered-by**: Footer/settings theke `show_nexttable_branding` use kore "Powered by NextTable" show/hide.

---

## Recommendation

- **Multi-tenant:** Foundation ready. Sirf Supabase e migration script run koro.
- **White-label:** Logo upload + color application + powered-by UI korle branding complete hobe.
