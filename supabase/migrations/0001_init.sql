-- 「我運動，我升級」雲端資料表（需求書第 7 章）
-- v0.3 起用於 iPhone 捷徑同步：daily_health、workouts、sync_tokens。
-- 其餘資料表為之後的雲端存檔預留。
-- 使用方式：Supabase 專案 › SQL Editor › 貼上整份 › Run。

create extension if not exists pgcrypto;

-- 角色
create table public.players (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '無名散修',
  avatar_id text not null default 'sword',
  created_at timestamptz not null default now(),
  water_goal_ml int not null default 2000 check (water_goal_ml between 1000 and 4000),
  cup_ml int not null default 250,
  workout_difficulty text not null default 'beginner'
    check (workout_difficulty in ('beginner', 'intermediate', 'advanced')),
  time_zone text not null default 'Asia/Taipei',
  last_seen_level int not null default 1
);

-- 捷徑同步金鑰：只存雜湊值
create table public.sync_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- 每日步數與距離
create table public.daily_health (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  steps int not null default 0 check (steps between 0 and 100000),
  walk_run_km numeric(6, 2) not null default 0 check (walk_run_km between 0 and 300),
  exercise_min int not null default 0 check (exercise_min between 0 and 1440),
  source text not null check (source in ('shortcut', 'manual')),
  received_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- 體能訓練
create table public.workouts (
  user_id uuid not null references auth.users (id) on delete cascade,
  start_at timestamptz not null,
  type text not null check (type in ('walking', 'running', 'other')),
  duration_min int not null check (duration_min between 0 and 600),
  distance_km numeric(6, 2) not null default 0,
  manual boolean not null default false,
  source text not null default 'shortcut' check (source in ('shortcut', 'manual')),
  day date not null,
  primary key (user_id, start_at, type)
);

-- 網頁內記錄：喝水、徒手訓練、休息日券
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('water', 'bodyweight', 'rest_ticket')),
  value int not null default 0,
  day date not null,
  logged_at timestamptz not null default now()
);

-- 經驗值帳本：等級一律由這張表加總計算
create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('cup', 'daily', 'weekly')),
  ref text not null,
  reason text not null,
  amount int not null check (amount >= 0),
  multiplier numeric(3, 2) not null default 1,
  attribute text check (attribute in ('str', 'agi', 'vit', 'sen')),
  created_at timestamptz not null default now(),
  unique (user_id, ref)
);

create index on public.xp_ledger (user_id, day);
create index on public.activity_logs (user_id, day);
create index on public.workouts (user_id, day);
create index on public.sync_tokens (user_id);

-- Row Level Security：每個人只能存取自己的資料
alter table public.players enable row level security;
alter table public.sync_tokens enable row level security;
alter table public.daily_health enable row level security;
alter table public.workouts enable row level security;
alter table public.activity_logs enable row level security;
alter table public.xp_ledger enable row level security;

create policy "own players" on public.players
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own tokens read" on public.sync_tokens
  for select using (auth.uid() = user_id);
create policy "own tokens revoke" on public.sync_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 新增金鑰由 Edge Function（service role）處理，前端不直接寫入

create policy "own health read" on public.daily_health
  for select using (auth.uid() = user_id);
create policy "own workouts read" on public.workouts
  for select using (auth.uid() = user_id);
-- 健康資料只能由 sync-health 寫入；手動資料也經由函式，方便套用相同驗證

create policy "own logs" on public.activity_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own ledger read" on public.xp_ledger
  for select using (auth.uid() = user_id);
-- XP 只能由伺服器端判定後寫入，避免從前端直接加分

-- 明確授權（新專案可能未自動開放 Data API 權限）
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
