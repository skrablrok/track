'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import PhotoInput from '@/components/tools/PhotoInput'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const categories = ['Power Tools', 'Hand Tools', 'Measuring Tools', 'Safety Equipment', 'Lifting Equipment', 'Other']
const categoryKeys: Record<string, any> = {
  'Power Tools': 'catPowerTools',
  'Hand Tools': 'catHandTools',
  'Measuring Tools': 'catMeasuringTools',
  'Safety Equipment': 'catSafetyEquipment',
  'Lifting Equipment': 'catLiftingEquipment',
  'Other': 'catOther',
}

type WarehouseRow = { warehouse: string; quantity: string }

export default function NewToolPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', description: '', category: '', imageUrl: '', type: 'TOOL',
    totalStock: '1', minStock: '2', maxStock: '10',
  })
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [knownWarehouses, setKnownWarehouses] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/tools/warehouses').then((r) => r.json()).then((d) => Array.isArray(d) && setKnownWarehouses(d))
  }, [])

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function addWarehouseRow() {
    setWarehouseStocks((rows) => [...rows, { warehouse: '', quantity: '1' }])
  }

  function removeWarehouseRow(i: number) {
    setWarehouseStocks((rows) => rows.filter((_, j) => j !== i))
  }

  function updateWarehouseRow(i: number, key: keyof WarehouseRow, val: string) {
    setWarehouseStocks((rows) => {
      const next = [...rows]
      next[i] = { ...next[i], [key]: val }
      return next
    })
  }

  const computedTotal = warehouseStocks.reduce((s, w) => s + (parseInt(w.quantity) || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, warehouseStocks }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to create tool')
      }
      router.push('/tools')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('addNewTool')}</h1>
          <p className="text-sm text-gray-500">{t('addNewToolSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('itemType')}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update('type', 'TOOL')}
              className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                form.type === 'TOOL' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('toolReusable')}
            </button>
            <button
              type="button"
              onClick={() => update('type', 'MATERIAL')}
              className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                form.type === 'MATERIAL' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('materialConsumable')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('toolNameReq')}</label>
            <input
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t('toolNamePlaceholder')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('descriptionOpt')}</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder={t('toolDescPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('colCategory')}</label>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            >
              <option value="">{t('selectCategory')}</option>
              {categories.map((c) => <option key={c} value={c}>{t(categoryKeys[c])}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('warehouse')}</label>
            <div className="space-y-2">
              {warehouseStocks.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    list="warehouse-options"
                    value={row.warehouse}
                    onChange={(e) => updateWarehouseRow(i, 'warehouse', e.target.value)}
                    placeholder={t('warehouse') + '…'}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => updateWarehouseRow(i, 'quantity', e.target.value)}
                    className="w-24 px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => removeWarehouseRow(i)}
                    className="p-3 border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addWarehouseRow}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
              >
                <Plus size={14} /> {t('addWarehouse')}
              </button>
            </div>
            <datalist id="warehouse-options">
              {knownWarehouses.map((w) => <option key={w} value={w} />)}
            </datalist>
          </div>

          <div className="sm:col-span-2">
            <PhotoInput value={form.imageUrl} onChange={(dataUrl) => update('imageUrl', dataUrl)} />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('stockSettings')}</h3>
          {warehouseStocks.length > 0 ? (
            <p className="text-xs text-gray-500 bg-blue-50 rounded-xl p-3 mb-4">
              {t('totalStockLabel')}: <span className="font-semibold text-blue-700">{computedTotal}</span>
              {' '}({t('warehouse').toLowerCase()} {t('stockLevel').toLowerCase()})
            </p>
          ) : null}
          <div className={`grid gap-4 ${
            warehouseStocks.length > 0
              ? (form.type === 'MATERIAL' ? 'grid-cols-1' : 'grid-cols-2')
              : (form.type === 'MATERIAL' ? 'grid-cols-2' : 'grid-cols-3')
          }`}>
            {[
              ...(warehouseStocks.length === 0 ? [{ key: 'totalStock', label: t('initialStock'), min: 1 }] : []),
              { key: 'minStock', label: t('minLevelAlert'), min: 1 },
              ...(form.type === 'MATERIAL' ? [] : [{ key: 'maxStock', label: t('maxLevelLabel'), min: 1 }]),
            ].map(({ key, label, min }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                <input
                  type="number"
                  min={min}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => update(key, e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-center"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/tools" className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            {t('cancel')}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? t('creating') : t('createTool')}
          </button>
        </div>
      </form>
    </div>
  )
}
