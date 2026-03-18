# EduFlow — E-Learning Homework App

A full-stack Next.js 14 app for managing homework exercises between teachers and students.
Supports multiple exercise types including voice recording.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Auth**: NextAuth.js v5 (credentials + JWT)
- **Database**: PostgreSQL (Supabase) via Prisma ORM
- **Storage**: Supabase Storage (audio files)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd eduflow
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local`:
- Create a project at [supabase.com](https://supabase.com)
- Copy the PostgreSQL connection string
- Generate a NextAuth secret: `openssl rand -base64 32`

### 3. Database setup

```bash
# Run migration
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed with demo data
npm run db:seed
```

### 4. Supabase Storage

In your Supabase project's SQL editor, run `supabase/storage-setup.sql`.

Optionally apply RLS policies from `supabase/rls-policies.sql`.

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Teacher | teacher@demo.com | password123 |
| Student | alice@demo.com | password123 |
| Student | bob@demo.com | password123 |

## Deployment to Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local.example`
4. Set build command to: `npx prisma generate && next build`
5. Deploy

After first deploy, run migrations against your production database:
```bash
DATABASE_URL=<production-url> npx prisma migrate deploy
DATABASE_URL=<production-url> npm run db:seed
```

## Project Structure

```
app/
  (auth)/login          — Login page
  (dashboard)/
    layout.tsx          — Shared sidebar layout
    student/            — Student pages
    teacher/            — Teacher pages
  api/                  — REST API routes
components/
  exercise-types/       — MCQ, Fill Blank, Short Answer, Audio
  teacher/              — Exercise builder, submission reviewer
  ui/                   — Shared UI components
hooks/
  useAudioRecorder.ts   — RecordRTC wrapper
  useAudioPlayer.ts     — Wavesurfer wrapper
lib/
  types.ts              — Shared TypeScript types
  prisma.ts             — Prisma client singleton
  supabase.ts           — Supabase client
  auth-helpers.ts       — Server-side auth utilities
  validations.ts        — Zod schemas
prisma/
  schema.prisma         — Database schema
  seed.ts               — Demo data seeder
supabase/
  storage-setup.sql     — Bucket creation
  rls-policies.sql      — Row-level security
__tests__/              — Vitest tests
```

## Running Tests

```bash
npm test                 # Run all tests
npm run test:coverage    # With coverage report
```
