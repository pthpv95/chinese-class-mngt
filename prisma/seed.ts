import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log("🌱 Seeding database...")

  const SALT_ROUNDS = 12

  // Create teacher
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@demo.com" },
    update: {},
    create: {
      name: "Ms. Johnson",
      email: "teacher@demo.com",
      passwordHash: await bcrypt.hash("password123", SALT_ROUNDS),
      role: "TEACHER",
    },
  })

  // Create students
  const student1 = await prisma.user.upsert({
    where: { email: "alice@demo.com" },
    update: {},
    create: {
      name: "Alice Nguyen",
      email: "alice@demo.com",
      passwordHash: await bcrypt.hash("password123", SALT_ROUNDS),
      role: "STUDENT",
    },
  })

  const student2 = await prisma.user.upsert({
    where: { email: "bob@demo.com" },
    update: {},
    create: {
      name: "Bob Tran",
      email: "bob@demo.com",
      passwordHash: await bcrypt.hash("password123", SALT_ROUNDS),
      role: "STUDENT",
    },
  })

  // Create class
  const englishClass = await prisma.class.upsert({
    where: { code: "ENG101" },
    update: {},
    create: {
      name: "English 101",
      code: "ENG101",
      teacherId: teacher.id,
    },
  })

  // Enroll students
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: englishClass.id, studentId: student1.id } },
    update: {},
    create: { classId: englishClass.id, studentId: student1.id },
  })

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: englishClass.id, studentId: student2.id } },
    update: {},
    create: { classId: englishClass.id, studentId: student2.id },
  })

  // Create exercises
  const mcqExercise = await prisma.exercise.create({
    data: {
      title: "Vocabulary Quiz — Chapter 3",
      type: "MCQ" as const,
      classId: englishClass.id,
      createdById: teacher.id,
      published: true,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      content: {
        questions: [
          {
            text: "What is the meaning of 'eloquent'?",
            options: ["Silent", "Well-spoken", "Confused", "Angry"],
            answer: 1,
          },
          {
            text: "Choose the correct synonym for 'diligent':",
            options: ["Lazy", "Careless", "Hardworking", "Reckless"],
            answer: 2,
          },
        ],
      },
    },
  })

  await prisma.exercise.create({
    data: {
      title: "Fill in the Blanks — Present Tenses",
      type: "FILL_BLANK" as const,
      classId: englishClass.id,
      createdById: teacher.id,
      published: true,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      content: {
        template: "She ___ (go) to school every day. They ___ (play) football right now.",
        answers: ["goes", "are playing"],
      },
    },
  })

  await prisma.exercise.create({
    data: {
      title: "Pronunciation Practice — Vowel Sounds",
      type: "AUDIO_RECORDING" as const,
      classId: englishClass.id,
      createdById: teacher.id,
      published: true,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      content: {
        prompt:
          "Please record yourself reading the following sentence clearly: 'The quick brown fox jumps over the lazy dog.'",
        maxDurationSec: 60,
        allowUpload: true,
      },
    },
  })

  // Create a sample submission from Alice on the MCQ
  await prisma.submission.create({
    data: {
      exerciseId: mcqExercise.id,
      studentId: student1.id,
      status: "GRADED",
      textAnswer: JSON.stringify([1, 2]),
      score: 100,
      maxScore: 100,
      teacherComment: "Excellent work, Alice!",
      gradedAt: new Date(),
    },
  })

  console.log("✅ Seed complete!")
  console.log("  Teacher:  teacher@demo.com / password123")
  console.log("  Student1: alice@demo.com   / password123")
  console.log("  Student2: bob@demo.com     / password123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
