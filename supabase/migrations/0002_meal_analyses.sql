-- v0.7 餐點照片 AI 估算的使用次數（每人每天上限，照片本身不儲存）
create table if not exists public.meal_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists meal_analyses_user_day on public.meal_analyses (user_id, created_at);
alter table public.meal_analyses enable row level security;
create policy "own meal analyses read" on public.meal_analyses
  for select using (auth.uid() = user_id);
grant all on public.meal_analyses to service_role;
grant select on public.meal_analyses to authenticated;
