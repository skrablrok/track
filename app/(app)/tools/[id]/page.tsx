import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'
import { format } from 'date-fns'
import { formatMinutes, shortCode } from '@/lib/utils'
import { t as tr, DEFAULT_LANG, type Lang } from '@/lib/i18n/translations'
import { ArrowLeft, Wrench, Package, AlertTriangle, User, MapPin, Calendar, Clock } from 'lucide-react'
import type { TranslationKey } from '@/lib/i18n/translations'
import Link from 'next/link'
import ToolQRCode from '@/components/tools/ToolQRCode'
import ToolDetailActions from '@/components/tools/ToolDetailActions'
import RestockButton from '@/components/tools/RestockButton'

const CATEGORY_KEY_MAP: Record<string, TranslationKey> = {
  'Power Tools': 'catPowerTools',
  'Hand Tools': 'catHandTools',
  'Measuring Tools': 'catMeasuringTools',
  'Safety Equipment': 'catSafetyEquipment',
  'Lifting Equipment': 'catLiftingEquipment',
  'Other': 'catOther',
}

const DOT_COLORS = ['bg-blue-500', 'bg-teal-500', 'bg-purple-500', 'bg-emerald-500', 'bg-rose-400']
function dotColor(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return DOT_COLORS[hash % DOT_COLORS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U'
}

export default async function ToolDetailPage({ params }: { params: { id: string } }) {
  const lang = ((await cookies()).get('lang')?.value || DEFAULT_LANG) as Lang
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
      warehouseStocks: { orderBy: { warehouse: 'asc' } },
    },
  })

  if (!tool) notFound()

  const onOrder = await db.requestItem.aggregate({
    where: { toolId: tool.id, procurementStatus: 'ORDERED' },
    _sum: { requestedQty: true },
  })
  const orderedQty = onOrder._sum.requestedQty || 0

  const activeCheckouts = tool.checkouts.filter((c) => c.status === 'ACTIVE' || c.status === 'PENDING_RETURN')
  const isLowStock = tool.currentStock <= tool.minStock
  const isMaterial = tool.type === 'MATERIAL'
  const Icon = isMaterial ? Package : Wrench

  const distribution = activeCheckouts.reduce((acc, c) => {
    const key = c.project?.id || '__none__'
    const label = c.project?.name || tr(lang, 'noSite')
    if (!acc[key]) acc[key] = { label, qty: 0 }
    acc[key].qty += c.quantity
    return acc
  }, {} as Record<string, { label: string; qty: number }>)
  const distributionRows = Object.entries(distribution).sort((a, b) => b[1].qty - a[1].qty)
  const maxQty = Math.max(1, ...distributionRows.map(([, v]) => v.qty))

  const singleActiveCheckout = activeCheckouts.length === 1 ? activeCheckouts[0] : null
  const currentCheckout = activeCheckouts[0]
  const overdue = currentCheckout?.dueDate ? new Date(currentCheckout.dueDate).getTime() < Date.now() : false

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in">
      <Link href="/tools" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors w-fit">
        <ArrowLeft size={15} />
        {tr(lang, 'backTo')} {tr(lang, 'tools')}
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            {tool.imageUrl ? (
              <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Icon className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{tool.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{shortCode(tool)}</span>
              {overdue && (
                <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {tr(lang, 'stockCritical')} · {formatMinutes(Math.floor((Date.now() - new Date(currentCheckout!.dueDate!).getTime()) / 60000))}
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {isMaterial ? tr(lang, 'itemTypeMaterial') : tr(lang, 'itemTypeTool')}
              </span>
              {tool.category && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {CATEGORY_KEY_MAP[tool.category] ? tr(lang, CATEGORY_KEY_MAP[tool.category]) : tool.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <ToolDetailActions tool={tool} singleActiveCheckout={singleActiveCheckout ? { id: singleActiveCheckout.id, status: singleActiveCheckout.status } : null} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">{tr(lang, 'colDetails')}</h3>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <DetailField label={tr(lang, 'manufacturer')} value={tool.manufacturer} />
              <DetailField label={tr(lang, 'serialNumber')} value={tool.serialNumber} />
              <DetailField label={tr(lang, 'binLocation')} value={tool.binLocation} />
              <DetailField label={tr(lang, 'totalUnits')} value={`${tool.totalStock}`} />
              <DetailField label={tr(lang, 'purchasePrice')} value={tool.purchasePrice != null ? `${tool.purchasePrice.toFixed(2)} € ${tr(lang, 'perUnit')}` : null} />
              <DetailField label={tr(lang, 'purchaseDate')} value={tool.purchaseDate ? format(new Date(tool.purchaseDate), 'dd. MM. yyyy') : null} />
              <DetailField label={tr(lang, 'warrantyUntil')} value={tool.warrantyUntil ? format(new Date(tool.warrantyUntil), 'dd. MM. yyyy') : null} />
              <DetailField label={tr(lang, 'lastService')} value={tool.lastServiceDate ? format(new Date(tool.lastServiceDate), 'dd. MM. yyyy') : tr(lang, 'notRequired')} />
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">
                  {tool.currentStock} {tr(lang, 'of')} {tool.totalStock} {tr(lang, 'available')}
                  {orderedQty > 0 && (
                    <span className="text-blue-600"> · {orderedQty} {tr(lang, 'orderedQtyLabel')}</span>
                  )}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  tool.currentStock === 0 ? 'bg-red-100 text-red-700' :
                  isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {tool.currentStock === 0 ? tr(lang, 'stockCritical') : isLowStock ? tr(lang, 'stockOrderNeeded') : tr(lang, 'available')}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    tool.currentStock === 0 ? 'bg-red-500' : isLowStock ? 'bg-amber-400' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, Math.round((tool.currentStock / tool.totalStock) * 100)))}%` }}
                />
              </div>
              {isMaterial && ['ADMIN', 'MANAGER'].includes(session?.user?.role || '') && (
                <div className="mt-3"><RestockButton toolId={tool.id} /></div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-1">
              <h3 className="font-semibold text-gray-800">{tr(lang, 'checkoutHistory')}</h3>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tool.checkouts.length}</span>
            </div>
            {tool.checkouts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{tr(lang, 'noCheckoutHistory')}</p>
            ) : (
              <>
                {/* Mobile: stacked rows */}
                <div className="md:hidden divide-y divide-gray-50 mt-2">
                  {tool.checkouts.map((c) => {
                    const isOpen = c.status === 'ACTIVE' || c.status === 'PENDING_RETURN'
                    const isConsumed = c.status === 'CONSUMED'
                    const mins = isOpen
                      ? Math.floor((Date.now() - new Date(c.checkoutDate).getTime()) / 60000)
                      : (c.durationMins ?? 0)
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {initials(c.user.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-gray-800 truncate">{c.user.name}</p>
                            {isOpen ? (
                              <span className="flex-shrink-0 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{tr(lang, 'openLabel')}</span>
                            ) : (
                              <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                                {c.returnDate ? format(new Date(c.returnDate), 'dd. MM.') : '—'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1.5">
                            {c.project ? (
                              <>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor(c.project.id)}`} />
                                {c.project.name}
                              </>
                            ) : tr(lang, 'noSite')}
                            {' · '}{isConsumed ? `${c.quantity}x` : formatMinutes(mins)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                        <th className="px-5 py-2.5 font-medium">{tr(lang, 'colTakenBy')}</th>
                        <th className="px-5 py-2.5 font-medium">{tr(lang, 'colSite')}</th>
                        <th className="px-5 py-2.5 font-medium">{tr(lang, 'colDuration')}</th>
                        <th className="px-5 py-2.5 font-medium">{tr(lang, 'colReturned')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tool.checkouts.map((c) => {
                        const isOpen = c.status === 'ACTIVE' || c.status === 'PENDING_RETURN'
                        const isConsumed = c.status === 'CONSUMED'
                        const mins = isOpen
                          ? Math.floor((Date.now() - new Date(c.checkoutDate).getTime()) / 60000)
                          : (c.durationMins ?? 0)
                        return (
                          <tr key={c.id} className="border-b border-gray-50 last:border-0">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
                                  {initials(c.user.name)}
                                </div>
                                <span className="text-gray-800 whitespace-nowrap">{c.user.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                              {c.project ? (
                                <span className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor(c.project.id)}`} />
                                  {c.project.name}
                                </span>
                              ) : <span className="text-gray-300">{tr(lang, 'noSite')}</span>}
                            </td>
                            <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                              {isConsumed ? `${c.quantity}x` : formatMinutes(mins)}
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              {isOpen ? (
                                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{tr(lang, 'openLabel')}</span>
                              ) : c.returnDate ? (
                                format(new Date(c.returnDate), 'dd. MM.')
                              ) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {currentCheckout && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">{tr(lang, 'currentCheckoutTitle')}</h3>
              {overdue && currentCheckout.dueDate && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3 flex items-start gap-2">
                  <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-snug">
                    {tr(lang, 'overdueSince')} {format(new Date(currentCheckout.dueDate), 'd. M. yyyy')}
                    {' — '}{tr(lang, 'overdueDurationLabel')} {formatMinutes(Math.floor((Date.now() - new Date(currentCheckout.dueDate).getTime()) / 60000))}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {initials(currentCheckout.user.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{currentCheckout.user.name}</p>
                  {currentCheckout.project && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                      <MapPin size={11} />{currentCheckout.project.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Calendar size={12} />{tr(lang, 'takenOn')}</span>
                  <span className="text-gray-700 font-medium">{format(new Date(currentCheckout.checkoutDate), 'dd. MM. yyyy · HH:mm')}</span>
                </div>
                {currentCheckout.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Clock size={12} />{tr(lang, 'dueDate')}</span>
                    <span className={`font-medium ${overdue ? 'text-red-600' : 'text-gray-700'}`}>{format(new Date(currentCheckout.dueDate), 'dd. MM. yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {distributionRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">{tr(lang, 'distributionByProject')}</h3>
              <div className="space-y-3">
                {distributionRows.map(([key, { label, qty }], i) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate">{label}</span>
                      <span className="text-gray-400 font-medium whitespace-nowrap ml-2">{qty} {tr(lang, 'unitsSuffix')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]}`} style={{ width: `${Math.round((qty / maxQty) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ToolQRCode toolId={tool.id} toolName={tool.name} qrCode={tool.qrCode} />
        </div>
      </div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value ?? '—'}</p>
    </div>
  )
}
