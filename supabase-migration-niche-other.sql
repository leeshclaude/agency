-- Add niche_other column to rate_cards for custom "Other" niche text
alter table public.rate_cards add column if not exists niche_other text;
