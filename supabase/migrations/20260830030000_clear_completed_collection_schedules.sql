-- 収集量を登録したら、その農家の収集日以前の収集予定は完了とみなして削除する
-- (収集予定と収集記録は別テーブルのため、登録しただけでは予定が残ったままになってしまう)
create function public.clear_completed_collection_schedules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.collection_schedules
  where farm_id = new.farm_id
    and scheduled_date <= new.collected_on;
  return new;
end;
$$;

create trigger collections_clear_schedules
  after insert on public.collections
  for each row
  execute function public.clear_completed_collection_schedules();

-- 既存データについても、収集記録が登録済みの予定を一括で削除する
delete from public.collection_schedules cs
where exists (
  select 1 from public.collections c
  where c.farm_id = cs.farm_id
    and c.collected_on >= cs.scheduled_date
);
