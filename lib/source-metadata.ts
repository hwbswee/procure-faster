export const SOURCE_EXCEL_FILENAME = 'Annex B-Cost Summary_11Jul2025 (Final).xlsx'

const MONTH_MAP: Record<string, string> = {
  Jan: 'Jan',
  Feb: 'Feb',
  Mar: 'Mar',
  Apr: 'Apr',
  May: 'May',
  Jun: 'Jun',
  Jul: 'Jul',
  Aug: 'Aug',
  Sep: 'Sep',
  Oct: 'Oct',
  Nov: 'Nov',
  Dec: 'Dec',
}

export function getSourceDataAsOfLabel(filename = SOURCE_EXCEL_FILENAME): string {
  const match = filename.match(/_(\d{1,2})([A-Za-z]{3})(\d{4})/)
  if (!match) return 'the source file date'

  const [, dayRaw, monthRaw, year] = match
  const month = MONTH_MAP[monthRaw] || monthRaw
  const day = String(Number(dayRaw))
  return `${day} ${month} ${year}`
}
