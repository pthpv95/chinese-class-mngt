import { prisma } from "@/lib/prisma"
import { CreateExerciseSchema } from "@/lib/validations"
import type { Prisma } from "@prisma/client"
import { updateTag } from "next/cache"

const READ_ONLY_TOOLS = new Set(["list_classes"])

export function isReadOnlyTool(name: string): boolean {
  return READ_ONLY_TOOLS.has(name)
}

export async function executeReadOnlyTool(
  name: string,
  teacherId: string,
  _input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "list_classes":
      return executeListClasses(teacherId)
    default:
      return { error: `Unknown read-only tool: ${name}` }
  }
}

export async function executeMutatingTool(
  name: string,
  teacherId: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  switch (name) {
    case "create_exercise":
      return executeCreateExercise(teacherId, input)
    case "add_student_to_class":
      return executeAddStudentToClass(teacherId, input)
    default:
      return { success: false, error: `Unknown tool: ${name}` }
  }
}

async function executeListClasses(teacherId: string) {
  const classes = await prisma.class.findMany({
    where: { teacherId },
    select: {
      id: true,
      name: true,
      code: true,
      _count: {
        select: {
          enrollments: true,
          exercises: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return classes.map((cls) => ({
    id: cls.id,
    name: cls.name,
    code: cls.code,
    studentCount: cls._count.enrollments,
    exerciseCount: cls._count.exercises,
  }))
}

async function executeCreateExercise(
  teacherId: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  // Validate input with existing schema
  const parsed = CreateExerciseSchema.safeParse({
    title: input.title,
    type: input.type,
    classId: input.classId,
    description: input.description,
    dueDate: input.dueDate,
    content: input.content,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors.toString() }
  }

  // Verify teacher owns the class
  const cls = await prisma.class.findFirst({
    where: { id: parsed.data.classId, teacherId },
  })

  if (!cls) {
    return { success: false, error: "Class not found or access denied" }
  }

  // Create exercise as draft
  const exercise = await prisma.exercise.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      classId: parsed.data.classId,
      content: parsed.data.content as Prisma.InputJsonValue,
      createdById: teacherId,
      description: parsed.data.description ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      published: false, // Always draft — teacher reviews before publishing
    },
  })

  return {
    success: true,
    data: {
      id: exercise.id,
      title: exercise.title,
      type: exercise.type,
      classId: exercise.classId,
      published: exercise.published,
    },
  }
}

async function executeAddStudentToClass(
  teacherId: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const classId = input.classId as string | undefined
  const email = input.email as string | undefined
  const studentId = input.studentId as string | undefined

  if (!classId) return { success: false, error: "classId is required" }
  if (!email && !studentId) return { success: false, error: "Provide either email or studentId" }

  // Verify teacher owns the class
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId },
  })
  if (!cls) return { success: false, error: "Class not found or access denied" }

  // Look up the student
  const student = await prisma.user.findFirst({
    where: studentId
      ? { id: studentId, role: "STUDENT" }
      : { email: email!, role: "STUDENT" },
    select: { id: true, name: true, email: true },
  })

  if (!student) {
    return {
      success: false,
      error: email
        ? `No student account found with email "${email}"`
        : `No student account found with ID "${studentId}"`,
    }
  }

  // Check if already enrolled
  const existing = await prisma.classEnrollment.findUnique({
    where: { classId_studentId: { classId, studentId: student.id } },
  })
  if (existing) {
    return {
      success: false,
      error: `${student.name} is already enrolled in this class`,
    }
  }

  await prisma.classEnrollment.create({
    data: { classId, studentId: student.id },
  })

  updateTag(`class-${classId}`)
  updateTag(`student-exercises-${student.id}`)
  updateTag(`teacher-classes-${teacherId}`)

  return {
    success: true,
    data: {
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      classId,
      className: cls.name,
    },
  }
}
