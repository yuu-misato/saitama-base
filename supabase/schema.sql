-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES table (Public profiles for users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  id uuid primary key, -- removed references auth.users for external auth prototype
  updated_at timestamp with time zone,
  nickname text,
  avatar_url text,
  role text default 'resident', -- resident, business, admin, chokai_leader
  level int default 1,
  score int default 0,
  shop_name text,
  selected_areas text[]
);

alter table public.profiles enable row level security;

-- PROTOTYPE ONLY: Allow full access to profiles
create policy "Allow all for patterns" on public.profiles
  for all using (true) with check (true);

-- POSTS table
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  category text not null,
  area text not null,
  title text not null,
  content text not null,
  image_url text,
  likes int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone." on public.posts
  for select using (true);

create policy "Authenticated users can create posts." on public.posts
  for insert with check (auth.role() = 'authenticated');

-- COMMENTS table
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone." on public.comments
  for select using (true);

create policy "Authenticated users can create comments." on public.comments
  for insert with check (auth.role() = 'authenticated');

-- KAIRANBANS table (Circulation Board)
create table public.kairanbans (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  area text not null,
  author text not null, -- Display name or reference to profile
  points int default 0,
  read_count int default 0,
  sent_to_line boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.kairanbans enable row level security;

create policy "Kairanbans are viewable by everyone." on public.kairanbans
  for select using (true);

create policy "Only specific roles can create kairanbans." on public.kairanbans
  for insert with check (auth.role() = 'authenticated'); -- Needs finer grained control in production

-- COUPONS table
create table public.coupons (
  id uuid default uuid_generate_v4() primary key,
  shop_name text not null,
  title text not null,
  required_score int default 0,
  discount text not null,
  image_url text,
  area text not null,
  is_used boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.coupons enable row level security;

create policy "Coupons are viewable by everyone." on public.coupons
  for select using (true);

-- VOLUNTEER MISSIONS table
create table public.volunteer_missions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  points int default 0,
  area text not null,
  date text not null, -- Keeping as text for flexibility based on frontend, consider timestamp
  current_participants int default 0,
  max_participants int default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.volunteer_missions enable row level security;

create policy "Missions are viewable by everyone." on public.volunteer_missions
  for select using (true);

-- Functions to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, nickname, avatar_url, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'resident');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage buckets handling (optional, uncomment if needed)
-- insert into storage.buckets (id, name) values ('post-images', 'post-images');
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'post-images' );
-- COMMUNITIES table
create table public.communities (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  owner_id uuid references public.profiles(id) not null,
  invite_code text unique default substr(md5(random()::text), 0, 8),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.communities enable row level security;

create policy "Allow all communities" on public.communities
  for all using (true) with check (true);

-- COMMUNITY MEMBERS table
create table public.community_members (
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (community_id, user_id)
);

alter table public.community_members enable row level security;

create policy "Allow all members" on public.community_members
  for all using (true) with check (true);

