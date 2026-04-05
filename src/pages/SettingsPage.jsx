import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import AvatarUpload from '../components/ui/AvatarUpload'

export default function SettingsPage() {
  const { profile, refreshProfile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    instagram_handle: profile?.instagram_handle || '',
    instagram_followers: profile?.instagram_followers || '',
    location_city: profile?.location_city || '',
    location_state: profile?.location_state || '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  function setField(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setProfileSaved(false)
    }
  }

  async function saveProfile() {
    if (!form.full_name.trim()) return setProfileError('Name is required.')
    setProfileSaving(true)
    setProfileError('')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        instagram_handle: form.instagram_handle.trim(),
        instagram_followers: Number(form.instagram_followers) || 0,
        location_city: form.location_city.trim(),
        location_state: form.location_state.trim(),
      })
      .eq('id', profile.id)

    if (error) {
      setProfileError('Failed to save. Please try again.')
    } else {
      await refreshProfile()
      setProfileSaved(true)
    }
    setProfileSaving(false)
  }

  async function changePassword() {
    if (passwords.newPassword.length < 6)
      return setPasswordError('Password must be at least 6 characters.')
    if (passwords.newPassword !== passwords.confirmPassword)
      return setPasswordError('Passwords do not match.')

    setPasswordSaving(true)
    setPasswordError('')

    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSaved(true)
      setPasswords({ newPassword: '', confirmPassword: '' })
    }
    setPasswordSaving(false)
  }

  async function handleSignOut() {
    await signOut()
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-1">Account</p>
        <h1
          className="text-2xl"
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
        >
          Settings
        </h1>
      </div>

      {/* Avatar */}
      <div className="card p-5 mb-4 flex flex-col items-center">
        <AvatarUpload size={80} />
        <p className="text-xs mt-3" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>Tap your photo to update it</p>
      </div>

      {/* Profile info */}
      <div className="card p-5 mb-4 space-y-4">
        <h2
          className="text-xs"
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
        >
          Profile
        </h2>

        <div>
          <label className="section-label block mb-2">Display name</label>
          <input className="input-field" value={form.full_name} onChange={setField('full_name')} placeholder="Your name" />
        </div>

        <div>
          <label className="section-label block mb-2">Instagram handle</label>
          <input className="input-field" value={form.instagram_handle} onChange={setField('instagram_handle')} placeholder="@handle" autoCapitalize="none" />
        </div>

        <div>
          <label className="section-label block mb-2">Instagram followers</label>
          <input
            className="input-field"
            type="number"
            value={form.instagram_followers}
            onChange={setField('instagram_followers')}
            placeholder="e.g. 5000"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="section-label block mb-2">City</label>
            <input className="input-field" value={form.location_city} onChange={setField('location_city')} placeholder="e.g. Sydney" />
          </div>
          <div className="flex-1">
            <label className="section-label block mb-2">State</label>
            <input className="input-field" value={form.location_state} onChange={setField('location_state')} placeholder="e.g. NSW" />
          </div>
        </div>

        {profileError && (
          <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C3A55' }}>{profileError}</p>
        )}
        {profileSaved && (
          <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>Profile saved!</p>
        )}

        <button onClick={saveProfile} disabled={profileSaving} className="btn-primary">
          {profileSaving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      {/* Change password */}
      <div className="card p-5 mb-4 space-y-4">
        <h2
          className="text-xs"
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
        >
          Change password
        </h2>

        <div>
          <label className="section-label block mb-2">New password</label>
          <input
            className="input-field"
            type="password"
            value={passwords.newPassword}
            onChange={(e) => { setPasswords((p) => ({ ...p, newPassword: e.target.value })); setPasswordSaved(false) }}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="section-label block mb-2">Confirm new password</label>
          <input
            className="input-field"
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => { setPasswords((p) => ({ ...p, confirmPassword: e.target.value })); setPasswordSaved(false) }}
            placeholder="Repeat password"
            autoComplete="new-password"
          />
        </div>

        {passwordError && (
          <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C3A55' }}>{passwordError}</p>
        )}
        {passwordSaved && (
          <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>Password updated!</p>
        )}

        <button
          onClick={changePassword}
          disabled={passwordSaving || !passwords.newPassword}
          className="btn-primary"
        >
          {passwordSaving ? 'Updating…' : 'Update password'}
        </button>
      </div>

      {/* Admin link */}
      {isAdmin && (
        <div className="card p-5 mb-4">
          <h2
            className="text-xs mb-3"
            style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
          >
            Admin
          </h2>
          <button onClick={() => navigate('/admin')} className="btn-primary">
            Go to admin dashboard
          </button>
        </div>
      )}

      {/* Sign out */}
      <div className="card p-5 mb-8">
        <h2
          className="text-xs mb-3"
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
        >
          Account
        </h2>
        <button onClick={handleSignOut} className="btn-ghost text-sm w-full">
          Sign out
        </button>
      </div>
    </div>
  )
}
