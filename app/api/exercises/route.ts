import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { CreateExerciseSchema } from "@/lib/validations"
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const classId = req.nextUrl.searchParams.get("classId")

  try {
    const exercises =
      session.user.role === "TEACHER"
        ? await prisma.exercise.findMany({
            where: {
              createdById: session.user.id,
              ...(classId ? { classId } : {}),
            },
            include: { _count: { select: { submissions: true } } },
            orderBy: { createdAt: "desc" },
          })
        : await prisma.exercise.findMany({
            where: {
              published: true,
              class: { enrollments: { some: { studentId: session.user.id } } },
              ...(classId ? { classId } : {}),
            },
            include: {
              submissions: {
                where: { studentId: session.user.id },
                select: { id: true, status: true, score: true },
              },
            },
            orderBy: { dueDate: "asc" },
          })

    return NextResponse.json({ data: exercises })
  } catch (error) {
    console.error("[GET /api/exercises]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body: unknown = await req.json()
  const parsed = CreateExerciseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    // Verify teacher owns the class
    const cls = await prisma.class.findFirst({
      where: { id: parsed.data.classId, teacherId: session.user.id },
    })
    if (!cls) {
      return NextResponse.json({ error: "Class not found or access denied" }, { status: 404 })
    }

    const exercise = await prisma.exercise.create({
      data: {
        title: parsed.data.title,
        type: parsed.data.type,
        classId: parsed.data.classId,
        content: parsed.data.content as Prisma.InputJsonValue,
        createdById: session.user.id,
        description: parsed.data.description ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      },
    })
    return NextResponse.json({ data: exercise }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/exercises]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
