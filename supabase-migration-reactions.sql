-- ============================================================
-- Message reactions (emoji reacts on chat messages)
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.message_reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now() not null,
  unique (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy "Authenticated users can read reactions"
  on public.message_reactions for select
  using (auth.uid() is not null);

create policy "Users can add own reactions"
  on public.message_reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own reactions"
  on public.message_reactions for delete
  using (auth.uid() = user_id);
