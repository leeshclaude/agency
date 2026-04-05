import jsPDF from 'jspdf'

const CONTENT_TYPE_LABELS = {
  reels: 'Reels',
  static_post: 'Static image post',
  carousel: 'Carousel post',
  stories: 'Instagram Stories (set of 3)',
  highlights: 'Highlights cover creation',
  ugc_video: 'UGC video (brand-use rights)',
  ugc_photo: 'UGC photo (brand-use rights)',
}

function getSuggestedRate(followers) {
  if (followers < 5000) return { min: 50, max: 150 }
  if (followers < 10000) return { min: 150, max: 300 }
  if (followers < 20000) return { min: 300, max: 600 }
  if (followers < 50000) return { min: 600, max: 1200 }
  return { min: 1200, max: null }
}

export function generateRateCardPDF(form) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const W = 210
  const MARGIN = 20
  const CONTENT_W = W - MARGIN * 2

  // Colours
  const ROSE = [201, 169, 154]
  const DARK = [48, 40, 32]
  const MID = [110, 94, 79]
  const LIGHT = [176, 157, 138]
  const BG_LIGHT = [250, 248, 246]
  const DIVIDER = [236, 228, 220]

  let y = 0

  // ── Header accent bar ──────────────────────────
  doc.setFillColor(...ROSE)
  doc.rect(0, 0, W, 8, 'F')
  y = 8

  // ── Logo / title area ──────────────────────────
  y += 14
  doc.setFontSize(22)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.text(form.name, MARGIN, y)

  y += 7
  doc.setFontSize(11)
  doc.setTextColor(...MID)
  doc.setFont('helvetica', 'normal')
  const handle = form.instagram_handle.startsWith('@') ? form.instagram_handle : `@${form.instagram_handle}`
  doc.text(handle, MARGIN, y)

  // Brand: "The Mama Edit" top right
  doc.setFontSize(9)
  doc.setTextColor(...LIGHT)
  doc.text('The Mama Edit', W - MARGIN, 20, { align: 'right' })

  y += 10

  // ── Divider ───────────────────────────────────
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, W - MARGIN, y)
  y += 8

  // ── Audience overview ─────────────────────────
  doc.setFontSize(8)
  doc.setTextColor(...LIGHT)
  doc.setFont('helvetica', 'bold')
  doc.text('AUDIENCE OVERVIEW', MARGIN, y)
  y += 5

  // Niche — may be array or string
  const nicheValue = Array.isArray(form.niche) ? form.niche.join(', ') : (form.niche || '—')

  const mainCols = [
    { label: 'Niche', value: nicheValue },
    { label: 'Followers', value: parseInt(form.follower_count || 0).toLocaleString() },
    { label: 'Engagement Rate', value: `${form.engagement_rate}%` },
  ]

  const colW = CONTENT_W / mainCols.length
  mainCols.forEach(({ label, value }, i) => {
    const x = MARGIN + i * colW
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, y + 6)
    doc.setFontSize(i === 0 && nicheValue.length > 18 ? 9 : 13)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    // Truncate niche if too long for column
    const displayValue = i === 0 && nicheValue.length > 22
      ? nicheValue.substring(0, 20) + '…'
      : value
    doc.text(displayValue, x, y + 13)
  })
  y += 20

  // Instagram stats (only render if any are filled in)
  const statCols = [
    form.avg_interactions && {
      label: `Avg. Interactions (${form.interactions_period || 30}d)`,
      value: parseInt(form.avg_interactions).toLocaleString(),
    },
    form.avg_video_views && { label: 'Avg. Video Views', value: parseInt(form.avg_video_views).toLocaleString() },
    form.avg_profile_visits && { label: 'Profile Visits/mo', value: parseInt(form.avg_profile_visits).toLocaleString() },
    form.avg_accounts_reached && { label: 'Accounts Reached/mo', value: parseInt(form.avg_accounts_reached).toLocaleString() },
    (form.audience_female_pct || form.audience_male_pct) && {
      label: 'Audience Gender',
      value: [
        form.audience_female_pct && `${form.audience_female_pct}% F`,
        form.audience_male_pct && `${form.audience_male_pct}% M`,
      ].filter(Boolean).join(' · '),
    },
  ].filter(Boolean)

  if (statCols.length > 0) {
    const statColW = CONTENT_W / Math.min(statCols.length, 3)
    statCols.forEach(({ label, value }, i) => {
      const row = Math.floor(i / 3)
      const col = i % 3
      const x = MARGIN + col * statColW
      const rowY = y + row * 16
      doc.setFontSize(8)
      doc.setTextColor(...LIGHT)
      doc.setFont('helvetica', 'normal')
      doc.text(label, x, rowY + 4)
      doc.setFontSize(11)
      doc.setTextColor(...DARK)
      doc.setFont('helvetica', 'bold')
      doc.text(value, x, rowY + 10)
    })
    y += Math.ceil(statCols.length / 3) * 16 + 4
  }

  // ── Top audience countries ────────────────────
  const countries = [
    form.top_country && { name: form.top_country, pct: form.top_country_pct },
    form.country_2 && { name: form.country_2, pct: form.country_2_pct },
    form.country_3 && { name: form.country_3, pct: form.country_3_pct },
  ].filter(Boolean)

  if (countries.length > 0) {
    const countryColW = CONTENT_W / countries.length
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT)
    doc.setFont('helvetica', 'normal')
    doc.text('Top Audience Countries', MARGIN, y + 4)
    y += 6
    countries.forEach(({ name, pct }, i) => {
      const x = MARGIN + i * countryColW
      doc.setFontSize(8)
      doc.setTextColor(...LIGHT)
      doc.setFont('helvetica', 'normal')
      doc.text(pct ? `${pct}%` : '', x, y + 4)
      doc.setFontSize(11)
      doc.setTextColor(...DARK)
      doc.setFont('helvetica', 'bold')
      doc.text(name, x, y + 10)
    })
    y += 16
  }

  // ── Content mix ───────────────────────────────
  const hasMix = form.content_mix_reels_pct || form.content_mix_stories_pct || form.content_mix_posts_pct
  if (hasMix) {
    const mixItems = [
      form.content_mix_reels_pct && { label: 'Reels', value: `${form.content_mix_reels_pct}%` },
      form.content_mix_stories_pct && { label: 'Stories', value: `${form.content_mix_stories_pct}%` },
      form.content_mix_posts_pct && { label: 'Posts', value: `${form.content_mix_posts_pct}%` },
    ].filter(Boolean)

    const mixColW = CONTENT_W / mixItems.length
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT)
    doc.setFont('helvetica', 'normal')
    doc.text('Content Mix', MARGIN, y + 4)
    y += 6
    mixItems.forEach(({ label, value }, i) => {
      const x = MARGIN + i * mixColW
      doc.setFontSize(8)
      doc.setTextColor(...LIGHT)
      doc.setFont('helvetica', 'normal')
      doc.text(label, x, y + 4)
      doc.setFontSize(13)
      doc.setTextColor(...DARK)
      doc.setFont('helvetica', 'bold')
      doc.text(value, x, y + 11)
    })
    y += 16
  }

  doc.setDrawColor(...DIVIDER)
  doc.line(MARGIN, y, W - MARGIN, y)
  y += 8

  // ── Content & Pricing ─────────────────────────
  doc.setFontSize(8)
  doc.setTextColor(...LIGHT)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTENT & PRICING  (AUD, excl. GST)', MARGIN, y)
  y += 2

  const suggested = getSuggestedRate(parseInt(form.follower_count || 0))
  const selectedTypes = form.content_types || []

  selectedTypes.forEach((key, i) => {
    const label = CONTENT_TYPE_LABELS[key] || key
    const rate = form.custom_rates?.[key]
    const rateStr = rate
      ? `$${parseFloat(rate).toLocaleString()}`
      : `$${suggested.min}${suggested.max ? `–$${suggested.max}` : '+'}`

    const rowY = y + 8 + i * 10

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(...BG_LIGHT)
      doc.rect(MARGIN, rowY - 4, CONTENT_W, 9, 'F')
    }

    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'normal')
    doc.text(label, MARGIN + 3, rowY + 2)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ROSE)
    doc.text(rateStr, W - MARGIN - 3, rowY + 2, { align: 'right' })
  })

  y += 8 + selectedTypes.length * 10 + 4

  doc.setDrawColor(...DIVIDER)
  doc.line(MARGIN, y, W - MARGIN, y)
  y += 8

  // ── Collaboration preferences ─────────────────
  doc.setFontSize(8)
  doc.setTextColor(...LIGHT)
  doc.setFont('helvetica', 'bold')
  doc.text('COLLABORATION PREFERENCES', MARGIN, y)
  y += 6

  const giftedLabels = { yes: 'Yes', no: 'No', depends: 'Depends on brand' }
  const whitelistLabels = { yes: 'Yes', no: 'No', what_is_this: 'Not sure yet' }

  const prefs = [
    ['Gifted collaborations', giftedLabels[form.open_to_gifted] || '—'],
    ...(form.open_to_gifted === 'yes' && form.gifted_min_value
      ? [['Minimum product value', form.gifted_min_value]]
      : []),
    ['Paid partnerships', form.open_to_paid ? 'Yes' : 'No'],
    ['Ongoing ambassador roles', form.open_to_ambassador ? 'Yes' : 'No'],
    ['Whitelisting / content boosting', whitelistLabels[form.open_to_whitelisting] || '—'],
    ...(form.excluded_categories
      ? [["Won't work with", form.excluded_categories]]
      : []),
  ]

  prefs.forEach(([label, value], i) => {
    const rowY = y + i * 8
    doc.setFontSize(10)
    doc.setTextColor(...MID)
    doc.setFont('helvetica', 'normal')
    doc.text(label, MARGIN + 3, rowY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(value, W - MARGIN - 3, rowY, { align: 'right' })
  })

  y += prefs.length * 8 + 8

  // ── Footer ────────────────────────────────────
  const footerY = 287
  doc.setFillColor(...ROSE)
  doc.rect(0, footerY - 2, W, 12, 'F')

  const monthYear = new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.text(`Rates current as of ${monthYear}`, MARGIN, footerY + 4)
  doc.text('All rates are in AUD and exclude GST', W - MARGIN, footerY + 4, { align: 'right' })

  // ── Save ──────────────────────────────────────
  const fileName = `${handle.replace('@', '')}_rate_card.pdf`
  doc.save(fileName)
}
