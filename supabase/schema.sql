-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (User Data)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text not null,
  avatar_url text,
  role text default 'resident',
  level int default 1,
  score int default 0,
  selected_areas text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Communities
create table if not exists communities (
  id text primary key, -- utilizing client-generated IDs for now as per app logic
  name text not null,
  description text,
  owner_id uuid references profiles(id),
  image_url text,
  invite_code text unique,
  is_secret boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Community Members (Many-to-Many)
create table if not exists community_members (
  community_id text references communities(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (community_id, user_id)
);

-- 4. Posts (Timeline)
create table if not exists posts (
  id text primary key, -- using text ids from client for now
  author_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text not null,
  area text not null,
  image_url text,
  likes int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for area search (Critical for performance)
create index if not exists posts_area_idx on posts(area);

-- 5. Post Likes (User interaction history)
-- Google Engineer Note: Prevents double liking and race conditions
create table if not exists post_likes (
  post_id text references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

-- 6. Comments
create table if not exists comments (
  id uuid default uuid_generate_v4() primary key,
  post_id text references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Kairanbans (Circulars)
create table if not exists kairanbans (
  id text primary key,
  title text not null,
  content text not null,
  area text not null,
  author text, -- keeping as text for flexibility or link to profiles
  sent_to_line boolean default false,
  community_id text references communities(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Kairanban Reads (Read status per user)
-- Google Engineer Note: Essential for "who read this" tracking
create table if not exists kairanban_reads (
  kairanban_id text references kairanbans(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (kairanban_id, user_id)
);

-- 9. Volunteer Missions
create table if not exists volunteer_missions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  points int default 50,
  area text not null,
  date text,
  max_participants int default 10,
  current_participants int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Mission Participants (Tracking who joined)
-- Google Engineer Note: Critical for point distribution and attendance
create table if not exists mission_participants (
  mission_id uuid references volunteer_missions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status text default 'joined', -- joined, completed, cancelled
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (mission_id, user_id)
);

-- 11. Coupons
create table if not exists coupons (
  id uuid default uuid_generate_v4() primary key,
  shop_name text not null,
  title text not null,
  description text,
  discount_rate text,
  area text not null,
  image_url text,
  required_score int default 100,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Database Functions (RPC) for Atomic Operations

-- Function to increment likes atomically
create or replace function toggle_like(p_id text, u_id uuid)
returns void as $$
begin
  if exists (select 1 from post_likes where post_id = p_id and user_id = u_id) then
    delete from post_likes where post_id = p_id and user_id = u_id;
    update posts set likes = likes - 1 where id = p_id;
  else
    insert into post_likes (post_id, user_id) values (p_id, u_id);
    update posts set likes = likes + 1 where id = p_id;
  end if;
end;
$$ language plpgsql security definer;

-- Function to join mission atomically
create or replace function join_mission(m_id uuid, u_id uuid)
returns boolean as $$
declare
  current_count int;
  max_count int;
begin
  -- Check if already joined
  if exists (select 1 from mission_participants where mission_id = m_id and user_id = u_id) then
    return false;
  end if;

  -- Lock row and check capacity
  select current_participants, max_participants into current_count, max_count
  from volunteer_missions where id = m_id for update;

  if current_count < max_count then
    insert into mission_participants (mission_id, user_id) values (m_id, u_id);
    update volunteer_missions set current_participants = current_participants + 1 where id = m_id;
    return true;
  else
    return false;
  end if;
end;
$$ language plpgsql security definer;

-- Setup Row Level Security (RLS) - Basic Policies
alter table profiles enable row level security;
alter table posts enable row level security;
alter table kairanbans enable row level security;

-- Allow public read for MVP (Restrict later)
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Posts are viewable by everyone" on posts for select using (true);
create policy "Authenticated users can create posts" on posts for insert with check (auth.role() = 'authenticated');

