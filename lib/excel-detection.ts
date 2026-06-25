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
    'tool', 'opis',
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
    'description', 'opis', 'desc', 'notes', 'opomba', 'info', 'details', 'note', 'komentar',
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
  'material', 'materijal', 'malzeme', 'consumable', 'potrošni', 'disposable', 'за enkratno',
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

export function detectColumns(rawRows: any[][]): { hasHeaders: boolean; roles: ColumnRole[] } {
  if (!rawRows.length || !rawRows[0].length) return { hasHeaders: false, roles: [] }

  const numCols = rawRows[0].length
  const first = rawRows[0].map((v) => String(v ?? ''))

  // Try header matching on first row
  const headerMatches = first.map(matchHeader)
  const matchCount = headerMatches.filter(Boolean).length
  const firstNumericCount = first.filter(
    (v) => !isNaN(Number(v.trim())) && v.trim() !== ''
  ).length

  if (matchCount >= 1) {
    // First row is recognizable headers
    const assigned = new Set<ColumnRole>()
    const roles: ColumnRole[] = headerMatches.map((m) => {
      if (m && !assigned.has(m)) { assigned.add(m); return m }
      return 'skip'
    })
    return { hasHeaders: true, roles }
  }

  // No header matches — decide if first row is still a header row (all text, no numbers)
  const hasHeaders = firstNumericCount === 0 && first.some((v) => v.trim() !== '')
  const dataRows = hasHeaders ? rawRows.slice(1) : rawRows

  const assigned = new Set<ColumnRole>()
  const roles: ColumnRole[] = []
  for (let c = 0; c < numCols; c++) {
    const values = dataRows.map((row) => row[c])
    const role = inferRole(values, assigned)
    roles.push(role)
    if (role !== 'skip') assigned.add(role)
  }
  return { hasHeaders, roles }
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
  roles: ColumnRole[]
): { tools: ParsedTool[]; projects: ParsedProject[] } {
  const dataRows = hasHeaders ? rawRows.slice(1) : rawRows

  const idx = (role: ColumnRole) => roles.indexOf(role)
  const get = (row: any[], role: ColumnRole) => {
    const i = idx(role)
    return i >= 0 ? String(row[i] ?? '').trim() : ''
  }

  const isProjectSheet = idx('projectName') >= 0

  const tools: ParsedTool[] = []
  const projects: ParsedProject[] = []

  for (const row of dataRows) {
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
      tools.push({
        name,
        type: parseType(get(row, 'type')),
        category: get(row, 'category') || undefined,
        quantity: isNaN(qty) ? 1 : Math.max(0, qty),
        minStock: parseInt(get(row, 'minStock')) || 2,
        maxStock: parseInt(get(row, 'maxStock')) || 10,
        description: get(row, 'description') || undefined,
        warehouse: get(row, 'warehouse') || undefined,
        status: 'ok',
      })
    }
  }

  return { tools, projects }
}
