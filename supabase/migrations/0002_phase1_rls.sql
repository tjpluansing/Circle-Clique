-- Circle Clique — Phase 1 Row Level Security (CLAUDE.md section 4 rule 1,
-- section 5.2 permission matrix, section 7 "writes follow the
-- permission matrix; deletes are allowed only for is_admin members").
--
-- DRAFT — review before applying. Written as `security definer` helper
-- functions + policies per table, so the matrix logic lives in one
-- place instead of being copy-pasted into every policy. Every policy
-- enforces section 4 rule 10: every query is scoped by the active
-- circle_id (and patient_id where relevant) — there is no "superuser"
-- bypass here even for the Admin flag; Admin still only reaches rows
-- inside circles they belong to.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- Active (non-revoked, non-paused, non-expired) membership check.
create or replace function is_circle_member(p_circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and (cm.access_expires_at is null or cm.access_expires_at > now())
  );
$$;

create or replace function is_circle_admin(p_circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.is_admin = true
  );
$$;

-- Section 5.4: a member sees every Primary in their circle by default;
-- the Admin can restrict a member to specific Primaries via
-- patient_access. "Restricted" means the member has *any* patient_access
-- rows at all — once they have one row, only listed patients are visible.
create or replace function can_see_patient(p_patient_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from patients p
    where p.id = p_patient_id
      and is_circle_member(p.circle_id)
      and (
        not exists (
          select 1 from patient_access pa
          where pa.circle_id = p.circle_id and pa.user_id = auth.uid()
        )
        or exists (
          select 1 from patient_access pa
          where pa.circle_id = p.circle_id
            and pa.user_id = auth.uid()
            and pa.patient_id = p_patient_id
        )
      )
  );
$$;

-- Section 5.2: Primary, Family, Admin can always edit details; Caregiver
-- only when circle_members.can_edit_details is on for them.
create or replace function can_edit_patient_details(p_patient_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from patients p
    join circle_members cm on cm.circle_id = p.circle_id
    where p.id = p_patient_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and can_see_patient(p_patient_id)
      and (
        cm.is_admin
        or cm.role in ('primary', 'family')
        or (cm.role = 'caregiver' and cm.can_edit_details)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- circles
-- ---------------------------------------------------------------------------
alter table circles enable row level security;

create policy circles_select on circles
  for select using (is_circle_member(id));

-- A circle is created by the Admin-to-be as part of sign-up (section
-- 5.5 path 1); the row is inserted by an Edge Function running as the
-- new user, so any authenticated user may insert, but only once they
-- are also added as its first (admin) circle_member in the same
-- transaction — enforced at the Edge Function level, not by RLS alone.
create policy circles_insert on circles
  for insert with check (auth.uid() is not null);

create policy circles_update on circles
  for update using (is_circle_admin(id));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;

create policy profiles_select_self on profiles
  for select using (id = auth.uid());

-- A member can see the profile of anyone who shares a circle with them
-- (needed to show names/photos on My People, alert contacts, etc.)
create policy profiles_select_circlemates on profiles
  for select using (
    exists (
      select 1 from circle_members mine
      join circle_members theirs on theirs.circle_id = mine.circle_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = profiles.id
        and theirs.status = 'active'
    )
  );

create policy profiles_update_self on profiles
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- circle_members
-- ---------------------------------------------------------------------------
alter table circle_members enable row level security;

create policy circle_members_select on circle_members
  for select using (is_circle_member(circle_id));

-- Section 5.2: "Add, remove, or change members and roles; invite
-- caregivers" is Admin-only.
create policy circle_members_admin_write on circle_members
  for all using (is_circle_admin(circle_id))
  with check (is_circle_admin(circle_id));

-- A user may insert their own row only via the invite-redemption Edge
-- Function (service role), not directly — no self-insert policy here.

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
alter table households enable row level security;

create policy households_select on households
  for select using (is_circle_member(circle_id));

-- Section 5.2: editable by Primary, Family, Admin (Caregiver by toggle) —
-- same rule as patient details, applied at the household level.
create policy households_write on households
  for all using (
    is_circle_admin(circle_id)
    or exists (
      select 1 from circle_members cm
      where cm.circle_id = households.circle_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and (cm.role in ('primary', 'family')
             or (cm.role = 'caregiver' and cm.can_edit_details))
    )
  )
  with check (is_circle_member(circle_id));

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
alter table patients enable row level security;

create policy patients_select on patients
  for select using (can_see_patient(id));

create policy patients_insert on patients
  for insert with check (is_circle_member(circle_id));

create policy patients_update on patients
  for update using (can_edit_patient_details(id));

-- No delete policy: patients are not deleted via the client (soft
-- delete, if ever needed, is Admin-only per the matrix and would get
-- its own explicit policy — omitted here since Phase 1 never deletes a
-- Primary record).

-- ---------------------------------------------------------------------------
-- patient_access
-- ---------------------------------------------------------------------------
alter table patient_access enable row level security;

create policy patient_access_select on patient_access
  for select using (is_circle_member(circle_id));

create policy patient_access_admin_write on patient_access
  for all using (is_circle_admin(circle_id))
  with check (is_circle_admin(circle_id));

-- ---------------------------------------------------------------------------
-- patient_labels (each viewer manages only their own labels)
-- ---------------------------------------------------------------------------
alter table patient_labels enable row level security;

create policy patient_labels_own on patient_labels
  for all using (user_id = auth.uid() and can_see_patient(patient_id))
  with check (user_id = auth.uid() and can_see_patient(patient_id));

-- ---------------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------------
alter table invites enable row level security;

-- Invite codes are redeemed through a service-role Edge Function (the
-- code itself is the credential, not circle membership), so the only
-- client-facing policy is: an Admin can see and manage invites for
-- their own circle.
create policy invites_admin on invites
  for all using (is_circle_admin(circle_id))
  with check (is_circle_admin(circle_id));

-- ---------------------------------------------------------------------------
-- alert_contacts
-- ---------------------------------------------------------------------------
alter table alert_contacts enable row level security;

create policy alert_contacts_select on alert_contacts
  for select using (
    is_circle_member(circle_id)
    and (patient_id is null or can_see_patient(patient_id))
  );

-- Section 5.2: "Alert contacts and escalation rules" — Admin only.
create policy alert_contacts_admin_write on alert_contacts
  for all using (is_circle_admin(circle_id))
  with check (is_circle_admin(circle_id));

-- ---------------------------------------------------------------------------
-- sos_events
-- ---------------------------------------------------------------------------
alter table sos_events enable row level security;

create policy sos_events_select on sos_events
  for select using (can_see_patient(patient_id));

-- Section 6.3: "Anyone (Primary, Family, Caregiver) can trigger SOS."
create policy sos_events_insert on sos_events
  for insert with check (
    can_see_patient(patient_id) and triggered_by = auth.uid()
  );

-- Section 6.4: "Any responder can mark the event Resolved"; "I'm
-- responding" also updates status — both just need circle visibility,
-- not Admin.
create policy sos_events_update on sos_events
  for update using (can_see_patient(patient_id));

-- ---------------------------------------------------------------------------
-- sos_event_log (written only by server-side escalation logic)
-- ---------------------------------------------------------------------------
alter table sos_event_log enable row level security;

create policy sos_event_log_select on sos_event_log
  for select using (
    exists (
      select 1 from sos_events e
      where e.id = sos_event_log.sos_event_id
        and can_see_patient(e.patient_id)
    )
  );

-- No client insert/update policy: only the escalation Edge Function
-- (service role, bypasses RLS) writes to this table.

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
alter table audit_log enable row level security;

-- Section 5.2: "View audit log ... " is Admin-only.
create policy audit_log_select_admin on audit_log
  for select using (is_circle_admin(circle_id));

-- No update/delete policy at all, for anyone (section 4 rule 2: "Users
-- cannot edit or delete audit entries"). Inserts happen via a trigger
-- or the service role from application code, not direct client writes
-- — so there is no client-facing insert policy either; audit rows are
-- written by `security definer` functions that trusted server code
-- calls, never by the end-user's own RLS-scoped connection.

-- ---------------------------------------------------------------------------
-- consents
-- ---------------------------------------------------------------------------
alter table consents enable row level security;

create policy consents_select on consents
  for select using (
    user_id = auth.uid() or is_circle_admin(circle_id)
  );

create policy consents_insert_self on consents
  for insert with check (
    is_circle_member(circle_id)
    and (
      user_id = auth.uid()
      -- Section 5.5: "If the Primary cannot [accept], the Admin accepts
      -- as their representative" — Admin may insert on behalf of
      -- someone else in the same circle.
      or is_circle_admin(circle_id)
    )
  );
