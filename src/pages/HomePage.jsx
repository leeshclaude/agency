import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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

export default function HomePage() {
  const { profile, isAdmin, signOut } = useAuth()
  const [announcement, setAnnouncement] = useState(null)
  const [resources, setResources] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)

  // Admin state
  const [editingAnnouncement, setEditingAnnouncement] = useState(false)
  const [announcementDraft, setAnnouncementDraft] = useState('')
  const [showAddResource, setShowAddResource] = useState(false)
  const [editingResource, setEditingResource] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: ann }, { data: res }] = await Promise.all([
      supabase.from('announcements').select('*').eq('id', 1).single(),
      supabase.from('resources').select('*').order('created_at', { ascending: false }),
    ])
    if (ann) setAnnouncement(ann.text)
    if (res) setResources(res)
    setLoading(false)
  }

  async function saveAnnouncement() {
    await supabase.from('announcements').update({ text: announcementDraft, updated_by: profile.id }).eq('id', 1)
    setAnnouncement(announcementDraft)
    setEditingAnnouncement(false)
  }

  async function deleteResource(id) {
    await supabase.from('resources').delete().eq('id', id)
    setResources((r) => r.filter((x) => x.id !== id))
  }

  const filtered = activeCategory === 'All'
    ? resources
    : resources.filter((r) => r.category === activeCategory)

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="page-container">
      {/* Greeting */}
      <div className="mb-6">
        <p className="section-label mb-1">Welcome back</p>
        <h1 className="text-2xl font-semibold" style={{ color: '#302820' }}>
          Hey, {firstName} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8e7a68' }}>
          {profile?.instagram_handle}
        </p>
      </div>

      {/* Announcement banner */}
      {(announcement || isAdmin) && (
        <div className="mb-6">
          {editingAnnouncement ? (
            <div className="card p-4">
              <p className="section-label mb-2">Announcement</p>
              <input
                className="input-field mb-3"
                value={announcementDraft}
                onChange={(e) => setAnnouncementDraft(e.target.value)}
                placeholder="Type an announcement…"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={saveAnnouncement} className="btn-primary text-sm py-2" style={{ width: 'auto', paddingLeft: 16, paddingRight: 16 }}>
                  Save
                </button>
                <button onClick={() => setEditingAnnouncement(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : announcement ? (
            <div
              className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
              style={{ background: '#edd5cc' }}
            >
              <span className="text-lg flex-shrink-0">📢</span>
              <p className="text-sm font-medium flex-1" style={{ color: '#4e4238' }}>{announcement}</p>
              {isAdmin && (
                <button
                  onClick={() => { setAnnouncementDraft(announcement); setEditingAnnouncement(true) }}
                  className="text-xs flex-shrink-0 font-medium"
                  style={{ color: '#8e7a68' }}
                >
                  Edit
                </button>
              )}
            </div>
          ) : isAdmin ? (
            <button
              onClick={() => { setAnnouncementDraft(''); setEditingAnnouncement(true) }}
              className="w-full rounded-2xl px-4 py-3.5 text-sm text-left"
              style={{ background: '#f5f0ec', color: '#b09d8a', border: '1px dashed #ddd2c7' }}
            >
              + Add an announcement
            </button>
          ) : null}
        </div>
      )}

      {/* Resources */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: '#302820' }}>Resources</h2>
        {isAdmin && (
          <button
            onClick={() => { setEditingResource(null); setShowAddResource(true) }}
            className="text-sm font-medium"
            style={{ color: '#c9a99a' }}
          >
            + Add
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: activeCategory === cat ? '#c9a99a' : '#fff',
              color: activeCategory === cat ? '#fff' : '#6e5e4f',
              border: `1px solid ${activeCategory === cat ? '#c9a99a' : '#ddd2c7'}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: '#b09d8a' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <span style={{ fontSize: 32 }}>📭</span>
          <p className="mt-3 text-sm" style={{ color: '#b09d8a' }}>No resources yet in this category</p>
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

      {/* Sign out */}
      <div className="mt-10 text-center">
        <button onClick={signOut} className="btn-ghost text-sm">
          Sign out
        </button>
      </div>

      {/* Add/Edit Resource Modal */}
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
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xl flex-shrink-0 mt-0.5">
            {CATEGORY_ICONS[resource.category] || '📄'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#f5f0ec', color: '#8e7a68' }}
              >
                {resource.category}
              </span>
            </div>
            <h3 className="font-semibold text-sm mb-1" style={{ color: '#302820' }}>
              {resource.title}
            </h3>
            <p className="text-sm" style={{ color: '#6e5e4f' }}>{resource.description}</p>
            {resource.link && (
              <a
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs font-medium"
                style={{ color: '#c9a99a' }}
              >
                Open link →
              </a>
            )}
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
  )
}

function ResourceModal({ resource, profileId, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: resource?.title || '',
    description: resource?.description || '',
    link: resource?.link || '',
    category: resource?.category || 'Brand Outreach',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave() {
    if (!form.title.trim()) return setError('Title is required.')
    if (!form.description.trim()) return setError('Description is required.')
    setLoading(true)
    setError('')

    if (resource) {
      const { error: e } = await supabase.from('resources').update({
        title: form.title.trim(),
        description: form.description.trim(),
        link: form.link.trim() || null,
        category: form.category,
      }).eq('id', resource.id)
      if (e) setError(e.message)
      else onSaved()
    } else {
      const { error: e } = await supabase.from('resources').insert({
        title: form.title.trim(),
        description: form.description.trim(),
        link: form.link.trim() || null,
        category: form.category,
        created_by: profileId,
      })
      if (e) setError(e.message)
      else onSaved()
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(48,40,32,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl px-5 pt-5 pb-8 space-y-4"
        style={{ background: '#faf8f6' }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold" style={{ color: '#302820' }}>
            {resource ? 'Edit resource' : 'Add resource'}
          </h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-sm">✕</button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Title</label>
          <input className="input-field" value={form.title} onChange={set('title')} placeholder="Resource title" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Description</label>
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
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Link (optional)</label>
          <input className="input-field" value={form.link} onChange={set('link')} placeholder="https://…" type="url" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#4e4238' }}>Category</label>
          <select className="input-field" value={form.category} onChange={set('category')}>
            {['Brand Outreach', 'Getting Paid', 'Rate Guidance', 'Content Strategy', 'Legal and Contracts'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>}

        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : resource ? 'Save changes' : 'Add resource'}
        </button>
      </div>
    </div>
  )
}
