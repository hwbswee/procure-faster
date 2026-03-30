const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path')

// Define target suppliers
const TARGET_SUPPLIERS = [
  'PACIFIC BOOKSTORES PTE. LTD.',
  'SPECIALIST STATIONERY PTE. LTD.',
  'THONG CHEW FOOD INDUSTRIES PTE LTD',
];

function processExcelData() {
  const excelPath = path.join(process.cwd(), 'data', 'Annex B-Cost Summary_11Jul2025 (Final).xlsx');
  const workbook = XLSX.readFile(excelPath);

  const items = [];

  // Process Cat A - use available suppliers
  console.log('Processing Cat A...');
  const catAItems = extractFromSheet(workbook.Sheets['Cat A-Beverages,Sugar & Creamer'], 'Cat A-Beverages');
  items.push(...catAItems);
  console.log(`  Extracted ${catAItems.length} items`);

  // Process Cat B - use available suppliers
  console.log('Processing Cat B...');
  const catBItems = extractFromSheet(workbook.Sheets['Cat B-Snack Items'], 'Cat B-Snacks');
  items.push(...catBItems);
  console.log(`  Extracted ${catBItems.length} items`);

  // Process Cat C - Disposable Pantry Items
  console.log('Processing Cat C...');
  const catCSheetName = workbook.SheetNames.find((name) => name.trim().startsWith('Cat C-Disposable Pantry Items'));
  const catCSheet = catCSheetName ? workbook.Sheets[catCSheetName] : null;
  const catCItems = catCSheet
    ? extractFromSheet(catCSheet, 'Cat C-Disposable Pantry Items')
    : [];
  items.push(...catCItems);
  console.log(`  Extracted ${catCItems.length} items`);

  console.log(`\nTotal: ${items.length} items processed`);

  // Save to file
  const outputPath = path.join(process.cwd(), 'public', 'data.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
  console.log(`✓ Saved to ${outputPath}`);
}

function extractFromSheet(sheet, category) {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find header rows
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if (raw[i].some(cell => cell && cell.toString().includes('Item Description'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    console.warn(`Could not find header in ${category}`);
    return [];
  }

  const headerRow = raw[headerIdx];
  const subHeaderRow = raw[headerIdx + 1] || [];

  // Find supplier columns - only match target suppliers
  const suppliers = {};
  for (let col = 0; col < headerRow.length; col++) {
    const cell = headerRow[col];
    if (cell) {
      const cellStr = cell.toString().trim();
      // Check if this column header matches any target supplier
      for (const targetSupplier of TARGET_SUPPLIERS) {
        if (cellStr.includes(targetSupplier.split(' ')[0])) { // Match by first word
          suppliers[cellStr] = { col, priceSubCol: -1 };

          // Find the "Unit Price" sub-header
          for (let scol = col; scol < col + 5 && scol < subHeaderRow.length; scol++) {
            const subcell = subHeaderRow[scol];
            if (subcell && subcell.toString().includes('Unit Price')) {
              suppliers[cellStr].priceSubCol = scol;
              suppliers[cellStr].halalSubCol = scol + 2; // Halal is typically 2 cols later
              break;
            }
          }
          break;
        }
      }
    }
  }

  // Extract items starting from headerIdx + 2
  const items = [];
  const itemDescCol = headerRow.findIndex(h => h && h.toString().includes('Item Description'));
  const uomCol = headerRow.findIndex(h => h && h.toString().includes('Unit of Measurement'));
  const nutriCol = headerRow.findIndex(h => h && h.toString().includes('Nutri-Grade'));
  const hcsCol = headerRow.findIndex(h => h && h.toString().includes('HCS'));

  for (let row = headerIdx + 2; row < raw.length; row++) {
    const data = raw[row];
    if (!data || !data[itemDescCol]) continue;

    const itemName = data[itemDescCol]?.toString().trim();
    if (!itemName || itemName === 'Item Description') continue;

    const supplierData = {};
    let hasPrice = false;

    // Extract supplier prices - only from suppliers we found
    for (const [supplierName, cols] of Object.entries(suppliers)) {
      if (cols.priceSubCol === -1) continue;

      const price = parseFloat(data[cols.priceSubCol] || 0);
      if (price > 0) {
        supplierData[supplierName] = {
          price: Math.round(price * 100) / 100,
          halal: (data[cols.halalSubCol]?.toString().toLowerCase().includes('yes')) || undefined
        };
        hasPrice = true;
      }
    }

    if (!hasPrice) continue;

    const item = {
      id: `${category.toLowerCase().replace(/\s/g, '-')}-${items.length}`,
      category,
      itemName,
      description: data[uomCol]?.toString().trim() || 'N/A',
      uom: data[uomCol]?.toString().trim() || 'PK',
      suppliers: supplierData
    };

    // Add compliance
    const compliance = {};
    if (nutriCol !== -1 && data[nutriCol]) {
      const nutri = data[nutriCol]?.toString().trim();
      if (nutri) compliance.nutriGrade = nutri;
    }
    if (hcsCol !== -1 && data[hcsCol]) {
      compliance.hcsLogo = data[hcsCol]?.toString().toLowerCase().includes('yes') || false;
    }
    if (Object.keys(compliance).length > 0) {
      item.compliance = compliance;
    }

    items.push(item);
  }

  return items;
}

processExcelData();
