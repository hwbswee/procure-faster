'use client'

import { useState, useEffect } from 'react'

interface SearchResult {
  id: string
  itemName: string
  description: string
  uom: string
  category: string
  suppliers: Record<string, { price: number; halal?: boolean }>
}

interface SearchBarProps {
  onItemAdd?: (item: SearchResult) => void
  selectedCategories?: string[]
}

export function SearchBar({ onItemAdd, selectedCategories = [] }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [density, setDensity] = useState<'compact' | 'detailed'>('compact')
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (selectedCategories.length === 0) {
      setResults([])
      setHasLoaded(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const categoryParams = selectedCategories.map(c => `category=${encodeURIComponent(c)}`).join('&')
        const queryParam = query.trim().length > 0 ? `q=${encodeURIComponent(query.trim())}&` : ''
        const res = await fetch(`/api/search?${queryParam}${categoryParams}&limit=40`)
        const data = await res.json()
        setResults(data)
        setHasLoaded(true)
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => clearTimeout(timer)
  }, [query, selectedCategories])

  const emptyStateText = query.trim().length > 0
    ? 'No matching items. Try a broader keyword.'
    : 'No items in selected categories.'

  const isQuickBrowse = query.trim().length === 0
  const rowPadding = density === 'compact' ? 'py-2.5' : 'py-3.5'

  const toggleExpandedRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <div className="mb-6">
      <input
        type="text"
        placeholder="Start typing to narrow results, or browse below"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3.5 border border-slate-200 bg-white rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 px-1">
        <div className="flex items-center gap-3 min-w-0">
          <p>{isQuickBrowse ? 'Quick Browse' : 'Filtered Results'}</p>
          {hasLoaded && !loading && (
            <p>{results.length} item{results.length === 1 ? '' : 's'}</p>
          )}
        </div>

        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setDensity('compact')}
            className={`h-7 px-2.5 rounded-md transition ${
              density === 'compact'
                ? 'bg-slate-100 text-slate-700 font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Compact
          </button>
          <button
            type="button"
            onClick={() => setDensity('detailed')}
            className={`h-7 px-2.5 rounded-md transition ${
              density === 'detailed'
                ? 'bg-slate-100 text-slate-700 font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Detailed
          </button>
        </div>
      </div>

      <div className="mt-3 border border-slate-200 bg-white rounded-2xl p-3 sm:p-4 min-h-[240px]">
        {loading && (
          <div className="h-44 flex items-center justify-center text-slate-500 text-sm">Finding items...</div>
        )}

        {!loading && hasLoaded && results.length === 0 && (
          <div className="h-44 flex items-center justify-center text-slate-500 text-sm">{emptyStateText}</div>
        )}

        {!loading && hasLoaded && results.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)_5.5rem_10.5rem_6.5rem] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-[0.08em] text-slate-500 font-medium">
              <p>Item</p>
              <p>Category</p>
              <p className="text-right">Best</p>
              <p className="text-right">Supplier Prices</p>
              <p className="text-right">Action</p>
            </div>

            <div className="max-h-[560px] overflow-auto">
              {results.map((item) => {
                const sortedSuppliers = Object.entries(item.suppliers).sort((a, b) => a[1].price - b[1].price)
                const bestPrice = sortedSuppliers[0]?.[1].price ?? 0
                const categoryLabel = item.category.split('-')[1]?.trim() || item.category
                const isExpanded = !!expandedRows[item.id]
                const shouldShowExpand = item.itemName.length > 54

                return (
                  <div
                    key={item.id}
                    className={`border-b border-slate-100 last:border-b-0 px-4 ${rowPadding} hover:bg-slate-50/70 transition`}
                  >
                    <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)_5.5rem_10.5rem_6.5rem] gap-3 items-center">
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium text-slate-800 leading-snug"
                          title={item.itemName}
                          style={
                            density === 'compact' && !isExpanded
                              ? {
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }
                              : undefined
                          }
                        >
                          {item.itemName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {density === 'compact' ? item.uom : `${item.description} • ${item.uom}`}
                        </p>
                        {density === 'compact' && shouldShowExpand && (
                          <button
                            type="button"
                            onClick={() => toggleExpandedRow(item.id)}
                            className="mt-1 text-[11px] text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
                          >
                            {isExpanded ? 'Show less' : 'View full name'}
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 truncate">{categoryLabel}</p>

                      <p className="text-right text-sm font-semibold text-emerald-700">
                        S${bestPrice.toFixed(2)}
                      </p>

                      <div className="text-right text-xs text-slate-600 space-y-0.5">
                        <p>
                          {sortedSuppliers[0]?.[0]?.split(' ')[0] || '-'}: S${sortedSuppliers[0]?.[1]?.price.toFixed(2) || '0.00'}
                        </p>
                        {density === 'detailed' && (
                          <p>
                            {sortedSuppliers[1]?.[0]?.split(' ')[0] || 'No 2nd supplier'}
                            {sortedSuppliers[1] ? `: S$${sortedSuppliers[1][1].price.toFixed(2)}` : ''}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => onItemAdd?.(item)}
                        className="justify-self-end h-8 px-3 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        + Add
                      </button>
                    </div>

                    <div className="md:hidden space-y-2">
                      <div>
                        <p
                          className="text-sm font-medium text-slate-800 leading-snug"
                          title={item.itemName}
                          style={
                            density === 'compact' && !isExpanded
                              ? {
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }
                              : undefined
                          }
                        >
                          {item.itemName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {density === 'compact' ? item.uom : item.description}
                        </p>
                        {density === 'compact' && shouldShowExpand && (
                          <button
                            type="button"
                            onClick={() => toggleExpandedRow(item.id)}
                            className="mt-1 text-[11px] text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
                          >
                            {isExpanded ? 'Show less' : 'View full name'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-600 min-w-0">
                          <p className="truncate">{categoryLabel} • {item.uom}</p>
                          <p className="text-emerald-700 font-semibold mt-0.5">Best S${bestPrice.toFixed(2)}</p>
                          {density === 'detailed' && sortedSuppliers[1] && (
                            <p className="text-slate-500 mt-0.5">
                              Next: {sortedSuppliers[1][0].split(' ')[0]} S${sortedSuppliers[1][1].price.toFixed(2)}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => onItemAdd?.(item)}
                          className="h-8 px-3 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && !hasLoaded && (
          <div className="h-44 flex items-center justify-center text-slate-500 text-sm">
            Select a category to start browsing.
          </div>
        )}
      </div>
    </div>
  )
}
