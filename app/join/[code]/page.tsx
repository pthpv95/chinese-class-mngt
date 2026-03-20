import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { JoinForm } from "./JoinForm"

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const cls = await prisma.class.findUnique({
    where: { code },
    select: { id: true, name: true, code: true },
  })
  if (!cls) notFound()

  const session = await auth()

  if (session?.user) {
    if (session.user.role === "TEACHER") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-gray-950 px-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-pink-100 dark:border-gray-800 p-8 text-center">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You are signed in as a teacher and cannot join a class as a student.
            </p>
            <a
              href="/teacher"
              className="text-sm text-pink-500 hover:underline"
            >
              Go to your dashboard
            </a>
          </div>
        </div>
      )
    }

    // Logged-in student → auto-join and redirect
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId: cls.id, studentId: session.user.id } },
      create: { classId: cls.id, studentId: session.user.id },
      update: {},
    })
    redirect("/student")
  }

  return <JoinForm classCode={cls.code} className={cls.name} />
}
