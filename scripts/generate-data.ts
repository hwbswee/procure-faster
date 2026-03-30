import { processExcelData } from './lib/data-processor'
import * as fs from 'fs'
import * as path from 'path'

async function generate() {
  const items = await processExcelData()
  const outputPath = path.join(process.cwd(), 'public', 'data.json')
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2))
  console.log(`✓ Processed ${items.length} items`)
}

generate()
