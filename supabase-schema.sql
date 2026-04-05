-- ============================================================
-- THE MAMA EDIT — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (already enabled by default in Supabase)
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  instagram_handle text not null,
  instagram_followers integer not null default 0,
  location_state text not null,
  location_city text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update own profile (non-status fields)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Security definer function to check admin status (avoids RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  )
$$;

-- Admins can read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Helper function to check if current user is approved (avoids RLS recursion)
create or replace function public.is_approved()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select status = 'approved' from public.profiles where id = auth.uid()),
    false
  )
$$;

-- Approved members can read each other's profiles (needed for chat names/avatars)
create policy "Approved members can read approved profiles"
  on public.profiles for select
  using (status = 'approved' and public.is_approved());

-- Admins can update any profile (for approval/denial)
create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin());

-- New users can insert their own profile on signup
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- RESOURCES
-- ============================================================
create table if not exists public.resources (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  link text,
  category text not null check (category in (
    'Brand Outreach',
    'Getting Paid',
    'Rate Guidance',
    'Content Strategy',
    'Legal and Contracts'
  )),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resources enable row level security;

-- Approved members can read resources
create policy "Approved members can read resources"
  on public.resources for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );

-- Only admins can insert/update/delete resources
create policy "Admins can manage resources"
  on public.resources for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
create table if not exists public.announcements (
  id integer primary key default 1 check (id = 1), -- single-row table
  text text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Insert the single row
insert into public.announcements (id, text)
values (1, null)
on conflict (id) do nothing;

alter table public.announcements enable row level security;

-- Approved members can read announcement
create policy "Approved members can read announcements"
  on public.announcements for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );

-- Admins can update announcement
create policy "Admins can update announcement"
  on public.announcements for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ============================================================
-- SESSIONS
-- ============================================================
create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  session_date timestamptz not null,
  session_type text not null check (session_type in ('Group Call', 'FaceTime')),
  meeting_link text not null,
  max_capacity integer not null default 20,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

-- Approved members can view sessions (but not meeting link — that's filtered in app)
create policy "Approved members can view sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );

-- Admins can manage sessions
create policy "Admins can manage sessions"
  on public.sessions for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ============================================================
-- SESSION REGISTRATIONS
-- ============================================================
create table if not exists public.session_registrations (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  registered_at timestamptz not null default now(),
  unique (session_id, user_id)
);

alter table public.session_registrations enable row level security;

-- Users can see their own registrations
create policy "Users can read own registrations"
  on public.session_registrations for select
  using (auth.uid() = user_id);

-- Admins can read all registrations
create policy "Admins can read all registrations"
  on public.session_registrations for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Approved members can register
create policy "Approved members can register"
  on public.session_registrations for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );

-- Users can cancel their own registration
create policy "Users can cancel own registration"
  on public.session_registrations for delete
  using (auth.uid() = user_id);

-- ============================================================
-- MESSAGES (Community Chat)
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  channel text not null default 'general',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Approved members can read messages
create policy "Approved members can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );

-- Approved members can post messages
create policy "Approved members can post messages"
  on public.messages for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );

-- Users can delete own messages
create policy "Users can delete own messages"
  on public.messages for delete
  using (auth.uid() = user_id);

-- Admins can delete any message
create policy "Admins can delete any message"
  on public.messages for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Admins can update messages (for pinning)
create policy "Admins can update messages"
  on public.messages for update
  using (public.is_admin());

-- ============================================================
-- RATE CARDS
-- ============================================================
create table if not exists public.rate_cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  -- Step 1
  name text not null,
  instagram_handle text not null,
  niche jsonb not null default '[]',
  follower_count integer not null,
  engagement_rate numeric(5,2) not null,
  -- Instagram insights
  interactions_period text not null default '30',
  avg_interactions integer,
  avg_video_views integer,
  avg_profile_visits integer,
  avg_accounts_reached integer,
  audience_female_pct numeric(5,1),
  audience_male_pct numeric(5,1),
  top_country text,
  top_country_pct numeric(5,1),
  country_2 text,
  country_2_pct numeric(5,1),
  country_3 text,
  country_3_pct numeric(5,1),
  content_mix_reels_pct numeric(5,1),
  content_mix_stories_pct numeric(5,1),
  content_mix_posts_pct numeric(5,1),
  stats_updated_at timestamptz,
  -- Step 2: content types (stored as JSON array)
  content_types jsonb not null default '[]',
  -- Step 3: collaboration prefs
  open_to_gifted text not null default 'no' check (open_to_gifted in ('yes', 'no', 'depends')),
  gifted_min_value text,
  open_to_paid boolean not null default true,
  open_to_ambassador boolean not null default false,
  open_to_whitelisting text not null default 'no' check (open_to_whitelisting in ('yes', 'no', 'what_is_this')),
  excluded_categories text,
  -- Step 4: custom rates (stored as JSON object keyed by content type)
  custom_rates jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rate_cards enable row level security;

-- Users can read own rate card
create policy "Users can read own rate card"
  on public.rate_cards for select
  using (auth.uid() = user_id);

-- Users can insert own rate card
create policy "Users can insert own rate card"
  on public.rate_cards for insert
  with check (auth.uid() = user_id);

-- Users can update own rate card
create policy "Users can update own rate card"
  on public.rate_cards for update
  using (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- Enable realtime for messages
-- ============================================================
alter publication supabase_realtime add table public.messages;

-- ============================================================
-- FUNCTION: updated_at trigger
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger resources_updated_at
  before update on public.resources
  for each row execute function public.handle_updated_at();

create trigger rate_cards_updated_at
  before update on public.rate_cards
  for each row execute function public.handle_updated_at();

-- ============================================================
-- FUNCTION: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, email, full_name, instagram_handle, instagram_followers,
    location_state, location_city, status, is_admin
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'instagram_handle', ''),
    coalesce((new.raw_user_meta_data->>'instagram_followers')::integer, 0),
    coalesce(new.raw_user_meta_data->>'location_state', ''),
    coalesce(new.raw_user_meta_data->>'location_city', ''),
    'pending',
    new.email = 'homewithleesh@gmail.com'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
