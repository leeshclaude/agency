# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**The Mama Edit** — a private invite-only PWA for Australian mum creators. Built with React (Vite), Supabase, Tailwind CSS v4, jsPDF. Deployed to Vercel (free tier).

Admin email: `homewithleesh@gmail.com` (hardcoded in `supabase-schema.sql` trigger).

## Commands

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

## Supabase Setup

1. Create a project at supabase.com
2. Copy `Project URL` and `anon public` key
3. Add to `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. Run `supabase-schema.sql` in the Supabase SQL Editor (Dashboard → SQL Editor)
5. For existing projects, also run `supabase-migration-rate-card-v2.sql` to add new rate card columns
6. In Supabase Auth settings, enable email confirmations off (or on — your choice) and set Site URL to your Vercel domain

## Vercel Deployment

1. Push to GitHub
2. Import repo in Vercel → set env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. `vercel.json` handles SPA routing already

## Architecture

```
src/
  lib/
    supabase.js        — Supabase client (reads from VITE_* env vars)
    generatePDF.js     — jsPDF rate card generation logic
  contexts/
    AuthContext.jsx    — session, profile, isAdmin, isApproved, isPending, isDenied
  components/
    layout/
      AppShell.jsx     — wraps approved-member pages with BottomNav
      BottomNav.jsx    — bottom tab nav (Home, Chat, Sessions, Rate Card, Admin)
    ui/
      Spinner.jsx      — loading spinner
  pages/
    auth/
      LoginPage.jsx    — sign in
      SignUpPage.jsx    — 3-step signup (details → location → account)
      PendingPage.jsx  — shown after signup until admin approves
      DeniedPage.jsx   — shown if denied
    admin/
      AdminPage.jsx    — approve/deny/remove members (admin-only)
    HomePage.jsx       — home feed + announcement banner + resource cards
    ChatPage.jsx       — real-time group chat (Supabase realtime)
    SessionsPage.jsx   — session booking cards, admin creates/manages sessions
    RateCardPage.jsx   — 5-step rate card builder, saves to DB + generates PDF
  App.jsx              — BrowserRouter with route guards based on auth state
```

## Route Guards

`App.jsx` → `RouterGuard` checks auth state and redirects:
- Not authenticated → `/login`
- Authenticated + pending → `/pending`
- Authenticated + denied → `/denied`
- Authenticated + approved → protected app routes
- Admin always has access to `/admin`

## Database

All tables use Supabase RLS. Key patterns:
- `profiles.status` = `'pending' | 'approved' | 'denied'`
- `profiles.is_admin` — set to `true` automatically for `homewithleesh@gmail.com` via trigger
- Chat uses Supabase Realtime (`postgres_changes` on `messages` table)
- `rate_cards` is one-per-user (unique constraint on `user_id`)
- `session_registrations` hides `meeting_link` at app level (not DB level) — only shown when `isRegistered`

## Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin. Custom design tokens defined in `tailwind.config.js` as `warm` and `rose` colour palettes. Component classes (`.btn-primary`, `.card`, `.input-field`, etc.) defined in `src/index.css` `@layer components`. Font: Inter (Google Fonts, loaded in `index.html`). Target: iPhone, mobile-first.

## Instructions for interacting with users

Leesh is not a developer. Please make sure every to do list is detailed and does not miss a step or assume she understands the process. She is starting from scratch.

## Additional Tasks

After completing each task, [CLAUDE.md](CLAUDE.md), [ROADMAP.md](../ROADMAP.md) and [README.md](../README.md) should be updated to reflect all changes.