-- profiles: auth.users に紐づく role (farmer / admin) を保持するテーブル
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('farmer', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 本人は自分の profile のみ参照・更新できる
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
