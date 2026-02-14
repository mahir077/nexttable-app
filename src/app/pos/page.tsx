'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, getFloors, getTablesByFloor, Floor, Table } from '@/app/lib/api/tables'
import type { CartItem } from '@/app/lib/api/menu'

export default function POSPage() {
  const searchParams = useSearchParams()
  const typeFromUrl = searchParams.get('type') || 'dine-in'

  const [orderType, setOrderType] = useState(typeFromUrl)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [eventDate, setEventDate] = useState('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [showTableModal, setShowTableModal] = useState(false)

  useEffect(() => {
    setOrderType(typeFromUrl)
  }, [typeFromUrl])

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

  const handleSendKOT = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!')
      return
    }

    // Validation based on order type
    if (orderType === 'dine-in' && !selectedTable) {
      alert('Please select a table')
      return
    }

    if ((orderType === 'takeaway' || orderType === 'online') && !customerName) {
      alert('Please enter customer name')
      return
    }

    if (orderType === 'online' && !deliveryAddress) {
      alert('Please enter delivery address')
      return
    }

    if (orderType === 'event' && (!eventDate || !guestCount)) {
      alert('Please fill event details')
      return
    }

    try {
      const orderNumber = `ORD-${Date.now()}`
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const tax = 0
      const total = subtotal + tax

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          order_type: orderType,
          table_id: orderType === 'dine-in' ? selectedTable : null,
          subtotal,
          tax,
          discount: 0,
          total,
          status: 'pending',
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          delivery_address: deliveryAddress || null,
          delivery_time: deliveryTime || null,
          guest_count: guestCount ? parseInt(guestCount, 10) : null,
          event_date: eventDate || null,
        })
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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      alert(`✅ KOT sent! Order: ${orderNumber}`)
      
      // Reset form
      setCart([])
      setSelectedTable(null)
      setCustomerName('')
      setCustomerPhone('')
      setDeliveryAddress('')
      setDeliveryTime('')
      setGuestCount('')
      setEventDate('')
      
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create order')
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Categories */}
      <div className="w-48 bg-white border-r border-slate-200 overflow-y-auto">
        {/* ... existing category code ... */}
      </div>

      {/* Items */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl font-brand font-black text-slate-900 mb-4">
          {orderType === 'dine-in' ? '🍽️ DINE-IN' :
           orderType === 'takeaway' ? '🥡 TAKEAWAY' :
           orderType === 'online' ? '🛵 ONLINE ORDER' :
           orderType === 'event' ? '🎉 EVENT ORDER' : 'POS'}
        </h1>

        {/* Order Type Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setOrderType('dine-in')}
            className={`px-4 py-2 rounded-lg font-bold ${orderType === 'dine-in' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700'}`}
          >
            🍽️ Dine-in
          </button>
          <button
            onClick={() => setOrderType('takeaway')}
            className={`px-4 py-2 rounded-lg font-bold ${orderType === 'takeaway' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700'}`}
          >
            🥡 Takeaway
          </button>
          <button
            onClick={() => setOrderType('online')}
            className={`px-4 py-2 rounded-lg font-bold ${orderType === 'online' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700'}`}
          >
            🛵 Online
          </button>
          <button
            onClick={() => setOrderType('event')}
            className={`px-4 py-2 rounded-lg font-bold ${orderType === 'event' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700'}`}
          >
            🎉 Event
          </button>
        </div>

        {/* Customer/Event Info Forms */}
        {orderType === 'dine-in' && (
          <div className="mb-4">
            <button
              onClick={() => setShowTableModal(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold"
            >
              {selectedTable ? `Table ${tables.find(t => t.id === selectedTable)?.table_number}` : 'Select Table'}
            </button>
          </div>
        )}

        {(orderType === 'takeaway' || orderType === 'online') && (
          <div className="mb-4 bg-white p-4 rounded-lg space-y-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name *"
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone Number"
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
            />
            {orderType === 'online' && (
              <>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Delivery Address *"
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="Delivery Time"
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
              </>
            )}
          </div>
        )}

        {orderType === 'event' && (
          <div className="mb-4 bg-white p-4 rounded-lg space-y-2">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              placeholder="Event Date *"
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="number"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="Number of Guests *"
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contact Person *"
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone Number *"
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}

        {/* ... existing items grid ... */}
      </div>

      {/* Cart - existing code */}
    </div>
  )
}