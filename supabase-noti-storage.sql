-- Noti cloud backup via Supabase Storage
-- Supabase > SQL Editor > New query > cole tudo > Run.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'noti-backups',
  'noti-backups',
  false,
  52428800,
  array['application/json']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "noti backup read own file" on storage.objects;
drop policy if exists "noti backup insert own file" on storage.objects;
drop policy if exists "noti backup update own file" on storage.objects;
drop policy if exists "noti backup delete own file" on storage.objects;

create policy "noti backup read own file"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'noti-backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "noti backup insert own file"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'noti-backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "noti backup update own file"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'noti-backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'noti-backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "noti backup delete own file"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'noti-backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
