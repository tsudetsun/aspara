-- 既存の "Users can update own profile" ポリシーには role 列の変更を止める
-- with check が無く、本人が自分の role を admin に書き換えられてしまう。
-- role の変更はトリガーで固定し、本人による update では常に元の値を維持する。
create function public.prevent_profile_role_self_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_self_change
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_self_change();
