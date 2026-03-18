# instructions/09-deployment.md
# AGENT-DEPLOY — Production Deployment

## Objective
Prepare the project for Vercel deployment, set up CI/CD, apply Supabase RLS,
and write a complete README. The build must succeed with zero errors.

---

## Step 1 — Pre-deployment Validation

Run all of these and fix any errors before proceeding:

```bash
npx prisma validate
npx tsc --noEmit
npm run lint
npm test
npm run build
```

All must exit 0. Do not proceed to any other step until they do.

---

## Step 2 — vercel.json

```json
{
  "buildCommand": "npx prisma generate && next build",
  "framework": "nextjs",
  "regions": ["sin1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "DIRECT_URL": "@direct-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "NEXTAUTH_URL": "@nextauth-url",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key"
  }
}
```

---

## Step 3 — GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  DIRECT_URL: ${{ secrets.DIRECT_URL }}
  NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
  NEXTAUTH_URL: http://localhost:3000
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm run test:coverage

      - name: Build
        run: npm run build
```

---

## Step 4 — Supabase RLS Policies

Create `supabase/rls-policies.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- USERS: users can read their own record
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- CLASSES: teacher sees own classes, student sees enrolled classes
CREATE POLICY "classes_teacher_all" ON classes
  FOR ALL USING (auth.uid()::text = teacher_id);

CREATE POLICY "classes_student_select" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_id = classes.id AND student_id = auth.uid()::text
    )
  );

-- CLASS ENROLLMENTS
CREATE POLICY "enrollments_teacher_select" ON class_enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()::text)
  );

CREATE POLICY "enrollments_student_own" ON class_enrollments
  FOR ALL USING (student_id = auth.uid()::text);

-- EXERCISES: teacher CRUD own, student select published in enrolled classes
CREATE POLICY "exercises_teacher_all" ON exercises
  FOR ALL USING (created_by_id = auth.uid()::text);

CREATE POLICY "exercises_student_select" ON exercises
  FOR SELECT USING (
    published = true AND
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_id = exercises.class_id AND student_id = auth.uid()::text
    )
  );

-- SUBMISSIONS: student own, teacher reads submissions on their exercises
CREATE POLICY "submissions_student_own" ON submissions
  FOR ALL USING (student_id = auth.uid()::text);

CREATE POLICY "submissions_teacher_select" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exercises
      WHERE id = submissions.exercise_id AND created_by_id = auth.uid()::text
    )
  );

CREATE POLICY "submissions_teacher_update" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM exercises
      WHERE id = submissions.exercise_id AND created_by_id = auth.uid()::text
    )
  );

-- NOTE: The Next.js app uses the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- These policies protect direct database access (e.g. Supabase Studio, direct queries).
-- The app enforces its own role checks in every API route.
```

---

## Step 5 — next.config.ts (Production Hardening)

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", process.env.NEXTAUTH_URL ?? ""] },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
}

export default nextConfig
```

---

## Step 6 — README.md

```markdown
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
```

---

## Step 7 — Final Build Verification

```bash
# Clean build
rm -rf .next
npm run build

# Check output for:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# Route (app) — all routes listed
```

If build fails:
1. Read the error carefully
2. Fix the source file
3. Re-run `npx tsc --noEmit` to find type errors
4. Re-run `npm run build`

Do NOT ship with build warnings treated as errors.

---

## Completion Checklist

- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm test` passes with ≥ 60% coverage
- [ ] `vercel.json` created
- [ ] `.github/workflows/ci.yml` created
- [ ] `supabase/rls-policies.sql` created
- [ ] `next.config.ts` has security headers
- [ ] `README.md` complete with setup instructions

## Handoff Summary
```
AGENT: AGENT-DEPLOY
STATUS: COMPLETE
FILES_CREATED: vercel.json, .github/workflows/ci.yml,
               supabase/rls-policies.sql, README.md
FILES_MODIFIED: next.config.ts (security headers + image domains)
EXPORTS: none
NOTES: RLS policies protect direct DB access. App still enforces its own role
       checks in every API route independently of RLS.
       NEXTAUTH_URL must be set to the Vercel deployment URL in production.
       Run "prisma migrate deploy" (not dev) in production.
```
