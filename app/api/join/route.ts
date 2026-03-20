import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { updateTag } from "next/cache"

const RegisterAndJoinSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = RegisterAndJoinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { code, name, email, password } = parsed.data

  const cls = await prisma.class.findUnique({ where: { code } })
  if (!cls) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in." },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "STUDENT" },
  })

  await prisma.classEnrollment.create({
    data: { classId: cls.id, studentId: user.id },
  })

  updateTag(`class-${cls.id}`)
  updateTag(`student-exercises-${user.id}`)
  updateTag(`teacher-classes-${cls.teacherId}`)
  return NextResponse.json({ ok: true })
}
