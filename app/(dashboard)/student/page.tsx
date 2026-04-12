import { requireStudent } from "@/lib/auth-helpers"
import Link from "next/link"
import { getStudentExercises, getStudentClasses } from "@/lib/data"
import { ExerciseBadge } from "@/components/ui/ExerciseBadge"
import { DueDateCountdown } from "@/components/ui/DueDateCountdown"
import { groupByCreatedAt } from "@/lib/utils"
import type { ExerciseType, SubmissionStatus } from "@/lib/types"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("student.dashboard")
  return { title: `${t("myExercises")} — EduFlow` }
}

interface Props {
  searchParams: Promise<{ classId?: string }>
}

export default async function StudentDashboard({ searchParams }: Props) {
  const session = await requireStudent()
  const t = await getTranslations("student.dashboard")
  const { classId } = await searchParams

  const [classes, exercises] = await Promise.all([
    getStudentClasses(session.user.id),
    getStudentExercises(session.user.id, classId),
  ])

  const activeClassId = classId && classes.some((c) => c.id === classId) ? classId : undefined

  const rows = exercises.map((ex) => ({
    ...ex,
    createdAt: ex.createdAt.toISOString(),
  }))

  const groups = groupByCreatedAt(rows)

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        {t("myExercises")}
      </h2>

      {/* Class tabs */}
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/student"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !activeClassId
                ? "bg-pink-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All classes
          </Link>
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/student?classId=${cls.id}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeClassId === cls.id
                  ? "bg-pink-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {cls.name}
              <span className="ml-1.5 text-xs opacity-70">{cls._count.exercises}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {exercises.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-sm">
            {activeClassId
              ? "No exercises in this class yet."
              : t("noExercises")}
          </p>
        </div>
      )}

      {/* Exercise list */}
      {groups.length > 0 && (
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
                  const status: SubmissionStatus =
                    (submission?.status as SubmissionStatus) ?? "PENDING"
                  const isGraded = status === "GRADED"

                  return (
                    <Link
                      key={ex.id}
                      href={`/student/exercises/${ex.id}`}
                      className="flex items-start sm:items-center gap-3 sm:gap-4 px-3 py-3 sm:px-4 bg-white dark:bg-gray-900 rounded-xl border border-pink-100 dark:border-gray-800 hover:border-pink-300 dark:hover:border-pink-700 transition-colors group"
                    >
                      <div className="pt-0.5 sm:pt-0 flex-shrink-0">
                        <ExerciseBadge type={ex.type as ExerciseType} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-pink-600 dark:group-hover:text-pink-400">
                          {ex.title}
                        </p>
                        {/* Only show class name when viewing "All" */}
                        {!activeClassId && (
                          <p className="text-xs text-gray-500 mt-0.5">{ex.class.name}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end sm:flex-row sm:items-center gap-1.5 sm:gap-3 flex-shrink-0">
                        {isGraded &&
                          submission?.score !== null &&
                          submission?.score !== undefined && (
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {submission.score}/100
                            </span>
                          )}
                        {!isGraded && ex.dueDate && (
                          <DueDateCountdown dueDate={ex.dueDate} />
                        )}
                        <ExerciseBadge status={status} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
