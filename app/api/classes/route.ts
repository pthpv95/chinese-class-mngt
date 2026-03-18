import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { CreateClassSchema } from "@/lib/validations"

export async function GET() {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const classes =
      session.user.role === "TEACHER"
        ? await prisma.class.findMany({
            where: { teacherId: session.user.id },
            include: { _count: { select: { enrollments: true, exercises: true } } },
            orderBy: { createdAt: "desc" },
          })
        : await prisma.class.findMany({
            where: { enrollments: { some: { studentId: session.user.id } } },
            include: {
              teacher: { select: { name: true } },
              _count: { select: { exercises: true } },
            },
            orderBy: { createdAt: "desc" },
          })

    return NextResponse.json({ data: classes })
  } catch (error) {
    console.error("[GET /api/classes]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body: unknown = await req.json()
  const parsed = CreateClassSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const newClass = await prisma.class.create({
      data: { name: parsed.data.name, teacherId: session.user.id },
    })
    return NextResponse.json({ data: newClass }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/classes]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
