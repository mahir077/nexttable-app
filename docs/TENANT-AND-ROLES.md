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

## Step-by-step implementation (detail)

Ekhon theke Phase 1 → 2 → 3 onujayi exact step gulo. Ekdom niche theke upore follow koro.

---

### Phase 1 – Tumi client account kholte paro

#### Step 1.1 – Signup control (public signup band / request-only)

1. **Signup page theke direct account create band kora**
   - `src/app/signup/page.tsx`:
     - Option A: Form replace kore **“Request account”** form dao – name, email, restaurant name, phone (optional). Submit e ekta table e row insert (e.g. `account_requests`) ba email tumi ke pathabe. Submit por “Request submitted – we’ll contact you” message.
     - Option B: Signup page e redirect koro `/login` e, ar signup link hide/remove koro (login page theke “Sign up” link soray dao).
   - `AuthContext.tsx`: `signUp` function ta either remove koro ba only “request account” flow theke call hobe (e.g. admin jokhon approve kore tokhon – Step 1.3).

2. **(Optional) Supabase Auth theke public signup disable**
   - Supabase Dashboard → Authentication → Providers → Email: “Confirm email” on kora thakle i enough; **“Enable sign up”** off korte paro jodi tumi shudhu admin-created users chao. Off korle keu `signUp` API diye account create korte parbe na.

3. **Account requests store (jodi “Request account” form dao)**
   - Supabase e table: `account_requests` (id, name, email, org_name, phone, status, created_at). RLS: anon insert allow (shudhu insert), select/update sirf service_role ba super_admin.

---

#### Step 1.2 – Super-admin identity (ke tumi)

1. **Super-admin list define kora**
   - Option A: Supabase e table `super_admins` (id, user_id uuid ref auth.users, created_at). E table e tumi (vendor) er user_id insert koro (Supabase Dashboard theke). RLS: select sirf service_role / same user.
   - Option B: Hardcode allowed emails (e.g. env `SUPER_ADMIN_EMAILS=you@company.com`) – production e env theke read koro. Eta te DB change lagbe na.

2. **Helper function / API: “Am i super-admin?”**
   - Server-side: `getSession()` / `getUser()` theke user_id or email niye check koro `super_admins` table e ba env list e. Ekta util: `isSuperAdmin(userId: string)` ba `isSuperAdminByEmail(email: string)`.

---

#### Step 1.3 – Super-admin: org + first user (owner) create

1. **DB ensure**
   - `organizations`: already ache (name, slug, display_name, owner_id, etc.).
   - `user_organizations`: ensure **`role`** column ache (text: `owner` | `manager` | `staff` ba custom role_id). Jodi na thake: `ALTER TABLE user_organizations ADD COLUMN IF NOT EXISTS role text DEFAULT 'staff';` – first user ke `owner` dibe.

2. **Admin route (sirf super-admin)**
   - Route: `src/app/admin/page.tsx` (ba `src/app/(admin)/admin/...`). Middleware/guard: jodi `isSuperAdmin()` na hoy redirect `/login` ba 403.
   - Page e:
     - **Create organization:** form – org name, slug (optional, auto from name), display_name. Submit e `organizations` e insert (owner_id ekhono null ba tumi pore set korbe).
     - **Create first user (owner):** form – email, name, temp password. Flow:
       1. Supabase Admin API (service_role) diye `auth.admin.createUser({ email, password, email_confirm: true })` – eta backend theke korte hobe (service_role client-side e use kora safe na). So: **API route** banate hobe.
     - So: `src/app/api/admin/create-tenant/route.ts` (ba similar name). Body: `{ orgName, slug?, ownerEmail, ownerName, tempPassword }`. Server e:
       1. Check request user is super-admin (session theke user_id niye).
       2. Create org: `organizations` insert (owner_id = null initially).
       3. Create user: Supabase `auth.admin.createUser(...)` (service_role key use kore – env `SUPABASE_SERVICE_ROLE_KEY`).
       4. `user_organizations` e insert: user_id = new user, organization_id = new org, role = `owner`.
       5. (Optional) `organizations.owner_id` update = new user id.
     - Admin UI theke ei API call koro. Success por client ke tumi email diye temp password pathabe (manual ba email service).

3. **Service role use only on server**
   - Next.js API route e `createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` – never in client. Admin UI theke shudhu fetch to that API.

---

#### Step 1.4 – Owner first login

1. Owner je email/password diye login korbe (temp password); Supabase Auth normal sign-in.
2. `AuthContext` / `loadOrganizations`: already `user_organizations` theke org load kore. Ensure `role` column select koro jate pore “am i owner?” check korte paro.
3. (Optional) First login e “Change password” prompt dewa – Supabase `updateUser({ password: newPassword })`.

---

### Phase 2 – Owner can add users & roles

#### Step 2.1 – Roles table (org-scoped)

1. **Migration**
   - Table: `roles`  
     - id (uuid, PK), organization_id (uuid, FK organizations), name (text, e.g. "Manager", "Waiter"), slug (text, optional), permissions (jsonb or separate columns).  
     - permissions example: `{ "can_manage_menu": true, "can_manage_orders": true, "can_manage_users": false }` ba columns: can_manage_menu boolean, can_manage_orders boolean, etc.
   - RLS: select/insert/update/delete when `organization_id IN (SELECT user_organization_ids())` and (optional) sirf owner can insert/update/delete – eta Step 2.3 e policy e add kora jabe.

2. **Seed / default roles (optional)**
   - Per org: "Manager", "Staff" default role create kora jay app theke ba migration e – permission set fixed.

---

#### Step 2.2 – user_organizations.role properly use

1. **Already column thakle:** `user_organizations.role` = `owner` | `manager` | `staff` ba custom `roles.id` (uuid). Type decide koro: text e "owner"/"manager"/"staff" ba FK to `roles.id` for custom. Mixed: role_type enum + role_id nullable for custom.
2. **Simple approach:** `user_organizations.role` text – values: `owner`, `manager`, `staff`, ba custom er khetre `role_id` (uuid) use koro. So: column `role` (text) + `custom_role_id` (uuid nullable, FK roles). Owner/manager/staff fixed; custom role hole `custom_role_id` set.

---

#### Step 2.3 – RLS / policies for roles

1. **roles table:**  
   - Select: user er org holei dekhte parbe.  
   - Insert/Update/Delete: shudhu **owner** (user_organizations e role = 'owner') shei org er khetre.

2. **user_organizations (new user add):**  
   - Insert: shudhu **owner** shei org er khetre user add korte parbe. (Supabase e new user create korte hole again service_role lagbe – so “invite” flow: either admin API diye owner request kore, ba Supabase “invite user by email” use koro.)

3. **Helper:** `current_user_org_role(organization_id)` – returns current user’s role for that org (owner/manager/staff/custom). Eta RLS e ba app e use korbi.

---

#### Step 2.4 – Owner UI: Team (users) + Roles

1. **Settings er moddhe new tab/section: “Team” (ba “Users”)**
   - List: current org er sob user (user_organizations join auth.users or profiles where organization_id = current org). Column: name, email, role.  
   - Only **owner** ei tab dekhte parbe (role check in page).

2. **“Add user” (owner only)**
   - Form: email, name, role (dropdown: Owner/Manager/Staff ba custom roles from `roles` table).  
   - Submit: backend API (e.g. `POST /api/org/invite-user` ba `create-user`).  
   - Server: check current user is owner of org; then Supabase `auth.admin.inviteUserByEmail(email)` ba `createUser` (service_role). Then `user_organizations` e insert with role. Invite korle user ke email e link asbe; first login e password set kore.

3. **“Roles” tab (owner only)**
   - List: org er `roles` (name, permissions summary).  
   - Create role: name + permission checkboxes (can_manage_menu, can_manage_orders, can_view_reports, etc.).  
   - Edit/delete: owner only, RLS diye already protected.

4. **Assign role to user**
   - Team list e each user er role dropdown (owner/manager/staff/custom). Update e `user_organizations.role` (ba custom_role_id) update. API: `PATCH /api/org/users/:userId/role` with body `{ role, custom_role_id? }`, guard: current user = owner.

---

### Phase 3 – Permissions (page + API)

#### Step 3.1 – Role in auth context

1. **AuthContext e current org er role load kora**
   - `loadOrganizations` e `user_organizations` theke `role` (ar optional custom_role_id) o select koro.  
   - State: `currentOrgRole: 'owner' | 'manager' | 'staff' | null` (ba custom role name from roles table).  
   - Expose: `organization`, `currentOrgRole`, and maybe `isOwner`, `isManager`, `can(permission)` helper.

---

#### Step 3.2 – Sidebar / nav by role

1. **Sidebar component e**
   - `currentOrgRole` onujayi menu items show/hide:  
     - Owner: Settings, Team, Roles, Reports, Billing, etc.  
     - Manager: Menu, Orders, Kitchen, Reports (no Team/Roles, no Billing).  
     - Staff: POS, Orders, Tables – limited.  
   - Permission-based: `can('can_manage_menu')` hole Menu link, etc.

---

#### Step 3.3 – Page-level guard

1. **Protected routes**
   - E.g. `/settings` (team tab), `/admin` – owner only.  
   - E.g. `/reports` – owner + manager.  
   - Layout ba page component e: `if (!isOwner && path is /settings/team) redirect /dashboard` ba 403.  
   - Ekta reusable: `requireRole(['owner'])` ba `requirePermission('can_manage_users')` – server component e session + role check kore redirect/error.

---

#### Step 3.4 – API route guards

1. **Sensitive API routes e**
   - Session theke user_id + org (header/body theke organization_id ba current org from session).  
   - DB theke current user er role niye check: e.g. only owner can POST to invite-user, only owner can PATCH role.  
   - Return 403 jodi role na mille.

---

#### Step 3.5 – RLS (optional extra layer)

1. **Update existing RLS** (jodi needed)
   - E.g. `restaurant_settings` update – only owner (optional). Beshir bhag kichu org-scoped read/write already `user_organization_ids()` diye; extra “only owner can update” jodi chao, policy te `current_user_org_role(organization_id) = 'owner'` add koro.

---

## Checklist (quick ref)

- [ ] **Phase 1**  
  - [ ] 1.1 Signup page: request-only ba disabled; optional Supabase “Enable sign up” off  
  - [ ] 1.2 Super-admin list (table or env) + `isSuperAdmin()` helper  
  - [ ] 1.3 Admin route + API route create-tenant (org + owner user); service_role only server  
  - [ ] 1.4 Owner first login; role in AuthContext  

- [ ] **Phase 2**  
  - [ ] 2.1 `roles` table + RLS  
  - [ ] 2.2 `user_organizations.role` (and optional custom_role_id)  
  - [ ] 2.3 RLS: owner only for roles CRUD, user_organizations insert (add user)  
  - [ ] 2.4 Settings: Team tab (list users, add user, assign role) + Roles tab (CRUD roles)  

- [ ] **Phase 3**  
  - [ ] 3.1 AuthContext: currentOrgRole, isOwner, can(permission)  
  - [ ] 3.2 Sidebar: menu by role/permission  
  - [ ] 3.3 Page guards (requireRole / requirePermission)  
  - [ ] 3.4 API guards (role check on invite-user, role update, etc.)  
  - [ ] 3.5 (Optional) RLS extra: owner-only where needed  

---

Eta doc theke pore implement korte parbi step by step. Ekhon foundation (multi-tenant) ready; ei tenant-onboarding + roles = next phase.
