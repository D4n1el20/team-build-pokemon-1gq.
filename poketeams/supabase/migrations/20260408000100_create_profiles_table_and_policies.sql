create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username);

alter table public.profiles enable row level security;

drop policy if exists "Insert own profile" on public.profiles;
create policy "Insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Select own profile" on public.profiles;
create policy "Select own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);
