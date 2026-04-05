-- ============================================================
-- SECURITY HARDENING MIGRATION
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── 1. Prevent privilege escalation via profile self-update ──────────────────
-- The original "Users can update own profile" policy only checks auth.uid() = id,
-- which allows any user to set is_admin = true or flip their own status back
-- to 'approved' after being denied. This trigger blocks those changes.

create or replace function public.prevent_privilege_escalation()
returns trigger as $$
begin
  -- Only allow non-admins to proceed; admins can change anything
  if not public.is_admin() then
    -- Block self-promotion to admin
    if NEW.is_admin is distinct from OLD.is_admin then
      raise exception 'Unauthorized: cannot change is_admin';
    end if;
    -- Block self-changing approval status
    if NEW.status is distinct from OLD.status then
      raise exception 'Unauthorized: cannot change status';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists prevent_privilege_escalation on public.profiles;
create trigger prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();

-- ── 2. Protect session meeting links ────────────────────────────────────────
-- Currently the sessions RLS policy returns ALL columns including meeting_link
-- to any approved member, regardless of registration. This creates a view that
-- masks meeting_link unless the viewer is registered for that session.

create or replace view public.sessions_safe
with (security_invoker = true) as
select
  s.id,
  s.title,
  s.description,
  s.session_date,
  s.session_type,
  s.max_capacity,
  s.created_by,
  s.created_at,
  -- Only expose meeting_link if the current user is registered or is admin
  case
    when public.is_admin() then s.meeting_link
    when exists (
      select 1 from public.session_registrations sr
      where sr.session_id = s.id and sr.user_id = auth.uid()
    ) then s.meeting_link
    else null
  end as meeting_link
from public.sessions s;

-- Grant select on the view to authenticated users
grant select on public.sessions_safe to authenticated;
