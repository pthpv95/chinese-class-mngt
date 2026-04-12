import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { CreateSubmissionSchema } from "@/lib/validations"
import { revalidateTag } from "next/cache"

export async function GET(req: NextRequest) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const exerciseId = req.nextUrl.searchParams.get("exerciseId")

  try {
    const submissions =
      session.user.role === "TEACHER"
        ? await prisma.submission.findMany({
            where: {
              exercise: { createdById: session.user.id },
              ...(exerciseId ? { exerciseId } : {}),
            },
            include: {
              student: { select: { id: true, name: true, email: true } },
              exercise: { select: { title: true, type: true } },
            },
            orderBy: { submittedAt: "desc" },
          })
        : await prisma.submission.findMany({
            where: {
              studentId: session.user.id,
              ...(exerciseId ? { exerciseId } : {}),
            },
            include: { exercise: { select: { title: true, type: true } } },
            orderBy: { submittedAt: "desc" },
          })

    return NextResponse.json({ data: submissions })
  } catch (error) {
    console.error("[GET /api/submissions]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getApiSession("STUDENT")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body: unknown = await req.json()
  const parsed = CreateSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: parsed.data.exerciseId, published: true },
      select: { id: true, classId: true, createdById: true },
    })
    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 })
    }

    const submission = await prisma.submission.upsert({
      where: {
        exerciseId_studentId: {
          exerciseId: parsed.data.exerciseId,
          studentId: session.user.id,
        },
      },
      update: {
        status: "SUBMITTED",
        textAnswer: parsed.data.textAnswer ?? null,
        audioUrl: parsed.data.audioUrl ?? null,
        audioDurationSec: parsed.data.audioDurationSec ?? null,
      },
      create: {
        exerciseId: parsed.data.exerciseId,
        studentId: session.user.id,
        status: "SUBMITTED",
        textAnswer: parsed.data.textAnswer ?? null,
        audioUrl: parsed.data.audioUrl ?? null,
        audioDurationSec: parsed.data.audioDurationSec ?? null,
      },
    })
    revalidateTag(`student-exercises-${session.user.id}`)
    revalidateTag(`class-${exercise.classId}`)
    revalidateTag(`teacher-classes-${exercise.createdById}`)
    return NextResponse.json({ data: submission }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/submissions]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
