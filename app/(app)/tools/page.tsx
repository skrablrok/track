'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Wrench, AlertTriangle, Warehouse } from 'lucide-react'
import { useSession } from 'next-auth/react'
import CheckoutModal from '@/components/checkouts/CheckoutModal'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
  warehouseStocks: WarehouseStock[]
  qrCode: string
  checkouts: Array<{ id: string; user: { name: string }; project?: { name: string; location?: string } }>
}

export default function ToolsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [tools, setTools] = useState<Tool[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [filter, setFilter] = useState<'all' | 'available' | 'inuse' | 'lowstock'>('all')
  const [loading, setLoading] = useState(true)
  const [checkoutTool, setCheckoutTool] = useState<Tool | null>(null)

  const router = useRouter()
  const isAdmin = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')
  const isForeman = session?.user?.role === 'FOREMAN'

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

  const categories = Array.from(new Set(tools.map((t) => t.category).filter(Boolean)))
  const warehouses = Array.from(new Set(tools.flatMap((t) => t.warehouseStocks.map((ws) => ws.warehouse))))
  const catKeyMap: Record<string, any> = {
    'Power Tools': 'catPowerTools', 'Hand Tools': 'catHandTools',
    'Measuring Tools': 'catMeasuringTools', 'Safety Equipment': 'catSafetyEquipment',
    'Lifting Equipment': 'catLiftingEquipment', 'Other': 'catOther',
  }
  const translateCat = (c: string) => catKeyMap[c] ? t(catKeyMap[c]) : c

  const filtered = tools.filter((tool) => {
    if (warehouseFilter && !tool.warehouseStocks.some((ws) => ws.warehouse === warehouseFilter)) return false
    if (filter === 'available') return tool.currentStock > 0
    if (filter === 'inuse') return tool.checkouts.length > 0
    if (filter === 'lowstock') return tool.currentStock <= tool.minStock
    return true
  })

  function stockColor(tool: Tool) {
    if (tool.currentStock === 0) return 'bg-red-100 text-red-700'
    if (tool.currentStock <= tool.minStock) return 'bg-amber-100 text-amber-700'
    return 'bg-green-100 text-green-700'
  }

  function stockLabel(tool: Tool) {
    if (tool.currentStock === 0) return t('outOfStock')
    if (tool.currentStock <= tool.minStock) return `${t('lowStock')}: ${tool.currentStock}/${tool.totalStock}`
    return `${tool.currentStock}/${tool.totalStock} ${t('available')}`
  }

  const filterTabs = [
    { key: 'all' as const,       label: t('allTools') },
    { key: 'available' as const, label: t('available') },
    { key: 'inuse' as const,     label: t('inUse') },
    { key: 'lowstock' as const,  label: t('lowStock') },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('tools')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} {t('tools').toLowerCase()}</p>
        </div>
        {isAdmin && (
          <Link href="/tools/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus size={16} />{t('addTool')}
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={t('search') + '…'} value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="w-full h-40 bg-gray-100 rounded-xl mb-3" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{t('noTools')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tool) => (
            <div key={tool.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-blue-100 transition-all group">
              <Link href={`/tools/${tool.id}`} className="block">
                <div className="w-full h-44 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                  {tool.imageUrl ? (
                    <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <Wrench className="w-16 h-16 text-gray-300" />
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/tools/${tool.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-sm leading-tight block mb-1">
                  {tool.name}
                </Link>
                <div className="flex items-center gap-1.5 mb-1">
                  {tool.category && <p className="text-xs text-gray-400">{translateCat(tool.category)}</p>}
                  {tool.type === 'MATERIAL' && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                      {t('itemTypeMaterial')}
                    </span>
                  )}
                </div>
                {tool.warehouseStocks.length > 0 && (
                  <div className="flex flex-col gap-0.5 mb-2">
                    {tool.warehouseStocks.map((ws) => (
                      <div key={ws.warehouse} className="flex items-center gap-1">
                        <Warehouse size={11} className="text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500 truncate">{ws.warehouse}: <span className="font-medium">{ws.quantity}</span></span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stockColor(tool)}`}>
                    {stockLabel(tool)}
                  </span>
                  {tool.currentStock <= tool.minStock && tool.currentStock > 0 && (
                    <AlertTriangle size={14} className="text-amber-500" />
                  )}
                  {tool.currentStock === 0 && (
                    <span className="text-xs text-red-500 font-medium">{t('unavailable')}</span>
                  )}
                </div>

                {tool.checkouts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs text-gray-500">
                      {t('inUseBy')}: <span className="font-medium text-gray-700">{tool.checkouts[0].user.name}</span>
                    </p>
                    {tool.checkouts[0].project && (
                      <p className="text-xs text-gray-400 mt-0.5">@ {tool.checkouts[0].project.name}</p>
                    )}
                  </div>
                )}

                {isForeman ? (
                  <button onClick={() => router.push(`/requests/new?toolId=${tool.id}`)}
                    className="w-full mt-3 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium py-2 rounded-xl transition-colors">
                    {t('requestTool')}
                  </button>
                ) : tool.currentStock > 0 && (
                  <button onClick={() => setCheckoutTool(tool)}
                    className="w-full mt-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium py-2 rounded-xl transition-colors">
                    {tool.type === 'MATERIAL' ? t('useItem') : t('checkOut')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {checkoutTool && (
        <CheckoutModal tool={checkoutTool} onClose={() => setCheckoutTool(null)}
          onSuccess={() => { setCheckoutTool(null); loadTools() }} />
      )}
    </div>
  )
}
