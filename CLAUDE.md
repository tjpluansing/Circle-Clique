# CLAUDE.md: Family Care App ("Circle Clique")  (Spec v12)

A mobile app that keeps one person's (the **Primary's**) personal and medical details, medical records, appointments, and an SOS emergency button that alerts family and caregivers. Built first for one family (Circle #1), but designed as a product any family can be onboarded to later.

## 1. Product summary

- **Primary:** a person being cared for. **There can be many Primaries, and one user can belong to many circles**, so one login can look after Mom, Dad, and a spouse's parents (section 5.4). In Circle #1 the first Primary is Mom (Samsung Galaxy A35 today, but the app must work for a Primary on any phone).
- **Family members and caregivers:** can be on **any Android or iPhone**, in any country. No feature may depend on who uses which platform.
- **Core promise:** when SOS is triggered, the right people are alerted in the right order, with live location, and everyone can see who is responding.
- **The app supplements calling emergency services (911 in the Philippines). It never replaces it.** State this in onboarding and on the SOS screen.

## 2. Platform policy: Android and iPhone are equal

1. **Every role works on both platforms.** Primary, Family, and Caregiver can each use Android or iPhone. Never assume a role maps to an OS.
2. **Feature parity is a release requirement.** A feature ships only when it works on both, or has a documented equivalent (see table). Anything lacking an equivalent is flagged in the PR.
3. **Single codebase** (Expo / React Native). Platform-specific code lives behind small interfaces in `src/platform/` (`android.ts`, `ios.ts`) so the rest of the app stays shared.
4. **Native features need development builds** (Expo Go is not enough). Use EAS Build with config plugins.

| Capability | Android | iPhone |
|---|---|---|
| One-tap SOS from home screen | Home-screen widget | Home Screen / Lock Screen widget and Control Center control that deep-link into the SOS countdown |
| Alert that breaks through silent / Do Not Disturb | High-priority notification channel + full-screen intent (user grants DND override) | **Critical Alerts** (Apple entitlement; apply in Phase 0). Fallback: Time Sensitive notifications + SMS and voice-call escalation |
| Background reliability | Foreground service, battery set to Unrestricted | Background App Refresh on, location "Always", Focus-mode allow-list |
| Location during SOS | Fine location, "Allow all the time" | Precise location, "Always" |
| Install and updates | Google Play (internal testing, then production) | TestFlight, then App Store |

Per-platform **Setup Checklists** are in section 11.

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| App | Expo (React Native, TypeScript) | One codebase, Android and iOS. EAS Build in the cloud (no Mac required). |
| Over-the-air updates | **EAS Update** (`expo-updates`) | See section 8. |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) | Row-level security (RLS) on every table. |
| Push | `expo-notifications` with FCM (Android) and APNs (iOS) | Includes iOS Critical Alerts once approved. |
| SMS and voice | Twilio, or a Philippine provider such as Semaphore for SMS | Must reach contacts who do not have the app. |
| Printing and PDF | `expo-print` and `expo-sharing` | See section 9. |
| Maps | Google Maps Platform: Maps SDK for Android and iOS (via `react-native-maps` with the Google provider), Places API for address search, and Google Maps links for directions | See section 8D. Keys are restricted per app and kept out of the code. |
| Storage | Supabase Storage, private buckets, signed URLs | Scans, PDFs, ID card photos. |
| Config | `.env` and Supabase secrets, never committed | No API keys in code. |

## 4. Global rules

1. **Everything belongs to a circle.** Every table has `circle_id`, enforced by RLS. Family #1 is just Circle #1. Other families later are more circles.
2. **Audit log everything sensitive** (view, create, edit, delete, print, export) with user, time, and old/new values. Users cannot edit or delete audit entries.
3. **All user-facing text is in translation files** (`i18n/en.json`; Tagalog `tl.json` later). No hard-coded strings.
4. **Timezones:** store UTC, show each viewer's local time, and label appointments with the place's timezone (e.g. "Tue 9:00 AM Manila").
5. **Never rely on color alone.** Pair status color with icon and word.
6. **SOS code is the highest-risk code.** Keep it small, tested, and reviewed. Simple and reliable beats clever.
7. **Medical data is sensitive personal information** (Philippine Data Privacy Act; and PIPEDA if Canadian users are added). Encrypt in transit and at rest, require PIN or biometric to open the app, and record consent. **Sending any image or document to a cloud OCR provider needs separate, explicit consent** (section 8A).
8. **Platform parity** (section 2) applies to every task.
9. **Every Primary has a photo, shown beside their name everywhere** (My People cards, health file header, SOS alerts and countdown, responder screen, push notifications, the live-location web link, and the printed emergency card). If no photo exists, show initials. Photos are taken or picked during setup (Primary, Family, or Caregiver may add or change them), stored in a private bucket, resized to a small thumbnail for notifications, and never public. A clear face photo helps a neighbor or guard identify the right person in an emergency.
10. **Never assume one circle or one Primary.** Every screen, query, notification, and print job is scoped by the active `circle_id` and `patient_id`, and a user may belong to several circles.

## 5. Users, roles, and permissions

### 5.1 Three standard user types
Use exactly these names everywhere (UI, database, docs):

| User type | Who | Notes |
|---|---|---|
| **Primary** | The person being cared for | Gets the simple "Primary Mode" UI by default (large text, few buttons, "My Day" home). Mode can be changed in settings. |
| **Family** | Relatives and friends who help (siblings, cousins, etc.) | Can live anywhere. |
| **Caregiver** | People who help with daily care, including **live-in household members** (dad, a helper, a nurse) | Admin can add as many as needed. |

On top of the three types there is one flag: **Admin** (`is_admin = true`). The Admin manages the circle and controls access. In Circle #1 the Admin is Karla. The flag can be given to more than one person (recommended: one backup Admin).

Database: `role` enum = `primary | family | caregiver`, plus `is_admin boolean`.

The Primary is a **patient record** and may or may not also be an app user (a Primary without a phone can still be fully managed by others).

**Roles are per circle.** The same person can be Admin in one circle, Family in another, and Primary in their own, all under one account.

### 5.2 Permission matrix

| Action | Primary | Family | Caregiver | Admin |
|---|---|---|---|---|
| View health file, records, appointments, contacts | Yes | Yes | Yes | Yes |
| **Upload documents** and **scan with OCR** (prescriptions, ID/insurance card photos, discharge papers, other) | Yes | **Yes** | Yes | Yes |
| **Edit details** (profile, conditions, allergies, medications list, doctors list, insurance info, arrival card) | Yes | **Yes** | Toggle (default Off) | Yes |
| **Lab results**: upload, edit | Yes | **Yes** | Toggle (default Off) | Yes |
| **Doctor, lab, and procedure appointments**: create, edit | Yes | **Yes** | Toggle (default Off) | Yes |
| Delete a lab result or appointment (soft delete, restorable) | No | No | No | **Yes** |
| Request an appointment or add a note on one | Yes | Yes | Yes | Yes |
| Create and edit BP and blood sugar reminder schedules | **Yes** | Yes | Toggle (default Off) | Yes |
| Log medication taken / skipped, vitals, symptoms, daily notes | Yes | Yes | Yes | Yes |
| Post a care note or caregiver handover note (section 8G) | Yes | Yes | Yes | Yes |
| Delete a care note or handover note (soft delete, restorable) | No | No | No | **Yes** |
| Daily "I'm OK" check-in | Yes | n/a | n/a | n/a |
| Trigger SOS (for the Primary) | Yes | Yes | Yes | Yes |
| Respond to SOS ("I'm responding", resolve) | Yes | Yes | Yes | Yes |
| See expenses and full insurance numbers | Yes | Yes | Toggle (default Off) | Yes |
| Print and export what they can view | Yes | Yes | Yes | Yes |
| Add, remove, or change members and roles; invite caregivers | No | No | No | **Yes** |
| Alert contacts and escalation rules | No | No | No | **Yes** |
| View audit log, delete records, export everything | No | No | No | **Yes** |

Rules:
- Permissions are enforced in **RLS and Edge Functions**, not just by hiding buttons.
- Lab results and appointments are editable by Primary, Family, and Admin (and by Caregivers when the toggle is on). Every edit keeps version history in the audit log and **notifies everyone with access**, so changes are visible. Only the Admin can delete, and deletes are soft deletes that can be restored.
- Medication changes by non-Admins are saved immediately but **flagged for Admin confirmation** (`needs_confirmation`) and shown to everyone with a "Pending confirmation" label. This protects against accidental dosage edits.
- Every Admin-granted toggle (e.g. a Caregiver "can edit details") is per person and logged.

### 5.3 Adding caregivers (including people in the same house)
- Admin taps **Add caregiver** and chooses an invite method: link, QR code, or one-time code sent by SMS. Works on any phone.
- Caregiver attributes: `lives_in_home`, `relationship` (e.g. stepfather, helper, nurse), optional **schedule** (days and hours on duty), optional **access end date** for temporary helpers, and the two toggles above.
- A Caregiver who `lives_in_home` is **automatically proposed as an in-home responder** in alert contacts.
- Admin can **pause or revoke** a caregiver's access instantly. Revocation signs them out of the app and removes their push tokens.
- Caregivers can also be **SMS/call-only** (no app) if they cannot or will not install it.

### 5.4 Multiple Primaries (Mom, Dad, a spouse's parents, and more)

One account can look after as many Primaries as needed.

**How it is modeled**
- A **circle** is a care group: one or more Primaries plus the people who help them.
- **Default: one circle per household.** Parents who live apart, or a spouse's parents in a different home, each get **their own circle**. That keeps each household's family, caregivers, alert contacts, time zone, and privacy separate.
- **Exception:** two Primaries who **live together and share the same helpers** (for example a couple at the same address) can sit in the **same circle**. They share the household's arrival info, caregivers, and alert contacts, and each keeps a separate health file.
- **One user can belong to many circles**, with a different role in each.

**Add a person to care for** (available to any user from the home screen)
1. Enter the Primary's details (name, photo, birthdate, relationship).
2. Choose:
   - **"Lives in the same home as someone already here"** → added to that circle, linked to the same household, sharing caregivers, alert contacts, and arrival card (each editable per person).
   - **"Separate household"** → creates a **new circle**. The creator becomes its Admin and can invite Family and Caregivers.
3. Optionally invite the Primary to install the app and link their phone.

**Access inside a circle**
- Members see every Primary in their circle by default.
- The Admin can **limit a member to specific Primaries** (for example a helper who only looks after Dad) using `patient_access`.
- **Admin transfer:** an Admin can promote another member to Admin and step down (useful when a spouse takes over their parents' circle). Every circle must keep at least one Admin.

**Switching and overview**
- A **circle / Primary switcher** in the header of Full Mode.
- A **"My People" dashboard**: one card per Primary across **all** of the user's circles, showing photo and name, last check-in, next appointment, medications or BP and sugar readings due or missed, and any active SOS (an active SOS goes to the top in the emergency color). Status always uses icon, word, and color. Tapping a card opens that Primary.
- Each viewer can set their own **label** for a Primary ("Mom", "Dad", "Mother-in-law") through `patient_labels`. The official name is always shown too, so alerts are never ambiguous.
- Primary Mode (the simple UI for the Primary) is unaffected and shows only that person's own data.

**Example layout (illustrative)**
| Circle | Primaries | Admin | Others |
|---|---|---|---|
| Circle #1 | Mom | You | Dad (Caregiver), cousin and brother (Family) |
| Circle #2 | Dad | You | His helpers and relatives |
| Circle #3 | Spouse's Mom and Dad (one circle if they share a home, two if not) | Your spouse | You (Family or Admin), the in-laws' helpers |

### 5.5 Registration, sign-in, and verification

**Identity is the verified mobile phone number.** SOS texts and calls go to phone numbers, so every person who can receive an alert must have a verified one.

**First launch (two paths, never a role picker)**
1. **"I'm setting up care for someone"** → verify phone → create circle → the user becomes Admin → "Add a person to care for" (section 5.4) → invite others.
2. **"I have an invite"** → open the invite link or QR code, or type the 6-digit invite code → verify phone → the role (Primary, Family, or Caregiver) is **already set in the invite**. The user never chooses it.
- An install with no invite can only take path 1. Nobody can join a circle without an invite.

**Invites (`invites` table)**
- Created by Admin: circle, role, patient access, intended phone number, optional `lives_in_home`, expiry (default 7 days), single use. Delivered as a link, QR code, or 6-digit code.
- The invite is bound to the intended phone number. If a different number is verified, the Admin must approve before access is granted.
- The Primary's invite is a special type: after verification it opens a **large-text welcome**, the photo and consent screens, and the device Setup Checklist (section 11). The Admin may set it up while with the Primary or on a call.

**Sign-in methods**
| Method | Use |
|---|---|
| **Phone number + SMS code (default for everyone)** | Primary method. Works for Philippine and international (+1 Canada) numbers. |
| **Continue with Google** (optional) | One-tap convenience for Family and Admin. Supabase Auth Google provider. The user must **still verify a phone number once** so they can receive SOS alerts. |
| **Continue with Apple** (optional) | Offer alongside Google on iPhone, because the App Store requires an equivalent privacy-focused option when a third-party sign-in is offered. Verify current guideline 4.8 wording before submission. |
| Email code (optional backup) | Recovery and for people whose texts do not arrive. Added in settings. |
| Passwords | Not used. |

**Verification rules**
- 6-digit code, expires in 10 minutes, limited attempts and resends per number and device, rate limits per IP.
- Auto-read the code (Android SMS Retriever, iOS one-time-code autofill) so older users do not type it.
- Offer **"Call me with the code"** (voice) as a fallback, especially for the Primary.
- Provider: Supabase phone auth with Twilio Verify, or a Philippine provider. **Test delivery to the real numbers in Circle #1 in Phase 0** (Philippine carriers may require registered sender IDs). Consider a Viber or WhatsApp code channel as a backup.
- After signing in, the app locks behind a PIN or biometric. Role changes, exports, and removing members ask for it again.
- **New phone:** re-verify the number; the old device is signed out and its push tokens removed. Admin can remove any member's device at any time.
- Linking a Google or Apple account never changes the verified phone number, and a phone-number change needs a new code sent to the new number.
- Account deletion is available in the app (App Store requirement). It deletes the user's account and not the circle's records unless the Admin chooses so.

**Consent at setup**
- The Primary sees a plain-language privacy and sharing screen and accepts it. If the Primary cannot, the Admin accepts as their representative, and the app records who accepted (`consents`).
- Each member accepts the circle's privacy terms on first sign-in.
- Cloud OCR has its own separate consent (section 8A).

## 6. Alert contacts and SOS escalation

### 6.1 Alert contacts (who gets notified; separate from app permissions)
```
alert_contacts
  id, circle_id, patient_id (nullable = applies to every Primary in the circle), name, phone, relationship
  contact_type: 'app_member' | 'sms_call_only'
  proximity_role: 'in_home' | 'nearby' | 'remote_coordinator' | 'remote_family' | 'security' | 'other'
  alert_rule: 'always' | 'if_no_response' | 'notify_only'
  delay_seconds        (for 'if_no_response')
  auto_call_if_no_ack  (boolean)
  quiet_hours_start, quiet_hours_end, quiet_hours_allow_sos_override
  user_id (nullable; set if the contact is also an app member)
```
Admin can add any number of additional alert contacts at any time.

### 6.2 Initial setup for Circle #1
| Person | Phone | User type | Admin | Proximity role | Alert rule |
|---|---|---|---|---|---|
| Mom | Android (Galaxy A35) | Primary | No | n/a | n/a |
| Karla | any | Family | **Yes** | remote_coordinator | always |
| Dad | Android | Caregiver (lives in home) | No | in_home | always, auto-call at 60s |
| Cousin (same subdivision) | Android | Family | No | nearby | always, auto-call at 60s |
| Brother (Canada) | iPhone | Family | No | remote_family | if_no_response after 120s |
| Subdivision guard house | n/a | (SMS contact only) | No | security | if_no_response after 120s, SMS only; add when number is known |

### 6.3 SOS trigger
- Big SOS button in the app, plus the home-screen widget (Android) or widget/Control Center control (iPhone).
- **5-second countdown** with a large Cancel button.
- **Anyone** (Primary, Family, Caregiver) can trigger SOS for the Primary. The event records who triggered it.

### 6.4 Escalation timeline (all values configurable by Admin)
| Time | Action |
|---|---|
| 0:05 (after countdown) | Push and SMS to all `always` contacts, with a **live-location web link** (no app or login needed) and a tap-to-call link to the Primary |
| 1:00 | If no one tapped "I'm responding": automatic voice calls to `auto_call_if_no_ack` contacts |
| 2:00 | Alert `if_no_response` contacts (brother, guard house SMS) |
| 3:00 | Re-alert everyone with a prominent "Call 911 now" prompt |

- When anyone taps **"I'm responding"**, everyone sees who, escalation pauses, and live location keeps updating.
- `notify_only` contacts see the event but are never escalated.
- Any responder can mark the event **Resolved** with a note.
- **Fallbacks:** no data on the Primary's phone → SMS with last-known location; push not acknowledged → SMS then voice call. Log every attempt and result in `sos_event_log`.
- **Test mode:** a clearly labeled "Test SOS" so the family can verify delivery without alarming anyone.

### 6.5 Arrival Info Card
House number, street, subdivision, gate and guard-house instructions, landmarks, spare key location, pets, and key medical facts (blood type, allergies, conditions, medications). Shown to responders, in SMS links, and printable.

### 6.6 SOS with multiple Primaries and circles
- **Every SOS push, SMS, voice call, and live-location link names the Primary** (name, photo, and the viewer's own label such as "Mom"), plus the address. Voice calls say the Primary's name and address aloud.
- Alert contacts, escalation timings, caregivers, and the arrival card are **per circle**, and optionally per Primary.
- **Several SOS events can be active at once**, even across circles. "I'm responding" and "Resolve" apply to one event only, and the responder screen lists active events newest first.
- Event times show in the Primary's local time with the place labeled, plus the viewer's own time.
- If a Primary is also a Family member in another circle, their SOS alerts only their own circle.
- **Test SOS** is run per Primary.

### 6.7 SOS widgets

Designed in the sample screens (widget boards). Rules:
- **A widget tap never sends an alert by itself.** It opens the app at the 5-second countdown, where Cancel is one tap away, so a pocket press or a grandchild's tap does not alarm the family.
- **Android** (native widget through an Expo config plugin, for example `react-native-android-widget`, or Jetpack Glance; evaluate in Phase 0):
  - 1×1: just the red SOS button. 2×1: SOS button plus "Tap for help". 2×2: one big SOS circle, or a "next medicine" card with an "I took them" button. 4×2: SOS circle, "I'm OK today" button, and the next medicine or reading due.
  - Design tokens apply: emergency red only on SOS, cream background, teal text. Text at least 14 sp and the SOS target at least 64 dp.
  - The widget updates its "next" text when schedules change, and shows an offline note when there is no data (the SMS fallback still works).
  - A home-screen widget needs an unlocked phone. For a locked phone, the Setup Checklist recommends the phone's side-key Emergency SOS, plus the app's notification shortcut.
- **iPhone** (WidgetKit and App Intents): a Home Screen widget with the same content, **Lock Screen widgets** (a circular SOS, a circular "I'm OK", a rectangular "next medicine"), and a **Control Center control** that can also sit in a Lock Screen corner. The user adds these once, and the Setup Checklist shows how.
- Family and Caregivers can add the widget too. It triggers SOS **for the Primary they choose** (a picker in the widget settings), and the countdown names that person.
- On the Samsung Galaxy A35 (One UI), place the widget on the first home screen and use "Lock Home screen layout" so it cannot be removed by accident.
- **Smartwatch (optional companion, Phase 4):** a watch app or complication that triggers the same 5-second countdown, never an alert by itself. **Apple Watch:** a WidgetKit complication or App Intent on watchOS. **Wear OS (Android watches):** a tile with the same SOS button. Platform parity (section 2) applies here too: the watch feature ships for both watch platforms or not at all. The watch pairs to one Primary (or, for Family and Caregivers, to whichever Primary they choose, same as the phone widget) and needs the phone nearby or its own data connection to send the alert.

### 6.8 Geofencing ("safe zone") alerts

- **Purpose:** an early-warning tool if a Primary wanders off or leaves an area unexpectedly, not a replacement for SOS. Optional per Primary; off by default.
- Admin or Family draws one or more **safe zones** on the map (home, a parent's subdivision) with a center pin and radius, same Google Maps search and pin-drop as the Arrival Info Card (section 8D).
- When location is available (the same "Allow all the time" / "Always" permission SOS already needs), the app checks the Primary's position against the active safe zone(s).
- **Leaving** a safe zone notifies the people chosen for that zone (Admin, Family, the designated caregiver), with the Primary's name, photo, time, and a map link, in the same cream/teal/peach style as other alerts — never the emergency red, since this is not itself an SOS.
- **Returning** sends a lower-priority "back inside the safe zone" notice to the same people, so no one keeps worrying after the Primary is safely back.
- A **grace period** (configurable, default 2 minutes) avoids false alarms from GPS drift at the zone's edge.
- From a geofence alert, a tap opens the same live-location map as the responder screen, with **Call** and **Trigger SOS** always available if something looks wrong.
- Respects the same location-accuracy and battery notes as SOS (section 2); if location is stale or unavailable, the alert says so rather than guessing.

## 7. Data model overview

```
circles               id, name, country, default_paper_size, default_timezone, plan (reserved, unused for now), created_at
profiles              id (auth user), display_name, phone, phone_verified_at, email (optional), photo_path (optional),
                      auth_providers (phone|google|apple), locale, timezone, preferred_paper_size
invites               id, circle_id, role, patient_id (nullable), invited_phone, lives_in_home, code_hash, expires_at,
                      status (open|used|expired|revoked), created_by, used_by, used_at
circle_members        circle_id, user_id, role (primary|family|caregiver), is_admin,
                      lives_in_home, relationship, schedule, access_expires_at, status (active|paused|revoked),
                      can_edit_details, can_see_financial, invited_by
patients              id, circle_id, full_name, birthdate, blood_type, household_id, photo_path, photo_updated_at, user_id (nullable), timezone
households           id, circle_id, name, address_info (arrival card, shared by Primaries in the same home), place_id, lat, lng, timezone
patient_access        circle_id, user_id, patient_id    -- optional: if a member has rows here, they see only those Primaries
patient_labels        user_id, patient_id, label        -- how each viewer refers to a Primary ("Mom", "Mother-in-law")
alert_contacts        (see section 6.1)
sos_events            id, circle_id, patient_id, triggered_by, status, lat, lng, created_at, resolved_at, note
sos_event_log         id, sos_event_id, contact_id, channel (push|sms|call), status, timestamp
conditions            patient_id, name, notes
allergies             patient_id, name, severity, reaction
medications           patient_id, name, dose, form, frequency, reminder_times, days_supply, start_date, schedule,
                      prescribed_by_doctor_id, source (typed|scan), notes, refill_date, needs_confirmation, last_edited_by,
                      generic_name, brand_name, catalog_id (nullable), with_food (before|while|after|any), taken_for (optional),
                      pills_left, refill_alert_days, pill_shape (key from the shape list, section 8E), pill_color (key from the colour list), pill_color2, pill_photo_path,
                      frequency (once|twice|three|four|as_needed|custom), reminder_times (list of local times), is_important,
                      missed_after_min (default 30), notify_caregiver_on_missed (default true), designated_caregiver_user_id (nullable)
drug_catalog          id, generic_name, brand_names[], strengths[], forms[], source, source_version, updated_at   -- global suggestion list, read-only to users
medication_logs       medication_id, taken_at, status (taken|skipped|missed), logged_by
doctors               id, patient_id, name, specialty (general_practitioner|cardiologist|endocrinologist|nephrologist|ophthalmologist|pulmonologist|neurologist|geriatrician|orthopedic|other),
                      specialty_other, clinic_name, place_id, address, lat, lng, phone, clinic_schedule, notes, is_main_doctor, added_by
insurance_cards       patient_id, provider (Maxicare, PhilHealth, senior ID, etc.), number, card_front, card_back, notes
documents             id, patient_id, type (prescription|imaging|discharge|id|insurance|other), title, date, file_path, uploaded_by
lab_results           id, patient_id, title, date, lab_name, file_path, values (optional), uploaded_by   -- writes follow permission matrix (5.2)
appointments          id, patient_id, doctor_id (nullable), type (doctor|lab|procedure), title, start_utc, location, place_id, lat, lng, timezone, prep_notes,
                      accompanied_by, created_by                                                        -- writes follow permission matrix (5.2)
appointment_requests  id, appointment_id (nullable), requested_by, details, status (open|done)
ocr_jobs              id, circle_id, document_id, status (queued|processing|needs_review|confirmed|failed), provider,
                      raw_text, extracted_json, confidence, reviewed_by, reviewed_at
monitoring_schedules  id, patient_id, type (bp|glucose|spo2), days, times, glucose_context, prep_note, notify_user_ids,
                      repeat_after_min, escalate_after_min, active, set_by
vitals_readings       id, patient_id, type (bp|glucose|spo2|pulse|weight|temp), systolic, diastolic, pulse, spo2_pct,
                      glucose_mg_dl (canonical), context (fasting|before_meal|after_meal|bedtime|random),
                      measured_at, logged_by, source (manual|bluetooth|ocr), note
target_ranges         patient_id, metric, low, high, urgent_low, urgent_high, set_by, source_note
notification_prefs    user_id, circle_id (nullable), patient_id (nullable), category, push_enabled, quiet_hours
push_tokens           user_id, platform (android|ios|watchos|wearos), token, last_seen
app_config            min_supported_version_android, min_supported_version_ios, latest_version, update_message
audit_log             id, circle_id, user_id, action, table_name, row_id, old_value, new_value, timestamp
consents              id, circle_id, user_id, consent_type, granted_at
notes                  id, circle_id, patient_id, author_id, note_type (care_note|handover), text,
                      tags (optional, handover only: e.g. meds_given, vitals_taken, supplies_low), created_at, deleted_at (nullable)
geofences              id, circle_id, patient_id (nullable = every Primary in the circle), name, place_id, lat, lng, radius_m,
                      active, grace_period_sec (default 120), notify_user_ids, created_by
geofence_events        id, geofence_id, patient_id, event (left|entered), lat, lng, created_at
```
All tables: RLS by `circle_id` and role. `lab_results` and `appointments` writes follow the permission matrix (5.2); deletes are allowed only for `is_admin` members.

## 8. Notifications and automatic updates

### 8.1 Push notifications for care events
Delivered to Android and iPhone through the same Edge Function. Each user controls categories in `notification_prefs`. Notifications from every circle arrive in one inbox, and **every notification names the Primary it is about** (name and photo, for example "Dad: BP reading missed"). Users can mute non-emergency categories **per circle or per Primary**. SOS can never be muted.

| Event | Who is notified |
|---|---|
| SOS (always on, overrides quiet hours if allowed) | Per alert contact rules |
| New lab result uploaded | Everyone with access |
| Appointment created, changed, or cancelled | Everyone with access |
| Appointment reminders (1 day before, 2 hours before) | Primary, Admin, accompanying person, and anyone who opts in |
| Lab result or appointment edited | Everyone with access |
| Missed medication (section 8F) | The Primary (follow-up), the designated or on-duty Caregiver, then Admin; Family if no one answers |
| Missed daily check-in | Admin and Caregivers |
| BP or blood sugar reminder due | Primary and the people chosen on that schedule |
| BP or blood sugar reading missed (after the repeat interval) | Designated caregiver, then Admin |
| Reading outside the doctor's target range | Admin and the people chosen on that schedule |
| OCR scan ready for review | The person who scanned it |
| Medication change awaiting confirmation | Admin |
| Member joined, role changed, or caregiver access revoked | Admin |
| Appointment request or note | Admin |
| Primary left the safe zone (section 6.8) | The people chosen on that geofence |
| Primary returned to the safe zone | Same people, lower priority |
| Weekly summary ready (section 8.3) | Admin and anyone who opts in |

### 8.2 Automatic app updates
1. **Over-the-air updates with EAS Update.** JavaScript and asset changes reach every phone automatically on the next app launch, on both platforms, with no store review. Use separate channels: `development`, `staging`, `production`.
2. **Staged rollout and rollback.** Release to a small group (Admin's phone) first, then everyone. Keep the ability to roll back a bad update.
3. **Native changes** (new permissions, widgets, notification entitlements, SDK upgrades) require a new store build. Use a `runtimeVersion` policy so an OTA update is only delivered to compatible installed builds.
4. **In-app update prompt and forced-update gate.** On launch, compare the installed version with `app_config`. Below `min_supported_version`, block the app with a clear "Please update" screen and a Play Store / App Store link. Use Android's in-app update API where available. Never allow an outdated build to run the SOS flow.
5. **Never apply an update mid-emergency.** Updates download in the background and apply only on next launch, and never while an `sos_event` is active.
6. **Safety gate for SOS code.** Any update touching SOS, escalation, widgets, or push must pass the real-device test checklist on the `staging` channel before it goes to `production`.
7. Encourage users to enable automatic app updates in Google Play and the App Store. The Setup Checklist shows this as a recommended step.

### 8.3 Weekly summary digest

- A scheduled Edge Function builds a **once-a-week digest per Primary**: medication adherence %, missed doses, missed vitals readings, upcoming appointments, and any SOS or geofence events from the past 7 days.
- Sent as a push notification (opens the full summary in-app) and, for anyone who adds an email in settings, the same summary by email. Both are opt-in per person per Primary, through `notification_prefs` (category `weekly_summary`), default on for Admin and off for everyone else.
- Day and time are configurable by Admin (default Sunday 6:00 PM, Primary's local time).
- Numbers only, never advice: it reports what happened, not what to do about it. The same "Follow your doctor's instructions" rule applies as everywhere else in the app.
- Shares the same print-safe layout as the other printable reports (section 9), so a digest can be saved as a PDF too.

## 8A. Scan and OCR (prescriptions and medical records)

**Goal:** photograph or import a document, the app reads it, the user reviews it, and it is saved, searchable, and structured. This must make uploading fast for Family members.

### Two ways to add a prescription
The Medicines screen has two equal buttons: **Scan prescription** (camera and OCR, below) and **Add prescription** (typed entry, for when the paper is hard to read, the doctor sent the details by text, or scanning is not convenient).

**Add prescription** is a guided, one-question-per-screen flow (section 8E) with auto-suggest from a medicine list. It collects: medicine name (generic and/or brand, with suggestions from the drug-name list), strength as written on the label, form (tablet, capsule, liquid, injection, other), how often (once, twice, three times a day, as needed, other), reminder times, number of days or quantity, start date, **prescribed by** (pick from the Doctors list, or add a doctor), notes, and an optional photo of the paper.

The typed path follows the same safety rules as OCR: the app gives no dosing advice, a medication saved by a non-Admin is flagged `needs_confirmation` for the Admin, and every entry goes to the audit log. A scan can be corrected with **Edit**, which opens the same form pre-filled. Both paths set `medications.source` (`typed` or `scan`).

### Flow (scan)
1. **Capture:** in-app scanner with edge detection, perspective correction, multi-page support, and lighting tips. Also import a photo or PDF from the gallery or Files, and **receive files shared from email, Viber, and Messenger** through the system share sheet (lab results often arrive this way).
2. **Recognize:** extract the text.
3. **Classify:** prescription, lab result, appointment slip or referral, discharge summary, imaging report, insurance or ID card, or other. The user can change the type.
4. **Extract draft fields** (below).
5. **Review screen:** original image next to the extracted fields, low-confidence fields highlighted, everything editable. **Nothing is saved to medications, lab results, or appointments until the user confirms.**
6. **Save:** keep the original file, index the extracted text for search, and record the scan in the audit log.
7. **Follow-up prompts:** Rx → "Add these to Medications and set reminders?"; appointment slip → "Create this appointment?"; lab result → show values in the lab list.

### Fields to extract
| Document | Fields |
|---|---|
| Prescription | Patient name, date, prescriber, drug (generic and brand), strength, form, frequency, duration, quantity, instructions |
| Lab result | Lab name, date, test names, values, units, reference ranges, high/low flags |
| Appointment slip or referral | Doctor, clinic, date, time, instructions |
| Discharge summary | Admission and discharge dates, diagnoses, medications, follow-up instructions |

### Engine
- Build behind an `OcrProvider` interface, run in an Edge Function or worker, so the provider can be swapped.
- **Recommended hybrid:** on-device recognition first (Google ML Kit on Android, Apple Vision on iPhone) for printed text, which is private, fast, and works offline. Use a cloud vision or document-AI service for handwriting, complex lab tables, or low-confidence results, **only with the user's consent**.
- Languages: English and Filipino printed text. Handwriting is best-effort.
- Offline: queue captures and process them when a connection returns.
- Store results in `ocr_jobs`. Users can re-run OCR on any saved document.

### Safety and privacy
- **OCR output is a draft, never a fact.** Handwritten prescriptions are often misread, so the app never auto-saves or auto-schedules from OCR.
- Check extracted drug names against a drug-name list (generic and Philippine brand names). Names that don't match are flagged for review. The app gives no dosing advice.
- Cloud OCR requires explicit consent recorded in `consents`, encrypted transport, and a provider agreement that prohibits training on the data and limits retention. Prefer settings with no retention.
- Show a clear notice on the first cloud scan explaining what is sent.

## 8B. BP and blood sugar monitoring reminders

### Schedules (`monitoring_schedules`)
- Separate schedules for **blood pressure**, **blood sugar**, and **oxygen and pulse** (SpO2 and heart rate), each with days of the week and times, and for sugar a **context** (fasting, before meal, after meal, bedtime, random).
- **Presets are only starting points** (for example BP morning and evening; sugar fasting, after meals, and bedtime). Always say "follow your doctor's instructions" and let users edit freely.
- Admin and Family can create and edit schedules (Caregiver by toggle). Choose who is reminded: the Primary plus any caregiver or family member (for example the live-in caregiver).
- Reminders run on the **Primary's local time**, and other users see times labeled with their own time zone.
- Reliability: server-scheduled push **and** local scheduled notifications on the device as a backup, on both platforms, so a reminder still fires without data.

### Before you measure: "Get ready" checklist
Tapping a reminder first opens a short checklist. Each item is tapped to tick it, and **I'm ready** (or Skip) is always available, so the checklist never blocks an urgent reading. The tips are general, live in the translation files, and are not a substitute for the doctor's instructions.

| Reading | Reminders |
|---|---|
| **Blood pressure** | Sit quietly for 5 minutes. Back supported, feet flat on the floor, legs uncrossed. Rest the bare arm on a table with the cuff at heart level. No coffee, cigarettes, or exercise in the last 30 minutes. Empty the bladder first, and do not talk while measuring. |
| **Blood sugar** | Wash hands with soap and warm water and dry them well. Check that the test strip has not expired. Use the side of the fingertip. For a fasting reading, no food or sweet drinks for the time the doctor set (water is fine). Choose the right label: fasting, before meal, after meal, or bedtime. |
| **Oxygen and pulse** | Rest and sit for 5 minutes. Keep the hand warm, still, and resting at heart level. Remove nail polish or artificial nails from the finger used. Wait until the number on the device is steady before reading it. |

- Every checklist ends with: "These are general reminders. Follow your doctor's instructions if they differ."
- Admin and Family can add a **custom note** per schedule (for example a doctor's instruction), shown at the top of the checklist (`monitoring_schedules.prep_note`).
- The app never diagnoses, and never calls a reading "normal" unless the doctor's target range has been entered.

### When a reminder fires
- After the checklist, it opens a **large-number quick-entry screen**: BP (systolic, diastolic, pulse), glucose (value and context), or oxygen (SpO2 %) and pulse (bpm). Large keypad, minimal fields, built for Primary Mode.
- Options: **Snooze** (up to 2 times), or **Skip with a reason** ("monitor not working", "not feeling well", "will do later").
- If no reading is logged: repeat after 30 minutes (configurable), then notify the designated caregiver and Admin once after 60 minutes (configurable). A missed reading is logged.

### Readings (`vitals_readings`)
- Anyone with access can log a reading, and it records who logged it and how (manual now, Bluetooth later).
- **Units:** store glucose in mg/dL, display in mg/dL or mmol/L per user setting (divide mg/dL by 18 for mmol/L). The Philippines typically uses mg/dL and Canada mmol/L, so the brother and Mom may see different units. BP is in mmHg, oxygen (SpO2) in percent, and pulse in beats per minute (bpm).
- **Target ranges** (`target_ranges`) are entered by Admin or Family from the doctor's orders. Until set, show "Add your doctor's target ranges". The app **does not diagnose**.
- Readings outside the range are flagged with icon, word, and color, and notify the people on that schedule.
- **Oxygen and pulse** follow the same rules: the doctor's ranges are entered by Admin or Family, a reading outside them is flagged with icon, word, and color and notifies the people on that schedule, and the urgent-help buttons below are shown. Readings are typed in now; a Bluetooth pulse oximeter is a Phase 4 sync.
- For optional **urgent thresholds**, show: "Follow your doctor's advice. If there are symptoms, call emergency services." with one-tap **Call doctor**, **Call 911**, and **Trigger SOS**.

### Views and reports
- Trend charts (7, 30, and 90 days), morning vs evening averages, and **adherence** (percent of scheduled readings logged).
- Printable **BP and blood sugar log** in all standard paper sizes (section 9) for doctor visits.
- Optional reminder to restock test strips and lancets.
- Phase 4: sync from Bluetooth BP monitors and glucometers through Health Connect (Android) and HealthKit (iPhone).

## 8C. Doctors and specializations

- A **Doctors list** per Primary (Health file, Doctors tab). Anyone who can edit details (Primary, Family, Admin; Caregiver by toggle) can add, edit, or remove a doctor.
- **Add a doctor** form: name, **specialization**, clinic or hospital, location (Google Maps search, section 8D), phone, clinic schedule (days and hours), notes, and "make this the main doctor".
- **Specialization** is a pick-list so it stays consistent and searchable: General practitioner, Cardiologist, Endocrinologist, Nephrologist, Ophthalmologist, Pulmonologist, Neurologist, Geriatrician, Orthopedic surgeon, and **Other** (free text). The Admin can add more to the circle's list.
- Each doctor card shows the specialization, clinic, a **Call** button, and a **Directions in Google Maps** button.
- Doctors link to appointments (`doctor_id`), prescriptions (`prescribed_by_doctor_id`), and the printed doctor-visit summary. Choosing a doctor for an appointment fills in the clinic location and phone automatically.
- The **main doctor** is shown first and appears on the emergency card.

## 8D. Google Maps (locations)

Locations use **Google Maps** everywhere, so addresses look familiar and directions work on both platforms.

| Where | What it does |
|---|---|
| Doctors, clinics, labs, hospitals | Search the place with **Places Autocomplete**, then save `place_id`, address, and coordinates. |
| Appointments | Show the place on a map. **Directions in Google Maps** opens the Google Maps app (or the browser) with the destination filled in. |
| Arrival Info Card and household address | Pick the home address and **drop a pin** (important in subdivisions where street search is unreliable). The pin is saved with the card and shown to responders and guards. |
| SOS responder screen | Map with the Primary's live location, a route from the responder, and **Directions in Google Maps**. |
| Live-location web link | A map page that opens in any browser with no login. |
| Preferred hospital | A saved place with a one-tap Directions button. |

Implementation notes:
- **Google Maps Platform** project with billing enabled. Check current pricing and free usage before launch. APIs: Maps SDK for Android, Maps SDK for iOS, Places API (New), and Maps JavaScript API for the live-location web link.
- **API keys:** one per platform, each **restricted** (Android package name and signing certificate, iOS bundle ID, web referrer) and limited to the APIs needed. Never commit keys; use EAS secrets and environment variables. Call Places from an Edge Function where possible so that key stays server-side.
- **Directions** use universal links, which open the Google Maps app if installed and the browser otherwise: `https://www.google.com/maps/dir/?api=1&destination=<lat,lng>&destination_place_id=<place_id>`. **Search** links: `https://www.google.com/maps/search/?api=1&query=<text>&query_place_id=<place_id>`.
- Follow Google's attribution rules (keep the Google logo and copyright on maps) and cache only what the terms allow. Store `place_id` and coordinates, and refresh place details periodically.
- **Privacy:** addresses and live location are shown on Google maps. Mention Google Maps in the Privacy Notice and send only what is needed.
- **Fallback:** if Maps fails or there is no data, show the plain address and coordinates as text with a copy button, plus a tap-to-call link.

## 8E. Guided add-medicine flow, auto-suggest, and pill look

Designed in the sample screens (boards "Add medicine 1 to 6" and "Medicine list"). One question per screen, large text, a progress bar, Back always available.

| Step | Screen | Notes |
|---|---|---|
| 1 | **Find the medicine** | Search box with suggestions as the user types, matching **generic and brand names** (typing "Norvasc" suggests Amlodipine). "Use what I typed" is always offered, so a missing medicine never blocks. |
| 2 | **Brand** | Brands for the chosen generic, plus Other brand, Generic (no brand), and Keep as generic. Skippable. |
| 3 | **Form and strength** | List such as "5 mg tablet", with Other for what the label says. Never suggests a dose. |
| 4 | **When is it taken** | How often: once, twice, 3 times, **4 times a day**, as needed, or custom. Choosing one fills sensible default times (for example 4 times a day: 6:00 AM, 12:00 PM, 6:00 PM, 10:00 PM). Times can be removed, and **Custom time** opens a large time picker (hour, minutes in 5-minute steps, AM/PM) to add any other time. Then prescribed by (from the Doctors list). |
| 5 | **Food and pills left** | Before, while, or after eating, or doesn't matter. Pills left with big plus and minus buttons. |
| 6 | **Pill look** | Colour, shape, live preview (below). |

**Medicine list (auto-suggest data)**
- A `drug_catalog` table, read-only for users, loaded by an admin script and searched by prefix and by brand. Suggestions are fast, work offline from a cached copy, and rank what this circle has used before first.
- **Ask before choosing the source** (working agreement, section 13). Candidates to evaluate: the Philippine FDA registered-drug list and the Philippine National Formulary for local brand names, plus an international generic-name list such as RxNorm for coverage. Check each source's licence and refresh terms before use, and record `source` and `source_version`.
- The catalogue only suggests spelling. It must never display dosing advice, interactions, or "recommended" doses. Free text is always allowed, and names not in the list are flagged for review.
- Strengths and forms in suggestions are a convenience. The user confirms them against the label or prescription.
- Non-Admin saves set `needs_confirmation`, same as section 5.2.

**Pill look (identification)**
- **Two swipe sliders** (a horizontal row, easy to scrub with one finger), with a live preview above them:
  - **Colour slider:** about 23 colours (white, cream, yellow, gold, orange, peach, pink, rose, red, maroon, purple, lavender, blue, sky blue, teal, green, lime, olive, brown, tan, grey, black, clear). The colour name is always shown.
  - **Shape slider:** about 23 shapes in groups. **Tablets:** round, scored round, oval, caplet, square, diamond, triangle, hexagon, octagon, half-moon. **Capsules:** capsule, two-tone capsule, softgel. **Liquids:** syrup bottle, dropper bottle, spray bottle. **Injection:** syringe, pen injector, vial. **Topical and other:** ointment tube, cream jar, powder sachet, inhaler, patch. The list lives in a config file so more can be added without a new build.
  - **Two-tone capsule:** choosing it adds a second slider, so the **left** and **right** halves are set independently (`pill_color` and `pill_color2`). The preview and the shape tile show both colours, and the name reads for example "Two-tone capsule, white and blue".
  - Optional photo of the pill, kept in the private bucket.
- The look appears on the Medicines list, "My Day", reminder notifications, the Android and iPhone widgets, and printed medication lists (printed in black and white it falls back to the shape and name).
- **Never colour alone** (section 4, rule 5): the shape and its name ("Round, white") always appear beside the colour.
- Helps a helper or a forgetful moment tell two white tablets apart. It is a memory aid, not a way to identify an unknown pill, and the label is the authority.

**Pills left and refills**
- `pills_left` counts down as doses are logged as taken. When it falls below `refill_alert_days` of supply, show "Refill soon" with icon and word and notify Admin and Family.
- Pills left can be corrected by hand at any time.

**Platform notes:** the whole flow is shared React Native code, identical on Android and iPhone. The catalogue is cached with SQLite or MMKV on both. Nothing here needs a platform-specific feature.

## 8F. Reminders and the missed-medicine alert

Designed in the sample screens (boards "Reminders on the lock screen", "Medicine reminder", "Missed medicine", and "Missed medicine: caregiver alert"). Every reminder **names the Primary** (name and photo) and shows times in the Primary's local time.

| Reminder | When | What the notification offers |
|---|---|---|
| **Take medicine** | At each reminder time | I took it, Remind me in 10 min, Skip. Opens a large full-screen reminder with the pill look (section 8E), name, food note, and pills left. **When more than one medicine is due at the same time** it is one grouped notification ("2 medicines to take") with **Take all**, Review, and Remind me; the full-screen list shows each medicine with its own **Took it** button and a big **Take all (N)** button that counts only what is left. Each dose is still logged separately in `medication_logs`, with one timestamp and who tapped. |
| **Check vitals** | At each schedule time (section 8B) | Get ready (opens the checklist pop-up, then entry), Remind me in 15 min. |
| **Doctor appointment** | 1 day before and 2 hours before | Directions (Google Maps), Call clinic. Shows doctor, specialization, place, and the time labelled with the place's time zone. |
| **Lab appointment** | 1 day before and 2 hours before | Directions, See prep (for example fasting). |
| **Missed medicine** | After the grace period (below) | To the Primary: I took it now (**Take all now** when several), I skipped it (**Skip all**), Call. To the caregiver: see below. Several missed doses from one time slot are grouped into one alert. |

**Missed-medicine escalation (all values configurable per medicine by Admin and Family)**
1. **Due time:** push reminder to the Primary (and a local scheduled notification as backup if there is no data).
2. **+15 minutes:** one repeat reminder if there is no answer.
3. **+30 minutes (`missed_after_min`):** the dose is logged as `missed`. The Primary gets a "You missed your 8:00 AM medicine" screen, and the **designated caregiver** (or the live-in caregiver, then any caregiver on duty by schedule) and the **Admin** get a **high-priority alert**.
4. **Caregiver actions:** Call Mom, I gave it (**I gave all** when several), Mom skipped it (**Mom skipped them**), or "Can't reach her? Start SOS". The first action stops further alerts and is shown to everyone with access, with who and when.
5. **+60 minutes with no action:** alert Family members who opted in. Medicines flagged **important** (`is_important`) use half these times.
- A missed dose is never silently dropped: it stays in the log, in the adherence report, and in the printed medication log.
- The alert wording never tells anyone to take or give an extra or late dose. It says: "Check the label or ask the doctor before giving a late dose. Never double a dose."
- Channels: **Android** high-importance channel with action buttons; **iPhone** Time Sensitive notification with action buttons. Critical Alerts stay reserved for SOS. If the caregiver has no data, send an SMS.
- Quiet hours apply to ordinary reminders, but a missed-medicine alert for an **important** medicine can override them if the Admin allows it per person.
- `notification_prefs` has a category per reminder type so each person can mute what they do not need, except SOS, which can never be muted.
- A caregiver who is off duty (by `schedule` or an expired access date) is skipped, and the next person is alerted.

## 8G. Care notes and caregiver handovers

Two related but distinct kinds of free-text update, shown together in one feed (also surfaced on the Dashboard home screen) but tagged differently so they're easy to tell apart.

| | Care note | Caregiver handover |
|---|---|---|
| **Who writes it** | Primary, Family, Caregiver, or Admin (anyone with access) | A caregiver ending a shift |
| **What it's for** | An everyday update ("She's a bit tired but enjoyed her walk") | What happened on shift, for whoever is on next |
| **Quick tags** | None | Optional one-tap chips: Gave meds, Took vitals, Ate well / Ate little, Supplies low, Nothing unusual |
| **Shown on** | Dashboard "Latest care updates," health file | Same feed, labeled "Handover," plus a short "last handover" summary on the Dashboard |

- Writing a note never requires the medical-edit permission (section 5.2) — it's lighter weight than editing conditions, medications, or lab results, so a Caregiver without "can edit details" can still leave one.
- Every note **notifies everyone with access** to that Primary, same as a lab result or appointment change, so the circle stays in sync without anyone having to ask "anything I should know?"
- Notes are never used for medical facts that belong elsewhere (allergies, diagnoses, medication changes still go through their own screens with their own confirmation rules). A note mentioning a new symptom or a medication change is a prompt for someone to update the real record, not a substitute for it.
- Only the Admin can delete a note (soft delete, restorable), same as lab results and appointments. Authors can't edit after posting — just add a new note — so the feed stays a simple, honest timeline.
- Printable as part of the doctor-visit summary (section 9), so recent notes can go to a doctor along with the readings.

## 9. Printing and PDF export

### 9.1 What can be printed
Emergency info card, Arrival Info Card, medication list, **BP and blood sugar log**, doctor-visit summary, appointment schedule, lab results list, and individual documents and scans. Users can print only what their role lets them view. Every print and export is written to the audit log.

### 9.2 Standard paper sizes
Use only standard sizes, selectable in the print dialog, with the choice remembered per user.

| Size | Dimensions | Points (for `expo-print`) |
|---|---|---|
| **A4** | 210 × 297 mm | 595 × 842 |
| **Letter** (US/Canada "short bond") | 8.5 × 11 in | 612 × 792 |
| **Legal** | 8.5 × 14 in | 612 × 1008 |
| **Folio / PH "long bond"** | 8.5 × 13 in | 612 × 936 |
| **A5** (compact summaries) | 148 × 210 mm | 420 × 595 |
| **Wallet card (ISO ID-1)**, emergency card only | 85.6 × 54 mm | n/a |

- **Default by region:** Canada and US → Letter; most other countries → A4. For Philippine users, ask on first print, because A4, Letter (short bond), and long bond are all common, then remember the choice. Admin can set a circle default.
- Build print layouts as HTML/CSS with `@page { size: ...; margin: 15mm; }`, render to PDF with `expo-print`, and share or print through the system dialog on both platforms.
- Every printed page carries a header (patient name, document title), a footer ("Printed from Circle Clique on <date> by <user>, page X of Y"), and a **repeating table header** across pages.
- No clipped content: tables wrap, images scale to fit, and rows never split across pages.
- **Test every layout on A4 and Letter** (and Legal and Folio for long documents) in automated visual tests.
- Dates and times print in the viewer's timezone, labeled.

## 10. Design system: Teal and Peach

| Token | Hex | Use |
|---|---|---|
| `primary` | `#0F6B6D` | App bars, main buttons, headings |
| `secondary` | `#5FA8A0` | Icons, chips, dividers. **No white text on it.** |
| `background` | `#FFF4E8` | Screen background |
| `highlight` | `#F7B08A` | Highlight cards (next appointment, next medication). Dark text. |
| `emergency` | `#C94F33` | **SOS and urgent alerts only.** Deepened from #E76F51 for white-text contrast. |
| `text` | `#12302F` | Body text on cream and peach |
| `textOnPrimary` | `#FFFFFF` | Text on primary and emergency |

Accessibility: body text at least 18 sp and respect system font scaling; primary buttons at least 56 dp tall; contrast at least 4.5:1; status always uses icon, word, and color. **Voice commands** for the core Primary Mode actions ("Take medicine," "I'm OK," "Help") using the platform's own speech recognizer (no always-listening wake word, since that needs a background microphone and its own consent), and **hearing-aid Bluetooth streaming** (Android Audio Streaming for Hearing Aids / iPhone Made for iPhone hearing devices) for calls and alert sounds placed through the app. Both are optional, Phase 3, and never replace the on-screen buttons. **Primary Mode:** very few buttons, "My Day" home (today's medications, today's appointments, big SOS, "I'm OK" check-in). **Full Mode:** complete navigation for Family, Caregiver, and Admin.

For printing, provide a **print-safe palette** (teal headings, black text, white background) that stays readable in black and white.

## 11. Device setup checklists (shown in-app, with green checks the Admin can see remotely)

### Android (any brand; Samsung is Circle #1's device)
- Notifications allowed, including full-screen alerts and DND override for the SOS channel
- Location: "Allow all the time", precise
- Battery: Unrestricted; remove from "sleeping" or "optimized" lists (Samsung: "Never auto sleeping apps")
- Brand-specific steps where needed (Xiaomi, Oppo, Vivo, Realme, Infinix have extra auto-start and background limits)
- SOS widget on the home screen
- Recommend turning on the phone's built-in Emergency SOS as a separate backup
- Turn on automatic app updates in Google Play
- Pair a Wear OS watch for SOS from the wrist, if the Primary has one (optional)
- Turn on voice commands and Bluetooth hearing-aid audio streaming, if wanted (optional)

### iPhone
- Notifications allowed; Critical Alerts allowed (once approved); Time Sensitive allowed
- Location: "Always", precise
- Background App Refresh on
- Add the app to Focus-mode allow-lists; set the Primary as an Emergency Bypass contact in Contacts
- SOS widget and Control Center control added
- Turn on automatic app updates in the App Store
- Pair an Apple Watch for SOS from the wrist, if the Primary has one (optional)
- Turn on voice commands and Made-for-iPhone hearing-aid audio streaming, if wanted (optional)

## 12. Build phases

### Phase 0: Setup
- [ ] Accounts: Google Play Developer, Apple Developer, Supabase, Firebase, SMS and voice provider
- [ ] **Apply for iOS Critical Alerts entitlement**
- [ ] Initialize Expo + TypeScript, EAS Build and **EAS Update channels** (`development`, `staging`, `production`), lint, tests
- [ ] Platform abstraction layer (`src/platform/`) and design tokens and i18n structure
- [ ] Supabase schema and RLS for Phase 1 tables, including `circle_members` roles and `is_admin`
- [ ] **Sign-in setup:** phone OTP provider (Supabase phone auth + Twilio Verify or a Philippine provider), SMS sender registration, Google and Apple sign-in configuration
- [ ] **Test OTP delivery** (SMS and voice) to the real phones in Circle #1, including the +1 Canadian number
- [ ] **Google Maps Platform** (section 8D): project, billing, restricted API keys per platform, Places API enabled
- [ ] Decide the Android widget approach (config plugin library vs Jetpack Glance) with a one-screen prototype on the Galaxy A35

### Phase 1: Prove the emergency flow on both platforms
- [ ] **Registration and sign-in (section 5.5):** welcome screen with the two paths, phone verification (SMS and voice), optional Google and Apple sign-in, invites bound to phone numbers, Primary setup flow, consent screens, PIN or biometric lock
- [ ] **Primary photos** (section 4, rule 9): capture or pick, crop, thumbnail, initials fallback, shown beside the Primary's name on every screen and alert
- [ ] Circles, the three user types plus Admin flag, invite creation (link, QR, 6-digit code)
- [ ] **Multiple Primaries and multiple circles per user:** circle/Primary switcher, "Add a person to care for" flow (same home vs separate household), per-circle roles, `households`, `patient_labels`, Admin transfer (sections 5.4 and 6.6)
- [ ] Primary's name, photo, and label on every SOS push, SMS, call, and live link; support simultaneous SOS events across circles
- [ ] Add and revoke **caregivers** (live-in, schedule, access end date)
- [ ] Alert contacts with proximity roles, alert rules, and SMS/call-only contacts
- [ ] Primary profile and Arrival Info Card with a **Google Maps pin** (section 8D)
- [ ] SOS: button, 5-second countdown and cancel, Android widget, iOS widget and control (section 6.7), trigger on Primary's behalf
- [ ] Escalation Edge Function (push, SMS, voice, retries) and live-location web link
- [ ] Responder screen with Google Maps live map and Directions, resolve with note, SOS event log, Test SOS mode
- [ ] Setup Checklists (Android and iPhone)
- [ ] **EAS Update and forced-update gate** working end to end
- [ ] **Real-device tests:** Mom's A35, dad's and cousin's Android phones, brother's iPhone, plus one spare of each OS, with and without mobile data and with the screen locked

### Phase 2: The health file and permissions
- [ ] Medical details with the permission matrix (section 5.2) enforced in RLS
- [ ] **Doctors list with specializations** and Google Maps locations (sections 8C and 8D)
- [ ] Document upload (camera scan, PDF, and share-to-app from email, Viber, Messenger), categories, search
- [ ] **OCR** for prescriptions, lab results, and other records, with the review-and-confirm screen (section 8A)
- [ ] **Add prescription (guided flow)** with auto-suggest, pill look, and pills-left (section 8E), beside Scan prescription, with the same confirmation rules (section 8A)
- [ ] Choose and load the `drug_catalog` source (section 8E)
- [ ] **Lab results** and **appointments**, editable by Primary, Family, and Admin (Caregiver by toggle), with Admin-only delete and restore
- [ ] Appointment requests and notes (for Caregivers without edit rights)
- [ ] Medication-change confirmation flow
- [ ] Push notifications for care events (section 8.1) and per-user preferences
- [ ] Audit log viewer for Admin
- [ ] **Care notes and caregiver handovers** (section 8G): post, feed, Admin-only soft delete
- [ ] **"My People" dashboard** across all circles, optional per-Primary access limits (`patient_access`), and per-circle and per-Primary notification muting

### Phase 3: Daily care and printing
- [ ] Appointment reminders, prep notes, calendar view
- [ ] Medication reminders and logging, **missed-medicine alert to the caregiver** (section 8F), daily "I'm OK" check-in with missed alerts
- [ ] Doctor and lab appointment reminders with Directions (section 8F)
- [ ] **BP, blood sugar, and oxygen and pulse reminder schedules**, the "Get ready" checklist before each reading, quick-entry screen, missed-reading follow-up, target ranges, and basic trend view (section 8B)
- [ ] Rx scan → "Add to Medications and set reminders" prompt
- [ ] **Printing and PDF export** with all standard sizes, and visual tests on A4 and Letter at minimum
- [ ] Emergency wallet card (ISO ID-1) print
- [ ] **Weekly summary digest** (section 8.3): scheduled job, push and optional email
- [ ] **Voice commands and hearing-aid Bluetooth streaming** (section 10) for Primary Mode

### Phase 4: Insight
- [ ] Longer trend charts and adherence reports, Bluetooth sync for BP monitors, glucometers, and pulse oximeters (Health Connect / HealthKit), symptom diary
- [ ] Doctor-visit summary PDF
- [ ] Caregiver notes and tasks, expense tracker
- [ ] **Geofencing ("safe zone") alerts** (section 6.8): draw a zone, leave/return notifications
- [ ] **SOS from a smartwatch** (section 6.7): Apple Watch complication/App Intent and Wear OS tile

### Phase 5: Hardening and rollout to other families
- [ ] Backups and full data export, privacy policy and consent flow
- [ ] Tagalog translation
- [ ] Self-service onboarding for a new circle (create circle, add Primary, invite members)
- [ ] National Privacy Commission compliance review, store-listing preparation for public release
- [ ] Optional: fall detection or smartwatch integration

## 13. Working agreement

- Build one phase at a time, and test on real Android and iPhone devices before starting the next.
- Before writing code for a feature, restate the plan and the files affected.
- Write tests for permissions (RLS) and escalation logic before the UI.
- Any feature must state how it works on **both** Android and iPhone.
- Ask before adding third-party services or changing the stack.
- Small changes, frequent commits.

## 14. Open items

- Guard house phone number and gate instructions
- Whether to name a **backup Admin** (recommended)
- Whether Caregivers should be allowed to edit details by default (currently Off)
- Which OCR approach: on-device only, or hybrid with a cloud service for handwritten prescriptions
- Mom's doctor-set target ranges for BP and blood sugar, and her preferred reminder times
- Which Primaries live together (same circle) and which live separately (own circle): Mom, Dad, and your spouse's parents
- Whether to cap the number of Primaries per account later (the `plan` field is reserved for this)
- Whether to add a Viber or WhatsApp channel for sign-in codes, after testing SMS delivery
- Which medicine list to use for auto-suggest (Philippine FDA list, Philippine National Formulary, RxNorm), and the licence for each
- Who owns the Google Cloud account and billing for Google Maps Platform
- **Telehealth / video visits** (one-tap video call with a doctor, family able to join) was researched alongside the features added in v11, but left out of the spec for now. Revisit if wanted — it would need a video provider (e.g. Twilio Video, Daily, or Agora), its own consent, and a decision on whether it replaces or just links out to the clinic's own telehealth tool.
