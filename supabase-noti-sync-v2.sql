-- Noti cloud sync v2
-- Supabase > SQL Editor > New query > cole tudo > Run.

create table if not exists public.noti_sync_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot_id text not null,
  encoding text not null default 'plain-json',
  chunk_count integer not null check (chunk_count > 0),
  payload_length bigint not null default 0 check (payload_length >= 0),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.noti_sync_chunks (
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id text not null,
  chunk_index integer not null check (chunk_index >= 0),
  chunk_data text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, snapshot_id, chunk_index)
);

create index if not exists noti_sync_chunks_lookup_idx
  on public.noti_sync_chunks (user_id, snapshot_id, chunk_index);

alter table public.noti_sync_snapshots enable row level security;
alter table public.noti_sync_chunks enable row level security;

drop policy if exists "noti sync read own snapshot" on public.noti_sync_snapshots;
drop policy if exists "noti sync insert own snapshot" on public.noti_sync_snapshots;
drop policy if exists "noti sync update own snapshot" on public.noti_sync_snapshots;
drop policy if exists "noti sync delete own snapshot" on public.noti_sync_snapshots;
drop policy if exists "noti sync read own chunks" on public.noti_sync_chunks;
drop policy if exists "noti sync insert own chunks" on public.noti_sync_chunks;
drop policy if exists "noti sync update own chunks" on public.noti_sync_chunks;
drop policy if exists "noti sync delete own chunks" on public.noti_sync_chunks;

create policy "noti sync read own snapshot"
on public.noti_sync_snapshots for select to authenticated
using (auth.uid() = user_id);

create policy "noti sync insert own snapshot"
on public.noti_sync_snapshots for insert to authenticated
with check (auth.uid() = user_id);

create policy "noti sync update own snapshot"
on public.noti_sync_snapshots for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "noti sync delete own snapshot"
on public.noti_sync_snapshots for delete to authenticated
using (auth.uid() = user_id);

create policy "noti sync read own chunks"
on public.noti_sync_chunks for select to authenticated
using (auth.uid() = user_id);

create policy "noti sync insert own chunks"
on public.noti_sync_chunks for insert to authenticated
with check (auth.uid() = user_id);

create policy "noti sync update own chunks"
on public.noti_sync_chunks for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "noti sync delete own chunks"
on public.noti_sync_chunks for delete to authenticated
using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.noti_sync_snapshots to authenticated;
grant select, insert, update, delete on public.noti_sync_chunks to authenticated;
