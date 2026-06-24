-- Colori Hongdae designer pre-registration schema.
-- Supabase project: Gaming
-- URL: https://mvcprswvfybudtopepuj.supabase.co

create extension if not exists pgcrypto;

create table if not exists public.colorist_pre_registrations (
  id uuid primary key default gen_random_uuid(),
  naver_booking_link text not null,
  selected_services text[] not null,
  contact_type text not null default 'phone',
  contact_value text not null,
  uploaded_files jsonb not null default '[]'::jsonb,
  uploaded_file_count integer not null default 0,
  instagram_portfolio_id text,
  desired_customer_types text[] not null default '{}'::text[],
  main_need text,
  consent boolean not null default false,
  designer_pain_point text,
  customer_source text,
  subscription_intent text,
  survey_submitted_at timestamptz,
  source text not null default 'hongdae_designer_pre_registration',
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint colorist_pre_registrations_contact_type_check
    check (contact_type in ('instagram', 'phone')),
  constraint colorist_pre_registrations_services_count_check
    check (
      cardinality(selected_services) between 1 and 3
    ),
  constraint colorist_pre_registrations_consent_check
    check (consent = true),
  constraint colorist_pre_registrations_status_check
    check (status in ('submitted', 'reviewing', 'drafted', 'contacted', 'archived'))
);

alter table public.colorist_pre_registrations
  add column if not exists designer_pain_point text,
  add column if not exists customer_source text,
  add column if not exists subscription_intent text,
  add column if not exists survey_submitted_at timestamptz;

create index if not exists colorist_pre_registrations_created_at_idx
  on public.colorist_pre_registrations (created_at desc);

create index if not exists colorist_pre_registrations_status_idx
  on public.colorist_pre_registrations (status);

create or replace function public.set_colorist_pre_registration_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_colorist_pre_registration_updated_at
  on public.colorist_pre_registrations;

create trigger set_colorist_pre_registration_updated_at
before update on public.colorist_pre_registrations
for each row
execute function public.set_colorist_pre_registration_updated_at();

alter table public.colorist_pre_registrations enable row level security;

drop policy if exists "Allow public colorist pre-registration inserts"
  on public.colorist_pre_registrations;

create policy "Allow public colorist pre-registration inserts"
on public.colorist_pre_registrations
for insert
to anon, authenticated
with check (consent = true);

drop policy if exists "Allow public survey updates"
  on public.colorist_pre_registrations;

create policy "Allow public survey updates"
on public.colorist_pre_registrations
for update
to anon, authenticated
using (survey_submitted_at is null)
with check (consent = true);
