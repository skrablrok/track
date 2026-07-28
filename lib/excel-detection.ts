export type ColumnRole =
  | 'name' | 'type' | 'category' | 'quantity' | 'minStock' | 'maxStock'
  | 'description' | 'warehouse' | 'projectName' | 'projectLocation' | 'skip'

export const ROLE_LABELS: Record<ColumnRole, string> = {
  name: 'Name',
  type: 'Type (Tool/Material)',
  category: 'Category',
  quantity: 'Total Stock',
  minStock: 'Min Stock',
  maxStock: 'Max Stock',
  description: 'Description',
  warehouse: 'Warehouse',
  projectName: 'Project Name',
  projectLocation: 'Project Location',
  skip: 'Skip column',
}

export type ParsedTool = {
  name: string
  type: 'TOOL' | 'MATERIAL'
  category?: string
  quantity: number
  minStock: number
  maxStock: number
  description?: string
  warehouse?: string
  status: 'ok' | 'missingName'
  rowIndex: number
}

export type ParsedProject = {
  name: string
  location?: string
  description?: string
  status: 'ok' | 'missingName'
}

// ─── Header alias matching ────────────────────────────────────────────────────

const HEADER_ALIASES: Partial<Record<ColumnRole, string[]>> = {
  name: [
    'name', 'naziv', 'ime', 'artikel', 'item', 'product',
    'tool name', 'material name', 'orodje', 'naziv orodja', 'opis orodja',
    'tool', 'opis', 'ime in dimenzije', 'article', 'artikal',
  ],
  type: [
    'type', 'tip', 'vrsta', 'kind', 'type (tool/material)', 'item type', 'art type',
  ],
  category: [
    'category', 'kategorija', 'cat', 'group', 'skupina', 'categ', 'categories', 'klass',
  ],
  quantity: [
    'quantity', 'qty', 'stock', 'total stock', 'total qty', 'količina', 'zaloga',
    'total', 'amount', 'kolicina', 'st.', 'štt.', 'kol.', 'kol',
  ],
  minStock: [
    'min stock', 'min', 'minimum', 'min level', 'minimalna zaloga', 'minstock', 'min qty',
  ],
  maxStock: [
    'max stock', 'max', 'maximum', 'max level', 'maksimalna zaloga', 'maxstock', 'max qty',
  ],
  description: [
    'description', 'desc', 'notes', 'opomba', 'info', 'details', 'note', 'komentar',
  ],
  warehouse: [
    'warehouse', 'location', 'skladisce', 'skladišče', 'lokacija', 'depot',
    'depo', 'store', 'storage', 'место', 'where', 'loc',
  ],
  projectName: [
    'project', 'project name', 'projekt', 'ime projekta', 'project title',
  ],
  projectLocation: [
    'project location', 'lokacija projekta', 'address', 'naslov', 'project address',
  ],
}

const MATERIAL_SHEET_WORDS = [
  'material', 'materijal', 'materiale', 'malzeme', 'materiau', 'materiali',
  'consumable', 'potrošni',
]

function normalize(s: string) {
  return String(s || '').toLowerCase().trim().replace(/[\s_\-]+/g, ' ')
}

function matchHeader(h: string): ColumnRole | null {
  const n = normalize(h)
  if (!n) return null
  for (const [role, aliases] of Object.entries(HEADER_ALIASES) as [ColumnRole, string[]][]) {
    if (aliases.some((a) => n === a || n.startsWith(a + ' ') || a.startsWith(n + ' ') || n.includes(a))) {
      return role
    }
  }
  return null
}

// ─── Data-based role inference ────────────────────────────────────────────────

const MATERIAL_WORDS = [
  'material', 'materijal', 'malzeme', 'consumable', 'potrošni', 'disposable', 'za enkratno',
]
const TOOL_WORDS = [
  'tool', 'orodje', 'alat', 'mjet', 'alet', 'reusable', 'trajno',
]
const KNOWN_CATS = [
  'power tools', 'hand tools', 'measuring tools', 'safety equipment', 'lifting equipment', 'other',
  'električno', 'ročno', 'merilno', 'varnostna', 'dviganje', 'ostalo',
]

function inferRole(values: any[], assigned: Set<ColumnRole>): ColumnRole {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
  if (!nonEmpty.length) return 'skip'

  const strs = nonEmpty.map((v) => String(v).trim().toLowerCase())
  const numVals = nonEmpty.filter((v) => !isNaN(Number(String(v).trim())) && String(v).trim() !== '')
  const numRatio = numVals.length / nonEmpty.length

  // Type column: values look like "Tool"/"Material"
  if (!assigned.has('type')) {
    const typeHits = strs.filter((s) =>
      [...MATERIAL_WORDS, ...TOOL_WORDS].some((k) => s === k || s.startsWith(k))
    ).length
    if (typeHits / strs.length >= 0.4) return 'type'
  }

  // Category column: values match known categories
  if (!assigned.has('category')) {
    const catHits = strs.filter((s) => KNOWN_CATS.some((c) => s.includes(c))).length
    if (catHits / strs.length >= 0.25) return 'category'
  }

  // Numeric columns
  if (numRatio >= 0.7) {
    const nums = numVals.map((v) => Number(String(v).trim()))
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    if (!assigned.has('quantity')) return 'quantity'
    if (!assigned.has('minStock') && avg < 20) return 'minStock'
    if (!assigned.has('maxStock')) return 'maxStock'
    return 'skip'
  }

  // Text analysis
  const avgLen = strs.reduce((a, s) => a + s.length, 0) / strs.length
  const uniqueRatio = new Set(strs).size / strs.length

  if (avgLen > 50 && !assigned.has('description')) return 'description'
  if (!assigned.has('name') && uniqueRatio > 0.6) return 'name'
  if (!assigned.has('warehouse') && uniqueRatio < 0.5 && avgLen < 30) return 'warehouse'
  if (!assigned.has('description') && avgLen > 20) return 'description'
  if (!assigned.has('name')) return 'name'
  return 'skip'
}

// ─── Main detect function ─────────────────────────────────────────────────────

export type DetectResult = {
  hasHeaders: boolean
  roles: ColumnRole[]
  headerRowIndex: number
  defaultType: 'TOOL' | 'MATERIAL'
}

export function detectColumns(rawRows: any[][], sheetName?: string): DetectResult {
  // Determine default type from sheet name
  const sheetNorm = normalize(sheetName ?? '')
  const defaultType: 'TOOL' | 'MATERIAL' = MATERIAL_SHEET_WORDS.some((w) => sheetNorm.includes(w))
    ? 'MATERIAL'
    : 'TOOL'

  if (!rawRows.length) return { hasHeaders: false, roles: [], headerRowIndex: -1, defaultType }

  const numCols = Math.max(0, ...rawRows.slice(0, 30).map((r) => r.length))
  if (!numCols) return { hasHeaders: false, roles: [], headerRowIndex: -1, defaultType }

  // Scan first 30 rows to find the row with the most distinct header alias matches
  const scanLimit = Math.min(rawRows.length, 30)
  let bestRow = -1
  let bestCount = 0

  for (let r = 0; r < scanLimit; r++) {
    const seen = new Set<ColumnRole>()
    let count = 0
    for (const cell of rawRows[r]) {
      const role = matchHeader(String(cell ?? ''))
      if (role && !seen.has(role)) { seen.add(role); count++ }
    }
    if (count > bestCount) { bestCount = count; bestRow = r }
  }

  if (bestCount >= 1) {
    const headerRow = rawRows[bestRow]
    const assigned = new Set<ColumnRole>()
    const roles: ColumnRole[] = Array.from({ length: numCols }, (_, i) => {
      const m = matchHeader(String(headerRow[i] ?? ''))
      if (m && !assigned.has(m)) { assigned.add(m); return m }
      return 'skip'
    })
    return { hasHeaders: true, roles, headerRowIndex: bestRow, defaultType }
  }

  // No headers found — infer roles from data
  const assigned = new Set<ColumnRole>()
  const roles: ColumnRole[] = []
  for (let c = 0; c < numCols; c++) {
    const values = rawRows.map((row) => row[c])
    const role = inferRole(values, assigned)
    roles.push(role)
    if (role !== 'skip') assigned.add(role)
  }
  return { hasHeaders: false, roles, headerRowIndex: -1, defaultType }
}

// ─── Row parsing ──────────────────────────────────────────────────────────────

function parseType(val: string): 'TOOL' | 'MATERIAL' {
  const v = val.toLowerCase().trim()
  if (MATERIAL_WORDS.some((p) => v.includes(p))) return 'MATERIAL'
  return 'TOOL'
}

export function parseRows(
  rawRows: any[][],
  hasHeaders: boolean,
  roles: ColumnRole[],
  headerRowIndex?: number,
  defaultType: 'TOOL' | 'MATERIAL' = 'TOOL',
  excludedRows?: Set<number>
): { tools: ParsedTool[]; projects: ParsedProject[] } {
  const dataStart =
    headerRowIndex !== undefined && headerRowIndex >= 0
      ? headerRowIndex + 1
      : hasHeaders ? 1 : 0
  const dataRows = rawRows.slice(dataStart)

  const idx = (role: ColumnRole) => roles.indexOf(role)
  const get = (row: any[], role: ColumnRole) => {
    const i = idx(role)
    return i >= 0 ? String(row[i] ?? '').trim() : ''
  }

  const isProjectSheet = idx('projectName') >= 0
  const typeColAssigned = idx('type') >= 0

  const tools: ParsedTool[] = []
  const projects: ParsedProject[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const originalIdx = dataStart + i
    if (excludedRows?.has(originalIdx)) continue
    const row = dataRows[i]
    if (isProjectSheet) {
      const name = get(row, 'projectName')
      if (!name) continue
      projects.push({
        name,
        location: get(row, 'projectLocation') || undefined,
        status: 'ok',
      })
    } else {
      const name = get(row, 'name')
      if (!name) continue
      const qty = parseInt(get(row, 'quantity'))
      const typeVal = typeColAssigned ? get(row, 'type') : ''
      const itemType = typeVal ? parseType(typeVal) : defaultType
      tools.push({
        name,
        type: itemType,
        category: get(row, 'category') || undefined,
        quantity: isNaN(qty) ? 1 : Math.max(0, qty),
        minStock: parseInt(get(row, 'minStock')) || (itemType === 'MATERIAL' ? 5 : 2),
        maxStock: parseInt(get(row, 'maxStock')) || 10,
        description: get(row, 'description') || undefined,
        warehouse: get(row, 'warehouse') || undefined,
        status: 'ok',
        rowIndex: originalIdx,
      })
    }
  }

  return { tools, projects }
}
