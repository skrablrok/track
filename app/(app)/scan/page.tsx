'use client'

import { useState } from 'react'
import { QrCode, CheckCircle2, XCircle, Wrench, MapPin, User, ArrowRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import CheckoutModal from '@/components/checkouts/CheckoutModal'

const QRScanner = dynamic(() => import('@/components/scanner/QRScanner'), { ssr: false })

type ScannedTool = {
  id: string
  name: string
  description?: string
  category?: string
  imageUrl?: string
  currentStock: number
  totalStock: number
  minStock: number
  maxStock: number
  qrCode: string
  checkouts: Array<{
    id: string
    user: { name: string }
    project?: { name: string; location?: string }
    checkoutDate: string
  }>
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScannedTool | null>(null)
  const [error, setError] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [returning, setReturning] = useState(false)
  const [returnSuccess, setReturnSuccess] = useState(false)

  async function handleScan(code: string) {
    setScanning(false)
    setError('')
    setResult(null)
    setReturnSuccess(false)

    try {
      const res = await fetch(`/api/tools/qr-lookup?code=${encodeURIComponent(code)}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Tool not found')
        return
      }
      const tool = await res.json()
      setResult(tool)
    } catch {
      setError('Failed to look up QR code')
    }
  }

  async function handleReturn(checkoutId: string) {
    setReturning(true)
    const res = await fetch(`/api/checkouts/${checkoutId}/return`, { method: 'POST' })
    setReturning(false)
    if (res.ok) {
      setReturnSuccess(true)
      setResult(null)
    } else {
      setError('Failed to return tool')
    }
  }

  const activeCheckout = result?.checkouts?.[0]

  return (
    <div className="max-w-lg mx-auto space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Scanner</h1>
        <p className="text-sm text-gray-500 mt-0.5">Scan a tool's QR code to check out or return</p>
      </div>

      {!scanning && !result && !returnSuccess && (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <QrCode className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Ready to Scan</h2>
          <p className="text-sm text-gray-500 mb-6">
            Point your camera at any tool QR code to check it out or return it.
          </p>
          <button
            onClick={() => setScanning(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-medium transition-colors shadow-sm"
          >
            Start Scanning
          </button>
        </div>
      )}

      {scanning && (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Scanning…</h2>
            <button
              onClick={() => setScanning(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          <QRScanner onScan={handleScan} />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={() => { setError(''); setScanning(true) }}
              className="text-xs text-red-600 hover:underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {returnSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="font-bold text-green-800 text-lg">Tool Returned!</h2>
          <p className="text-sm text-green-600 mt-1 mb-4">The tool has been marked as available.</p>
          <button
            onClick={() => { setReturnSuccess(false); setScanning(true) }}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Scan Another
          </button>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            {result.imageUrl ? (
              <img src={result.imageUrl} alt={result.name} className="w-full h-full object-cover" />
            ) : (
              <Wrench className="w-16 h-16 text-gray-300" />
            )}
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{result.name}</h2>
              {result.category && <p className="text-sm text-gray-400">{result.category}</p>}
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm text-gray-600">Stock</span>
              <span className={`text-sm font-semibold ${
                result.currentStock === 0 ? 'text-red-600' :
                result.currentStock <= result.minStock ? 'text-amber-600' : 'text-green-600'
              }`}>
                {result.currentStock}/{result.totalStock}
              </span>
            </div>

            {activeCheckout ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">Currently In Use</p>
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                    <User size={14} className="text-gray-400" />
                    {activeCheckout.user.name}
                  </div>
                  {activeCheckout.project && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin size={14} className="text-gray-400" />
                      {activeCheckout.project.name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleReturn(activeCheckout.id)}
                  disabled={returning}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-2xl font-medium transition-colors disabled:opacity-60"
                >
                  {returning ? 'Returning…' : 'Return This Tool'}
                </button>
              </div>
            ) : result.currentStock > 0 ? (
              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-medium transition-colors"
              >
                Check Out This Tool
              </button>
            ) : (
              <div className="bg-red-50 rounded-2xl p-4 text-center">
                <p className="text-sm font-medium text-red-700">Out of Stock</p>
                <p className="text-xs text-red-500 mt-0.5">All units are currently checked out</p>
              </div>
            )}

            <button
              onClick={() => { setResult(null); setScanning(true) }}
              className="w-full text-gray-500 hover:text-gray-700 text-sm py-2"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}

      {checkoutOpen && result && (
        <CheckoutModal
          tool={result}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCheckoutOpen(false)
            setResult(null)
            setReturnSuccess(true)
          }}
        />
      )}
    </div>
  )
}
