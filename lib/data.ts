import { prisma } from "@/lib/prisma"
import { cacheLife, cacheTag } from "next/cache"

export async function getTeacherDashboard(teacherId: string) {
  "use cache"
  cacheTag(`teacher-classes-${teacherId}`)
  cacheLife("hours")

  const [classes, pendingGrading] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId },
      include: { _count: { select: { enrollments: true, exercises: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.count({
      where: { status: "SUBMITTED", exercise: { createdById: teacherId } },
    }),
  ])

  return { classes, pendingGrading }
}

export async function getClassDetail(classId: string, teacherId: string) {
  "use cache"
  cacheTag(`class-${classId}`)
  cacheLife("hours")

  return prisma.class.findFirst({
    where: { id: classId, teacherId },
    include: {
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { enrolledAt: "asc" },
      },
      exercises: {
        include: { submissions: { select: { studentId: true, status: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  })
}

export async function getStudentClasses(studentId: string) {
  "use cache"
  cacheTag(`student-exercises-${studentId}`)
  cacheLife("hours")

  return prisma.class.findMany({
    where: { enrollments: { some: { studentId } } },
    select: {
      id: true,
      name: true,
      _count: { select: { exercises: { where: { published: true } } } },
    },
    orderBy: { name: "asc" },
  })
}

export async function getStudentExercises(studentId: string, classId?: string) {
  "use cache"
  cacheTag(`student-exercises-${studentId}`)
  cacheLife("hours")

  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId, ...(classId ? { classId } : {}) },
    select: { classId: true, enrolledAt: true },
  })

  // Tag per class so teacher exercise changes invalidate this student's cache
  for (const e of enrollments) {
    cacheTag(`class-${e.classId}-exercises`)
  }

  const classFilters = enrollments.map((e) => ({
    classId: e.classId,
    createdAt: { gte: e.enrolledAt },
  }))

  return prisma.exercise.findMany({
    where: {
      published: true,
      OR: classFilters.length > 0 ? classFilters : [{ id: "" }],
    },
    include: {
      class: { select: { name: true } },
      submissions: {
        where: { studentId },
        select: { id: true, status: true, score: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}
