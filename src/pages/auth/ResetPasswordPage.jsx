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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: '#faf8f6' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: '#d1fae5' }}>
          <span style={{ fontSize: 26 }}>✓</span>
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: '#302820' }}>Password updated</h1>
        <p className="text-sm" style={{ color: '#8e7a68' }}>Taking you back to the app…</p>
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
        <h1 className="text-2xl font-semibold" style={{ color: '#302820' }}>Set new password</h1>
        <p className="mt-1 text-sm" style={{ color: '#8e7a68' }}>Choose a new password for your account</p>
      </div>

      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
              New password
            </label>
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
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
              Confirm password
            </label>
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
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#991b1b' }}>
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
