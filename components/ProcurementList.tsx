'use client'

interface CartItem {
  id: string
  itemName: string
  description: string
  uom: string
  category: string
  qty: number
  note?: string
  suppliers: Record<string, { price: number; halal?: boolean }>
}

interface ProcurementListProps {
  items: CartItem[]
  onQtyChange?: (id: string, qty: number) => void
  onRemove?: (id: string) => void
  onNoteChange?: (id: string, note: string) => void
  showBestPrice?: boolean
}

export function ProcurementList({ items, onQtyChange, onRemove, onNoteChange }: ProcurementListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>No items added yet</p>
        <p className="text-sm mt-1">Search and add items to get started</p>
      </div>
    )
  }

  // Calculate totals per supplier
  const supplierTotals: Record<string, number> = {}
  const allSuppliers = new Set<string>()

  items.forEach(item => {
    Object.keys(item.suppliers).forEach(supplier => {
      allSuppliers.add(supplier)
      if (!supplierTotals[supplier]) supplierTotals[supplier] = 0
      supplierTotals[supplier] += (item.suppliers[supplier].price * item.qty)
    })
  })

  return (
    <div className="space-y-4">
      {/* Items Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
        <div className="bg-slate-50 border-b border-slate-200 p-3 text-sm font-medium text-slate-700 grid grid-cols-[minmax(0,1fr)_4.5rem_8.5rem_2rem] gap-4 items-center">
          <div>Item</div>
          <div className="text-center">Qty</div>
          <div className="text-right">Prices</div>
          <div aria-hidden="true"></div>
        </div>

        {items.map((item) => (
          <div key={item.id} className="border-b border-slate-100 p-3 text-sm hover:bg-slate-50/60">
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_8.5rem_2rem] gap-4 items-start">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{item.itemName}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>

              <input
                type="number"
                min="1"
                value={item.qty}
                onChange={(e) => {
                  const nextQty = Number.parseInt(e.target.value, 10)
                  if (Number.isNaN(nextQty)) return
                  onQtyChange?.(item.id, nextQty)
                }}
                className="w-full max-w-[4.5rem] justify-self-center px-2 py-1 border border-slate-300 rounded-md text-center text-slate-700"
              />

              <div className="text-right text-xs space-y-0.5 w-[8.5rem] justify-self-end">
                {Object.entries(item.suppliers)
                  .sort((a, b) => a[1].price - b[1].price)
                  .slice(0, 2)
                  .map(([supplier, data]) => (
                    <div key={supplier} className="text-slate-600">
                      <span className="text-xs font-medium">{supplier.split(' ')[0]}</span>: S${(data.price * item.qty).toFixed(2)}
                    </div>
                  ))}
              </div>

              <button
                onClick={() => onRemove?.(item.id)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 transition justify-self-end"
              >
                ✕
              </button>
            </div>

            <div className="mt-2">
              <label className="block text-[11px] uppercase tracking-[0.08em] text-slate-500 mb-1">
                Notes / Flavor
              </label>
              <input
                type="text"
                value={item.note || ''}
                onChange={(e) => onNoteChange?.(item.id, e.target.value)}
                placeholder="e.g. vanilla, less sweet, no garlic"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Supplier Totals */}
      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80">
        <p className="text-sm font-medium text-slate-800 mb-3">Total by Supplier</p>
        <div className="space-y-2">
          {Array.from(allSuppliers)
            .sort((a, b) => (supplierTotals[a] || 0) - (supplierTotals[b] || 0))
            .map(supplier => (
              <div key={supplier} className="flex justify-between items-center text-sm">
                <span className="text-slate-700">{supplier}</span>
                <span className="font-medium text-slate-800">S${(supplierTotals[supplier] || 0).toFixed(2)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
