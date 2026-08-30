-- collection_schedules: 運営が農家ごとに登録する収集予定
create table public.collection_schedules (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  scheduled_date date not null,
  memo text not null default '',
  created_at timestamptz not null default now()
);

alter table public.collection_schedules enable row level security;

-- 運営(admin)は収集予定を参照・登録・削除できる
create policy "Admins can view all collection schedules"
  on public.collection_schedules for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can insert collection schedules"
  on public.collection_schedules for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete collection schedules"
  on public.collection_schedules for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
