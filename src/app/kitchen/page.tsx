'use client'

import { useState, useEffect } from 'react'
import { getOrders, getOrderWithItems, updateOrderStatus } from '@/app/lib/api/orders'
import { supabase } from '@/app/lib/api/orders'
import { getFloors, getTablesByFloor, getAllTables, type Floor, type Table } from '@/app/lib/api/tables'
import { getCategories, getMenuItemsByCategory, getAllMenuItems, type MenuItem } from '@/app/lib/api/menu'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  table_id?: string | null
  order_type?: string
  buzzer_number?: number | null
  buzzer_status?: 'pending' | 'ready' | 'called' | 'returned' | null
}

interface OrderItem {
  id: string
  item_name: string
  item_name_bangla: string | null
  quantity: number
  unit_price?: number
  menu_item_id?: string | null
  notes?: string
}

type OrderType = 'dine-in' | 'takeaway' | 'online' | 'event'

interface EditLineItem {
  menu_item_id: string
  item_name: string
  item_name_bangla: string | null
  unit_price: number
  quantity: number
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; items: OrderItem[] } | null>(null)
  const [loading, setLoading] = useState(true)

  // Add Order modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addOrderType, setAddOrderType] = useState<OrderType>('dine-in')
  const [addTableId, setAddTableId] = useState<string>('')
  const [addItemQty, setAddItemQty] = useState<Record<string, number>>({})
  const [addCategories, setAddCategories] = useState<{ id: string; name: string }[]>([])
  const [addMenuItems, setAddMenuItems] = useState<MenuItem[]>([])
  const [addFloors, setAddFloors] = useState<Floor[]>([])
  const [addTables, setAddTables] = useState<Table[]>([])
  const [addSelectedFloor, setAddSelectedFloor] = useState<Floor | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  // Edit Order modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editOrder, setEditOrder] = useState<{ order: Order; items: OrderItem[] } | null>(null)
  const [editLines, setEditLines] = useState<EditLineItem[]>([])
  const [editReason, setEditReason] = useState('')
  const [editAllMenuItems, setEditAllMenuItems] = useState<MenuItem[]>([])
  const [editLoading, setEditLoading] = useState(false)

  // Delete Order
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchOrders = async () => {
    try {
      const data = await getOrders()
      const activeOrders = data.filter(order =>
        order.status === 'pending' ||
        order.status === 'preparing' ||
        (order.status === 'ready' && order.buzzer_number != null && order.buzzer_status !== 'returned')
      )
      setOrders(activeOrders)
    } catch (error) {
      console.error('Error fetching pending orders (kitchen):', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  const viewOrderDetails = async (order: Order) => {
    try {
      const data = await getOrderWithItems(order.id)
      setSelectedOrder(data)
    } catch (error) {
      console.error('Error fetching order details (kitchen):', error)
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const success = await updateOrderStatus(orderId, newStatus)
    if (success) {
      const order = orders.find(o => o.id === orderId)
      if (newStatus === 'ready' && order?.buzzer_number != null) {
        await supabase.from('orders').update({ buzzer_status: 'ready', updated_at: new Date().toISOString() }).eq('id', orderId)
      }
      fetchOrders()
      setSelectedOrder(null)
    }
  }

  const handleCallBuzzer = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ buzzer_status: 'called', updated_at: new Date().toISOString() }).eq('id', orderId)
    if (!error) fetchOrders()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500'
      case 'preparing': return 'bg-blue-500'
      case 'ready': return 'bg-emerald-500'
      default: return 'bg-slate-500'
    }
  }

  const getBuzzerBadgeClass = (buzzerStatus: string | null | undefined) => {
    switch (buzzerStatus) {
      case 'pending': return 'bg-orange-500 text-white'
      case 'ready': return 'bg-emerald-500 text-white'
      case 'called': return 'bg-blue-500 text-white animate-pulse'
      case 'returned': return 'bg-slate-500 text-white'
      default: return 'bg-slate-600 text-slate-300'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  // --- Add Order ---
  const openAddModal = async () => {
    setShowAddModal(true)
    setAddOrderType('dine-in')
    setAddTableId('')
    setAddItemQty({})
    try {
      const [cats, items, floors] = await Promise.all([
        getCategories(),
        getAllMenuItems(),
        getFloors()
      ])
      setAddCategories(cats)
      setAddMenuItems(items)
      setAddFloors(floors)
      setAddSelectedFloor(floors[0] || null)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (!addSelectedFloor) {
      setAddTables([])
      return
    }
    getTablesByFloor(addSelectedFloor.id).then(setAddTables)
  }, [addSelectedFloor])

  const setAddItemQuantity = (menuItemId: string, qty: number) => {
    setAddItemQty(prev => {
      const next = { ...prev }
      if (qty <= 0) delete next[menuItemId]
      else next[menuItemId] = qty
      return next
    })
  }

  const handleAddOrder = async () => {
    const items: { item: MenuItem; quantity: number }[] = []
    for (const [id, qty] of Object.entries(addItemQty)) {
      if (qty > 0) {
        const item = addMenuItems.find(m => m.id === id)
        if (item) items.push({ item, quantity: qty })
      }
    }
    if (items.length === 0) {
      alert('Add at least one item.')
      return
    }
    if (addOrderType === 'dine-in' && !addTableId) {
      alert('Select a table for dine-in.')
      return
    }
    setAddLoading(true)
    try {
      const orderNumber = `ORD-${Date.now()}`
      const subtotal = items.reduce((s, { item, quantity }) => s + item.price * quantity, 0)
      const total = subtotal
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          order_type: addOrderType,
          table_id: addOrderType === 'dine-in' ? addTableId : null,
          subtotal,
          tax: 0,
          discount: 0,
          total,
          status: 'pending'
        })
        .select()
        .single()
      if (orderError) throw orderError
      const orderItems = items.map(({ item, quantity }) => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_name: item.name,
        item_name_bangla: item.name_bangla ?? null,
        quantity,
        unit_price: item.price,
        subtotal: item.price * quantity,
        status: 'pending'
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError
      setShowAddModal(false)
      fetchOrders()
    } catch (e) {
      console.error(e)
      alert('Failed to create order')
    } finally {
      setAddLoading(false)
    }
  }

  // --- Edit Order ---
  const openEditModal = async (order: Order) => {
    try {
      const data = await getOrderWithItems(order.id)
      setEditOrder(data)
      setEditLines(data.items.filter(it => it.menu_item_id).map(it => ({
        menu_item_id: it.menu_item_id!,
        item_name: it.item_name,
        item_name_bangla: it.item_name_bangla ?? null,
        unit_price: (it as OrderItem & { unit_price?: number }).unit_price ?? 0,
        quantity: it.quantity
      })))
      setEditReason('')
      const allItems = await getAllMenuItems()
      setEditAllMenuItems(allItems)
      setShowEditModal(true)
    } catch (e) {
      console.error(e)
    }
  }

  const updateEditLineQty = (index: number, delta: number) => {
    setEditLines(prev => {
      const next = [...prev]
      const q = next[index].quantity + delta
      if (q <= 0) next.splice(index, 1)
      else next[index] = { ...next[index], quantity: q }
      return next
    })
  }

  const removeEditLine = (index: number) => {
    setEditLines(prev => prev.filter((_, i) => i !== index))
  }

  const addEditLine = (menuItem: MenuItem) => {
    const existing = editLines.find(l => l.menu_item_id === menuItem.id)
    if (existing) {
      setEditLines(prev => prev.map(l => l.menu_item_id === menuItem.id ? { ...l, quantity: l.quantity + 1 } : l))
    } else {
      setEditLines(prev => [...prev, {
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        item_name_bangla: menuItem.name_bangla ?? null,
        unit_price: menuItem.price,
        quantity: 1
      }])
    }
  }

  const handleSaveEdit = async () => {
    if (!editOrder || editLines.length === 0) {
      alert('Order must have at least one item.')
      return
    }
    if (!editReason.trim()) {
      alert('Reason is required.')
      return
    }
    setEditLoading(true)
    try {
      const subtotal = editLines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
      await supabase.from('order_items').delete().eq('order_id', editOrder.order.id)
      await supabase.from('order_items').insert(editLines.map(l => ({
        order_id: editOrder.order.id,
        menu_item_id: l.menu_item_id,
        item_name: l.item_name,
        item_name_bangla: l.item_name_bangla,
        quantity: l.quantity,
        unit_price: l.unit_price,
        subtotal: l.unit_price * l.quantity,
        status: 'pending'
      })))
      await supabase.from('orders').update({
        subtotal,
        total: subtotal,
        updated_at: new Date().toISOString()
      }).eq('id', editOrder.order.id)
      console.log('[Kitchen] Order edited', {
        orderId: editOrder.order.id,
        order_number: editOrder.order.order_number,
        reason: editReason.trim(),
        newItems: editLines
      })
      setShowEditModal(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (e) {
      console.error(e)
      alert('Failed to update order')
    } finally {
      setEditLoading(false)
    }
  }

  // --- Delete Order ---
  const openDeleteModal = (order: Order) => {
    setDeleteOrder(order)
    setDeleteReason('')
    setShowDeleteModal(true)
  }

  const handleDeleteOrder = async () => {
    if (!deleteOrder) return
    if (!deleteReason.trim()) {
      alert('Reason is required.')
      return
    }
    setDeleteLoading(true)
    try {
      await supabase.from('order_items').delete().eq('order_id', deleteOrder.id)
      await supabase.from('orders').delete().eq('id', deleteOrder.id)
      setShowDeleteModal(false)
      setDeleteOrder(null)
      setSelectedOrder(null)
      fetchOrders()
    } catch (e) {
      console.error(e)
      alert('Failed to delete order')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-brand font-black mb-2">🔥 KITCHEN DISPLAY</h1>
          <div className="flex items-center gap-4">
            <p className="text-slate-400">Active Orders: <span className="text-white font-bold text-2xl">{orders.length}</span></p>
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Live Updates</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
        >
          + Add Order
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="✨"
          title="All Clear!"
          description="No pending orders. Kitchen is ready for new orders!"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-800 rounded-2xl p-6 border-2 border-slate-700 hover:border-emerald-500 transition-all text-left"
            >
              <div
                className="cursor-pointer"
                onClick={() => viewOrderDetails(order)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') viewOrderDetails(order) }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">ORDER</div>
                    <div className="text-3xl font-brand font-black text-emerald-400">
                      #{order.order_number.replace('ORD', '')}
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full ${getStatusColor(order.status)} text-white font-bold text-sm uppercase`}>
                    {order.status}
                  </div>
                </div>
                {order.buzzer_number != null && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-4xl font-black text-white bg-slate-700 rounded-xl px-3 py-1">
                      🔔 {order.buzzer_number}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getBuzzerBadgeClass(order.buzzer_status)}`}>
                      {order.buzzer_status || 'pending'}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400 mb-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-lg">{formatTime(order.created_at)}</span>
                </div>
                <div className="text-2xl font-bold text-white">৳{order.total.toFixed(2)}</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-700">
                {order.status === 'ready' && order.buzzer_number != null && order.buzzer_status !== 'called' && order.buzzer_status !== 'returned' && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleCallBuzzer(order.id) }}
                    className="flex-1 min-w-[100px] py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm"
                  >
                    📢 Call Buzzer
                  </button>
                )}
                {(order.status === 'pending' || order.status === 'preparing') && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); openEditModal(order) }}
                    className="flex-1 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold text-sm"
                  >
                    ✏️ Edit
                  </button>
                )}
                {order.status === 'pending' && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); openDeleteModal(order) }}
                    className="flex-1 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-semibold text-sm"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-slate-800 rounded-3xl p-8 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">ORDER DETAILS</div>
                <div className="text-4xl font-brand font-black text-emerald-400">
                  #{selectedOrder.order.order_number.replace('ORD', '')}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-6 space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="bg-slate-700 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xl font-bold mb-1">{item.item_name}</div>
                      {item.item_name_bangla && <div className="text-sm text-slate-400 mb-2">{item.item_name_bangla}</div>}
                      {item.notes && <div className="text-sm text-orange-400 mt-2">📝 {item.notes}</div>}
                    </div>
                    <div className="text-3xl font-brand font-black text-emerald-400 ml-4">×{item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {selectedOrder.order.status === 'pending' && (
                <button onClick={() => handleStatusUpdate(selectedOrder.order.id, 'preparing')} className="flex-1 py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg transition-colors">
                  🔥 Start Preparing
                </button>
              )}
              {selectedOrder.order.status === 'preparing' && (
                <button onClick={() => handleStatusUpdate(selectedOrder.order.id, 'ready')} className="flex-1 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-colors">
                  ✅ Mark as Ready
                </button>
              )}
              {selectedOrder.order.status === 'ready' && selectedOrder.order.buzzer_number != null && selectedOrder.order.buzzer_status !== 'called' && selectedOrder.order.buzzer_status !== 'returned' && (
                <button onClick={() => handleCallBuzzer(selectedOrder.order.id)} className="flex-1 py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg transition-colors">
                  📢 Call Buzzer #{selectedOrder.order.buzzer_number}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add Order</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Order type</label>
                <select value={addOrderType} onChange={e => setAddOrderType(e.target.value as OrderType)} className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-emerald-500">
                  <option value="dine-in">Dine-in</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="online">Online</option>
                  <option value="event">Event</option>
                </select>
              </div>
              {addOrderType === 'dine-in' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Table</label>
                  <div className="flex gap-2 mb-2">
                    {addFloors.map(f => (
                      <button key={f.id} type="button" onClick={() => setAddSelectedFloor(f)} className={`px-3 py-2 rounded-lg text-sm font-semibold ${addSelectedFloor?.id === f.id ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{f.name}</button>
                    ))}
                  </div>
                  <select value={addTableId} onChange={e => setAddTableId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-emerald-500">
                    <option value="">Select table</option>
                    {addTables.map(t => <option key={t.id} value={t.id}>Table {t.table_number}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Items (quantity)</label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {addCategories.map(cat => {
                    const items = addMenuItems.filter(m => m.category_id === cat.id)
                    if (items.length === 0) return null
                    return (
                      <div key={cat.id}>
                        <div className="text-sm text-slate-500 font-semibold mb-1">{cat.name}</div>
                        {items.map(m => (
                          <div key={m.id} className="flex items-center justify-between gap-2 py-1">
                            <span className="text-white text-sm">{m.name}</span>
                            <input type="number" min={0} value={addItemQty[m.id] ?? 0} onChange={e => setAddItemQuantity(m.id, parseInt(e.target.value, 10) || 0)} className="w-20 px-2 py-1 rounded bg-slate-700 border border-slate-600 text-white" />
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl bg-slate-600 text-white font-bold hover:bg-slate-500">Cancel</button>
              <button type="button" onClick={handleAddOrder} disabled={addLoading} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50">{addLoading ? 'Creating...' : 'Create Order'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && editOrder && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowEditModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">✏️ Edit Order #{editOrder.order.order_number.replace('ORD', '')}</h2>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase">Items</label>
                {editLines.map((line, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-700 rounded-lg p-2">
                    <span className="flex-1 text-white text-sm truncate">{line.item_name}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateEditLineQty(i, -1)} className="w-8 h-8 rounded bg-slate-600 text-white font-bold">−</button>
                      <span className="w-8 text-center font-bold">{line.quantity}</span>
                      <button type="button" onClick={() => updateEditLineQty(i, 1)} className="w-8 h-8 rounded bg-emerald-600 text-white font-bold">+</button>
                    </div>
                    <button type="button" onClick={() => removeEditLine(i)} className="text-red-400 text-sm">Remove</button>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Add item</label>
                <select onChange={e => { const id = e.target.value; if (id) { const m = editAllMenuItems.find(x => x.id === id); if (m) addEditLine(m); e.target.value = '' } }} className="w-full px-4 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white">
                  <option value="">Select to add...</option>
                  {editAllMenuItems.map(m => <option key={m.id} value={m.id}>{m.name} (৳{m.price})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Reason *</label>
                <input type="text" value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="e.g. Customer request" className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl bg-slate-600 text-white font-bold hover:bg-slate-500">Cancel</button>
              <button type="button" onClick={handleSaveEdit} disabled={editLoading || editLines.length === 0 || !editReason.trim()} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50">{editLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Modal */}
      {showDeleteModal && deleteOrder && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2">🗑️ Delete Order</h2>
            <p className="text-slate-400 mb-4">Delete order #{deleteOrder.order_number.replace('ORD', '')}? This cannot be undone.</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Reason *</label>
              <input type="text" value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="e.g. Duplicate order" className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl bg-slate-600 text-white font-bold hover:bg-slate-500">Cancel</button>
              <button type="button" onClick={handleDeleteOrder} disabled={deleteLoading || !deleteReason.trim()} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50">{deleteLoading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
