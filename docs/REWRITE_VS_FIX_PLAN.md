# Rewrite vs Fix – State, Backend, Multi-Tenant

তুমি যে জিনিসগুলো বলেছ (State Management, Database/RLS, API, Server-Side, Multi-Tenant) – **সব একসাথে remove করে আবার লিখলে** নতুন বাগ ঢুকবে, টেস্ট করতে গিয়ে আরও ক্লান্ত লাগবে। তাই **পুরোটা মুছে আবার লিখা** না করে, **কোনটা কোথায় আছে** আর **কোনটা শুধু ঠিক করলে হবে** সেটা স্পষ্ট করা।

---

## 1. Frontend – State Management

**এখন কি আছে:**
- `AuthContext`: user, organization, organizations, loading, signIn, signOut, switchOrganization
- Org আসে: `loadOrganizations()` → `user_organizations` query → `setOrganization()` + localStorage
- প্রতিটি পেজে: `orgId = organization?.id ?? localStorage.getItem('current_organization_id')`

**পুরো remove করে আবার লিখলে:**  
নতুন context, নতুন flow, সব পেজে আবার org inject করতে হবে। রিস্ক বেশি, সময় বেশি।

**বরং কি করবো:**  
- যা কাজ করছে (login, org in localStorage, অন্য পেজে data load) **সেটা রাখবো**।  
- শুধু যেখানে **org পেতে দেরি** হয় (যেমন dashboard এ আগে orgId null থাকত), সেখানে আমরা ইতিমধ্যে **effectiveOrgId / localStorage fallback** দিয়েছি।  
- নতুন করে **শুধু State Management পুরো rewrite করবো না**; বরং একটা জায়গায় সমস্যা থাকলে সেখানটা আলাদা ঠিক করবো।

---

## 2. Backend – Database Tables (Supabase)

**এখন কি আছে:**  
Organizations, user_organizations, floors, tables, orders, menu_items, ইত্যাদি – সব table আছে, `organization_id` column আছে।

**পুরো remove করে আবার লিখলে:**  
Table ডিলিট/ড্রপ করলে existing data চলে যাবে, migration ভেঙে যাবে। **কখনই পুরো DB layer remove করবো না।**

**বরং কি করবো:**  
- Table structure **রাখবো**।  
- শুধু কোন একটা table এ যদি **column/constraint ভুল** থাকে বা **index** দরকার হয়, সেটার জন্য একটা নতুন migration লিখবো (partial change)।  
- নতুন feature লাগলে নতুন table যোগ করবো, পুরোটা rewrite নয়।

---

## 3. Backend – Security (RLS)

**এখন কি আছে:**  
প্রতি table এ RLS, policy গুলো `organization_id` দিয়ে scope করা।

**পুরো remove করে আবার লিখলে:**  
সব policy মুছে নতুন লিখলে এক জায়গায় ভুল থাকলে data leak বা কোন table একদম বন্ধ হয়ে যেতে পারে। **পুরো RLS layer একসাথে rewrite করা রিস্কি।**

**বরং কি করবো:**  
- যা policy আছে **সব রাখবো**।  
- শুধু যেই table এ সমস্যা (যেমন: floors/tables এ request timeout বা empty আসে), **শুধু সেই table এর policy** চেক করবো – হয়তো একটা policy ভুল বা খুব স্ট্রিক্ট। সেখানটা আলাদা migration দিয়ে ঠিক করবো (partial fix)।  
- RLS পুরোটা মুছে আবার লিখবো না।

---

## 4. Backend – API Layer / Server-Side

**এখন কি আছে:**  
- জ্যামিতিক part: সরাসরি frontend থেকে Supabase client দিয়ে query (e.g. `getFloors`, `getTablesByFloor`)।  
- কিছু route: `/api/check-admin`, `/api/admin/*`, ইত্যাদি।

**পুরো remove করে আবার লিখলে:**  
সব API মুছে নতুন করে লিখলে প্রতিটি পেজে আবার integrate করতে হবে, ভুল হওয়ার সম্ভাবনা বেশি।

**বরং কি করবো:**  
- যে API/query **কাজ করছে** (menu, stock, orders, billing) সেগুলো **রাখবো**।  
- শুধু যে flow এ বাগ (যেমন dashboard এ floors/tables timeout), সেখানে হয়তো:  
  - timeout বাড়িয়েছি, অথবা  
  - env (NEXT_PUBLIC_SUPABASE_*) ঠিক আছে কিনা চেক করবো, অথবা  
  - একটা নির্দিষ্ট API/function এ logic ঠিক করবো।  
- পুরো API layer মুছে আবার লিখবো না।

---

## 5. Multi-Tenant System

**এখন কি আছে:**  
সব table এ `organization_id`, সব query তে `.eq('organization_id', orgId)`, RLS ও এটাই ব্যবহার করছে।

**পুরো remove করে আবার লিখলে:**  
Multi-tenant পুরো সরালে প্রতিটি table, প্রতিটি query, প্রতিটি পেজ – সব জায়গায় হাত দিতে হবে; ভুল হলে এক org এর data অন্য org এ চলে যেতে পারে। **পুরো multi-tenant system remove/rewrite করা উচিত না।**

**বরং কি করবো:**  
- Multi-tenant design **রাখবো**।  
- শুধু যেখানে **orgId ভুল বা দেরিতে আসছে** (যেমন আগে dashboard), সেখানে আমরা **effectiveOrgId / localStorage** দিয়ে ঠিক করেছি।  
- নতুন বাগ পেলে **শুধু সেই flow** ঠিক করবো (কোন পেজ, কোন API), পুরো system আবার লিখবো না।

---

## সিদ্ধান্ত – কি করলে ভালো

| জিনিস | পুরো/অধিকাংশ remove + আবার লিখা | বরং কি করবো |
|--------|-----------------------------------|--------------|
| State Management | না | যা কাজ করছে রাখবো, শুধু সমস্যা যেখানে সেখানে ঠিক (যেমন org timing) |
| Database Tables | না | Structure রাখবো, দরকারে একটা একটা migration (partial) |
| RLS | না | সব policy রাখবো, শুধু সমস্যা যেই table এ সেইটার policy ঠিক (partial) |
| API Layer | না | কাজ করা API রাখবো, শুধু ভাঙা একটা flow ঠিক |
| Multi-Tenant | না | design রাখবো, শুধু যেখানে orgId/org ভুল সেখানে fix |

**সংক্ষেপে:**  
বাগগুলো **এই layer গুলোর ভেতরেই লুকিয়ে** থাকতে পারে, কিন্তু সেটা **কোন একটা ছোট জায়গায়** (একটা policy, একটা state timing, একটা env)। তাই **কোন layer পুরো বা অর্ধেক remove করে আবার লিখলে** বাগ কমার বদলে নতুন বাগ ঢোকার সম্ভাবনা বেশি।  
**সবচেয়ে ভালো:** layer গুলো **রেখে**, যেই জায়গায় সমস্যা (যেমন floors timeout, বা কোন একটা পেজে org null) **শুধু সেখানটা** identify করে **ছোট ছোট fix** করা।

যদি তুমি **শুধু একটা ছোট অংশ** (যেমন “শুধু dashboard এর data loading” বা “শুধু auth + org state”) **পরিষ্কার করে আবার লিখতে** চাও, তাহলে আমরা সেই একটা অংশের জন্য আলাদা ছোট প্ল্যান করতে পারি – বাকি frontend/backend/multi-tenant intact রেখে।
