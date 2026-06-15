-- Create the waitlist table
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  restaurant_name text not null,
  email text not null unique,
  country text not null,
  state text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.waitlist enable row level security;

-- Allow anyone to insert into waitlist (public signup)
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- Only allow users to view their own waitlist entry
create policy "Users can view own waitlist entry"
  on public.waitlist for select
  using (true);

-- Create index on email for faster lookups
create index if not exists waitlist_email_idx on public.waitlist(email);
