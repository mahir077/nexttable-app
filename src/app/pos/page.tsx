'use client'

import { useState, useEffect } from 'react'
import { getCategories, getAllMenuItems, Category, MenuItem, CartItem } from '@/app/lib/api/menu'
import { createOrder } from '@/app/lib/api/orders'

export default function POSPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch categories and menu items
  useEffect(() => {
    async function loadData() {
      try {
        const [categoriesData, itemsData] = await Promise.all([
          getCategories(),
          getAllMenuItems()
        ])
        setCategories(categoriesData)
        setMenuItems(itemsData)
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0])
        }
      } catch (error) {
        console.error('Error loading menu:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter items by selected category
  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory.id)
    : menuItems

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

  // Send to kitchen - CLEAN IMPLEMENTATION
  const handleSendToKitchen = async () => {
    if (cart.length === 0 || isSubmitting) return

    setIsSubmitting(true)

    try {
      const order = await createOrder({
        order_type: 'dine-in',
        items: cart,
        notes: 'Order from POS'
      })

      if (order) {
        alert(`✅ Order Created!\n\nOrder #: ${order.order_number}\nTotal: ৳${order.total.toFixed(2)}\n\nSent to Kitchen!`)
        setCart([])
      } else {
        alert('❌ Failed to create order. Please try again.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error creating order. Please try again.')
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
        <div className="mb-4">
          <h1 className="text-2xl font-brand font-black text-slate-900">
            {selectedCategory?.name || 'All Items'}
          </h1>
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
    </div>
  )
}

