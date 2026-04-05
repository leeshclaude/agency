-- Migration: DM reactions support
-- Run this in the Supabase SQL Editor

create table if not exists public.admin_dm_reactions (
  id           uuid default gen_random_uuid() primary key,
  message_id   uuid references public.admin_dms(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  emoji        text not null,
  created_at   timestamptz default now(),
  unique(message_id, user_id, emoji)
);

alter table public.admin_dm_reactions enable row level security;

-- Participants in the DM thread can read reactions
create policy "DM participants can view reactions"
  on public.admin_dm_reactions for select
  using (
    public.is_admin()
    or auth.uid() = user_id
    or exists (
      select 1 from public.admin_dms
      where id = message_id
        and member_id = auth.uid()
    )
  );

-- Users can insert their own reactions
create policy "Users can add DM reactions"
  on public.admin_dm_reactions for insert
  with check (auth.uid() = user_id);

-- Users can remove their own reactions
create policy "Users can remove their own DM reactions"
  on public.admin_dm_reactions for delete
  using (auth.uid() = user_id);

-- Allow admin to delete DM messages (add policy on admin_dms if not present)
-- Members can already delete their own messages via existing RLS.
-- This adds admin delete rights.
drop policy if exists "Admin can delete any DM message" on public.admin_dms;
create policy "Admin can delete any DM message"
  on public.admin_dms for delete
  using (public.is_admin());
