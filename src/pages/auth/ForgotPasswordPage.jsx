import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return setError('Please enter your email address.')
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    )

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: '#FEF9FB' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: '#FAE8EF' }}
        >
          <span style={{ fontSize: 26 }}>📬</span>
        </div>
        <h1
          className="text-xl mb-2"
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
        >
          Check your inbox
        </h1>
        <p className="text-sm mb-6" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57', maxWidth: 300 }}>
          We've sent a password reset link to <strong>{email}</strong>. Check your inbox and spam folder.
        </p>
        <Link
          to="/login"
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D4688A' }}
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FEF9FB' }}>
      <div className="px-6 pt-16 pb-10 text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
          style={{ background: '#FAE8EF' }}
        >
          <span style={{ fontSize: 24 }}>🔑</span>
        </div>
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
        >
          Forgot password?
        </h1>
        <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="section-label block mb-2">Email address</label>
            <input
              className="input-field"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#FAE8EF', color: '#8C3A55', fontFamily: 'DM Sans, sans-serif' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm mt-8" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>
          Remember it?{' '}
          <Link to="/login" className="font-medium" style={{ color: '#D4688A' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
