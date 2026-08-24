-- farms: 農家ごとの保管状況を管理するテーブル (profiles と1:1)
create table public.farms (
  id uuid primary key references public.profiles (id) on delete cascade,
  name text not null default '',
  address text not null default '',
  phone text not null default '',
  capacity_kg numeric not null default 0 check (capacity_kg >= 0),
  current_stock_kg numeric not null default 0 check (current_stock_kg >= 0),
  memo text not null default '',
  created_at timestamptz not null default now()
);

alter table public.farms enable row level security;

-- 農家は自分の農家情報のみ参照・登録・更新できる
create policy "Farmers can view own farm"
  on public.farms for select
  using (auth.uid() = id);

create policy "Farmers can insert own farm"
  on public.farms for insert
  with check (auth.uid() = id);

create policy "Farmers can update own farm"
  on public.farms for update
  using (auth.uid() = id);

-- 運営(admin)は全農家の情報を参照できる
create policy "Admins can view all farms"
  on public.farms for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- yield_records: 規格外アスパラガスの発生量の登録履歴
create table public.yield_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  occurred_on date not null default current_date,
  amount_kg numeric not null check (amount_kg > 0),
  created_at timestamptz not null default now()
);

alter table public.yield_records enable row level security;

-- 農家は自分の発生量記録のみ参照・登録できる
create policy "Farmers can view own yield records"
  on public.yield_records for select
  using (auth.uid() = farm_id);

create policy "Farmers can insert own yield records"
  on public.yield_records for insert
  with check (auth.uid() = farm_id);

-- 運営(admin)は全農家の発生量記録を参照できる
create policy "Admins can view all yield records"
  on public.yield_records for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 発生量を登録したら、対象農家の現在保管量に自動で加算する
create function public.increment_farm_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.farms
  set current_stock_kg = current_stock_kg + new.amount_kg
  where id = new.farm_id;
  return new;
end;
$$;

create trigger yield_records_increment_stock
  after insert on public.yield_records
  for each row
  execute function public.increment_farm_stock();
