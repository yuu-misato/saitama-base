-- Create line_accounts table
create table if not exists line_accounts (
  user_id uuid references auth.users not null,
  line_user_id text unique not null,
  display_name text,
  picture_url text,
  status_message text,
  is_notification_enabled boolean default true,
  linked_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, line_user_id)
);

-- Create line_notification_settings table
create table if not exists line_notification_settings (
  user_id uuid references auth.users primary key,
  is_enabled boolean default true,
  quiet_hours_start text, -- HH:mm
  quiet_hours_end text,   -- HH:mm
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies (simple defaults)
alter table line_accounts enable row level security;
create policy "Users can view own line account" on line_accounts for select using (auth.uid() = user_id);

alter table line_notification_settings enable row level security;
create policy "Users can view own settings" on line_notification_settings for select using (auth.uid() = user_id);
