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
  designer_pain_point text[] not null default '{}'::text[],
  customer_source text[] not null default '{}'::text[],
  subscription_intent text[] not null default '{}'::text[],
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
  add column if not exists designer_pain_point text[] not null default '{}'::text[],
  add column if not exists customer_source text[] not null default '{}'::text[],
  add column if not exists subscription_intent text[] not null default '{}'::text[],
  add column if not exists survey_submitted_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'colorist_pre_registration'
      and table_name = 'registrations'
      and column_name = 'designer_pain_point'
      and data_type = 'text'
  ) then
    alter table colorist_pre_registration.registrations
      alter column designer_pain_point type text[]
      using case
        when designer_pain_point is null or btrim(designer_pain_point) = ''
          then '{}'::text[]
        else array[designer_pain_point]
      end;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'colorist_pre_registration'
      and table_name = 'registrations'
      and column_name = 'customer_source'
      and data_type = 'text'
  ) then
    alter table colorist_pre_registration.registrations
      alter column customer_source type text[]
      using case
        when customer_source is null or btrim(customer_source) = ''
          then '{}'::text[]
        else array[customer_source]
      end;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'colorist_pre_registration'
      and table_name = 'registrations'
      and column_name = 'subscription_intent'
      and data_type = 'text'
  ) then
    alter table colorist_pre_registration.registrations
      alter column subscription_intent type text[]
      using case
        when subscription_intent is null or btrim(subscription_intent) = ''
          then '{}'::text[]
        else array[subscription_intent]
      end;
  end if;
end
$$;

update colorist_pre_registration.registrations
set
  designer_pain_point = coalesce(designer_pain_point, '{}'::text[]),
  customer_source = coalesce(customer_source, '{}'::text[]),
  subscription_intent = coalesce(subscription_intent, '{}'::text[]);

alter table colorist_pre_registration.registrations
  alter column designer_pain_point set default '{}'::text[],
  alter column designer_pain_point set not null,
  alter column customer_source set default '{}'::text[],
  alter column customer_source set not null,
  alter column subscription_intent set default '{}'::text[],
  alter column subscription_intent set not null;

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
        case
          when designer_pain_point is null or btrim(designer_pain_point) = ''
            then '{}'::text[]
          else array[designer_pain_point]
        end,
        case
          when customer_source is null or btrim(customer_source) = ''
            then '{}'::text[]
          else array[customer_source]
        end,
        case
          when subscription_intent is null or btrim(subscription_intent) = ''
            then '{}'::text[]
          else array[subscription_intent]
        end,
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
