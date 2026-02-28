'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, organization, organizations, switchOrganization, signOut } = useAuth()
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false)
  const [savedRestaurantName, setSavedRestaurantName] = useState('')

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('restaurantInfo') : null
      if (raw) {
        const info = JSON.parse(raw) as { name?: string }
        if (info.name && typeof info.name === 'string') setSavedRestaurantName(info.name)
      }
    } catch { /* ignore */ }
  }, [organization?.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) setIsCollapsed(saved === 'true')
  }, [])

  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    if (typeof window !== 'undefined') localStorage.setItem('sidebarCollapsed', String(newState))
  }

  const menuItems = [
    {
      name: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      href: '/dashboard',
      active: pathname === '/dashboard'
    },
    {
      name: 'POS',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      href: '/pos',
      active: pathname === '/pos'
    },
    {
      name: 'Kitchen',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      href: '/kitchen',
      active: pathname === '/kitchen'
    },
    {
      name: 'Billing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      href: '/billing',
      active: pathname === '/billing'
    },
    {
      name: 'Orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: '/orders',
      active: pathname === '/orders'
    },
    {
      name: 'Reservations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      href: '/reservations',
      active: pathname === '/reservations'
    },
    {
      name: 'Menu',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      href: '/menu',
      active: pathname === '/menu' || pathname.startsWith('/menu/')
    },
    {
      name: 'Stock',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      href: '/stock',
      active: pathname === '/stock'
    },
    {
      name: 'Suppliers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      href: '/suppliers',
      active: pathname === '/suppliers'
    },
    {
      name: 'Purchases',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      href: '/purchases',
      active: pathname === '/purchases'
    },
    {
      name: 'Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      href: '/reports',
      active: pathname === '/reports'
    },
    {
      name: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      href: '/settings',
      active: pathname === '/settings' || pathname.startsWith('/settings/')
    }
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {onClose && (
        <div
          className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed lg:relative top-0 left-0 z-50 bg-slate-950 text-white h-screen overflow-y-auto flex flex-col transition-all duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Header */}
        <div className={`border-b border-slate-800 flex items-center justify-between ${isCollapsed ? 'p-3 justify-center' : 'p-6'}`}>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-xl font-brand font-black truncate text-white" title={organization?.display_name || organization?.name || savedRestaurantName || 'Restaurant'}>
                {organization?.display_name || organization?.name || savedRestaurantName || 'Restaurant'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-semibold tracking-wide">
                NextTable POS
              </p>
            </div>
          )}
          {isCollapsed && (
            <div className="text-lg font-black text-emerald-500 truncate max-w-[3rem]" title={organization?.display_name || organization?.name || savedRestaurantName || 'Restaurant'}>
              {(organization?.display_name || organization?.name || savedRestaurantName || 'R').slice(0, 2)}
            </div>
          )}
          <div className="flex items-center gap-1">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:flex p-2 rounded-lg hover:bg-slate-800 text-slate-400"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`w-full flex items-center gap-3 px-6 py-3 hover:bg-slate-900 transition-colors ${
                item.active ? 'bg-emerald-500/20 text-emerald-400 border-l-4 border-emerald-500' : 'text-slate-300 border-l-4 border-transparent'
              } ${isCollapsed ? 'justify-center px-3' : ''}`}
            >
              <span className="flex-shrink-0 [&_svg]:text-current">
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="text-sm font-semibold tracking-wide">{item.name}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Org switcher + Logout - bottom */}
        <div className="border-t border-slate-800 p-3">
          {user && (
            <>
              {!isCollapsed && organizations.length > 1 && (
                <div className="mb-2 relative">
                  <button
                    type="button"
                    onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-emerald-400 bg-slate-800/50 rounded-lg truncate hover:bg-slate-800"
                    title="Switch restaurant"
                  >
                    🏢 {organization?.display_name || organization?.name || savedRestaurantName || 'Restaurant'}
                  </button>
                  {showOrgSwitcher && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 py-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                      {organizations.map(org => (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            switchOrganization(org.id)
                            setShowOrgSwitcher(false)
                          }}
                          className={`w-full px-3 py-2 text-left text-xs font-medium ${
                            organization?.id === org.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {org.display_name || org.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!isCollapsed && organizations.length <= 1 && organization && (
                <div className="px-3 py-2 mb-2 text-xs text-slate-400 truncate" title={organization?.display_name || organization?.name || savedRestaurantName || 'Restaurant'}>
                  🏢 {organization?.display_name || organization?.name || savedRestaurantName || 'Restaurant'}
                </div>
              )}
              {!isCollapsed && (
                <div className="px-3 py-2 mb-2 text-xs text-slate-500 truncate" title={user.email}>
                  {user.email}
                </div>
              )}
              <button
                type="button"
                onClick={async () => {
                  await signOut()
                }}
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-semibold ${isCollapsed ? 'px-3' : ''}`}
                title="Sign out"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {!isCollapsed && <span>Logout</span>}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
