# WorkGrid — CLAUDE.md

## What This App Is
WorkGrid is a delivery task management app for a small field-service business. Admins create delivery tasks (picking up parts from stores, delivering to customers on behalf of insurance companies). Employees receive tasks on their phones and update status as they complete each step.

## Architecture

- **Framework**: React + Vite
- **Backend**: base44 SDK (`base44.entities.*`, `base44.auth.*`)
- **State**: TanStack React Query for server state, React useState for local
- **Routing**: React Router v6 with role-based guards
- **UI**: shadcn/ui components + Tailwind CSS
- **Real-time**: `base44.entities.*.subscribe()` → `queryClient.invalidateQueries()`

## Roles
- `super_admin` — full access, manages everything
- `operator` — same dashboard access as super_admin
- `employee` — sees only their own assigned deliveries at /my-tasks

## Key Files
| File | Purpose |
|------|---------|
| `src/App.jsx` | Router, auth guards, onboarding redirect |
| `src/lib/AuthContext.jsx` | Auth state, User entity merge, needsOnboarding flag |
| `src/pages/SuperAdminDashboard.jsx` | Admin task list (dark navy, scrollable cards) |
| `src/pages/MyTasks.jsx` | Employee delivery view |
| `src/pages/Onboarding.jsx` | First-login setup (name + PIN) |
| `src/components/tasks/CreateTaskDialog.jsx` | Create delivery task (div/onClick only, no form tags) |
| `src/components/tasks/EditTaskDialog.jsx` | Edit delivery task |
| `src/components/tasks/TaskBadges.jsx` | PriorityBadge + StatusBadge |
| `base44/entities/Task.jsonc` | Task schema |
| `base44/entities/User.jsonc` | User schema |

## Task Entity Fields (Sprint 1)
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

## User Entity Fields (Sprint 1)
| Field | Type | Description |
|-------|------|-------------|
| `role` | enum | super_admin / operator / employee |
| `status` | enum | active / inactive |
| `full_name` | string | Set during onboarding |
| `pin_hash` | string | SHA-256 of 4-digit PIN |
| `has_onboarded` | boolean | false until onboarding complete |
| `profile_photo` | string | URL |
| `phone` | string | Phone number |

## Auth + Onboarding Flow
1. `AuthContext.checkUserAuth()` calls `base44.auth.me()` then `base44.entities.User.filter({ email })`
2. Merges platform auth data with User entity (entity fields win on spread)
3. If `!user.has_onboarded`, sets `needsOnboarding = true`
4. `App.jsx` redirects to `/onboarding` if `needsOnboarding && location.pathname !== '/onboarding'`
5. Onboarding saves `full_name`, `pin_hash` (SHA-256), `has_onboarded: true` to User entity
6. Calls `checkUserAuth()` to refresh context, then navigates to `/`

## Design System
- Dark navy background: `bg-[#0f172a]` (dashboard/employee pages)
- Card surface: `bg-slate-800/60`, border: `border-slate-700`
- Unassigned task highlight: `border-orange-500/50 bg-orange-500/10`
- Floating action button: `bg-blue-600`, bottom-right, `z-50`
- Text hierarchy: `text-white` → `text-slate-200` → `text-slate-400` → `text-slate-500`

## Sprint History

### Sprint 1 ✅ (2026-04-22)
- Replaced generic task fields with delivery-specific fields (part_description, assigned_to, delivery_address, store_name, requested_by, scheduled_time)
- Changed status enum from pending/in_progress/complete → pending/picked_up/en_route/delivered
- Rebuilt SuperAdminDashboard as dark navy scrollable task list with expandable cards and floating + button
- Rebuilt CreateTaskDialog with delivery fields, no HTML form tags (div + onClick only)
- Updated EditTaskDialog, TaskRow, TasksPanel, TaskBoard, TaskBadges for new fields/statuses
- Created Onboarding.jsx (full-screen dark navy, name + PIN setup, SHA-256 PIN hash, fade transition)
- Added `has_onboarded`, `pin_hash`, `full_name` to User entity
- Added `needsOnboarding` to AuthContext; App.jsx redirects to /onboarding before role-based routing
- Rebuilt MyTasks.jsx with same delivery card layout and pending→picked_up→en_route→delivered flow
