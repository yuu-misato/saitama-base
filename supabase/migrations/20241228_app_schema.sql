-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  nickname text,
  avatar_url text,
  role text default 'resident',
  level int default 1,
  score int default 0,
  selected_areas text[],
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Communities table
create table if not exists communities (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  owner_id uuid references profiles(id),
  image_url text,
  invite_code text,
  members_count int default 1,
  is_secret boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table communities enable row level security;
create policy "Communities are viewable by everyone." on communities for select using (true);
create policy "Authenticated users can create communities." on communities for insert with check (auth.role() = 'authenticated');

-- Community Members
create table if not exists community_members (
  community_id uuid references communities(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (community_id, user_id)
);
alter table community_members enable row level security;
create policy "Members are viewable by everyone." on community_members for select using (true);
create policy "Users can join communities." on community_members for insert with check (auth.uid() = user_id);

-- Posts table
create table if not exists posts (
  id uuid default uuid_generate_v4() primary key,
  author_id uuid references profiles(id),
  content text not null,
  title text,
  category text,
  area text,
  image_url text,
  likes int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table posts enable row level security;
create policy "Posts are viewable by everyone." on posts for select using (true);
create policy "Users can create posts." on posts for insert with check (auth.role() = 'authenticated');

-- Comments table
create table if not exists comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table comments enable row level security;
create policy "Comments are viewable by everyone." on comments for select using (true);
create policy "Users can create comments." on comments for insert with check (auth.role() = 'authenticated');

-- Kairanbans table
create table if not exists kairanbans (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  area text,
  author text,
  sent_to_line boolean default false,
  community_id uuid references communities(id),
  points int default 0,
  read_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table kairanbans enable row level security;
create policy "Kairanbans are viewable by everyone." on kairanbans for select using (true);
create policy "Users can create kairanbans." on kairanbans for insert with check (auth.role() = 'authenticated');

-- Coupons table
create table if not exists coupons (
  id uuid default uuid_generate_v4() primary key,
  shop_name text not null,
  title text not null,
  description text,
  discount_rate text,
  area text,
  image_url text,
  required_score int default 0,
  is_used boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table coupons enable row level security;
create policy "Coupons are viewable by everyone." on coupons for select using (true);
create policy "Users can create coupons." on coupons for insert with check (auth.role() = 'authenticated');

-- Volunteer Missions table
create table if not exists volunteer_missions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  points int default 0,
  area text,
  date text,
  max_participants int default 10,
  current_participants int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table volunteer_missions enable row level security;
create policy "Missions are viewable by everyone." on volunteer_missions for select using (true);
create policy "Users can create missions." on volunteer_missions for insert with check (auth.role() = 'authenticated');

-- Mission Participants (for RPC)
create table if not exists mission_participants (
  mission_id uuid references volunteer_missions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (mission_id, user_id)
);
alter table mission_participants enable row level security;
create policy "Participants are viewable by everyone." on mission_participants for select using (true);


-- RPC: join_mission
create or replace function join_mission(m_id uuid, u_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  current_count int;
  max_count int;
begin
  -- Check if already joined
  if exists (select 1 from mission_participants where mission_id = m_id and user_id = u_id) then
    return false;
  end if;

  -- Check capacity
  select current_participants, max_participants into current_count, max_count
  from volunteer_missions where id = m_id;
  
  if current_count >= max_count then
    return false;
  end if;

  -- Join
  insert into mission_participants (mission_id, user_id) values (m_id, u_id);
  update volunteer_missions set current_participants = current_participants + 1 where id = m_id;
  
  -- Add points to user
  update profiles set score = score + (select points from volunteer_missions where id = m_id) where id = u_id;
  
  return true;
end;
$$;

-- RPC: toggle_like
-- Likes table needed for toggle_like
create table if not exists post_likes (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (post_id, user_id)
);
alter table post_likes enable row level security;
create policy "Likes are viewable by everyone." on post_likes for select using (true);

create or replace function toggle_like(p_id uuid, u_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if exists (select 1 from post_likes where post_id = p_id and user_id = u_id) then
    delete from post_likes where post_id = p_id and user_id = u_id;
    update posts set likes = likes - 1 where id = p_id;
  else
    insert into post_likes (post_id, user_id) values (p_id, u_id);
    update posts set likes = likes + 1 where id = p_id;
  end if;
end;
$$;
