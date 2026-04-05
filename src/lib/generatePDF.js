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

async function ttfToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) return null
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function generateRateCardPDF(form, avatarUrl) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // ── Load brand fonts ──────────────────────────
  let HEADLINE = 'helvetica'   // Josefin Sans
  let BODY     = 'helvetica'   // DM Sans

  try {
    const [jsBase64, dmBase64] = await Promise.all([
      ttfToBase64('/fonts/JosefinSans.ttf'),
      ttfToBase64('/fonts/DMSans.ttf'),
    ])
    if (jsBase64) {
      doc.addFileToVFS('JosefinSans.ttf', jsBase64)
      doc.addFont('JosefinSans.ttf', 'JosefinSans', 'normal')
      doc.addFont('JosefinSans.ttf', 'JosefinSans', 'bold')
      HEADLINE = 'JosefinSans'
    }
    if (dmBase64) {
      doc.addFileToVFS('DMSans.ttf', dmBase64)
      doc.addFont('DMSans.ttf', 'DMSans', 'normal')
      doc.addFont('DMSans.ttf', 'DMSans', 'bold')
      BODY = 'DMSans'
    }
  } catch {
    // silently fall back to helvetica
  }

  // ── Load avatar ───────────────────────────────
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

  // ── Dimensions ────────────────────────────────
  const W        = 210
  const MARGIN   = 16           // page margin (same for header, body, footer)
  const CONTENT_W = W - MARGIN * 2
  const INNER    = 6            // inner padding inside header/footer cards
  const R        = 4            // body section card corner radius
  const HR       = 10           // header / footer card corner radius
  const TOP_PAD  = 7            // space from page top to header card
  const HEADER_H = 48           // header card height
  const FOOTER_Y = 277          // footer card top
  const FOOTER_H = 14           // footer card height (ends at 291, 6mm from page bottom)
  const ROW_H    = 7            // all table row heights
  const CARD_H   = 16           // stat card height
  const GAP      = 3            // gap between stat cards
  const VPAD     = 1.5          // inner top/bottom padding inside section cards

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

  function sectionCard(x, cardY, w, h, fill) {
    doc.setFillColor(...(fill || PETAL))
    doc.roundedRect(x, cardY, w, h, R, R, 'F')
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, cardY, w, h, R, R, 'S')
  }

  function rowDivider(rowY) {
    doc.setDrawColor(...BLOSSOM_LIGHT)
    doc.setLineWidth(0.2)
    doc.line(MARGIN + 5, rowY, W - MARGIN - 5, rowY)
  }

  // Section label above a card
  function sectionLabel(title, subtitle) {
    doc.setFontSize(6.5)
    doc.setTextColor(...BLOSSOM_DEEP)
    doc.setFont(BODY, 'bold')
    doc.setCharSpace(0.4)
    doc.text(title.toUpperCase(), MARGIN, y + 4)
    doc.setCharSpace(0)
    if (subtitle) {
      doc.setFontSize(6.5)
      doc.setFont(BODY, 'normal')
      doc.setTextColor(...BARK_SOFT)
      doc.text(subtitle, W - MARGIN, y + 4, { align: 'right' })
    }
    y += 6
  }

  const LEFT  = MARGIN + INNER   // text left edge inside header/footer
  const RIGHT = W - MARGIN - INNER // text right edge inside header/footer

  // ── HEADER CARD ───────────────────────────────
  // Fully rounded card with page margin on all sides — matches body card aesthetic
  doc.setFillColor(...BLOSSOM)
  doc.roundedRect(MARGIN, TOP_PAD, CONTENT_W, HEADER_H, HR, HR, 'F')

  // "MEDIA RATE CARD" small label (DM Sans Light uppercase)
  doc.setFontSize(6.5)
  doc.setTextColor(...WHITE)
  doc.setFont(BODY, 'normal')
  doc.setCharSpace(0.5)
  doc.text('MEDIA RATE CARD', LEFT, TOP_PAD + 11)
  doc.setCharSpace(0)

  // Creator name — Josefin Sans, uppercase
  doc.setFontSize(22)
  doc.setTextColor(...WHITE)
  doc.setFont(HEADLINE, 'bold')
  doc.setCharSpace(0.4)
  doc.text(form.name.toUpperCase(), LEFT, TOP_PAD + 26)
  doc.setCharSpace(0)

  // Instagram handle (clickable link)
  const handle = form.instagram_handle.startsWith('@')
    ? form.instagram_handle
    : `@${form.instagram_handle}`
  doc.setFontSize(9.5)
  doc.setFont(BODY, 'normal')
  doc.setTextColor(...WHITE)
  doc.text(handle, LEFT, TOP_PAD + 36)
  const igUrl = `https://www.instagram.com/${handle.replace('@', '')}`
  const handleW = doc.getTextWidth(handle)
  doc.link(LEFT, TOP_PAD + 32, handleW, 6, { url: igUrl })

  // Niche tags (DM Sans light uppercase)
  const nicheArr = Array.isArray(form.niche) ? [...form.niche] : (form.niche ? [form.niche] : [])
  const nicheText = nicheArr
    .map((n) => n === 'Other' && form.niche_other ? form.niche_other : n)
    .join('  ·  ')
  if (nicheText) {
    doc.setFontSize(7)
    doc.setTextColor(...WHITE)
    doc.setFont(BODY, 'normal')
    doc.setCharSpace(0.3)
    doc.text(nicheText.toUpperCase(), LEFT, TOP_PAD + 44)
    doc.setCharSpace(0)
  }

  // Avatar — circular, inside header card (top-right)
  if (circularAvatarDataUrl) {
    const AV = 27
    const ax = W - MARGIN - INNER - AV
    const ay = TOP_PAD + 10
    doc.addImage(circularAvatarDataUrl, 'PNG', ax, ay, AV, AV, '', 'FAST')
    doc.setDrawColor(...WHITE)
    doc.setLineWidth(1.5)
    doc.circle(ax + AV / 2, ay + AV / 2, AV / 2, 'S')
  }

  y = TOP_PAD + HEADER_H + 7

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
  const cardW = (CONTENT_W - GAP * (COLS - 1)) / COLS

  keyStats.forEach(({ label, value }, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cx  = MARGIN + col * (cardW + GAP)
    const cy  = y + row * (CARD_H + GAP)

    sectionCard(cx, cy, cardW, CARD_H, PETAL)

    // Label — DM Sans uppercase small
    doc.setFontSize(6)
    doc.setTextColor(...BARK_SOFT)
    doc.setFont(BODY, 'normal')
    doc.setCharSpace(0.3)
    doc.text(label.toUpperCase(), cx + 4, cy + 5)
    doc.setCharSpace(0)

    // Value — Josefin Sans bold large
    doc.setFontSize(13)
    doc.setTextColor(...BARK)
    doc.setFont(HEADLINE, 'bold')
    doc.text(String(value), cx + 4, cy + 13)
  })

  y += Math.ceil(keyStats.length / COLS) * (CARD_H + GAP) + 1

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
        form.audience_male_pct   && `${form.audience_male_pct}% Male`,
      ].filter(Boolean)
      demoRows.push({ label: 'Gender Split', value: parts.join('  /  ') })
    }
    const countries = [
      form.top_country && `${form.top_country}${form.top_country_pct ? ` (${form.top_country_pct}%)` : ''}`,
      form.country_2   && `${form.country_2}${form.country_2_pct   ? ` (${form.country_2_pct}%)` : ''}`,
      form.country_3   && `${form.country_3}${form.country_3_pct   ? ` (${form.country_3_pct}%)` : ''}`,
    ].filter(Boolean)
    if (countries.length) demoRows.push({ label: 'Top Countries', value: countries.join('  ·  ') })
    const hasMix = form.content_mix_reels_pct || form.content_mix_stories_pct || form.content_mix_posts_pct
    if (hasMix) {
      const mix = [
        form.content_mix_reels_pct   && `Reels ${form.content_mix_reels_pct}%`,
        form.content_mix_stories_pct && `Stories ${form.content_mix_stories_pct}%`,
        form.content_mix_posts_pct   && `Posts ${form.content_mix_posts_pct}%`,
      ].filter(Boolean)
      demoRows.push({ label: 'Content Mix', value: mix.join('  ·  ') })
    }

    const demoCardH = demoRows.length * ROW_H + VPAD * 2
    sectionCard(MARGIN, y, CONTENT_W, demoCardH, WARM_WHITE)

    demoRows.forEach(({ label, value }, i) => {
      const rowY = y + VPAD + i * ROW_H
      if (i > 0) rowDivider(rowY)

      doc.setFontSize(7.5)
      doc.setTextColor(...BARK_SOFT)
      doc.setFont(BODY, 'bold')
      doc.text(label, MARGIN + 5, rowY + ROW_H * 0.74)

      doc.setFontSize(7.5)
      doc.setTextColor(...BARK)
      doc.setFont(BODY, 'normal')
      doc.text(value, W - MARGIN - 5, rowY + ROW_H * 0.74, { align: 'right' })
    })

    y += demoCardH + 2
  }

  y += 5

  // ── CONTENT & PRICING ─────────────────────────
  sectionLabel('Content & Pricing', 'AUD · excl. GST')

  const followers    = parseInt(form.follower_count || 0)
  const selectedTypes = form.content_types || []
  const PRICE_HEADER = 8
  const pricingCardH = PRICE_HEADER + selectedTypes.length * ROW_H + VPAD

  sectionCard(MARGIN, y, CONTENT_W, pricingCardH, WARM_WHITE)

  // Header band — rounded top, straight bottom (covered by plain rect)
  doc.setFillColor(...BLOSSOM_DEEP)
  doc.roundedRect(MARGIN, y, CONTENT_W, PRICE_HEADER, R, R, 'F')
  doc.rect(MARGIN, y + R, CONTENT_W, PRICE_HEADER - R, 'F')

  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.setFont(BODY, 'bold')
  doc.setCharSpace(0.3)
  doc.text('CONTENT TYPE', MARGIN + 5, y + PRICE_HEADER * 0.74)
  doc.text('RATE', W - MARGIN - 5, y + PRICE_HEADER * 0.74, { align: 'right' })
  doc.setCharSpace(0)
  y += PRICE_HEADER

  selectedTypes.forEach((key, i) => {
    const label   = CONTENT_TYPE_LABELS[key] || key
    const rate    = form.custom_rates?.[key]
    const s       = getSuggestedRateForType(followers, key)
    const rateStr = rate
      ? `$${parseFloat(rate).toLocaleString()}`
      : `$${s.min.toLocaleString()}${s.max ? ` – $${s.max.toLocaleString()}` : '+'}`
    const rowY    = y + i * ROW_H

    if (i > 0) rowDivider(rowY)

    doc.setFillColor(...BLOSSOM_LIGHT)
    doc.rect(MARGIN, rowY, 2, ROW_H, 'F')

    doc.setFontSize(8)
    doc.setTextColor(...BARK)
    doc.setFont(BODY, 'normal')
    doc.text(label, MARGIN + 7, rowY + ROW_H * 0.74)

    doc.setFont(BODY, 'bold')
    doc.setTextColor(...BLOSSOM_DEEP)
    doc.text(rateStr, W - MARGIN - 5, rowY + ROW_H * 0.74, { align: 'right' })
  })

  y += selectedTypes.length * ROW_H + VPAD + 2

  y += 5

  // ── COLLABORATION PREFERENCES ─────────────────
  sectionLabel('Collaboration Preferences')

  const giftedLabels    = { yes: 'Yes', no: 'No', depends: 'Depends on brand' }
  const whitelistLabels = { yes: 'Yes', no: 'No', what_is_this: 'Not sure yet' }

  const prefs = [
    ['Gifted collaborations', giftedLabels[form.open_to_gifted] || '—'],
    ...(form.open_to_gifted === 'yes' && form.gifted_min_value
      ? [['Minimum gifted product value', `$${form.gifted_min_value}`]]
      : []),
    ['Paid partnerships',          form.open_to_paid       ? 'Yes' : 'No'],
    ['Ongoing ambassador roles',   form.open_to_ambassador ? 'Yes' : 'No'],
    ['Whitelisting / content boosting', whitelistLabels[form.open_to_whitelisting] || '—'],
  ]

  const prefsCardH = prefs.length * ROW_H + VPAD * 2
  sectionCard(MARGIN, y, CONTENT_W, prefsCardH, WARM_WHITE)

  prefs.forEach(([label, value], i) => {
    const rowY = y + VPAD + i * ROW_H
    if (i > 0) rowDivider(rowY)

    doc.setFontSize(8)
    doc.setTextColor(...BARK_SOFT)
    doc.setFont(BODY, 'normal')
    doc.text(label, MARGIN + 5, rowY + ROW_H * 0.74)

    const isYes = value === 'Yes'
    doc.setFont(BODY, 'bold')
    if (isYes) doc.setTextColor(...BLOSSOM_DEEP)
    else doc.setTextColor(...BARK)
    doc.text(value, W - MARGIN - 5, rowY + ROW_H * 0.74, { align: 'right' })
  })

  // ── FOOTER CARD ───────────────────────────────
  // Same card aesthetic as header — padded sides, fully rounded corners
  doc.setFillColor(...BLOSSOM)
  doc.roundedRect(MARGIN, FOOTER_Y, CONTENT_W, FOOTER_H, HR, HR, 'F')

  const footerMidY = FOOTER_Y + FOOTER_H * 0.65
  const monthYear  = new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  doc.setFontSize(6.5)
  doc.setTextColor(...WHITE)
  doc.setFont(BODY, 'normal')
  doc.text(`Rates current as of ${monthYear}`, LEFT, footerMidY)

  // "The Mama Edit" — Josefin Sans, centered
  doc.setFontSize(9)
  doc.setFont(HEADLINE, 'bold')
  doc.setCharSpace(0.3)
  doc.text('The Mama Edit', W / 2, footerMidY, { align: 'center' })
  doc.setCharSpace(0)

  doc.setFontSize(6.5)
  doc.setFont(BODY, 'normal')
  doc.text('All rates in AUD · excl. GST', RIGHT, footerMidY, { align: 'right' })

  // ── SAVE ─────────────────────────────────────
  const fileName = `${handle.replace('@', '')}_rate_card.pdf`
  doc.save(fileName)
}
