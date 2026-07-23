'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Platform = 'chrome' | 'safari-ios' | 'safari-mac' | null

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua)
  const isMac = /Macintosh/.test(ua)
  if (isIOS && isSafari) return 'safari-ios'
  if (isMac && isSafari) return 'safari-mac'
  return null
}

export default function InstallButton() {
  const { t } = useLanguage()
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Register service worker so Chrome can fire beforeinstallprompt
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Already installed as PWA?
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    ) {
      setInstalled(true)
      return
    }

    // Dismissed within the last 7 days?
    const ts = localStorage.getItem('pwa-dismissed')
    if (ts && Date.now() - Number(ts) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true)
      return
    }

    setPlatform(detectPlatform())

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform('chrome')
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleClick() {
    if (deferredPrompt) {
      // Chrome / Edge / Android — native install prompt
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferredPrompt(null)
    } else if (platform === 'safari-ios' && navigator.share) {
      // iOS Safari — open the native Share sheet; user taps "Add to Home Screen"
      try {
        await navigator.share({ url: window.location.href, title: document.title })
      } catch {
        // User cancelled — do nothing
      }
    } else {
      // Safari Mac and any other fallback — show instructions modal
      setShowModal(true)
    }
  }

  function dismiss() {
    localStorage.setItem('pwa-dismissed', String(Date.now()))
    setDismissed(true)
    setShowModal(false)
  }

  if (installed || dismissed || (!platform && !deferredPrompt)) return null

  return (
    <>
      <button
        onClick={handleClick}
        title={t('pwaInstall')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition-colors border border-blue-100"
      >
        <Download size={13} />
        <span className="hidden sm:inline">{t('pwaInstall')}</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
            {/* Handle bar for mobile */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="p-6" style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{t('pwaInstallTitle')}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{t('pwaInstallDesc')}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0 -mt-0.5">
                  <X size={15} className="text-gray-400" />
                </button>
              </div>

              {platform === 'safari-ios' && (
                <ol className="space-y-3 mt-5">
                  {[
                    { num: 1, text: t('pwaStep_ios1'), icon: <Share size={13} className="inline text-blue-500 mb-0.5 mx-0.5" /> },
                    { num: 2, text: t('pwaStep_ios2'), icon: null },
                    { num: 3, text: t('pwaStep_ios3'), icon: null },
                  ].map(({ num, text, icon }) => (
                    <li key={num} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {num}
                      </span>
                      <span className="text-sm text-gray-700 leading-relaxed">
                        {num === 1 ? (
                          <>{text.split('Share')[0]}{icon}<strong>Share</strong>{text.split('Share')[1]}</>
                        ) : text}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {platform === 'safari-mac' && (
                <ol className="space-y-3 mt-5">
                  {[t('pwaStep_mac1'), t('pwaStep_mac2')].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ol>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={dismiss}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {t('pwaDismiss')}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {t('pwaGotIt')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
