'use client'

import { useState, useEffect } from 'react'
import { X, Wrench, MapPin, FileText } from 'lucide-react'

interface Props {
  tool: { id: string; name: string; currentStock: number; totalStock: number; type?: string }
  onClose: () => void
  onSuccess: () => void
}

export default function CheckoutModal({ tool, onClose, onSuccess }: Props) {
  const isMaterial = tool.type === 'MATERIAL'
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/projects?status=ACTIVE')
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId: tool.id, projectId: projectId || null, quantity, notes }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed')
      }
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">{isMaterial ? 'Use Material' : 'Check Out Tool'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{tool.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
          )}

          <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-800">{tool.name}</span>
            </div>
            <span className="text-xs text-blue-600 font-medium">
              {tool.currentStock}/{tool.totalStock} available
            </span>
          </div>

          {isMaterial && (
            <div className="bg-purple-50 text-purple-700 rounded-xl p-3 text-xs">
              This is a consumable material — it will not be returned. Stock will be permanently reduced.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5"><MapPin size={14} /> Assign to Project</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            >
              <option value="">— No project / Personal use —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.location ? ` (${p.location})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{isMaterial ? 'Quantity to use' : 'Quantity'}</label>
            <input
              type="number"
              min="1"
              max={tool.currentStock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5"><FileText size={14} /> Notes (optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes…"
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? (isMaterial ? 'Using…' : 'Checking out…') : (isMaterial ? 'Use Material' : 'Check Out')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
