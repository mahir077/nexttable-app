# Tenant Onboarding & Roles – NextTable (Vision)

**Tumi jeta bolecho:** Notun client ke tumi nijei account khulbe; she nije sign up korte parbe na. Account open howar por shei org er owner. She staff, manager, role ar user create korte parbe.

---

## 📌 Model (kemon thakbe)

### ১. তুমি (Software Owner / Vendor)
- **Notun client** software nite chaile, **tumi** tar info niye **tumi** account banay dibe.
- Client nije sign up **korte parbe na** – signup page public thakle o disable/invite-only korte hobe, ba tumi ekta **admin panel** theke org + first user (client) create korbe.
- Client er kach theke lagbe: name, email, restaurant/org name, etc. Tumi ei diye Supabase (ba admin UI) e org + user create kore login credential (link / temp password) pathabe.

### ২. Client = Account Owner
- Account khula howar por **client e org er owner**.
- She **owner** hishebe:
  - **Staff / Manager** create korte parbe (email invite ba manual add).
  - **Role** banaite parbe (e.g. Manager, Waiter, Kitchen) – kon role ki ki korte parbe seta define.
  - **User** add korte parbe – role assign kore.

### ৩. Org er bhitore hierarchy
- **Owner** (1 jon per org) – full control: settings, users, roles, billing (jodi thake).
- **Manager** – order/menu/table manage, reports; user create na ba limited.
- **Staff** (e.g. Waiter, Cashier) – POS, table, order – limited by role.
- **Role** – permission set (kono page/action korte parbe ki na).

---

## ✅ Ekhon ki ache (current app)

| Kichu | Status |
|-------|--------|
| Multi-tenant (org) | ✅ Organizations + RLS |
| Sign up | ✅ **Public** – keu nijei sign up kore org create kore |
| Org owner / staff / manager | ❌ **Nai** – kono role nei, shob user same |
| Roles table / permissions | ❌ Nai |
| Tumi (vendor) diye client account open | ❌ Nai – no super-admin, no “create org for client” flow |
| Owner theke user/role create | ❌ Nai |

---

## ❌ Kora lagbe (summary)

1. **Signup control**
   - Public signup **band** kora, ba **invite-only**: shudhu tumi (admin) jake account dibe shei login korte parbe.
   - Ba: signup page e “Request account” form – tumi manually account kholbe.

2. **Super-admin / Vendor panel (tumar jonno)**
   - Tumi jara login korte paro (e.g. specific email list ba `super_admins` table):
     - **Create organization** (org name, slug, etc.)
     - **Create first user** (client): email, name, temp password – ekei **org owner** hishebe set kora
   - Eta Supabase Dashboard diye o kora jay; ba app e `/admin` route (sirf tumi access) e form.

3. **Org er vitore roles**
   - **Tables:** `roles` (org-scoped), `user_organizations` e `role` add (e.g. `owner` | `manager` | `staff` | custom role_id).
   - **RLS:** `user_organization_ids()` e thik ache; permission check (e.g. “only owner can add user”) app layer e ba RLS e role check.

4. **Owner UI (client er dashboard)**
   - **Team / Users:** Add user (email invite ba manual), assign role.
   - **Roles:** Create role (name + permissions: can_manage_menu, can_manage_orders, etc.).
   - Manager/Staff login korle sidebar + pages role onujayi (limited options).

5. **Permission checks**
   - Every sensitive page/API te: current user er org + role check – owner/manager/staff onujayi allow/deny.

---

## Order of work (suggested)

1. **Phase 1 – Tumi client account kholte paro**
   - Public signup disable (ba “Request account” only).
   - Super-admin: tumi org + owner user create (Supabase e manually ba simple admin page).
   - Owner = first user of that org (flag in `user_organizations` e.g. `is_owner` or role `owner`).

2. **Phase 2 – Owner can add users & roles**
   - `roles` table (per org), `user_organizations.role` (owner/manager/staff/custom).
   - UI: Settings/Team – add user, assign role; optional: create custom role with permissions.

3. **Phase 3 – Permissions**
   - Page/action level: role onujayi show/hide + API guard.

---

Eta doc theke pore implement korte parbi step by step. Ekhon foundation (multi-tenant) ready; ei tenant-onboarding + roles = next phase.
