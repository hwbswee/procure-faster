'use client'

import { useState, useEffect } from 'react'
import { ItemCard } from './ItemCard'

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

  return (
    <div className="mb-6">
      <input
        type="text"
        placeholder="Start typing to narrow results, or browse below"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3.5 border border-slate-200 bg-white rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
        <p>
          {query.trim().length > 0 ? 'Filtered Results' : 'Quick Browse'}
        </p>
        {hasLoaded && !loading && (
          <p>{results.length} item{results.length === 1 ? '' : 's'}</p>
        )}
      </div>

      <div className="mt-3 border border-slate-200 bg-white rounded-2xl p-3 sm:p-4 min-h-[240px]">
        {loading && (
          <div className="h-44 flex items-center justify-center text-slate-500 text-sm">Finding items...</div>
        )}

        {!loading && hasLoaded && results.length === 0 && (
          <div className="h-44 flex items-center justify-center text-slate-500 text-sm">{emptyStateText}</div>
        )}

        {!loading && hasLoaded && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {results.map((item) => (
              <div key={item.id}>
                <ItemCard item={item} onAdd={onItemAdd} />
              </div>
            ))}
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
