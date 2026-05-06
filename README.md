<p align="center">
  <img src="assets/GradeFlow-Banner.png" alt="GradeFlow GitHub README hero banner" width="100%" />
</p>

<h1 align="center">GradeFlow</h1>

<p align="center">
  AI-assisted grading workflow platform for university teaching assistants and lecturers.
</p>

<p align="center">
  <strong>Hebrew RTL</strong> · <strong>Rubric-based grading</strong> · <strong>PDF/DOCX preview</strong> · <strong>Docker-ready</strong> · <strong>Cloud-ready</strong>
</p>

---

GradeFlow is a focused grading workspace built for university teaching assistants and lecturers.  
It supports Hebrew RTL out-of-the-box and provides a calm, functional environment for grading assignments, managing course rosters, reviewing submissions, and maintaining reusable feedback templates.

---

## Table of Contents

1. [Features](#features)
2. [Installable App (PWA)](#installable-app-pwa)
3. [Tech Stack](#tech-stack)
4. [Architecture Overview](#architecture-overview)
5. [Universal Docker Run Options](#universal-docker-run-options)
6. [Environment Variables](#environment-variables)
7. [Database](#database)
8. [File Storage](#file-storage)
9. [API Documentation (Swagger)](#api-documentation-swagger)
10. [Project Structure](#project-structure)
11. [Frontend Routes](#frontend-routes)
12. [API Reference](#api-reference)
13. [Authentication & Authorization](#authentication--authorization)
14. [Data Models](#data-models)
15. [Testing](#testing)
16. [Demo Accounts](#demo-accounts)
17. [Development Workflow](#development-workflow)
18. [Moodle Student Import](#moodle-student-import)
19. [Backup and Restore](docs/BACKUP_AND_RESTORE.md)

---

## Features

- **Hebrew RTL** — entire application rendered right-to-left with Hebrew-first typography (Assistant/Heebo web fonts).
- **Dashboard** — high-level metrics: open assignments, pending submissions, active courses, and student count. Includes a recent grading activity feed.
- **Course management** — create courses with code, name, term, and year; archive inactive courses; manage student rosters; export gradebooks to CSV.
- **Assignment lifecycle** — create assignments with due dates, max score, and weight; close and reopen them; view a per-assignment gradebook.
- **Focused grading workspace** — two-pane layout (PDF preview + rubric/feedback panel) optimised for fast keyboard-driven grading.
- **Rubric builder** — define per-criterion names, weights, and max points; record per-criterion scores for each submission.
- **Feedback templates** — reusable comment snippets, globally or scoped to a course, inserted with a single click during grading.
- **File attachments** — attach instruction PDFs and grading guides to assignments; attach student submission PDFs stored in object storage.
- **DOCX preview** — `.docx` files are rendered to HTML server-side for in-browser preview (no download required).
- **Student registry** — unified global roster across all courses with search, edit, and grade history.
- **Bulk import** — paste or upload a CSV to import students and optionally enrol them in a course in one step.
- **Role-based access** — three roles: `admin`, `lecturer`, `grader`, with fine-grained guards on every endpoint.
- **Secure session management** — httpOnly cookie JWT with token versioning; revoke all sessions or change password from the Settings page.
- **Admin tools** — create users, reset passwords, and issue temporary credentials from the Users page.
- **Password reset by email** — integrates with Resend for one-time reset links; falls back gracefully when no email provider is configured.
- **Docker deployment** — full `docker compose up` workflow with bundled MinIO object storage, automatic database migrations, and first-boot account seeding.

---

## Installable App (PWA)

GradeFlow ships a [Web App Manifest](frontend/public/manifest.webmanifest) that makes it installable as a standalone app on desktop and mobile — no app store required. The feature is active on the **deployed (HTTPS) version** of the app; browsers require a secure origin to enable installation.

### How to install

#### Desktop (Chrome / Edge)
1. Open the deployed GradeFlow URL.
2. An **install icon** appears in the browser address bar (right side).
3. Click it and confirm — GradeFlow opens in its own window with no browser chrome.

#### Android (Chrome)
1. Open the deployed URL in Chrome.
2. Tap the three-dot menu → **"Add to home screen"**.
3. The GradeFlow icon is pinned to your home screen and opens fullscreen.

#### iPhone / iPad (Safari)
1. Open the deployed URL in Safari.
2. Tap the **Share** button → **"Add to Home Screen"**.
3. The app icon appears on your home screen and launches in standalone fullscreen mode.

### Manifest configuration

| Property | Value |
|----------|-------|
| Name | GradeFlow |
| Short name | GradeFlow |
| Display mode | `standalone` (no browser UI) |
| Orientation | any |
| Language / direction | Hebrew RTL (`he` / `rtl`) |
| Theme colour | `#4a7ab5` (navy blue) |
| Background colour | `#0f1923` (dark) |
| Icons | 192 × 192 px and 512 × 512 px PNG |

> The production build registers a service worker through `vite-plugin-pwa`.
> GradeFlow includes an offline page, cached static assets, and a refresh prompt when a new version is available.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| **Routing** | wouter |
| **Data fetching** | TanStack React Query + Orval-generated hooks |
| **Backend** | NestJS 10, TypeScript |
| **ORM** | Prisma 5 |
| **Database** | PostgreSQL 16 |
| **Auth** | Passport.js + JWT (httpOnly cookie, 30-day TTL) |
| **File storage** | MinIO / AWS S3-compatible object storage |
| **Email** | Resend (optional — for password reset) |
| **API docs** | Swagger / OpenAPI via `@nestjs/swagger` |
| **Validation** | class-validator + class-transformer |
| **Backend tests** | Vitest + Supertest (58 tests, 11 files) |
| **Frontend tests** | Playwright E2E (12 spec files) |
| **Monorepo** | pnpm workspaces |
| **Container** | Docker Compose (4 services) |

---

## Architecture Overview

GradeFlow supports both a local Docker-based development environment and a cloud production deployment using managed services.

### Local Docker Architecture

<p align="center">
  <img src="assets/GradeFlow-Local-Docker-Architecture.png" alt="GradeFlow local Docker architecture with frontend, backend, PostgreSQL, and MinIO" width="100%" />
</p>

The local setup uses Docker Compose to run the frontend, backend, PostgreSQL database, and MinIO object storage as separate containers.

### Cloud Production Architecture

<p align="center">
  <img src="assets/GradeFlow-Cloud-Production-Architecture.png" alt="GradeFlow cloud production architecture with Render, Neon PostgreSQL, and AWS S3" width="100%" />
</p>

The production setup separates the hosted frontend, hosted backend, managed PostgreSQL database, and S3-compatible file storage.

### Logical Application Flow

```
┌───────────────────────────────────────────────────────────┐
│                   Browser (RTL / Hebrew)                  │
│                                                           │
│   React + Vite + Tailwind + shadcn/ui                     │
│   TanStack Query  ←→  Orval-generated API hooks           │
└───────────────────────────┬───────────────────────────────┘
                            │ HTTP (cookie auth)
                            ▼
┌───────────────────────────────────────────────────────────┐
│                   NestJS API Server                       │
│                                                           │
│   Global prefix : /api         Swagger UI : /api/docs     │
│                                                           │
│   Modules                                                 │
│   ─────────────────────────────────────────────────────   │
│   Auth · Users · Courses · Students · Assignments         │
│   AssignmentFiles · Submissions · Rubrics                 │
│   FeedbackTemplates · Dashboard                           │
│   Import · Export · Storage · Email · Health              │
│                                                           │
│   Guards   : JwtAuthGuard (global) → RolesGuard (global)  │
│   Filter   : AllExceptionsFilter → { error: string }      │
└────────────────────┬──────────────────┬───────────────────┘
                     │                  │
                     ▼                  ▼
             PostgreSQL DB      Object Storage
             (via Prisma)       ┌─────────────────────┐
                                │ MinIO / AWS S3      │
                                │ S3-compatible API   │
                                └─────────────────────┘
```

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| Global JWT guard + `@Public()` opt-out | Every new endpoint is protected by default; public routes are explicit. |
| Token versioning (`User.tokenVersion`) | Changing a password or revoking sessions instantly invalidates all outstanding JWTs without a token blacklist. |
| Error envelope `{ "error": string }` | `AllExceptionsFilter` normalises every error type so the frontend handles exactly one shape. |
| Orval codegen for the API client | Types stay in sync with the OpenAPI spec automatically — no hand-written fetch calls. |
| S3-compatible storage backend | `ObjectStorageService` delegates file operations to an S3-compatible storage layer, allowing GradeFlow to use local MinIO in Docker or remote AWS S3-compatible storage in production. |
| `setGlobalPrefix('api')` | Keeps API routes cleanly separated from the Vite-served static files. |

---

## Universal Docker Run Options

GradeFlow can be run on any machine that has Docker installed, including macOS, Windows, and Linux.

The project supports two Docker-based run modes:

1. **Run from published Docker Hub images** — best for demos, grading, and running on another computer without building the source code.
2. **Run from source code** — best for development, testing, and making changes locally.

The published Docker images support:

```text
linux/amd64
linux/arm64
```

This means the same images can run on most Windows/Linux PCs, Intel/AMD servers, and Apple Silicon Macs.

---

## Option 1: Run from Published Docker Hub Images

This option does **not** require the full source code on the target computer.

Use this when you want to run GradeFlow on another computer with only:

```text
docker-compose.yml
.env
```

It pulls the already-published backend and frontend images from Docker Hub:

```text
jordandaudu/gradeflow-backend:latest
jordandaudu/gradeflow-frontend:latest
```

This image-based setup supports both database modes:

```text
Local mode  → uses the bundled PostgreSQL Docker container
Remote mode → uses a remote PostgreSQL database such as Neon
```

If `DATABASE_URL` is not set to Neon, the app can still run locally with Docker PostgreSQL.

---

### 1. Create a project folder

macOS/Linux/Git Bash:

```bash
mkdir gradeflow
cd gradeflow
```

Windows PowerShell:

```powershell
mkdir gradeflow
cd gradeflow
```

---

### 2. Create `.env`

Create a file named:

```text
.env
```

Use this as a starting point:

```env
# ---------------------------------------------------------
# GradeFlow runtime
# ---------------------------------------------------------
FRONTEND_PORT=3000
FRONTEND_BASE_URL=http://localhost:3000

# Use the same JWT_SECRET on every computer that connects
# to the same remote database.
JWT_SECRET=replace_this_with_a_long_random_secret

# ---------------------------------------------------------
# Local PostgreSQL fallback
# ---------------------------------------------------------
POSTGRES_USER=gradeflow
POSTGRES_PASSWORD=gradeflow_password
POSTGRES_DB=gradeflow
POSTGRES_PORT=5433

# Local Docker database URL.
# Use this when you want the app to run fully locally.
LOCAL_DATABASE_URL=postgresql://gradeflow:gradeflow_password@db:5432/gradeflow

# Active backend database connection.
# Local-only mode:
DATABASE_URL=postgresql://gradeflow:gradeflow_password@db:5432/gradeflow

# Remote Neon mode:
# Replace DATABASE_URL with the Neon pooled URL containing "-pooler".
# DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.neon.tech/neondb?sslmode=require&channel_binding=require

# Optional direct DB URL for restore/migrations/admin scripts.
# For Neon, this should be the direct URL without "-pooler".
DIRECT_DATABASE_URL=

# ---------------------------------------------------------
# MinIO / S3-compatible object storage
# ---------------------------------------------------------
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001

STORAGE_BACKEND=s3
S3_BUCKET=gradeflow
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_PUBLIC_ENDPOINT=http://localhost:9000

# ---------------------------------------------------------
# Optional email provider
# ---------------------------------------------------------
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Generate a secure `JWT_SECRET` before running the app.

macOS/Linux/Git Bash:

```bash
openssl rand -hex 64
```

Windows PowerShell:

```powershell
$bytes = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$jwtSecret = -join ($bytes | ForEach-Object { "{0:x2}" -f $_ })
$jwtSecret
```

Paste the generated value into:

```env
JWT_SECRET=your_generated_secret_here
```

Do not commit or publicly share `.env`.

---

### 3. Local database mode

Use this mode when the computer should run GradeFlow fully locally.

In `.env`, keep:

```env
DATABASE_URL=postgresql://gradeflow:gradeflow_password@db:5432/gradeflow
DIRECT_DATABASE_URL=
```

This uses the bundled PostgreSQL container from Docker Compose.

---

### 4. Shared remote database mode with Neon

Use this mode when two or more computers should share the same GradeFlow database.

In `.env`, set:

```env
# Runtime database connection.
# Use the Neon pooled connection string. It contains "-pooler".
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.neon.tech/neondb?sslmode=require&channel_binding=require

# Direct database connection.
# Use the Neon direct connection string. It does not contain "-pooler".
DIRECT_DATABASE_URL=postgresql://USER:PASSWORD@HOST.REGION.neon.tech/neondb?sslmode=require&channel_binding=require
```

Important:

```text
DATABASE_URL          pooled Neon URL, contains "-pooler"
DIRECT_DATABASE_URL   direct Neon URL, does not contain "-pooler"
JWT_SECRET            same value on every computer using the same remote DB
```

With this setup:

```text
Computer 1 Docker backend ─┐
                           ├── same Neon PostgreSQL database
Computer 2 Docker backend ─┘
```

The shared remote database includes:

```text
users
courses
students
enrollments
assignments
submissions
grades
rubrics
feedback templates
```

Important storage limitation:

```text
Uploaded files are not shared yet if each computer uses its own local MinIO.
```

If Computer 1 uploads a PDF, Computer 2 may see the database record but not the actual file unless both computers also use the same remote S3-compatible storage. For full multi-computer usage, configure remote object storage later.

---

### 5. Create `docker-compose.yml`

Create a file named:

```text
docker-compose.yml
```

Paste the following content into it:

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-gradeflow}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-gradeflow_password}
      POSTGRES_DB: ${POSTGRES_DB:-gradeflow}
    volumes:
      - gradeflow_db:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-5433}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-gradeflow} -d ${POSTGRES_DB:-gradeflow}"]
      interval: 5s
      timeout: 5s
      retries: 12
      start_period: 10s

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY_ID:-minioadmin}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_ACCESS_KEY:-minioadmin}
    ports:
      - "${MINIO_API_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
    volumes:
      - gradeflow_minio:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 12
      start_period: 10s

  backend:
    image: jordandaudu/gradeflow-backend:latest
    restart: unless-stopped
    environment:
      PORT: 8080
      NODE_ENV: production

      # If DATABASE_URL is set in .env, Docker uses it.
      # If it is missing, Docker falls back to the bundled local PostgreSQL service.
      DATABASE_URL: ${DATABASE_URL:-postgresql://gradeflow:gradeflow_password@db:5432/gradeflow}
      DIRECT_DATABASE_URL: ${DIRECT_DATABASE_URL:-}

      JWT_SECRET: ${JWT_SECRET}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      RESEND_FROM_EMAIL: ${RESEND_FROM_EMAIL:-}
      FRONTEND_BASE_URL: ${FRONTEND_BASE_URL:-http://localhost:3000}

      STORAGE_BACKEND: s3
      S3_BUCKET: ${S3_BUCKET:-gradeflow}
      S3_REGION: ${S3_REGION:-us-east-1}
      S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID:-minioadmin}
      S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY:-minioadmin}
      S3_ENDPOINT: http://minio:9000
      S3_PUBLIC_ENDPOINT: ${S3_PUBLIC_ENDPOINT:-http://localhost:9000}
      S3_FORCE_PATH_STYLE: "true"
    depends_on:
      db:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -fs http://localhost:8080/api/healthz | grep -q ok || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 30s

  frontend:
    image: jordandaudu/gradeflow-frontend:latest
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-3000}:80"
    depends_on:
      backend:
        condition: service_healthy

volumes:
  gradeflow_db:
  gradeflow_minio:
```

This compose file intentionally keeps the `db` service available even when using Neon. That makes it easy to switch back to local mode by changing `DATABASE_URL`.

---

### 6. Pull and start the application

macOS/Linux/Git Bash:

```bash
docker compose pull
docker compose up -d
```

Windows PowerShell:

```powershell
docker compose pull
docker compose up -d
```

---

### 7. Check which database Docker will use

Run:

```bash
docker compose config | grep -n "DATABASE_URL\|DIRECT_DATABASE_URL"
```

For local mode, you should see:

```text
DATABASE_URL: postgresql://gradeflow:gradeflow_password@db:5432/gradeflow
```

For Neon mode, you should see:

```text
DATABASE_URL: postgresql://...-pooler...neon.tech/neondb...
DIRECT_DATABASE_URL: postgresql://...neon.tech/neondb...
```

If you expected Neon but see `db:5432`, then `.env` is still pointing to the local database.

---

### 8. Check that the containers are running

```bash
docker compose ps
```

Expected services:

```text
db
minio
backend
frontend
```

---

### 9. Verify backend health

macOS/Linux/Git Bash:

```bash
curl http://localhost:3000/api/healthz
```

Windows PowerShell:

```powershell
curl.exe http://localhost:3000/api/healthz
```

Expected response:

```json
{
  "status": "ok"
}
```

---

### 10. Open the app

Open this URL in your browser:

```text
http://localhost:3000
```

Useful URLs:

```text
Frontend:      http://localhost:3000
API Health:    http://localhost:3000/api/healthz
Swagger Docs:  http://localhost:3000/api/docs
MinIO Console: http://localhost:9001
```

---

### 11. Default seeded users

On first startup, if the selected database has no users, the backend seeds default accounts:

```text
Admin:    admin@gradeflow.app    / admin123
Lecturer: lecturer@gradeflow.app / lecturer123
Grader:   grader@gradeflow.app   / grader123
```

Change these passwords after first login.

---

## Option 2: Run from Source Code

This option builds the backend and frontend Docker images locally from the repository source code.

Use this option if you want to inspect the code, modify the project, run tests, or rebuild the application yourself.

### 1. Clone the repository

```bash
git clone https://github.com/JordanDaudu/GradeFlow.git
cd GradeFlow
```

### 2. Create the local environment file

macOS/Linux/Git Bash:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Generate a JWT secret

macOS/Linux/Git Bash:

```bash
openssl rand -hex 64
```

Windows PowerShell:

```powershell
[Convert]::ToHexString((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

Open `.env` and set:

```env
JWT_SECRET=your_generated_secret_here
```

For local Docker, the important environment values are:

```env
POSTGRES_USER=gradeflow
POSTGRES_PASSWORD=gradeflow_password
POSTGRES_DB=gradeflow
POSTGRES_PORT=5433

DATABASE_URL=postgresql://gradeflow:gradeflow_password@db:5432/gradeflow
DIRECT_DATABASE_URL=
LOCAL_DATABASE_URL=postgresql://gradeflow:gradeflow_password@db:5432/gradeflow

FRONTEND_BASE_URL=http://localhost:3000

STORAGE_BACKEND=s3
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=http://localhost:9000
S3_BUCKET=gradeflow
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```

Important:

```text
S3_ENDPOINT is used by the backend inside Docker.
S3_PUBLIC_ENDPOINT is used by the browser.
```

For local Docker, this is why:

```env
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=http://localhost:9000
```

### Optional: use the same remote PostgreSQL database from source mode

To run the source-code Docker setup against a shared Neon database, change `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.neon.tech/neondb?sslmode=require&channel_binding=require
DIRECT_DATABASE_URL=postgresql://USER:PASSWORD@HOST.REGION.neon.tech/neondb?sslmode=require&channel_binding=require
LOCAL_DATABASE_URL=postgresql://gradeflow:gradeflow_password@db:5432/gradeflow
```

To return to local mode later, set:

```env
DATABASE_URL=postgresql://gradeflow:gradeflow_password@db:5432/gradeflow
DIRECT_DATABASE_URL=
```

---

### 4. Build and start the full stack

```bash
docker compose up -d --build
```

This starts:

```text
PostgreSQL database container
MinIO object storage container
NestJS backend container
React/Vite frontend container served by Nginx
```

### 5. Check container status

```bash
docker compose ps
```

Expected services:

```text
db
minio
backend
frontend
```

### 6. Verify backend health

macOS/Linux/Git Bash:

```bash
curl http://localhost:3000/api/healthz
```

Windows PowerShell:

```powershell
curl.exe http://localhost:3000/api/healthz
```

Expected response:

```json
{
  "status": "ok"
}
```

### 7. Open the app

Open this URL in your browser:

```text
http://localhost:3000
```

Useful URLs:

```text
Frontend:      http://localhost:3000
API Health:    http://localhost:3000/api/healthz
Swagger Docs:  http://localhost:3000/api/docs
MinIO Console: http://localhost:9001
```

### 8. Default seeded users

On first startup, if the selected database has no users, the backend seeds default accounts:

```text
Admin:    admin@gradeflow.app    / admin123
Lecturer: lecturer@gradeflow.app / lecturer123
Grader:   grader@gradeflow.app   / grader123
```

Change these passwords after first login.

---

## Stopping the Application

Stop the containers while keeping the database and uploaded file data:

```bash
docker compose down
```

Start again later:

```bash
docker compose up -d
```

Stop the containers and delete all local database and MinIO data:

```bash
docker compose down -v
```

Use `down -v` only when you want to fully reset local GradeFlow data.

---

## Rebuilding After Code Changes

If you changed backend or frontend code:

```bash
docker compose up -d --build
```

If Docker cache causes issues, rebuild without cache:

```bash
docker compose build --no-cache
docker compose up -d
```

---

## Docker Hub Images

The project publishes Docker images automatically when changes are pushed to the `main` branch.

Published images:

```text
jordandaudu/gradeflow-backend:latest
jordandaudu/gradeflow-frontend:latest
```

Each workflow run also publishes commit-specific tags:

```text
jordandaudu/gradeflow-backend:<commit-sha>
jordandaudu/gradeflow-frontend:<commit-sha>
```

The images are built for:

```text
linux/amd64
linux/arm64
```

This makes them portable across most modern Docker environments.

---

## Notes

- PostgreSQL stores GradeFlow relational data.
- MinIO provides local S3-compatible object storage for uploaded assignment/submission files.
- A remote database such as Neon shares relational data between computers.
- Local MinIO does not share uploaded files between computers. Use remote S3-compatible storage for shared uploaded files.
- The backend automatically applies Prisma migrations on container startup.
- The backend seeds default users only when no users exist.
- The frontend is served by Nginx and proxies `/api/*` requests to the backend.
- `.env` should never be committed to Git.
- Full local backup/restore documentation is available in [`docs/BACKUP_AND_RESTORE.md`](docs/BACKUP_AND_RESTORE.md).

---

## Environment Variables

### Backend — full reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Port the NestJS server binds to |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by the running backend. For local Docker, use `db:5432`. For Neon, use the pooled URL containing `-pooler`. |
| `DIRECT_DATABASE_URL` | No | Direct PostgreSQL connection string used for restore, migration, or admin scripts. For Neon, use the non-pooled URL without `-pooler`. |
| `LOCAL_DATABASE_URL` | No | Optional local Docker PostgreSQL URL kept as a reference when switching between remote and local database modes. |
| `JWT_SECRET` | Yes (prod) | Secret used to sign session JWTs |
| `NODE_ENV` | No | `production` enables secure cookies and stricter behaviour |
| `STORAGE_BACKEND` | No | Storage backend. Use `s3` for MinIO or AWS S3-compatible storage. |
| `S3_BUCKET` | S3 mode | Bucket name |
| `S3_REGION` | S3 mode | AWS region (default: `us-east-1`) |
| `S3_ACCESS_KEY_ID` | S3 mode | Access key ID |
| `S3_SECRET_ACCESS_KEY` | S3 mode | Secret access key |
| `S3_ENDPOINT` | MinIO only | Internal MinIO URL (e.g. `http://minio:9000`) |
| `S3_PUBLIC_ENDPOINT` | MinIO only | Browser-facing MinIO URL for presigned PUT uploads |
| `S3_FORCE_PATH_STYLE` | MinIO only | Set `true` for path-style S3 URLs |
| `RESEND_API_KEY` | No | Resend API key for password-reset emails |
| `RESEND_FROM_EMAIL` | No | From-address for password-reset emails |
| `FRONTEND_BASE_URL` | No | Public URL used in email reset links |

### Frontend

Set `VITE_API_URL` only when the frontend needs to call a backend hosted on a different origin. In the Docker setup, API requests are proxied through Nginx.

---

## Database

GradeFlow uses **Prisma** for all database access. All schema changes go through committed migration SQL files.

### Local Docker PostgreSQL mode

By default, Docker Compose runs a bundled PostgreSQL 16 container and the backend connects to it through Docker networking:

```env
DATABASE_URL=postgresql://gradeflow:gradeflow_password@db:5432/gradeflow
DIRECT_DATABASE_URL=
```

This mode is best for local-only development, demos, and isolated testing.

### Remote PostgreSQL / Neon mode

GradeFlow can also use a remote PostgreSQL database instead of the local Docker PostgreSQL service.

This is useful when multiple computers should share the same GradeFlow relational data.

For Neon, use two connection strings:

```text
DATABASE_URL          Pooled Neon URL, contains `-pooler`
DIRECT_DATABASE_URL   Direct Neon URL, does not contain `-pooler`
```

Example `.env` structure:

```env
# Remote Neon database used by the running backend
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.neon.tech/neondb?sslmode=require&channel_binding=require"

# Direct Neon database connection for restore, migrations, or admin scripts
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST.REGION.neon.tech/neondb?sslmode=require&channel_binding=require"

# Optional local Docker fallback/reference
LOCAL_DATABASE_URL="postgresql://gradeflow:gradeflow_password@db:5432/gradeflow"
```

Important:

```text
DATABASE_URL should use the pooled Neon connection.
DIRECT_DATABASE_URL should use the direct Neon connection.
JWT_SECRET should be the same on every computer using the same shared database.
.env must never be committed.
```

To verify which database Docker Compose will use:

```bash
docker compose config | grep -n "DATABASE_URL\|DIRECT_DATABASE_URL"
```

For local Docker PostgreSQL mode, set:

```env
DATABASE_URL="postgresql://gradeflow:gradeflow_password@db:5432/gradeflow"
DIRECT_DATABASE_URL=
```

For remote Neon mode, set `DATABASE_URL` to the pooled Neon URL.

Note: using a remote PostgreSQL database shares GradeFlow relational data such as users, courses, students, assignments, grades, and feedback. Uploaded files are still stored in MinIO unless remote S3-compatible storage is configured.

### Create a new migration (development)

```bash
# 1. Edit backend/prisma/schema.prisma
# 2. Generate and commit the migration SQL
pnpm --filter @workspace/api-server run prisma:migrate -- --name <migration-name>
```

### Apply existing migrations (production / Docker)

```bash
pnpm --filter @workspace/api-server run prisma:migrate:deploy
```

In Docker this runs automatically on every container start via `entrypoint.sh`.

### Seed demo data (manual)

```bash
pnpm --filter @workspace/api-server run prisma:seed
```

In Docker, seeding happens automatically on first boot when the database is empty.

### Reset everything (development only — destructive)

```bash
pnpm --filter @workspace/api-server exec prisma migrate reset
```

---

## File Storage

GradeFlow uses S3-compatible object storage selected by the `STORAGE_BACKEND` environment variable:

| Mode | When | Backend |
|------|------|---------|
| `s3` | Docker / self-hosted / production | Any S3-compatible store — MinIO bundled locally, or AWS S3-compatible storage remotely |

The active backend is logged on startup:
```
Storage backend: S3 (AWS-compatible)
```

### Upload flow

```
Client                              Backend                      Object Storage
  │                                    │                               │
  │── POST /api/storage/uploads/       │                               │
  │       request-url ──────────────►  │── generate presigned PUT URL ►│
  │  ◄── { uploadURL, objectPath } ──  │  ◄─────────────────────────── │
  │                                    │                               │
  │── PUT <uploadURL> (file bytes) ──────────────────────────────────► │
  │  ◄── 200 OK ─────────────────────────────────────────────────────  │
  │                                    │                               │
  │── POST /api/assignments/:id/files  │                               │
  │      { objectPath, ... } ────────► │  (saves objectPath to DB)     │
  │  ◄── { id, name, ... } ─────────── │                               │
```

- Maximum file size: **50 MB**
- Accepted MIME types for upload: `application/pdf`
- DOCX files are rendered to HTML server-side for in-browser preview
- Dangerous extensions (`.exe`, `.bat`, `.sh`, etc.) are rejected at validation time
- The `objectPath` stored in the database always uses the format `/objects/<key>` — backend-agnostic

### S3 backend details (`backend/src/storage/backends/s3.backend.ts`)

Uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`. Notable behaviour:

- Generates presigned PUT URLs pointing at `S3_PUBLIC_ENDPOINT` (browser-facing)
- Uses `S3_ENDPOINT` for all server-side API calls (GetObject, HeadObject, DeleteObject)
- Automatically creates the S3 bucket on module init if it does not exist
- Handles region-specific bucket creation (`CreateBucketConfiguration`) for AWS regions other than `us-east-1`

---

## API Documentation (Swagger)

Interactive API docs are served at:

```
http://localhost:<PORT>/api/docs
```

The Swagger UI is pre-configured with the `gradeflow_token` cookie auth scheme. To authenticate:

1. Expand **Auth → POST /api/auth/login** and execute with your credentials.
2. The browser receives the session cookie automatically.
3. All subsequent requests in the same browser tab are authenticated.

The raw OpenAPI JSON spec is at:

```
http://localhost:<PORT>/api/docs-json
```

---

## Project Structure

```
/ (monorepo root)
├── backend/                        # NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   ├── seed.ts                 # Demo data seeder
│   │   └── migrations/             # Committed migration SQL files
│   ├── src/
│   │   ├── main.ts                 # Bootstrap + Swagger setup
│   │   ├── app.module.ts
│   │   ├── auth/                   # JWT auth, guards, decorators
│   │   ├── users/                  # Admin-only user management
│   │   ├── courses/                # Course CRUD + enrollment
│   │   ├── students/               # Student registry
│   │   ├── assignments/            # Assignment CRUD + open/close
│   │   ├── assignment-files/       # File attachments (upload, preview, download)
│   │   ├── submissions/            # Grading workflow
│   │   ├── rubrics/                # Rubric criteria + per-submission scores
│   │   ├── feedback-templates/     # Reusable comment snippets
│   │   ├── dashboard/              # Aggregate statistics
│   │   ├── imports/                # CSV bulk student import
│   │   ├── exports/                # CSV grade export
│   │   ├── storage/                # Object storage facade + signed upload URLs
│   │   │   └── backends/
│   │   │       └── s3.backend.ts       # S3 / MinIO / AWS S3
│   │   ├── email/                  # Resend integration (password reset)
│   │   ├── health/                 # /api/healthz endpoint
│   │   ├── prisma/                 # PrismaModule / PrismaService
│   │   └── common/                 # Exception filter, validation factory
│   └── test/                       # Vitest integration tests (11 files, 58 tests)
│
├── frontend/                       # React + Vite SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── dashboard.tsx
│   │   │   ├── courses/            # List + detail
│   │   │   ├── assignments/        # List + detail + focused grading workspace
│   │   │   ├── grading/            # Two-pane PDF + rubric grading view
│   │   │   ├── students/
│   │   │   ├── templates/
│   │   │   ├── users/
│   │   │   ├── settings/
│   │   │   ├── login.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   └── reset-password.tsx
│   │   ├── components/
│   │   │   └── ui/                 # shadcn/ui components
│   │   └── lib/
│   ├── public/
│   │   ├── manifest.webmanifest    # PWA manifest
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── tests/e2e/                  # Playwright E2E tests (12 spec files)
│
├── lib/
│   ├── api-spec/                   # OpenAPI YAML spec (source of truth)
│   ├── api-client-react/           # Orval-generated React Query hooks
│   └── api-zod/                    # Orval-generated Zod validators
│
├── docker/
│   ├── backend/
│   │   ├── Dockerfile
│   │   └── entrypoint.sh           # Migrations + first-boot seed + app start
│   └── frontend/
│       ├── Dockerfile
│       └── nginx.conf
│
├── docker-compose.yml
├── .env.example
└── scripts/
    └── post-merge.sh               # Runs after task-agent merges
```

---

## Frontend Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard — metrics and recent activity |
| `/courses` | Course list |
| `/courses/:id` | Course detail (students, assignments, gradebook) |
| `/assignments` | Global assignment list |
| `/assignments/:id` | Assignment detail + per-assignment gradebook |
| `/assignments/:id/grade/:submissionId` | Focused grading workspace (PDF preview + rubric panel) |
| `/students` | Student registry with search and edit |
| `/templates` | Feedback template library |
| `/users` | User management (admin only) |
| `/settings` | Change password, revoke sessions, admin shortcuts |
| `/login` | Login |
| `/forgot-password` | Request a password reset link |
| `/reset-password` | Complete a password reset via emailed token |

---

## API Reference

All routes are prefixed with `/api`. The full interactive reference is at `/api/docs`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | Public | Login — sets `gradeflow_token` cookie |
| `POST` | `/api/auth/logout` | Public | Clear session cookie |
| `GET` | `/api/auth/me` | Required | Current user profile |
| `POST` | `/api/auth/change-password` | Required | Change password (re-issues cookie, revokes other sessions) |
| `POST` | `/api/auth/revoke-sessions` | Required | Revoke all sessions and clear cookie |
| `POST` | `/api/auth/request-password-reset` | Public | Request a reset link via email (always returns `{ ok: true }`) |
| `POST` | `/api/auth/reset-password` | Public | Reset password with one-time token |

### Courses

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/courses` | List courses (`includeArchived=false` to hide archived) |
| `POST` | `/api/courses` | Create a course |
| `GET` | `/api/courses/:courseId` | Course details |
| `PATCH` | `/api/courses/:courseId` | Update course |
| `DELETE` | `/api/courses/:courseId` | Delete course |
| `POST` | `/api/courses/:courseId/archive` | Archive |
| `POST` | `/api/courses/:courseId/unarchive` | Unarchive |
| `GET` | `/api/courses/:courseId/students` | List enrolled students |
| `POST` | `/api/courses/:courseId/students` | Enrol a student |
| `DELETE` | `/api/courses/:courseId/students/:studentId` | Remove from course |
| `GET` | `/api/courses/:courseId/gradebook` | Full gradebook (assignments × students) |

### Students

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/students` | List students (`q` for name/ID search) |
| `POST` | `/api/students` | Create a student |
| `GET` | `/api/students/:studentId` | Student profile |
| `PATCH` | `/api/students/:studentId` | Update student |
| `DELETE` | `/api/students/:studentId` | Delete student |
| `GET` | `/api/students/:studentId/history` | Complete submission history |

### Assignments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/assignments` | List assignments (`courseId` to filter) |
| `POST` | `/api/assignments` | Create an assignment |
| `GET` | `/api/assignments/:assignmentId` | Assignment details |
| `PATCH` | `/api/assignments/:assignmentId` | Update assignment |
| `DELETE` | `/api/assignments/:assignmentId` | Delete assignment |
| `POST` | `/api/assignments/:assignmentId/close` | Close (removes from active dashboard) |
| `POST` | `/api/assignments/:assignmentId/reopen` | Reopen |

### Assignment Files

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/assignments/:assignmentId/files` | Required | List files attached to an assignment |
| `POST` | `/api/assignments/:assignmentId/files` | Required | Register an uploaded file |
| `PATCH` | `/api/assignments/:assignmentId/files/:fileId` | Required | Rename or reclassify |
| `DELETE` | `/api/assignments/:assignmentId/files/:fileId` | Required | Remove |
| `GET` | `/api/assignment-files/:fileId/preview` | Required | Serve file inline (PDF or DOCX→HTML) |
| `GET` | `/api/assignment-files/:fileId/download` | Required | Force-download file |

### Submissions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/submissions/:submissionId` | Submission detail (with rubric scores) |
| `PATCH` | `/api/submissions/:submissionId` | Update grade, status, feedback, flags |
| `POST` | `/api/submissions/:submissionId/file` | Attach a submitted file |
| `DELETE` | `/api/submissions/:submissionId/file` | Remove submitted file |
| `GET` | `/api/assignments/:assignmentId/submissions` | List submissions for an assignment |
| `PATCH` | `/api/assignments/:assignmentId/submissions` | Bulk-update submission order |

### Rubrics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/assignments/:assignmentId/rubric` | Get rubric criteria |
| `PUT` | `/api/assignments/:assignmentId/rubric` | Replace all rubric criteria |
| `GET` | `/api/submissions/:submissionId/rubric-scores` | Get rubric scores for a submission |
| `PUT` | `/api/submissions/:submissionId/rubric-scores` | Replace all rubric scores |

### Feedback Templates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/feedback-templates` | List templates (`courseId` to filter; `null` = global) |
| `POST` | `/api/feedback-templates` | Create |
| `PATCH` | `/api/feedback-templates/:templateId` | Update |
| `DELETE` | `/api/feedback-templates/:templateId` | Delete |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard/summary` | Aggregate metrics (counts + open assignments) |
| `GET` | `/api/dashboard/recent-submissions` | Latest graded/updated submissions |

### Users (admin only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create user (password generated if omitted) |
| `PATCH` | `/api/users/:id` | Update name or role |
| `DELETE` | `/api/users/:id` | Delete user |
| `POST` | `/api/users/:id/reset-password` | Issue a temporary password and revoke existing sessions |

### Import / Export

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/import/students` | Bulk import students from CSV |
| `GET` | `/api/export/gradebook/:courseId` | Course gradebook as CSV |
| `GET` | `/api/export/assignment/:assignmentId` | Assignment grades as CSV |

### Storage

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/storage/uploads/request-url` | Required | Generate a presigned PUT URL (max 50 MB, PDF only) |
| `GET` | `/api/storage/objects/*` | Required | Proxy-serve a private stored object |
| `GET` | `/api/storage/public-objects/*` | Public | Serve a public stored object |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/healthz` | Public | Returns `{ "status": "ok" }` |

---

## Authentication & Authorization

### Session cookie

GradeFlow uses a **JWT stored in an httpOnly cookie** named `gradeflow_token`.

- Issued by `POST /api/auth/login`.
- 30-day TTL; `sameSite: lax`; `secure: true` in production.
- All browser requests automatically include the cookie — no manual token handling needed in the frontend.

### Token versioning

Every JWT carries a `v` field matched against `User.tokenVersion` on every authenticated request. The version is incremented on:

- `POST /api/auth/change-password` — bumps version, re-issues cookie for the current browser, invalidates all other sessions.
- `POST /api/auth/revoke-sessions` — bumps version and clears the cookie, ending all sessions everywhere.
- `POST /api/users/:id/reset-password` (admin) — bumps version, immediately kicking the user out of all browsers.

### Roles

| Role | Capabilities |
|------|-------------|
| `admin` | Full access including all user management endpoints |
| `lecturer` | Full access to courses, assignments, students, and grading |
| `grader` | Grading and feedback; cannot delete courses or students |

The `@Public()` decorator opts a route out of authentication entirely. All other routes require a valid session by default.

### Password reset flow

`POST /api/auth/request-password-reset` always returns `{ ok: true }` regardless of whether the email exists, preventing account enumeration. The server applies a constant-time dummy operation for unknown emails to equalise response timing.

The reset token is stored as a SHA-256 hash; the plaintext is delivered via email (Resend). If `RESEND_API_KEY` is not configured, email sending is silently skipped — admins can issue temporary passwords manually via `POST /api/users/:id/reset-password`.

---

## Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | PK |
| `email` | String | Unique |
| `name` | String | |
| `role` | String | `admin` \| `lecturer` \| `grader` |
| `passwordHash` | String | bcrypt |
| `tokenVersion` | Int | Incremented on password change / session revoke |
| `passwordResetToken` | String? | SHA-256 hash of one-time reset token |
| `passwordResetExpiry` | DateTime? | |
| `createdAt` | DateTime | |

### Course
| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | PK |
| `code` | String | Unique per `term + year` |
| `name` | String | |
| `term` | String | e.g. `אביב`, `קיץ`, `חורף` |
| `year` | Int | |
| `archived` | Boolean | Default `false` |

### Student
| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | PK |
| `externalId` | String | Unique — university student number |
| `firstName` | String | |
| `lastName` | String | |
| `email` | String? | |
| `phone` | String? | |
| `notes` | String? | |

### Assignment
| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | PK |
| `courseId` | Int | FK → Course |
| `name` | String | |
| `description` | String? | |
| `dueDate` | DateTime? | |
| `maxScore` | Decimal | Default `100` |
| `weight` | Decimal | Default `1` |
| `gradingScale` | String | Default `numeric` |
| `closed` | Boolean | Default `false` |

### Submission
| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | PK |
| `assignmentId` | Int | FK → Assignment |
| `studentId` | Int | FK → Student |
| `status` | String | `pending` \| `in_progress` \| `needs_review` \| `graded` \| `returned` \| `missing` |
| `score` | Decimal? | |
| `feedback` | String? | Public feedback visible to the student |
| `privateNotes` | String? | Internal grader notes |
| `originalityFlag` | Boolean | Plagiarism suspect flag |
| `submittedLate` | Boolean | |
| `fileObjectPath` | String? | Backend-agnostic path: `/objects/<key>` |
| `fileName` | String? | Original filename |
| `contentType` | String? | MIME type |
| `fileSize` | Int? | Bytes |
| `gradedById` | Int? | FK → User |
| `submittedAt` | DateTime? | |
| `orderIndex` | Int | Display order within the assignment |

### RubricCriterion
| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | PK |
| `assignmentId` | Int | FK → Assignment |
| `name` | String | |
| `description` | String? | |
| `maxPoints` | Decimal | |
| `weight` | Decimal | Default `1` |
| `orderIndex` | Int | Display order (0-based) |

### RubricScore
| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | PK |
| `submissionId` | Int | FK → Submission |
| `criterionId` | Int | FK → RubricCriterion |
| `points` | Decimal | |
| `comment` | String? | Per-criterion grader note |

### FeedbackTemplate
| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | PK |
| `title` | String | Short label for quick identification |
| `body` | String | Full comment text |
| `category` | String? | Optional grouping label |
| `courseId` | Int? | `null` = global; set = scoped to one course |

### AssignmentFile
| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | PK |
| `assignmentId` | Int | FK → Assignment |
| `name` | String | Display filename |
| `objectPath` | String | Backend-agnostic path: `/objects/<key>` |
| `contentType` | String | MIME type |
| `size` | Int | Bytes |
| `fileType` | String | `instructions` \| `grading_guide` \| `reference` \| `extra` |

---

## Testing

### Backend integration tests (Vitest + Supertest)

```bash
pnpm --filter @workspace/api-server test
# or from the monorepo root:
pnpm test
```

**58 tests across 11 files**, each making real HTTP requests against a live server instance:

| File | Tests | Coverage |
|------|-------|----------|
| `submissions.spec.ts` | 13 | Full grading workflow, file attach/remove |
| `auth.spec.ts` | 7 | Login, logout, change-password, revoke-sessions |
| `assignments.spec.ts` | 6 | CRUD, close, reopen |
| `imports-exports.spec.ts` | 6 | CSV student import, gradebook/assignment export |
| `students.spec.ts` | 6 | CRUD, search, history |
| `rubrics.spec.ts` | 5 | Criterion management, score recording |
| `enrollments.spec.ts` | 4 | Enrol, list, remove |
| `courses.spec.ts` | 3 | CRUD, archive |
| `dashboard.spec.ts` | 3 | Summary metrics, recent activity |
| `storage.spec.ts` | 3 | Presigned upload URL, path normalisation |
| `submission-ordering.spec.ts` | 2 | Bulk submission reorder |

### Frontend E2E tests (Playwright)

```bash
pnpm --filter @workspace/gradeflow test:e2e
```

**12 spec files** covering the full UI:

| Spec | What it tests |
|------|--------------|
| `login.spec.ts` | Login form, auth redirect |
| `dashboard.spec.ts` | Dashboard metrics render |
| `assignments-page.spec.ts` | Assignment list, create, status flows |
| `assignment-rubric.spec.ts` | Rubric builder CRUD |
| `grading-save-next.spec.ts` | Grading workspace, save-and-next flow |
| `grading-mobile.spec.ts` | Grading layout on mobile viewport |
| `course-edit.spec.ts` | Course details edit dialog |
| `students-page.spec.ts` | Student registry, search, edit |
| `pwa.spec.ts` | PWA manifest, install prompt, icons |
| `theme.spec.ts` | Dark/light mode toggle |
| `error-boundary.spec.ts` | Error boundary rendering |
| `not-found.spec.ts` | Unknown route → 404 page |

---

## Demo Accounts

These accounts are seeded automatically on first Docker boot, or by running the seed script manually.

| Email | Password | Role |
|-------|----------|------|
| `admin@gradeflow.app` | `admin123` | Admin |
| `lecturer@gradeflow.app` | `lecturer123` | Lecturer |
| `grader@gradeflow.app` | `grader123` | Grader |

**Change all passwords after first login.**

The seed also creates:
- 3 sample courses (Data Structures, Algorithms, Software Engineering)
- 8 sample students enrolled across the courses
- Sample assignments with due dates, weights, and max scores
- Sample submissions across all grading statuses
- Sample rubric criteria and feedback templates

---

## Development Workflow

### Add a new database column

```bash
# 1. Edit backend/prisma/schema.prisma
# 2. Create and commit the migration SQL
pnpm --filter @workspace/api-server run prisma:migrate -- --name add_<column_name>
# Prisma client is regenerated automatically in the dev workflow
```

### Regenerate the API client after changing endpoints

```bash
pnpm --filter @workspace/api-client-react run generate
```

### Lint

```bash
pnpm --filter @workspace/api-server lint
pnpm --filter @workspace/gradeflow lint
```

### Build for production (without Docker)

```bash
pnpm --filter @workspace/api-server build   # outputs to backend/dist/
pnpm --filter @workspace/gradeflow build    # outputs to frontend/dist/
```

### Rebuild Docker images after code changes

```bash
docker compose up --build
```

## Moodle Student Import

GradeFlow includes a script for importing students from a Moodle participants CSV export.

This is useful when you do not want to manually create students one by one.

---

### What the importer reads

The importer expects a Moodle CSV with these Hebrew headers:

```text
שם פרטי
שם משפחה
מספר זיהוי
דוא"ל
```

These fields are imported into GradeFlow as:

```text
שם פרטי      → firstName
שם משפחה    → lastName
מספר זיהוי  → externalId
דוא"ל        → email
```

Other Moodle columns, such as academic year, department, campus, Hebrew year, and groups, are ignored.

---

### Export from Moodle

From the Moodle participants page:

1. Select the relevant participants.
2. At the bottom export menu, choose CSV:

```text
תסדיר ערכים מופרדים בפסיק (csv)
```

3. Save the file into the local project folder:

```text
imports/
```

Example:

```text
imports/courseid_35716_participants.csv
```

The `imports/` folder is ignored by Git because it may contain real student data.

---

### Make sure Docker is running

```bash
docker compose up -d
```

The local PostgreSQL database is exposed on:

```text
127.0.0.1:5433
```

This allows local scripts to connect to the Docker database from your Mac/PC.

---

### Find the GradeFlow course ID

Run:

```bash
docker compose exec db psql -U gradeflow -d gradeflow -c "select id, code, name, term, year from courses order by id;"
```

Use the correct `id` as `--course-id`.

Example:

```text
 id | code |        name        | term | year
----+------+--------------------+------+------
  1 | 1    | מבוא למדעי המחשב  | סתיו | 2026
```

In this example, the course ID is:

```text
1
```

---

### Dry run first

Always run a dry run before changing the database:

```bash
./scripts/import-moodle-students.sh --file imports/courseid_35716_participants.csv --course-id 1 --dry-run
```

Expected output:

```text
Moodle student import
=====================
Database target: gradeflow@localhost:5433/gradeflow
Parsed students: 8
Skipped non-student rows: 0
Invalid rows: 0
Course ID: 1
Dry run: yes

Dry run complete. No database changes were made.
```

The dry run only parses and validates the CSV. It does not create, update, or enroll students.

---

### Run the real import

After the dry run looks correct, run:

```bash
./scripts/import-moodle-students.sh --file imports/courseid_35716_participants.csv --course-id 1
```

The importer is safe to re-run:

```text
Existing students are updated.
New students are created.
Existing course enrollments are not duplicated.
Students are enrolled into the selected course.
Submission placeholders are created for existing assignments when needed.
```

Example output:

```text
Import completed successfully.
Created students: 5
Updated students: 3
Enrolled students: 8
Created submission placeholders: 0
```

---

### Verify imported students

Run:

```bash
docker compose exec db psql -U gradeflow -d gradeflow -c "select id, external_id, first_name, last_name, email from students order by id desc limit 20;"
```

Verify enrollments for a course:

```bash
docker compose exec db psql -U gradeflow -d gradeflow -c "select count(*) from enrollments where course_id = 1;"
```

Expected result after importing 8 students into course `1`:

```text
 count
-------
     8
```

---

### Remote database import

For a remote PostgreSQL database, override the database URL:

```bash
IMPORT_DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require" \
./scripts/import-moodle-students.sh --file imports/courseid_35716_participants.csv --course-id 1 --dry-run
```

Then run without `--dry-run` when ready:

```bash
IMPORT_DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require" \
./scripts/import-moodle-students.sh --file imports/courseid_35716_participants.csv --course-id 1
```

Be careful when importing into a remote database. Make sure the selected `--course-id` is correct before running the real import.

---

### Privacy note

Do not commit Moodle CSV files to Git.

The following folder is ignored:

```text
imports/
```

This is important because Moodle exports can contain real student names, IDs, and emails.
