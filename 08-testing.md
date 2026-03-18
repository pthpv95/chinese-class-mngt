# instructions/08-testing.md
# AGENT-TEST — Testing

## Objective
Write integration and unit tests for all API routes and critical components.
Target ≥ 60% coverage on /app/api/** and /lib/**. Use Vitest + Testing Library + MSW.

---

## Setup

Create `__tests__/setup.ts` (extend existing):
```ts
import "@testing-library/jest-dom"
import { server } from "./mocks/server"
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

Create `__tests__/mocks/server.ts`:
```ts
import { setupServer } from "msw/node"
export const server = setupServer()
```

Create `__tests__/mocks/db.ts` (Prisma mock):
```ts
import { vi } from "vitest"
export const prismaMock = {
  user: { findUnique: vi.fn(), create: vi.fn() },
  class: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
  exercise: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  submission: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn(), count: vi.fn() },
  classEnrollment: { upsert: vi.fn() },
}
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
```

---

## API Tests

### __tests__/api/exercises.test.ts

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/exercises/route"
import { prismaMock } from "../mocks/db"
import { NextRequest } from "next/server"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))
vi.mock("@/auth", () => ({ authOptions: {} }))

const { getServerSession } = await import("next-auth")
const mockGetServerSession = vi.mocked(getServerSession)

const teacherSession = {
  user: { id: "teacher-1", email: "t@t.com", name: "Teacher", role: "TEACHER" as const },
}
const studentSession = {
  user: { id: "student-1", email: "s@s.com", name: "Student", role: "STUDENT" as const },
}

describe("GET /api/exercises", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/exercises"))
    expect(res.status).toBe(401)
  })

  it("returns teacher exercises when authenticated as teacher", async () => {
    mockGetServerSession.mockResolvedValue(teacherSession)
    prismaMock.exercise.findMany.mockResolvedValue([
      { id: "ex-1", title: "Quiz 1", type: "MCQ", published: true, _count: { submissions: 2 } },
    ] as never)
    const res = await GET(new NextRequest("http://localhost/api/exercises"))
    expect(res.status).toBe(200)
    const json = await res.json() as { data: unknown[] }
    expect(json.data).toHaveLength(1)
  })

  it("returns student exercises (published only)", async () => {
    mockGetServerSession.mockResolvedValue(studentSession)
    prismaMock.exercise.findMany.mockResolvedValue([]) 
    const res = await GET(new NextRequest("http://localhost/api/exercises"))
    expect(res.status).toBe(200)
    // Verify findMany was called with published: true filter
    expect(prismaMock.exercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ published: true }) })
    )
  })
})

describe("POST /api/exercises", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns 403 when authenticated as student", async () => {
    mockGetServerSession.mockResolvedValue(studentSession)
    const req = new NextRequest("http://localhost/api/exercises", {
      method: "POST",
      body: JSON.stringify({ title: "Quiz", type: "MCQ", classId: "cls-1", content: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("returns 400 on invalid body", async () => {
    mockGetServerSession.mockResolvedValue(teacherSession)
    const req = new NextRequest("http://localhost/api/exercises", {
      method: "POST",
      body: JSON.stringify({ title: "" }), // missing required fields
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates exercise when teacher and class owned", async () => {
    mockGetServerSession.mockResolvedValue(teacherSession)
    prismaMock.class.findFirst.mockResolvedValue({ id: "cls-1", teacherId: "teacher-1" } as never)
    prismaMock.exercise.create.mockResolvedValue({ id: "ex-new", title: "Quiz 1" } as never)
    const req = new NextRequest("http://localhost/api/exercises", {
      method: "POST",
      body: JSON.stringify({
        title: "Quiz 1",
        type: "MCQ",
        classId: "cls-1",
        content: { questions: [] },
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(prismaMock.exercise.create).toHaveBeenCalledOnce()
  })

  it("returns 404 when teacher doesn't own class", async () => {
    mockGetServerSession.mockResolvedValue(teacherSession)
    prismaMock.class.findFirst.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/exercises", {
      method: "POST",
      body: JSON.stringify({
        title: "Quiz",
        type: "MCQ",
        classId: "cls-other",
        content: {},
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })
})
```

### __tests__/api/submissions.test.ts

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/submissions/route"
import { PATCH } from "@/app/api/submissions/[id]/route"
import { prismaMock } from "../mocks/db"
import { NextRequest } from "next/server"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/auth", () => ({ authOptions: {} }))

const { getServerSession } = await import("next-auth")
const mockSession = vi.mocked(getServerSession)

const teacher = { user: { id: "t1", role: "TEACHER" as const, name: "T", email: "t@t.com" } }
const student = { user: { id: "s1", role: "STUDENT" as const, name: "S", email: "s@s.com" } }

describe("POST /api/submissions", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects teacher submitting", async () => {
    mockSession.mockResolvedValue(teacher)
    const res = await POST(new NextRequest("http://localhost/api/submissions", {
      method: "POST",
      body: JSON.stringify({ exerciseId: "ex-1", textAnswer: "answer" }),
    }))
    expect(res.status).toBe(403)
  })

  it("creates submission for valid student request", async () => {
    mockSession.mockResolvedValue(student)
    prismaMock.exercise.findUnique.mockResolvedValue({ id: "ex-1", published: true } as never)
    prismaMock.submission.upsert.mockResolvedValue({ id: "sub-1", status: "SUBMITTED" } as never)
    const res = await POST(new NextRequest("http://localhost/api/submissions", {
      method: "POST",
      body: JSON.stringify({ exerciseId: "ex-1", textAnswer: "My answer" }),
    }))
    expect(res.status).toBe(201)
  })

  it("returns 404 if exercise not found or unpublished", async () => {
    mockSession.mockResolvedValue(student)
    prismaMock.exercise.findUnique.mockResolvedValue(null)
    const res = await POST(new NextRequest("http://localhost/api/submissions", {
      method: "POST",
      body: JSON.stringify({ exerciseId: "missing", textAnswer: "ans" }),
    }))
    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/submissions/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("allows teacher to grade own exercise submission", async () => {
    mockSession.mockResolvedValue(teacher)
    prismaMock.submission.findUnique.mockResolvedValue({
      id: "sub-1",
      exercise: { createdById: "t1" },
    } as never)
    prismaMock.submission.update.mockResolvedValue({ id: "sub-1", status: "GRADED", score: 90 } as never)
    const res = await PATCH(
      new NextRequest("http://localhost/api/submissions/sub-1", {
        method: "PATCH",
        body: JSON.stringify({ score: 90, teacherComment: "Good work" }),
      }),
      { params: { id: "sub-1" } }
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { data: { score: number } }
    expect(json.data.score).toBe(90)
  })

  it("rejects student from grading", async () => {
    mockSession.mockResolvedValue(student)
    const res = await PATCH(
      new NextRequest("http://localhost/api/submissions/sub-1", {
        method: "PATCH",
        body: JSON.stringify({ score: 90 }),
      }),
      { params: { id: "sub-1" } }
    )
    expect(res.status).toBe(403)
  })
})
```

### __tests__/api/upload.test.ts

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/upload/audio/route"
import { NextRequest } from "next/server"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/supabase", () => ({
  createSupabaseServerClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://supabase.co/upload?token=abc", token: "abc" },
          error: null,
        }),
      }),
    },
  }),
}))

const { getServerSession } = await import("next-auth")
const mockSession = vi.mocked(getServerSession)
const student = { user: { id: "s1", role: "STUDENT" as const, name: "S", email: "s@s.com" } }

describe("POST /api/upload/audio", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects unauthenticated", async () => {
    mockSession.mockResolvedValue(null)
    const res = await POST(new NextRequest("http://localhost/api/upload/audio", {
      method: "POST",
      body: JSON.stringify({ exerciseId: "ex-1", studentId: "s1", mimeType: "audio/webm", fileSizeBytes: 100 }),
    }))
    expect(res.status).toBe(403)
  })

  it("rejects student uploading for another student", async () => {
    mockSession.mockResolvedValue(student)
    const res = await POST(new NextRequest("http://localhost/api/upload/audio", {
      method: "POST",
      body: JSON.stringify({ exerciseId: "ex-1", studentId: "OTHER", mimeType: "audio/webm", fileSizeBytes: 100 }),
    }))
    expect(res.status).toBe(403)
  })

  it("rejects files over 20MB", async () => {
    mockSession.mockResolvedValue(student)
    const res = await POST(new NextRequest("http://localhost/api/upload/audio", {
      method: "POST",
      body: JSON.stringify({ exerciseId: "ex-1", studentId: "s1", mimeType: "audio/webm", fileSizeBytes: 21 * 1024 * 1024 }),
    }))
    expect(res.status).toBe(400)
  })

  it("returns signed URL for valid request", async () => {
    mockSession.mockResolvedValue(student)
    const res = await POST(new NextRequest("http://localhost/api/upload/audio", {
      method: "POST",
      body: JSON.stringify({ exerciseId: "ex-1", studentId: "s1", mimeType: "audio/webm", fileSizeBytes: 500000 }),
    }))
    expect(res.status).toBe(200)
    const json = await res.json() as { data: { signedUrl: string } }
    expect(json.data.signedUrl).toContain("supabase.co")
  })
})
```

---

## Component Tests

### __tests__/components/McqExercise.test.tsx

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { McqExercise } from "@/components/exercise-types/McqExercise"
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const mockContent = {
  questions: [
    { text: "What is 2+2?", options: ["3", "4", "5", "6"], answer: 1 },
    { text: "Capital of France?", options: ["Berlin", "London", "Paris", "Rome"], answer: 2 },
  ],
}

describe("McqExercise", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
  })

  it("renders all questions and options", () => {
    render(<McqExercise exerciseId="ex-1" content={mockContent} existingAnswer={null} readonly={false} />)
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument()
    expect(screen.getByText("Capital of France?")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("Paris")).toBeInTheDocument()
  })

  it("submit button is disabled until all questions answered", () => {
    render(<McqExercise exerciseId="ex-1" content={mockContent} existingAnswer={null} readonly={false} />)
    const btn = screen.getByRole("button", { name: /submit/i })
    expect(btn).toBeDisabled()
  })

  it("enables submit after all questions answered", () => {
    render(<McqExercise exerciseId="ex-1" content={mockContent} existingAnswer={null} readonly={false} />)
    fireEvent.click(screen.getByText("4"))
    fireEvent.click(screen.getByText("Paris"))
    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled()
  })

  it("calls API on submit", async () => {
    render(<McqExercise exerciseId="ex-1" content={mockContent} existingAnswer={null} readonly={false} />)
    fireEvent.click(screen.getByText("4"))
    fireEvent.click(screen.getByText("Paris"))
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/submissions", expect.objectContaining({ method: "POST" }))
    })
  })

  it("renders readonly without submit button", () => {
    render(<McqExercise exerciseId="ex-1" content={mockContent} existingAnswer="[1,2]" readonly={true} />)
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument()
  })
})
```

---

## Run Tests

```bash
npm run test             # single run
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report
```

Expected output:
```
✓ __tests__/api/exercises.test.ts (5)
✓ __tests__/api/submissions.test.ts (5)
✓ __tests__/api/upload.test.ts (4)
✓ __tests__/components/McqExercise.test.tsx (4)

Coverage: Lines 65%, Functions 70%, Branches 62%
```

---

## Completion Checklist

- [ ] All 4 test files written and passing
- [ ] Prisma mock in place
- [ ] MSW server configured
- [ ] Coverage ≥ 60% on API routes
- [ ] `npm test` exits 0

## Handoff Summary
```
AGENT: AGENT-TEST
STATUS: COMPLETE
FILES_CREATED: __tests__/api/exercises.test.ts, __tests__/api/submissions.test.ts,
               __tests__/api/upload.test.ts, __tests__/components/McqExercise.test.tsx,
               __tests__/mocks/server.ts, __tests__/mocks/db.ts
FILES_MODIFIED: __tests__/setup.ts (added MSW hooks)
EXPORTS: prismaMock from __tests__/mocks/db.ts, server from __tests__/mocks/server.ts
NOTES: All tests mock next-auth getServerSession. Tests assume API route pattern:
       { data: T } on success, { error: string } on failure.
```
