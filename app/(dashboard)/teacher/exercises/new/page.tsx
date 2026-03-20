import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { ExerciseBuilder } from "@/components/teacher/ExerciseBuilder"

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

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">New exercise</h2>
      <ExerciseBuilder classes={classes} defaultClassId={classId ?? undefined} />
    </div>
  )
}
