-- ============================================================
-- Admin DMs Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.admin_dms (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references public.profiles(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_dms enable row level security;

-- Members can read messages in their own thread
create policy "Members can read own DMs"
  on public.admin_dms for select
  using (auth.uid() = member_id or public.is_admin());

-- Members can send messages in their own thread
create policy "Members can send DMs"
  on public.admin_dms for insert
  with check (
    auth.uid() = sender_id and (
      auth.uid() = member_id or public.is_admin()
    )
  );

-- Admins can delete DMs
create policy "Admins can delete DMs"
  on public.admin_dms for delete
  using (public.is_admin());

-- Enable realtime
alter publication supabase_realtime add table public.admin_dms;
