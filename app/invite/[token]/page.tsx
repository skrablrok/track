'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Building2, Eye, EyeOff, Check, X } from 'lucide-react'

function req(rule: boolean) {
  return rule
    ? <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
    : <X className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'done'>('loading')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(password)
  const hasLength = password.length >= 15
  const passwordValid = hasUpper && hasNumber && hasSpecial && hasLength
  const passwordsMatch = password === confirm && confirm.length > 0

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setEmail(data.email)
          setStatus('valid')
        } else {
          setStatus(data.reason === 'expired' ? 'expired' : 'invalid')
        }
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordValid) return setError('Password does not meet requirements')
    if (!passwordsMatch) return setError('Passwords do not match')
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setStatus('done')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-xl">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">BuildFlow</h1>
          <p className="text-blue-300 mt-1 text-sm">Construction Inventory Management</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {status === 'loading' && (
            <div className="text-center py-8 text-gray-400">Verifying invite link…</div>
          )}

          {status === 'expired' && (
            <div className="text-center py-4">
              <p className="text-lg font-semibold text-gray-800 mb-2">Link Expired</p>
              <p className="text-sm text-gray-500">This invitation link has expired. Please ask your administrator to send a new invite.</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center py-4">
              <p className="text-lg font-semibold text-gray-800 mb-2">Invalid Link</p>
              <p className="text-sm text-gray-500">This invitation link is invalid or has already been used.</p>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-2">Account Ready!</p>
              <p className="text-sm text-gray-500 mb-6">Your account has been set up. You can now sign in.</p>
              <button onClick={() => router.push('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all">
                Go to Login
              </button>
            </div>
          )}

          {status === 'valid' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Complete your registration</h2>
              <p className="text-sm text-gray-400 mb-6">{email}</p>

              {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 mb-5 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      required
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full pr-11 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2 space-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">{req(hasLength)} At least 15 characters</div>
                      <div className="flex items-center gap-1.5">{req(hasUpper)} One uppercase letter (A–Z)</div>
                      <div className="flex items-center gap-1.5">{req(hasNumber)} One number (0–9)</div>
                      <div className="flex items-center gap-1.5">{req(hasSpecial)} One special character (e.g. !@#$)</div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      required
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••••••••••"
                      className={`w-full pr-11 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 ${confirm.length > 0 && !passwordsMatch ? 'border-red-300' : 'border-gray-200'}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && !passwordsMatch && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !passwordValid || !passwordsMatch || !name.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? 'Setting up…' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
