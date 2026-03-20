import { requireStudent } from "@/lib/auth-helpers"
import Link from "next/link"
import { getStudentExercises } from "@/lib/data"
import { ExerciseBadge } from "@/components/ui/ExerciseBadge"
import { DueDateCountdown } from "@/components/ui/DueDateCountdown"
import { groupByCreatedAt } from "@/lib/utils"
import type { ExerciseType, SubmissionStatus } from "@/lib/types"

export const metadata = { title: "My Exercises — EduFlow" }

export default async function StudentDashboard() {
  const session = await requireStudent()

  const exercises = await getStudentExercises(session.user.id)

  if (exercises.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">My exercises</h2>
        <div className="text-center py-16 text-gray-500">
          <p className="text-sm">No exercises yet ✨ — ask your teacher for the class code to get started</p>
        </div>
      </div>
    )
  }

  const rows = exercises.map((ex) => ({
    ...ex,
    createdAt: ex.createdAt.toISOString(),
  }))

  const groups = groupByCreatedAt(rows)

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">My exercises</h2>

      <div className="space-y-6">
        {groups.map(({ label, items }) => (
          <div key={label}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                {label}
              </span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            </div>

            <div className="space-y-2">
              {items.map((ex) => {
                const submission = ex.submissions[0]
                const status: SubmissionStatus = submission?.status as SubmissionStatus ?? "PENDING"
                const isGraded = status === "GRADED"

                return (
                  <Link
                    key={ex.id}
                    href={`/student/exercises/${ex.id}`}
                    className="flex items-start sm:items-center gap-3 sm:gap-4 px-3 py-3 sm:px-4 bg-white dark:bg-gray-900 rounded-xl border border-pink-100 dark:border-gray-800 hover:border-pink-300 dark:hover:border-pink-700 transition-colors group"
                  >
                    {/* Type badge — vertically centred with first line on mobile */}
                    <div className="pt-0.5 sm:pt-0 flex-shrink-0">
                      <ExerciseBadge type={ex.type as ExerciseType} />
                    </div>

                    {/* Title + class */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-pink-600 dark:group-hover:text-pink-400">
                        {ex.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{ex.class.name}</p>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end sm:flex-row sm:items-center gap-1.5 sm:gap-3 flex-shrink-0">
                      {isGraded && submission?.score !== null && submission?.score !== undefined && (
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {submission.score}/100
                        </span>
                      )}
                      {!isGraded && ex.dueDate && <DueDateCountdown dueDate={ex.dueDate} />}
                      <ExerciseBadge status={status} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
