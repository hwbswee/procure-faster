interface CartItem {
  itemName: string
  description: string
  uom: string
  category: string
  qty: number
  suppliers: Record<string, { price: number }>
}

function getBestSupplier(suppliers: Record<string, { price: number }>): { supplier: string; price: number } {
  let bestSupplier = ''
  let bestPrice = Infinity
  Object.entries(suppliers).forEach(([supplier, data]) => {
    if (data.price < bestPrice) {
      bestPrice = data.price
      bestSupplier = supplier
    }
  })
  return { supplier: bestSupplier, price: bestPrice }
}

export function generateCSV(items: CartItem[]): string {
  const headers = ['Item Name', 'Category', 'Qty', 'Unit', 'Best Supplier', 'Unit Price', 'Total']

  const rows: string[][] = [headers]

  let grandTotal = 0

  items.forEach(item => {
    const { supplier, price } = getBestSupplier(item.suppliers)
    const total = price * item.qty
    grandTotal += total

    const row: string[] = [
      `"${item.itemName.replace(/"/g, '""')}"`,
      item.category,
      String(item.qty),
      item.uom,
      supplier,
      String(price.toFixed(2)),
      String(total.toFixed(2))
    ]

    rows.push(row)
  })

  // Add total row
  const totalRow = ['TOTAL', '', '', '', '', '', String(grandTotal.toFixed(2))]
  rows.push(totalRow)

  return rows.map(row => row.join(',')).join('\n')
}

export function generateJSON(items: CartItem[]): string {
  let grandTotal = 0

  const itemsWithBestPrice = items.map(item => {
    const { supplier, price } = getBestSupplier(item.suppliers)
    const total = price * item.qty
    grandTotal += total

    return {
      name: item.itemName,
      qty: item.qty,
      uom: item.uom,
      category: item.category,
      bestSupplier: supplier,
      unitPrice: price,
      subtotal: total
    }
  })

  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      itemCount: items.length,
      items: itemsWithBestPrice,
      total: parseFloat(grandTotal.toFixed(2))
    },
    null,
    2
  )
}
