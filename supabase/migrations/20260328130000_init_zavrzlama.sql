-- Zavrzlama: profili, kategorije, prijave, servisni računi, storage
-- Pokreni u Supabase SQL Editoru ili: supabase db push

-- Enumi
create type public.report_urgency as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type public.report_status as enum (
  'open',
  'in_progress',
  'resolved',
  'archived'
);

-- Profili (1:1 s auth.users)
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  neighborhood text,
  age_bracket text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil građanina nakon registracije.';

-- Servisni računi (hackaton: ručno umetni user_id službenika)
create table public.service_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.service_accounts is 'Korisnici koji smiju mijenjati status prijava (uz app_metadata.role = admin).';

-- Kategorije
create table public.categories (
  id uuid primary key default gen_random_uuid (),
  slug text not null unique,
  name text not null,
  inherent_weight numeric not null default 1,
  created_at timestamptz not null default now()
);

comment on column public.categories.inherent_weight is 'Težina za heatmap / prioritet kategorije.';

-- Prijave
create table public.reports (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  category_id uuid not null references public.categories (id),
  urgency public.report_urgency not null default 'medium',
  status public.report_status not null default 'open',
  image_path text,
  score numeric not null default 1,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status);
create index reports_category_idx on public.reports (category_id);
create index reports_created_at_idx on public.reports (created_at desc);

comment on column public.reports.image_path is 'Put u bucketu report-photos, npr. {user_id}/datoteka.jpg';
comment on column public.reports.score is 'Težina za heatmap; može se kasnije derivirati iz kategorije.';

-- Trigger: novi auth korisnik → profil
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user ();

-- Tko smije updateati prijave (admin JWT ili service_accounts)
create or replace function public.is_service_or_admin ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((auth.jwt () -> 'app_metadata' ->> 'role') = 'admin', false)
    or exists (
      select 1
      from public.service_accounts sa
      where sa.user_id = (select auth.uid ())
    );
$$;

grant usage on schema public to anon, authenticated, service_role;

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;

grant select on public.reports to anon, authenticated;
grant insert, update on public.reports to authenticated;
grant all on public.reports to service_role;

grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

grant select on public.service_accounts to authenticated;
grant all on public.service_accounts to service_role;

alter table public.profiles enable row level security;
alter table public.service_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.reports enable row level security;

-- Profiles
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (user_id = (select auth.uid ()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid ()))
  with check (user_id = (select auth.uid ()));

-- service_accounts: bez javnog čitanja za obične korisnike
create policy "service_accounts_admin_select"
  on public.service_accounts for select
  to authenticated
  using (public.is_service_or_admin ());

-- Categories: javno čitanje (karta / forme)
create policy "categories_select_all"
  on public.categories for select
  using (true);

create policy "categories_write_admin"
  on public.categories for all
  to authenticated
  using (public.is_service_or_admin ())
  with check (public.is_service_or_admin ());

-- Reports: aktivne (ne archived) vidljive svima uključujući anon — demo karta
create policy "reports_select_non_archived"
  on public.reports for select
  using (status <> 'archived'::public.report_status);

create policy "reports_insert_authenticated_own"
  on public.reports for insert
  to authenticated
  with check (user_id = (select auth.uid ()));

create policy "reports_update_service_only"
  on public.reports for update
  to authenticated
  using (public.is_service_or_admin ())
  with check (public.is_service_or_admin ());

-- Seed kategorija
insert into public.categories (slug, name, inherent_weight)
values
  ('promet', 'Promet', 1.1),
  ('vandalizam', 'Vandalizam', 1.0),
  ('okolis', 'Okoliš', 1.15),
  ('infrastruktura', 'Infrastruktura i cijevi', 1.25)
on conflict (slug) do nothing;

-- Storage: fotke prijava
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', false)
on conflict (id) do update
set public = excluded.public;

-- Autentificirani upload: vlastiti prefiks ili reports/{user_id}/
create policy "report_photos_insert_own_prefix"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'report-photos'
    and (
      name like ((select auth.uid ())::text || '/%')
      or name like ('reports/' || (select auth.uid ())::text || '/%')
    )
  );

create policy "report_photos_select_own_prefix"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'report-photos'
    and (
      name like ((select auth.uid ())::text || '/%')
      or name like ('reports/' || (select auth.uid ())::text || '/%')
    )
  );

create policy "report_photos_update_own_prefix"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'report-photos'
    and (
      name like ((select auth.uid ())::text || '/%')
      or name like ('reports/' || (select auth.uid ())::text || '/%')
    )
  )
  with check (
    bucket_id = 'report-photos'
    and (
      name like ((select auth.uid ())::text || '/%')
      or name like ('reports/' || (select auth.uid ())::text || '/%')
    )
  );

create policy "report_photos_delete_own_prefix"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'report-photos'
    and (
      name like ((select auth.uid ())::text || '/%')
      or name like ('reports/' || (select auth.uid ())::text || '/%')
    )
  );

-- Javno čitanje objekata u reports/ (opcionalno za demo — anon može vidjeti slike na karti)
-- Ako želiš strogo privatne slike, ukloni ovu policy i koristi signed URL-ove u aplikaciji.
create policy "report_photos_public_read_reports_folder"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'report-photos'
    and name like 'reports/%'
  );

grant execute on function public.is_service_or_admin () to authenticated;
