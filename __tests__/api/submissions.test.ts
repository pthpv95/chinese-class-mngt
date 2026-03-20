import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/submissions/route"
import { PATCH } from "@/app/api/submissions/[id]/route"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth-helpers", () => ({ getApiSession: vi.fn() }))

const prismaMock = vi.hoisted(() => ({
  exercise: { findUnique: vi.fn() },
  submission: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const { getApiSession } = await import("@/lib/auth-helpers")
const mockSession = vi.mocked(getApiSession)

const teacher = { user: { id: "t1", role: "TEACHER" as const, name: "T", email: "t@t.com" }, expires: "" }
const student = { user: { id: "s1", role: "STUDENT" as const, name: "S", email: "s@s.com" }, expires: "" }

describe("GET /api/submissions", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when unauthenticated", async () => {
    mockSession.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/submissions"))
    expect(res.status).toBe(401)
  })
})

describe("POST /api/submissions", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects teacher submitting", async () => {
    mockSession.mockResolvedValue(null)
    const res = await POST(
      new NextRequest("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex-1", textAnswer: "answer" }),
      })
    )
    expect(res.status).toBe(403)
  })

  it("creates submission for valid student request", async () => {
    mockSession.mockResolvedValue(student)
    prismaMock.exercise.findUnique.mockResolvedValue({ id: "ex-1", published: true } as never)
    prismaMock.submission.upsert.mockResolvedValue({ id: "sub-1", status: "SUBMITTED" } as never)
    const res = await POST(
      new NextRequest("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "ex-1", textAnswer: "My answer" }),
      })
    )
    expect(res.status).toBe(201)
  })

  it("returns 404 if exercise not found or unpublished", async () => {
    mockSession.mockResolvedValue(student)
    prismaMock.exercise.findUnique.mockResolvedValue(null)
    const res = await POST(
      new NextRequest("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({ exerciseId: "missing", textAnswer: "ans" }),
      })
    )
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
    prismaMock.submission.update.mockResolvedValue({
      id: "sub-1",
      status: "GRADED",
      score: 90,
    } as never)
    const res = await PATCH(
      new NextRequest("http://localhost/api/submissions/sub-1", {
        method: "PATCH",
        body: JSON.stringify({ score: 90, teacherComment: "Good work" }),
      }),
      { params: Promise.resolve({ id: "sub-1" }) }
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { score: number } }
    expect(json.data.score).toBe(90)
  })

  it("rejects student from grading", async () => {
    mockSession.mockResolvedValue(null)
    const res = await PATCH(
      new NextRequest("http://localhost/api/submissions/sub-1", {
        method: "PATCH",
        body: JSON.stringify({ score: 90 }),
      }),
      { params: Promise.resolve({ id: "sub-1" }) }
    )
    expect(res.status).toBe(403)
  })
})
