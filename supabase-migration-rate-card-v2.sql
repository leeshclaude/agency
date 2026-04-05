-- ============================================================
-- Rate Card v2 Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add columns from the previous Instagram stats update
--    (safe to run even if they already exist)
alter table public.rate_cards
  add column if not exists avg_interactions integer,
  add column if not exists avg_video_views integer,
  add column if not exists avg_profile_visits integer,
  add column if not exists avg_accounts_reached integer,
  add column if not exists top_country text;

-- 2. Add all new columns for this update
alter table public.rate_cards
  add column if not exists interactions_period text not null default '30',
  add column if not exists audience_female_pct numeric(5,1),
  add column if not exists audience_male_pct numeric(5,1),
  add column if not exists top_country_pct numeric(5,1),
  add column if not exists country_2 text,
  add column if not exists country_2_pct numeric(5,1),
  add column if not exists country_3 text,
  add column if not exists country_3_pct numeric(5,1),
  add column if not exists content_mix_reels_pct numeric(5,1),
  add column if not exists content_mix_stories_pct numeric(5,1),
  add column if not exists content_mix_posts_pct numeric(5,1),
  add column if not exists stats_updated_at timestamptz;

-- 3. Convert niche column from text to jsonb array
--    (wraps any existing text value like "Lifestyle" into ["Lifestyle"])
alter table public.rate_cards
  alter column niche type jsonb using jsonb_build_array(niche);
