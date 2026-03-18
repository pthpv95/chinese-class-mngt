import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ExerciseBadge } from "@/components/ui/ExerciseBadge"
import { formatDate } from "@/lib/utils"
import type { ExerciseType } from "@/lib/types"

export default async function ClassDetailPage({ params }: { params: { id: string } }) {
  const session = await requireTeacher()

  const cls = await prisma.class.findFirst({
    where: { id: params.id, teacherId: session.user.id },
    include: {
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
      exercises: {
        include: { _count: { select: { submissions: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!cls) notFound()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{cls.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Invite code:{" "}
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-900 dark:text-white">
              {cls.code}
            </span>
          </p>
        </div>
        <Link
          href={`/teacher/exercises/new?classId=${cls.id}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New exercise
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Exercises */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Exercises</h3>
          {cls.exercises.length === 0 && (
            <p className="text-sm text-gray-400 py-4">No exercises yet.</p>
          )}
          {cls.exercises.map((ex) => (
            <div
              key={ex.id}
              className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <ExerciseBadge type={ex.type as ExerciseType} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {ex.title}
                  </span>
                  {!ex.published && (
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      Draft
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{ex._count.submissions} submitted</span>
                  <Link
                    href={`/teacher/submissions?exerciseId=${ex.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View →
                  </Link>
                </div>
              </div>
              {ex.dueDate && (
                <p className="text-xs text-gray-400 mt-1">Due: {formatDate(ex.dueDate)}</p>
              )}
            </div>
          ))}
        </div>

        {/* Students */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Students ({cls.enrollments.length})
          </h3>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {cls.enrollments.length === 0 && (
              <p className="text-sm text-gray-400 px-4 py-4">
                No students enrolled yet. Share the invite code.
              </p>
            )}
            {cls.enrollments.map((e) => (
              <div key={e.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {e.student.name}
                </p>
                <p className="text-xs text-gray-500">{e.student.email}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
