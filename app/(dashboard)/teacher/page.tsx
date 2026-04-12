import { requireTeacher } from "@/lib/auth-helpers"
import Link from "next/link"
import { CreateClassForm } from "./CreateClassForm"
import { getTeacherDashboard } from "@/lib/data"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("teacher.dashboard")
  return { title: `${t("myClasses")} — EduFlow` }
}

export default async function TeacherDashboard() {
  const session = await requireTeacher()
  const { classes, pendingGrading } = await getTeacherDashboard(session.user.id)
  const t = await getTranslations("teacher.dashboard")
  const classT = await getTranslations("teacher.class")

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("myClasses")}</h2>
        <div className="flex gap-3">
          {pendingGrading > 0 && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {pendingGrading} {t("toGrade")}
            </span>
          )}
          <CreateClassForm />
        </div>
      </div>

      {classes.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
          <p className="text-sm text-gray-500 mb-3">{t("noClassesYet")}</p>
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
              <span>{cls._count.enrollments} {classT("students")}</span>
              <span>{cls._count.exercises} {classT("exercises")}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

