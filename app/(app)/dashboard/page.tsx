import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Wrench, AlertTriangle, PackageCheck, ClipboardList, ArrowRight, Clock, MapPin, User, Package } from 'lucide-react'
import { formatMinutes } from '@/lib/utils'
import { format } from 'date-fns'
import { t } from '@/lib/i18n/translations'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)!
  const lang = cookies().get('lang')?.value || 'sl'
  const orgId = session?.user?.organizationId

  const [toolCount, materialCount, activeCheckouts, lowStockTools, recentActivity] = await Promise.all([
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
  ])

  const stats = [
    { label: t(lang, 'toolsInStock'),      value: toolCount,        icon: Wrench,        color: 'bg-blue-50 text-blue-600',     border: 'border-blue-100' },
    { label: t(lang, 'materialsInStock'),  value: materialCount,    icon: Package,       color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
    { label: t(lang, 'activeCheckouts'),   value: activeCheckouts,      icon: ClipboardList, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
    { label: t(lang, 'lowStockAlerts'),    value: lowStockTools.length, icon: AlertTriangle, color: 'bg-red-50 text-red-600',     border: 'border-red-100' },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t(lang, 'welcomeBack')}, {session?.user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`stat-card border ${border}`}>
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {lowStockTools.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-800">{t(lang, 'lowStockAlert')}</h2>
          </div>
          <div className="space-y-2">
            {lowStockTools.map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100 hover:border-amber-300 transition-colors"
              >
                <span className="font-medium text-gray-800 text-sm">{tool.name}</span>
                <span className="text-xs text-amber-700 font-medium bg-amber-100 px-2 py-0.5 rounded-full">
                  {tool.currentStock}/{tool.totalStock} {t(lang, 'remaining')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recentActivity.map((checkout) => {
              const minutesOut = Math.floor((Date.now() - new Date(checkout.checkoutDate).getTime()) / 60000)
              return (
                <Link
                  key={checkout.id}
                  href={`/tools/${checkout.tool.id}`}
                  className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                      {checkout.tool.imageUrl ? (
                        <img src={checkout.tool.imageUrl} alt={checkout.tool.name} className="w-full h-full object-cover" />
                      ) : (
                        <Wrench size={18} className="text-gray-400" />
                      )}
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                      {t(lang, 'inUse')}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{checkout.tool.name}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <User size={12} />{checkout.user.name}
                    </div>
                    {checkout.project && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin size={12} />{checkout.project.name}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock size={12} />{formatMinutes(minutesOut)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
