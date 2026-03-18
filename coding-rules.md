# coding-rules.md — Non-Negotiable Coding Standards

All agents must read and follow this file completely before writing any code.
The orchestrator will reject PRs that violate these rules.

---

## 1. TypeScript

```ts
// tsconfig.json must include:
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

- **No `any`** — ever. Use `unknown` and narrow it.
- **No non-null assertions** (`!`) — use optional chaining and proper guards.
- **All function parameters and return types** must be explicitly typed.
- **Zod for runtime validation** — every API request body is parsed with a Zod schema.
  Never trust `req.body` directly.
- **Import types** with `import type { Foo }` to avoid runtime overhead.

```ts
// ✅ correct
async function getExercise(id: string): Promise<Exercise | null> {
  return prisma.exercise.findUnique({ where: { id } })
}

// ❌ wrong
async function getExercise(id) {
  return prisma.exercise.findUnique({ where: { id } })
}
```

---

## 2. Next.js App Router

- **Server Components by default** — only add `"use client"` when the component
  uses hooks, browser APIs, or event listeners.
- **Server Actions for mutations** — prefer `action=` over client-side fetch for
  simple form submissions.
- **No client-side data fetching on initial render** — fetch in Server Components,
  pass data as props. Use SWR/React Query only for real-time or polling needs.
- **Route Groups** — use `(auth)`, `(dashboard)` folder grouping. Never put auth
  pages inside the dashboard group.
- **Loading and error boundaries** — every route folder gets `loading.tsx` and
  `error.tsx`.
- **Metadata** — every page exports a `metadata` or `generateMetadata` object.

```ts
// ✅ Server Component — data fetch happens on the server
export default async function ExercisePage({ params }: { params: { id: string } }) {
  const exercise = await getExercise(params.id) // direct DB call, no fetch
  if (!exercise) notFound()
  return <ExerciseView exercise={exercise} />
}

// ❌ wrong — unnecessary client component with useEffect fetch
"use client"
export default function ExercisePage({ params }) {
  const [exercise, setExercise] = useState(null)
  useEffect(() => { fetch(`/api/exercises/${params.id}`).then(...) }, [])
}
```

---

## 3. API Routes

Every API route must follow this exact pattern:

```ts
// app/api/exercises/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// 1. Zod schema at the top
const CreateExerciseSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["MCQ", "FILL_BLANK", "SHORT_ANSWER", "AUDIO_RECORDING", "FILE_UPLOAD"]),
  classId: z.string().uuid(),
  dueDate: z.string().datetime().optional(),
  content: z.record(z.unknown()),
})

export async function POST(req: NextRequest) {
  // 2. Auth check first — always
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 3. Role check
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 4. Parse and validate body
  const body = await req.json()
  const parsed = CreateExerciseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // 5. Business logic
  try {
    const exercise = await prisma.exercise.create({
      data: { ...parsed.data, createdById: session.user.id },
    })
    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    console.error("[POST /api/exercises]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

Rules:
- Auth → Role → Validate → DB → Response. This order is mandatory.
- Always wrap DB calls in try/catch.
- Log errors server-side with a route prefix `[METHOD /api/path]`.
- Never return raw Prisma error messages to the client.
- Return consistent JSON shapes: `{ data: T }` for success, `{ error: string }` for failure.

---

## 4. Database / Prisma

- **No raw SQL** unless Prisma cannot express it (then use `prisma.$queryRaw` with
  tagged template literals only — never string concatenation).
- **Select only needed fields** — use `select: {}` instead of fetching entire models.
- **Transactions for multi-step writes** — use `prisma.$transaction([...])`.
- **No N+1 queries** — always `include` relations in the same query.
- **Migrations only via Prisma** — never alter the DB directly.

```ts
// ✅ correct — select only needed fields, no N+1
const submissions = await prisma.submission.findMany({
  where: { exercise: { classId } },
  select: {
    id: true,
    status: true,
    score: true,
    student: { select: { id: true, name: true } },
  },
})

// ❌ wrong — fetches everything, causes N+1 on student
const submissions = await prisma.submission.findMany({ where: { ... } })
const withStudents = await Promise.all(
  submissions.map(s => prisma.user.findUnique({ where: { id: s.studentId } }))
)
```

---

## 5. Authentication & Authorization

- **`getServerSession(authOptions)`** — use this in every Server Component and API
  route that needs the user. Never pass session from client to server.
- **Middleware guards routes at the edge** — `middleware.ts` is the first line of
  defense, API routes are the second.
- **Never trust client-sent role** — always read role from the server session.
- **Password hashing** — `bcryptjs` with `saltRounds = 12`. Never `bcrypt` (native,
  breaks on Vercel).

```ts
// lib/auth-helpers.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import type { UserRole } from "@/lib/types"

export async function requireSession(role?: UserRole) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (role && session.user.role !== role) redirect("/")
  return session
}
```

---

## 6. File & Component Structure

```
components/
  ui/           ← generic reusable (Button, Input, Badge, Modal)
  exercise-types/ ← one file per exercise type
  teacher/      ← teacher-specific components
  student/      ← student-specific components
```

- **One component per file** — no barrel files with multiple exports.
- **Component naming** — PascalCase files matching the export name.
- **Props interface** directly above the component, named `<ComponentName>Props`.
- **No inline styles** — Tailwind classes only. No `style={{}}` except for dynamic
  values that cannot be expressed as Tailwind classes (e.g. Wavesurfer container height).
- **No hardcoded colors** — use Tailwind design tokens (`text-gray-900`, not `#111827`).

```ts
// ✅ correct component structure
interface ExerciseBadgeProps {
  status: SubmissionStatus
  className?: string
}

export function ExerciseBadge({ status, className }: ExerciseBadgeProps) {
  const colorMap: Record<SubmissionStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    GRADED: "bg-green-100 text-green-800",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[status]} ${className ?? ""}`}>
      {status}
    </span>
  )
}
```

---

## 7. Error Handling

- **Never let errors bubble silently.** Every catch block logs or re-throws.
- **User-facing errors** — show friendly messages, never stack traces.
- **API errors** — always include a status code. Never return 200 with an error body.
- **Not Found** — use Next.js `notFound()` in Server Components, return 404 in API routes.
- **Form errors** — surface via `react-hook-form` field errors, not alert().

---

## 8. Environment Variables

- **Client-safe vars** — prefix with `NEXT_PUBLIC_`. Only Supabase URL and anon key.
- **Server-only vars** — `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`.
  These must NEVER appear in client components.
- **Validate at startup** — create `lib/env.ts` that checks all required vars exist:

```ts
// lib/env.ts — imported in lib/prisma.ts and auth.ts
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
  nextauthSecret: requireEnv("NEXTAUTH_SECRET"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
} as const
```

---

## 9. Styling (Tailwind)

- **Mobile-first** — base styles for mobile, `md:` and `lg:` for larger screens.
- **Consistent spacing** — use the 4/8/12/16/24/32/48 scale. No arbitrary values
  unless truly necessary (`[123px]` is a code smell).
- **Dark mode** — add `dark:` variants for all background and text colors.
- **Accessible focus states** — never remove `focus:ring` or `focus-visible:` styles.
- **Semantic HTML** — `<button>` for buttons, `<a>` for links, `<nav>` for nav,
  `<main>` for main content. No `<div onClick>`.

---

## 10. Audio Feature Rules

- **Never stream audio through Next.js** — always upload directly from browser to
  Supabase Storage using a signed URL.
- **File size limit** — enforce 20MB max both client-side (before upload) and
  server-side (in the signed URL generation endpoint).
- **Accepted formats** — `audio/webm`, `audio/mp4`, `audio/wav`, `audio/mpeg`.
- **Storage path convention** — `audio/{exerciseId}/{studentId}/{timestamp}.webm`
- **Access control** — audio bucket must be private. Generate short-lived (1-hour)
  signed URLs for playback, never expose permanent public URLs.
- **Cleanup** — when a submission is deleted, delete the associated audio file.

---

## 11. Testing

- **Vitest** for unit and integration tests. Jest syntax compatible.
- **Testing Library** for component tests. Never test implementation details.
- **MSW (Mock Service Worker)** for API mocking in component tests.
- **Test file location** — `__tests__/` mirroring the source structure.
- **Naming** — `*.test.ts` for logic, `*.test.tsx` for components.
- **Minimum coverage targets:**
  - `/app/api/**`: 70%
  - `/lib/**`: 80%
  - `/components/**`: 50%

---

## 12. Git Conventions

```
feat: add audio recording component
fix: correct submission status update
chore: update prisma schema for exercise types
test: add api/exercises coverage
refactor: extract auth helper functions
```

- One logical change per commit.
- Never commit `.env.local` or any file with real credentials.
- Each agent's work lands in a branch named `agent/<agent-id>` before merge.
