'use client'

import { useEffect, useState } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { CategoryFilter } from '@/components/CategoryFilter'
import { ProcurementList } from '@/components/ProcurementList'

interface CartItem {
  id: string
  itemName: string
  description: string
  uom: string
  category: string
  qty: number
  suppliers: Record<string, { price: number; halal?: boolean }>
}

interface SavedTemplate {
  id: string
  name: string
  items: CartItem[]
  createdAt: string
}

const TEMPLATE_STORAGE_KEY = 'procure-fast:templates'

export default function Home() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templates, setTemplates] = useState<SavedTemplate[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as SavedTemplate[]
      if (Array.isArray(parsed)) {
        setTemplates(parsed)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }, [])

  const persistTemplates = (nextTemplates: SavedTemplate[]) => {
    setTemplates(nextTemplates)
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates))
  }

  const handleSaveTemplate = () => {
    const name = templateName.trim()
    if (!name || cart.length === 0) return

    const template: SavedTemplate = {
      id: `tpl-${Date.now()}`,
      name,
      items: cart,
      createdAt: new Date().toISOString(),
    }

    const nextTemplates = [template, ...templates].slice(0, 12)
    persistTemplates(nextTemplates)
    setTemplateName('')
  }

  const handleLoadTemplate = (templateId: string) => {
    const target = templates.find((template) => template.id === templateId)
    if (!target) return

    setCart(target.items)
    const categories = Array.from(new Set(target.items.map((item) => item.category)))
    setSelectedCategories(categories)
  }

  const handleDeleteTemplate = (templateId: string) => {
    const nextTemplates = templates.filter((template) => template.id !== templateId)
    persistTemplates(nextTemplates)
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleAddItem = (item: Omit<CartItem, 'qty'>) => {
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      setCart(cart.map(c =>
        c.id === item.id ? { ...c, qty: c.qty + 1 } : c
      ))
    } else {
      setCart([...cart, { ...item, qty: 1 }])
    }
  }

  const handleQtyChange = (id: string, qty: number) => {
    if (qty < 1) return
    setCart(cart.map(c => c.id === id ? { ...c, qty } : c))
  }

  const handleRemove = (id: string) => {
    setCart(cart.filter(c => c.id !== id))
  }

  // Calculate best price per item and total
  const calculateBestPrice = (item: CartItem) => {
    return Math.min(...Object.values(item.suppliers).map(s => s.price))
  }

  const bestPriceTotal = cart.reduce((acc, item) => {
    const bestPrice = calculateBestPrice(item)
    return acc + (bestPrice * item.qty)
  }, 0)

  const handleExportCSV = async () => {
    if (cart.length === 0) return

    setIsExporting(true)
    try {
      const response = await fetch('/api/export?format=csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cart),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `procurement-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-app-surface">
      <div className="max-w-7xl mx-auto px-5 py-8 sm:px-8 sm:py-10">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-800 mb-2">Procure Fast</h1>
          <p className="text-sm text-slate-600">Browse by category, then add items in one click.</p>
        </div>

        {/* Category Filter */}
        <div className="mb-7 sm:mb-8">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">Categories</p>
          <CategoryFilter selectedCategories={selectedCategories} onCategoryToggle={handleCategoryToggle} />
        </div>

        {selectedCategories.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center py-20 sm:py-24 border border-slate-200 bg-white rounded-2xl">
            <div className="text-center px-5">
              <p className="text-lg text-slate-600 font-medium">Choose categories to start browsing</p>
              <p className="text-sm text-slate-500 mt-2">You can add items directly without typing a search term.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-7">
            {/* Left Column - Search (3 cols) */}
            <div className="lg:col-span-3">
              <div>
                <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">Find Items</h2>
                <SearchBar onItemAdd={handleAddItem} selectedCategories={selectedCategories} />
              </div>
            </div>

            {/* Right Column - Cart Summary (1 col) */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 h-fit sticky top-6">
                <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-4">
                  Your List
                  {cart.length > 0 && <span className="font-medium ml-2 text-slate-700">({cart.length})</span>}
                </h2>

                {cart.length === 0 ? (
                  <p className="text-sm text-slate-500">Add items from the browse list to build your order.</p>
                ) : (
                  <div className="space-y-4">
                    {/* Best Price Total */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                      <p className="text-xs uppercase tracking-[0.12em] text-emerald-700/80 mb-1">Best Price Total</p>
                      <p className="text-2xl font-semibold text-emerald-800">S${bestPriceTotal.toFixed(2)}</p>
                    </div>

                    {/* Item Count & Download */}
                    <button
                      onClick={handleExportCSV}
                      disabled={isExporting}
                      className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isExporting ? 'Generating...' : 'Download CSV'}
                    </button>
                  </div>
                )}

                <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">Saved Templates</p>

                  <div className="flex flex-col sm:flex-row gap-2 mb-1">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name"
                      className="h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:flex-1 sm:basis-0 sm:min-w-0"
                    />
                    <button
                      onClick={handleSaveTemplate}
                      disabled={cart.length === 0 || templateName.trim().length === 0}
                      className="h-10 w-full sm:w-auto sm:shrink-0 px-3 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">Save your current list and reload it in one click.</p>

                  {templates.length === 0 ? (
                    <p className="text-sm text-slate-500 pt-0.5">No saved templates yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-auto pr-1">
                      {templates.map((template) => (
                        <div key={template.id} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/70">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{template.name}</p>
                              <p className="text-xs text-slate-500">{template.items.length} items</p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleLoadTemplate(template.id)}
                                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                                aria-label={`Delete template ${template.name}`}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Width - Cart Details */}
        {cart.length > 0 && selectedCategories.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-4">Items in List</h2>
            <ProcurementList
              items={cart}
              onQtyChange={handleQtyChange}
              onRemove={handleRemove}
              showBestPrice={true}
            />
          </div>
        )}
      </div>
    </main>
  )
}
