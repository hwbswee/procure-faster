import { NextRequest, NextResponse } from 'next/server'

interface ImportedItem {
  id?: string
  itemName: string
  description: string
  uom: string
  category: string
  qty: number
  note?: string
  suppliers: Record<string, { price: number; halal?: boolean }>
}

interface ImportPayload {
  items?: ImportedItem[]
  // Support both our export format and direct cart item format
  generatedAt?: string
  itemCount?: number
  total?: number
}

export async function POST(request: NextRequest) {
  try {
    const data: unknown = await request.json()

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      )
    }

    const payload = data as ImportPayload

    // Handle our export format
    let items: ImportedItem[] = []

    if ('items' in payload && Array.isArray(payload.items)) {
      items = payload.items
    } else if (Array.isArray(payload)) {
      items = payload as ImportedItem[]
    } else {
      return NextResponse.json(
        { error: 'No items array found in JSON. Expected items[] or array of items.' },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided in the JSON file' },
        { status: 400 }
      )
    }

    // Validate each item has required fields
    const errors: string[] = []
    items.forEach((item, index) => {
      if (!item.itemName?.trim()) {
        errors.push(`Item ${index + 1}: Missing itemName`)
      }
      if (!item.category?.trim()) {
        errors.push(`Item ${index + 1}: Missing category`)
      }
      if (!item.uom?.trim()) {
        errors.push(`Item ${index + 1}: Missing uom`)
      }
      if (!item.suppliers || typeof item.suppliers !== 'object') {
        errors.push(`Item ${index + 1}: Missing or invalid suppliers`)
      }
    })

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    // Return validated items - client will handle merging with cart
    return NextResponse.json(
      {
        success: true,
        itemCount: items.length,
        items: items.map(item => ({
          ...item,
          id: item.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          qty: item.qty || 1,
          note: item.note || '',
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to process JSON file' },
      { status: 500 }
    )
  }
}
