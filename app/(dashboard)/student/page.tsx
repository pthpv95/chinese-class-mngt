import { requireStudent } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ExerciseBadge } from "@/components/ui/ExerciseBadge"
import { DueDateCountdown } from "@/components/ui/DueDateCountdown"
import { formatDate } from "@/lib/utils"
import type { ExerciseType, SubmissionStatus } from "@/lib/types"

export const metadata = { title: "My Exercises — EduFlow" }

export default async function StudentDashboard() {
  const session = await requireStudent()

  const exercises = await prisma.exercise.findMany({
    where: {
      published: true,
      class: { enrollments: { some: { studentId: session.user.id } } },
    },
    include: {
      class: { select: { name: true } },
      submissions: {
        where: { studentId: session.user.id },
        select: { id: true, status: true, score: true },
      },
    },
    orderBy: { dueDate: "asc" },
  })

  const pending = exercises.filter(
    (e) => !e.submissions[0] || e.submissions[0].status === "SUBMITTED"
  )
  const completed = exercises.filter((e) => e.submissions[0]?.status === "GRADED")

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">My exercises</h2>

      {pending.length === 0 && completed.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-sm">
            No exercises yet. Ask your teacher for the class code to join.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((ex) => (
              <Link
                key={ex.id}
                href={`/student/exercises/${ex.id}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ExerciseBadge type={ex.type as ExerciseType} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {ex.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{ex.class.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {ex.dueDate && <DueDateCountdown dueDate={ex.dueDate} />}
                  <ExerciseBadge
                    status={(ex.submissions[0]?.status ?? "PENDING") as SubmissionStatus}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Graded ({completed.length})
          </h3>
          <div className="space-y-3">
            {completed.map((ex) => (
              <Link
                key={ex.id}
                href={`/student/exercises/${ex.id}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ExerciseBadge type={ex.type as ExerciseType} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {ex.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ex.class.name} · {ex.dueDate ? formatDate(ex.dueDate) : "No due date"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ex.submissions[0]?.score !== null && ex.submissions[0]?.score !== undefined && (
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {ex.submissions[0].score}/100
                    </span>
                  )}
                  <ExerciseBadge status="GRADED" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
