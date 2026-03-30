'use client'

interface ItemCardProps {
  item: {
    id: string
    itemName: string
    description: string
    uom: string
    category: string
    suppliers: Record<string, { price: number; halal?: boolean }>
  }
  onAdd?: (item: ItemCardProps['item']) => void
}

export function ItemCard({ item, onAdd }: ItemCardProps) {
  const suppliers = Object.entries(item.suppliers).sort((a, b) => a[1].price - b[1].price)
  const bestPrice = suppliers[0]?.[1].price || 0

  return (
    <div className="border border-slate-200 rounded-xl p-4 transition bg-white hover:border-slate-300">
      {/* Item Header */}
      <div className="mb-3">
        <p className="font-semibold text-slate-800 text-sm leading-snug">{item.itemName}</p>
        <p className="text-xs text-slate-500 mt-1">{item.description} • {item.uom}</p>
      </div>

      {/* Category Badge */}
      <div className="mb-4">
        <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
          {item.category.split('-')[1]?.trim()}
        </span>
      </div>

      {/* Supplier Prices - Cleaner Layout */}
      <div className="space-y-2 mb-4">
        {suppliers.map(([supplier, data]) => (
          <div key={supplier} className="flex justify-between items-center py-1.5 px-2 bg-slate-50/70 rounded-lg">
            <span className="text-xs font-medium text-slate-700">{supplier.split(' ')[0]}</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${data.price === bestPrice ? 'text-emerald-700' : 'text-slate-800'}`}>
                S${data.price.toFixed(2)}
              </span>
              {data.price === bestPrice && (
                <span className="text-xs font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Best</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={() => onAdd?.(item)}
        className="w-full text-sm py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
      >
        + Add to list
      </button>
    </div>
  )
}
