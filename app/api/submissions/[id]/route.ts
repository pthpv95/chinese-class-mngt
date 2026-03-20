import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { GradeSubmissionSchema } from "@/lib/validations"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, email: true } },
        exercise: {
          select: { title: true, type: true, content: true, createdById: true },
        },
      },
    })
    if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Student can only see their own; teacher must own the exercise
    const canAccess =
      session.user.role === "STUDENT"
        ? submission.studentId === session.user.id
        : submission.exercise.createdById === session.user.id
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    return NextResponse.json({ data: submission })
  } catch (error) {
    console.error("[GET /api/submissions/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body: unknown = await req.json()
  const parsed = GradeSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { exercise: { select: { createdById: true } } },
    })
    if (!submission || submission.exercise.createdById !== session.user.id) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        score: parsed.data.score,
        maxScore: parsed.data.maxScore ?? null,
        teacherComment: parsed.data.teacherComment ?? null,
        status: "GRADED",
        gradedAt: new Date(),
      },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[PATCH /api/submissions/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
