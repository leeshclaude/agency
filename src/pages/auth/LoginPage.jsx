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
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FEF9FB' }}>
      <div className="px-6 pt-16 pb-10 text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
          style={{ background: '#FAE8EF' }}
        >
          <span style={{ fontSize: 24 }}>🌸</span>
        </div>
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
        >
          Welcome back
        </h1>
        <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>
          Sign in to The Mama Edit
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
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="section-label block mb-2">Password</label>
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
            <p className="text-sm" style={{ color: '#8C3A55' }}>{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="text-center pt-1">
            <Link
              to="/forgot-password"
              className="text-sm"
              style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}
            >
              Forgot password?
            </Link>
          </div>
        </form>

        <p className="text-center text-sm mt-8" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium" style={{ color: '#D4688A' }}>
            Request to join
          </Link>
        </p>
      </div>
    </div>
  )
}
