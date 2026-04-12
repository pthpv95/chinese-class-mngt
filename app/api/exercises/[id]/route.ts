import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { UpdateExerciseSchema } from "@/lib/validations"
import type { Prisma } from "@prisma/client"
import { revalidateTag } from "next/cache"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: { class: { select: { name: true } } },
    })
    if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!exercise.published && session.user.role === "STUDENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ data: exercise })
  } catch (error) {
    console.error("[GET /api/exercises/:id]", error)
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
  const parsed = UpdateExerciseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const exercise = await prisma.exercise.findFirst({
      where: { id, createdById: session.user.id },
    })
    if (!exercise) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })
    }

    const updated = await prisma.exercise.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
        ...(parsed.data.content !== undefined ? { content: parsed.data.content as Prisma.InputJsonValue } : {}),
        ...(parsed.data.published !== undefined ? { published: parsed.data.published } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description ?? null } : {}),
        ...(parsed.data.dueDate !== undefined ? { dueDate: new Date(parsed.data.dueDate) } : {}),
      },
    })
    revalidateTag(`class-${exercise.classId}`)
    revalidateTag(`class-${exercise.classId}-exercises`)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[PATCH /api/exercises/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const exercise = await prisma.exercise.findFirst({
      where: { id, createdById: session.user.id },
    })
    if (!exercise) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })
    }

    await prisma.exercise.delete({ where: { id } })
    revalidateTag(`class-${exercise.classId}`)
    revalidateTag(`class-${exercise.classId}-exercises`)
    revalidateTag(`teacher-classes-${session.user.id}`)
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("[DELETE /api/exercises/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
