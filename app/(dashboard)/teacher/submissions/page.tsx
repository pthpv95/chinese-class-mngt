import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ExerciseBadge } from "@/components/ui/ExerciseBadge"
import { formatDate } from "@/lib/utils"
import type { ExerciseType } from "@/lib/types"

export default async function SubmissionsListPage({
  searchParams,
}: {
  searchParams: Promise<{ exerciseId?: string }>
}) {
  const session = await requireTeacher()
  const { exerciseId } = await searchParams

  if (!exerciseId) notFound()

  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, createdById: session.user.id },
  })

  if (!exercise) notFound()

  const submissions = await prisma.submission.findMany({
    where: { exerciseId },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  })

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ExerciseBadge type={exercise.type as ExerciseType} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{exercise.title}</h2>
        </div>
        <p className="text-sm text-gray-500">{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</p>
      </div>

      {submissions.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No submissions yet.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {sub.student.name}
                </p>
                <p className="text-xs text-gray-500">{sub.student.email}</p>
                {sub.submittedAt && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Submitted {formatDate(sub.submittedAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    sub.status === "GRADED"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {sub.status === "GRADED" ? `${sub.score ?? "—"} pts` : "Pending"}
                </span>
                <Link
                  href={`/teacher/submissions/${sub.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Review →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
