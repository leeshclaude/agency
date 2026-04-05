-- ============================================================
-- HOME UPLOADS MIGRATION
-- Adds image and file attachment support to announcements and resources
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── 1. Add attachment columns to announcements ───────────────
alter table public.announcements
  add column if not exists image_url text,
  add column if not exists file_url  text,
  add column if not exists file_name text;

-- ── 2. Add attachment columns to resources ───────────────────
alter table public.resources
  add column if not exists image_url text,
  add column if not exists file_url  text,
  add column if not exists file_name text;

-- ── 3. Create home-uploads storage bucket ────────────────────
insert into storage.buckets (id, name, public)
values ('home-uploads', 'home-uploads', true)
on conflict (id) do nothing;

-- ── 4. Storage RLS policies ───────────────────────────────────
-- Authenticated members can read uploads
create policy "Authenticated users can read home-uploads"
  on storage.objects for select
  using (bucket_id = 'home-uploads' and auth.role() = 'authenticated');

-- Only admins can upload
create policy "Admins can upload home-uploads"
  on storage.objects for insert
  with check (bucket_id = 'home-uploads' and public.is_admin());

-- Only admins can update (replace files)
create policy "Admins can update home-uploads"
  on storage.objects for update
  using (bucket_id = 'home-uploads' and public.is_admin());

-- Only admins can delete
create policy "Admins can delete home-uploads"
  on storage.objects for delete
  using (bucket_id = 'home-uploads' and public.is_admin());
