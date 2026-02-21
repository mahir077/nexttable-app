'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getFloors, getTablesByFloor, Floor, Table } from '@/app/lib/api/tables'
import { getCategories, getMenuItemsByCategory, type CartItem, type Category, type MenuItem } from '@/app/lib/api/menu'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'

const ORDER_TYPES = [
  { id: 'dine-in', label: 'Dine-in', emoji: '🍽️', color: 'emerald', border: 'border-emerald-400', bg: 'bg-emerald-50' },
  { id: 'takeaway', label: 'Takeaway', emoji: '🥡', color: 'amber', border: 'border-amber-400', bg: 'bg-amber-50' },
  { id: 'online', label: 'Online', emoji: '🛵', color: 'sky', border: 'border-sky-400', bg: 'bg-sky-50' },
  { id: 'event', label: 'Event', emoji: '🎉', color: 'violet', border: 'border-violet-400', bg: 'bg-violet-50' },
] as const

type OrderTypeId = typeof ORDER_TYPES[number]['id']

function POSContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { organization, organizations } = useAuth()
  const typeFromUrl = (searchParams?.get('type') as OrderTypeId) || 'dine-in'

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
  const [cartOpen, setCartOpen] = useState(false)
  const [kotSuccess, setKotSuccess] = useState<{ orderNumber: string; total: number } | null>(null)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [isPrintingKOT, setIsPrintingKOT] = useState(false)

  const { toast, showToast, hideToast } = useToast()

  // Sync URL -> state
  useEffect(() => {
    const t = (searchParams?.get('type') as OrderTypeId) || 'dine-in'
    if (ORDER_TYPES.some(o => o.id === t)) setOrderType(t)
  }, [searchParams])

  // Update URL when order type changes (so dashboard links and switcher stay in sync)
  const handleOrderTypeChange = useCallback((type: OrderTypeId) => {
    setOrderType(type)
    router.replace(`/pos?type=${type}`, { scroll: false })
  }, [router])

  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null) ?? organizations?.[0]?.id ?? null

  // Categories (current org only – avoids duplicates from multiple orgs)
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    setLoadingCategories(true)
    getCategories(orgId).then(data => {
      if (!cancelled) {
        const unique = data.filter((cat, i, arr) => arr.findIndex(c => c.id === cat.id) === i)
        setCategories(unique)
        if (unique.length > 0 && !selectedCategory) setSelectedCategory(unique[0])
      }
      setLoadingCategories(false)
    })
    return () => { cancelled = true }
  }, [orgId])

  useEffect(() => {
    if (selectedCategory) setSelectedCategory(categories.find(c => c.id === selectedCategory.id) || categories[0] || null)
  }, [categories])

  // Menu items by category
  useEffect(() => {
    if (!orgId || !selectedCategory) {
      setMenuItems([])
      if (!selectedCategory) setLoadingItems(false)
      return
    }
    setLoadingItems(true)
    getMenuItemsByCategory(selectedCategory.id, orgId).then(data => {
      setMenuItems(data)
      setLoadingItems(false)
    })
  }, [orgId, selectedCategory])

  // Floors & tables for dine-in (current org only)
  useEffect(() => {
    if (!orgId) return
    getFloors(orgId).then(setFloors)
  }, [orgId])
  useEffect(() => {
    if (!orgId || !selectedFloor) return
    getTablesByFloor(selectedFloor.id, orgId).then(setTables)
  }, [orgId, selectedFloor])
  useEffect(() => {
    if (floors.length > 0 && !selectedFloor) setSelectedFloor(floors[0])
  }, [floors, selectedFloor])

  // Preselect floor & table from URL (e.g. from dashboard table click)
  const urlTableId = searchParams?.get('tableId')
  const urlFloorId = searchParams?.get('floorId')
  useEffect(() => {
    if (orderType !== 'dine-in' || !urlFloorId || !urlTableId || floors.length === 0) return
    const floor = floors.find(f => f.id === urlFloorId)
    if (floor) setSelectedFloor(floor)
  }, [orderType, urlFloorId, urlTableId, floors])
  useEffect(() => {
    if (orderType !== 'dine-in' || !urlTableId || tables.length === 0) return
    const table = tables.find(t => t.id === urlTableId)
    if (table) setSelectedTable(urlTableId)
  }, [orderType, urlTableId, tables])

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

  const printKOT = (order: { order_number: string; total: number }, cartItems: CartItem[], tableLabel: string) => {
    if (isPrintingKOT) return

    setIsPrintingKOT(true)

    const orderData = {
      order_number: order.order_number,
      total: order.total,
      order_type: orderType,
      customer_name: customerName.trim() || '',
      // For dine-in we expect \"Table X\" in tableLabel, otherwise leave blank
      table_number: orderType === 'dine-in' ? tableLabel.replace(/^Table\\s*/i, '') : '',
      buzzer_number: null as number | null,
      items: cartItems.map(item => ({
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        notes: item.notes
      }))
    }

    try {
      const printWindow = window.open('', '', 'width=300,height=600')

      if (!printWindow) {
        showToast('Please allow popups to print KOT', 'error')
        setIsPrintingKOT(false)
        return
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>KOT - ${orderData.order_number}</title>
          <style>
            @media print {
              @page { 
                margin: 0; 
                size: 80mm auto;
              }

              body {
                margin: 0;
                padding: 0;
              }
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              padding: 5mm;
              font-size: 11px;
              color: #000;
              background: #fff;
            }
            
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            
            .header h2 {
              margin: 5px 0;
              font-size: 18px;
              font-weight: bold;
            }
            
            .header h3 {
              margin: 5px 0;
              font-size: 16px;
            }
            
            .info {
              margin: 10px 0;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            
            .info-label {
              font-weight: bold;
            }
            
            .divider {
              border-bottom: 1px dashed #000;
              margin: 10px 0;
            }
            
            .items {
              margin: 10px 0;
            }
            
            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
            }
            
            .item-name {
              flex: 1;
              font-weight: bold;
            }
            
            .item-qty {
              width: 40px;
              text-align: center;
            }
            
            .item-price {
              width: 60px;
              text-align: right;
            }
            
            .total {
              border-top: 2px dashed #000;
              margin-top: 10px;
              padding-top: 10px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              font-weight: bold;
              margin: 5px 0;
            }
            
            .footer {
              text-align: center;
              border-top: 2px dashed #000;
              margin-top: 10px;
              padding-top: 10px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class=\"header\">
            <h2>KITCHEN ORDER TICKET</h2>
            <h3>${orderData.order_number}</h3>
          </div>
          
          <div class=\"info\">
            <div class=\"info-row\">
              <span class=\"info-label\">Date:</span>
              <span>${new Date().toLocaleDateString()}</span>
            </div>
            <div class=\"info-row\">
              <span class=\"info-label\">Time:</span>
              <span>${new Date().toLocaleTimeString()}</span>
            </div>
            ${orderData.table_number ? `
            <div class=\"info-row\">
              <span class=\"info-label\">Table:</span>
              <span style=\"font-size: 16px; font-weight: bold;\">${orderData.table_number}</span>
            </div>
            ` : ''}
            <div class=\"info-row\">
              <span class=\"info-label\">Type:</span>
              <span style=\"text-transform: uppercase;\">${orderData.order_type}</span>
            </div>
            ${orderData.customer_name ? `
            <div class=\"info-row\">
              <span class=\"info-label\">Customer:</span>
              <span>${orderData.customer_name}</span>
            </div>
            ` : ''}
          </div>
          
          <div class=\"divider\"></div>
          
          <div class=\"items\">
            ${orderData.items.map((item: any) => `
              <div class=\"item-row\">
                <span class=\"item-qty\">${item.quantity}×</span>
                <span class=\"item-name\">${item.name}</span>
                <span class=\"item-price\">৳${(item.price * item.quantity).toFixed(2)}</span>
              </div>
              ${item.notes ? `<div style=\"font-size: 10px; margin-left: 40px; color: #666;\">Note: ${item.notes}</div>` : ''}
            `).join('')}
          </div>
          
          <div class=\"total\">
            <div class=\"total-row\">
              <span>TOTAL:</span>
              <span>৳${orderData.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class=\"footer\">
            <p>Thank you!</p>
            <p style=\"margin-top: 5px;\">Printed: ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          setTimeout(() => {
            printWindow.close()
            setIsPrintingKOT(false)
          }, 500)
        }, 300)
      }
    } catch (e) {
      console.error('KOT print failed:', e)
      showToast('Failed to print KOT', 'error')
      setIsPrintingKOT(false)
    }
  }

  const validateAndSendKOT = () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add items first.', 'error')
      return
    }

    if (orderType === 'dine-in') {
      if (!selectedTable) {
        showToast('Please select a table.', 'error')
        return
      }
    }

    if (orderType === 'takeaway') {
      if (!customerName.trim()) {
        showToast('Customer name is required.', 'error')
        return
      }
    }

    if (orderType === 'online') {
      if (!customerName.trim()) {
        showToast('Customer name is required.', 'error')
        return
      }
      if (!customerPhone.trim()) {
        showToast('Phone number is required for online orders.', 'error')
        return
      }
      if (!deliveryAddress.trim()) {
        showToast('Delivery address is required.', 'error')
        return
      }
    }

    if (orderType === 'event') {
      if (!eventDate) {
        showToast('Event date is required.', 'error')
        return
      }
      if (!guestCount.trim() || parseInt(guestCount, 10) < 1) {
        showToast('Please enter number of guests.', 'error')
        return
      }
      if (!customerName.trim()) {
        showToast('Contact person name is required.', 'error')
        return
      }
      if (!customerPhone.trim()) {
        showToast('Phone number is required.', 'error')
        return
      }
    }

    handleSendKOT()
  }

  const handleSendKOT = async () => {
    if (!orgId) {
      showToast('Restaurant not selected. Please go to Dashboard first or refresh the page.', 'error')
      return
    }
    try {
      if (orderType === 'dine-in' && selectedTable) {
        const { data: tableCheck } = await supabase
          .from('tables')
          .select('status')
          .eq('id', selectedTable)
          .eq('organization_id', orgId)
          .single()

        if (tableCheck && tableCheck.status !== 'available') {
          showToast('This table is no longer available! Please select another table.', 'error')
          return
        }
      }

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
        ...(orgId && { organization_id: orgId }),
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
        ...(orgId && { organization_id: orgId }),
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      if (orderType === 'dine-in' && selectedTable && orgId) {
        await supabase.from('tables').update({ status: 'occupied' }).eq('id', selectedTable).eq('organization_id', orgId)
      }

      const tableLabel = orderType === 'dine-in' && selectedTable
        ? `Table ${tables.find(t => t.id === selectedTable)?.table_number ?? '?'}`
        : orderType.charAt(0).toUpperCase() + orderType.slice(1)
      printKOT({ ...order, order_number: order.order_number, total: order.total }, cart, tableLabel)

      const orderTotal = order.total
      showToast(`Order ${orderNumber} sent to kitchen! Total ৳${orderTotal.toFixed(2)}`, 'success')

      setCart([])
      setCartOpen(false)
      setSelectedTable(null)
      setCustomerName('')
      setCustomerPhone('')
      setDeliveryAddress('')
      setDeliveryTime('')
      setGuestCount('')
      setEventDate('')
      router.push('/billing')
    } catch (err) {
      console.error(err)
      showToast('Failed to create order', 'error')
    }
  }

  const currentTypeMeta = ORDER_TYPES.find(o => o.id === orderType) || ORDER_TYPES[0]
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50">
      {/* Categories - desktop sidebar */}
      <div className="hidden lg:block lg:w-48 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
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
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] flex items-center ${
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

      {/* Main: top bar + mobile tabs + order type + form + items */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 flex-wrap">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 text-sm font-medium min-h-[44px] flex items-center">← Dashboard</Link>
          <span className="text-slate-300">|</span>
          <span className={`text-lg font-black font-brand text-slate-900 ${currentTypeMeta.bg} px-3 py-1 rounded-lg border-2 ${currentTypeMeta.border}`}>
            {currentTypeMeta.emoji} {currentTypeMeta.label.toUpperCase()}
          </span>
        </div>

        {/* Mobile category tabs */}
        <div className="lg:hidden flex-shrink-0 bg-white border-b border-slate-200 overflow-x-auto">
          <div className="flex gap-2 p-4">
            {loadingCategories ? (
              <span className="text-slate-400 text-sm">Loading...</span>
            ) : (
              categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg whitespace-nowrap font-semibold text-sm min-h-[44px] flex items-center transition-colors ${
                    selectedCategory?.id === cat.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          {/* Order type selector - cards */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase">Order Type</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleOrderTypeChange('dine-in')}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOrderTypeChange('dine-in'); } }}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[44px] ${
                  orderType === 'dine-in'
                    ? 'bg-emerald-50 border-emerald-500 shadow-lg'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="text-3xl mb-2">🍽️</div>
                <div className="font-bold text-lg text-slate-900">Dine-in</div>
                <div className="text-xs text-slate-500 mb-2">Eat at restaurant</div>
                <Link href="/kitchen" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <span>→ Go to KOT</span>
                </Link>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleOrderTypeChange('takeaway')}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOrderTypeChange('takeaway'); } }}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[44px] ${
                  orderType === 'takeaway'
                    ? 'bg-emerald-50 border-emerald-500 shadow-lg'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="text-3xl mb-2">🥡</div>
                <div className="font-bold text-lg text-slate-900">Takeaway</div>
                <div className="text-xs text-slate-500 mb-2">Pack and go</div>
                <Link href="/kitchen" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <span>→ Go to KOT</span>
                </Link>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleOrderTypeChange('online')}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOrderTypeChange('online'); } }}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[44px] ${
                  orderType === 'online'
                    ? 'bg-emerald-50 border-emerald-500 shadow-lg'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="text-3xl mb-2">🛵</div>
                <div className="font-bold text-lg text-slate-900">Online</div>
                <div className="text-xs text-slate-500 mb-2">Home delivery</div>
                <Link href="/kitchen" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <span>→ Go to KOT</span>
                </Link>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleOrderTypeChange('event')}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOrderTypeChange('event'); } }}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[44px] ${
                  orderType === 'event'
                    ? 'bg-emerald-50 border-emerald-500 shadow-lg'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="text-3xl mb-2">🎉</div>
                <div className="font-bold text-lg text-slate-900">Event</div>
                <div className="text-xs text-slate-500 mb-2">Party booking</div>
                <Link href="/kitchen" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <span>→ Go to KOT</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Dine-in: table selection */}
          {orderType === 'dine-in' && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowTableModal(true)}
                className="min-h-[44px] px-6 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
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
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
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
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Phone Number *"
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <textarea
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Delivery Address *"
                rows={3}
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none resize-none text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="time"
                value={deliveryTime}
                onChange={e => setDeliveryTime(e.target.value)}
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
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
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="number"
                min={1}
                value={guestCount}
                onChange={e => setGuestCount(e.target.value)}
                placeholder="Number of Guests *"
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Contact Person Name *"
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Phone Number *"
                className="w-full px-4 py-3 text-base lg:text-sm lg:py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>
          )}

          {/* Items grid */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">{selectedCategory?.name ?? 'Select category'}</h3>
            {loadingItems ? (
              <div className="text-slate-400 text-sm">Loading items...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addToCart(item)}
                    className="min-h-[44px] bg-white rounded-xl border-2 border-slate-200 p-3 text-left hover:border-emerald-500 hover:bg-emerald-50/50 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <div className="w-full h-32 bg-slate-100 rounded-lg mb-2 overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🍽️
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-sm truncate">{item.name}</div>
                    {item.name_bangla && <div className="text-xs text-slate-500 truncate">{item.name_bangla}</div>}
                    <div className="text-emerald-600 font-bold mt-0.5">৳{item.price}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart - bottom sheet on mobile, sidebar on desktop */}
      <div className="fixed lg:relative bottom-0 left-0 right-0 z-40 lg:w-80 flex-shrink-0 bg-white border-t lg:border-t-0 lg:border-l-2 border-slate-200 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:shadow-none">
        {/* Mobile: collapsed bar + expandable content */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(!cartOpen)}
            className="w-full p-4 bg-emerald-500 text-white font-bold flex justify-between items-center min-h-[44px]"
          >
            <span>Cart ({cart.length})</span>
            <span>৳{cartTotal.toFixed(2)}</span>
          </button>
          {cartOpen && (
            <div className="max-h-[70vh] overflow-y-auto p-4 border-t-2 border-slate-100 bg-white">
              {cart.length === 0 ? (
                <p className="text-slate-400 text-sm">Cart is empty</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">{item.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, -1)}
                            className="min-w-[44px] min-h-[44px] w-10 h-10 rounded-lg bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="font-bold text-slate-900 w-8 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, 1)}
                            className="min-w-[44px] min-h-[44px] w-10 h-10 rounded-lg bg-emerald-500 text-white font-bold flex items-center justify-center"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 text-sm font-semibold ml-1 min-h-[44px] flex items-center"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="text-right font-bold text-slate-800">৳{item.price * item.quantity}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between text-lg font-black text-slate-900 mb-3">
                  <span>Total</span>
                  <span>৳{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { validateAndSendKOT(); setCartOpen(false); }}
                  className="w-full min-h-[44px] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
                >
                  Send KOT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop: always visible */}
        <div className="hidden lg:flex flex-col flex-1 min-h-0">
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
                        className="min-w-[44px] min-h-[44px] w-8 h-8 rounded bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, 1)}
                        className="min-w-[44px] min-h-[44px] w-8 h-8 rounded bg-emerald-500 text-white font-bold text-sm flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 text-xs font-semibold ml-1 min-h-[44px] flex items-center"
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
              <span>৳{cartTotal.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={validateAndSendKOT}
              className="w-full min-h-[44px] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
            >
              Send KOT
            </button>
          </div>
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
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm min-h-[44px] flex items-center ${
                    selectedFloor?.id === f.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2">
                {tables.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (t.status === 'available') {
                        setSelectedTable(t.id)
                        setShowTableModal(false)
                      }
                    }}
                    disabled={t.status !== 'available'}
                    className={`min-h-[44px] py-4 rounded-lg border-2 font-bold flex flex-col items-center justify-center text-center transition-all ${
                      t.status === 'available'
                        ? selectedTable === t.id
                          ? 'bg-emerald-500 text-white border-emerald-500 ring-4 ring-emerald-200 cursor-pointer'
                          : 'bg-white border-emerald-500 hover:bg-emerald-50 text-slate-900 cursor-pointer'
                        : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-lg">{t.table_number}</span>
                    <span className="text-xs mt-1 font-normal">
                      {t.status === 'available' && '🟢 Available'}
                      {t.status === 'occupied' && '🔴 Occupied'}
                      {t.status === 'reserved' && '🟡 Reserved'}
                      {t.status === 'billing' && '🔵 Billing'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KOT Success Modal */}
      {kotSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setKotSuccess(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-4xl">✅</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">KOT Sent!</h3>
            <p className="text-slate-600 text-sm mb-4">Order sent to kitchen</p>
            <div className="bg-slate-50 rounded-xl py-3 px-4 mb-6">
              <div className="text-xs text-slate-500 uppercase font-semibold">Order</div>
              <div className="text-2xl font-black text-emerald-600 font-brand">{kotSuccess.orderNumber}</div>
              <div className="text-lg font-bold text-slate-800 mt-1">৳{kotSuccess.total.toFixed(2)}</div>
            </div>
            <button
              type="button"
              onClick={() => setKotSuccess(null)}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}

export default function POSPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50 p-6 text-slate-600">Loading...</div>}>
      <POSContent />
    </Suspense>
  )
}
