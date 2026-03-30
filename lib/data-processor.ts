import { read, utils, type WorkSheet } from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { SOURCE_EXCEL_FILENAME } from './source-metadata'

interface Item {
  id: string
  category: Category
  itemName: string
  description: string
  uom: string
  suppliers: Record<string, { price: number; halal?: boolean }>
  compliance?: {
    nutriGrade?: string
    hcsLogo?: boolean
    halal?: boolean
  }
}

type Category = 'Cat A-Beverages' | 'Cat B-Snacks' | 'Cat C-Disposable Pantry Items'

type SheetCell = string | number | boolean | null | undefined
type MatrixRow = SheetCell[]

const SUPPLIERS = [
  'PACIFIC BOOKSTORES',
  'SPECIALIST STATIONERY',
  'THONG CHEW FOOD INDUSTRIES',
]

export async function processExcelData(): Promise<Item[]> {
  const excelPath = path.join(process.cwd(), 'data', SOURCE_EXCEL_FILENAME)
  const workbook = read(fs.readFileSync(excelPath))

  const items: Item[] = []

  // Process Cat A - Beverages
  const catASheet = workbook.Sheets['Cat A-Beverages,Sugar & Creamer']
  if (catASheet) {
    const catAItems = extractSuppliersFromSheet(catASheet, 'Cat A-Beverages')
    items.push(...catAItems)
  }

  // Process Cat B - Snacks
  const catBSheet = workbook.Sheets['Cat B-Snack Items']
  if (catBSheet) {
    const catBItems = extractSuppliersFromSheet(catBSheet, 'Cat B-Snacks')
    items.push(...catBItems)
  }

  // Process Cat C - Disposable Pantry Items
  const catCSheetName = workbook.SheetNames.find((name) => name.trim().startsWith('Cat C-Disposable Pantry Items'))
  if (catCSheetName) {
    const catCSheet = workbook.Sheets[catCSheetName]
    if (catCSheet) {
      const catCItems = extractSuppliersFromSheet(catCSheet, 'Cat C-Disposable Pantry Items')
      items.push(...catCItems)
    }
  }

  return items
}

function extractSuppliersFromSheet(
  sheet: WorkSheet,
  category: Category
): Item[] {
  const items: Item[] = []
  const matrix = utils.sheet_to_json(sheet, { header: 1, defval: '' }) as MatrixRow[]

  if (!matrix || matrix.length === 0) return items

  // Find the header row (contains item description and supplier names)
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(matrix.length, 50); i++) {
    const row = matrix[i]
    if (row.some(cell => typeof cell === 'string' && cell.includes('Item Description'))) {
      headerRowIdx = i
      break
    }
  }

  if (headerRowIdx === -1) {
    console.warn(`Could not find header row in ${category}`)
    return items
  }

  const headers = matrix[headerRowIdx] || []

  // Find supplier columns
  const supplierCols: Record<string, { priceCol: number; halalCol?: number }> = {}
  SUPPLIERS.forEach(supplier => {
    const idx = headers.findIndex((h) => typeof h === 'string' && h.includes(supplier))
    if (idx !== -1) {
      supplierCols[supplier] = { priceCol: idx }
      // Halal column is typically next or nearby
      if (idx + 1 < headers.length) {
        supplierCols[supplier].halalCol = idx + 1
      }
    }
  })

  // Find column indices for standard fields
  const itemDescIdx = headers.findIndex((h) => typeof h === 'string' && h.includes('Item Description'))
  const uomIdx = headers.findIndex((h) => typeof h === 'string' && h.includes('Unit') && h.includes('Measurement'))
  const nutriGradeIdx = headers.findIndex((h) => typeof h === 'string' && h.includes('Nutri-Grade'))
  const hcsLogoIdx = headers.findIndex((h) => typeof h === 'string' && h.includes('HCS'))
  const halalIdx = headers.findIndex((h) => typeof h === 'string' && h.includes('Halal') && !h.includes('Halal Certified'))

  // Process data rows
  for (let i = headerRowIdx + 1; i < matrix.length; i++) {
    const row = matrix[i]
    if (!row || !row[itemDescIdx]) continue

    const itemName = String(row[itemDescIdx]).trim()
    if (!itemName) continue

    const suppliers: Record<string, { price: number; halal?: boolean }> = {}
    let hasPrice = false

    // Extract supplier prices
    for (const [supplierName, cols] of Object.entries(supplierCols)) {
      const priceStr = String(row[cols.priceCol] || '').trim()
      const price = parseFloat(priceStr)

      if (!isNaN(price) && price > 0) {
        suppliers[supplierName] = { price: Math.round(price * 100) / 100 }
        hasPrice = true

        if (cols.halalCol !== undefined) {
          const halalStr = String(row[cols.halalCol] || '').trim().toLowerCase()
          if (halalStr === 'yes' || halalStr === 'y') {
            suppliers[supplierName].halal = true
          }
        }
      }
    }

    if (!hasPrice) continue

    const item: Item = {
      id: `${category.toLowerCase().replace(/\s/g, '-')}-${items.length}`,
      category,
      itemName,
      description: uomIdx !== -1 ? String(row[uomIdx] || 'N/A').trim() : 'N/A',
      uom: uomIdx !== -1 ? String(row[uomIdx] || 'PK').trim() : 'PK',
      suppliers,
    }

    // Add compliance info
    const compliance: Item['compliance'] = {}
    if (nutriGradeIdx !== -1 && row[nutriGradeIdx]) {
      compliance.nutriGrade = String(row[nutriGradeIdx]).trim()
    }
    if (hcsLogoIdx !== -1 && row[hcsLogoIdx]) {
      const hcsStr = String(row[hcsLogoIdx]).trim().toLowerCase()
      compliance.hcsLogo = hcsStr === 'yes' || hcsStr === 'y'
    }
    if (halalIdx !== -1 && row[halalIdx]) {
      const hStr = String(row[halalIdx]).trim().toLowerCase()
      compliance.halal = hStr === 'yes' || hStr === 'y'
    }

    if (Object.keys(compliance).length > 0) {
      item.compliance = compliance
    }

    items.push(item)
  }

  return items
}
