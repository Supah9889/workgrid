# WorkGrid — CLAUDE.md

## What This App Is
WorkGrid is a delivery task management app for a small field-service business. Admins create delivery tasks (picking up parts from stores, delivering to customers on behalf of insurance companies). Employees receive tasks on their phones and update status as they complete each step. All clock punches are PIN-protected and geofence-verified.

## Architecture

- **Framework**: React + Vite
- **Backend**: base44 SDK (`base44.entities.*`, `base44.auth.*`)
- **State**: TanStack React Query for server state, React useState for local
- **Routing**: React Router v6 with role-based guards
- **UI**: shadcn/ui components + Tailwind CSS
- **Real-time**: `base44.entities.*.subscribe()` → `queryClient.invalidateQueries()`

## Roles
- `super_admin` — full access, manages everything including geofence and audit log
- `operator` — dashboard, tasks, clock records, audit log, contacts
- `employee` — sees only their own deliveries and contact info

## Key Files
| File | Purpose |
|------|---------|
| `src/App.jsx` | Router, auth guards, onboarding redirect |
| `src/lib/AuthContext.jsx` | Auth state, User entity merge, needsOnboarding flag |
| `src/pages/SuperAdminDashboard.jsx` | Admin task list (dark navy, scrollable cards) |
| `src/pages/MyTasks.jsx` | Employee delivery view + ClockButton |
| `src/pages/Onboarding.jsx` | First-login setup (name + PIN) |
| `src/pages/AuditLog.jsx` | Full punch history with geofence flags |
| `src/pages/GeofenceSettings.jsx` | Set geofence center and radius (super_admin) |
| `src/pages/ContactDirectory.jsx` | Employee contact info for alert routing |
| `src/components/clock/ClockButton.jsx` | PIN-protected punch in/out/lunch with geofence |
| `src/components/clock/PinModal.jsx` | Full-screen PIN entry overlay (4-dot display + numpad) |
| `src/components/clock/DailyLog.jsx` | Clock record table for ClockRecords page |
| `src/components/clock/LiveStatusList.jsx` | Live employee clock status for admins |
| `src/components/tasks/CreateTaskDialog.jsx` | Create delivery task (div/onClick only, no form tags) |
| `src/components/tasks/EditTaskDialog.jsx` | Edit delivery task |
| `src/components/tasks/TaskBadges.jsx` | PriorityBadge + StatusBadge |
| `src/components/layout/Sidebar.jsx` | Role-based navigation sidebar |
| `base44/entities/Task.jsonc` | Task schema |
| `base44/entities/User.jsonc` | User schema |
| `base44/entities/ClockRecord.jsonc` | Clock record schema |
| `base44/entities/AppSettings.jsonc` | Singleton app config (geofence settings) |

## Task Entity Fields
| Field | Type | Description |
|-------|------|-------------|
| `title` | string (required) | What the delivery is |
| `part_description` | string | e.g. "42in deck belt - Husqvarna YTH24V48" |
| `assigned_to` | string | Employee email |
| `assigned_to_name` | string | Employee display name |
| `delivery_address` | string | Full address |
| `store_name` | string | Where to pick up from |
| `requested_by` | string | Insurance company name |
| `scheduled_time` | string (datetime) | When |
| `notes` | string | Admin notes visible to employee |
| `status` | enum | pending → picked_up → en_route → delivered |
| `priority` | enum | low / medium / high |
| `reassignment_log` | array | History of assignment changes |

## User Entity Fields
| Field | Type | Description |
|-------|------|-------------|
| `role` | enum | super_admin / operator / employee |
| `status` | enum | active / inactive |
| `full_name` | string | Set during onboarding |
| `pin_hash` | string | SHA-256 of 4-digit PIN (set in onboarding, used by PinModal) |
| `has_onboarded` | boolean | false until onboarding complete |
| `contact_phone` | string | Phone for alert notifications |
| `contact_email` | string | Email for alert notifications |
| `profile_photo` | string | URL |
| `phone` | string | Legacy field |

## ClockRecord Entity Fields
| Field | Type | Description |
|-------|------|-------------|
| `employee_email` | string (required) | Employee email |
| `employee_name` | string | Display name |
| `date` | string (date, required) | YYYY-MM-DD |
| `punch_in_time` | datetime | When they punched in |
| `punch_in_lat` | number | GPS latitude at punch in |
| `punch_in_lng` | number | GPS longitude at punch in |
| `punch_in_in_bounds` | boolean | Whether within geofence at punch in |
| `lunch_start` | datetime | When lunch started |
| `lunch_end` | datetime | When lunch ended |
| `punch_out_time` | datetime | When they punched out |
| `punch_out_lat` | number | GPS latitude at punch out |
| `punch_out_lng` | number | GPS longitude at punch out |
| `punch_out_in_bounds` | boolean | Whether within geofence at punch out |
| `total_hours` | number | Hours worked (lunch deducted) |
| `total_lunch_minutes` | number | Lunch duration in minutes |
| `flagged` | boolean | True if any punch was out of geofence bounds |
| `open_flag` | boolean | Never punched out at EOD |
| `manually_closed` | boolean | Admin force-closed this record |

## AppSettings Entity Fields
| Field | Type | Description |
|-------|------|-------------|
| `geofence_enabled` | boolean | Whether geofencing is active |
| `geofence_lat` | number | Geofence center latitude |
| `geofence_lng` | number | Geofence center longitude |
| `geofence_radius` | number | Acceptable radius in miles (default 0.5) |

## Auth + Onboarding Flow
1. `AuthContext.checkUserAuth()` calls `base44.auth.me()` then `base44.entities.User.filter({ email })`
2. Merges platform auth data with User entity (entity fields win on spread)
3. If `!user.has_onboarded`, sets `needsOnboarding = true`
4. `App.jsx` redirects to `/onboarding` if `needsOnboarding && location.pathname !== '/onboarding'`
5. Onboarding saves `full_name`, `pin_hash` (SHA-256), `has_onboarded: true` to User entity
6. Calls `checkUserAuth()` to refresh context, then navigates to `/`

## Clock + PIN + Geofence Flow
1. Employee taps Punch In / Start Lunch / End Lunch / Punch Out
2. `PinModal` opens (full-screen overlay, 4-dot display + numpad)
3. Auto-submits at 4 digits: SHA-256(entered) compared to `user.pin_hash`
4. Wrong PIN: red dots, "Incorrect PIN", clears after 1.5s
5. Correct PIN: capture GPS via `navigator.geolocation`
6. For punch_in / punch_out: check distance against AppSettings geofence
7. If out of bounds: set `flagged = true` on ClockRecord, create Notification for all admins/operators
8. Punch state machine: not_clocked_in → clocked_in → on_lunch → clocked_in → punched_out
9. Live elapsed timer shown when clocked in; lunch timer shown when on lunch

## Design System
- Dark navy background: `bg-[#0f172a]` (dashboard/employee pages)
- Card surface: `bg-slate-800/60`, border: `border-slate-700`
- Unassigned task highlight: `border-orange-500/50 bg-orange-500/10`
- Floating action button: `bg-blue-600`, bottom-right, `z-50`
- Text hierarchy: `text-white` → `text-slate-200` → `text-slate-400` → `text-slate-500`
- Clock status: green = clocked in, yellow = on lunch, grey = not clocked in
- Flagged records: `bg-red-50` highlight in tables

## Sprint History

### Sprint 1 ✅ (2026-04-22)
- Replaced generic task fields with delivery-specific fields
- Changed status enum: pending/in_progress/complete → pending/picked_up/en_route/delivered
- Rebuilt SuperAdminDashboard as dark navy scrollable task list with expandable cards and floating + button
- Rebuilt CreateTaskDialog with delivery fields, no HTML form tags
- Created Onboarding.jsx with PIN setup (SHA-256 hash)
- Added needsOnboarding to AuthContext; App.jsx redirects before role-based routing
- Rebuilt MyTasks.jsx with delivery card layout

### Sprint 2 ✅ (2026-04-22)
- **PIN clock**: ClockButton rebuilt with PinModal (4-dot display + numpad), PIN verified via SHA-256 against user.pin_hash
- **Three punch states**: Punch In / Start Lunch / End Lunch / Punch Out with green/yellow/grey status indicator and live elapsed timer
- **Geofencing**: Haversine distance check against AppSettings geofence center; out-of-bounds punches flagged and admins notified via Notification entity
- **ClockRecord schema**: New fields — punch_in_time, punch_in_lat/lng, punch_in_in_bounds, lunch_start/end, punch_out_time, punch_out_lat/lng, punch_out_in_bounds, total_hours, total_lunch_minutes, flagged
- **User schema**: Added contact_phone, contact_email
- **AppSettings entity**: Singleton config for geofence_enabled, geofence_lat, geofence_lng, geofence_radius
- **AuditLog page**: Full punch history, expandable rows with GPS coords and in-bounds status, red highlights for flagged, filters by employee/date/flagged
- **GeofenceSettings page**: Enable toggle, lat/lng inputs, "use current location", radius slider (0.1–5 mi), preview, saves to AppSettings
- **ContactDirectory page**: Admin sees all, employee sees self; edit contact_phone and contact_email; alert routing note
- **Sidebar**: Added Audit Log, Geofence, Contacts to super_admin nav; Audit Log + Contacts to operator nav; Contacts to employee nav
- **DailyLog + LiveStatusList + ClockRecords**: Updated to use new punch_in_time/punch_out_time field names; lunch state shown in LiveStatusList
