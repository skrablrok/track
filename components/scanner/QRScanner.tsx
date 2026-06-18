'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Flashlight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  onScan: (result: string) => void
}

export default function QRScanner({ onScan }: Props) {
  const { t } = useLanguage()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<any>(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(false)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setActive(true)
        startScanning()
      }
    } catch (e) {
      setError(t('cameraPermissionDenied'))
    }
  }

  function stopCamera() {
    clearInterval(intervalRef.current)
    const video = videoRef.current
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
    }
  }

  function startScanning() {
    intervalRef.current = setInterval(async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState !== 4) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        // Use BarcodeDetector if available (modern browsers/Android)
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
          const barcodes = await detector.detect(canvas)
          if (barcodes.length > 0) {
            clearInterval(intervalRef.current)
            onScan(barcodes[0].rawValue)
          }
        }
      } catch {}
    }, 300)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Camera className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-600 font-medium">{error}</p>
        <p className="text-xs text-gray-400 mt-2">
          {t('cameraHint')}
        </p>
        <ManualInput onScan={onScan} />
      </div>
    )
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full aspect-[4/3] object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-56 h-56 relative">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-0.5 bg-blue-500 opacity-70 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <p className="text-white text-sm text-center opacity-90">{t('pointCameraAtQR')}</p>
      </div>
    </div>
  )
}

function ManualInput({ onScan }: { onScan: (v: string) => void }) {
  const { t } = useLanguage()
  const [value, setValue] = useState('')

  return (
    <div className="mt-4 w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('manualEntry')}
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && value && onScan(value)}
        />
        <button
          onClick={() => value && onScan(value)}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {t('go')}
        </button>
      </div>
    </div>
  )
}
