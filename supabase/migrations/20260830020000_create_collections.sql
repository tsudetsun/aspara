-- collections: 運営が登録する実際の収集記録
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  collected_on date not null default current_date,
  amount_kg numeric not null check (amount_kg > 0),
  staff_name text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now()
);

alter table public.collections enable row level security;

-- 運営(admin)は収集記録を参照・登録・削除できる
create policy "Admins can view all collections"
  on public.collections for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can insert collections"
  on public.collections for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete collections"
  on public.collections for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 収集量を登録したら、対象農家の現在保管量から自動的に差し引く
create function public.decrement_farm_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.farms
  set current_stock_kg = greatest(current_stock_kg - new.amount_kg, 0)
  where id = new.farm_id;
  return new;
end;
$$;

create trigger collections_decrement_stock
  after insert on public.collections
  for each row
  execute function public.decrement_farm_stock();
