import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import HelpButton from '@/components/HelpButton'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const lang = cookies().get('lang')?.value || 'sl'
  const orgId = session.user.organizationId

  const [toolsCount, checkoutsCount, requestsCount] = await Promise.all([
    db.tool.count({ where: { active: true, organizationId: orgId } }),
    db.checkout.count({ where: { status: { in: ['ACTIVE', 'PENDING_RETURN'] }, organizationId: orgId } }),
    db.request.count({ where: { status: 'PENDING', organizationId: orgId } }),
  ])
  const navCounts = { tools: toolsCount, checkouts: checkoutsCount, requests: requestsCount }

  return (
    <LanguageProvider initialLang={lang}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar role={session.user.role} orgName={session.user.orgName} userName={session.user.name} counts={navCounts} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header user={session.user} orgName={session.user.orgName} />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        <MobileBottomNav role={session.user.role} />
        <HelpButton />
      </div>
    </LanguageProvider>
  )
}
