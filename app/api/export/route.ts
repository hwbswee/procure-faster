import { NextRequest, NextResponse } from 'next/server'
import { generateCSV, generateJSON } from '@/lib/export'

export async function POST(request: NextRequest) {
  try {
    const items = await request.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      )
    }

    const format = request.nextUrl.searchParams.get('format') || 'csv'

    if (format === 'json') {
      const jsonData = generateJSON(items)
      return new NextResponse(jsonData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="procurement-receipt.json"',
        },
      })
    } else {
      // Default to CSV
      const csv = generateCSV(items)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="procurement-receipt.csv"',
        },
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}
