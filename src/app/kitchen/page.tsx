'use client'

import { useState, useEffect } from 'react'
import { getOrders, getOrderWithItems } from '@/app/lib/api/orders'
import { getFloors, getTablesByFloor, getAllTables, type Floor, type Table } from '@/app/lib/api/tables'
import { getCategories, getMenuItemsByCategory, getAllMenuItems, type MenuItem } from '@/app/lib/api/menu'
import BackButton from '@/components/BackButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import {
  updateOrderStatus,
  createOrder,
  insertOrderItems,
  deleteOrderItemsByOrder,
  updateOrderTotals,
  deleteOrderById,
  rejectOrder,
} from '@/app/lib/db/orders'
import { supabase } from '@/lib/supabase-client'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  table_id?: string | null
  order_type?: string
  rejection_reason?: string | null
  rejected_at?: string | null
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

// Reject order feature – off for now (can re-enable later)
const REJECT_ORDER_ENABLED = false

interface EditLineItem {
  menu_item_id: string
  item_name: string
  item_name_bangla: string | null
  unit_price: number
  quantity: number
}

export default function KitchenPage() {
  const { organization, organizations } = useAuth()
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

  // Reject Order
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejected, setShowRejected] = useState(false)

  const { toast, showToast, hideToast } = useToast()

  const [mounted, setMounted] = useState(false)
  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null) ?? organizations?.[0]?.id ?? null

  useEffect(() => {
    setMounted(true)
  }, [])

  // All tables for showing table number/floor on orders (dine-in)
  const [tablesForLabel, setTablesForLabel] = useState<Table[]>([])
  const [isPrintingKOT, setIsPrintingKOT] = useState(false)
  useEffect(() => {
    if (!orgId) return
    getAllTables(orgId).then(setTablesForLabel)
  }, [orgId])

  const getOrderTableLabel = (order: Order) => {
    if (!order.table_id) return order.order_type === 'dine-in' ? '—' : (order.order_type || 'Takeaway')
    const t = tablesForLabel.find(t => t.id === order.table_id)
    if (!t) return `Table ?`
    const floorName = t.floor?.name ? `${t.floor.name} · ` : ''
    return `${floorName}Table ${t.table_number}`
  }

  // Manual KOT re-print from Kitchen
  const printKOT = async (order: Order) => {
    if (isPrintingKOT) return

    setIsPrintingKOT(true)

    try {
      if (!orgId) return
      const data = await getOrderWithItems(orgId, order.id)

      const tableInfo = order.table_id
        ? tablesForLabel.find(t => t.id === order.table_id)
        : undefined

      const orderData = {
        order_number: data.order.order_number,
        created_at: data.order.created_at,
        order_type: data.order.order_type ?? 'dine-in',
        total: data.order.total,
        table_number: tableInfo ? tableInfo.table_number : null,
        buzzer_number: null as number | null,
        items: data.items.map((item) => ({
          name: item.item_name,
          quantity: item.quantity,
          price: item.unit_price ?? 0,
          notes: item.notes ?? ''
        }))
      }

      const printWindow = window.open('', '', 'width=300,height=600')

      if (!printWindow) {
        showToast('Please allow popups to print', 'error')
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
          <div class="header">
            <h2>KITCHEN ORDER TICKET</h2>
            <h3>${orderData.order_number}</h3>
          </div>
          
          <div class="info">
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span>${new Date(orderData.created_at).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Time:</span>
              <span>${new Date(orderData.created_at).toLocaleTimeString()}</span>
            </div>
            ${orderData.table_number ? `
            <div class="info-row">
              <span class="info-label">Table:</span>
              <span style="font-size: 16px; font-weight: bold;">${orderData.table_number}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Type:</span>
              <span style="text-transform: uppercase;">${orderData.order_type}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="items">
            ${orderData.items.map((item: any) => `
              <div class="item-row">
                <span class="item-qty">${item.quantity}×</span>
                <span class="item-name">${item.name}</span>
                <span class="item-price">৳${(item.price * item.quantity).toFixed(2)}</span>
              </div>
              ${item.notes ? `<div style="font-size: 10px; margin-left: 40px; color: #666;">Note: ${item.notes}</div>` : ''}
            `).join('')}
          </div>
          
          <div class="total">
            <div class="total-row">
              <span>TOTAL:</span>
              <span>৳${orderData.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you!</p>
            <p style="margin-top: 5px;">Reprinted: ${new Date().toLocaleString()}</p>
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
      console.error('KOT re-print failed:', e)
      showToast('Failed to print KOT', 'error')
      setIsPrintingKOT(false)
    }
  }

  const fetchOrders = async () => {
    if (!orgId) return
    try {
      setLoading(true)
      const activeStatuses = ['pending', 'preparing', 'ready', 'served', 'rejected']
      const data = await getOrders(orgId, activeStatuses)
      setOrders(data ?? [])
    } catch (error) {
      console.error('❌ Error fetching kitchen orders:', error)
      showToast('Could not load orders. Check console.', 'error')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!orgId) return
    try {
      const { error } = await updateOrderStatus(orgId, orderId, newStatus)

      if (error) {
        console.error('Error updating status:', error)
        showToast('Failed to update status', 'error')
        return
      }

      // Close details modal if open
      setSelectedOrder(null)
      // Refresh orders list
      fetchOrders()
      showToast(`Order status changed to ${newStatus}`, 'success')
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to update status', 'error')
    }
  }

  useEffect(() => {
    if (!orgId) {
      setLoading(false)
      setOrders([])
      return
    }
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [orgId])

  // Real-time: new/updated orders for this org (filter by organization_id)
  useEffect(() => {
    if (!orgId) return
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `organization_id=eq.${orgId}` // only this tenant's orders
        },
        () => {
          fetchOrders()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId])

  const viewOrderDetails = async (order: Order) => {
    if (!orgId) return
    try {
      const data = await getOrderWithItems(orgId, order.id)
      setSelectedOrder(data)
    } catch (error) {
      console.error('Error fetching order details (kitchen):', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
      pending: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-200',
        icon: '🟠',
        label: 'Pending'
      },
      preparing: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: '🔵',
        label: 'Preparing'
      },
      ready: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: '🟢',
        label: 'Ready'
      },
      served: {
        bg: 'bg-slate-100',
        text: 'text-slate-500',
        border: 'border-slate-200',
        icon: '✅',
        label: 'Served'
      }
    }

    const badge = badges[status] || badges.pending

    return (
      <div className={`px-3 py-1 rounded-full text-xs font-bold border-2 flex-shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
        {badge.icon} {badge.label}
      </div>
    )
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
    if (!orgId) return
    setShowAddModal(true)
    setAddOrderType('dine-in')
    setAddTableId('')
    setAddItemQty({})
    try {
      const [cats, items, floors] = await Promise.all([
        getCategories(orgId),
        getAllMenuItems(orgId),
        getFloors(orgId)
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
    if (!orgId || !addSelectedFloor) {
      setAddTables([])
      return
    }
    getTablesByFloor(addSelectedFloor.id, orgId).then(setAddTables)
  }, [orgId, addSelectedFloor])

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
      showToast('Add at least one item.', 'error')
      return
    }
    if (addOrderType === 'dine-in' && !addTableId) {
      showToast('Select a table for dine-in.', 'error')
      return
    }
    setAddLoading(true)
    try {
      const orderNumber = `ORD-${Date.now()}`
      const subtotal = items.reduce((s, { item, quantity }) => s + item.price * quantity, 0)
      const total = subtotal
      const { data: order, error: orderError } = await createOrder({
        order_number: orderNumber,
        order_type: addOrderType,
        table_id: addOrderType === 'dine-in' ? addTableId : null,
        subtotal,
        tax: 0,
        discount: 0,
        total,
        status: 'pending',
        ...(orgId && { organization_id: orgId }),
      })
      if (orderError) throw orderError
      const orderItems = items.map(({ item, quantity }) => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_name: item.name,
        item_name_bangla: item.name_bangla ?? null,
        quantity,
        unit_price: item.price,
        subtotal: item.price * quantity,
        status: 'pending',
        ...(orgId && { organization_id: orgId }),
      }))
      const { error: itemsError } = await insertOrderItems(orderItems)
      if (itemsError) throw itemsError
      setShowAddModal(false)
      fetchOrders()
    } catch (e) {
      console.error(e)
      showToast('Failed to create order', 'error')
    } finally {
      setAddLoading(false)
    }
  }

  // --- Edit Order ---
  const openEditModal = async (order: Order) => {
    if (!orgId) return
    try {
      const data = await getOrderWithItems(orgId, order.id)
      setEditOrder(data)
      setEditLines(data.items.filter(it => it.menu_item_id).map(it => ({
        menu_item_id: it.menu_item_id!,
        item_name: it.item_name,
        item_name_bangla: it.item_name_bangla ?? null,
        unit_price: (it as OrderItem & { unit_price?: number }).unit_price ?? 0,
        quantity: it.quantity
      })))
      setEditReason('')
      const allItems = await getAllMenuItems(orgId)
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
      showToast('Order must have at least one item.', 'error')
      return
    }
    if (!editReason.trim()) {
      showToast('Reason is required.', 'error')
      return
    }
    const oId = organization?.id ?? orgId
    if (!oId) {
      showToast('Organization not set. Please refresh and try again.', 'error')
      return
    }
    setEditLoading(true)
    try {
      const subtotal = editLines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
      await deleteOrderItemsByOrder(oId, editOrder.order.id)
      await insertOrderItems(editLines.map(l => ({
        order_id: editOrder.order.id,
        menu_item_id: l.menu_item_id,
        item_name: l.item_name,
        item_name_bangla: l.item_name_bangla,
        quantity: l.quantity,
        unit_price: l.unit_price,
        subtotal: l.unit_price * l.quantity,
        status: 'pending',
        organization_id: oId,
      })))
      await updateOrderTotals(oId, editOrder.order.id, {
        subtotal,
        total: subtotal,
        updated_at: new Date().toISOString(),
      })
      setShowEditModal(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (e) {
      console.error(e)
      showToast('Failed to update order', 'error')
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
    if (!orgId) {
      showToast('No organization selected.', 'error')
      return
    }
    if (!deleteReason.trim()) {
      showToast('Reason is required.', 'error')
      return
    }
    setDeleteLoading(true)
    try {
      await deleteOrderItemsByOrder(orgId, deleteOrder.id)
      await deleteOrderById(orgId, deleteOrder.id)
      setShowDeleteModal(false)
      setDeleteOrder(null)
      setSelectedOrder(null)
      fetchOrders()
    } catch (e) {
      console.error(e)
      showToast('Failed to delete order', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRejectOrder = async () => {
    if (!rejectOrderId || !orgId) return

    if (!rejectReason.trim()) {
      showToast('Please provide a reason for rejection', 'error')
      return
    }

    try {
      const { error } = await rejectOrder(orgId, rejectOrderId, rejectReason, 'Kitchen Staff')

      if (error) throw error

      showToast('✅ Order rejected', 'success')

      setShowRejectModal(false)
      setRejectOrderId(null)
      setRejectReason('')
      fetchOrders()
    } catch (error) {
      console.error('Reject error:', error)
      showToast('Failed to reject order', 'error')
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const preparingOrders = orders.filter(o => o.status === 'preparing')
  const readyOrders = orders.filter(o => o.status === 'ready')
  const servedOrders = orders.filter(o => o.status === 'served')
  const rejectedOrders = orders.filter(o => o.status === 'rejected')

  const OrderCard = ({ order }: { order: Order }) => (
    <div
      className={`
        relative overflow-hidden rounded-xl border-2 bg-white text-left shadow-lg
        transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5
        focus-within:ring-2 focus-within:ring-emerald-400 focus-within:ring-offset-2 focus-within:ring-offset-slate-900
        ${order.status === 'pending' ? 'border-orange-200' : order.status === 'preparing' ? 'border-blue-200' : order.status === 'ready' ? 'border-emerald-200' : 'border-slate-200'}
      `}
    >
      {/* Subtle top accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${order.status === 'pending' ? 'bg-orange-400' : order.status === 'preparing' ? 'bg-blue-400' : order.status === 'ready' ? 'bg-emerald-400' : 'bg-slate-300'}`}
        aria-hidden
      />
      <div className="p-4 pt-5">
        <div
          className="cursor-pointer rounded-lg -m-1 p-1 active:bg-slate-50 transition-colors"
          onClick={() => viewOrderDetails(order)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') viewOrderDetails(order) }}
        >
          <div className="flex justify-between items-start gap-2 mb-2">
            <span className="text-base font-black text-slate-900 truncate min-w-0 tabular-nums">
              {order.order_number}
            </span>
            {getStatusBadge(order.status)}
          </div>
          <div className="text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">
            🪑 {getOrderTableLabel(order)}
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatTime(order.created_at)}</span>
          </div>
          <div className="text-lg font-bold text-slate-900 tracking-tight">৳{order.total.toFixed(2)}</div>
        </div>
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-100">
          {order.status === 'pending' && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleStatusChange(order.id, 'preparing') }}
              className="w-full py-2.5 rounded-full bg-blue-500/95 hover:bg-blue-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 border border-blue-400/70 active:scale-[0.98] transition-all"
            >
              🔵 Start Preparing
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleStatusChange(order.id, 'ready') }}
              className="w-full py-2.5 rounded-full bg-emerald-500/95 hover:bg-emerald-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 border border-emerald-400/70 active:scale-[0.98] transition-all"
            >
              🟢 Mark Ready
            </button>
          )}
          {order.status === 'ready' && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleStatusChange(order.id, 'served') }}
              className="w-full py-2.5 rounded-full bg-slate-600 hover:bg-slate-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-slate-900/30 border border-slate-500 active:scale-[0.98] transition-all"
            >
              ✅ Mark Served
            </button>
          )}
          {order.status === 'served' && (
            <div className="text-center py-2.5 rounded-full bg-slate-50 text-slate-500 font-bold text-xs tracking-wide border border-slate-200">
              ✅ Completed
            </div>
          )}
          {(order.status === 'pending' || order.status === 'preparing') && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); openEditModal(order) }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                title="Edit order"
              >
                ✏️ Edit
              </button>
              {order.status === 'pending' && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); openDeleteModal(order) }}
                  className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors"
                  title="Delete order"
                >
                  🗑️
                </button>
              )}
            </div>
          )}
          {REJECT_ORDER_ENABLED && (order.status === 'pending' || order.status === 'preparing') && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setRejectOrderId(order.id)
                setRejectReason('')
                setShowRejectModal(true)
              }}
              className="w-full py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              ❌ Reject Order
            </button>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); printKOT(order) }}
            className="w-full py-2 bg-slate-600 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            🖨️ Print KOT
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 lg:p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl lg:text-4xl font-brand font-black tracking-tight">🍳 Kitchen</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {orders.length} active · Pending {pendingOrders.length} · Preparing {preparingOrders.length} · Ready {readyOrders.length}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="min-h-[48px] px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98]"
        >
          + Add Order
        </button>
      </div>

      {!mounted ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : !orgId ? (
        <EmptyState
          icon="🏪"
          title="Restaurant not selected"
          description="Go to Dashboard and select a restaurant, or refresh the page. Then orders from POS will appear here."
        />
      ) : loading ? (
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-8">
            {/* Pending Column */}
            <div className="flex flex-col min-h-[200px]">
              <div className="bg-orange-500/15 rounded-xl p-4 mb-4 border-2 border-orange-400/40 shadow-lg shadow-orange-500/10">
                <h3 className="font-bold text-orange-200 flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">🟠 Pending</span>
                  <span className="bg-orange-500/30 text-white rounded-full w-10 h-10 flex items-center justify-center font-black text-lg tabular-nums">
                    {pendingOrders.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-4 flex-1">
                {pendingOrders.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">No pending orders</p>
                ) : (
                  pendingOrders.map(order => <OrderCard key={order.id} order={order} />)
                )}
              </div>
            </div>

            {/* Preparing Column */}
            <div className="flex flex-col min-h-[200px]">
              <div className="bg-blue-500/15 rounded-xl p-4 mb-4 border-2 border-blue-400/40 shadow-lg shadow-blue-500/10">
                <h3 className="font-bold text-blue-200 flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">🔵 Preparing</span>
                  <span className="bg-blue-500/30 text-white rounded-full w-10 h-10 flex items-center justify-center font-black text-lg tabular-nums">
                    {preparingOrders.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-4 flex-1">
                {preparingOrders.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">None in progress</p>
                ) : (
                  preparingOrders.map(order => <OrderCard key={order.id} order={order} />)
                )}
              </div>
            </div>

            {/* Ready Column */}
            <div className="flex flex-col min-h-[200px]">
              <div className="bg-emerald-500/15 rounded-xl p-4 mb-4 border-2 border-emerald-400/40 shadow-lg shadow-emerald-500/10">
                <h3 className="font-bold text-emerald-200 flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">🟢 Ready</span>
                  <span className="bg-emerald-500/30 text-white rounded-full w-10 h-10 flex items-center justify-center font-black text-lg tabular-nums">
                    {readyOrders.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-4 flex-1">
                {readyOrders.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">None ready yet</p>
                ) : (
                  readyOrders.map(order => <OrderCard key={order.id} order={order} />)
                )}
              </div>
            </div>
          </div>

          {/* Served Today */}
          {servedOrders.length > 0 && (
            <div className="mt-6">
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                <h3 className="font-bold text-slate-300 text-sm flex items-center gap-2">
                  <span>✅ Served today</span>
                  <span className="bg-slate-600 text-slate-200 rounded-full px-2.5 py-0.5 font-black tabular-nums">{servedOrders.length}</span>
                </h3>
              </div>
            </div>
          )}

          {/* Rejected Orders - Collapsible (off when REJECT_ORDER_ENABLED is false) */}
          {REJECT_ORDER_ENABLED && rejectedOrders.length > 0 && (
            <div className="mt-6">
              <div className="bg-red-950/40 rounded-xl p-4 border-2 border-red-800/60">
                <h3 className="font-bold text-red-300 text-sm mb-3 flex items-center justify-between">
                  <span>❌ Rejected today ({rejectedOrders.length})</span>
                  <button
                    type="button"
                    onClick={() => setShowRejected(!showRejected)}
                    className="text-sm px-3 py-1.5 bg-red-900/60 text-red-200 rounded-lg hover:bg-red-800/60 transition-colors"
                  >
                    {showRejected ? 'Hide' : 'Show'}
                  </button>
                </h3>
                {showRejected && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {rejectedOrders.map(order => (
                      <div key={order.id} className="bg-slate-800/80 rounded-lg p-3 border border-red-800/50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm font-bold text-white tabular-nums">{order.order_number}</div>
                          <span className="px-2 py-0.5 bg-red-900/60 text-red-300 rounded text-xs font-bold border border-red-700/50">
                            REJECTED
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mb-2">
                          🪑 {getOrderTableLabel(order)}
                        </div>
                        <button
                          type="button"
                          onClick={() => viewOrderDetails(order)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 mb-2"
                        >
                          View details
                        </button>
                        {order.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-950/40 rounded border border-red-800/40">
                            <div className="text-xs font-bold text-red-400 mb-1">Reason</div>
                            <div className="text-xs text-red-300/90">{order.rejection_reason}</div>
                          </div>
                        )}
                        {order.rejected_at && (
                          <div className="text-xs text-slate-500 mt-2">
                            Rejected: {new Date(order.rejected_at).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div className="bg-slate-800 rounded-2xl lg:rounded-3xl p-6 lg:p-8 max-w-2xl w-full my-4 shadow-2xl border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Order details</div>
                <div className="text-3xl lg:text-4xl font-brand font-black text-white tabular-nums">
                  #{selectedOrder.order.order_number.replace('ORD', '')}
                </div>
                <div className="mt-2 text-sm font-bold text-emerald-400">
                  🪑 {getOrderTableLabel(selectedOrder.order)}
                </div>
                <div className="mt-2">{getStatusBadge(selectedOrder.order.status)}</div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-6 space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="bg-slate-700/80 rounded-xl p-4 border border-slate-600/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold text-white mb-0.5">{item.item_name}</div>
                      {item.item_name_bangla && <div className="text-sm text-slate-400 mb-1">{item.item_name_bangla}</div>}
                      {item.notes && <div className="text-sm text-orange-300 mt-1">📝 {item.notes}</div>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm text-slate-400">৳{((item.unit_price ?? 0) * item.quantity).toFixed(2)}</span>
                      <span className="text-xl font-black text-emerald-400 tabular-nums">×{item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {selectedOrder.order.status === 'pending' && (
                <button onClick={() => handleStatusChange(selectedOrder.order.id, 'preparing')} className="w-full sm:flex-1 min-h-[48px] py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-base transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25">
                  🔵 Start Preparing
                </button>
              )}
              {selectedOrder.order.status === 'preparing' && (
                <button onClick={() => handleStatusChange(selectedOrder.order.id, 'ready')} className="w-full sm:flex-1 min-h-[48px] py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">
                  🟢 Mark Ready
                </button>
              )}
              {selectedOrder.order.status === 'ready' && (
                <button onClick={() => handleStatusChange(selectedOrder.order.id, 'served')} className="w-full sm:flex-1 min-h-[48px] py-4 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-bold text-base transition-all active:scale-[0.98]">
                  ✅ Mark Served
                </button>
              )}
              {selectedOrder.order.status === 'served' && (
                <div className="w-full min-h-[48px] py-4 rounded-xl bg-slate-700 text-slate-400 font-bold text-center flex items-center justify-center">
                  Completed
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full my-8 shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Add Order</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Order type</label>
                <select value={addOrderType} onChange={e => setAddOrderType(e.target.value as OrderType)} className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow">
                  <option value="dine-in">Dine-in</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="online">Online</option>
                  <option value="event">Event</option>
                </select>
              </div>
              {addOrderType === 'dine-in' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Table</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {addFloors.map(f => (
                      <button key={f.id} type="button" onClick={() => setAddSelectedFloor(f)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${addSelectedFloor?.id === f.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{f.name}</button>
                    ))}
                  </div>
                  <select value={addTableId} onChange={e => setAddTableId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="">Select table</option>
                    {addTables.map(t => <option key={t.id} value={t.id}>Table {t.table_number}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Items (quantity)</label>
                <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                  {addCategories.map(cat => {
                    const items = addMenuItems.filter(m => m.category_id === cat.id)
                    if (items.length === 0) return null
                    return (
                      <div key={cat.id}>
                        <div className="text-sm text-slate-500 font-semibold mb-2 sticky top-0 bg-slate-800 py-1">{cat.name}</div>
                        {items.map(m => (
                          <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-700/50 last:border-0">
                            <span className="text-white text-sm">{m.name}</span>
                            <input type="number" min={0} value={addItemQty[m.id] ?? 0} onChange={e => setAddItemQuantity(m.id, parseInt(e.target.value, 10) || 0)} className="w-20 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-center font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 min-h-[48px] py-3 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors border border-slate-600">Cancel</button>
              <button type="button" onClick={handleAddOrder} disabled={addLoading} className="flex-1 min-h-[48px] py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">{addLoading ? 'Creating...' : 'Create Order'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full my-8 shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">✏️ Edit #{editOrder.order.order_number.replace('ORD', '')}</h2>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-2.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase">Items</label>
                {editLines.map((line, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-700/80 rounded-xl p-3 border border-slate-600/50">
                    <span className="flex-1 text-white text-sm font-medium truncate">{line.item_name}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateEditLineQty(i, -1)} className="w-9 h-9 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-bold transition-colors">−</button>
                      <span className="w-8 text-center font-bold text-white tabular-nums">{line.quantity}</span>
                      <button type="button" onClick={() => updateEditLineQty(i, 1)} className="w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors">+</button>
                    </div>
                    <button type="button" onClick={() => removeEditLine(i)} className="text-red-400 hover:text-red-300 text-sm font-medium">Remove</button>
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
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 min-h-[48px] py-3 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors border border-slate-600">Cancel</button>
              <button type="button" onClick={handleSaveEdit} disabled={editLoading || editLines.length === 0 || !editReason.trim()} className="flex-1 min-h-[48px] py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">{editLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Modal */}
      {showDeleteModal && deleteOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2">🗑️ Delete Order</h2>
            <p className="text-slate-400 mb-4">Delete order <span className="font-mono font-bold text-white">#{deleteOrder.order_number.replace('ORD', '')}</span>? This cannot be undone.</p>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reason *</label>
              <input type="text" value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="e.g. Duplicate order" className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-red-500 focus:border-red-500" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="flex-1 min-h-[48px] py-3 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors border border-slate-600">Cancel</button>
              <button type="button" onClick={handleDeleteOrder} disabled={deleteLoading || !deleteReason.trim()} className="flex-1 min-h-[48px] py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50 transition-all active:scale-[0.98]">{deleteLoading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Order Modal (only when feature enabled) */}
      {REJECT_ORDER_ENABLED && showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">❌ Reject Order</h2>
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectOrderId(null)
                  setRejectReason('')
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-4">
                Please provide a reason for rejecting this order. This will be logged for records.
              </p>

              <label className="block text-sm font-bold text-slate-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Out of stock, Wrong order, Customer cancelled..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-red-500 focus:outline-none resize-none"
                autoFocus
              />
            </div>

            {/* Quick reason buttons */}
            <div className="mb-4">
              <div className="text-xs text-slate-600 mb-2 font-bold">Quick Reasons:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  'Out of stock',
                  'Wrong order',
                  'Customer cancelled',
                  'Kitchen too busy',
                  'Item unavailable'
                ].map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectOrderId(null)
                  setRejectReason('')
                }}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectOrder}
                disabled={!rejectReason.trim()}
                className={`flex-1 px-4 py-3 rounded-lg font-bold transition-colors ${
                  rejectReason.trim()
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Reject Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
