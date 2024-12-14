-- Create extensions if not exists
create extension if not exists "uuid-ossp";

-- Create user_activities table
create table if not exists user_activities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('chat', 'practice', 'roadmap')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- Create user_reflections table
create table if not exists user_reflections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  summary text not null,
  strengths text[] not null,
  areas_for_improvement text[] not null,
  recommendations text[] not null,
  subject_progress jsonb not null,
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- Add indexes
create index if not exists idx_user_activities_user_id on user_activities(user_id);
create index if not exists idx_user_activities_timestamp on user_activities(timestamp);
create index if not exists idx_user_reflections_user_id on user_reflections(user_id);
create index if not exists idx_user_reflections_timestamp on user_reflections(timestamp);

-- Enable Row Level Security
alter table user_activities enable row level security;
alter table user_reflections enable row level security;

-- Create RLS policies
create policy "Users can view their own activities"
  on user_activities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own activities"
  on user_activities for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own reflections"
  on user_reflections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reflections"
  on user_reflections for insert
  with check (auth.uid() = user_id);

-- Add triggers for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_activities_updated_at
  before update on user_activities
  for each row
  execute function update_updated_at_column();

create trigger update_user_reflections_updated_at
  before update on user_reflections
  for each row
  execute function update_updated_at_column(); 