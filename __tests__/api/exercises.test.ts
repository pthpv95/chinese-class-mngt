import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/exercises/route"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth-helpers", () => ({ getApiSession: vi.fn() }))

const prismaMock = vi.hoisted(() => ({
  exercise: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  class: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const { getApiSession } = await import("@/lib/auth-helpers")
const mockGetApiSession = vi.mocked(getApiSession)

const teacherSession = {
  user: { id: "teacher-1", email: "t@t.com", name: "Teacher", role: "TEACHER" as const },
  expires: "",
}
const studentSession = {
  user: { id: "student-1", email: "s@s.com", name: "Student", role: "STUDENT" as const },
  expires: "",
}

describe("GET /api/exercises", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetApiSession.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/exercises"))
    expect(res.status).toBe(401)
  })

  it("returns teacher exercises when authenticated as teacher", async () => {
    mockGetApiSession.mockResolvedValue(teacherSession)
    prismaMock.exercise.findMany.mockResolvedValue([
      { id: "ex-1", title: "Quiz 1", type: "MCQ", published: true, _count: { submissions: 2 } },
    ] as never)
    const res = await GET(new NextRequest("http://localhost/api/exercises"))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: unknown[] }
    expect(json.data).toHaveLength(1)
  })

  it("returns student exercises (published only)", async () => {
    mockGetApiSession.mockResolvedValue(studentSession)
    prismaMock.exercise.findMany.mockResolvedValue([])
    const res = await GET(new NextRequest("http://localhost/api/exercises"))
    expect(res.status).toBe(200)
    expect(prismaMock.exercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ published: true }) })
    )
  })
})

describe("POST /api/exercises", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 403 when authenticated as student", async () => {
    mockGetApiSession.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/exercises", {
      method: "POST",
      body: JSON.stringify({ title: "Quiz", type: "MCQ", classId: "cls-1", content: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("returns 400 on invalid body", async () => {
    mockGetApiSession.mockResolvedValue(teacherSession)
    const req = new NextRequest("http://localhost/api/exercises", {
      method: "POST",
      body: JSON.stringify({ title: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates exercise when teacher and class owned", async () => {
    mockGetApiSession.mockResolvedValue(teacherSession)
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
    mockGetApiSession.mockResolvedValue(teacherSession)
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
