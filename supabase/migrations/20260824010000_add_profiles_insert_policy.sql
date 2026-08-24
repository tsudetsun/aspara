-- 農家は自分の profile を role='farmer' としてのみ自己登録できる
-- (role='admin' は自己登録不可。運営側アカウントは別途手動で作成する想定)
create policy "Users can insert own farmer profile"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'farmer');
