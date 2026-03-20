import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { ExerciseBuilder } from "@/components/teacher/ExerciseBuilder"
import Link from "next/link"

export const metadata = { title: "New Exercise — EduFlow" }

export default async function NewExercisePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId } = await searchParams
  const session = await requireTeacher()

  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    select: { id: true, name: true },
  })

  const backHref = classId ? `/teacher/classes/${classId}` : "/teacher"

  return (
    <div className="max-w-2xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-5 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Back
      </Link>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">New exercise</h2>
      <ExerciseBuilder classes={classes} defaultClassId={classId ?? undefined} />
    </div>
  )
}
