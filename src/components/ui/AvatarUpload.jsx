import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function AvatarUpload({ size = 72 }) {
  const { profile, refreshProfile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setUploading(true)

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(profile.id, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(profile.id)
      // Append cache-busting timestamp so re-uploads always show fresh image
      const avatarUrl = data.publicUrl + '?t=' + Date.now()

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      await refreshProfile()
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#edd5cc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '3px solid #fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          position: 'relative',
        }}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: size * 0.36, fontWeight: 600, color: '#8e7a68' }}>
            {initials}
          </span>
        )}

        {/* Edit overlay */}
        {!uploading && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: size * 0.3,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>Edit</span>
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, color: '#8e7a68' }}>…</span>
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 12, color: '#dc2626', textAlign: 'center' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
