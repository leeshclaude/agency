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
  const BLOSSOM       = [242, 167, 190]   // #F2A7BE
  const BLOSSOM_DEEP  = [212, 104, 138]   // #D4688A
  const BLOSSOM_LIGHT = [250, 232, 239]   // #FAE8EF
  const PETAL         = [253, 244, 247]   // #FDF4F7
  const BARK          = [44, 26, 34]      // #2C1A22
  const BARK_SOFT     = [107, 74, 87]     // #6B4A57
  const WARM_WHITE    = [254, 249, 251]   // #FEF9FB
  const BORDER        = [250, 232, 239]   // #FAE8EF (soft)
  const WHITE         = [255, 255, 255]

  let y = 0

  // ── HEADER BLOCK ─────────────────────────────
  doc.setFillColor(...BLOSSOM)
  doc.rect(0, 0, W, 48, 'F')
  doc.setFillColor(...BLOSSOM_DEEP)
  doc.rect(0, 0, W, 4, 'F')
  doc.setFillColor(...BLOSSOM_LIGHT)
  doc.rect(0, 44, W, 4, 'F')

  // Brand labels
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'normal')
  doc.text('MEDIA RATE CARD', MARGIN, 12)
  doc.text('The Mama Edit', W - MARGIN, 12, { align: 'right' })

  // Creator name
  doc.setFontSize(26)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text(form.name, MARGIN, 27)

  // Handle
  const handle = form.instagram_handle.startsWith('@')
    ? form.instagram_handle
    : `@${form.instagram_handle}`
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text(handle, MARGIN, 36)

  // Niche tags
  const nicheArr = Array.isArray(form.niche) ? [...form.niche] : (form.niche ? [form.niche] : [])
  const nicheText = nicheArr
    .map((n) => n === 'Other' && form.niche_other ? form.niche_other : n)
    .join('  ·  ')
  if (nicheText) {
    doc.setFontSize(8)
    doc.setTextColor(...WHITE)
    doc.text(nicheText, MARGIN, 43)
  }

  y = 55

  // ── Helpers ───────────────────────────────────
  function sectionHeader(title, subtitle) {
    doc.setFillColor(...BLOSSOM_DEEP)
    doc.rect(MARGIN, y, 3, 5.5, 'F')
    doc.setFontSize(8.5)
    doc.setTextColor(...BARK)
    doc.setFont('helvetica', 'bold')
    doc.text(title, MARGIN + 6, y + 4.5)
    if (subtitle) {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...BARK_SOFT)
      doc.text(subtitle, W - MARGIN, y + 4.5, { align: 'right' })
    }
    y += 8
  }

  // Stat card: label bold+dark, value large+bold
  const CARD_H = 15
  const GAP = 3

  function statCard(x, cardY, w, label, value) {
    doc.setFillColor(...PETAL)
    doc.roundedRect(x, cardY, w, CARD_H, 2, 2, 'F')
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, cardY, w, CARD_H, 2, 2, 'S')
    // Label — darker and bolder
    doc.setFontSize(7.5)
    doc.setTextColor(...BARK_SOFT)
    doc.setFont('helvetica', 'bold')
    doc.text(label, x + 4, cardY + 5.5)
    // Value — large bold dark
    doc.setFontSize(13)
    doc.setTextColor(...BARK)
    doc.setFont('helvetica', 'bold')
    doc.text(String(value), x + 4, cardY + 12.5)
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
  const cardW = (CONTENT_W - GAP * (COLS - 1)) / COLS

  keyStats.forEach(({ label, value }, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cx = MARGIN + col * (cardW + GAP)
    const cy = y + row * (CARD_H + GAP)
    statCard(cx, cy, cardW, label, value)
  })

  y += Math.ceil(keyStats.length / COLS) * (CARD_H + GAP) + 1

  // ── AUDIENCE DEMOGRAPHICS (compact) ───────────
  const hasDemoSection =
    form.audience_female_pct || form.audience_male_pct ||
    form.top_country ||
    form.content_mix_reels_pct || form.content_mix_stories_pct || form.content_mix_posts_pct

  if (hasDemoSection) {
    y += 5
    sectionHeader('AUDIENCE DEMOGRAPHICS')

    // Build compact rows: label on left, value on right
    const demoRows = []

    if (form.audience_female_pct || form.audience_male_pct) {
      const parts = [
        form.audience_female_pct && `${form.audience_female_pct}% Female`,
        form.audience_male_pct && `${form.audience_male_pct}% Male`,
      ].filter(Boolean)
      demoRows.push({ label: 'Gender Split', value: parts.join('  /  ') })
    }

    // All countries in one row
    const countries = [
      form.top_country && `${form.top_country}${form.top_country_pct ? ` (${form.top_country_pct}%)` : ''}`,
      form.country_2 && `${form.country_2}${form.country_2_pct ? ` (${form.country_2_pct}%)` : ''}`,
      form.country_3 && `${form.country_3}${form.country_3_pct ? ` (${form.country_3_pct}%)` : ''}`,
    ].filter(Boolean)
    if (countries.length > 0) {
      demoRows.push({ label: 'Top Countries', value: countries.join('  ·  ') })
    }

    const hasMix = form.content_mix_reels_pct || form.content_mix_stories_pct || form.content_mix_posts_pct
    if (hasMix) {
      const mixParts = [
        form.content_mix_reels_pct && `Reels ${form.content_mix_reels_pct}%`,
        form.content_mix_stories_pct && `Stories ${form.content_mix_stories_pct}%`,
        form.content_mix_posts_pct && `Posts ${form.content_mix_posts_pct}%`,
      ].filter(Boolean)
      demoRows.push({ label: 'Content Mix', value: mixParts.join('  ·  ') })
    }

    const ROW_H = 8
    demoRows.forEach(({ label, value }, i) => {
      const rowY = y + i * ROW_H
      if (i % 2 === 0) {
        doc.setFillColor(...WARM_WHITE)
        doc.rect(MARGIN, rowY, CONTENT_W, ROW_H, 'F')
      }
      // Label
      doc.setFontSize(8)
      doc.setTextColor(...BARK_SOFT)
      doc.setFont('helvetica', 'bold')
      doc.text(label, MARGIN + 4, rowY + 5.5)
      // Value
      doc.setFontSize(8.5)
      doc.setTextColor(...BARK)
      doc.setFont('helvetica', 'normal')
      doc.text(value, W - MARGIN - 4, rowY + 5.5, { align: 'right' })
    })

    // Border under demographics
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.rect(MARGIN, y, CONTENT_W, demoRows.length * ROW_H, 'S')

    y += demoRows.length * ROW_H + 2
  }

  y += 6

  // ── CONTENT & PRICING ─────────────────────────
  sectionHeader('CONTENT & PRICING', 'AUD, excl. GST')

  const followers = parseInt(form.follower_count || 0)
  const selectedTypes = form.content_types || []

  // Table header row
  doc.setFillColor(...BLOSSOM_DEEP)
  doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
  doc.setFontSize(8.5)
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

    const ROW_H = 8.5
    const rowY = y + i * ROW_H

    if (i % 2 === 0) {
      doc.setFillColor(...WARM_WHITE)
      doc.rect(MARGIN, rowY, CONTENT_W, ROW_H, 'F')
    }
    doc.setFillColor(...BLOSSOM_LIGHT)
    doc.rect(MARGIN, rowY, 1.5, ROW_H, 'F')

    doc.setFontSize(9.5)
    doc.setTextColor(...BARK)
    doc.setFont('helvetica', 'normal')
    doc.text(label, MARGIN + 6, rowY + 5.8)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLOSSOM_DEEP)
    doc.text(rateStr, W - MARGIN - 5, rowY + 5.8, { align: 'right' })
  })

  y += selectedTypes.length * 8.5

  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, W - MARGIN, y)
  y += 7

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
      doc.setFillColor(...WARM_WHITE)
      doc.rect(MARGIN, rowY, CONTENT_W, ROW_H, 'F')
    }

    doc.setFontSize(9)
    doc.setTextColor(...BARK_SOFT)
    doc.setFont('helvetica', 'normal')
    doc.text(label, MARGIN + 5, rowY + 5.5)

    const isYes = value === 'Yes'
    doc.setFont('helvetica', 'bold')
    if (isYes) doc.setTextColor(...BLOSSOM_DEEP)
    else doc.setTextColor(...BARK)
    doc.text(value, W - MARGIN - 5, rowY + 5.5, { align: 'right' })
  })

  // Border under prefs
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.25)
  const prefsH = prefs.length * 8
  doc.rect(MARGIN, y, CONTENT_W, prefsH, 'S')

  // ── FOOTER ────────────────────────────────────
  const footerY = 284
  doc.setFillColor(...BLOSSOM_DEEP)
  doc.rect(0, footerY, W, 3, 'F')
  doc.setFillColor(...BLOSSOM)
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
