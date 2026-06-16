'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import PhotoInput from '@/components/tools/PhotoInput'

const categories = ['Power Tools', 'Hand Tools', 'Measuring Tools', 'Safety Equipment', 'Lifting Equipment', 'Other']

export default function NewToolPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', description: '', category: '', imageUrl: '', type: 'TOOL',
    totalStock: '1', minStock: '2', maxStock: '10',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
          <h1 className="text-2xl font-bold text-gray-900">Add New Tool</h1>
          <p className="text-sm text-gray-500">Create a new tool in inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update('type', 'TOOL')}
              className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                form.type === 'TOOL' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Tool (reusable, returned)
            </button>
            <button
              type="button"
              onClick={() => update('type', 'MATERIAL')}
              className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                form.type === 'MATERIAL' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Material (consumed, not returned)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tool Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Cordless Drill"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Brief description of the tool…"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <PhotoInput value={form.imageUrl} onChange={(dataUrl) => update('imageUrl', dataUrl)} />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Stock Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'totalStock', label: 'Initial Stock', min: 1 },
              { key: 'minStock', label: 'Min Level (Alert)', min: 1 },
              { key: 'maxStock', label: 'Max Level', min: 1 },
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
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create Tool'}
          </button>
        </div>
      </form>
    </div>
  )
}
