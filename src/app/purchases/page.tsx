'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/api/tables'
import BackButton from '@/components/BackButton'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'

interface Supplier {
  id: string
  name: string
}

interface MenuItem {
  id: string
  name: string
  making_cost: number
}

interface PurchaseItem {
  menu_item_id: string
  menu_item_name: string
  quantity: number
  unit_cost: number
  total_cost: number
}

interface Purchase {
  id: string
  purchase_number: string
  supplier_id: string
  supplier: { name: string }
  purchase_date: string
  total_amount: number
  paid_amount: number
  payment_status: string
  notes: string | null
  created_at: string
}

export default function PurchasesPage() {
  const { organization } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    paid_amount: 0,
    notes: ''
  })

  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])
  const [selectedItem, setSelectedItem] = useState('')
  const [itemQuantity, setItemQuantity] = useState('')
  const [itemCost, setItemCost] = useState('')

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(name)')
        .order('purchase_date', { ascending: false })

      if (purchasesError) throw purchasesError
      setPurchases(purchasesData || [])

      // Fetch suppliers
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      setSuppliers(suppliersData || [])

      // Fetch menu items
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('id, name, making_cost')
        .order('name')

      setMenuItems(itemsData || [])
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    if (!selectedItem || !itemQuantity || !itemCost) {
      showToast('Please fill all item fields', 'error')
      return
    }

    const item = menuItems.find(i => i.id === selectedItem)
    if (!item) return

    const quantity = parseFloat(itemQuantity)
    const cost = parseFloat(itemCost)
    const total = quantity * cost

    const newItem: PurchaseItem = {
      menu_item_id: item.id,
      menu_item_name: item.name,
      quantity,
      unit_cost: cost,
      total_cost: total
    }

    setPurchaseItems([...purchaseItems, newItem])
    setSelectedItem('')
    setItemQuantity('')
    setItemCost('')
    showToast('Item added to purchase', 'success')
  }

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + item.total_cost, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier_id) {
      showToast('Please select a supplier', 'error')
      return
    }

    if (purchaseItems.length === 0) {
      showToast('Please add at least one item', 'error')
      return
    }

    try {
      const totalAmount = calculateTotal()

      // Create purchase
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          supplier_id: formData.supplier_id,
          purchase_date: formData.purchase_date,
          total_amount: totalAmount,
          paid_amount: formData.paid_amount,
          payment_status: formData.paid_amount >= totalAmount ? 'paid' :
            formData.paid_amount > 0 ? 'partial' : 'pending',
          notes: formData.notes,
          ...(organization?.id && { organization_id: organization.id }),
        })
        .select()
        .single()

      if (purchaseError) throw purchaseError

      // Create purchase items
      const items = purchaseItems.map(item => ({
        purchase_id: purchase.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        ...(organization?.id && { organization_id: organization.id }),
      }))

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(items)

      if (itemsError) throw itemsError

      // Create stock movements (IN)
      const movements = purchaseItems.map(item => ({
        menu_item_id: item.menu_item_id,
        movement_type: 'purchase',
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_value: item.total_cost,
        reference_type: 'purchase',
        reference_id: purchase.id,
        notes: `Purchase ${(purchase as Purchase).purchase_number || purchase.id}`,
        ...(organization?.id && { organization_id: organization.id }),
      }))

      const { error: movementsError } = await supabase
        .from('stock_movements')
        .insert(movements)

      if (movementsError) throw movementsError

      showToast('✅ Purchase created successfully!', 'success')

      // Reset form
      setShowForm(false)
      setFormData({
        supplier_id: '',
        purchase_date: new Date().toISOString().split('T')[0],
        paid_amount: 0,
        notes: ''
      })
      setPurchaseItems([])

      fetchData()
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to create purchase: ' + (error as Error).message, 'error')
    }
  }

  const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount, 0)
  const totalPaid = purchases.reduce((sum, p) => sum + p.paid_amount, 0)
  const totalDue = totalPurchases - totalPaid

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 lg:gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl lg:text-4xl font-brand font-black text-slate-900">📦 PURCHASES</h1>
            <p className="text-xs lg:text-sm text-slate-600">Purchase entry & history</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto px-6 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600"
        >
          + New Purchase
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="text-xs text-blue-600 mb-1">Total Purchases</div>
          <div className="text-2xl lg:text-3xl font-bold text-blue-700">৳{totalPurchases.toFixed(2)}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
          <div className="text-xs text-emerald-600 mb-1">Total Paid</div>
          <div className="text-2xl lg:text-3xl font-bold text-emerald-700">৳{totalPaid.toFixed(2)}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
          <div className="text-xs text-red-600 mb-1">Total Due</div>
          <div className="text-2xl lg:text-3xl font-bold text-red-700">৳{totalDue.toFixed(2)}</div>
        </div>
      </div>

      {/* Purchase Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">New Purchase Entry</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-2xl">×</button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Purchase Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Supplier *
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Add Items Section */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6 border-2 border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">Add Items</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <select
                    value={selectedItem}
                    onChange={(e) => {
                      setSelectedItem(e.target.value)
                      const item = menuItems.find(i => i.id === e.target.value)
                      if (item && item.making_cost) {
                        setItemCost(item.making_cost.toString())
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="">Select Item</option>
                    {menuItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    placeholder="Quantity"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  />

                  <input
                    type="number"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    placeholder="Unit Cost (৳)"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  />

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
                  >
                    + Add Item
                  </button>
                </div>

                {/* Items List */}
                {purchaseItems.length > 0 && (
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-bold">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-bold">Unit Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-bold">Total</th>
                          <th className="px-4 py-2 text-xs font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseItems.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2 font-semibold">{item.menu_item_name}</td>
                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-right">৳{item.unit_cost.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-bold">৳{item.total_cost.toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 bg-emerald-50">
                          <td colSpan={3} className="px-4 py-3 font-bold text-right">TOTAL:</td>
                          <td className="px-4 py-3 text-right font-black text-lg text-emerald-600">
                            ৳{calculateTotal().toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Paid Amount (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({...formData, paid_amount: parseFloat(e.target.value) || 0})}
                    step="0.01"
                    min="0"
                    max={calculateTotal()}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Due: ৳{(calculateTotal() - formData.paid_amount).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purchaseItems.length === 0}
                  className={`flex-1 px-4 py-3 rounded-lg font-bold ${
                    purchaseItems.length > 0
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Create Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase History */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-xl font-bold text-slate-900 mb-2">No Purchases Yet</div>
          <div className="text-slate-600 mb-4">Create your first purchase entry</div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600"
          >
            + New Purchase
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold">Purchase #</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Supplier</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Due</th>
                  <th className="px-4 py-3 text-center text-xs font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(purchase => (
                  <tr key={purchase.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{purchase.purchase_number}</td>
                    <td className="px-4 py-3">
                      {new Date(purchase.purchase_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{purchase.supplier?.name}</td>
                    <td className="px-4 py-3 text-right font-bold">৳{purchase.total_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">৳{purchase.paid_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">
                      ৳{(purchase.total_amount - purchase.paid_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        purchase.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : purchase.payment_status === 'partial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {purchase.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
