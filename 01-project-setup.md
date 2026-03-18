# instructions/01-project-setup.md
# AGENT-SETUP — Project Initialization

## Objective
Bootstrap the entire Next.js project from zero. All other agents depend on your output.
Complete every step before reporting done.

---

## Step 1 — Scaffold Next.js App

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
```

---

## Step 2 — Install All Dependencies

```bash
npm install \
  next-auth@beta \
  @auth/prisma-adapter \
  prisma \
  @prisma/client \
  @supabase/supabase-js \
  bcryptjs \
  zod \
  react-hook-form \
  @hookform/resolvers \
  zustand \
  recordrtc \
  wavesurfer.js \
  date-fns \
  clsx \
  tailwind-merge

npm install --save-dev \
  @types/bcryptjs \
  @types/recordrtc \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  msw \
  @types/node \
  prisma
```

---

## Step 3 — tsconfig.json (strict)

Replace the default tsconfig.json with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Step 4 — Environment Variables Template

Create `.env.local.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run-openssl-rand-base64-32
```

Copy to `.env.local` for development (do NOT commit `.env.local`).
Add `.env.local` to `.gitignore`.

---

## Step 5 — Prisma Init

```bash
npx prisma init --datasource-provider postgresql
```

Update `prisma/schema.prisma` datasource block only (schema populated by AGENT-DB):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

## Step 6 — Core Library Files

### lib/env.ts
```ts
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
  nextauthSecret: requireEnv("NEXTAUTH_SECRET"),
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
} as const
```

### lib/prisma.ts
```ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query"] : [] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### lib/supabase.ts
```ts
import { createClient } from "@supabase/supabase-js"

// Client-side (anon key — safe for browser)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server-side (service role — never expose to client)
export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

### lib/types.ts
```ts
export type UserRole = "TEACHER" | "STUDENT"
export type ExerciseType =
  | "MCQ"
  | "FILL_BLANK"
  | "SHORT_ANSWER"
  | "AUDIO_RECORDING"
  | "FILE_UPLOAD"
export type SubmissionStatus = "PENDING" | "SUBMITTED" | "GRADED"

// Exercise content shapes
export interface McqContent {
  questions: Array<{
    text: string
    options: string[]
    answer: number // index of correct option
  }>
}

export interface FillBlankContent {
  template: string // "The capital of ___ is ___."
  answers: string[]
}

export interface ShortAnswerContent {
  prompt: string
  sampleAnswer?: string
}

export interface AudioRecordingContent {
  prompt: string
  maxDurationSec: number
  allowUpload: boolean
}

export type ExerciseContent =
  | McqContent
  | FillBlankContent
  | ShortAnswerContent
  | AudioRecordingContent

// Component prop shapes (used by AGENT-STUDENT and AGENT-TEACHER)
export interface ExerciseListItem {
  id: string
  title: string
  type: ExerciseType
  dueDate: Date | null
  submissionStatus: SubmissionStatus | null
  className: string
}

export interface SubmissionListItem {
  id: string
  studentName: string
  exerciseTitle: string
  status: SubmissionStatus
  score: number | null
  submittedAt: Date | null
}
```

### lib/utils.ts
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
```

### lib/mock-data.ts
```ts
import type { ExerciseListItem, SubmissionListItem } from "@/lib/types"

export const mockClass = {
  id: "cls_mock_1",
  name: "English 101",
  code: "ENG101",
  teacherName: "Ms. Johnson",
  studentCount: 24,
}

export const mockExercises: ExerciseListItem[] = [
  {
    id: "ex_mock_1",
    title: "Vocabulary Quiz — Chapter 3",
    type: "MCQ",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    submissionStatus: null,
    className: "English 101",
  },
  {
    id: "ex_mock_2",
    title: "Pronunciation Practice",
    type: "AUDIO_RECORDING",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    submissionStatus: "SUBMITTED",
    className: "English 101",
  },
  {
    id: "ex_mock_3",
    title: "Fill in the Blanks — Tenses",
    type: "FILL_BLANK",
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    submissionStatus: "GRADED",
    className: "English 101",
  },
]

export const mockSubmissions: SubmissionListItem[] = [
  { id: "sub_1", studentName: "Alice Nguyen", exerciseTitle: "Vocab Quiz", status: "GRADED", score: 85, submittedAt: new Date() },
  { id: "sub_2", studentName: "Bob Tran", exerciseTitle: "Vocab Quiz", status: "SUBMITTED", score: null, submittedAt: new Date() },
  { id: "sub_3", studentName: "Carol Le", exerciseTitle: "Vocab Quiz", status: "PENDING", score: null, submittedAt: null },
]
```

---

## Step 7 — Directory Skeletons

Create empty placeholder files to prevent import errors during parallel development:

```bash
mkdir -p app/(auth)/login
mkdir -p app/(dashboard)/student/exercises/[id]
mkdir -p app/(dashboard)/teacher/classes/[id]
mkdir -p app/(dashboard)/teacher/exercises/new
mkdir -p app/(dashboard)/teacher/submissions/[id]
mkdir -p app/api/auth/[...nextauth]
mkdir -p app/api/classes/[id]/students
mkdir -p app/api/exercises/[id]
mkdir -p app/api/submissions/[id]
mkdir -p app/api/upload/audio
mkdir -p components/ui
mkdir -p components/exercise-types
mkdir -p components/teacher
mkdir -p components/student
mkdir -p hooks
mkdir -p __tests__/api
mkdir -p __tests__/components
mkdir -p supabase
mkdir -p prisma
```

---

## Step 8 — Vitest Config

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: { lines: 60, functions: 60, branches: 60, statements: 60 },
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
})
```

Create `__tests__/setup.ts`:

```ts
import "@testing-library/jest-dom"
```

---

## Step 9 — Package.json Scripts

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

---

## Completion Checklist

- [ ] `npm install` succeeds with 0 errors
- [ ] `npx tsc --noEmit` passes (no app code yet, should pass on boilerplate)
- [ ] All files in lib/ created
- [ ] All directory skeletons created
- [ ] `.env.local.example` committed, `.env.local` in .gitignore
- [ ] `vitest.config.ts` created
- [ ] `package.json` scripts complete

## Handoff Summary
```
AGENT: AGENT-SETUP
STATUS: COMPLETE
FILES_CREATED: package.json, tsconfig.json, lib/types.ts, lib/prisma.ts,
               lib/supabase.ts, lib/utils.ts, lib/env.ts, lib/mock-data.ts,
               vitest.config.ts, __tests__/setup.ts, .env.local.example
FILES_MODIFIED: prisma/schema.prisma (datasource block only)
EXPORTS: All types from lib/types.ts, prisma from lib/prisma.ts,
         supabaseClient and createSupabaseServerClient from lib/supabase.ts
NOTES: Directory skeletons created. All agents may now start concurrently in Wave 1.
```
