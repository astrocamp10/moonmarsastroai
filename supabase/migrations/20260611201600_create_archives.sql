create table if not exists public.archives (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  title text not null,
  body_key text,
  body_name text,
  mode text,
  mode_label text,
  details text,
  answer_level_key text,
  image_path text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.archives enable row level security;

drop policy if exists "Anyone can read archives" on public.archives;
create policy "Anyone can read archives"
on public.archives
for select
using (true);

drop policy if exists "Anyone can insert archives" on public.archives;
create policy "Anyone can insert archives"
on public.archives
for insert
with check (true);

drop policy if exists "Anyone can update archives" on public.archives;
create policy "Anyone can update archives"
on public.archives
for update
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('archive-images', 'archive-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Anyone can read archive images" on storage.objects;
create policy "Anyone can read archive images"
on storage.objects
for select
using (bucket_id = 'archive-images');

drop policy if exists "Anyone can upload archive images" on storage.objects;
create policy "Anyone can upload archive images"
on storage.objects
for insert
with check (bucket_id = 'archive-images');

drop policy if exists "Anyone can update archive images" on storage.objects;
create policy "Anyone can update archive images"
on storage.objects
for update
using (bucket_id = 'archive-images')
with check (bucket_id = 'archive-images');
