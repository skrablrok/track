import { db } from '@/lib/db'

export async function notifyAdmins(
  type: string,
  title: string,
  message: string,
  linkUrl?: string
) {
  const admins = await db.user.findMany({
    where: { active: true, role: { in: ['ADMIN', 'MANAGER'] } },
    select: { id: true },
  })

  await db.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type, title, message, linkUrl: linkUrl || null })),
  })
}

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  message: string,
  linkUrl?: string
) {
  await db.notification.create({
    data: { userId, type, title, message, linkUrl: linkUrl || null },
  })
}
