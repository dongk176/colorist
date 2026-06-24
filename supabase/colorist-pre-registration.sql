-- Colorist Hongdae designer pre-registration dedicated schema.
-- Supabase project: Gaming
-- URL: https://mvcprswvfybudtopepuj.supabase.co

create extension if not exists pgcrypto;

create schema if not exists colorist_pre_registration;

create table if not exists colorist_pre_registration.registrations (
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

  constraint registrations_contact_type_check
    check (contact_type in ('instagram', 'phone')),
  constraint registrations_services_count_check
    check (cardinality(selected_services) between 1 and 3),
  constraint registrations_consent_check
    check (consent = true),
  constraint registrations_status_check
    check (status in ('submitted', 'reviewing', 'drafted', 'contacted', 'archived'))
);

alter table colorist_pre_registration.registrations
  add column if not exists designer_pain_point text,
  add column if not exists customer_source text,
  add column if not exists subscription_intent text,
  add column if not exists survey_submitted_at timestamptz;

do $$
begin
  if to_regclass('public.colorist_pre_registrations') is not null then
    execute $copy$
      insert into colorist_pre_registration.registrations (
        id,
        naver_booking_link,
        selected_services,
        contact_type,
        contact_value,
        uploaded_files,
        uploaded_file_count,
        instagram_portfolio_id,
        desired_customer_types,
        main_need,
        consent,
        designer_pain_point,
        customer_source,
        subscription_intent,
        survey_submitted_at,
        source,
        status,
        created_at,
        updated_at
      )
      select
        id,
        naver_booking_link,
        selected_services,
        contact_type,
        contact_value,
        uploaded_files,
        uploaded_file_count,
        instagram_portfolio_id,
        desired_customer_types,
        main_need,
        consent,
        designer_pain_point,
        customer_source,
        subscription_intent,
        survey_submitted_at,
        source,
        status,
        created_at,
        updated_at
      from public.colorist_pre_registrations
      on conflict (id) do nothing
    $copy$;
  end if;
end
$$;

create index if not exists registrations_created_at_idx
  on colorist_pre_registration.registrations (created_at desc);

create index if not exists registrations_status_idx
  on colorist_pre_registration.registrations (status);

create or replace function colorist_pre_registration.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_registrations_updated_at
  on colorist_pre_registration.registrations;

create trigger set_registrations_updated_at
before update on colorist_pre_registration.registrations
for each row
execute function colorist_pre_registration.set_updated_at();

alter table colorist_pre_registration.registrations enable row level security;

drop policy if exists "Allow pre-registration inserts"
  on colorist_pre_registration.registrations;

create policy "Allow pre-registration inserts"
on colorist_pre_registration.registrations
for insert
to anon, authenticated
with check (consent = true);

drop policy if exists "Allow survey updates"
  on colorist_pre_registration.registrations;

create policy "Allow survey updates"
on colorist_pre_registration.registrations
for update
to anon, authenticated
using (survey_submitted_at is null)
with check (consent = true);

grant usage on schema colorist_pre_registration to anon, authenticated, service_role;
grant insert, update on colorist_pre_registration.registrations to anon, authenticated;
grant all on colorist_pre_registration.registrations to service_role;

drop table if exists public.colorist_pre_registrations;
drop function if exists public.set_colorist_pre_registration_updated_at();
