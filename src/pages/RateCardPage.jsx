import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateRateCardPDF } from '../lib/generatePDF'

const NICHES = ['Lifestyle', 'Motherhood', 'Home', 'Wellness', 'Fashion', 'Food', 'Travel', 'Mixed']

const CONTENT_TYPES = [
  { key: 'reels', label: 'Reels' },
  { key: 'static_post', label: 'Static image post' },
  { key: 'carousel', label: 'Carousel post' },
  { key: 'stories', label: 'Instagram Stories (set of 3)' },
  { key: 'highlights', label: 'Highlights cover creation' },
  { key: 'ugc_video', label: 'UGC video (brand-use rights)' },
  { key: 'ugc_photo', label: 'UGC photo (brand-use rights)' },
]

const STEPS = ['Your Details', 'Content', 'Preferences', 'Pricing', 'Preview']

function getSuggestedRate(followers) {
  if (followers < 5000) return { min: 50, max: 150, label: 'Under 5k followers' }
  if (followers < 10000) return { min: 150, max: 300, label: '5k–10k followers' }
  if (followers < 20000) return { min: 300, max: 600, label: '10k–20k followers' }
  if (followers < 50000) return { min: 600, max: 1200, label: '20k–50k followers' }
  return { min: 1200, max: null, label: '50k+ followers' }
}

const INITIAL_FORM = {
  // Step 1
  name: '',
  instagram_handle: '',
  niche: 'Lifestyle',
  follower_count: '',
  engagement_rate: '',
  // Step 2
  content_types: [],
  // Step 3
  open_to_gifted: 'no',
  gifted_min_value: '',
  open_to_paid: true,
  open_to_ambassador: false,
  open_to_whitelisting: 'no',
  excluded_categories: '',
  // Step 4
  custom_rates: {},
}

export default function RateCardPage() {
  const { profile } = useAuth()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)
  const [existingId, setExistingId] = useState(null)

  useEffect(() => {
    loadExisting()
  }, [])

  async function loadExisting() {
    const { data } = await supabase
      .from('rate_cards')
      .select('*')
      .eq('user_id', profile.id)
      .single()

    if (data) {
      setExistingId(data.id)
      setForm({
        name: data.name,
        instagram_handle: data.instagram_handle,
        niche: data.niche,
        follower_count: data.follower_count,
        engagement_rate: data.engagement_rate,
        content_types: data.content_types || [],
        open_to_gifted: data.open_to_gifted,
        gifted_min_value: data.gifted_min_value || '',
        open_to_paid: data.open_to_paid,
        open_to_ambassador: data.open_to_ambassador,
        open_to_whitelisting: data.open_to_whitelisting,
        excluded_categories: data.excluded_categories || '',
        custom_rates: data.custom_rates || {},
      })
    } else {
      // Pre-fill from profile
      setForm((f) => ({
        ...f,
        name: profile.full_name || '',
        instagram_handle: profile.instagram_handle || '',
        follower_count: profile.instagram_followers || '',
      }))
    }
    setLoading(false)
  }

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleContentType(key) {
    setForm((f) => ({
      ...f,
      content_types: f.content_types.includes(key)
        ? f.content_types.filter((k) => k !== key)
        : [...f.content_types, key],
      custom_rates: f.content_types.includes(key)
        ? Object.fromEntries(Object.entries(f.custom_rates).filter(([k]) => k !== key))
        : f.custom_rates,
    }))
  }

  function setRate(key, value) {
    setForm((f) => ({ ...f, custom_rates: { ...f.custom_rates, [key]: value } }))
  }

  function validateStep() {
    setError('')
    if (step === 0) {
      if (!form.name.trim()) return setError('Name is required.') || false
      if (!form.instagram_handle.trim()) return setError('Instagram handle is required.') || false
      if (!form.follower_count || isNaN(form.follower_count)) return setError('Follower count is required.') || false
      if (!form.engagement_rate || isNaN(form.engagement_rate)) return setError('Engagement rate is required.') || false
    }
    if (step === 1) {
      if (form.content_types.length === 0) return setError('Select at least one content type.') || false
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

  async function save() {
    setSaving(true)
    setError('')

    const handle = form.instagram_handle.startsWith('@')
      ? form.instagram_handle
      : `@${form.instagram_handle}`

    const payload = {
      user_id: profile.id,
      name: form.name.trim(),
      instagram_handle: handle.trim(),
      niche: form.niche,
      follower_count: parseInt(form.follower_count),
      engagement_rate: parseFloat(form.engagement_rate),
      content_types: form.content_types,
      open_to_gifted: form.open_to_gifted,
      gifted_min_value: form.gifted_min_value.trim() || null,
      open_to_paid: form.open_to_paid,
      open_to_ambassador: form.open_to_ambassador,
      open_to_whitelisting: form.open_to_whitelisting,
      excluded_categories: form.excluded_categories.trim() || null,
      custom_rates: form.custom_rates,
    }

    let err
    if (existingId) {
      const { error: e } = await supabase.from('rate_cards').update(payload).eq('id', existingId)
      err = e
    } else {
      const { error: e, data } = await supabase.from('rate_cards').insert(payload).select().single()
      if (data) setExistingId(data.id)
      err = e
    }

    if (err) setError(err.message)
    setSaving(false)
    return !err
  }

  async function handleDownload() {
    const ok = await save()
    if (!ok) return
    generateRateCardPDF(form)
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <p style={{ color: '#b09d8a' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-1">Tools</p>
        <h1 className="text-2xl font-semibold" style={{ color: '#302820' }}>Rate Card</h1>
        <p className="text-sm mt-1" style={{ color: '#8e7a68' }}>
          Build your personalised media kit in minutes
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full h-1 rounded-full transition-all"
              style={{ background: i <= step ? '#c9a99a' : '#ece4dc' }}
            />
            {i === step && (
              <span className="text-xs font-medium" style={{ color: '#c9a99a' }}>{label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="space-y-4">
        {step === 0 && <Step1 form={form} setField={setField} />}
        {step === 1 && <Step2 form={form} toggleContentType={toggleContentType} />}
        {step === 2 && <Step3 form={form} setField={setField} showTooltip={showTooltip} setShowTooltip={setShowTooltip} />}
        {step === 3 && <Step4 form={form} setRate={setRate} />}
        {step === 4 && <Step5 form={form} />}
      </div>

      {error && (
        <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button onClick={back} className="btn-secondary">
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <>
            {step === 3 && (
              <button onClick={next} className="btn-secondary" style={{ flex: 1 }}>
                Skip pricing
              </button>
            )}
            <button onClick={next} className="btn-primary" style={{ flex: step === 3 ? 1 : undefined }}>
              Continue
            </button>
          </>
        ) : (
          <div className="flex-1 space-y-3">
            <button onClick={handleDownload} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : '⬇ Download PDF'}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="btn-secondary"
            >
              {saving ? 'Saving…' : 'Save without downloading'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Step 1: Details
// ─────────────────────────────────────────────────
function Step1({ form, setField }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>Full name</label>
        <input
          className="input-field"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="Jane Smith"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>Instagram handle</label>
        <input
          className="input-field"
          value={form.instagram_handle}
          onChange={(e) => setField('instagram_handle', e.target.value)}
          placeholder="@yourusername"
          autoCapitalize="none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>Niche</label>
        <select
          className="input-field"
          value={form.niche}
          onChange={(e) => setField('niche', e.target.value)}
        >
          {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>Follower count</label>
        <input
          className="input-field"
          type="number"
          value={form.follower_count}
          onChange={(e) => setField('follower_count', e.target.value)}
          placeholder="e.g. 12000"
          min="0"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>Average engagement rate (%)</label>
        <input
          className="input-field"
          type="number"
          value={form.engagement_rate}
          onChange={(e) => setField('engagement_rate', e.target.value)}
          placeholder="e.g. 4.2"
          min="0"
          max="100"
          step="0.1"
        />
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────
// Step 2: Content types
// ─────────────────────────────────────────────────
function Step2({ form, toggleContentType }) {
  return (
    <>
      <p className="text-sm" style={{ color: '#6e5e4f' }}>
        Select all the content types you offer to brands.
      </p>
      <div className="space-y-2">
        {CONTENT_TYPES.map(({ key, label }) => {
          const selected = form.content_types.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggleContentType(key)}
              className="w-full text-left px-4 py-3.5 rounded-xl transition-all flex items-center gap-3"
              style={{
                background: selected ? '#edd5cc' : '#fff',
                border: `1px solid ${selected ? '#c9a99a' : '#ddd2c7'}`,
                color: selected ? '#4e4238' : '#6e5e4f',
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  background: selected ? '#c9a99a' : '#f5f0ec',
                  border: `1.5px solid ${selected ? '#c9a99a' : '#ddd2c7'}`,
                }}
              >
                {selected && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
              </div>
              <span className="text-sm font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────
// Step 3: Collaboration preferences
// ─────────────────────────────────────────────────
function Step3({ form, setField, showTooltip, setShowTooltip }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#4e4238' }}>
          Open to gifted collabs (no fee)?
        </label>
        <TripleToggle
          value={form.open_to_gifted}
          onChange={(v) => setField('open_to_gifted', v)}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'depends', label: 'Depends on brand' },
          ]}
        />
      </div>

      {form.open_to_gifted === 'yes' && (
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
            Minimum product value required
          </label>
          <input
            className="input-field"
            value={form.gifted_min_value}
            onChange={(e) => setField('gifted_min_value', e.target.value)}
            placeholder="e.g. $150 worth of product"
          />
        </div>
      )}

      <BoolField
        label="Open to paid partnerships?"
        value={form.open_to_paid}
        onChange={(v) => setField('open_to_paid', v)}
      />

      <BoolField
        label="Open to ongoing ambassador roles?"
        value={form.open_to_ambassador}
        onChange={(v) => setField('open_to_ambassador', v)}
      />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium" style={{ color: '#4e4238' }}>
            Open to whitelisting / content boosting?
          </label>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="w-5 h-5 rounded-full text-xs font-semibold flex items-center justify-center flex-shrink-0"
            style={{ background: '#ece4dc', color: '#8e7a68' }}
          >
            ?
          </button>
        </div>
        {showTooltip && (
          <div className="card p-3 mb-2 text-sm" style={{ color: '#6e5e4f' }}>
            Whitelisting lets a brand run paid ads using your content and account. They may reach audiences beyond your followers using your face and voice. This is a premium service — charge accordingly.
          </div>
        )}
        <TripleToggle
          value={form.open_to_whitelisting}
          onChange={(v) => setField('open_to_whitelisting', v)}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'what_is_this', label: 'Not sure yet' },
          ]}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
          Categories you won't work with (optional)
        </label>
        <input
          className="input-field"
          value={form.excluded_categories}
          onChange={(e) => setField('excluded_categories', e.target.value)}
          placeholder="e.g. alcohol, gambling, MLM"
        />
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────
// Step 4: Pricing
// ─────────────────────────────────────────────────
function Step4({ form, setRate }) {
  const suggested = getSuggestedRate(parseInt(form.follower_count) || 0)
  const selectedTypes = CONTENT_TYPES.filter((t) => form.content_types.includes(t.key))

  return (
    <>
      <div
        className="rounded-2xl p-4"
        style={{ background: '#edd5cc' }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: '#302820' }}>
          Suggested starting rates
        </p>
        <p className="text-sm" style={{ color: '#6e5e4f' }}>
          Based on your following ({suggested.label}):
        </p>
        <p className="text-base font-semibold mt-2" style={{ color: '#302820' }}>
          ${suggested.min}{suggested.max ? `–$${suggested.max}` : '+'} per deliverable
        </p>
        <p className="text-xs mt-2" style={{ color: '#8e7a68' }}>
          These are starting points. You know your value best — adjust freely.
        </p>
      </div>

      <div className="space-y-3">
        {selectedTypes.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4e4238' }}>
              {label}
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 font-medium"
                style={{ color: '#b09d8a' }}
              >
                $
              </span>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.custom_rates[key] || ''}
                onChange={(e) => setRate(key, e.target.value)}
                placeholder={`${suggested.min}–${suggested.max || '1200+'}`}
                style={{ paddingLeft: 28 }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────
// Step 5: Preview
// ─────────────────────────────────────────────────
function Step5({ form }) {
  const handle = form.instagram_handle.startsWith('@') ? form.instagram_handle : `@${form.instagram_handle}`
  const selectedTypes = CONTENT_TYPES.filter((t) => form.content_types.includes(t.key))
  const suggested = getSuggestedRate(parseInt(form.follower_count) || 0)

  const giftedLabels = { yes: 'Yes', no: 'No', depends: 'Depends on brand' }
  const whitelistLabels = { yes: 'Yes', no: 'No', what_is_this: 'Not sure yet' }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="h-2" style={{ background: '#c9a99a' }} />
        <div className="p-5">
          <p className="section-label mb-1">Rate Card</p>
          <h2 className="text-xl font-semibold" style={{ color: '#302820' }}>{form.name}</h2>
          <p style={{ color: '#8e7a68' }}>{handle}</p>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="section-label" style={{ fontSize: 10 }}>Niche</span>
              <p className="font-medium" style={{ color: '#302820' }}>{form.niche}</p>
            </div>
            <div>
              <span className="section-label" style={{ fontSize: 10 }}>Followers</span>
              <p className="font-medium" style={{ color: '#302820' }}>
                {parseInt(form.follower_count || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="section-label" style={{ fontSize: 10 }}>Engagement</span>
              <p className="font-medium" style={{ color: '#302820' }}>{form.engagement_rate}%</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="section-label mb-2" style={{ fontSize: 10 }}>Content & Pricing (AUD, excl. GST)</p>
            <div className="space-y-2">
              {selectedTypes.map(({ key, label }) => (
                <div key={key} className="flex justify-between items-center text-sm py-1"
                  style={{ borderBottom: '1px solid #f5f0ec' }}>
                  <span style={{ color: '#4e4238' }}>{label}</span>
                  <span className="font-semibold" style={{ color: '#302820' }}>
                    {form.custom_rates[key]
                      ? `$${form.custom_rates[key]}`
                      : `$${suggested.min}${suggested.max ? `–$${suggested.max}` : '+'}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="section-label mb-2" style={{ fontSize: 10 }}>Collaboration Preferences</p>
            <div className="space-y-1 text-sm">
              <PrefRow label="Gifted collabs" value={giftedLabels[form.open_to_gifted]} />
              {form.open_to_gifted === 'yes' && form.gifted_min_value && (
                <PrefRow label="Min product value" value={form.gifted_min_value} />
              )}
              <PrefRow label="Paid partnerships" value={form.open_to_paid ? 'Yes' : 'No'} />
              <PrefRow label="Ambassador roles" value={form.open_to_ambassador ? 'Yes' : 'No'} />
              <PrefRow label="Whitelisting" value={whitelistLabels[form.open_to_whitelisting]} />
              {form.excluded_categories && (
                <PrefRow label="Won't work with" value={form.excluded_categories} />
              )}
            </div>
          </div>

          <p className="text-xs mt-5" style={{ color: '#b09d8a' }}>
            Rates current as of {new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })} · All rates are in AUD and exclude GST
          </p>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────
// Shared UI components
// ─────────────────────────────────────────────────
function TripleToggle({ value, onChange, options }) {
  return (
    <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #ddd2c7' }}>
      {options.map(({ value: v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="flex-1 py-2.5 text-sm font-medium transition-all"
          style={{
            background: value === v ? '#c9a99a' : '#fff',
            color: value === v ? '#fff' : '#6e5e4f',
            borderRight: '1px solid #ddd2c7',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function BoolField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: '#4e4238' }}>{label}</label>
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #ddd2c7' }}>
        {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
          <button
            key={l}
            onClick={() => onChange(v)}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={{
              background: value === v ? '#c9a99a' : '#fff',
              color: value === v ? '#fff' : '#6e5e4f',
              borderRight: '1px solid #ddd2c7',
            }}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

function PrefRow({ label, value }) {
  return (
    <div className="flex justify-between py-0.5">
      <span style={{ color: '#8e7a68' }}>{label}</span>
      <span className="font-medium" style={{ color: '#302820' }}>{value}</span>
    </div>
  )
}
