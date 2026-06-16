import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { format } from 'date-fns'
import { formatMinutes } from '@/lib/utils'
import {
  ArrowLeft, Wrench, MapPin, User, Clock, Calendar,
  Package, QrCode, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import ToolQRCode from '@/components/tools/ToolQRCode'
import ReturnButton from '@/components/checkouts/ReturnButton'

export default async function ToolDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const tool = await db.tool.findUnique({
    where: { id: params.id },
    include: {
      checkouts: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          project: true,
        },
        orderBy: { checkoutDate: 'desc' },
      },
    },
  })

  if (!tool) notFound()

  const activeCheckouts = tool.checkouts.filter((c) => c.status === 'ACTIVE')
  const history = tool.checkouts.filter((c) => c.status === 'RETURNED' || c.status === 'CONSUMED')
  const isLowStock = tool.currentStock <= tool.minStock
  const isAdmin = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')
  const isMaterial = tool.type === 'MATERIAL'

  const stockPct = Math.min(100, Math.max(0, Math.round((tool.currentStock / tool.totalStock) * 100)))

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      <div className="flex items-center gap-3">
        <Link href="/tools" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{tool.name}</h1>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isMaterial ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {isMaterial ? 'Material' : 'Tool'}
        </span>
        {isLowStock && (
          <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
            <AlertTriangle size={12} /> Low Stock
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              {tool.imageUrl ? (
                <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover" />
              ) : (
                <Wrench className="w-20 h-20 text-gray-300" />
              )}
            </div>
            <div className="p-5">
              {tool.description && <p className="text-gray-600 text-sm mb-4">{tool.description}</p>}
              {tool.category && (
                <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                  {tool.category}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Package size={16} /> Stock Level
            </h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {tool.currentStock} of {tool.totalStock} available
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                tool.currentStock === 0 ? 'bg-red-100 text-red-700' :
                isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>
                {tool.currentStock === 0 ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  stockPct === 0 ? 'bg-red-500' : stockPct <= 30 ? 'bg-amber-400' : 'bg-green-500'
                }`}
                style={{ width: `${stockPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>Min: {tool.minStock}</span>
              {!isMaterial && <span>Max: {tool.maxStock}</span>}
            </div>
          </div>

          {activeCheckouts.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <h3 className="font-semibold text-amber-800 mb-3">Currently In Use</h3>
              <div className="space-y-3">
                {activeCheckouts.map((checkout) => {
                  const mins = Math.floor((Date.now() - new Date(checkout.checkoutDate).getTime()) / 60000)
                  const isOwn = session?.user?.id === checkout.userId
                  return (
                    <div key={checkout.id} className="bg-white rounded-xl p-3 border border-amber-100">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                            <User size={14} className="text-gray-400" />
                            {checkout.user.name}
                          </div>
                          {checkout.project && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <MapPin size={14} className="text-gray-400" />
                              {checkout.project.name}
                              {checkout.project.location && ` — ${checkout.project.location}`}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Calendar size={12} />
                            {format(new Date(checkout.checkoutDate), 'MMM d, yyyy HH:mm')}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Clock size={12} />
                            Out for {formatMinutes(mins)}
                          </div>
                        </div>
                        {(isOwn || isAdmin) && (
                          <ReturnButton checkoutId={checkout.id} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Checkout History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No checkout history</p>
            ) : (
              <div className="space-y-3">
                {history.map((checkout) => {
                  const consumed = checkout.status === 'CONSUMED'
                  return (
                    <div key={checkout.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${consumed ? 'bg-purple-50' : 'bg-green-50'}`}>
                        <Clock size={14} className={consumed ? 'text-purple-600' : 'text-green-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">{checkout.user.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${consumed ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                            {consumed ? `Used ${checkout.quantity}x` : checkout.durationMins !== null ? formatMinutes(checkout.durationMins!) : 'Returned'}
                          </span>
                        </div>
                        {checkout.project && (
                          <p className="text-xs text-gray-500 mt-0.5">{checkout.project.name}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{format(new Date(checkout.checkoutDate), 'MMM d HH:mm')}</span>
                          {!consumed && (
                            <>
                              <span>→</span>
                              <span>{checkout.returnDate ? format(new Date(checkout.returnDate), 'MMM d HH:mm') : '—'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ToolQRCode toolId={tool.id} toolName={tool.name} qrCode={tool.qrCode} />

          {isAdmin && (
            <Link
              href={`/tools/${tool.id}/edit`}
              className="block w-full text-center py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Edit Tool
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
