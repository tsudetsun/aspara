-- 農家は自分の農家に対する収集予定のみ参照できる
create policy "Farmers can view own collection schedules"
  on public.collection_schedules for select
  using (auth.uid() = farm_id);
