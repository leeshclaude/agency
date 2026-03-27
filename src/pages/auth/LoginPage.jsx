import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    })

    if (error) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }
    // Don't navigate manually — AuthContext will update the session and
    // RouterGuard will automatically redirect away from /login
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#faf8f6' }}>
      <div className="px-6 pt-14 pb-10 text-center">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
          style={{ background: '#edd5cc' }}
        >
          <span style={{ fontSize: 20 }}>🌸</span>
        </div>
        <h1 className="text-2xl font-semibold" style={{ color: '#302820' }}>Welcome back</h1>
        <p className="mt-1 text-sm" style={{ color: '#8e7a68' }}>Sign in to The Mama Edit</p>
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
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
              Password
            </label>
            <input
              className="input-field"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={set('password')}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: '#8e7a68' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium" style={{ color: '#c9a99a' }}>
            Request to join
          </Link>
        </p>
      </div>
    </div>
  )
}
