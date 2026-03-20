import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ExercisesByDate } from "@/components/teacher/ExercisesByDate"
import { CopyInviteLinkButton } from "./CopyInviteLinkButton"

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireTeacher()

  const cls = await prisma.class.findFirst({
    where: { id, teacherId: session.user.id },
    include: {
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { enrolledAt: "asc" },
      },
      exercises: {
        include: {
          submissions: { select: { studentId: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!cls) notFound()

  const students = cls.enrollments.map((e) => e.student)

  const exercises = cls.exercises.map((ex) => ({
    id: ex.id,
    title: ex.title,
    type: ex.type,
    published: ex.published,
    dueDate: ex.dueDate ? ex.dueDate.toISOString() : null,
    createdAt: ex.createdAt.toISOString(),
    submittedStudentIds: ex.submissions
      .filter((s) => s.status === "SUBMITTED")
      .map((s) => s.studentId),
    gradedStudentIds: ex.submissions
      .filter((s) => s.status === "GRADED")
      .map((s) => s.studentId),
  }))

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{cls.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Invite code:{" "}
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-900 dark:text-white text-xs">
              {cls.code}
            </span>
            <span className="ml-2">
              <CopyInviteLinkButton code={cls.code} />
            </span>
            <span className="ml-3 text-gray-400">·</span>
            <span className="ml-3 text-gray-400">{students.length} student{students.length !== 1 ? "s" : ""}</span>
          </p>
        </div>
        <Link
          href={`/teacher/exercises/new?classId=${cls.id}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New exercise
        </Link>
      </div>

      {/* Exercises grouped by date */}
      <ExercisesByDate exercises={exercises} students={students} classId={cls.id} />
    </div>
  )
}
