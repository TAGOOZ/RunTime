-- Create users table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Allow users to select/update their own row
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- (Optional) Allow insert by authenticated users (e.g., on sign-up)
create policy "Allow insert for authenticated users"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);
