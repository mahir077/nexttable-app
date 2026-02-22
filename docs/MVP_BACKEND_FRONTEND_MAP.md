# NextTable – Backend ↔ Frontend Map (MVP)

এক জায়গায় দেখার জন্য: কোন module এর backend কোথায়, frontend কোথায়, আর কি চাই।

---

## 1. FOUNDATION – Multi-tenant + Auth

| Backend (Supabase) | Frontend | Status |
|-------------------|----------|--------|
| `organizations` table | AuthContext, Sidebar org name | ✅ Use as-is |
| `user_organizations` table | AuthContext `loadOrganizations()`, org switcher | ✅ Use as-is |
| `organization_id` in all 14 tables | Every page: `orgId` from `useAuth().organization?.id` or localStorage | ✅ Keep; only fix timing (already done in dashboard) |
| RLS on 14 tables, org-scoped policies | No change needed in frontend; just pass valid `org_id` | ✅ Don’t touch |
| Middleware (auth, /admin redirect) | All protected routes | ✅ Admin redirect done |

**কোন backend code delete করবো না।** শুধু frontend এ যেখানেই data fetch করো সেখানে `orgId` সঠিক সময়ে আছে কিনা সেটা নিশ্চিত করো।

---

## 2. SUPER ADMIN (অস্থায়ী বন্ধ)

| Backend | Frontend | Status |
|---------|----------|--------|
| `super_admins` table | – | Keep in DB |
| `/api/check-admin`, `/api/admin/*` | – | Keep; not used when /admin redirect is on |
| Middleware: `/admin` → redirect to `/dashboard` | – | ✅ Already done |

**কোন Supabase query delete করবো না।** Super admin শুধু route থেকে অফ করা আছে; চাইলে পরে আবার চালু করা যাবে।

---

## 3. CORE FEATURES – Tables / Queries

সব query তে `organization_id` filter থাকা দরকার। কোন table থেকে কি নিচ্ছে সেটার একটা ছোট ম্যাপ:

| Feature | Supabase table(s) | Frontend API/usage | Note |
|---------|--------------------|---------------------|------|
| Dashboard floors | `floors` | `getFloors(orgId)` in `src/app/lib/api/tables.ts` | ✅ Keep; orgId from context/localStorage |
| Dashboard tables | `tables` | `getTablesByFloor(floorId, orgId)` | ✅ Keep |
| POS / Menu | `menu_categories`, `menu_items` | org_id in all queries | ✅ Keep |
| Orders | `orders` | org_id in all queries | ✅ Keep |
| Billing | `orders`, payment methods | org_id | ✅ Keep |
| Kitchen | `orders` | org_id | ✅ Keep |
| Settings | `restaurant_settings`, `floors`, `tables` | org_id | ✅ Keep |
| Stock / Reports | `stock_*`, `orders`, etc. | org_id | ✅ Keep |

**কোন backend query delete করবো না।** সমস্যা হয়েছিল dashboard এ `orgId` ঠিক সময়ে না থাকায়; সেটা আমরা আগেই ঠিক করেছি।

---

## 4. RECOMMENDATION (কি করবো – সংক্ষেপে)

1. **Full backend clear করবো না।**  
   Supabase tables, RLS, API routes সব রাখো।

2. **Partial clear ও করবো না।**  
   কোন module এর সব query মুছে দেবো না।

3. **যেটা করবো:**  
   - Frontend এ যেখানে `orgId` / `organization_id` লাগে, সেখানে নিশ্চিত করো যে `organization` (অথবা localStorage fallback) থেকে সঠিক সময়ে পাচ্ছো।  
   - Production এ Netlify build env এ `NEXT_PUBLIC_SUPABASE_URL` ও `NEXT_PUBLIC_SUPABASE_ANON_KEY` সেট আছে কিনা চেক করো (ইতিমধ্যে doc করা আছে)।  
   - Super admin অস্থায়ী বন্ধ রাখো (মিডলওয়্যার রিডাইরেক্ট); পরে চাইলে আবার চালু করবে।

4. **Backend “perfectly” front এর সাথে মিলিয়ে দেওয়া:**  
   Backend already front এর সাথে মিল আছে: সব জায়গায় `organization_id` দিলেই RLS ও query ঠিক কাজ করে। তাই **extra backend code লেখার দরকার নেই**; শুধু frontend এ org available হওয়ার পরেই data fetch চালানো (যেমন dashboard এ করা হয়েছে)।

---

## 5. MVP list vs code – এক নজরে

তুমি যে MVP module list দিয়েছ সেটার সাথে কোডের ম্যাপিং:

- **Foundation (Multi-tenant, RLS, Auth):** Already in place. Don’t delete; only ensure env + org timing in frontend.
- **Super Admin:** Implemented but temporarily disabled via redirect. No delete.
- **Dashboard, POS, Kitchen, Billing, Menu, Orders, Settings:** All use same pattern: `orgId` + Supabase client; keep all queries.
- **Inventory / Stock, Reports, Reservations:** Same pattern; keep backend, fix only if a specific page has org/timing issue.

**Summary:**  
Backend code **full clear করবো না**, **partial clear ও করবো না**। Supabase এর সব query রাখো। শুধু frontend এ org timing আর production env ঠিক রাখো; বাকি MVP list অনুযায়ী ধাপে ধাপে polish (UI/UX, mobile, reports) করতে পারো।
