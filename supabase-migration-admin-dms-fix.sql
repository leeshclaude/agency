-- ============================================================
-- Fix admin_dms RLS policies
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Drop old policies that used is_admin() which may not work on this table
drop policy if exists "Members can read own DMs" on public.admin_dms;
drop policy if exists "Members can send DMs" on public.admin_dms;
drop policy if exists "Admins can delete DMs" on public.admin_dms;

-- Fixed: use explicit profile lookup instead of is_admin()
create policy "Read DMs"
  on public.admin_dms for select
  using (
    auth.uid() = member_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Insert DMs"
  on public.admin_dms for insert
  with check (
    auth.uid() = sender_id
    and (
      auth.uid() = member_id
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and is_admin = true
      )
    )
  );

create policy "Delete DMs"
  on public.admin_dms for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
