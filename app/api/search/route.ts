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
    
    // Boost scoring for multi-word queries: prioritize items matching ALL query words
    const queryWords = q.toLowerCase().split(/\s+/).filter(w => w.length > 0)
    if (queryWords.length > 1) {
      fuseResults = fuseResults.map(result => {
        const itemNameLower = result.item.itemName.toLowerCase()
        const descriptionLower = result.item.description.toLowerCase()
        const uomLower = result.item.uom.toLowerCase()
        const searchableText = `${itemNameLower} ${descriptionLower} ${uomLower}`
        
        // Check if all words match in itemName (strongest match)
        const allInItemName = queryWords.every(word => itemNameLower.includes(word))
        // Check if all words match overall
        const allWordsMatch = queryWords.every(word => searchableText.includes(word))
        
        // Aggressive boosting: much lower score for better matches
        let boostedScore = result.score || 0
        if (allInItemName) {
          boostedScore = boostedScore * 0.1 // Very strong boost
        } else if (allWordsMatch) {
          boostedScore = boostedScore * 0.3 // Moderate boost
        }
        
        return {
          ...result,
          score: boostedScore
        }
      })
      
      // Re-sort by boosted scores
      fuseResults.sort((a, b) => (a.score || 0) - (b.score || 0))
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
