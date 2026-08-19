'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Mail, AlertCircle, ChevronDown, ArrowLeft, CheckCircle } from 'lucide-react'
import { LANGUAGES, DEFAULT_LANG, t, type Lang } from '@/lib/i18n/translations'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const cookie = document.cookie.match(/(?:^|; )lang=([^;]+)/)?.[1]
    if (cookie && cookie in LANGUAGES) setLangState(cookie as Lang)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function changeLang(l: Lang) {
    setLangState(l)
    document.cookie = `lang=${l};path=/;max-age=31536000;SameSite=Lax`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError(t(lang, 'networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center p-4">

      <div ref={langRef} className="fixed top-10 right-10 z-50">
        <button
          onClick={() => setLangOpen((v) => !v)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl transition-colors text-sm font-medium"
        >
          <span className="text-xl leading-none">{LANGUAGES[lang].flag}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>
        {langOpen && (
          <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex gap-1">
            {(Object.entries(LANGUAGES) as [Lang, { name: string; flag: string }][]).map(([code, info]) => (
              <button
                key={code}
                onClick={() => { changeLang(code); setLangOpen(false) }}
                title={info.name}
                className={`text-2xl leading-none p-1.5 rounded-xl transition-all hover:bg-gray-100 ${lang === code ? 'bg-blue-50 ring-2 ring-blue-400' : ''}`}
              >
                {info.flag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-xl">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">BuildFlow</h1>
          <p className="text-blue-300 mt-1 text-sm">{t(lang, 'internalSystem')}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t(lang, 'resetPassword')}</h2>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">{t(lang, 'resetLinkSent')}</p>
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t(lang, 'backToLogin')}
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 mb-5 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t(lang, 'emailAddress')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mt-2">
                  {loading ? t(lang, 'sending') : t(lang, 'sendResetLink')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/login')}
                  className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t(lang, 'backToLogin')}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-blue-400 text-xs mt-6">
          © {new Date().getFullYear()} BuildFlow — Internal Use Only
        </p>
      </div>
    </div>
  )
}
