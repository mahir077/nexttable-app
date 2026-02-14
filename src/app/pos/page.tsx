'use client'

import { useState, useEffect } from 'react'
import { getCategories, getAllMenuItems, Category, MenuItem, CartItem } from '@/app/lib/api/menu'
import { createOrder } from '@/app/lib/api/orders'
import { getFloors, getTablesByFloor, Floor, Table } from '@/app/lib/api/tables'

export default function POSPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Table selection states
  const [floors, setFloors] = useState<Floor[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showTableSelector, setShowTableSelector] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<{ order_number: string; total: number; tableLabel: string } | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  // Fetch categories and menu items
  useEffect(() => {
    async function loadData() {
      try {
        const [categoriesData, itemsData, floorsData] = await Promise.all([
          getCategories(),
          getAllMenuItems(),
          getFloors()
        ])
        setCategories(categoriesData)
        setMenuItems(itemsData)
        setFloors(floorsData)
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0])
        }
        if (floorsData.length > 0) {
          setSelectedFloor(floorsData[0])
        }
      } catch (error) {
        console.error('Error loading menu:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Fetch tables when floor changes
  useEffect(() => {
    async function loadTables() {
      if (!selectedFloor) return
      try {
        const tablesData = await getTablesByFloor(selectedFloor.id)
        setTables(tablesData)
      } catch (error) {
        console.error('Error loading tables:', error)
      }
    }
    loadTables()
  }, [selectedFloor])

  // Filter items by selected category
  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory.id && item.is_available)
    : menuItems.filter(item => item.is_available)

  // Add item to cart
  const addToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existing = prevCart.find(cartItem => cartItem.id === item.id)
      if (existing) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      }
      return [...prevCart, { ...item, quantity: 1 }]
    })
  }

  // Update quantity
  const updateQuantity = (itemId: string, change: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + change
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
        }
        return item
      }).filter(item => item.quantity > 0)
    })
  }

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId))
  }

  // Send to kitchen
  const handleSendToKitchen = async () => {
    if (cart.length === 0 || isSubmitting) return

    setIsSubmitting(true)

    try {
      const order = await createOrder({
        table_id: selectedTable?.id,
        order_type: selectedTable ? 'dine-in' : 'takeaway',
        items: cart,
        notes: selectedTable ? `Table ${selectedTable.table_number}` : 'Takeaway order'
      })

      if (order) {
        setOrderSuccess({
          order_number: order.order_number,
          total: order.total,
          tableLabel: selectedTable ? `Table ${selectedTable.table_number}` : 'Takeaway'
        })
        setCart([])
        setSelectedTable(null)
      } else {
        setOrderError('Failed to create order. Please try again.')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      setOrderError('Error creating order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate total
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Categories Sidebar */}
      <div className="w-48 bg-white border-r border-slate-200 overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-brand font-black text-lg">Categories</h2>
        </div>
        <div className="p-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className={`w-full text-left px-4 py-3 rounded-xl mb-2 font-semibold text-sm transition-colors ${
                selectedCategory?.id === category.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-brand font-black text-slate-900">
            {selectedCategory?.name || 'All Items'}
          </h1>
          
          {/* Table Selector Button */}
          <button
            onClick={() => setShowTableSelector(true)}
            className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
          >
            {selectedTable ? `🪑 Table ${selectedTable.table_number}` : '🪑 Select Table'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500">Loading menu...</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white rounded-2xl p-4 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all text-left"
              >
                <div className="aspect-square bg-slate-100 rounded-xl mb-3 flex items-center justify-center text-4xl">
                  {item.category?.icon || '🍽️'}
                </div>
                <h3 className="font-bold text-slate-900 mb-1 line-clamp-2">
                  {item.name}
                </h3>
                {item.name_bangla && (
                  <p className="text-xs text-slate-500 mb-2">{item.name_bangla}</p>
                )}
                <p className="text-lg font-brand font-black text-emerald-600">
                  ৳{item.price.toFixed(2)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-brand font-black text-xl">Current Order</h2>
          <p className="text-sm text-slate-500">{cart.length} items</p>
          {selectedTable && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
              🪑 Table {selectedTable.table_number}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="text-6xl mb-4">🛒</div>
              <p className="font-semibold">Cart is empty</p>
              <p className="text-sm">Add items to start order</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                      <p className="text-xs text-emerald-600 font-semibold">৳{item.price}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                    >
                      +
                    </button>
                    <span className="ml-auto font-bold text-slate-900">
                      ৳{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total & Send Button */}
        <div className="p-6 border-t border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-600">Total:</span>
            <span className="text-2xl font-brand font-black text-emerald-600">
              ৳{total.toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleSendToKitchen}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-95"
          >
            {isSubmitting ? '⏳ Sending...' : '🔥 Send to Kitchen'}
          </button>
        </div>
      </div>

      {/* Table Selector Modal */}
      {/* Table Selector Modal - BEAUTIFUL VERSION */}
      {showTableSelector && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-slate-900/90 to-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
          onClick={() => setShowTableSelector(false)}
        >
          <div 
            className="bg-white rounded-3xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🪑</div>
              <h2 className="text-4xl font-brand font-black text-slate-900 mb-2">
                Select Your Table
              </h2>
              <p className="text-slate-600">Choose an available table to start your order</p>
            </div>

            {/* Floor Tabs - BEAUTIFUL */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
              {floors.map(floor => (
                <button
                  key={floor.id}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-8 py-4 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                    selectedFloor?.id === floor.id
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-102'
                  }`}
                >
                  <div className="text-2xl mb-1">🏢</div>
                  {floor.name.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Available Tables Header */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                ✅ Available Tables ({tables.filter(t => t.status === 'available').length})
              </h3>
              <div className="h-1 w-20 bg-emerald-500 rounded-full"></div>
            </div>

            {/* Tables Grid - BEAUTIFUL */}
            {tables.filter(t => t.status === 'available').length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-6xl mb-4">😔</div>
                <p className="text-xl font-bold">No available tables on this floor</p>
                <p className="text-sm">Try another floor or choose takeaway</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                {tables.filter(t => t.status === 'available').map(table => (
                  <button
                    key={table.id}
                    onClick={() => {
                      setSelectedTable(table)
                      setShowTableSelector(false)
                    }}
                    className="group relative bg-gradient-to-br from-emerald-50 to-emerald-100 border-3 border-emerald-400 rounded-2xl p-6 hover:from-emerald-100 hover:to-emerald-200 hover:border-emerald-500 hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                  >
                    {/* Table Icon */}
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                      🪑
                    </div>
                    
                    {/* Table Number */}
                    <div className="text-4xl font-brand font-black text-emerald-600 mb-2">
                      {table.table_number}
                    </div>
                    
                    {/* Seats Info */}
                    <div className="flex items-center justify-center gap-1 text-emerald-700">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      <span className="text-sm font-bold">{table.seats}</span>
                    </div>

                    {/* Available Badge */}
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      FREE
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Occupied Tables Info (Optional) */}
            {tables.filter(t => t.status !== 'available').length > 0 && (
              <div className="mb-8 bg-slate-50 rounded-2xl p-4 border-2 border-slate-200">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="text-2xl">⏳</div>
                  <div>
                    <p className="font-bold text-sm">
                      {tables.filter(t => t.status !== 'available').length} tables currently occupied
                    </p>
                    <p className="text-xs">More tables will be available soon</p>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm font-bold text-slate-500">OR</span>
              </div>
            </div>

            {/* Takeaway Option - BEAUTIFUL */}
            <button
              onClick={() => {
                setSelectedTable(null)
                setShowTableSelector(false)
              }}
              className="w-full py-6 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xl shadow-lg hover:shadow-xl transition-all hover:scale-102 active:scale-95 mb-4"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">📦</span>
                <span>No Table (Takeaway/Online)</span>
              </div>
            </button>

            {/* Close Button */}
            <button
              onClick={() => setShowTableSelector(false)}
              className="w-full py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* Order Success Modal - modern & clean */}
      {orderSuccess && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOrderSuccess(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 pt-10 pb-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-brand font-black text-white">Order Created!</h3>
              <p className="text-emerald-100 text-sm font-semibold mt-1">Sent to Kitchen</p>
            </div>
            <div className="px-8 py-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Order #</span>
                <span className="font-brand font-black text-slate-900">{orderSuccess.order_number}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Table</span>
                <span className="font-bold text-slate-900">{orderSuccess.tableLabel}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Total</span>
                <span className="text-xl font-brand font-black text-emerald-600">৳{orderSuccess.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="px-8 pb-8">
              <button
                onClick={() => setOrderSuccess(null)}
                className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-colors active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Error Modal */}
      {orderError && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOrderError(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h3>
            <p className="text-slate-600 mb-6">{orderError}</p>
            <button
              onClick={() => setOrderError(null)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}