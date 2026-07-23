'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'

type Platform = 'chrome' | 'safari-ios' | 'safari-mac' | 'edge' | null

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent

  // Already installed as PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return null
  if ((navigator as any).standalone === true) return null

  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua)
  const isMac = /Macintosh/.test(ua)

  if (isIOS && isSafari) return 'safari-ios'
  if (isMac && isSafari) return 'safari-mac'

  return null // chrome/edge handled via beforeinstallprompt event
}

export default function InstallButton() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Already installed?
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    ) {
      setInstalled(true)
      return
    }

    // Dismissed recently?
    const ts = localStorage.getItem('pwa-dismissed')
    if (ts && Date.now() - Number(ts) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true)
      return
    }

    setPlatform(detectPlatform())

    // Chrome/Edge: capture the native install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform('chrome')
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Track successful install
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-dismissed', String(Date.now()))
    setDismissed(true)
    setShowModal(false)
  }

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

  if (installed || dismissed || (!platform && !deferredPrompt)) return null

  return (
    <>
      <button
        onClick={handleClick}
        title="Install app"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition-colors border border-blue-100"
      >
        <Download size={13} />
        <span className="hidden sm:inline">Install app</span>
      </button>

      {/* Instructions modal for Safari */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg">
              <X size={16} className="text-gray-400" />
            </button>

            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-white" />
            </div>

            <h2 className="text-base font-bold text-gray-900 mb-1">Install App</h2>
            <p className="text-sm text-gray-500 mb-5">Add BuildFlow to your home screen for quick access.</p>

            {platform === 'safari-ios' && (
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Tap the <Share size={14} className="inline mb-0.5 text-blue-600" /> <strong>Share</strong> button at the bottom of Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>"Add"</strong> in the top right corner</span>
                </li>
              </ol>
            )}

            {platform === 'safari-mac' && (
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Click <strong>File</strong> in the menu bar</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Click <strong>"Add to Dock"</strong></span>
                </li>
              </ol>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={dismiss} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                Don't show again
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
