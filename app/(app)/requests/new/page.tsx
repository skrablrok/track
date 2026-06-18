'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Search, Wrench, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Tool = {
  id: string
  name: string
  category?: string
  imageUrl?: string
  type?: string
  currentStock: number
  minStock: number
  totalStock: number
}

type RequestItem = {
  toolId: string | null
  tool: Tool | null
  itemName: string
  requestedQty: number
  notes: string
}

function NewRequestPageInner() {
  const router = useRouter()
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const preselectedToolId = searchParams.get('toolId')
  const [projects, setProjects] = useState<any[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [projectId, setProjectId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<RequestItem[]>([])
  const [toolSearch, setToolSearch] = useState('')
  const [showToolPicker, setShowToolPicker] = useState(false)
  const [customItemName, setCustomItemName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/projects?status=ACTIVE').then((r) => r.json()),
      fetch('/api/tools').then((r) => r.json()),
    ]).then(([p, toolList]) => {
      setProjects(Array.isArray(p) ? p : [])
      const tl: Tool[] = Array.isArray(toolList) ? toolList : []
      setTools(tl)
      if (preselectedToolId) {
        const found = tl.find((tool) => tool.id === preselectedToolId)
        if (found) setItems([{ toolId: found.id, tool: found, itemName: '', requestedQty: 1, notes: '' }])
      }
    })
  }, [])

  const filteredTools = tools.filter((tool) => {
    const q = toolSearch.toLowerCase()
    return (
      !items.find((i) => i.toolId === tool.id) &&
      (tool.name.toLowerCase().includes(q) || tool.category?.toLowerCase().includes(q))
    )
  })

  function addTool(tool: Tool) {
    setItems((prev) => [...prev, { toolId: tool.id, tool, itemName: '', requestedQty: 1, notes: '' }])
    setToolSearch('')
    setShowToolPicker(false)
  }

  function addCustomItem() {
    const name = customItemName.trim()
    if (!name) return
    setItems((prev) => [...prev, { toolId: null, tool: null, itemName: name, requestedQty: 1, notes: '' }])
    setCustomItemName('')
    setShowToolPicker(false)
  }

  function updateItem(idx: number, field: keyof RequestItem, value: any) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) { setError(t('noToolsAdded')); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId || null,
          notes,
          items: items.map((i) => ({ toolId: i.toolId, itemName: i.itemName, requestedQty: i.requestedQty, notes: i.notes })),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit')
      router.push('/requests')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalUnits = items.reduce((s, i) => s + i.requestedQty, 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      <div className="flex items-center gap-3">
        <Link href="/requests" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('newRequest')}</h1>
          <p className="text-sm text-gray-500">{t('constructionSite')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">{t('requestDetails')}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('constructionSite')}</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
              <option value="">{t('selectProject')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.location ? ` · ${p.location}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('additionalNotes')}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={t('additionalNotes')} rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {t('toolsAndMaterials')}
              {items.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {items.length} · {totalUnits} {t('unitsRequested')}
                </span>
              )}
            </h2>
            <button type="button" onClick={() => setShowToolPicker(true)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus size={15} /> {t('addItem')}
            </button>
          </div>

          {showToolPicker && (
            <div className="border border-blue-100 rounded-xl bg-blue-50/50 p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input autoFocus type="text" placeholder={t('searchTools')} value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredTools.slice(0, 20).map((tool) => {
                  const isMaterial = tool.type === 'MATERIAL'
                  const blocked = !isMaterial && tool.currentStock <= 0
                  return (
                    <button key={tool.id} type="button" onClick={() => !blocked && addTool(tool)} disabled={blocked}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                        blocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'
                      }`}>
                      <div className="w-8 h-8 bg-white rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {tool.imageUrl
                          ? <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover" />
                          : <Wrench size={14} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{tool.name}</p>
                        <p className="text-xs text-gray-400">{tool.category} · {tool.currentStock} {t('inStock')}</p>
                      </div>
                      {tool.currentStock <= 0 && <span className="text-xs text-red-500 font-medium">{t('outOfStock')}</span>}
                      {tool.currentStock > 0 && tool.currentStock <= tool.minStock && <AlertTriangle size={14} className="text-amber-400" />}
                    </button>
                  )
                })}
                {filteredTools.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">{t('noToolsFound')}</p>
                )}
              </div>
              <div className="border-t border-blue-100 pt-2">
                <p className="text-xs text-gray-500 mb-1.5">{t('notInInventoryHint')}</p>
                <div className="flex gap-2">
                  <input type="text" value={customItemName} onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder={t('customItemPlaceholder')}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
                  <button type="button" onClick={addCustomItem} disabled={!customItemName.trim()}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
                    {t('addCustomItem')}
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setShowToolPicker(false)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                {t('close')}
              </button>
            </div>
          )}

          {items.length === 0 && !showToolPicker && (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t('noToolsAdded')}</p>
              <button type="button" onClick={() => setShowToolPicker(true)}
                className="mt-2 text-sm text-blue-600 hover:underline">
                {t('addFirstTool')}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {items.map((item, idx) => {
              const isCustom = !item.tool
              const isMaterial = !isCustom && item.tool!.type === 'MATERIAL'
              const isCappedTool = !isCustom && !isMaterial
              const isOut = !isCustom && item.tool!.currentStock <= 0
              const exceeds = !isCustom && item.requestedQty > item.tool!.currentStock
              return (
                <div key={item.toolId ?? `custom-${idx}`} className={`border rounded-xl p-3 ${isCustom ? 'border-purple-200 bg-purple-50/30' : exceeds ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {isCustom
                        ? <AlertTriangle size={16} className="text-purple-400" />
                        : item.tool!.imageUrl
                          ? <img src={item.tool!.imageUrl} alt={item.tool!.name} className="w-full h-full object-cover" />
                          : <Wrench size={16} className="text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm">{isCustom ? item.itemName : item.tool!.name}</p>
                        <button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-xs mt-0.5">
                        {isCustom
                          ? <span className="text-purple-600 font-medium">{t('notInInventory')}</span>
                          : <span className="text-gray-400">{isOut ? t('outOfStock') : `${item.tool!.currentStock}/${item.tool!.totalStock} ${t('inStock')}`}</span>}
                      </p>
                      {exceeds && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={11} /> {t('exceedsStock')}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-xs text-gray-500">{t('qty')}:</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={item.requestedQty || ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, '')
                              const val = raw === '' ? 0 : parseInt(raw)
                              updateItem(idx, 'requestedQty', isCappedTool ? Math.min(item.tool!.currentStock, val) : val)
                            }}
                            onBlur={() => { if (!item.requestedQty) updateItem(idx, 'requestedQty', 1) }}
                            className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <input type="text" placeholder={t('itemNote')} value={item.notes}
                          onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                          className="min-w-0 flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/requests"
            className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            {t('cancel')}
          </Link>
          <button type="submit" disabled={saving || items.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? t('submitting') : t('submitRequest')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-400">…</div>}>
      <NewRequestPageInner />
    </Suspense>
  )
}
