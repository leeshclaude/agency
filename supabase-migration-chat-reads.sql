-- ============================================================
-- Chat Unread Badges Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Tracks when each user last read each channel
create table if not exists public.channel_reads (
  user_id uuid references public.profiles(id) on delete cascade not null,
  channel text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel)
);

alter table public.channel_reads enable row level security;

create policy "Users can read own channel reads"
  on public.channel_reads for select
  using (auth.uid() = user_id);

create policy "Users can insert own channel reads"
  on public.channel_reads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own channel reads"
  on public.channel_reads for update
  using (auth.uid() = user_id);
