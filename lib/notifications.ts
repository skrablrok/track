import { db } from '@/lib/db'
import { sendPushToUser } from '@/lib/push'
import { sendNotificationEmail } from '@/lib/email'
import { t } from '@/lib/i18n/translations'

export type NotifType =
  | { type: 'REQUEST_SUBMITTED'; userName: string; count: number; projectName: string; procurementItems?: { name: string; qty?: number; stock?: number }[] }
  | { type: 'REQUEST_REVIEWED'; status: 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED'; notes?: string | null }
  | { type: 'STOCK_NEGATIVE'; warnings: { name: string; stock: number; negative: boolean }[] }
  | { type: 'PROCUREMENT_UPDATE'; itemLabel: string; stage: 'ORDERED' | 'RECEIVED' | 'COMPLETED' }
  | { type: 'RETURN_REQUESTED'; userName: string; toolName: string }
  | { type: 'RETURN_CONFIRMED'; toolName: string }
  | { type: 'RETURN_REJECTED'; toolName: string }
  | { type: 'PURCHASE_LOGGED'; userName: string; note?: string | null }

function render(str: string, params: Record<string, string | number>) {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

function renderNotification(lang: string, n: NotifType): { title: string; body: string } {
  switch (n.type) {
    case 'REQUEST_SUBMITTED': {
      if (n.procurementItems && n.procurementItems.length > 0) {
        const itemList = n.procurementItems
          .map((i) =>
            i.qty != null && i.stock != null
              ? render(t(lang, 'notifItemQtyStock'), { name: i.name, qty: i.qty, stock: i.stock })
              : i.name
          )
          .join(', ')
        return {
          title: t(lang, 'notifProcurementNeededTitle'),
          body: render(t(lang, 'notifRequestSubmittedProcurementBody'), {
            userName: n.userName,
            count: n.count,
            projectName: n.projectName,
            procCount: n.procurementItems.length,
            itemList,
          }),
        }
      }
      return {
        title: t(lang, 'notifNewRequestTitle'),
        body: render(t(lang, 'notifRequestSubmittedBody'), { userName: n.userName, count: n.count, projectName: n.projectName }),
      }
    }
    case 'REQUEST_REVIEWED': {
      const titleKey =
        n.status === 'APPROVED' ? 'notifRequestApprovedTitle' :
        n.status === 'PARTIALLY_APPROVED' ? 'notifRequestPartiallyApprovedTitle' :
        'notifRequestRejectedTitle'
      const bodyKey =
        n.status === 'APPROVED' ? 'notifRequestApprovedBody' :
        n.status === 'PARTIALLY_APPROVED' ? 'notifRequestPartiallyApprovedBody' :
        'notifRequestRejectedBody'
      let body = t(lang, bodyKey)
      if (n.notes) body += render(t(lang, 'notifRequestNotesSuffix'), { notes: n.notes })
      return { title: t(lang, titleKey), body }
    }
    case 'STOCK_NEGATIVE': {
      const body = n.warnings
        .map((w) => render(t(lang, w.negative ? 'notifStockNegativeItem' : 'notifStockLowItem'), { name: w.name, stock: w.stock }))
        .join(' | ')
      return { title: t(lang, 'notifStockReplenishmentTitle'), body }
    }
    case 'PROCUREMENT_UPDATE': {
      const bodyKey =
        n.stage === 'ORDERED' ? 'notifItemOrderedBody' :
        n.stage === 'RECEIVED' ? 'notifItemReceivedBody' :
        'notifItemCompletedBody'
      return { title: t(lang, 'notifItemUpdateTitle'), body: render(t(lang, bodyKey), { itemLabel: n.itemLabel }) }
    }
    case 'RETURN_REQUESTED':
      return {
        title: t(lang, 'notifReturnRequestedTitle'),
        body: render(t(lang, 'notifReturnRequestedBody'), { userName: n.userName, toolName: n.toolName }),
      }
    case 'RETURN_CONFIRMED':
      return { title: t(lang, 'notifReturnConfirmedTitle'), body: render(t(lang, 'notifReturnConfirmedBody'), { toolName: n.toolName }) }
    case 'RETURN_REJECTED':
      return { title: t(lang, 'notifReturnRejectedTitle'), body: render(t(lang, 'notifReturnRejectedBody'), { toolName: n.toolName }) }
    case 'PURCHASE_LOGGED':
      return {
        title: t(lang, 'notifPurchaseLoggedTitle'),
        body: n.note
          ? render(t(lang, 'notifPurchaseLoggedWithNoteBody'), { userName: n.userName, note: n.note })
          : render(t(lang, 'notifPurchaseLoggedNoNoteBody'), { userName: n.userName }),
      }
  }
}

async function dispatch(
  target: { id: string; email: string; emailNotifications: boolean; language: string },
  organizationId: string,
  n: NotifType,
  linkUrl?: string
) {
  const { title, body } = renderNotification(target.language, n)

  await db.notification.create({
    data: { userId: target.id, organizationId, type: n.type, title, message: body, linkUrl: linkUrl || null },
  })

  sendPushToUser(target.id, { title, body, url: linkUrl }).catch((e) => console.error('Push notification failed:', e))
  if (target.emailNotifications) {
    sendNotificationEmail(target.email, title, body, linkUrl, target.language).catch((e) =>
      console.error('Notification email failed:', e)
    )
  }
}

export async function notifyAdmins(organizationId: string, n: NotifType, linkUrl?: string) {
  const admins = await db.user.findMany({
    where: { active: true, role: { in: ['ADMIN', 'MANAGER'] }, organizationId },
    select: { id: true, email: true, emailNotifications: true, language: true },
  })

  for (const admin of admins) await dispatch(admin, organizationId, n, linkUrl)
}

export async function notifyUser(userId: string, organizationId: string, n: NotifType, linkUrl?: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailNotifications: true, language: true },
  })
  if (!user) return

  await dispatch(user, organizationId, n, linkUrl)
}
