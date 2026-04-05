import jsPDF from 'jspdf'

const CONTENT_TYPE_LABELS = {
  reels: 'Reels',
  static_post: 'Single Post',
  carousel: 'Carousel',
  stories: 'Stories (set of 3)',
  highlights: 'Pin to Highlights',
  ugc_video: 'Raw footage',
  ugc_photo: 'Raw images',
  commercial_usage: 'Commercial Usage',
}

function getSuggestedRate(followers) {
  if (followers < 5000)  return { min: 150,  max: 300  }
  if (followers < 10000) return { min: 300,  max: 600  }
  if (followers < 20000) return { min: 600,  max: 1200 }
  if (followers < 50000) return { min: 1200, max: 2500 }
  return { min: 2500, max: null }
}

const CONTENT_TYPE_MULTIPLIERS = {
  reels:            1.0,
  static_post:      0.7,
  carousel:         0.85,
  stories:          0.6,
  highlights:       0.5,
  ugc_video:        1.4,
  ugc_photo:        0.9,
  commercial_usage: 2.0,
}

function getSuggestedRateForType(followers, typeKey) {
  const base = getSuggestedRate(followers)
  const m = CONTENT_TYPE_MULTIPLIERS[typeKey] ?? 1.0
  const min = Math.round(base.min * m / 5) * 5
  const max = base.max ? Math.round(base.max * m / 5) * 5 : null
  return { min, max }
}

export function generateRateCardPDF(form) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const W = 210
  const MARGIN = 18
  const CONTENT_W = W - MARGIN * 2

  // ── Palette ───────────────────────────────────
  const ROSE       = [201, 169, 154]
  const ROSE_DARK  = [172, 138, 121]
  const ROSE_LIGHT = [237, 213, 204]
  const ROSE_BG    = [253, 246, 243]
  const DARK       = [48, 40, 32]
  const MID        = [110, 94, 79]
  const LIGHT      = [176, 157, 138]
  const BG         = [250, 248, 246]
  const BORDER     = [230, 220, 212]
  const GREEN      = [100, 150, 90]
  const RED_SOFT   = [190, 90, 75]
  const WHITE      = [255, 255, 255]

  let y = 0

  // ── HEADER BLOCK ─────────────────────────────
  // Main rose block
  doc.setFillColor(...ROSE)
  doc.rect(0, 0, W, 54, 'F')
  // Darker top accent strip
  doc.setFillColor(...ROSE_DARK)
  doc.rect(0, 0, W, 5, 'F')
  // Bottom fade strip
  doc.setFillColor(...ROSE_LIGHT)
  doc.rect(0, 49, W, 5, 'F')

  // Brand label — top left
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'normal')
  doc.text('MEDIA RATE CARD', MARGIN, 13)

  // Brand label — top right
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.text('The Mama Edit', W - MARGIN, 13, { align: 'right' })

  // Creator name
  doc.setFontSize(28)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text(form.name, MARGIN, 31)

  // Handle
  const handle = form.instagram_handle.startsWith('@')
    ? form.instagram_handle
    : `@${form.instagram_handle}`
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text(handle, MARGIN, 40)

  // Niche tags
  const nicheArr = Array.isArray(form.niche) ? [...form.niche] : (form.niche ? [form.niche] : [])
  const nicheText = nicheArr
    .map((n) => n === 'Other' && form.niche_other ? form.niche_other : n)
    .join('  ·  ')
  if (nicheText) {
    doc.setFontSize(8)
    doc.setTextColor(...WHITE)
    doc.text(nicheText, MARGIN, 48)
  }

  y = 62

  // ── Helper: section header with rose left bar ─
  function sectionHeader(title, subtitle) {
    doc.setFillColor(...ROSE)
    doc.rect(MARGIN, y, 3, 5.5, 'F')
    doc.setFontSize(8.5)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(title, MARGIN + 6, y + 4.5)
    if (subtitle) {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...LIGHT)
      doc.text(subtitle, W - MARGIN, y + 4.5, { align: 'right' })
    }
    y += 9
  }

  // ── Helper: draw a stat card ──────────────────
  function statCard(x, cardY, w, h, label, value) {
    doc.setFillColor(...ROSE_BG)
    doc.roundedRect(x, cardY, w, h, 2, 2, 'F')
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, cardY, w, h, 2, 2, 'S')
    // Label
    doc.setFontSize(7)
    doc.setTextColor(...LIGHT)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + 4, cardY + 6)
    // Value
    doc.setFontSize(12)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(String(value), x + 4, cardY + 13.5)
  }

  // ── AUDIENCE OVERVIEW ─────────────────────────
  sectionHeader('AUDIENCE OVERVIEW')

  const keyStats = [
    { label: 'Followers', value: parseInt(form.follower_count || 0).toLocaleString() },
    { label: 'Engagement Rate', value: `${form.engagement_rate || 0}%` },
    form.avg_interactions && {
      label: `Interactions (${form.interactions_period || 30}d)`,
      value: parseInt(form.avg_interactions).toLocaleString(),
    },
    form.avg_video_views && {
      label: `Views (${form.interactions_period || 30}d)`,
      value: parseInt(form.avg_video_views).toLocaleString(),
    },
    form.avg_profile_visits && {
      label: `Profile Visits (${form.interactions_period || 30}d)`,
      value: parseInt(form.avg_profile_visits).toLocaleString(),
    },
    form.avg_accounts_reached && {
      label: `Accounts Reached (${form.interactions_period || 30}d)`,
      value: parseInt(form.avg_accounts_reached).toLocaleString(),
    },
  ].filter(Boolean)

  const COLS = 3
  const GAP = 3
  const CARD_H = 17
  const cardW = (CONTENT_W - GAP * (COLS - 1)) / COLS

  keyStats.forEach(({ label, value }, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cx = MARGIN + col * (cardW + GAP)
    const cy = y + row * (CARD_H + GAP)
    statCard(cx, cy, cardW, CARD_H, label, value)
  })

  y += Math.ceil(keyStats.length / COLS) * (CARD_H + GAP) + 2

  // ── AUDIENCE DEMOGRAPHICS ─────────────────────
  const hasDemoSection =
    form.audience_female_pct || form.audience_male_pct ||
    form.top_country ||
    form.content_mix_reels_pct || form.content_mix_stories_pct || form.content_mix_posts_pct

  if (hasDemoSection) {
    y += 4
    sectionHeader('AUDIENCE DEMOGRAPHICS')

    const demoItems = []

    if (form.audience_female_pct || form.audience_male_pct) {
      const genderParts = [
        form.audience_female_pct && `${form.audience_female_pct}% Female`,
        form.audience_male_pct && `${form.audience_male_pct}% Male`,
      ].filter(Boolean)
      demoItems.push({ label: 'Gender Split', value: genderParts.join('  /  ') })
    }

    const countries = [
      form.top_country && { name: form.top_country, pct: form.top_country_pct },
      form.country_2 && { name: form.country_2, pct: form.country_2_pct },
      form.country_3 && { name: form.country_3, pct: form.country_3_pct },
    ].filter(Boolean)

    countries.forEach((c, i) => {
      demoItems.push({
        label: i === 0 ? 'Top Audience Country' : `#${i + 1} Country`,
        value: c.pct ? `${c.name}  (${c.pct}%)` : c.name,
      })
    })

    const hasMix = form.content_mix_reels_pct || form.content_mix_stories_pct || form.content_mix_posts_pct
    if (hasMix) {
      const mixParts = [
        form.content_mix_reels_pct && `Reels ${form.content_mix_reels_pct}%`,
        form.content_mix_stories_pct && `Stories ${form.content_mix_stories_pct}%`,
        form.content_mix_posts_pct && `Posts ${form.content_mix_posts_pct}%`,
      ].filter(Boolean)
      demoItems.push({ label: 'Content Mix', value: mixParts.join('  ·  ') })
    }

    const DEMO_COLS = 2
    const demoCW = (CONTENT_W - GAP * (DEMO_COLS - 1)) / DEMO_COLS

    demoItems.forEach(({ label, value }, i) => {
      const col = i % DEMO_COLS
      const row = Math.floor(i / DEMO_COLS)
      const cx = MARGIN + col * (demoCW + GAP)
      const cy = y + row * (CARD_H + GAP)
      statCard(cx, cy, demoCW, CARD_H, label, value)
    })

    y += Math.ceil(demoItems.length / DEMO_COLS) * (CARD_H + GAP) + 2
  }

  y += 6

  // ── CONTENT & PRICING ─────────────────────────
  sectionHeader('CONTENT & PRICING', 'AUD, excl. GST')

  const followers = parseInt(form.follower_count || 0)
  const selectedTypes = form.content_types || []

  // Table header row
  doc.setFillColor(...ROSE)
  doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
  doc.setFontSize(8)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text('Content Type', MARGIN + 5, y + 5.5)
  doc.text('Rate', W - MARGIN - 5, y + 5.5, { align: 'right' })
  y += 8

  selectedTypes.forEach((key, i) => {
    const label = CONTENT_TYPE_LABELS[key] || key
    const rate = form.custom_rates?.[key]
    const s = getSuggestedRateForType(followers, key)
    const rateStr = rate
      ? `$${parseFloat(rate).toLocaleString()}`
      : `$${s.min.toLocaleString()}${s.max ? ` – $${s.max.toLocaleString()}` : '+'}`

    const ROW_H = 9
    const rowY = y + i * ROW_H

    // Alternating background
    if (i % 2 === 0) {
      doc.setFillColor(...BG)
      doc.rect(MARGIN, rowY, CONTENT_W, ROW_H, 'F')
    }

    // Left rose accent line on each row
    doc.setFillColor(...ROSE_LIGHT)
    doc.rect(MARGIN, rowY, 1.5, ROW_H, 'F')

    doc.setFontSize(9.5)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'normal')
    doc.text(label, MARGIN + 6, rowY + 6)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ROSE_DARK)
    doc.text(rateStr, W - MARGIN - 5, rowY + 6, { align: 'right' })
  })

  y += selectedTypes.length * 9

  // Table bottom border
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, W - MARGIN, y)
  y += 8

  // ── COLLABORATION PREFERENCES ─────────────────
  sectionHeader('COLLABORATION PREFERENCES')

  const giftedLabels = { yes: 'Yes', no: 'No', depends: 'Depends on brand' }
  const whitelistLabels = { yes: 'Yes', no: 'No', what_is_this: 'Not sure yet' }

  const prefs = [
    ['Gifted collaborations', giftedLabels[form.open_to_gifted] || '—'],
    ...(form.open_to_gifted === 'yes' && form.gifted_min_value
      ? [['Minimum gifted product value', `$${form.gifted_min_value}`]]
      : []),
    ['Paid partnerships', form.open_to_paid ? 'Yes' : 'No'],
    ['Ongoing ambassador roles', form.open_to_ambassador ? 'Yes' : 'No'],
    ['Whitelisting / content boosting', whitelistLabels[form.open_to_whitelisting] || '—'],
  ]

  prefs.forEach(([label, value], i) => {
    const ROW_H = 8
    const rowY = y + i * ROW_H

    if (i % 2 === 0) {
      doc.setFillColor(...BG)
      doc.rect(MARGIN, rowY, CONTENT_W, ROW_H, 'F')
    }

    doc.setFontSize(9)
    doc.setTextColor(...MID)
    doc.setFont('helvetica', 'normal')
    doc.text(label, MARGIN + 5, rowY + 5.5)

    const isYes = value === 'Yes'
    const isNo = value === 'No'
    doc.setFont('helvetica', 'bold')
    if (isYes) doc.setTextColor(...GREEN)
    else if (isNo) doc.setTextColor(...RED_SOFT)
    else doc.setTextColor(...DARK)
    doc.text(value, W - MARGIN - 5, rowY + 5.5, { align: 'right' })
  })

  y += prefs.length * 8 + 4

  // ── FOOTER ────────────────────────────────────
  const footerY = 284
  doc.setFillColor(...ROSE_DARK)
  doc.rect(0, footerY, W, 3, 'F')
  doc.setFillColor(...ROSE)
  doc.rect(0, footerY + 3, W, 11, 'F')

  const monthYear = new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'normal')
  doc.text(`Rates current as of ${monthYear}`, MARGIN, footerY + 10)
  doc.text('All rates are in AUD and exclude GST', W - MARGIN, footerY + 10, { align: 'right' })

  // ── SAVE ─────────────────────────────────────
  const fileName = `${handle.replace('@', '')}_rate_card.pdf`
  doc.save(fileName)
}
