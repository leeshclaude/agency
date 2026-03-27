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

  const cols = [
    { label: 'Niche', value: form.niche },
    { label: 'Followers', value: parseInt(form.follower_count || 0).toLocaleString() },
    { label: 'Engagement Rate', value: `${form.engagement_rate}%` },
  ]

  const colW = CONTENT_W / cols.length
  cols.forEach(({ label, value }, i) => {
    const x = MARGIN + i * colW
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, y + 6)
    doc.setFontSize(13)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x, y + 13)
  })
  y += 20

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
