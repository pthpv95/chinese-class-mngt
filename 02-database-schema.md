# instructions/02-database-schema.md
# AGENT-DB — Database Schema & Migrations

## Objective
Define the complete Prisma schema, run migrations, and seed the database.

---

## Step 1 — Complete prisma/schema.prisma

Replace the skeleton with the full schema:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserRole {
  TEACHER
  STUDENT
}

enum ExerciseType {
  MCQ
  FILL_BLANK
  SHORT_ANSWER
  AUDIO_RECORDING
  FILE_UPLOAD
}

enum SubmissionStatus {
  PENDING
  SUBMITTED
  GRADED
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         UserRole @default(STUDENT)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  taughtClasses  Class[]            @relation("ClassTeacher")
  enrollments    ClassEnrollment[]
  createdExercises Exercise[]       @relation("ExerciseCreator")
  submissions    Submission[]

  @@map("users")
}

model Class {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique @default(cuid())
  teacherId String   @map("teacher_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  teacher     User              @relation("ClassTeacher", fields: [teacherId], references: [id])
  enrollments ClassEnrollment[]
  exercises   Exercise[]

  @@map("classes")
}

model ClassEnrollment {
  id         String   @id @default(cuid())
  classId    String   @map("class_id")
  studentId  String   @map("student_id")
  enrolledAt DateTime @default(now()) @map("enrolled_at")

  class   Class @relation(fields: [classId], references: [id], onDelete: Cascade)
  student User  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([classId, studentId])
  @@map("class_enrollments")
}

model Exercise {
  id          String       @id @default(cuid())
  title       String
  description String?
  type        ExerciseType
  content     Json
  classId     String       @map("class_id")
  createdById String       @map("created_by_id")
  dueDate     DateTime?    @map("due_date")
  published   Boolean      @default(false)
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  class       Class        @relation(fields: [classId], references: [id], onDelete: Cascade)
  createdBy   User         @relation("ExerciseCreator", fields: [createdById], references: [id])
  submissions Submission[]

  @@index([classId])
  @@index([createdById])
  @@map("exercises")
}

model Submission {
  id              String           @id @default(cuid())
  exerciseId      String           @map("exercise_id")
  studentId       String           @map("student_id")
  status          SubmissionStatus @default(SUBMITTED)
  textAnswer      String?          @map("text_answer")
  audioUrl        String?          @map("audio_url")
  audioDurationSec Int?            @map("audio_duration_sec")
  score           Int?
  maxScore        Int?             @map("max_score")
  teacherComment  String?          @map("teacher_comment")
  gradedAt        DateTime?        @map("graded_at")
  submittedAt     DateTime         @default(now()) @map("submitted_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  exercise Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  student  User     @relation(fields: [studentId], references: [id])

  @@unique([exerciseId, studentId])
  @@index([exerciseId])
  @@index([studentId])
  @@map("submissions")
}
```

---

## Step 2 — Run Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Verify with:
```bash
npx prisma validate
```

---

## Step 3 — Seed File

Create `prisma/seed.ts`:

```ts
import { PrismaClient, ExerciseType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
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
      type: "MCQ" as ExerciseType,
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
      type: "FILL_BLANK" as ExerciseType,
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
      type: "AUDIO_RECORDING" as ExerciseType,
      classId: englishClass.id,
      createdById: teacher.id,
      published: true,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      content: {
        prompt: "Please record yourself reading the following sentence clearly: 'The quick brown fox jumps over the lazy dog.'",
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
```

Run seed:
```bash
npm run db:seed
```

---

## Step 4 — Supabase Storage Bucket Config

Create `supabase/storage-setup.sql` (run manually in Supabase SQL editor):

```sql
-- Create audio storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false,
  20971520, -- 20MB
  ARRAY['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;
```

---

## Completion Checklist

- [ ] `prisma/schema.prisma` has all 5 models
- [ ] `npx prisma validate` passes
- [ ] `npx prisma migrate dev --name init` succeeds
- [ ] `npx prisma generate` succeeds
- [ ] `npm run db:seed` seeds successfully
- [ ] `supabase/storage-setup.sql` created

## Handoff Summary
```
AGENT: AGENT-DB
STATUS: COMPLETE
FILES_CREATED: prisma/schema.prisma, prisma/seed.ts, supabase/storage-setup.sql
FILES_MODIFIED: none
EXPORTS: All Prisma models (User, Class, ClassEnrollment, Exercise, Submission)
         and enums (UserRole, ExerciseType, SubmissionStatus) via @prisma/client
NOTES: Database migrated and seeded. AGENT-API can now import prisma client and
       use all models. Supabase storage bucket must be created manually via SQL editor.
```
