# The Mama Edit — Roadmap

## Completed

- [x] Project scaffold (React, Vite, Supabase, Tailwind CSS v4, jsPDF)
- [x] PWA setup — installable on iPhone home screen
- [x] Vercel deployment
- [x] Module 1: Auth and onboarding (signup, pending screen, admin approval)
- [x] Module 2: Home feed, announcement banner, resource cards with categories
- [x] Module 3: Real-time community group chat
- [x] Module 4: Session bookings with registration and hidden meeting links
- [x] Module 5: Rate card builder (5-step form, PDF export, saved to profile)
- [x] Admin dashboard (approve, deny, remove members)
- [x] Improvement 1: Forgot password flow
- [x] Improvement 2: Admin email notification on new signup (Resend API) + branded confirmation email to new members (Gmail SMTP + Supabase template)
- [x] Improvement 3: Profile photo upload (Supabase Storage avatars bucket, avatar shown in chat and home page)
- [x] Improvement 4: Settings page (profile photo, display name, Instagram handle, followers, city/state, password change, sign out, admin link)
- [x] Improvement 5: Chat redesign — Instagram DM style with grouped messages, long press to delete, avatars per group
- [x] Improvement 6: Chat channels — General 💬, Intro's ✨, Engagement 💕, Brand Ops 💸 (General default)
- [x] Chat extras — admin badge on messages, pinned messages per channel, delete button always right-aligned
- [x] Rate card v2 — niche multi-select, interactions period dropdown (30/60/90d), gender split (M/F %), top 3 audience countries with %, content mix (Reels/Stories/Posts %), stats last-updated timestamp
- [x] Approval email — branded welcome email sent to member via Resend when admin clicks Approve
- [x] Rate card content types updated — Reels, Single Post, Carousel, Stories (set of 3), Pin to Highlights, Raw footage, Raw images, Commercial Usage

---

## Up Next

- [x] Login/signup validation — replaced red error banner with inline required field indicators (red asterisk on labels, red border on field, error text below each field)
- [x] Admin back button — added back button in admin console header to return to Settings
- [x] Chat unread badges — confirmed working; badges on channel list rows, Group/Admin toggle buttons, and bottom nav Chat icon
- [x] Chat tab redesign — IG-style vertical channel list (emoji avatar, last message preview, unread badge); tapping opens chat with back arrow
- [x] DM admin — members can privately message admin via 💌 Admin toggle in Chat; admin sees IG-style inbox + can reply (in both Chat and Admin panel)
- [x] Emoji reactions — click any message to open emoji picker (❤️ 😂 😮 😢 👏 🔥); reaction pills with counts shown below bubble; click outside to dismiss
- [x] Instagram profile links — clickable IG handle links in admin approval panel (to verify AU location + followers) and in chat messages (so members can follow each other)
- [x] Rate card: rename "Video views" → "Views" everywhere in UI and PDF
- [x] Rate card: increase suggested rates — rates roughly doubled; commercial usage 2×; reflects fair market value
- [x] Rate card: fix PDF niche text overflow — wraps full-width when long
- [x] Rate card: add "Other" niche option with free-text write-in field (supports multiple custom niches)
- [x] Rate card: PDF visual redesign — branded header, stat cards, compact demographics table, pricing table with rose accents, green/red collab prefs, polished footer
- [x] Security hardening — blocked is_admin/status self-escalation via DB trigger, added auth token verification to API endpoints, HTML-escaped email templates, protected meeting links at DB level via sessions_safe view
- [x] Home feed: announcements support image and file attachments — image shown full-width in banner, file as download link; admin upload UI in edit mode
- [x] Home feed: resource cards support image and file attachments — image at top of card, file as download link; admin upload in resource modal
- [x] Replace placeholder app icons with real branding — cherry blossom flower icon in rose palette, 192×192 and 512×512 PNG; also used as browser favicon and iPhone home screen icon
- [ ] Rename "The Mama Edit" to final community name throughout the app
- [ ] Set a custom domain name in Vercel
- [ ] Test end-to-end member signup and approval flow with real members

---

## Future Features

- [ ] Member profiles — public-facing profile page per member
- [ ] Direct messaging between members
- [ ] Resource saves / bookmarks
- [ ] Push notifications (new chat messages, session reminders)
- [ ] Onboarding checklist for new members after approval
- [ ] Member directory — browse all approved members
- [ ] Brand collaboration board — members post and share brand opportunities
- [ ] Rate card versioning — save multiple versions of your rate card
- [ ] Session recordings or replay links
- [ ] Analytics for admin — member growth, engagement stats
