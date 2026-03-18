import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { JoinClassSchema } from "@/lib/validations"

// Student joins a class by code
export async function POST(req: NextRequest) {
  const session = await getApiSession("STUDENT")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body: unknown = await req.json()
  const parsed = JoinClassSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const cls = await prisma.class.findUnique({ where: { code: parsed.data.code } })
    if (!cls) {
      return NextResponse.json({ error: "Class not found. Check the code." }, { status: 404 })
    }

    const enrollment = await prisma.classEnrollment.upsert({
      where: {
        classId_studentId: { classId: cls.id, studentId: session.user.id },
      },
      update: {},
      create: { classId: cls.id, studentId: session.user.id },
    })
    return NextResponse.json({ data: enrollment }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/classes/:id/students]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
