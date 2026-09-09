import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import Link from 'next/link'
import {
  Wrench, AlertTriangle, PackageCheck, ClipboardList, ArrowRight, Package,
  Plus, Pencil, Trash2, RotateCcw, ShoppingCart, ClipboardCheck, FileSpreadsheet, Info,
} from 'lucide-react'
import { formatMinutes } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { t } from '@/lib/i18n/translations'
import ExportButton from '@/components/ExportButton'

function activityIcon(action: string) {
  if (action.startsWith('DELETE')) return { Icon: Trash2, color: 'bg-red-50 text-red-600' }
  if (action.startsWith('CREATE')) return { Icon: Plus, color: 'bg-green-50 text-green-600' }
  if (action.startsWith('UPDATE')) return { Icon: Pencil, color: 'bg-gray-100 text-gray-500' }
  if (action.startsWith('RETURN')) return { Icon: RotateCcw, color: 'bg-blue-50 text-blue-600' }
  if (action === 'CHECKOUT' || action === 'USE_MATERIAL') return { Icon: ClipboardList, color: 'bg-blue-50 text-blue-600' }
  if (action === 'RESTOCK') return { Icon: Package, color: 'bg-purple-50 text-purple-600' }
  if (action === 'REVIEW_REQUEST' || action === 'PROCUREMENT_STATUS_CHANGE') return { Icon: ClipboardCheck, color: 'bg-amber-50 text-amber-600' }
  if (action === 'BULK_IMPORT') return { Icon: FileSpreadsheet, color: 'bg-blue-50 text-blue-600' }
  if (action === 'CREATE_PURCHASE') return { Icon: ShoppingCart, color: 'bg-green-50 text-green-600' }
  return { Icon: Info, color: 'bg-gray-100 text-gray-500' }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)!
  const lang = cookies().get('lang')?.value || 'sl'
  const orgId = session?.user?.organizationId

  const [toolCount, materialCount, activeCheckouts, lowStockTools, recentActivity, activityLog] = await Promise.all([
    db.tool.count({ where: { active: true, type: 'TOOL', organizationId: orgId } }),
    db.tool.count({ where: { active: true, type: 'MATERIAL', organizationId: orgId } }),
    db.checkout.count({ where: { status: { in: ['ACTIVE', 'PENDING_RETURN'] }, organizationId: orgId } }),
    db.tool.findMany({
      where: { active: true, organizationId: orgId },
      select: { id: true, name: true, currentStock: true, minStock: true, maxStock: true, totalStock: true },
    }).then((ts) => ts.filter((t) => t.currentStock <= t.minStock)),
    db.checkout.findMany({
      where: { status: { in: ['ACTIVE', 'PENDING_RETURN'] }, organizationId: orgId },
      include: {
        tool: { select: { id: true, name: true, imageUrl: true, category: true } },
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, location: true } },
      },
      orderBy: { checkoutDate: 'desc' },
      take: 8,
    }),
    db.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ])

  const stats = [
    { label: t(lang, 'toolsInStock'),      value: toolCount,        icon: Wrench,        color: 'bg-blue-50 text-blue-600' },
    { label: t(lang, 'materialsInStock'),  value: materialCount,    icon: Package,       color: 'bg-purple-50 text-purple-600' },
    { label: t(lang, 'activeCheckouts'),   value: activeCheckouts,  icon: ClipboardList, color: 'bg-amber-50 text-amber-600' },
  ]

  const orderQty = lowStockTools.reduce((sum, tool) => sum + Math.max(0, tool.maxStock - tool.currentStock), 0)

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t(lang, 'welcomeBack')}, {session?.user?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
            {session?.user?.orgName && <> · {session.user.orgName}</>}
            {' · '}{t(lang, 'lastSync')} {format(new Date(), 'HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton />
          <Link
            href="/requests/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            {t(lang, 'newRequest')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}

        <div className={`stat-card ${lowStockTools.length > 0 ? 'bg-amber-50 border-amber-200' : ''}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            {lowStockTools.length > 0 && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full uppercase tracking-wide">
                {t(lang, 'needAttention')}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{lowStockTools.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">{t(lang, 'lowStockAlerts')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{t(lang, 'currentlyOut')}</h2>
            <Link href="/checkouts" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              {t(lang, 'viewAll')} <ArrowRight size={14} />
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <PackageCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">{t(lang, 'allAvailable')}</p>
            </div>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                        <th className="px-4 py-3 font-medium">{t(lang, 'colTool')}</th>
                        <th className="px-4 py-3 font-medium">{t(lang, 'colTakenBy')}</th>
                        <th className="px-4 py-3 font-medium">{t(lang, 'colSite')}</th>
                        <th className="px-4 py-3 font-medium">{t(lang, 'colDuration')}</th>
                        <th className="px-4 py-3 font-medium">{t(lang, 'colStatus')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((checkout) => {
                        const minutesOut = Math.floor((Date.now() - new Date(checkout.checkoutDate).getTime()) / 60000)
                        const overdue = checkout.dueDate ? new Date(checkout.dueDate).getTime() < Date.now() : false
                        return (
                          <tr key={checkout.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <Link href={`/tools/${checkout.tool.id}`} className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                                  {checkout.tool.imageUrl ? (
                                    <img src={checkout.tool.imageUrl} alt={checkout.tool.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Wrench size={14} className="text-gray-400" />
                                  )}
                                </div>
                                <span className="font-medium text-gray-900 truncate">{checkout.tool.name}</span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{checkout.user.name}</td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {checkout.project ? checkout.project.name : <span className="text-gray-300">{t(lang, 'noSite')}</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatMinutes(minutesOut)}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                                overdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {overdue ? t(lang, 'stockCritical') : t(lang, 'inUse')}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-2">
                {recentActivity.map((checkout) => {
                  const minutesOut = Math.floor((Date.now() - new Date(checkout.checkoutDate).getTime()) / 60000)
                  const overdue = checkout.dueDate ? new Date(checkout.dueDate).getTime() < Date.now() : false
                  return (
                    <Link
                      key={checkout.id}
                      href={`/tools/${checkout.tool.id}`}
                      className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 active:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                        {checkout.tool.imageUrl ? (
                          <img src={checkout.tool.imageUrl} alt={checkout.tool.name} className="w-full h-full object-cover" />
                        ) : (
                          <Wrench size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-gray-900 text-sm truncate">{checkout.tool.name}</p>
                          <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                            overdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {overdue ? t(lang, 'stockCritical') : t(lang, 'inUse')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {checkout.user.name}
                          {checkout.project ? ` · ${checkout.project.name}` : ` · ${t(lang, 'noSite')}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatMinutes(minutesOut)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          {lowStockTools.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="font-semibold text-amber-800">{t(lang, 'lowStockAlert')}</h2>
              </div>
              <div className="space-y-3">
                {lowStockTools.map((tool) => {
                  const pct = tool.totalStock > 0 ? Math.min(100, Math.round((tool.currentStock / tool.totalStock) * 100)) : 0
                  return (
                    <Link key={tool.id} href={`/tools/${tool.id}`} className="block bg-white rounded-xl p-3 border border-amber-100 hover:border-amber-300 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-gray-800 text-sm truncate">{tool.name}</span>
                        <span className="text-xs text-amber-700 font-medium whitespace-nowrap ml-2">
                          {tool.currentStock}/{tool.totalStock}
                        </span>
                      </div>
                      <div className="w-full bg-amber-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  )
                })}
              </div>
              {orderQty > 0 && (
                <Link
                  href="/admin/procurement"
                  className="mt-3 flex items-center justify-center gap-2 w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  <ShoppingCart size={15} />
                  {t(lang, 'prepareOrder')} — {orderQty} {t(lang, 'unitsSuffix')}
                </Link>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="font-semibold text-gray-800 mb-3">{t(lang, 'activityLabel')}</h2>
            {activityLog.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">{t(lang, 'noData')}</p>
            ) : (
              <div className="space-y-3">
                {activityLog.map((log) => {
                  const { Icon, color } = activityIcon(log.action)
                  return (
                    <div key={log.id} className="flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-700 leading-snug">{log.details || log.action}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
