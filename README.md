# Davomat Pro — AI-powered Attendance & Education Management

> Production-ready attendance system with **face recognition**, built for technical schools and training centers in Uzbekistan.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

---

## ✨ Features

### Core
- 🔐 **JWT Authentication** with 4 roles (**Admin / Teacher / Student / Parent**), bcrypt password hashing, per-IP login rate limiting.
- 🎯 **Face-recognition attendance** powered by [face-api.js](https://github.com/justadudewhohacks/face-api.js) — automatic check-in via webcam.
- 🗓 **Period-based schedule** — subjects, periods (paralar), weekly lesson grid; attendance is tied to a specific lesson.
- 👥 **Student management** with photo upload + 128-d face descriptor stored in DB, Excel bulk import (photos via ZIP).
- 👪 **Parent portal** — parents see their children's attendance; students see their own.
- 📊 **Dashboard** with live stats, 7-day attendance trend, latest check-ins.
- 📁 **Excel export** of any date-range / group attendance.
- 📈 **Reports** with bar / pie / stacked charts.
- 📜 **Audit log** — every login, manual mark, and CRUD action is recorded (admin-visible).
- 🔑 **Self-service password change** for all roles.
- 🌗 Dark mode, full responsive design, public landing page.
- 🇺🇿 Uzbek-language UI throughout.

### AI Pipeline
- Face **detection** — TinyFaceDetector (fast, mobile-friendly).
- Face **landmarks** — 68-point landmark net (alignment).
- Face **descriptor** — 128-dim embedding via `faceRecognitionNet`.
- Match: **Euclidean distance** with configurable threshold (default `0.55`).
- Attendance window per lesson: camera is open for N minutes from period start (default 5) → PRESENT; after the window, **finalize** marks everyone else ABSENT automatically.
- Duplicate guard: one record per (student × day × lesson).

### Bonus
- 🤖 **Telegram bot** notifications (set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`).
- 📱 **SMS** via Eskiz.uz (set `SMS_PROVIDER_EMAIL` + `SMS_PROVIDER_PASSWORD`).
- ☁️ S3-compatible storage hooks (env vars in place).
- 🐳 **Docker** & docker-compose for one-command deploy.

---

## 🛠 Tech Stack

| Layer       | Technology |
|-------------|-----------|
| Frontend    | Next.js 14 (App Router), React 18, TypeScript |
| Styling     | Tailwind CSS, lucide-react icons |
| Charts      | Recharts |
| Backend     | Next.js API routes (Node.js runtime) |
| Database    | PostgreSQL 16 + Prisma ORM |
| Auth        | JWT (jose), bcryptjs |
| AI          | face-api.js (TensorFlow.js under the hood) |
| Excel       | ExcelJS |
| Validation  | Zod |
| Notifications | Telegram Bot API, Eskiz.uz |

---

## 📂 Project Structure

```
davomat-pro/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # Public login page
│   ├── (dashboard)/              # Protected layout group
│   │   ├── layout.tsx            # Sidebar + header wrapper
│   │   ├── dashboard/            # Home / overview
│   │   ├── students/             # Student CRUD + face enrollment
│   │   │   └── new/              # Create / edit form
│   │   ├── groups/               # Group management
│   │   ├── teachers/             # User management (admin only)
│   │   ├── attendance/           # Attendance log
│   │   │   └── scan/             # Webcam face-scan page (★ main feature)
│   │   └── reports/              # Charts + Excel export
│   ├── api/                      # REST API routes
│   │   ├── auth/                 # login / logout / me
│   │   ├── students/             # CRUD
│   │   ├── groups/               # CRUD
│   │   ├── teachers/             # CRUD (admin)
│   │   ├── attendance/
│   │   │   ├── route.ts          # List + manual mark
│   │   │   ├── recognize/        # ★ Face matching endpoint
│   │   │   └── export/           # Excel download
│   │   ├── dashboard/stats/      # Aggregated home-page stats
│   │   └── upload/               # File upload (photos)
│   ├── layout.tsx
│   ├── page.tsx                  # Root — redirects to /dashboard or /login
│   └── globals.css
├── components/                   # Reusable React components
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── FaceScanner.tsx           # ★ Webcam + face-api.js wrapper
│   └── AttendanceChart.tsx
├── lib/                          # Shared server / client utilities
│   ├── prisma.ts                 # Prisma singleton
│   ├── jwt.ts                    # Token sign/verify (jose, edge-safe)
│   ├── auth.ts                   # bcrypt + cookie session helpers
│   ├── face-utils.ts             # Distance / matching math (server-safe)
│   ├── notifications.ts          # Telegram + SMS senders
│   └── utils.ts                  # cn(), date/format helpers, labels
├── ai/
│   └── face-recognition.ts       # Browser wrapper over face-api.js
├── prisma/
│   ├── schema.prisma             # DB schema (Users, Groups, Students, Attendance, Settings)
│   └── seed.ts                   # Sample data + admin/teachers
├── scripts/
│   └── download-models.ts        # Fetches face-api.js model weights
├── public/
│   ├── models/                   # face-api.js weights (gitignored)
│   └── uploads/                  # Student photos (gitignored)
├── middleware.ts                 # Route protection (redirects + API auth)
├── Dockerfile
├── docker-compose.yml
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── .env.example
└── package.json
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js 18+** (20 recommended)
- **PostgreSQL 14+** running locally OR use Docker
- A **webcam** (for the face-scan page)
- Modern browser (Chrome / Edge / Firefox / Safari)

### 1. Clone & install

```bash
git clone <your-repo-url> davomat-pro
cd davomat-pro
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and at minimum set:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/davomat_pro?schema=public"
JWT_SECRET="generate-with-openssl-rand-base64-32"
```

To generate a strong `JWT_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Spin up Postgres (only if you don't have it)

```bash
docker run -d --name davomat-pg \
  -e POSTGRES_USER=davomat -e POSTGRES_PASSWORD=davomat \
  -e POSTGRES_DB=davomat_pro \
  -p 5432:5432 postgres:16-alpine
```

(Then in `.env`: `DATABASE_URL="postgresql://davomat:davomat@localhost:5432/davomat_pro?schema=public"`)

### 4. Run database migrations & seed

```bash
npx prisma migrate dev --name init
npm run seed
```

This creates:
- **admin** / `admin123` — full access
- **aliyev** / `teacher123`, **karimova** / `teacher123` — teacher role
- **oquvchi** / `student123` — student role (linked to a 5-B student)
- **otaona** / `parent123` — parent role (linked to two children)
- 6 periods, 8 subjects, 3 groups, a weekly lesson grid (19 lessons)
- 16 demo students with generated local SVG avatars (no face data — enroll via UI)
- **3 weeks of realistic attendance history** (~490 records: face check-ins, lates, auto-absents) so dashboards and reports look alive on first run

### 5. Download AI models

face-api.js weights (~6 MB total) are not bundled. Fetch them once:

```bash
npm run setup:models
```

This populates `public/models/` with:
- tiny_face_detector
- face_landmark_68
- face_recognition

> **Offline?** Manually download weights from [face-api.js/weights](https://github.com/justadudewhohacks/face-api.js/tree/master/weights) and drop them into `public/models/`.

### 6. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with `admin / admin123`.

### 7. Enroll faces

1. Go to **Talabalar → Yangi talaba** (or open an existing student).
2. Upload a clear, well-lit, frontal photo.
3. Click **"Yuzni aniqlash"** — the 128-d descriptor is extracted in your browser.
4. Save.

### 8. Run face-scan attendance

Go to **Yuz orqali davomat**, allow camera access, and have students look at the camera. Each match auto-creates an attendance record (PRESENT or LATE based on group start time).

---

## 🐳 Docker Deployment (recommended for production)

### One-command full stack

```bash
# In the project root
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
docker compose up -d --build
```

This boots:
- `davomat-db` (Postgres 16 with persistent volume)
- `davomat-app` (Next.js production build)

The app auto-runs `prisma migrate deploy` on startup and listens on **<http://localhost:3000>**.

### First-time setup inside the container

```bash
# Seed sample users + groups + students
docker compose exec app npx tsx prisma/seed.ts

# Download AI models into the persistent volume
docker compose exec app npx tsx scripts/download-models.ts
```

### View logs

```bash
docker compose logs -f app
```

### Tear down

```bash
docker compose down            # keep data
docker compose down -v         # also delete the database volume
```

---

## 📡 API Reference (key endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Sign in (returns httpOnly cookie) |
| POST | `/api/auth/logout` | Clear session cookie |
| GET  | `/api/auth/me` | Current user |
| GET  | `/api/students` | List (filters: `?search=&groupId=`) |
| POST | `/api/students` | Create |
| PUT  | `/api/students/:id` | Update |
| DELETE | `/api/students/:id` | Delete |
| GET / POST / PUT / DELETE | `/api/groups[…]` | Group CRUD |
| GET / POST / PUT / DELETE | `/api/teachers[…]` | User CRUD (admin) |
| GET  | `/api/attendance` | List (filters: `?date=&from=&to=&groupId=&studentId=`) |
| POST | `/api/attendance` | Manual mark |
| **POST** | **`/api/attendance/recognize`** | **★ Match descriptor → mark attendance** |
| GET  | `/api/attendance/export` | Excel (.xlsx) download |
| GET  | `/api/dashboard/stats` | Home page aggregates |
| POST | `/api/upload` | Image upload → `{url}` |

### `POST /api/attendance/recognize`

```json
// Request
{
  "descriptor": [0.123, -0.456, ... /* 128 floats */],
  "lessonId": "lesson-cuid"
}

// Response (matched)
{
  "matched": true,
  "alreadyMarked": false,
  "student": { "id": "...", "fullName": "Aliyev Sardor", "photoUrl": "/uploads/abc.jpg", "group": {...} },
  "lesson": { "id": "...", "subject": "Matematika", "time": "08:00–08:45" },
  "attendance": { "status": "PRESENT", "checkInAt": "2026-07-02T..." },
  "confidence": 0.78
}

// Response (no match)
{ "matched": false, "reason": "Yuz tan olinmadi" }
```

Only works while the lesson's attendance window is open (today, correct period, within `attendanceWindowMinutes`). After the window closes, `POST /api/attendance/finalize` marks all unmarked students ABSENT.

---

## ⚙️ Environment Variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | ≥ 32 chars; rotate to invalidate sessions |
| `JWT_EXPIRES_IN` | | `7d` | Any [`jose`](https://github.com/panva/jose) duration |
| `MAX_UPLOAD_SIZE_MB` | | `5` | Photo upload limit |
| `FACE_MATCH_THRESHOLD` | | `0.55` | Lower = stricter (0.5 strict – 0.6 lenient) |
| `LOGIN_RATE_LIMIT` | | `10` | Max login attempts per IP per window |
| `LOGIN_RATE_WINDOW_SEC` | | `60` | Rate-limit window in seconds |
| `NEXT_PUBLIC_DEMO_CREDENTIALS` | | `0` | `1` pre-fills the login form with demo creds — demo/pitch only |
| `TELEGRAM_BOT_TOKEN` | | — | Enable Telegram notifs |
| `TELEGRAM_CHAT_ID` | | — | Channel/group ID |
| `SMS_PROVIDER_EMAIL` | | — | Eskiz.uz account |
| `SMS_PROVIDER_PASSWORD` | | — | Eskiz.uz account |
| `SMS_FROM` | | `4546` | SMS sender id |
| `S3_*` | | — | Optional S3 storage hooks |

---

## 🧪 Development Tips

### Useful npm scripts
```bash
npm run dev               # dev server (hot reload)
npm run build             # production build
npm run start             # serve built app
npm run prisma:studio     # GUI for the DB
npm run prisma:migrate    # create new migration
npm run seed              # seed sample data
npm run setup:models      # fetch face-api.js weights
```

### Adjust face-match strictness
Edit `.env` → `FACE_MATCH_THRESHOLD`:
- `0.45` — very strict (almost no false positives, may miss matches)
- `0.55` — **default**, good balance
- `0.65` — lenient (more matches, more false positives)

### Adjust the attendance window
Each lesson has `attendanceWindowMinutes` (default `5`) — how long the camera stays open from the period's start time. Inside the window a recognized student is PRESENT; after it closes, finalize marks the rest ABSENT.

### Resetting the database
```bash
npx prisma migrate reset    # drops & re-runs all migrations + seed
```

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt** (cost 10).
- Sessions ride in an **httpOnly + sameSite=Lax** cookie; secure-flagged in production.
- **Login brute-force protection**: per-IP rate limit with `429 + Retry-After`; a single generic error message prevents username enumeration.
- All write operations on **users / groups / teachers** require `ADMIN` role (middleware **and** per-route checks — defense in depth).
- Role scoping on reads: teachers see only their groups, students only themselves, parents only their children.
- **Audit log**: logins (incl. failed), user/student CRUD, manual attendance marks, and finalizations are recorded with actor + IP.
- File uploads validate MIME (`image/jpeg|png|webp`) and size; randomized filenames prevent overwrite.
- Security headers + `poweredByHeader: false`; `JWT_SECRET` < 32 chars refuses to boot in production; zod-validated env (fail-fast).
- Face descriptors are 128 float-32 numbers, **not reversible to face images** — but treat them as biometric data and apply your local privacy laws (GDPR / Uzbekistan Personal Data Protection Act).

---

## 🐞 Troubleshooting

| Problem | Fix |
|---------|-----|
| `Camera ruxsati berilmadi` | Browser permissions → allow camera. HTTPS required for non-`localhost`. |
| `AI modellarni yuklashda xato` | Run `npm run setup:models`. Verify files exist in `public/models/`. |
| `Yuz topilmadi` during enrollment | Use a brighter, frontal photo where the face takes ≥ 30 % of the frame. |
| Recognition keeps failing | Lower `FACE_MATCH_THRESHOLD` to `0.6` in `.env`; re-enroll the student with a better photo. |
| `Prisma generate` errors in Docker | Make sure the `openssl` package is installed (already in our Dockerfile). |
| Port 3000 / 5432 busy | Edit `docker-compose.yml` → change the host-side port mapping. |

---

## 🗺 Roadmap Ideas

- Multi-camera live attendance kiosk mode
- Parent-facing portal / mobile app (PWA)
- Liveness / anti-spoofing (blink detection)
- Cloud sync of face descriptors (vector DB like pgvector)
- Multi-tenant (multiple schools per deployment)

---

## 📝 License

MIT — feel free to use commercially. PRs welcome.

---

## ☕ Credits

Built with care for Uzbekistan's growing tech-education community.
Powered by [Next.js](https://nextjs.org), [face-api.js](https://github.com/justadudewhohacks/face-api.js), and [Prisma](https://www.prisma.io).
