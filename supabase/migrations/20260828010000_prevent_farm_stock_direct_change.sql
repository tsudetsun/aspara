-- "Farmers can update own farm" / "Farmers can insert own farm" ポリシーには
-- current_stock_kg 列を制限する with check が無く、本人が保管量を直接
-- 書き換えられてしまう(本来 yield_records 登録時のトリガー加算のみが正規の更新経路)。
-- role の自己変更防止(20260828000000)と同じ方針で、トリガーにより
-- current_stock_kg への直接の書き込みを無効化する。
--
-- increment_farm_stock() からの更新は yield_records の AFTER INSERT トリガー内で
-- 実行されるため pg_trigger_depth() が 2 以上になる。本人による直接更新は
-- depth = 1 なので、この場合のみ current_stock_kg を元の値に固定する。
create function public.prevent_farm_stock_direct_change()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() < 2 then
    new.current_stock_kg := old.current_stock_kg;
  end if;
  return new;
end;
$$;

create trigger farms_prevent_stock_direct_update
  before update on public.farms
  for each row
  execute function public.prevent_farm_stock_direct_change();

-- insert 時も current_stock_kg は常に既定値(0)から開始させる
create function public.prevent_farm_stock_direct_insert()
returns trigger
language plpgsql
as $$
begin
  new.current_stock_kg := 0;
  return new;
end;
$$;

create trigger farms_prevent_stock_direct_insert
  before insert on public.farms
  for each row
  execute function public.prevent_farm_stock_direct_insert();
