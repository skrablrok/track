'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CornerDownLeft } from 'lucide-react'

export default function ReturnButton({ checkoutId }: { checkoutId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleReturn() {
    if (!confirm('Mark this tool as returned?')) return
    setLoading(true)
    await fetch(`/api/checkouts/${checkoutId}/return`, { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleReturn}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      <CornerDownLeft size={12} />
      {loading ? 'Returning…' : 'Return'}
    </button>
  )
}
