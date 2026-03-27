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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: '#faf8f6' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: '#edd5cc' }}>
          <span style={{ fontSize: 26 }}>📬</span>
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: '#302820' }}>Check your inbox</h1>
        <p className="text-sm mb-6" style={{ color: '#8e7a68', maxWidth: 300 }}>
          We've sent a password reset link to <strong>{email}</strong>. Check your inbox and spam folder.
        </p>
        <Link to="/login" className="text-sm font-medium" style={{ color: '#c9a99a' }}>
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#faf8f6' }}>
      <div className="px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
          style={{ background: '#edd5cc' }}>
          <span style={{ fontSize: 20 }}>🔑</span>
        </div>
        <h1 className="text-2xl font-semibold" style={{ color: '#302820' }}>Forgot password?</h1>
        <p className="mt-1 text-sm" style={{ color: '#8e7a68' }}>
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
              Email address
            </label>
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
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: '#8e7a68' }}>
          Remember it?{' '}
          <Link to="/login" className="font-medium" style={{ color: '#c9a99a' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
