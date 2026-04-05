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

export async function generateRateCardPDF(form, avatarUrl) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Load avatar and create circular crop via canvas
  let circularAvatarDataUrl = null
  if (avatarUrl) {
    try {
      const res = await fetch(avatarUrl)
      const blob = await res.blob()
      const rawDataUrl = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
      circularAvatarDataUrl = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const size = 200
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          ctx.beginPath()
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(img, 0, 0, size, size)
          resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = () => resolve(null)
        img.src = rawDataUrl
      })
    } catch {
      // silently skip
    }
  }

  const W = 210
  const MARGIN = 16
  const CONTENT_W = W - MARGIN * 2
  const R = 4   // card corner radius

  // ── Palette ───────────────────────────────────
  const BLOSSOM       = [242, 167, 190]
  const BLOSSOM_DEEP  = [212, 104, 138]
  const BLOSSOM_LIGHT = [250, 232, 239]
  const PETAL         = [253, 244, 247]
  const BARK          = [44, 26, 34]
  const BARK_SOFT     = [107, 74, 87]
  const WARM_WHITE    = [254, 249, 251]
  const BORDER        = [232, 210, 220]
  const WHITE         = [255, 255, 255]

  let y = 0

  // ── Helpers ───────────────────────────────────

  // Draw a card background (rounded rect fill + border stroke)
  function card(x, cardY, w, h, fillColor) {
    doc.setFillColor(...(fillColor || PETAL))
    doc.roundedRect(x, cardY, w, h, R, R, 'F')
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, cardY, w, h, R, R, 'S')
  }

  // Draw a thin divider line inside a card
  function divider(cardX, divY, w) {
    doc.setDrawColor(...BLOSSOM_LIGHT)
    doc.setLineWidth(0.2)
    doc.line(cardX + 4, divY, cardX + w - 4, divY)
  }

  // Section label above a card (uppercase, small, blossom-deep)
  function sectionLabel(title, subtitle) {
    doc.setFontSize(7)
    doc.setTextColor(...BLOSSOM_DEEP)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), MARGIN, y + 4)
    if (subtitle) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...BARK_SOFT)
      doc.text(subtitle, W - MARGIN, y + 4, { align: 'right' })
    }
    y += 7
  }

  // ── HEADER BLOCK ─────────────────────────────
  const HEADER_H = 50
  doc.setFillColor(...BLOSSOM)
  doc.rect(0, 0, W, HEADER_H, 'F')

  // Top accent stripe
  doc.setFillColor(...BLOSSOM_DEEP)
  doc.rect(0, 0, W, 3.5, 'F')

  // Bottom accent stripe
  doc.setFillColor(...BLOSSOM_LIGHT)
  doc.rect(0, HEADER_H - 3.5, W, 3.5, 'F')

  // "MEDIA RATE CARD" label — left aligned
  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text('MEDIA RATE CARD', MARGIN, 12)

  // Creator name
  doc.setFontSize(24)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text(form.name, MARGIN, 28)

  // Instagram handle (clickable)
  const handle = form.instagram_handle.startsWith('@')
    ? form.instagram_handle
    : `@${form.instagram_handle}`
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text(handle, MARGIN, 37)
  const igUrl = `https://www.instagram.com/${handle.replace('@', '')}`
  const handleW = doc.getTextWidth(handle)
  doc.link(MARGIN, 33, handleW, 6, { url: igUrl })

  // Niche tags
  const nicheArr = Array.isArray(form.niche) ? [...form.niche] : (form.niche ? [form.niche] : [])
  const nicheText = nicheArr
    .map((n) => n === 'Other' && form.niche_other ? form.niche_other : n)
    .join('  ·  ')
  if (nicheText) {
    doc.setFontSize(7.5)
    doc.setTextColor(...WHITE)
    doc.text(nicheText, MARGIN, 44.5)
  }

  // Avatar — top-right of header
  if (circularAvatarDataUrl) {
    const AV = 28
    const ax = W - MARGIN - AV
    const ay = 10
    doc.addImage(circularAvatarDataUrl, 'PNG', ax, ay, AV, AV, '', 'FAST')
    doc.setDrawColor(...WHITE)
    doc.setLineWidth(1.5)
    doc.circle(ax + AV / 2, ay + AV / 2, AV / 2, 'S')
  }

  y = HEADER_H + 8

  // ── AUDIENCE OVERVIEW ─────────────────────────
  sectionLabel('Audience Overview')

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
  const CARD_H = 16
  const cardW = (CONTENT_W - GAP * (COLS - 1)) / COLS

  keyStats.forEach(({ label, value }, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cx = MARGIN + col * (cardW + GAP)
    const cy = y + row * (CARD_H + GAP)

    card(cx, cy, cardW, CARD_H, PETAL)

    doc.setFontSize(7)
    doc.setTextColor(...BARK_SOFT)
    doc.setFont('helvetica', 'bold')
    doc.text(label.toUpperCase(), cx + 4, cy + 5.5)

    doc.setFontSize(13)
    doc.setTextColor(...BARK)
    doc.setFont('helvetica', 'bold')
    doc.text(String(value), cx + 4, cy + 13)
  })

  y += Math.ceil(keyStats.length / COLS) * (CARD_H + GAP) + 2

  // ── AUDIENCE DEMOGRAPHICS ─────────────────────
  const hasDemoSection =
    form.audience_female_pct || form.audience_male_pct ||
    form.top_country ||
    form.content_mix_reels_pct || form.content_mix_stories_pct || form.content_mix_posts_pct

  if (hasDemoSection) {
    y += 4
    sectionLabel('Audience Demographics')

    const demoRows = []

    if (form.audience_female_pct || form.audience_male_pct) {
      const parts = [
        form.audience_female_pct && `${form.audience_female_pct}% Female`,
        form.audience_male_pct && `${form.audience_male_pct}% Male`,
      ].filter(Boolean)
      demoRows.push({ label: 'Gender Split', value: parts.join('  /  ') })
    }

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

    const ROW_H = 9
    const VPAD = 2
    const demoCardH = demoRows.length * ROW_H + VPAD * 2

    card(MARGIN, y, CONTENT_W, demoCardH, WARM_WHITE)

    demoRows.forEach(({ label, value }, i) => {
      const rowY = y + VPAD + i * ROW_H

      if (i > 0) divider(MARGIN, rowY, CONTENT_W)

      doc.setFontSize(8)
      doc.setTextColor(...BARK_SOFT)
      doc.setFont('helvetica', 'bold')
      doc.text(label, MARGIN + 5, rowY + 6.5)

      doc.setFontSize(8.5)
      doc.setTextColor(...BARK)
      doc.setFont('helvetica', 'normal')
      doc.text(value, W - MARGIN - 5, rowY + 6.5, { align: 'right' })
    })

    y += demoCardH + 2
  }

  y += 6

  // ── CONTENT & PRICING ─────────────────────────
  sectionLabel('Content & Pricing', 'AUD · excl. GST')

  const followers = parseInt(form.follower_count || 0)
  const selectedTypes = form.content_types || []
  const PRICE_ROW_H = 9
  const HEADER_ROW_H = 9
  const pricingCardH = HEADER_ROW_H + selectedTypes.length * PRICE_ROW_H + 2

  // Outer card
  card(MARGIN, y, CONTENT_W, pricingCardH, WARM_WHITE)

  // Colored header band — rounded top, straight bottom
  doc.setFillColor(...BLOSSOM_DEEP)
  doc.roundedRect(MARGIN, y, CONTENT_W, HEADER_ROW_H, R, R, 'F')
  // Cover bottom-rounded corners of header band
  doc.rect(MARGIN, y + R, CONTENT_W, HEADER_ROW_H - R, 'F')

  doc.setFontSize(8)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTENT TYPE', MARGIN + 5, y + 6.5)
  doc.text('RATE', W - MARGIN - 5, y + 6.5, { align: 'right' })
  y += HEADER_ROW_H

  selectedTypes.forEach((key, i) => {
    const label = CONTENT_TYPE_LABELS[key] || key
    const rate = form.custom_rates?.[key]
    const s = getSuggestedRateForType(followers, key)
    const rateStr = rate
      ? `$${parseFloat(rate).toLocaleString()}`
      : `$${s.min.toLocaleString()}${s.max ? ` – $${s.max.toLocaleString()}` : '+'}`

    const rowY = y + i * PRICE_ROW_H

    if (i > 0) divider(MARGIN, rowY, CONTENT_W)

    // Left accent bar per row
    doc.setFillColor(...BLOSSOM_LIGHT)
    doc.rect(MARGIN, rowY, 2, PRICE_ROW_H, 'F')

    doc.setFontSize(9)
    doc.setTextColor(...BARK)
    doc.setFont('helvetica', 'normal')
    doc.text(label, MARGIN + 7, rowY + 6.5)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLOSSOM_DEEP)
    doc.text(rateStr, W - MARGIN - 5, rowY + 6.5, { align: 'right' })
  })

  y += selectedTypes.length * PRICE_ROW_H + 4

  y += 6

  // ── COLLABORATION PREFERENCES ─────────────────
  sectionLabel('Collaboration Preferences')

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

  const PREF_ROW_H = 9
  const PREF_VPAD = 2
  const prefsCardH = prefs.length * PREF_ROW_H + PREF_VPAD * 2

  card(MARGIN, y, CONTENT_W, prefsCardH, WARM_WHITE)

  prefs.forEach(([label, value], i) => {
    const rowY = y + PREF_VPAD + i * PREF_ROW_H

    if (i > 0) divider(MARGIN, rowY, CONTENT_W)

    doc.setFontSize(8.5)
    doc.setTextColor(...BARK_SOFT)
    doc.setFont('helvetica', 'normal')
    doc.text(label, MARGIN + 5, rowY + 6.5)

    const isYes = value === 'Yes'
    doc.setFont('helvetica', 'bold')
    if (isYes) doc.setTextColor(...BLOSSOM_DEEP)
    else doc.setTextColor(...BARK)
    doc.text(value, W - MARGIN - 5, rowY + 6.5, { align: 'right' })
  })

  y += prefsCardH

  // ── FOOTER ────────────────────────────────────
  const footerY = 284
  doc.setFillColor(...BLOSSOM_DEEP)
  doc.rect(0, footerY, W, 3, 'F')
  doc.setFillColor(...BLOSSOM)
  doc.rect(0, footerY + 3, W, 11, 'F')

  const monthYear = new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'normal')
  doc.text(`Rates current as of ${monthYear}`, MARGIN, footerY + 10)

  // "The Mama Edit" centered in footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('The Mama Edit', W / 2, footerY + 10, { align: 'center' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('All rates are in AUD and exclude GST', W - MARGIN, footerY + 10, { align: 'right' })

  // ── SAVE ─────────────────────────────────────
  const fileName = `${handle.replace('@', '')}_rate_card.pdf`
  doc.save(fileName)
}
