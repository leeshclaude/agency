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

function RequiredLabel({ children }) {
  return (
    <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
      {children} <span style={{ color: '#e53e3e' }}>*</span>
    </label>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs mt-1" style={{ color: '#e53e3e' }}>{message}</p>
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')

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
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      // Clear the error for this field as they type
      if (fieldErrors[field]) setFieldErrors((fe) => ({ ...fe, [field]: '' }))
    }
  }

  function validateStep() {
    const errors = {}
    if (step === 0) {
      if (!form.full_name.trim()) errors.full_name = 'Required'
      if (!form.instagram_handle.trim()) errors.instagram_handle = 'Required'
      if (!form.instagram_followers || isNaN(form.instagram_followers) || Number(form.instagram_followers) < 0)
        errors.instagram_followers = 'Enter a valid follower count'
    }
    if (step === 1) {
      if (!form.location_state) errors.location_state = 'Required'
      if (!form.location_city.trim()) errors.location_city = 'Required'
    }
    if (step === 2) {
      if (!form.email.trim()) errors.email = 'Required'
      if (!form.password) errors.password = 'Required'
      else if (form.password.length < 8) errors.password = 'Must be at least 8 characters'
      if (form.password && form.password !== form.confirm_password)
        errors.confirm_password = 'Passwords do not match'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function next() {
    if (!validateStep()) return
    setFieldErrors({})
    setStep((s) => s + 1)
  }

  function back() {
    setFieldErrors({})
    setServerError('')
    setStep((s) => s - 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateStep()) return

    setLoading(true)
    setServerError('')

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
      setServerError(signUpError.message)
      setLoading(false)
      return
    }

    // Notify admin — fire and forget, don't block the signup flow
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetch('/api/notify-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          instagram_handle: handle.trim(),
          instagram_followers: parseInt(form.instagram_followers),
          location_state: form.location_state,
          location_city: form.location_city.trim(),
          email: form.email.trim().toLowerCase(),
        }),
      }).catch(() => {})
    }).catch(() => {})

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
                <RequiredLabel>Full name</RequiredLabel>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={set('full_name')}
                  autoComplete="name"
                  style={fieldErrors.full_name ? { borderColor: '#e53e3e' } : {}}
                />
                <FieldError message={fieldErrors.full_name} />
              </div>
              <div>
                <RequiredLabel>Instagram handle</RequiredLabel>
                <input
                  className="input-field"
                  type="text"
                  placeholder="@yourusername"
                  value={form.instagram_handle}
                  onChange={set('instagram_handle')}
                  autoComplete="off"
                  autoCapitalize="none"
                  style={fieldErrors.instagram_handle ? { borderColor: '#e53e3e' } : {}}
                />
                <FieldError message={fieldErrors.instagram_handle} />
              </div>
              <div>
                <RequiredLabel>Instagram follower count</RequiredLabel>
                <input
                  className="input-field"
                  type="number"
                  placeholder="e.g. 12000"
                  min="0"
                  value={form.instagram_followers}
                  onChange={set('instagram_followers')}
                  style={fieldErrors.instagram_followers ? { borderColor: '#e53e3e' } : {}}
                />
                <FieldError message={fieldErrors.instagram_followers} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <RequiredLabel>State</RequiredLabel>
                <select
                  className="input-field"
                  value={form.location_state}
                  onChange={set('location_state')}
                  style={fieldErrors.location_state ? { borderColor: '#e53e3e' } : {}}
                >
                  <option value="">Select your state</option>
                  {AUSTRALIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <FieldError message={fieldErrors.location_state} />
              </div>
              <div>
                <RequiredLabel>City</RequiredLabel>
                <input
                  className="input-field"
                  type="text"
                  placeholder="e.g. Sydney"
                  value={form.location_city}
                  onChange={set('location_city')}
                  style={fieldErrors.location_city ? { borderColor: '#e53e3e' } : {}}
                />
                <FieldError message={fieldErrors.location_city} />
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
                <RequiredLabel>Email address</RequiredLabel>
                <input
                  className="input-field"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  autoCapitalize="none"
                  style={fieldErrors.email ? { borderColor: '#e53e3e' } : {}}
                />
                <FieldError message={fieldErrors.email} />
              </div>
              <div>
                <RequiredLabel>Password</RequiredLabel>
                <input
                  className="input-field"
                  type="password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  style={fieldErrors.password ? { borderColor: '#e53e3e' } : {}}
                />
                <FieldError message={fieldErrors.password} />
              </div>
              <div>
                <RequiredLabel>Confirm password</RequiredLabel>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Repeat your password"
                  value={form.confirm_password}
                  onChange={set('confirm_password')}
                  autoComplete="new-password"
                  style={fieldErrors.confirm_password ? { borderColor: '#e53e3e' } : {}}
                />
                <FieldError message={fieldErrors.confirm_password} />
              </div>
            </>
          )}

          {serverError && (
            <p className="text-sm" style={{ color: '#e53e3e' }}>{serverError}</p>
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
