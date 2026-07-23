'use client'

import { useEffect, useState } from 'react'
import { Download, X, MoreHorizontal } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Platform = 'chrome' | 'safari-ios' | 'chrome-ios' | 'safari-mac' | null

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isChromeIOS = /CriOS/.test(ua)
  const isFirefoxIOS = /FxiOS/.test(ua)
  const isEdgeIOS = /EdgiOS/.test(ua)
  const isSafari = /Safari/.test(ua) && !isChromeIOS && !isFirefoxIOS && !isEdgeIOS
  const isMac = /Macintosh/.test(ua)

  if (isIOS && isChromeIOS) return 'chrome-ios'
  if (isIOS && isSafari) return 'safari-ios'
  if (isMac && isSafari) return 'safari-mac'
  return null
}

function IOSShareIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function Step({ num, color, children }: { num: number; color: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-4 mb-3 flex items-center gap-4 ${num === 1 ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${color}`}>
        {children}
      </div>
    </div>
  )
}

export default function InstallButton() {
  const { t } = useLanguage()
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    ) {
      setInstalled(true)
      return
    }

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
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferredPrompt(null)
    } else {
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
          className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-2xl rounded-t-3xl shadow-2xl">

            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div
              className="px-6 pt-5 pb-6"
              style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1.5rem))' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base leading-tight">{t('pwaInstallTitle')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">BuildFlow</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Safari iOS */}
              {platform === 'safari-ios' && (
                <>
                  <div className="bg-blue-50 rounded-2xl p-4 mb-3 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white">
                      <IOSShareIcon size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Step 1</p>
                      <p className="text-sm font-medium text-gray-800">
                        Tap the{' '}
                        <span className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-blue-600 font-semibold text-xs">
                          <IOSShareIcon size={11} /> Share
                        </span>{' '}
                        button in Safari's toolbar
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-3 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">+</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Step 2</p>
                      <p className="text-sm font-medium text-gray-800">Tap <strong>"Add to Home Screen"</strong></p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">✓</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Step 3</p>
                      <p className="text-sm font-medium text-gray-800">Tap <strong>"Add"</strong> to confirm</p>
                    </div>
                  </div>
                </>
              )}

              {/* Chrome iOS */}
              {platform === 'chrome-ios' && (
                <>
                  <div className="bg-blue-50 rounded-2xl p-4 mb-3 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white">
                      <MoreHorizontal size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Step 1</p>
                      <p className="text-sm font-medium text-gray-800">
                        Tap the{' '}
                        <span className="inline-flex items-center gap-0.5 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-blue-600 font-semibold text-xs">
                          <MoreHorizontal size={11} /> menu
                        </span>{' '}
                        at the bottom of Chrome
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-3 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">+</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Step 2</p>
                      <p className="text-sm font-medium text-gray-800">Tap <strong>"Add to Home Screen"</strong></p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">✓</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Step 3</p>
                      <p className="text-sm font-medium text-gray-800">Tap <strong>"Add"</strong> to confirm</p>
                    </div>
                  </div>
                </>
              )}

              {/* Safari Mac */}
              {platform === 'safari-mac' && (
                <>
                  <div className="bg-blue-50 rounded-2xl p-4 mb-3 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">File</div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Step 1</p>
                      <p className="text-sm font-medium text-gray-800">{t('pwaStep_mac1')}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl">⊞</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Step 2</p>
                      <p className="text-sm font-medium text-gray-800">{t('pwaStep_mac2')}</p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button onClick={dismiss} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                  {t('pwaDismiss')}
                </button>
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
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
