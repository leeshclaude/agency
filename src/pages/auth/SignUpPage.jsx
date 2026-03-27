import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const AUSTRALIAN_STATES = [
  'New South Wales',
  'Victoria',
  'Queensland',
  'South Australia',
  'Western Australia',
  'Tasmania',
  'Northern Territory',
  'Australian Capital Territory',
]

const STEPS = ['Your Details', 'Location', 'Account']

export default function SignUpPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    instagram_handle: '',
    instagram_followers: '',
    location_state: '',
    location_city: '',
    email: '',
    password: '',
    confirm_password: '',
  })

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function validateStep() {
    setError('')
    if (step === 0) {
      if (!form.full_name.trim()) return setError('Please enter your full name.') || false
      if (!form.instagram_handle.trim()) return setError('Please enter your Instagram handle.') || false
      if (!form.instagram_followers || isNaN(form.instagram_followers) || Number(form.instagram_followers) < 0)
        return setError('Please enter a valid follower count.') || false
    }
    if (step === 1) {
      if (!form.location_state) return setError('Please select your state.') || false
      if (!form.location_city.trim()) return setError('Please enter your city.') || false
    }
    if (step === 2) {
      if (!form.email.trim()) return setError('Please enter your email.') || false
      if (!form.password) return setError('Please enter a password.') || false
      if (form.password.length < 8) return setError('Password must be at least 8 characters.') || false
      if (form.password !== form.confirm_password) return setError('Passwords do not match.') || false
    }
    return true
  }

  function next() {
    if (!validateStep()) return
    setStep((s) => s + 1)
  }

  function back() {
    setError('')
    setStep((s) => s - 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateStep()) return

    setLoading(true)
    setError('')

    const handle = form.instagram_handle.startsWith('@')
      ? form.instagram_handle
      : `@${form.instagram_handle}`

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: {
          full_name: form.full_name.trim(),
          instagram_handle: handle.trim(),
          instagram_followers: parseInt(form.instagram_followers),
          location_state: form.location_state,
          location_city: form.location_city.trim(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Notify admin — fire and forget, don't block the signup flow
    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        instagram_handle: handle.trim(),
        instagram_followers: parseInt(form.instagram_followers),
        location_state: form.location_state,
        location_city: form.location_city.trim(),
        email: form.email.trim().toLowerCase(),
      }),
    }).catch(() => {}) // silently ignore if email fails

    navigate('/pending')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#faf8f6' }}>
      {/* Header */}
      <div className="px-6 pt-14 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
          style={{ background: '#edd5cc' }}>
          <span style={{ fontSize: 20 }}>🌸</span>
        </div>
        <h1 className="text-2xl font-semibold" style={{ color: '#302820' }}>The Mama Edit</h1>
        <p className="mt-1 text-sm" style={{ color: '#8e7a68' }}>Join our private community</p>
      </div>

      {/* Step indicator */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                  style={{
                    background: i <= step ? '#c9a99a' : '#ece4dc',
                    color: i <= step ? '#fff' : '#b09d8a',
                  }}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-xs" style={{ color: i === step ? '#302820' : '#b09d8a' }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px" style={{ background: '#ece4dc' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          {step === 0 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
                  Full name
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={set('full_name')}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
                  Instagram handle
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="@yourusername"
                  value={form.instagram_handle}
                  onChange={set('instagram_handle')}
                  autoComplete="off"
                  autoCapitalize="none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
                  Instagram follower count
                </label>
                <input
                  className="input-field"
                  type="number"
                  placeholder="e.g. 12000"
                  min="0"
                  value={form.instagram_followers}
                  onChange={set('instagram_followers')}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
                  State
                </label>
                <select
                  className="input-field"
                  value={form.location_state}
                  onChange={set('location_state')}
                >
                  <option value="">Select your state</option>
                  {AUSTRALIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
                  City
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="e.g. Sydney"
                  value={form.location_city}
                  onChange={set('location_city')}
                />
              </div>
              <div className="card p-4 flex gap-3">
                <span className="text-lg">🇦🇺</span>
                <p className="text-sm" style={{ color: '#6e5e4f' }}>
                  This is an Australia-only community. Only Australian creators are eligible to join.
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
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
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
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
                  value={form.confirm_password}
                  onChange={set('confirm_password')}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button type="button" onClick={back} className="btn-secondary">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next} className="btn-primary">
                Continue
              </button>
            ) : (
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating account…' : 'Request to join'}
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-sm mt-6 pb-8" style={{ color: '#8e7a68' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium" style={{ color: '#c9a99a' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
