import webpush from 'web-push'
import { db } from '@/lib/db'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@buildflow.app',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  const subs = await db.pushSubscription.findMany({ where: { userId } })

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          console.error('Push send failed:', e)
        }
      }
    })
  )
}
