import { db } from '@/lib/db'
import { sendPushToUser } from '@/lib/push'
import { sendNotificationEmail } from '@/lib/email'

function dispatchExtra(
  target: { id: string; email: string; emailNotifications: boolean },
  title: string,
  message: string,
  linkUrl?: string
) {
  sendPushToUser(target.id, { title, body: message, url: linkUrl }).catch((e) =>
    console.error('Push notification failed:', e)
  )
  if (target.emailNotifications) {
    sendNotificationEmail(target.email, title, message, linkUrl).catch((e) =>
      console.error('Notification email failed:', e)
    )
  }
}

export async function notifyAdmins(
  organizationId: string,
  type: string,
  title: string,
  message: string,
  linkUrl?: string
) {
  const admins = await db.user.findMany({
    where: { active: true, role: { in: ['ADMIN', 'MANAGER'] }, organizationId },
    select: { id: true, email: true, emailNotifications: true },
  })

  await db.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, organizationId, type, title, message, linkUrl: linkUrl || null })),
  })

  for (const admin of admins) dispatchExtra(admin, title, message, linkUrl)
}

export async function notifyUser(
  userId: string,
  organizationId: string,
  type: string,
  title: string,
  message: string,
  linkUrl?: string
) {
  await db.notification.create({
    data: { userId, organizationId, type, title, message, linkUrl: linkUrl || null },
  })

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailNotifications: true },
  })
  if (user) dispatchExtra(user, title, message, linkUrl)
}
