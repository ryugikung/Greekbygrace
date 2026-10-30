-- V7 APPEARANCE STUDIO: additive/idempotent migration. DO NOT run setup.sql again.
-- Requires public.is_staff() and public.is_owner() from the original installation.
create extension if not exists pgcrypto;

create table if not exists public.user_appearance (
  user_id uuid primary key references auth.users(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.store_themes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 48),
  config jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.store_stickers (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 1 and 64),
  storage_path text not null unique,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.store_shared_note (
  id integer primary key default 1 check(id=1),
  message text not null default '' check(length(message)<=160),
  updated_at timestamptz not null default now()
);
insert into public.store_shared_note (id) values (1) on conflict (id) do nothing;

alter table public.user_appearance enable row level security;
alter table public.store_themes enable row level security;
alter table public.store_stickers enable row level security;
alter table public.store_shared_note enable row level security;

drop policy if exists own_appearance_read on public.user_appearance;
create policy own_appearance_read on public.user_appearance for select to authenticated using (user_id=auth.uid() and public.is_staff());
drop policy if exists own_appearance_insert on public.user_appearance;
create policy own_appearance_insert on public.user_appearance for insert to authenticated with check (user_id=auth.uid() and public.is_staff());
drop policy if exists own_appearance_update on public.user_appearance;
create policy own_appearance_update on public.user_appearance for update to authenticated using(user_id=auth.uid() and public.is_staff()) with check (user_id=auth.uid() and public.is_staff());

drop policy if exists staff_read_themes on public.store_themes;
create policy staff_read_themes on public.store_themes for select to authenticated using(public.is_staff());
drop policy if exists owner_write_themes on public.store_themes;
create policy owner_write_themes on public.store_themes for insert to authenticated with check (public.is_owner());
drop policy if exists owner_edit_themes on public.store_themes;
create policy owner_edit_themes on public.store_themes for update to authenticated using(public.is_owner()) with check(public.is_owner());
drop policy if exists owner_delete_themes on public.store_themes;
create policy owner_delete_themes on public.store_themes for delete to authenticated using(public.is_owner());

drop policy if exists staff_read_stickers on public.store_stickers;
create policy staff_read_stickers on public.store_stickers for select to authenticated using(public.is_staff());
drop policy if exists owner_add_stickers on public.store_stickers;
create policy owner_add_stickers on public.store_stickers for insert to authenticated with check(public.is_owner());
drop policy if exists owner_remove_stickers on public.store_stickers;
create policy owner_remove_stickers on public.store_stickers for delete to authenticated using(public.is_owner());

drop policy if exists staff_read_note on public.store_shared_note;
create policy staff_read_note on public.store_shared_note for select to authenticated using(public.is_staff());
drop policy if exists staff_write_note on public.store_shared_note;
create policy staff_write_note on public.store_shared_note for update to authenticated using(public.is_staff()) with check(public.is_staff());

-- Decorative images only: public URLs are acceptable. Never upload customer or financial data here.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('store-decor','store-decor',true,2097152,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists owner_upload_decor on storage.objects;
create policy owner_upload_decor on storage.objects for insert to authenticated with check (bucket_id='store-decor' and public.is_owner());
drop policy if exists owner_delete_decor on storage.objects;
create policy owner_delete_decor on storage.objects for delete to authenticated using (bucket_id='store-decor' and public.is_owner());
-- Public bucket serves images by URL; object reads work through public bucket URLs.
