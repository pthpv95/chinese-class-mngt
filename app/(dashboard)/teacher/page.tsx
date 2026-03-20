import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { CreateClassForm } from "./CreateClassForm"

export const metadata = { title: "Teacher Dashboard — EduFlow" }

export default async function TeacherDashboard() {
  const session = await requireTeacher()

  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    include: {
      _count: { select: { enrollments: true, exercises: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const pendingGrading = await prisma.submission.count({
    where: {
      status: "SUBMITTED",
      exercise: { createdById: session.user.id },
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My classes</h2>
        <div className="flex gap-3">
          {pendingGrading > 0 && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {pendingGrading} to grade
            </span>
          )}
          <CreateClassForm />
        </div>
      </div>

      {classes.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
          <p className="text-sm text-gray-500 mb-3">No classes yet. Create your first one.</p>
          <CreateClassForm />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.map((cls) => (
          <Link
            key={cls.id}
            href={`/teacher/classes/${cls.id}`}
            className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">{cls.name}</h3>
              <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {cls.code}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>{cls._count.enrollments} students</span>
              <span>{cls._count.exercises} exercises</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

