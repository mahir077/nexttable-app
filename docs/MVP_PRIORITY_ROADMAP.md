# 🚀 NextTable MVP - TOP 10 PRIORITY TASKS TO REACH 100%

## Executive Summary
**Current:** 68% (90/133 features)  
**Target:** 100% (133/133 features)  
**Total Time Remaining:** ~3-4 weeks (140-160 hours)  
**Priority Tier:** Critical → High → Medium → Low

---

## ⚡ TOP 10 PRIORITY TASKS

### 🔴 CRITICAL (Do First) - 7 days

#### 1. **Inventory Auto-Deduct on Order Completion**
**Impact:** 3 features unlocked (Stock OUT, Profit calc, Ledger accuracy)  
**Status:** ❌ MISSING  
**Why Critical:** Without this, entire inventory system is broken. Revenue tracked but costs not deducted = fake profit numbers.

**What's Needed:**
- [ ] Trigger/function in PostgreSQL: On order completion, iterate order_items
- [ ] For each item: deduct (quantity × making_cost) from stock_summary
- [ ] Create stock_movements record (type='OUT', reason='Order#123')
- [ ] Ensure proper org_id filtering in trigger

**Files to Modify:**
- [src/app/lib/db/orders.ts](src/app/lib/db/orders.ts) - completeOrder() function
- [migrations/004_inventory.sql](migrations/004_inventory.sql) - add trigger or function
- [src/app/lib/db/stock.ts](src/app/lib/db/stock.ts) - call deduct function

**Estimated Time:** 8-12 hours
**Effort:** Medium (PostgreSQL triggers)
**Dependencies:** Understanding of stock_movements table structure, order_items joins

---

#### 2. **Reports Module - Complete All 7 Features**
**Impact:** 6 features unlocked (Weekly, Monthly, Item-wise, Payment breakdown, Tax, Profit/loss)  
**Status:** ⚠️ PARTIAL (1/7 only)  
**Why Critical:** Needed for financial reporting & decision-making. Admin dashboard incomplete without these.

**What's Needed:**
- [ ] Weekly/Monthly report grouping logic (GROUP BY DATE_TRUNC)
- [ ] Item-wise sales breakdown (sum quantity, revenue per menu_item)
- [ ] Payment method breakdown (sum by payment_method from invoices)
- [ ] Tax report (sum SGST, CGST by date range)
- [ ] Profit/loss summary (Revenue - Stock OUT costs)
- [ ] UI components for each report type

**Files to Modify:**
- [src/app/reports/page.tsx](src/app/reports/page.tsx) - rebuild entire page
- New files: [src/app/lib/api/reports.ts](src/app/lib/api/reports.ts) - query builders
- [migrations/](migrations/) - optional: add reporting views for performance

**Estimated Time:** 16-20 hours
**Effort:** High (complex SQL grouping + charting)
**Dependencies:** Chart library (recharts), SQL aggregation knowledge

---

#### 3. **White-Label System - Finish or Remove**
**Impact:** 8 features (Logo, colors, branding, invoice/KOT customization)  
**Status:** ⚠️ PARTIAL (2/10 only)  
**Decision Needed:** Are we keeping this for MVP?

**Option A: IMPLEMENT (12-16 hours)**
- [ ] CSS variable injection from primary_color (Tailwind config dynamic)
- [ ] Logo rendering on Dashboard header, Invoice PDF, KOT print
- [ ] Secondary color support (if needed)
- [ ] Powered-by toggle logic
- File: [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) - add logo header
- File: [src/app/billing/page.tsx](src/app/billing/page.tsx) - add logo to invoice PDF
- File: [src/app/kitchen/page.tsx](src/app/kitchen/page.tsx) - add logo to KOT template
- File: [src/app/lib/hooks/useTheme.ts](src/app/lib/hooks/useTheme.ts) - new CSS injection hook

**Option B: REMOVE (0.5 hours)**
- [ ] Delete white-label fields from [migrations/002_restaurant.sql](migrations/002_restaurant.sql)
- [ ] Remove from [/settings](src/app/settings/page.tsx) UI

**Estimated Time:** 12-16 hours (implement) OR 0.5 hours (remove)
**Effort:** Medium (CSS injection tricky)
**Recommendation:** REMOVE for now - can be Phase 2. Too much overhead for MVP.

---

### 🟠 HIGH (Do Next) - 2 weeks

#### 4. **Payment Methods Configuration Page**
**Impact:** 1 feature unlocked  
**Status:** ❌ MISSING  
**Why Important:** Settings page incomplete. Billing page hardcoded payment methods.

**What's Needed:**
- [ ] New section in [/settings](src/app/settings/page.tsx): "Payment Methods"
- [ ] Enable/disable checkboxes for: Cash, Card, UPI, Check, Others
- [ ] Store selection in restaurant_settings.payment_methods (JSON array)
- [ ] Update [billing/page.tsx](src/app/billing/page.tsx) dropdown to use config

**Files to Modify:**
- [src/app/settings/page.tsx](src/app/settings/page.tsx) - add Payment Methods section
- [src/app/billing/page.tsx](src/app/billing/page.tsx) L240 - use payment_methods config instead of hardcoded

**Estimated Time:** 4-6 hours
**Effort:** Low (straightforward CRUD)

---

#### 5. **POS Item Notes/Customization UI**
**Impact:** 1 feature unlocked  
**Status:** ❌ MISSING  
**Why Important:** Core POS workflow incomplete. Users need to add notes (e.g., "no onions").

**What's Needed:**
- [ ] Modal/drawer for item customization when adding to cart
- [ ] Text field for special notes (max 200 chars)
- [ ] Store in order_items.special_notes during order creation
- [ ] Display notes in Kitchen order card

**Files to Modify:**
- [src/app/pos/page.tsx](src/app/pos/page.tsx) - add item notes modal (L270)
- [src/app/kitchen/page.tsx](src/app/kitchen/page.tsx) - display notes in order card

**Estimated Time:** 6-8 hours
**Effort:** Low-Medium (modal + form handling)

---

#### 6. **Kitchen Item Reject Functionality**
**Impact:** 1 feature unlocked  
**Status:** ⚠️ PARTIAL (button exists, logic disabled)  
**Why Important:** Kitchen staff needs to reject items (e.g., "out of stock").

**What's Needed:**
- [ ] Implement reject logic: Update order_item.status = 'rejected'
- [ ] Add rejection reason modal (optional text field)
- [ ] Create corresponding stock_movements entry (type='REJECT_REVERSAL') to undo cost deduction
- [ ] Notify POS that item was rejected (toast message)

**Files to Modify:**
- [src/app/kitchen/page.tsx](src/app/kitchen/page.tsx) L140 - enable reject button
- [src/app/lib/db/orders.ts](src/app/lib/db/orders.ts) - add rejectOrderItem() function
- [src/app/lib/db/stock.ts](src/app/lib/db/stock.ts) - add reversal for rejected items

**Estimated Time:** 6-10 hours
**Effort:** Medium (state management across apps)

---

#### 7. **Kitchen Direct Navigation from POS**
**Impact:** 1 feature unlocked  
**Status:** ❌ MISSING  
**Why Important:** UI flow improvement. Staff shouldn't need dashboard detour.

**What's Needed:**
- [ ] Add floating "Kitchen" button in [POS page](src/app/pos/page.tsx) sidebar header
- [ ] Click → navigate to /kitchen

**Files to Modify:**
- [src/app/pos/page.tsx](src/app/pos/page.tsx) L30-50 - add navigation button

**Estimated Time:** 1-2 hours
**Effort:** Trivial

---

#### 8. **i18n Language Selection Wiring**
**Impact:** 1 feature unlocked  
**Status:** ⚠️ PARTIAL (field exists, not wired)  
**Why Important:** Settings page language selection non-functional.

**What's Needed:**
- [ ] Set up i18n library (next-intl recommended, or simple localStorage approach)
- [ ] Create translation JSON files (EN, কালচারাল languages if needed)
- [ ] Wire language selector in [/settings](src/app/settings/page.tsx) to change app language
- [ ] Store preference in localStorage or user_settings table

**Files to Modify:**
- [src/middleware.ts](src/middleware.ts) - add language detection/routing
- [src/app/settings/page.tsx](src/app/settings/page.tsx) - wire language selector
- New: [src/i18n/translations.json](src/i18n/translations.json)

**Estimated Time:** 8-12 hours
**Effort:** Medium (i18n setup complexity)
**Note:** Skip if MVP doesn't need multi-language. Remove from scope instead.

---

### 🟡 MEDIUM (Phase 2) - Future work

#### 9. **Stock Valuation & Cost Breakdown Reports**
**Impact:** 2 features unlocked  
**Status:** ⚠️ PARTIAL (data exists, UI incomplete)  
**Depends On:** #1 (Auto-deduct) must work first

**What's Needed:**
- [ ] Group stock by item: quantity × making_cost = item_total
- [ ] Chart: Pie/Bar showing stock value by category
- [ ] Table: Item, Qty, Cost/Unit, Total Value
- [ ] Year-to-date stock movement trends

**Files to Modify:**
- [src/app/stock/page.tsx](src/app/stock/page.tsx) - add reports section
- [src/app/lib/api/reports.ts](src/app/lib/api/reports.ts) - add stock valuation query

**Estimated Time:** 10-12 hours
**Effort:** Medium-High (charting + SQL aggregation)

---

#### 10. **Payment Confirmation Dialog (Replacement for confirm())**
**Impact:** 1 feature (improved UX)  
**Status:** ⚠️ PARTIAL (uses browser confirm())  
**Why Important:** Professional UX. Browser confirm() looks unprofessional.

**What's Needed:**
- [ ] Create ConfirmDialog component
- [ ] Replace browser confirm() in [billing/page.tsx](src/app/billing/page.tsx) L310 with custom dialog
- [ ] Show order summary before confirming payment

**Files to Modify:**
- New: [src/components/ConfirmDialog.tsx](src/components/ConfirmDialog.tsx)
- [src/app/billing/page.tsx](src/app/billing/page.tsx) L310

**Estimated Time:** 3-4 hours
**Effort:** Low (component creation)

---

## 📊 EFFORT & TIME BREAKDOWN

| Task | Priority | Hours | Days | Effort | Blocker |
|------|----------|-------|------|--------|---------|
| 1. Auto-deduct | 🔴 CRITICAL | 8-12 | 1-2 | Medium | Inventory broken without |
| 2. Reports | 🔴 CRITICAL | 16-20 | 2-3 | High | Admin dashboard incomplete |
| 3. White-label | 🔴 CRITICAL | 12-16 (or 0.5) | 2-3 (or 0) | Medium | Decision needed |
| 4. Payment methods config | 🟠 HIGH | 4-6 | 1 | Low | Settings incomplete |
| 5. POS item notes | 🟠 HIGH | 6-8 | 1 | Low-Med | Core workflow gap |
| 6. Kitchen reject | 🟠 HIGH | 6-10 | 1-2 | Medium | Depends on #1 |
| 7. Kitchen nav | 🟠 HIGH | 1-2 | 0.5 | Trivial | UX improvement |
| 8. i18n wiring | 🟠 HIGH | 8-12 | 1-2 | Medium | Optional for MVP |
| 9. Stock reports | 🟡 MEDIUM | 10-12 | 2 | Med-High | Depends on #1 |
| 10. Confirm dialog | 🟡 MEDIUM | 3-4 | 0.5 | Low | UX polish |
| **TOTAL** | | **74-112** | **11-16** | | |

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### **Week 1: Foundation (Fix Broken Systems)**
1. ✅ **Auto-deduct** (8-12h) - CRITICAL. Inventory is broken without this.
2. ✅ **Reports** (16-20h) - CRITICAL. Admin needs financial visibility.
3. 🚀 **Decision: White-label** 
   - IF keeping: Start implementation (12-16h)
   - IF removing: Delete from schema (0.5h)

**Week 1 Total:** 24-32 hours lab work (achievable in 3-4 days full-time)

---

### **Week 2: Complete Core Features**
4. ✅ **Payment methods** (4-6h) - HIGH. Settings page needs this.
5. ✅ **POS item notes** (6-8h) - HIGH. Core POS workflow.
6. ✅ **Kitchen reject** (6-10h) - HIGH. Kitchen staff needs this.
7. ✅ **Kitchen nav button** (1-2h) - HIGH. Quick UX win.

**Week 2 Total:** 17-26 hours (achievable in 2-3 days)

---

### **Week 3: Polish & Reports**
8. ⚠️ **i18n wiring** (8-12h) - Only if MVP requires multi-language
9. ✅ **Stock valuation reports** (10-12h) - Depends on #1 working
10. ✅ **Confirm dialog** (3-4h) - UX polish

**Week 3 Total:** 21-28 hours (achievable in 3 days)

---

## 📈 REALISTIC TIMELINE TO 100%

**Assumption:** 1 developer, 8 hours/day, no interruptions

| Scenario | Days | Completion Date |
|----------|------|-----------------|
| Full-time focus on ALL tasks | 14-20 | April 9-15, 2026 |
| Part-time (4h/day) | 28-40 | April 23-May 5, 2026 |
| Conservative (with testing) | 18-25 | April 13-20, 2026 |

---

## 🎊 POST-MVP ENHANCEMENTS (Phase 2-3)

Once you hit 100%, these are nice-to-haves:

1. **Pagination** - Currently capped at 100 results, need "Load More" for large restaurants
2. **Advanced Analytics** - Profit trends, staff performance reports
3. **Customer Loyalty** - Track repeat customers, discount programs
4. **Online Ordering** - Customer-facing menu + delivery integration
5. **WhatsApp Integration** - Order notifications to customers
6. **Kitchen printer** - Direct thermal printer support
7. **Inventory Forecasting** - Auto-reorder suggestions based on sales trends
8. **Staff App** - Separate mobile app for staff (waiters, delivery)

---

## ✅ SUCCESS CRITERIA FOR 100%

```
□ All 133 features implemented OR marked as "intentionally removed"
□ Auto-deduct produces ACCURATE inventory tracking
□ Reports show CORRECT financial data
□ Zero data leakage between organizations
□ All pages load < 2 seconds
□ Mobile views fully responsive
□ No console errors in production build
□ Admin can manage all clients from super admin dashboard
□ Staff can complete full workflow: POS → Kitchen → Billing → Done
```

---

**TL;DR:** Do Critical tasks (#1-2), decide on White-label (#3), then High-priority (#4-7). 
Everything else is polish. **Realistic date to ship: 2-3 weeks.**

