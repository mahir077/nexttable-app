'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})
  const pathname = usePathname()

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }))
  }

  const menuItems = [
    {
      id: 'dashboard',
      title: 'HOME DASHBOARD',
      icon: '🏠',
      submenu: [
        { name: 'TABLE GRID', path: '/dashboard' },
        { name: 'DINE-IN', path: '/dashboard/dine-in' },
        { name: 'TAKEAWAY', path: '/dashboard/takeaway' },
        { name: 'ONLINE', path: '/dashboard/online' },
        { name: 'EVENT', path: '/dashboard/event' },
        { name: 'RESERVATION', path: '/dashboard/reservation' }
      ]
    },
    {
      id: 'pos',
      title: 'POS ORDER SCREEN',
      icon: '🛒',
      submenu: [
        { name: 'NEW ORDER', path: '/pos' },
        { name: 'HOLD ORDERS', path: '/pos/hold' },
        { name: 'RUNNING TAB', path: '/pos/running-tab' }
      ]
    },
    {
      id: 'kot',
      title: 'KOT + TOKEN + BUZZER',
      icon: '👨‍🍳',
      submenu: [
        { name: 'KITCHEN DISPLAY', path: '/kitchen' },
        { name: 'TOKEN MANAGEMENT', path: '/kitchen/tokens' },
        { name: 'BUZZER SYSTEM', path: '/kitchen/buzzer' },
        { name: 'KOT HISTORY', path: '/kitchen/history' }
      ]
    },
    {
      id: 'billing',
      title: 'BILLING & PAYMENT',
      icon: '💳',
      submenu: [
        { name: 'BILLING CENTER', path: '/billing' },
        { name: 'CUSTOMER DUE', path: '/billing/customer-due' },
        { name: 'PAYMENT HISTORY', path: '/billing/history' },
        { name: 'VOID & REFUND', path: '/billing/void-refund' }
      ]
    },
    {
      id: 'menu',
      title: 'MENU, PRICE & VAT',
      icon: '🍴',
      submenu: [
        { name: 'ITEM SETUP', path: '/menu/items' },
        { name: 'CATEGORY SETUP', path: '/menu/categories' },
        { name: 'PRICE CONFIG', path: '/menu/pricing' },
        { name: 'MODIFIER SETUP', path: '/menu/modifiers' },
        { name: 'VAT CONFIG', path: '/menu/vat' }
      ]
    },
    {
      id: 'stock',
      title: 'STOCK MANAGEMENT',
      icon: '📦',
      submenu: [
        { name: 'STOCK VALUE', path: '/stock/value' },
        { name: 'STOCK ADJUSTMENT', path: '/stock/adjustment' },
        { name: 'LOW STOCK ALERT', path: '/stock/alerts' },
        { name: 'STOCK REPORT', path: '/stock/report' }
      ]
    },
    {
      id: 'reservation',
      title: 'RESERVATION & EVENT',
      icon: '📅',
      submenu: [
        { name: 'TABLE RESERVATION', path: '/reservation/table' },
        { name: 'EVENT BOOKING', path: '/reservation/event' },
        { name: 'ADVANCE PAYMENT', path: '/reservation/payment' }
      ]
    },
    {
      id: 'cashbook',
      title: 'DAILY CASHBOOK',
      icon: '💰',
      submenu: [
        { name: 'DAY OPEN/CLOSE', path: '/cashbook/daily' },
        { name: 'CASH IN', path: '/cashbook/cash-in' },
        { name: 'CASH OUT', path: '/cashbook/cash-out' },
        { name: 'SHIFT REPORT', path: '/cashbook/shift' }
      ]
    },
    {
      id: 'customer',
      title: 'CUSTOMER',
      icon: '👤',
      submenu: [
        { name: 'CUSTOMER LIST', path: '/customer/list' },
        { name: 'DUE LEDGER', path: '/customer/due' },
        { name: 'PAYMENT RECEIVE', path: '/customer/payment' },
        { name: 'AGING REPORT', path: '/customer/aging' }
      ]
    },
    {
      id: 'supplier',
      title: 'SUPPLIER',
      icon: '🏭',
      submenu: [
        { name: 'SUPPLIER LIST', path: '/supplier/list' },
        { name: 'PAYABLE LEDGER', path: '/supplier/payable' },
        { name: 'PAYMENT MADE', path: '/supplier/payment' },
        { name: 'PURCHASE HISTORY', path: '/supplier/purchase' }
      ]
    },
    {
      id: 'attendance',
      title: 'ATTENDANCE & SALARY',
      icon: '👥',
      submenu: [
        { name: 'DAILY ATTENDANCE', path: '/attendance/daily' },
        { name: 'SALARY CONFIG', path: '/attendance/salary-config' },
        { name: 'SALARY PAYMENT', path: '/attendance/payment' },
        { name: 'SALARY SHEET', path: '/attendance/sheet' },
        { name: 'STAFF ADVANCE', path: '/attendance/advance' }
      ]
    },
    {
      id: 'vat',
      title: 'VAT REPORT',
      icon: '🧾',
      submenu: [
        { name: 'VAT SUMMARY', path: '/vat/summary' },
        { name: 'INVOICE-WISE VAT', path: '/vat/invoice' },
        { name: 'MUSHAK FORMAT', path: '/vat/mushak' },
        { name: 'EXPORT PDF/CSV', path: '/vat/export' }
      ]
    },
    {
      id: 'sales',
      title: 'SALES & PROFIT REPORTS',
      icon: '📊',
      submenu: [
        { name: 'TODAY/MONTH SUMMARY', path: '/reports/summary' },
        { name: 'ITEM-WISE SALES', path: '/reports/item-wise' },
        { name: 'CATEGORY-WISE SALES', path: '/reports/category-wise' },
        { name: 'PAYMENT METHOD', path: '/reports/payment' },
        { name: 'DISCOUNT REPORT', path: '/reports/discount' }
      ]
    },
    {
      id: 'users',
      title: 'USER & ROLE',
      icon: '🔐',
      submenu: [
        { name: 'USER LIST', path: '/users/list' },
        { name: 'ROLE SETUP', path: '/users/roles' },
        { name: 'PERMISSIONS', path: '/users/permissions' }
      ]
    },
    {
      id: 'settings',
      title: 'SETTINGS & HARDWARE',
      icon: '⚙️',
      submenu: [
        { name: 'RESTAURANT INFO', path: '/settings' },
        { name: 'TABLE & FLOOR SETUP', path: '/settings/tables' },
        { name: 'BRANDING & LOGO', path: '/settings/branding' },
        { name: 'PRINTER CONFIG', path: '/settings/printer' },
        { name: 'CASH DRAWER', path: '/settings/cash-drawer' },
        { name: 'LANGUAGE & FORMAT', path: '/settings/language' }
      ]
    },
    {
      id: 'audit',
      title: 'AUDIT LOG',
      icon: '📜',
      submenu: [
        { name: 'VIEW LOGS', path: '/audit/logs' },
        { name: 'SEARCH & FILTER', path: '/audit/search' },
        { name: 'EXPORT LOGS', path: '/audit/export' }
      ]
    }
  ]

  return (
    <div className="w-80 bg-slate-950 text-white h-screen overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-brand font-black">
          <span className="text-white">Next</span>
          <span className="text-emerald-500">Table</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-semibold tracking-wide">
          CLOUD POS SYSTEM
        </p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => (
          <div key={item.id} className="mb-1">
            <button
              onClick={() => toggleMenu(item.id)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-semibold tracking-wide">
                  {item.title}
                </span>
              </div>
              <span className="text-slate-400">
                {expandedMenus[item.id] ? '∧' : '∨'}
              </span>
            </button>
            
            {expandedMenus[item.id] && (
              <div className="bg-slate-900/50 border-l-2 border-emerald-500">
                {item.submenu.map((subItem) => (
                  <Link
                    key={subItem.path}
                    href={subItem.path}
                    className={`block px-6 py-2.5 pl-14 text-sm hover:bg-slate-800 transition-colors ${
                      pathname === subItem.path
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'text-slate-300'
                    }`}
                  >
                    {subItem.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}
