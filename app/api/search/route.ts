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
        { name: 'description', weight: 0.15 },
        { name: 'uom', weight: 0.15 },
        { name: 'category', weight: 0.05 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 2,
    })

    let fuseResults = fuse.search(q)
    
    // Boost scoring for multi-word queries: boost items matching ALL query words
    const queryWords = q.toLowerCase().split(/\s+/).filter(w => w.length > 0)
    if (queryWords.length > 1) {
      fuseResults = fuseResults.map(result => {
        const searchableText = `${result.item.itemName} ${result.item.description} ${result.item.uom}`.toLowerCase()
        const allWordsMatch = queryWords.every(word => searchableText.includes(word))
        
        // Reduce score for items matching all words (lower = better in Fuse)
        return {
          ...result,
          score: allWordsMatch ? (result.score || 0) * 0.5 : result.score
        }
      })
    }

    results = fuseResults.map(result => result.item)
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
