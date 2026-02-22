# Inventory System – Status & Flow

## আপনার ধারণা (যেমন)
- **Bazaar:** ৫০০০ টাকার বাজার (গরু, মুরগি, মশালা ইত্যাদি) → স্টকে +৫০০০ ৳
- **আইটেম:** প্রতিটি মেনু আইটেমের **making cost** (যেমন Chicken Polao = ১৫০ ৳) ও **selling price** (৩৫০ ৳)
- **সেল:** ১টা Chicken Polao সেল হলে স্টক থেকে **making cost** বাদ (১৫০ ৳), প্রফিট = ৩৫০ − ১৫০ = ২০০ ৳

## বর্তমান কোডবেসে যা আছে

| # | Feature | Status | কোথায় |
|---|--------|--------|--------|
| 1 | Making cost per item | ✅ | Menu পেজে আছে; Stock/Billing use করে |
| 2 | Purchase entry form | ✅ | `/purchases` – আইটেম ধরে এন্ট্রি |
| 3 | Purchase history list | ✅ | `/purchases` নিচে লিস্ট |
| 4 | Supplier management | ✅ | `/suppliers` |
| 5 | Opening stock (per item) | ✅ | Stock পেজ – Opening modal |
| 6 | Stock IN (purchase) | ✅ | Purchase সেভ করলে `stock_movements` IN |
| 7 | Stock OUT on sale | ✅ | Billing payment complete এ making_cost দিয়ে deduction |
| 8 | Current stock value (item-wise) | ✅ | `/stock` – stock_summary |
| 9 | Stock ledger | ✅ | `/stock/ledger` |
| 10–13 | Reports (summary, cost, purchase vs sales, valuation) | ⚠️ আংশিক | Reports পেজে কিছু আছে; profit/stock value যোগ করা হবে |
| 14 | Auto-deduct on order complete | ✅ | Billing এ payment complete এ |
| 15 | Profit (Revenue − Cost) | ⚠️ | Reports এ যোগ করা হবে |

## যা যোগ করা হয়েছে
1. **Purchase – বাজার / Raw material:** Purchase পেজে "বাজার / Raw material (Amount only)" মোড – শুধু অ্যামাউন্ট (৳) + তারিখ + নোট দিয়ে স্টক IN। স্টক লেজারে "বাজার / Raw material" হিসেবে দেখাবে।
2. **Reports – Profit & Loss:** Total Revenue − Cost (making cost of sold items) = Gross Profit। Reports → Profit & Loss ট্যাবে।
3. **Reports – Current Stock Value:** একই ট্যাবে "Current Stock Value" – মোট স্টক IN − OUT (সব সময়)।

**ডাটাবেস:** Raw material এন্ট্রির জন্য `stock_movements.menu_item_id` নাল হতে হবে। Supabase SQL এ একবার রান করুন: `docs/supabase-migrations/008_stock_movements_nullable_menu_item.sql`
