# instructions/04-api-routes.md
# AGENT-API — All REST API Routes

## Objective
Build every API route with consistent auth checking, Zod validation, and
Prisma queries. Follow the exact pattern from coding-rules.md for every route.

---

## Shared: lib/validations.ts

Create this file first — all routes import from here:

```ts
import { z } from "zod"

export const CreateClassSchema = z.object({
  name: z.string().min(1).max(100),
})

export const CreateExerciseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["MCQ", "FILL_BLANK", "SHORT_ANSWER", "AUDIO_RECORDING", "FILE_UPLOAD"]),
  classId: z.string().cuid(),
  dueDate: z.string().datetime().optional(),
  content: z.record(z.unknown()),
})

export const UpdateExerciseSchema = CreateExerciseSchema.partial().extend({
  published: z.boolean().optional(),
})

export const CreateSubmissionSchema = z.object({
  exerciseId: z.string().cuid(),
  textAnswer: z.string().optional(),
  audioUrl: z.string().url().optional(),
  audioDurationSec: z.number().int().positive().optional(),
})

export const GradeSubmissionSchema = z.object({
  score: z.number().int().min(0).max(100),
  maxScore: z.number().int().positive().optional().default(100),
  teacherComment: z.string().max(1000).optional(),
})

export const JoinClassSchema = z.object({
  code: z.string().min(1),
})

export const AudioUploadSchema = z.object({
  exerciseId: z.string().cuid(),
  studentId: z.string().cuid(),
  mimeType: z.enum(["audio/webm", "audio/mp4", "audio/wav", "audio/mpeg", "audio/ogg"]),
  fileSizeBytes: z.number().int().positive().max(20 * 1024 * 1024), // 20MB max
})
```

---

## Classes API

### app/api/classes/route.ts

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { CreateClassSchema } from "@/lib/validations"

export async function GET() {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const classes =
      session.user.role === "TEACHER"
        ? await prisma.class.findMany({
            where: { teacherId: session.user.id },
            include: { _count: { select: { enrollments: true, exercises: true } } },
            orderBy: { createdAt: "desc" },
          })
        : await prisma.class.findMany({
            where: { enrollments: { some: { studentId: session.user.id } } },
            include: { teacher: { select: { name: true } }, _count: { select: { exercises: true } } },
            orderBy: { createdAt: "desc" },
          })

    return NextResponse.json({ data: classes })
  } catch (error) {
    console.error("[GET /api/classes]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = CreateClassSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const newClass = await prisma.class.create({
      data: { name: parsed.data.name, teacherId: session.user.id },
    })
    return NextResponse.json({ data: newClass }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/classes]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### app/api/classes/[id]/route.ts

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const cls = await prisma.class.findUnique({
      where: { id: params.id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        enrollments: { include: { student: { select: { id: true, name: true, email: true } } } },
        exercises: { where: { published: true }, orderBy: { dueDate: "asc" } },
      },
    })
    if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data: cls })
  } catch (error) {
    console.error("[GET /api/classes/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const cls = await prisma.class.findUnique({ where: { id: params.id } })
    if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (cls.teacherId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    await prisma.class.delete({ where: { id: params.id } })
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("[DELETE /api/classes/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### app/api/classes/[id]/students/route.ts (join by code)

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { JoinClassSchema } from "@/lib/validations"

// Student joins a class by code
export async function POST(req: NextRequest) {
  const session = await getApiSession("STUDENT")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = JoinClassSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const cls = await prisma.class.findUnique({ where: { code: parsed.data.code } })
    if (!cls) return NextResponse.json({ error: "Class not found. Check the code." }, { status: 404 })

    const enrollment = await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId: cls.id, studentId: session.user.id } },
      update: {},
      create: { classId: cls.id, studentId: session.user.id },
    })
    return NextResponse.json({ data: enrollment }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/classes/:id/students]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

---

## Exercises API

### app/api/exercises/route.ts

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { CreateExerciseSchema } from "@/lib/validations"

export async function GET(req: NextRequest) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const classId = req.nextUrl.searchParams.get("classId")

  try {
    const exercises =
      session.user.role === "TEACHER"
        ? await prisma.exercise.findMany({
            where: { createdById: session.user.id, ...(classId ? { classId } : {}) },
            include: { _count: { select: { submissions: true } } },
            orderBy: { createdAt: "desc" },
          })
        : await prisma.exercise.findMany({
            where: {
              published: true,
              class: { enrollments: { some: { studentId: session.user.id } } },
              ...(classId ? { classId } : {}),
            },
            include: {
              submissions: {
                where: { studentId: session.user.id },
                select: { id: true, status: true, score: true },
              },
            },
            orderBy: { dueDate: "asc" },
          })

    return NextResponse.json({ data: exercises })
  } catch (error) {
    console.error("[GET /api/exercises]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = CreateExerciseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    // Verify teacher owns the class
    const cls = await prisma.class.findFirst({
      where: { id: parsed.data.classId, teacherId: session.user.id },
    })
    if (!cls) return NextResponse.json({ error: "Class not found or access denied" }, { status: 404 })

    const exercise = await prisma.exercise.create({
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        createdById: session.user.id,
      },
    })
    return NextResponse.json({ data: exercise }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/exercises]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### app/api/exercises/[id]/route.ts

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { UpdateExerciseSchema } from "@/lib/validations"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
      include: { class: { select: { name: true } } },
    })
    if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!exercise.published && session.user.role === "STUDENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ data: exercise })
  } catch (error) {
    console.error("[GET /api/exercises/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = UpdateExerciseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const exercise = await prisma.exercise.findFirst({
      where: { id: params.id, createdById: session.user.id },
    })
    if (!exercise) return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })

    const updated = await prisma.exercise.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[PATCH /api/exercises/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const exercise = await prisma.exercise.findFirst({
      where: { id: params.id, createdById: session.user.id },
    })
    if (!exercise) return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })

    await prisma.exercise.delete({ where: { id: params.id } })
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("[DELETE /api/exercises/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

---

## Submissions API

### app/api/submissions/route.ts

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { CreateSubmissionSchema } from "@/lib/validations"

export async function GET(req: NextRequest) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const exerciseId = req.nextUrl.searchParams.get("exerciseId")

  try {
    const submissions =
      session.user.role === "TEACHER"
        ? await prisma.submission.findMany({
            where: {
              exercise: { createdById: session.user.id },
              ...(exerciseId ? { exerciseId } : {}),
            },
            include: {
              student: { select: { id: true, name: true, email: true } },
              exercise: { select: { title: true, type: true, maxScore: true } },
            },
            orderBy: { submittedAt: "desc" },
          })
        : await prisma.submission.findMany({
            where: {
              studentId: session.user.id,
              ...(exerciseId ? { exerciseId } : {}),
            },
            include: { exercise: { select: { title: true, type: true } } },
            orderBy: { submittedAt: "desc" },
          })

    return NextResponse.json({ data: submissions })
  } catch (error) {
    console.error("[GET /api/submissions]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getApiSession("STUDENT")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = CreateSubmissionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: parsed.data.exerciseId, published: true },
    })
    if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 })

    const submission = await prisma.submission.upsert({
      where: { exerciseId_studentId: { exerciseId: parsed.data.exerciseId, studentId: session.user.id } },
      update: { ...parsed.data, status: "SUBMITTED" },
      create: { ...parsed.data, studentId: session.user.id, status: "SUBMITTED" },
    })
    return NextResponse.json({ data: submission }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/submissions]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### app/api/submissions/[id]/route.ts (teacher grading)

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getApiSession } from "@/lib/auth-helpers"
import { GradeSubmissionSchema } from "@/lib/validations"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        student: { select: { id: true, name: true, email: true } },
        exercise: { select: { title: true, type: true, content: true, createdById: true } },
      },
    })
    if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Student can only see their own; teacher must own the exercise
    const canAccess =
      session.user.role === "STUDENT"
        ? submission.studentId === session.user.id
        : submission.exercise.createdById === session.user.id
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    return NextResponse.json({ data: submission })
  } catch (error) {
    console.error("[GET /api/submissions/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = GradeSubmissionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: { exercise: { select: { createdById: true } } },
    })
    if (!submission || submission.exercise.createdById !== session.user.id) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 404 })
    }

    const updated = await prisma.submission.update({
      where: { id: params.id },
      data: { ...parsed.data, status: "GRADED", gradedAt: new Date() },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[PATCH /api/submissions/:id]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

---

## Audio Upload API

### app/api/upload/audio/route.ts

```ts
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase"
import { getApiSession } from "@/lib/auth-helpers"
import { AudioUploadSchema } from "@/lib/validations"

export async function POST(req: NextRequest) {
  const session = await getApiSession("STUDENT")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = AudioUploadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Ensure student is uploading for themselves only
  if (parsed.data.studentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const supabase = createSupabaseServerClient()
    const ext = parsed.data.mimeType.split("/")[1] ?? "webm"
    const filePath = `audio/${parsed.data.exerciseId}/${session.user.id}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from("audio")
      .createSignedUploadUrl(filePath, { upsert: true })

    if (error) throw error

    return NextResponse.json({
      data: {
        signedUrl: data.signedUrl,
        token: data.token,
        filePath,
        publicPath: filePath,
      },
    })
  } catch (error) {
    console.error("[POST /api/upload/audio]", error)
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 })
  }
}
```

---

## Completion Checklist

- [ ] `lib/validations.ts` with all schemas
- [ ] All 8 route files created
- [ ] Every route has auth + role check first
- [ ] Every route wraps DB in try/catch
- [ ] `npx tsc --noEmit` passes
- [ ] Manual test: POST /api/auth login returns session

## Handoff Summary
```
AGENT: AGENT-API
STATUS: COMPLETE
FILES_CREATED: lib/validations.ts, app/api/classes/route.ts,
               app/api/classes/[id]/route.ts, app/api/classes/[id]/students/route.ts,
               app/api/exercises/route.ts, app/api/exercises/[id]/route.ts,
               app/api/submissions/route.ts, app/api/submissions/[id]/route.ts,
               app/api/upload/audio/route.ts
FILES_MODIFIED: none
EXPORTS: All routes follow { data: T } | { error: string } response shape
NOTES: Audio bucket must exist in Supabase before upload route works.
       AGENT-AUDIO should run storage-setup.sql before testing audio uploads.
```
