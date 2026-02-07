'use client'

import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  const [formData, setFormData] = useState({
    display_name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    vat_number: '',
    vat_rate: 0,
    vat_type: 'exclusive',
    primary_color: '#10b981',
    secondary_color: '#0f172a',
    show_nexttable_branding: true,
    invoice_footer_text: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/settings')
      const result = await response.json()

      if (result.success && result.data) {
        setFormData({
          display_name: result.data.display_name || '',
          address: result.data.address || '',
          city: result.data.city || '',
          phone: result.data.phone || '',
          email: result.data.email || '',
          vat_number: result.data.vat_number || '',
          vat_rate: result.data.vat_rate || 0,
          vat_type: result.data.vat_type || 'exclusive',
          primary_color: result.data.primary_color || '#10b981',
          secondary_color: result.data.secondary_color || '#0f172a',
          show_nexttable_branding: result.data.show_nexttable_branding ?? true,
          invoice_footer_text: result.data.invoice_footer_text || '',
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      alert('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.display_name.trim()) {
      alert('Restaurant name is required!')
      return
    }

    try {
      setIsSaving(true)
      setSuccessMessage('')

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage('✅ Settings saved successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        alert('Failed to save settings: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2">
            <span className="text-slate-900">Next</span>
            <span className="text-emerald-500">Table</span>
          </h1>
          <p className="text-slate-600 text-sm">RESTAURANT CONTROL HUB</p>
          <h2 className="text-2xl font-bold text-slate-900 mt-4">
            ⚙️ Restaurant Settings
          </h2>
          <p className="text-slate-600 mt-1">
            Configure your restaurant information
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-emerald-100 border-2 border-emerald-500 rounded-[2rem] p-6 animate-pulse">
            <p className="text-emerald-700 font-semibold text-center">
              {successMessage}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-white rounded-[2rem] shadow-lg p-8 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              🏪 Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Spice Garden Restaurant"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g., House 123, Road 4, Gulshan"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g., Dhaka"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g., +880 1234-567890"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g., info@restaurant.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-lg p-8 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              💰 Tax & Charges
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  VAT Registration Number
                </label>
                <input
                  type="text"
                  name="vat_number"
                  value={formData.vat_number}
                  onChange={handleChange}
                  placeholder="e.g., 123456789"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  VAT Rate (%)
                </label>
                <input
                  type="number"
                  name="vat_rate"
                  value={formData.vat_rate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g., 5.00"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  VAT Type
                </label>
                <select
                  name="vat_type"
                  value={formData.vat_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                >
                  <option value="exclusive">Exclusive (Added to price)</option>
                  <option value="inclusive">Inclusive (Included in price)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-lg p-8 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              🎨 Branding
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="h-12 w-20 rounded-xl border-2 border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="h-12 w-20 rounded-xl border-2 border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondary_color}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 bg-slate-50"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="show_nexttable_branding"
                    checked={formData.show_nexttable_branding}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 rounded border-2 border-slate-300 text-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    Show "Powered by NextTable" on invoices
                  </span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Invoice Footer Text
                </label>
                <textarea
                  name="invoice_footer_text"
                  value={formData.invoice_footer_text}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g., Thank you for dining with us!"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={fetchSettings}
              disabled={isSaving}
              className="px-8 py-4 rounded-[1.5rem] border-2 border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-4 rounded-[1.5rem] bg-emerald-500 text-white font-bold shadow-lg hover:bg-emerald-600 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : '💾 Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}