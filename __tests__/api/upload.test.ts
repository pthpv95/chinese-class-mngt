import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/upload/audio/route"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth-helpers", () => ({ getApiSession: vi.fn() }))
vi.mock("@/lib/storage", () => ({
  createPresignedUploadUrl: vi.fn().mockResolvedValue({
    signedUrl: "http://localhost:9000/audio/test.webm?X-Amz-Signature=abc",
    filePath: "audio/ex-1/s1/123.webm",
  }),
}))

const { getApiSession } = await import("@/lib/auth-helpers")
const mockSession = vi.mocked(getApiSession)
const student = { user: { id: "s1", role: "STUDENT" as const, name: "S", email: "s@s.com" }, expires: "" }

describe("POST /api/upload/audio", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects unauthenticated", async () => {
    mockSession.mockResolvedValue(null)
    const res = await POST(
      new NextRequest("http://localhost/api/upload/audio", {
        method: "POST",
        body: JSON.stringify({
          exerciseId: "ex-1",
          studentId: "s1",
          mimeType: "audio/webm",
          fileSizeBytes: 100,
        }),
      })
    )
    expect(res.status).toBe(403)
  })

  it("rejects student uploading for another student", async () => {
    mockSession.mockResolvedValue(student)
    const res = await POST(
      new NextRequest("http://localhost/api/upload/audio", {
        method: "POST",
        body: JSON.stringify({
          exerciseId: "ex-1",
          studentId: "OTHER",
          mimeType: "audio/webm",
          fileSizeBytes: 100,
        }),
      })
    )
    expect(res.status).toBe(403)
  })

  it("rejects files over 20MB", async () => {
    mockSession.mockResolvedValue(student)
    const res = await POST(
      new NextRequest("http://localhost/api/upload/audio", {
        method: "POST",
        body: JSON.stringify({
          exerciseId: "ex-1",
          studentId: "s1",
          mimeType: "audio/webm",
          fileSizeBytes: 21 * 1024 * 1024,
        }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("returns signed URL for valid request", async () => {
    mockSession.mockResolvedValue(student)
    const res = await POST(
      new NextRequest("http://localhost/api/upload/audio", {
        method: "POST",
        body: JSON.stringify({
          exerciseId: "ex-1",
          studentId: "s1",
          mimeType: "audio/webm",
          fileSizeBytes: 500000,
        }),
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { signedUrl: string; filePath: string } }
    expect(json.data.signedUrl).toContain("X-Amz-Signature")
    expect(json.data.filePath).toContain("audio/")
  })
})
