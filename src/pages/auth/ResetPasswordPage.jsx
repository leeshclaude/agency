import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/'), 2000)
  }

  if (done) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: '#FEF9FB' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: '#FAE8EF' }}
        >
          <span style={{ fontSize: 26 }}>✓</span>
        </div>
        <h1
          className="text-xl mb-2"
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
        >
          Password updated
        </h1>
        <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>
          Taking you back to the app…
        </p>
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
          Set new password
        </h1>
        <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>
          Choose a new password for your account
        </p>
      </div>

      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="section-label block mb-2">New password</label>
            <input
              className="input-field"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div>
            <label className="section-label block mb-2">Confirm password</label>
            <input
              className="input-field"
              type="password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#FAE8EF', color: '#8C3A55', fontFamily: 'DM Sans, sans-serif' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
