import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import AvatarUpload from '../components/ui/AvatarUpload'

const CATEGORIES = [
  'All',
  'Brand Outreach',
  'Getting Paid',
  'Rate Guidance',
  'Content Strategy',
  'Legal and Contracts',
]

const CATEGORY_ICONS = {
  'Brand Outreach': '📣',
  'Getting Paid': '💰',
  'Rate Guidance': '📊',
  'Content Strategy': '✨',
  'Legal and Contracts': '📋',
}

async function uploadHomeFile(file, folder) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('home-uploads').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('home-uploads').getPublicUrl(path)
  return publicUrl
}

export default function HomePage() {
  const { profile, isAdmin } = useAuth()
  const [announcement, setAnnouncement] = useState(null)
  const [resources, setResources] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)

  const [editingAnnouncement, setEditingAnnouncement] = useState(false)
  const [annDraftText, setAnnDraftText] = useState('')
  const [annImgFile, setAnnImgFile] = useState(null)
  const [annImgPreview, setAnnImgPreview] = useState(null)
  const [annAttachFile, setAnnAttachFile] = useState(null)
  const [annAttachName, setAnnAttachName] = useState('')
  const [annSaving, setAnnSaving] = useState(false)
  const annImgRef = useRef(null)
  const annFileRef = useRef(null)

  const [showAddResource, setShowAddResource] = useState(false)
  const [editingResource, setEditingResource] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: ann }, { data: res }] = await Promise.all([
      supabase.from('announcements').select('*').eq('id', 1).single(),
      supabase.from('resources').select('*').order('created_at', { ascending: false }),
    ])
    if (ann) setAnnouncement(ann)
    if (res) setResources(res)
    setLoading(false)
  }

  function startEditAnnouncement() {
    setAnnDraftText(announcement?.text || '')
    setAnnImgPreview(announcement?.image_url || null)
    setAnnImgFile(null)
    setAnnAttachFile(null)
    setAnnAttachName(announcement?.file_name || '')
    setEditingAnnouncement(true)
  }

  function handleAnnImgChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAnnImgFile(file)
    setAnnImgPreview(URL.createObjectURL(file))
  }

  function handleAnnFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAnnAttachFile(file)
    setAnnAttachName(file.name)
  }

  async function saveAnnouncement() {
    setAnnSaving(true)
    try {
      let imageUrl = annImgFile ? null : (annImgPreview ?? null)
      let fileUrl = annAttachFile ? null : (announcement?.file_url ?? null)
      let fileName = annAttachFile ? null : (annAttachName || null)

      if (annImgFile) imageUrl = await uploadHomeFile(annImgFile, 'announcements/images')
      if (annAttachFile) {
        fileUrl = await uploadHomeFile(annAttachFile, 'announcements/files')
        fileName = annAttachFile.name
      }

      const updated = {
        text: annDraftText.trim() || null,
        image_url: imageUrl,
        file_url: fileUrl,
        file_name: fileName,
        updated_by: profile.id,
      }
      await supabase.from('announcements').upsert({ id: 1, ...updated })
      setAnnouncement((prev) => ({ ...prev, ...updated }))
      setEditingAnnouncement(false)
    } catch (e) {
      console.error('Failed to save announcement:', e)
    }
    setAnnSaving(false)
  }

  async function deleteResource(id) {
    await supabase.from('resources').delete().eq('id', id)
    setResources((r) => r.filter((x) => x.id !== id))
  }

  const hasAnnouncement = announcement?.text || announcement?.image_url || announcement?.file_url
  const filtered = activeCategory === 'All'
    ? resources
    : resources.filter((r) => r.category === activeCategory)
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="page-container">

      {/* ── Greeting ──────────────────────────────────── */}
      <div className="mb-7 flex items-center gap-4">
        <AvatarUpload size={64} />
        <div>
          <p className="section-label mb-1">Welcome back</p>
          <h1
            className="text-2xl"
            style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
          >
            Hey, {firstName}
          </h1>
          <p className="text-sm mt-0.5" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>
            {profile?.instagram_handle}
          </p>
        </div>
      </div>

      {/* ── Announcement banner ───────────────────────── */}
      {(hasAnnouncement || isAdmin) && (
        <div className="mb-7">
          {editingAnnouncement ? (
            <div className="card p-5 space-y-4">
              <p className="section-label">Announcement</p>

              <textarea
                className="input-field"
                value={annDraftText}
                onChange={(e) => setAnnDraftText(e.target.value)}
                placeholder="Type an announcement… (optional if adding image/file)"
                rows={3}
                style={{ resize: 'none' }}
                autoFocus
              />

              {/* Image upload */}
              <div>
                <p className="section-label mb-2">Image (optional)</p>
                {annImgPreview && (
                  <div className="mb-2 relative">
                    <img src={annImgPreview} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight: 180 }} />
                    <button
                      onClick={() => { setAnnImgFile(null); setAnnImgPreview(null) }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(44,26,34,0.55)', color: '#fff' }}
                    >✕</button>
                  </div>
                )}
                <input ref={annImgRef} type="file" accept="image/*" onChange={handleAnnImgChange} className="hidden" />
                <button
                  onClick={() => annImgRef.current.click()}
                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{ background: '#FAE8EF', color: '#8C3A55', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {annImgPreview ? 'Change image' : '+ Add image'}
                </button>
              </div>

              {/* File attachment */}
              <div>
                <p className="section-label mb-2">File attachment (optional)</p>
                {annAttachName && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl" style={{ background: '#FAE8EF' }}>
                    <span className="text-sm flex-1 truncate" style={{ fontFamily: 'DM Sans, sans-serif', color: '#2C1A22' }}>📎 {annAttachName}</span>
                    <button onClick={() => { setAnnAttachFile(null); setAnnAttachName('') }} className="text-xs" style={{ color: '#6B4A57' }}>✕</button>
                  </div>
                )}
                <input ref={annFileRef} type="file" onChange={handleAnnFileChange} className="hidden" />
                <button
                  onClick={() => annFileRef.current.click()}
                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{ background: '#FAE8EF', color: '#8C3A55', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {annAttachName ? 'Change file' : '+ Attach file'}
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveAnnouncement}
                  disabled={annSaving}
                  className="btn-primary"
                  style={{ width: 'auto', paddingLeft: 20, paddingRight: 20 }}
                >
                  {annSaving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingAnnouncement(false)} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </div>

          ) : hasAnnouncement ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FAE8EF' }}>
              {announcement?.image_url && (
                <img src={announcement.image_url} alt="" className="w-full object-cover" style={{ maxHeight: 220 }} />
              )}
              {(announcement?.text || announcement?.file_url) && (
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    {!announcement?.image_url && <span className="text-lg flex-shrink-0">📢</span>}
                    <div className="flex-1 min-w-0">
                      {announcement?.text && (
                        <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#2C1A22', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {announcement.text}
                        </p>
                      )}
                      {announcement?.file_url && (
                        <a
                          href={announcement.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={announcement.file_name}
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium px-3 py-1.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.6)', color: '#8C3A55', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          📎 {announcement.file_name || 'Download attachment'}
                        </a>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={startEditAnnouncement}
                        className="text-xs flex-shrink-0"
                        style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C3A55' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              )}
              {announcement?.image_url && !announcement?.text && !announcement?.file_url && isAdmin && (
                <div className="px-4 py-2 flex justify-end">
                  <button
                    onClick={startEditAnnouncement}
                    className="text-xs"
                    style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C3A55' }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

          ) : isAdmin ? (
            <button
              onClick={startEditAnnouncement}
              className="w-full rounded-2xl px-4 py-4 text-left"
              style={{ background: '#FAE8EF', border: '1px dashed #F2A7BE' }}
            >
              <span style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D4688A' }}>
                + Add an announcement
              </span>
            </button>
          ) : null}
        </div>
      )}

      {/* ── Resources header ──────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2
          style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, fontSize: 16, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2C1A22' }}
        >
          Resources
        </h2>
        {isAdmin && (
          <button
            onClick={() => { setEditingResource(null); setShowAddResource(true) }}
            style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D4688A' }}
          >
            + Add
          </button>
        )}
      </div>

      {/* ── Category filter ───────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full transition-all"
            style={{
              background: activeCategory === cat ? '#D4688A' : '#FAE8EF',
              color: activeCategory === cat ? '#fff' : '#8C3A55',
              border: `1px solid ${activeCategory === cat ? '#D4688A' : '#F2A7BE'}`,
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <span style={{ fontSize: 32 }}>📭</span>
          <p className="mt-3 text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>No resources yet in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              isAdmin={isAdmin}
              onEdit={() => { setEditingResource(r); setShowAddResource(true) }}
              onDelete={() => deleteResource(r.id)}
            />
          ))}
        </div>
      )}

      {showAddResource && (
        <ResourceModal
          resource={editingResource}
          profileId={profile.id}
          onClose={() => setShowAddResource(false)}
          onSaved={() => { setShowAddResource(false); fetchData() }}
        />
      )}
    </div>
  )
}

function ResourceCard({ resource, isAdmin, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="card overflow-hidden">
      {resource.image_url && (
        <img src={resource.image_url} alt="" className="w-full object-cover" style={{ maxHeight: 180 }} />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {!resource.image_url && (
              <span className="text-xl flex-shrink-0 mt-0.5">{CATEGORY_ICONS[resource.category] || '📄'}</span>
            )}
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full"
                  style={{
                    background: '#FAE8EF',
                    color: '#8C3A55',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  {resource.category}
                </span>
              </div>
              <h3
                className="mb-1"
                style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2C1A22' }}
              >
                {resource.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B4A57' }}>
                {resource.description}
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                {resource.link && (
                  <a
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D4688A' }}
                  >
                    Open link →
                  </a>
                )}
                {resource.file_url && (
                  <a
                    href={resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={resource.file_name}
                    style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D4688A' }}
                  >
                    📎 {resource.file_name || 'Download'}
                  </a>
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={onEdit} className="btn-ghost text-xs px-2 py-1">Edit</button>
              {confirmDelete ? (
                <button onClick={onDelete} className="btn-danger text-xs px-2 py-1">Confirm</button>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="btn-danger text-xs px-2 py-1">Delete</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResourceModal({ resource, profileId, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: resource?.title || '',
    description: resource?.description || '',
    link: resource?.link || '',
    category: resource?.category || 'Brand Outreach',
  })
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(resource?.image_url || null)
  const [attachFile, setAttachFile] = useState(null)
  const [attachName, setAttachName] = useState(resource?.file_name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const imgRef = useRef(null)
  const fileRef = useRef(null)

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function handleImgChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    setImgPreview(URL.createObjectURL(file))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachFile(file)
    setAttachName(file.name)
  }

  async function handleSave() {
    if (!form.title.trim()) return setError('Title is required.')
    if (!form.description.trim()) return setError('Description is required.')
    setLoading(true)
    setError('')

    try {
      let imageUrl = imgFile ? null : (imgPreview ?? null)
      let fileUrl = attachFile ? null : (resource?.file_url ?? null)
      let fileName = attachFile ? null : (attachName || null)

      if (imgFile) imageUrl = await uploadHomeFile(imgFile, 'resources/images')
      if (attachFile) {
        fileUrl = await uploadHomeFile(attachFile, 'resources/files')
        fileName = attachFile.name
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        link: form.link.trim() || null,
        category: form.category,
        image_url: imageUrl,
        file_url: fileUrl,
        file_name: fileName,
      }

      if (resource) {
        const { error: e } = await supabase.from('resources').update(payload).eq('id', resource.id)
        if (e) { setError(e.message); setLoading(false); return }
      } else {
        const { error: e } = await supabase.from('resources').insert({ ...payload, created_by: profileId })
        if (e) { setError(e.message); setLoading(false); return }
      }
      onSaved()
    } catch (e) {
      setError('Upload failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(44,26,34,0.45)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl px-5 pt-5 pb-8 space-y-4"
        style={{ background: '#FEF9FB', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontFamily: 'Josefin Sans, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2C1A22' }}>
            {resource ? 'Edit resource' : 'Add resource'}
          </h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1">✕</button>
        </div>

        <div>
          <label className="section-label block mb-2">Title</label>
          <input className="input-field" value={form.title} onChange={set('title')} placeholder="Resource title" />
        </div>
        <div>
          <label className="section-label block mb-2">Description</label>
          <textarea
            className="input-field"
            value={form.description}
            onChange={set('description')}
            placeholder="Describe this resource…"
            rows={3}
            style={{ resize: 'none' }}
          />
        </div>
        <div>
          <label className="section-label block mb-2">Link (optional)</label>
          <input className="input-field" value={form.link} onChange={set('link')} placeholder="https://…" type="url" />
        </div>

        {/* Image upload */}
        <div>
          <label className="section-label block mb-2">Image (optional)</label>
          {imgPreview && (
            <div className="mb-2 relative">
              <img src={imgPreview} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight: 160 }} />
              <button
                onClick={() => { setImgFile(null); setImgPreview(null) }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(44,26,34,0.55)', color: '#fff' }}
              >✕</button>
            </div>
          )}
          <input ref={imgRef} type="file" accept="image/*" onChange={handleImgChange} className="hidden" />
          <button
            onClick={() => imgRef.current.click()}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ background: '#FAE8EF', color: '#8C3A55', fontFamily: 'DM Sans, sans-serif' }}
          >
            {imgPreview ? 'Change image' : '+ Add image'}
          </button>
        </div>

        {/* File attachment */}
        <div>
          <label className="section-label block mb-2">File attachment (optional)</label>
          {attachName && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl" style={{ background: '#FAE8EF' }}>
              <span className="text-sm flex-1 truncate" style={{ fontFamily: 'DM Sans, sans-serif', color: '#2C1A22' }}>📎 {attachName}</span>
              <button onClick={() => { setAttachFile(null); setAttachName('') }} className="text-xs" style={{ color: '#6B4A57' }}>✕</button>
            </div>
          )}
          <input ref={fileRef} type="file" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileRef.current.click()}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ background: '#FAE8EF', color: '#8C3A55', fontFamily: 'DM Sans, sans-serif' }}
          >
            {attachName ? 'Change file' : '+ Attach file'}
          </button>
        </div>

        <div>
          <label className="section-label block mb-2">Category</label>
          <select className="input-field" value={form.category} onChange={set('category')}>
            {['Brand Outreach', 'Getting Paid', 'Rate Guidance', 'Content Strategy', 'Legal and Contracts'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C3A55' }}>{error}</p>
        )}

        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : resource ? 'Save changes' : 'Add resource'}
        </button>
      </div>
    </div>
  )
}
