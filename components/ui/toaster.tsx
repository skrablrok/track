'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'

type Toast = { id: string; type: 'success' | 'error' | 'warning'; message: string }

let addToast: ((t: Omit<Toast, 'id'>) => void) | null = null

export function toast(type: Toast['type'], message: string) {
  addToast?.({ type, message })
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToast = (t) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { ...t, id }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id))
      }, 4000)
    }
    return () => { addToast = null }
  }, [])

  const icons = {
    success: <CheckCircle2 size={16} className="text-green-500" />,
    error: <XCircle size={16} className="text-red-500" />,
    warning: <AlertTriangle size={16} className="text-amber-500" />,
  }

  const colors = {
    success: 'border-green-100 bg-white',
    error: 'border-red-100 bg-white',
    warning: 'border-amber-100 bg-white',
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 border rounded-2xl px-4 py-3 shadow-lg ${colors[t.type]}`}
        >
          {icons[t.type]}
          <p className="text-sm text-gray-800 font-medium flex-1">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-gray-300 hover:text-gray-500"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
