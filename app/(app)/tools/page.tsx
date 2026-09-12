'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Search, Plus, Wrench, AlertTriangle, Trash2, X, Check, CheckSquare,
  MoreHorizontal, SlidersHorizontal, ChevronLeft, ChevronRight, FileSpreadsheet, Package,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import CheckoutModal from '@/components/checkouts/CheckoutModal'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { shortCode } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

type WarehouseStock = { warehouse: string; quantity: number }

type Tool = {
  id: string
  name: string
  description?: string
  category?: string
  imageUrl?: string
  type?: string
  totalStock: number
  currentStock: number
  minStock: number
  maxStock: number
  binLocation?: string | null
  warehouseStocks: WarehouseStock[]
  orderedQty?: number
  qrCode: string
  updatedAt: string
  checkouts: Array<{ id: string; user: { name: string }; project?: { name: string; location?: string } }>
}

const PAGE_SIZE = 12

export default function ToolsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [tools, setTools] = useState<Tool[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'available' | 'inuse' | 'lowstock'>('all')
  const [loading, setLoading] = useState(true)
  const [checkoutTool, setCheckoutTool] = useState<Tool | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const menuRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const role = session?.user?.role || ''
  const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(role)
  const isAdminOnly = role === 'ADMIN'
  const isManager = role === 'MANAGER'
  const isForeman = role === 'FOREMAN'

  async function loadTools() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    const res = await fetch(`/api/tools?${params}`)
    const data = await res.json()
    setTools(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadTools() }, [search, category])
  useEffect(() => { setPage(1) }, [search, category, warehouseFilter, filter])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleDeleteTool(toolId: string) {
    setDeletingId(toolId)
    const res = await fetch(`/api/tools/${toolId}`, { method: 'DELETE' })
    setDeletingId(null)
    setConfirmDeleteId(null)
    setOpenMenuId(null)
    if (res.ok) loadTools()
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setConfirmBulkDelete(false)
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await fetch('/api/tools/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      exitSelectionMode()
      loadTools()
    } finally {
      setBulkDeleting(false)
    }
  }

  const categories = Array.from(new Set(tools.map((t) => t.category).filter(Boolean)))
  const warehouses = Array.from(new Set(tools.flatMap((t) => t.warehouseStocks.map((ws) => ws.warehouse))))
  const catKeyMap: Record<string, any> = {
    'Power Tools': 'catPowerTools', 'Hand Tools': 'catHandTools',
    'Measuring Tools': 'catMeasuringTools', 'Safety Equipment': 'catSafetyEquipment',
    'Lifting Equipment': 'catLiftingEquipment', 'Other': 'catOther',
  }
  const translateCat = (c: string) => catKeyMap[c] ? t(catKeyMap[c]) : c

  const byTab = {
    all: tools,
    available: tools.filter((tool) => tool.currentStock > 0),
    inuse: tools.filter((tool) => tool.checkouts.length > 0),
    lowstock: tools.filter((tool) => tool.currentStock <= tool.minStock),
  }

  const filtered = byTab[filter].filter((tool) => {
    if (warehouseFilter && !tool.warehouseStocks.some((ws) => ws.warehouse === warehouseFilter)) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const needsAttentionCount = tools.filter((tool) => tool.currentStock <= tool.minStock).length

  function stockColor(tool: Tool) {
    if (tool.currentStock === 0) return 'bg-red-100 text-red-700'
    if (tool.currentStock <= tool.minStock) return 'bg-amber-100 text-amber-700'
    if (tool.checkouts.length > 0) return 'bg-blue-100 text-blue-700'
    return 'bg-green-100 text-green-700'
  }

  function stockLabel(tool: Tool) {
    if (tool.currentStock === 0) return t('stockCritical')
    if (tool.currentStock <= tool.minStock) return t('stockOrderNeeded')
    if (tool.checkouts.length > 0) return t('inUse')
    return t('available')
  }

  const filterTabs = [
    { key: 'all' as const,       label: t('allTools'),  count: byTab.all.length },
    { key: 'available' as const, label: t('available'), count: byTab.available.length },
    { key: 'inuse' as const,     label: t('inUse'),      count: byTab.inuse.length },
    { key: 'lowstock' as const,  label: t('lowStock'),   count: byTab.lowstock.length },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('tools')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tools.length} {t('tools').toLowerCase()}
            {needsAttentionCount > 0 && <> · <span className="text-amber-600 font-medium">{needsAttentionCount} {t('needAttention')}</span></>}
          </p>
        </div>
        {isAdminOrManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                selectionMode
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              <CheckSquare size={16} />
              {selectionMode ? t('cancel') : 'Select'}
            </button>
            {!selectionMode && (
              <>
                <Link href="/admin/import"
                  className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  <FileSpreadsheet size={16} />{t('importXlsx')}
                </Link>
                <Link href="/tools/new"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
                  <Plus size={16} />{t('addTool')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={t('search') + '…'} value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            filtersOpen || category || warehouseFilter ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          <SlidersHorizontal size={15} />{t('filtersLabel')}
        </button>
      </div>

      {filtersOpen && (categories.length > 0 || warehouses.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {categories.length > 0 && (
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">{t('allCategories')}</option>
              {categories.map((c) => <option key={c} value={c!}>{translateCat(c!)}</option>)}
            </select>
          )}
          {warehouses.length > 0 && (
            <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">{t('allWarehouses')}</option>
              {warehouses.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map(({ key, label, count }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {label}
            <span className={filter === key ? 'text-blue-100' : 'text-gray-400'}>{count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{t('noTools')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Mobile: stacked cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {pageItems.map((tool) => {
              const isSelected = selectedIds.has(tool.id)
              const pct = tool.totalStock > 0 ? Math.min(100, Math.round((tool.currentStock / tool.totalStock) * 100)) : 0
              const Row = (
                <div className="flex items-start gap-3">
                  {selectionMode && (
                    <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check size={11} className="text-white" />}
                    </div>
                  )}
                  <div className="w-11 h-11 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    {tool.imageUrl ? <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover" /> : (tool.type === 'MATERIAL' ? <Package size={16} className="text-gray-400" /> : <Wrench size={16} className="text-gray-400" />)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{tool.name}</p>
                      <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${stockColor(tool)}`}>
                        {stockLabel(tool)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {shortCode(tool)}
                      {tool.category && ` · ${translateCat(tool.category)}`}
                      {tool.binLocation && ` · ${tool.binLocation}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1">
                        <div className={`h-1 rounded-full ${pct === 0 ? 'bg-red-400' : pct <= 30 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{tool.currentStock}/{tool.totalStock}</span>
                      {!!tool.orderedQty && (
                        <span className="text-xs text-blue-600 whitespace-nowrap">· {tool.orderedQty} {t('orderedQtyLabel')}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
              return (
                <div key={tool.id} className={`p-3.5 ${isSelected ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-start gap-2">
                    {selectionMode ? (
                      <button onClick={() => toggleSelect(tool.id)} className="flex-1 text-left min-w-0">{Row}</button>
                    ) : (
                      <Link href={`/tools/${tool.id}`} className="flex-1 min-w-0">{Row}</Link>
                    )}
                    {!selectionMode && (
                      <div ref={openMenuId === tool.id ? menuRef : undefined} className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === tool.id ? null : tool.id)}
                          className="p-2 -m-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                          <MoreHorizontal size={17} />
                        </button>
                        {openMenuId === tool.id && (
                          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                            {(isManager || (!isAdminOnly && !isManager && !isForeman)) && tool.currentStock > 0 && (
                              <button onClick={() => { setCheckoutTool(tool); setOpenMenuId(null) }}
                                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                {tool.type === 'MATERIAL' ? t('useItem') : t('checkOut')}
                              </button>
                            )}
                            {isForeman && (
                              <button onClick={() => router.push(`/requests/new?toolId=${tool.id}`)}
                                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                {t('requestTool')}
                              </button>
                            )}
                            {isAdminOnly && (
                              <Link href={`/tools/${tool.id}/edit`} className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                {t('edit')}
                              </Link>
                            )}
                            {(isAdminOnly || isManager) && (
                              confirmDeleteId === tool.id ? (
                                <button onClick={() => handleDeleteTool(tool.id)} disabled={deletingId === tool.id}
                                  className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                                  {deletingId === tool.id ? '…' : t('confirmQuestion')}
                                </button>
                              ) : (
                                <button onClick={() => setConfirmDeleteId(tool.id)}
                                  className="w-full flex items-center gap-1.5 text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50">
                                  <Trash2 size={13} />{t('delete')}
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                  {selectionMode && <th className="px-4 py-3 w-10"></th>}
                  <th className="px-4 py-3 font-medium">{t('colItem')}</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">{t('colCategory')}</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">{t('colLocation')}</th>
                  <th className="px-4 py-3 font-medium">{t('colStock')}</th>
                  <th className="px-4 py-3 font-medium">{t('colStatus')}</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">{t('colUpdated')}</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((tool) => {
                  const isSelected = selectedIds.has(tool.id)
                  const pct = tool.totalStock > 0 ? Math.min(100, Math.round((tool.currentStock / tool.totalStock) * 100)) : 0
                  return (
                    <tr
                      key={tool.id}
                      onClick={selectionMode ? () => toggleSelect(tool.id) : undefined}
                      className={`border-b border-gray-50 last:border-0 transition-colors ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/60'}`}
                    >
                      {selectionMode && (
                        <td className="px-4 py-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check size={11} className="text-white" />}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 min-w-[180px]">
                        {selectionMode ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                              {tool.imageUrl ? <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover" /> : (tool.type === 'MATERIAL' ? <Package size={14} className="text-gray-400" /> : <Wrench size={14} className="text-gray-400" />)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{tool.name}</p>
                              <p className="text-xs text-gray-400">{shortCode(tool)}</p>
                            </div>
                          </div>
                        ) : (
                          <Link href={`/tools/${tool.id}`} className="flex items-center gap-2.5 group">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                              {tool.imageUrl ? <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover" /> : (tool.type === 'MATERIAL' ? <Package size={14} className="text-gray-400" /> : <Wrench size={14} className="text-gray-400" />)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">{tool.name}</p>
                              <p className="text-xs text-gray-400">{shortCode(tool)}</p>
                            </div>
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {tool.category && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{translateCat(tool.category)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500 whitespace-nowrap">
                        {tool.binLocation || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 min-w-[100px]">
                        <div className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
                          <span className="font-medium">{tool.currentStock}</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-gray-400">{tool.totalStock}</span>
                        </div>
                        <div className="w-16 bg-gray-100 rounded-full h-1 mt-1">
                          <div className={`h-1 rounded-full ${pct === 0 ? 'bg-red-400' : pct <= 30 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                        {!!tool.orderedQty && (
                          <div className="text-xs text-blue-600 whitespace-nowrap mt-0.5">{tool.orderedQty} {t('orderedQtyLabel')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${stockColor(tool)}`}>
                          {stockLabel(tool)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(tool.updatedAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                        {!selectionMode && (
                          <div ref={openMenuId === tool.id ? menuRef : undefined} className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === tool.id ? null : tool.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            {openMenuId === tool.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                                {(isManager || (!isAdminOnly && !isManager && !isForeman)) && tool.currentStock > 0 && (
                                  <button onClick={() => { setCheckoutTool(tool); setOpenMenuId(null) }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    {tool.type === 'MATERIAL' ? t('useItem') : t('checkOut')}
                                  </button>
                                )}
                                {isForeman && (
                                  <button onClick={() => router.push(`/requests/new?toolId=${tool.id}`)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    {t('requestTool')}
                                  </button>
                                )}
                                {isAdminOnly && (
                                  <Link href={`/tools/${tool.id}/edit`} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    {t('edit')}
                                  </Link>
                                )}
                                {(isAdminOnly || isManager) && (
                                  confirmDeleteId === tool.id ? (
                                    <button onClick={() => handleDeleteTool(tool.id)} disabled={deletingId === tool.id}
                                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                                      {deletingId === tool.id ? '…' : t('confirmQuestion')}
                                    </button>
                                  ) : (
                                    <button onClick={() => setConfirmDeleteId(tool.id)}
                                      className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                      <Trash2 size={13} />{t('delete')}
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>
                {t('view')} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} {t('of')} {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronLeft size={15} />
                </button>
                <span className="px-2 font-medium text-gray-700">{page}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {checkoutTool && (
        <CheckoutModal tool={checkoutTool} onClose={() => setCheckoutTool(null)}
          onSuccess={() => { setCheckoutTool(null); loadTools() }} />
      )}

      {selectionMode && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium">
            {selectedIds.size === 0 ? 'Select items to delete' : `${selectedIds.size} selected`}
          </span>
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => setSelectedIds(new Set(filtered.map((t) => t.id)))}
                className="text-xs text-gray-300 hover:text-white underline">
                Select all
              </button>
              {confirmBulkDelete ? (
                <>
                  <span className="text-xs text-red-300">Delete {selectedIds.size} item(s)?</span>
                  <button onClick={handleBulkDelete} disabled={bulkDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-60">
                    {bulkDeleting ? 'Deleting…' : 'Confirm'}
                  </button>
                  <button onClick={() => setConfirmBulkDelete(false)}
                    className="text-gray-300 hover:text-white text-xs px-2 py-2">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmBulkDelete(true)}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl">
                  <Trash2 size={13} /> Delete selected
                </button>
              )}
            </>
          )}
          <button onClick={exitSelectionMode} className="p-1.5 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
