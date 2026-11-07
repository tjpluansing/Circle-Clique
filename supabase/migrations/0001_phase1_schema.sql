-- Circle Clique — Phase 1 schema (CLAUDE.md section 7, Phase 1 tables only).
--
-- Scope: the tables Phase 1 of the build plan (section 12) needs to
-- prove the emergency flow end to end — circles, membership, invites,
-- patients/households, alert contacts, SOS events, audit log, and
-- consents. Medical-record tables (conditions, medications, lab
-- results, appointments, etc.) are Phase 2 and come in a later
-- migration.
--
-- DRAFT: written against the spec, not yet run against a live
-- Supabase project. Review before applying — in particular the
-- `circle_members.role` enum values and the `is_admin` flag match
-- section 5.1 exactly ("Use exactly these names everywhere").

create extension if not exists pgcrypto;

create type user_role as enum ('primary', 'family', 'caregiver');
create type member_status as enum ('active', 'paused', 'revoked');
create type invite_status as enum ('open', 'used', 'expired', 'revoked');
create type sos_status as enum ('active', 'responding', 'resolved');
create type sos_channel as enum ('push', 'sms', 'call');
create type sos_log_status as enum ('sent', 'delivered', 'failed', 'acknowledged');
create type proximity_role as enum (
  'in_home', 'nearby', 'remote_coordinator', 'remote_family', 'security', 'other'
);
create type alert_rule as enum ('always', 'if_no_response', 'notify_only');
create type contact_type as enum ('app_member', 'sms_call_only');
create type auth_provider as enum ('phone', 'google', 'apple');

-- ---------------------------------------------------------------------------
-- circles
-- ---------------------------------------------------------------------------
create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  default_paper_size text,
  default_timezone text not null default 'Asia/Manila',
  plan text, -- reserved, unused for now (section 14 open item)
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles (one row per auth user, section 5.5 / section 7)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  phone text unique,
  phone_verified_at timestamptz,
  email text,
  photo_path text,
  auth_providers auth_provider[] not null default array['phone']::auth_provider[],
  locale text not null default 'en',
  timezone text not null default 'Asia/Manila',
  preferred_paper_size text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- circle_members (section 5.2 permission matrix lives on these rows)
-- ---------------------------------------------------------------------------
create table circle_members (
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role user_role not null,
  is_admin boolean not null default false,
  lives_in_home boolean not null default false,
  relationship text,
  schedule jsonb, -- days/hours on duty, nullable
  access_expires_at timestamptz,
  status member_status not null default 'active',
  can_edit_details boolean not null default false, -- Caregiver toggle, section 5.2
  can_see_financial boolean not null default false, -- Caregiver toggle, section 5.2
  invited_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

-- Caregivers default can_edit_details/can_see_financial to false per the
-- permission matrix; Primary/Family/Admin are modeled as always-true at
-- the policy level (see RLS migration) rather than needing the flag set
-- here, since the matrix says "Toggle (default Off)" only for Caregiver.

create index circle_members_user_idx on circle_members (user_id);

-- ---------------------------------------------------------------------------
-- households (section 5.4 — shared arrival info for Primaries who live
-- together)
-- ---------------------------------------------------------------------------
create table households (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  name text,
  address_info jsonb, -- arrival card fields: street, subdivision, gate/guard notes, landmarks, spare key, pets
  place_id text,
  lat double precision,
  lng double precision,
  timezone text not null default 'Asia/Manila'
);

-- ---------------------------------------------------------------------------
-- patients (a Primary's record — may or may not have a linked user_id)
-- ---------------------------------------------------------------------------
create table patients (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  full_name text not null,
  birthdate date,
  blood_type text,
  household_id uuid references households (id),
  photo_path text,
  photo_updated_at timestamptz,
  user_id uuid references profiles (id), -- nullable: Primary without the app
  timezone text not null default 'Asia/Manila',
  created_at timestamptz not null default now()
);

create index patients_circle_idx on patients (circle_id);

-- ---------------------------------------------------------------------------
-- patient_access (optional allow-list: a member with rows here sees only
-- those Primaries; a member with no rows sees every Primary in the circle)
-- ---------------------------------------------------------------------------
create table patient_access (
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  patient_id uuid not null references patients (id) on delete cascade,
  primary key (circle_id, user_id, patient_id)
);

-- ---------------------------------------------------------------------------
-- patient_labels (per-viewer nickname, section 5.4 — "Mom" vs "Mother-in-law")
-- ---------------------------------------------------------------------------
create table patient_labels (
  user_id uuid not null references profiles (id) on delete cascade,
  patient_id uuid not null references patients (id) on delete cascade,
  label text not null,
  primary key (user_id, patient_id)
);

-- ---------------------------------------------------------------------------
-- invites (section 5.5)
-- ---------------------------------------------------------------------------
create table invites (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  role user_role not null,
  patient_id uuid references patients (id), -- nullable; set for a Primary invite
  invited_phone text not null,
  lives_in_home boolean not null default false,
  code_hash text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  status invite_status not null default 'open',
  created_by uuid not null references profiles (id),
  used_by uuid references profiles (id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index invites_circle_idx on invites (circle_id);
create index invites_phone_idx on invites (invited_phone);

-- ---------------------------------------------------------------------------
-- alert_contacts (section 6.1 — who gets notified; separate from app roles)
-- ---------------------------------------------------------------------------
create table alert_contacts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  patient_id uuid references patients (id), -- nullable = applies to every Primary in the circle
  name text not null,
  phone text not null,
  relationship text,
  contact_type contact_type not null,
  proximity_role proximity_role,
  alert_rule alert_rule not null default 'always',
  delay_seconds integer, -- used when alert_rule = 'if_no_response'
  auto_call_if_no_ack boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_hours_allow_sos_override boolean not null default true,
  user_id uuid references profiles (id), -- set if also an app member
  created_at timestamptz not null default now()
);

create index alert_contacts_circle_idx on alert_contacts (circle_id);
create index alert_contacts_patient_idx on alert_contacts (patient_id);

-- ---------------------------------------------------------------------------
-- sos_events and sos_event_log (section 6.3–6.6)
-- ---------------------------------------------------------------------------
create table sos_events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  patient_id uuid not null references patients (id) on delete cascade,
  triggered_by uuid not null references profiles (id),
  status sos_status not null default 'active',
  lat double precision,
  lng double precision,
  is_test boolean not null default false, -- section 6.4 Test SOS mode
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles (id),
  note text
);

create index sos_events_circle_idx on sos_events (circle_id);
create index sos_events_patient_idx on sos_events (patient_id);
create index sos_events_status_idx on sos_events (status);

create table sos_event_log (
  id uuid primary key default gen_random_uuid(),
  sos_event_id uuid not null references sos_events (id) on delete cascade,
  contact_id uuid references alert_contacts (id),
  channel sos_channel not null,
  status sos_log_status not null,
  "timestamp" timestamptz not null default now()
);

create index sos_event_log_event_idx on sos_event_log (sos_event_id);

-- ---------------------------------------------------------------------------
-- audit_log (section 4, rule 2 — append-only; no update/delete grants)
-- ---------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid references profiles (id),
  action text not null, -- view|create|edit|delete|print|export
  table_name text not null,
  row_id uuid,
  old_value jsonb,
  new_value jsonb,
  "timestamp" timestamptz not null default now()
);

create index audit_log_circle_idx on audit_log (circle_id);
create index audit_log_table_row_idx on audit_log (table_name, row_id);

-- ---------------------------------------------------------------------------
-- consents (section 5.5 — "Consent at setup")
-- ---------------------------------------------------------------------------
create table consents (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid not null references profiles (id),
  consent_type text not null, -- e.g. 'privacy_terms', 'cloud_ocr'
  granted_at timestamptz not null default now()
);

create index consents_circle_idx on consents (circle_id);
