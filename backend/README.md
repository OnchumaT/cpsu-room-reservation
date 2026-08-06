# CPSU Room Reservation — Backend

REST API for the CPSU Room Reservation System. This repo has three
top-level folders:

```
frontend/   the Vite UI — connected to this API (real login, no more demo data)
backend/    <- you are here — the Express API + seed script
database/   Prisma schema + migration history (MySQL)
```

## Stack

- **Express** — HTTP API (this folder)
- **MySQL + Prisma** — schema and migrations live in [`../database`](../database)
- **JWT + bcrypt** — login, password hashing
- **nodemailer + Ethereal** — approval-notice emails (sandboxed, nothing is really delivered — see Email below)

## Data model

10 tables. The department's real approval structure (management positions,
independent of `role`) sits alongside a set of tables deliberately shaped
to match the frontend's existing domain vocabulary (`frontend/src/domain/entities`)
— see the schema file's header comment for why.

| Table | Purpose |
|---|---|
| `users` | `role` is one of `student` / `teacher` / `staff` / `admin` — nothing else. |
| `management_positions` | e.g. "หัวหน้าภาควิชา", "รองหัวหน้าภาควิชา" — each has a `can_approve` flag. |
| `user_management_positions` | Join table: which users hold which positions. A user's `role` and their positions are independent — a `teacher` can hold a `can_approve` position (see the seed data). |
| `rooms` | Bookable rooms — `status` (available/occupied/pending), `floor`, `gradient` (card color) are admin-set display fields, not computed from bookings. |
| `booking_settings` | Single-row table: department-wide `approval_mode` (`auto`/`manual`), who last changed it. |
| `bookings` | The reservation itself, with the requester's `role` denormalized at booking time, plus `participants`/`note`/`participating_teachers` and a bundled `equipment`/`food`/`facility_note` ask. Status machine `pending -> approved/rejected`, or `cancelled`/`expired`. |
| `facility_requests` | One row per booking's facility ask (not per item — `equipment`/`food` are bundled JSON), worked through Staff's queue: `pending -> accepted -> done`. |
| `notifications` | Broadcast per **audience** (`student`/`teacher`/`staff`/`admin`/`approvers`), not per user — matches the frontend's shared role inboxes. `approvers` replaces what the frontend prototype called the `'head'` role. |
| `templates` | Saved booking presets, scoped per-user (see below). |
| `audit_logs` | Append-only trail of who did what (`action`, `details` JSON). |

Full schema: [`../database/schema.prisma`](../database/schema.prisma).

One intentional behavior change from the frontend prototype: **templates
are scoped per-user**, not per-role — the prototype's in-memory version
shared one template pool across every user with the same role, which is
wrong for a real department with several teachers.

## Business rules and where they live

1. **Overlap checking** — `BookingRepository.findConflict()` runs a direct
   SQL query on `(room_id, booking_date, start_time, end_time)` (the
   composite index) rather than fetching every booking for the room and
   filtering in JS. It uses `$queryRaw` with both sides wrapped in
   `TIME(...)`: MySQL compares a `TIME` column against a `DATETIME`-typed
   parameter by converting the `TIME` column to *today's* date first,
   which silently breaks the comparison for any bound value using a
   different reference date (Prisma's `@db.Time` columns are bound as
   epoch-1970-dated values) — this bit us during testing, hence the
   `TIME()` cast and the comment on that method. Verified against a full
   matrix (overlapping/exact/engulfing/adjacent/different-room/different-date).
2. **Auto/manual approval** — `CreateBookingUseCase` reads
   `booking_settings.approval_mode` at creation time and sets the new
   booking's `status`/`approval_type` accordingly. `manual` additionally
   fans out one notification to the `approvers` audience.
3. **RBAC for approve/reject** — `middleware/auth.js#requireCanApprove` is
   a separate gate from `authorize(...roles)`: it queries
   `user_management_positions` for a `can_approve` position, independent
   of the caller's `role`. Mounted on `PATCH /bookings/:id/approve`,
   `/reject`, `GET /bookings/pending`, and `PATCH /settings/approval`.
4. **Facility requests: teacher, or anyone holding a `can_approve`
   position, at booking time** — a head/vice-head still books (and
   requests equipment for) rooms like any other teacher. Enforced three
   times: in `bookings.routes.js` (fail fast, before the conflict-check
   query), inside `CreateBookingUseCase`, and inside `EditBookingUseCase`.
5. **Transactions** — every multi-step write goes through
   `prisma.$transaction(async (tx) => {...})`, with each repository method
   accepting an optional `client` parameter (defaults to the plain
   `prisma` singleton) so the same method works transactionally or not:
   `CreateBookingUseCase` (booking + bundled facility request + fan-out
   notifications + audit log), `ApproveRejectBookingUseCase` (status
   update + owner notification + audit log — the approval email is sent
   **after** commit, best-effort), `EditBookingUseCase`, `CancelBookingUseCase`.
6. **Approval emails** — `EmailService.sendBookingApprovedNotice()` mails
   every `can_approve` holder plus every `staff` user (deduplicated) when
   a booking is approved. See Email below.

## Setup

```bash
cd backend
npm install
cp .env.example .env    # then edit DATABASE_URL / JWT_SECRET
```

Create a database and a dedicated app user (don't use MySQL `root` for the
app itself):

```sql
CREATE DATABASE cpsu_room_reservation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cpsu_app'@'localhost' IDENTIFIED BY 'changeme';
GRANT ALL PRIVILEGES ON cpsu_room_reservation.* TO 'cpsu_app'@'localhost';
```

`prisma migrate dev` additionally needs permission to create a throwaway
*shadow* database to diff against — either grant `CREATE, DROP ON *.*` to
the app user for local dev, or use `prisma migrate deploy` (no shadow db
needed) once you have real migrations checked in.

```bash
npm run prisma:migrate   # creates tables (prompts for a migration name first run)
npm run db:seed          # loads demo positions/users/rooms/bookings
npm run dev               # http://localhost:4000
```

`backend/package.json` points Prisma at `../database/schema.prisma` (via
the `"prisma": { "schema": ... }` config), so every `npx prisma` /
`npm run prisma:*` command is run **from this `backend/` folder** but
reads and writes files in `../database`. The seed script
(`backend/scripts/seed.js`) stays inside `backend/` rather than
`database/` on purpose — it's Node code that needs
`bcryptjs`/`@prisma/client` from `backend/node_modules`, and Node resolves
packages relative to a *file's own location*; `database/` intentionally
has no `node_modules` of its own (it's just schema + migration SQL, not
runnable code). The Prisma Client is generated straight into
`backend/node_modules/.prisma/client` (pinned via `output` in
`schema.prisma`) for the same reason. The seed script also `TRUNCATE`s
tables (not `deleteMany`) so ids restart at 1 on every reseed.

**A note on stray root files:** in this dev environment, running Prisma's
`generate`/`migrate` sometimes drops a throwaway `package.json` /
`package-lock.json` / `node_modules` at the **repo root** (a side effect
of the CLI resolving `../database/schema.prisma`'s custom client `output`
path). It's inert — the real generated client always lands in
`backend/node_modules` — and the root `.gitignore` already excludes it;
`rm -rf` it if you notice it, it regenerates harmlessly.

Every seeded account's password was originally `Passw0rd!` (whatever you
set `SEED_DEFAULT_PASSWORD` to on a fresh reseed), but in this environment
it's been changed to **`123456`** for every account via a direct DB update
— use that instead if a login fails:

| Email | Role | Management position |
|---|---|---|
| `Sirak@su.ac.th` | teacher | หัวหน้าภาควิชา (can approve) |
| `Phuriwat@su.ac.th` | teacher | รองหัวหน้าภาควิชา (can approve) |
| `somchai.w@su.ac.th` | teacher | ประธานหลักสูตร (cannot approve) |
| `vipa.s@su.ac.th`, `sakol.r@su.ac.th` | staff | — |
| `pongthon.m@su.ac.th`, `kamonchok.j@su.ac.th` | student | — |
| `anuwat.d@su.ac.th` | admin | — |

Note `Phuriwat@su.ac.th` and `somchai.w@su.ac.th` are both `role: teacher`
but only one of them can approve bookings — that's the position system
from rule 3 above, deliberately seeded to be visible in testing. Only
`Sirak@su.ac.th` and `Phuriwat@su.ac.th` hold a `can_approve` position —
`anuwat.d@su.ac.th` is a plain `admin` with no management position, kept
distinct on purpose (a system admin isn't automatically an approver, and
vice versa). Student accounts require an `@su.ac.th` email specifically —
`CreateUserUseCase` rejects any other domain for `role: student`.

### Google login

`POST /api/auth/google` verifies a Google Sign-In ID token
(`google-auth-library`) and logs the matching user in. Only
`@silpakorn.edu`/`@su.ac.th` emails are accepted (any other domain is
rejected with `403`, whether it's a new or existing account). If no user
exists with that email yet, one is auto-created with `role: pending` — a
pending user can log in and browse but can't create a booking
(`CreateBookingUseCase` rejects it) until an admin assigns them a real
role via `PATCH /api/users/:id` (the frontend's Users page shows pending
accounts and reuses its existing edit-role modal as the approval step).
Set `GOOGLE_CLIENT_ID` in `.env` to the OAuth Client ID your frontend's
Google Sign-In button uses (same value = the token's `audience`, and must
match the frontend's `VITE_GOOGLE_CLIENT_ID`); without it, this endpoint
returns `503`.

## Email

`EmailService` sends through [Ethereal](https://ethereal.email) — a fake
SMTP sandbox that never delivers real mail but gives every send a preview
URL. Leave `ETHEREAL_USER`/`ETHEREAL_PASS` blank in `.env` and a throwaway
test account is created automatically on first send, logged to the
console; copy those values into `.env` to keep reusing the same inbox
instead of getting a new one every restart. Every send also logs its
preview URL — open it to see the rendered email.

## API

All routes except `/health` and `/api/auth/login` (and `/google`) require
`Authorization: Bearer <token>` (obtained from login).

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` -> `{ user, token }` (user includes `managementPositions`) |
| POST | `/api/auth/google` | `{ idToken }` -> `{ user, token }`; university-email only, auto-creates a `pending` user on first login |
| GET | `/api/auth/me` | current user + management positions held |
| GET | `/api/rooms` | `?q=&status=` |
| GET | `/api/rooms/available` | `?date=&start=&end=` -> rooms with no conflicting pending/approved booking in that range and not statically occupied — powers the booking form's room dropdown |
| GET/POST/PATCH/DELETE | `/api/rooms/:id` | create/update/delete require staff or admin |
| PATCH | `/api/rooms/:id/toggle` | flip available/occupied; staff/admin |
| GET | `/api/dashboard/stats` | live counts (pending/total bookings, rooms available, approved this month, etc.) scoped to the caller — powers the dashboard stat cards |
| GET | `/api/bookings` | `?roomId=&date=&status=&mine=true` |
| GET | `/api/bookings/calendar` | `?start=&end=&room_id=` — every booking in a date range, for calendar views |
| GET | `/api/bookings/my` | current user's own bookings |
| GET | `/api/bookings/pending` | all pending bookings; requires a `can_approve` position |
| GET | `/api/bookings/availability` | `?roomId=&date=` -> booked time ranges for one room (informational, not blocking — see `/api/rooms/available` for the actual dropdown filter) |
| GET | `/api/bookings/:id` | |
| POST | `/api/bookings` | `{ roomId, date, start, end, purpose, participants?, note?, participatingTeachers?, facility? }` — `facility` requires role `teacher` or a `can_approve` position |
| PATCH | `/api/bookings/:id` | edit a pending booking you own; `{ date, start, end, title, note?, facility? }` |
| POST | `/api/bookings/:id/cancel` | owner, staff, or admin only; only from `pending`/`approved` |
| PATCH | `/api/bookings/:id/approve` | requires a `can_approve` management position (not role-gated) |
| PATCH | `/api/bookings/:id/reject` | same gate; body `{ reason }` (required) |
| GET | `/api/facility-requests` | staff/admin only; `?status=` |
| POST | `/api/facility-requests/:id/accept` \| `/done` | staff/admin only |
| GET | `/api/templates` | current user's own saved templates |
| POST | `/api/templates` | `{ name, snapshot }` |
| POST | `/api/templates/:id/apply` \| `/duplicate` | |
| PATCH | `/api/templates/:id` | |
| DELETE | `/api/templates/:id` | |
| GET | `/api/notifications` | current user's role inbox; `?scope=approvers` for the shared approvers inbox (requires `can_approve`) |
| POST | `/api/notifications/:id/action` | `{ action: 'approve'\|'reject'\|'accept'\|'done' }` |
| GET/POST/PATCH | `/api/users` | admin only |
| PATCH | `/api/users/:id/toggle` | admin only — flips `is_active` |
| GET | `/api/settings/approval` | |
| PATCH | `/api/settings/approval` | requires a `can_approve` position; `{ mode: 'auto'\|'manual' }` |
| GET | `/api/management-positions` | list all positions |
| GET | `/api/management-positions/users/:userId` | positions held by a user |
| POST | `/api/management-positions` | admin only — create a position |
| POST | `/api/management-positions/assign` \| `/unassign` | admin only; `{ userId, positionId }` |
| GET | `/api/audit-logs` | admin only; `?userId=&action=` |

Errors are JSON: `{ "error": { "message": "...", "details": ... } }` with a
matching HTTP status (400/401/403/404/409/500).

## The frontend connection

`frontend/` is wired up to this API — see the root [README.md](../README.md#frontend)
for what changed there (`Api*Repository` classes, real login, position-based
`canApprove` menu items). Verified end-to-end with real browser automation:
login, booking create/edit/cancel/approve/reject with real conflict
checking, facility request queue, templates, notifications, user/room
management, session persistence across page reload — zero console errors.
