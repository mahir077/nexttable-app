'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getFloors, getTablesByFloor, Floor, Table } from '@/app/lib/api/tables'
import { getCategories, getMenuItemsByCategory, type CartItem, type Category, type MenuItem } from '@/app/lib/api/menu'

const ORDER_TYPES = [
  { id: 'dine-in', label: 'Dine-in', emoji: '🍽️', color: 'emerald', border: 'border-emerald-400', bg: 'bg-emerald-50' },
  { id: 'takeaway', label: 'Takeaway', emoji: '🥡', color: 'amber', border: 'border-amber-400', bg: 'bg-amber-50' },
  { id: 'online', label: 'Online', emoji: '🛵', color: 'sky', border: 'border-sky-400', bg: 'bg-sky-50' },
  { id: 'event', label: 'Event', emoji: '🎉', color: 'violet', border: 'border-violet-400', bg: 'bg-violet-50' },
] as const

type OrderTypeId = typeof ORDER_TYPES[number]['id']

export default function POSPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const typeFromUrl = (searchParams.get('type') as OrderTypeId) || 'dine-in'

  const [orderType, setOrderType] = useState<OrderTypeId>(typeFromUrl)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [eventDate, setEventDate] = useState('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [floors, setFloors] = useState<Floor[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [showTableModal, setShowTableModal] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)

  // Sync URL -> state
  useEffect(() => {
    const t = (searchParams.get('type') as OrderTypeId) || 'dine-in'
    if (ORDER_TYPES.some(o => o.id === t)) setOrderType(t)
  }, [searchParams])

  // Update URL when order type changes (so dashboard links and switcher stay in sync)
  const handleOrderTypeChange = useCallback((type: OrderTypeId) => {
    setOrderType(type)
    router.replace(`/pos?type=${type}`, { scroll: false })
  }, [router])

  // Categories
  useEffect(() => {
    let cancelled = false
    setLoadingCategories(true)
    getCategories().then(data => {
      if (!cancelled) {
        setCategories(data)
        if (data.length > 0 && !selectedCategory) setSelectedCategory(data[0])
      }
      setLoadingCategories(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (selectedCategory) setSelectedCategory(categories.find(c => c.id === selectedCategory.id) || categories[0] || null)
  }, [categories])

  // Menu items by category
  useEffect(() => {
    if (!selectedCategory) {
      setMenuItems([])
      return
    }
    setLoadingItems(true)
    getMenuItemsByCategory(selectedCategory.id).then(data => {
      setMenuItems(data)
      setLoadingItems(false)
    })
  }, [selectedCategory])

  // Floors & tables for dine-in
  useEffect(() => {
    getFloors().then(setFloors)
  }, [])
  useEffect(() => {
    if (!selectedFloor) return
    getTablesByFloor(selectedFloor.id).then(setTables)
  }, [selectedFloor])
  useEffect(() => {
    if (floors.length > 0 && !selectedFloor) setSelectedFloor(floors[0])
  }, [floors, selectedFloor])

  const addToCart = (item: MenuItem, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i)
      }
      return [...prev, { ...item, quantity: qty }]
    })
  }

  const updateCartQty = (itemId: string, delta: number) => {
    setCart(prev => {
      const next = prev.map(i => i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
      return next.filter(i => i.quantity > 0)
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId))
  }

  const validateAndSendKOT = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Add items first.')
      return
    }

    if (orderType === 'dine-in') {
      if (!selectedTable) {
        alert('Please select a table.')
        return
      }
    }

    if (orderType === 'takeaway') {
      if (!customerName.trim()) {
        alert('Customer name is required.')
        return
      }
    }

    if (orderType === 'online') {
      if (!customerName.trim()) {
        alert('Customer name is required.')
        return
      }
      if (!customerPhone.trim()) {
        alert('Phone number is required for online orders.')
        return
      }
      if (!deliveryAddress.trim()) {
        alert('Delivery address is required.')
        return
      }
    }

    if (orderType === 'event') {
      if (!eventDate) {
        alert('Event date is required.')
        return
      }
      if (!guestCount.trim() || parseInt(guestCount, 10) < 1) {
        alert('Please enter number of guests.')
        return
      }
      if (!customerName.trim()) {
        alert('Contact person name is required.')
        return
      }
      if (!customerPhone.trim()) {
        alert('Phone number is required.')
        return
      }
    }

    handleSendKOT()
  }

  const handleSendKOT = async () => {
    try {
      const orderNumber = `ORD-${Date.now()}`
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const tax = 0
      const total = subtotal + tax

      const insertPayload: Record<string, unknown> = {
        order_number: orderNumber,
        order_type: orderType,
        table_id: orderType === 'dine-in' ? selectedTable : null,
        subtotal,
        tax,
        discount: 0,
        total,
        status: 'pending',
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        delivery_address: orderType === 'online' ? (deliveryAddress.trim() || null) : null,
        delivery_time: orderType === 'online' && deliveryTime ? deliveryTime : null,
        guest_count: orderType === 'event' && guestCount ? parseInt(guestCount, 10) : null,
        event_date: orderType === 'event' && eventDate ? eventDate : null,
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(insertPayload)
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_name: item.name,
        item_name_bangla: item.name_bangla ?? null,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        status: 'pending',
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      alert(`✅ KOT sent! Order: ${orderNumber}`)
      setCart([])
      setSelectedTable(null)
      setCustomerName('')
      setCustomerPhone('')
      setDeliveryAddress('')
      setDeliveryTime('')
      setGuestCount('')
      setEventDate('')
    } catch (err) {
      console.error(err)
      alert('Failed to create order')
    }
  }

  const currentTypeMeta = ORDER_TYPES.find(o => o.id === orderType) || ORDER_TYPES[0]
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Categories */}
      <div className="w-48 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
        <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</h2>
        </div>
        {loadingCategories ? (
          <div className="p-4 text-slate-400 text-sm">Loading...</div>
        ) : (
          <ul className="p-2 space-y-0.5">
            {categories.map(cat => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    selectedCategory?.id === cat.id ? 'bg-emerald-500 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Main: order type + form + items */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 flex-wrap">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 text-sm font-medium">← Dashboard</Link>
          <span className="text-slate-300">|</span>
          <span className={`text-lg font-black font-brand text-slate-900 ${currentTypeMeta.bg} px-3 py-1 rounded-lg border-2 ${currentTypeMeta.border}`}>
            {currentTypeMeta.emoji} {currentTypeMeta.label.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Order type selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {ORDER_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleOrderTypeChange(t.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                  orderType === t.id
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : `bg-white text-slate-700 border-slate-200 hover:border-slate-300 ${t.bg}`
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Dine-in: table selection */}
          {orderType === 'dine-in' && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowTableModal(true)}
                className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
              >
                {selectedTable
                  ? `Table ${tables.find(t => t.id === selectedTable)?.table_number ?? '?'}`
                  : 'Select Table *'}
              </button>
            </div>
          )}

          {/* Takeaway */}
          {orderType === 'takeaway' && (
            <div className="mb-4 bg-white p-4 rounded-xl border-2 border-slate-200 space-y-3 max-w-md">
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer Name *"
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {/* Online */}
          {orderType === 'online' && (
            <div className="mb-4 bg-white p-4 rounded-xl border-2 border-slate-200 space-y-3 max-w-md">
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer Name *"
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Phone Number *"
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <textarea
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Delivery Address *"
                rows={3}
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none resize-none"
              />
              <input
                type="time"
                value={deliveryTime}
                onChange={e => setDeliveryTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {/* Event */}
          {orderType === 'event' && (
            <div className="mb-4 bg-white p-4 rounded-xl border-2 border-slate-200 space-y-3 max-w-md">
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="number"
                min={1}
                value={guestCount}
                onChange={e => setGuestCount(e.target.value)}
                placeholder="Number of Guests *"
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Contact Person Name *"
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Phone Number *"
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {/* Items grid */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">{selectedCategory?.name ?? 'Select category'}</h3>
            {loadingItems ? (
              <div className="text-slate-400 text-sm">Loading items...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addToCart(item)}
                    className="bg-white border-2 border-slate-200 rounded-xl p-3 text-left hover:border-emerald-400 hover:bg-emerald-50/50 transition-all active:scale-[0.98]"
                  >
                    <div className="font-bold text-slate-900 text-sm truncate">{item.name}</div>
                    {item.name_bangla && <div className="text-xs text-slate-500 truncate">{item.name_bangla}</div>}
                    <div className="mt-1 font-bold text-emerald-600">৳{item.price}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart */}
      <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-100 font-bold text-slate-800">Cart ({cart.length})</div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <p className="text-slate-400 text-sm">Cart is empty</p>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{item.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-6 h-6 rounded bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-6 h-6 rounded bg-emerald-500 text-white font-bold text-sm flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 text-xs font-semibold ml-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-right font-bold text-slate-800">৳{item.price * item.quantity}</div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-slate-200">
          <div className="flex justify-between text-lg font-black text-slate-900 mb-3">
            <span>Total</span>
            <span>৳{cartTotal}</span>
          </div>
          <button
            type="button"
            onClick={validateAndSendKOT}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
          >
            Send KOT
          </button>
        </div>
      </div>

      {/* Table picker modal (dine-in) */}
      {showTableModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowTableModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Select Table</h2>
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-2 border-b border-slate-100 flex gap-2 overflow-x-auto">
              {floors.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFloor(f)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm ${
                    selectedFloor?.id === f.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-4 gap-2">
                {tables.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTable(t.id)
                      setShowTableModal(false)
                    }}
                    className={`py-4 rounded-xl font-bold text-slate-900 border-2 transition-all ${
                      selectedTable === t.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    {t.table_number}
                    <div className="text-xs font-normal opacity-80">{t.seats} seats</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
