import { NextRequest, NextResponse } from 'next/server'
import data from '@/public/data.json'
import Fuse from 'fuse.js'

interface Item {
  id: string
  category: string
  itemName: string
  description: string
  uom: string
  suppliers: Record<string, { price: number; halal?: boolean }>
  compliance?: Record<string, unknown>
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const q = (searchParams.get('q') || '').trim()
  const categories = searchParams.getAll('category') || []
  const limit = Number(searchParams.get('limit') || 30)
  const resultLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 30

  if (!q && categories.length === 0) {
    return NextResponse.json([]) // Return empty if no query or category
  }

  let results: Item[] = data as Item[]

  // Filter by categories if specified
  if (categories.length > 0) {
    results = results.filter(item => categories.includes(item.category))
  }

  // Search query with fuzzy matching and relevance ranking.
  if (q) {
    const fuse = new Fuse(results, {
      keys: [
        { name: 'itemName', weight: 0.65 },
        { name: 'description', weight: 0.25 },
        { name: 'category', weight: 0.1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 2,
    })

    results = fuse.search(q).map(result => result.item)
  } else {
    // Default browse mode: show affordable items first to speed up quick adding.
    results.sort((a, b) => {
      const aBest = Math.min(...Object.values(a.suppliers).map(s => s.price))
      const bBest = Math.min(...Object.values(b.suppliers).map(s => s.price))

      if (aBest !== bBest) return aBest - bBest
      return a.itemName.localeCompare(b.itemName)
    })
  }

  return NextResponse.json(results.slice(0, resultLimit))
}
