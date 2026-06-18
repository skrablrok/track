'use client'

import { useRef, useState } from 'react'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  value: string
  onChange: (dataUrl: string) => void
}

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.75

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width)
            width = MAX_DIMENSION
          } else {
            width = Math.round((width * MAX_DIMENSION) / height)
            height = MAX_DIMENSION
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas not supported'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }
      img.onerror = () => reject(new Error('Could not read image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export default function PhotoInput({ value, onChange }: Props) {
  const { t } = useLanguage()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')
    setProcessing(true)
    try {
      const dataUrl = await compressImage(file)
      onChange(dataUrl)
    } catch (e: any) {
      setError(e.message || 'Failed to process photo')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('photo')}</label>

      {value && (
        <div className="relative rounded-xl overflow-hidden h-40 bg-gray-50 border border-gray-100 mb-3">
          <img src={value} alt="Preview" className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-sm"
          >
            <X size={14} className="text-gray-600" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={processing}
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          {processing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {t('takePhoto')}
        </button>
        <button
          type="button"
          disabled={processing}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          {processing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {t('uploadPhoto')}
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
