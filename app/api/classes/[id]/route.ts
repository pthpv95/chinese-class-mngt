import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const cls = await prisma.class.findUnique({
      where: { id: params.id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        enrollments: {
          include: { student: { select: { id: true, name: true, email: true } } },
        },
        exercises: { where: { published: true }, orderBy: { dueDate: "asc" } },
      },
    })
    if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data: cls })
  } catch (error) {
    console.error("[GET /api/classes/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const cls = await prisma.class.findUnique({ where: { id: params.id } })
    if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (cls.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.class.delete({ where: { id: params.id } })
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("[DELETE /api/classes/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
