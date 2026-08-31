'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function NotificationPrefsMenu() {
  const { t } = useLanguage()
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true)
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => {})
    }

    fetch('/api/user/preferences')
      .then((r) => r.json())
      .then((d) => setEmailNotifications(!!d.emailNotifications))
      .catch(() => {})
  }, [])

  async function togglePush() {
    setPushBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (subscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setSubscribed(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''),
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
        setSubscribed(true)
      }
    } catch (e) {
      console.error('Push toggle failed:', e)
    } finally {
      setPushBusy(false)
    }
  }

  async function toggleEmail() {
    const next = !emailNotifications
    setEmailBusy(true)
    setEmailNotifications(next)
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications: next }),
      })
    } catch {
      setEmailNotifications(!next)
    } finally {
      setEmailBusy(false)
    }
  }

  return (
    <div className="px-4 py-2.5 border-b border-gray-100 space-y-2.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t('notificationSettings')}</p>

      {supported ? (
        <button
          onClick={togglePush}
          disabled={pushBusy}
          className="w-full flex items-center justify-between gap-2 text-sm text-gray-700 disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            {subscribed ? <Bell size={15} className="text-blue-600" /> : <BellOff size={15} className="text-gray-400" />}
            {subscribed ? t('pushNotificationsEnabled') : t('enablePushNotifications')}
          </span>
          {pushBusy && <Loader2 size={13} className="animate-spin text-gray-400" />}
        </button>
      ) : (
        <p className="text-xs text-gray-400">{t('pushNotificationsUnsupported')}</p>
      )}

      <label className="w-full flex items-center justify-between gap-2 text-sm text-gray-700 cursor-pointer">
        <span>{t('emailNotificationsLabel')}</span>
        <input
          type="checkbox"
          checked={emailNotifications}
          disabled={emailBusy}
          onChange={toggleEmail}
          className="w-4 h-4 accent-blue-600"
        />
      </label>
    </div>
  )
}
