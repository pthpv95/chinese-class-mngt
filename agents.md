# agents.md — Multi-Agent Coordination Plan

## Agent Roster

| ID | Name | Track | Instruction File | Parallel With |
|---|---|---|---|---|
| AGENT-SETUP | Project Setup | Wave 0 | 01-project-setup.md | — |
| AGENT-DB | Database | Wave 1 | 02-database-schema.md | AGENT-AUTH |
| AGENT-AUTH | Authentication | Wave 1 | 03-auth.md | AGENT-DB |
| AGENT-API | API Routes | Wave 2 | 04-api-routes.md | AGENT-STUDENT, AGENT-TEACHER |
| AGENT-STUDENT | Student UI | Wave 2 | 05-student-ui.md | AGENT-API, AGENT-TEACHER |
| AGENT-TEACHER | Teacher UI | Wave 2 | 06-teacher-ui.md | AGENT-API, AGENT-STUDENT |
| AGENT-AUDIO | Audio Feature | Wave 3 | 07-audio-feature.md | AGENT-TEST |
| AGENT-TEST | Testing | Wave 3 | 08-testing.md | AGENT-AUDIO |
| AGENT-DEPLOY | Deployment | Wave 4 | 09-deployment.md | — |

---

## Agent Definitions

### AGENT-SETUP
**Role:** Initialize the entire project from scratch.
**Context:** Full CLAUDE.md
**Must produce:**
- `package.json` with all pinned dependencies
- `tsconfig.json` (strict mode)
- `tailwind.config.ts`
- `next.config.ts`
- `.env.local.example`
- `prisma/` directory skeleton
- `app/` directory skeleton
- `lib/types.ts` with all base types
- `lib/prisma.ts` singleton
- `lib/supabase.ts` client + server helpers
**Depends on:** Nothing
**Blocks:** All other agents

---

### AGENT-DB
**Role:** Define and migrate the complete Prisma schema.
**Context:** instructions/02-database-schema.md + lib/types.ts
**Must produce:**
- `prisma/schema.prisma` — all models
- `prisma/seed.ts` — seed 1 teacher, 2 students, 1 class, 3 sample exercises
- Run `npx prisma generate`
- Run `npx prisma migrate dev --name init`
**Depends on:** AGENT-SETUP
**Blocks:** AGENT-API
**Parallel with:** AGENT-AUTH (no file conflicts)

---

### AGENT-AUTH
**Role:** Implement full authentication with role-based routing.
**Context:** instructions/03-auth.md + lib/types.ts
**Must produce:**
- `auth.ts` (NextAuth v5 config, credentials provider, JWT callbacks)
- `app/api/auth/[...nextauth]/route.ts`
- `app/(auth)/login/page.tsx`
- `app/(auth)/layout.tsx`
- `middleware.ts` (protect all /teacher and /student routes)
- `lib/auth-helpers.ts` (getServerSession wrapper, role guards)
**Depends on:** AGENT-SETUP
**Blocks:** AGENT-API, AGENT-STUDENT, AGENT-TEACHER
**Parallel with:** AGENT-DB (no file conflicts)
**⚠ Critical:** Password hashing must use bcryptjs. Never store plain text.

---

### AGENT-API
**Role:** Build all REST API routes.
**Context:** instructions/04-api-routes.md + auth.ts + prisma/schema.prisma
**Must produce:**
- `app/api/classes/route.ts` (GET, POST)
- `app/api/classes/[id]/route.ts` (GET, PATCH, DELETE)
- `app/api/classes/[id]/students/route.ts` (GET, POST invite)
- `app/api/exercises/route.ts` (GET, POST)
- `app/api/exercises/[id]/route.ts` (GET, PATCH, DELETE)
- `app/api/submissions/route.ts` (GET, POST)
- `app/api/submissions/[id]/route.ts` (GET, PATCH — teacher grading)
- `app/api/upload/audio/route.ts` (POST — returns signed Supabase URL)
- Zod validation schemas in `lib/validations.ts`
**Depends on:** AGENT-DB, AGENT-AUTH
**Blocks:** AGENT-STUDENT, AGENT-TEACHER (if they hit real APIs)
**Parallel with:** AGENT-STUDENT, AGENT-TEACHER (UI agents use mock data initially)

---

### AGENT-STUDENT
**Role:** Build the complete student-facing UI.
**Context:** instructions/05-student-ui.md + lib/types.ts
**Must produce:**
- `app/(dashboard)/layout.tsx` — shared sidebar with role-aware nav
- `app/(dashboard)/student/page.tsx` — pending exercises dashboard
- `app/(dashboard)/student/exercises/[id]/page.tsx` — take exercise
- `components/exercise-types/McqExercise.tsx`
- `components/exercise-types/FillBlankExercise.tsx`
- `components/exercise-types/ShortAnswerExercise.tsx`
- `components/exercise-types/AudioRecorderExercise.tsx` (shell only — AGENT-AUDIO completes it)
- `components/ui/ExerciseBadge.tsx` (status + type indicators)
- `components/ui/DueDateCountdown.tsx`
**Depends on:** AGENT-AUTH
**Parallel with:** AGENT-API (uses fetch with mock fallback), AGENT-TEACHER

---

### AGENT-TEACHER
**Role:** Build the complete teacher-facing UI.
**Context:** instructions/06-teacher-ui.md + lib/types.ts
**Must produce:**
- `app/(dashboard)/teacher/page.tsx` — class overview
- `app/(dashboard)/teacher/classes/[id]/page.tsx` — class detail + student list
- `app/(dashboard)/teacher/exercises/new/page.tsx` — exercise builder
- `app/(dashboard)/teacher/submissions/[id]/page.tsx` — review + grade
- `components/teacher/ExerciseBuilder.tsx` — dynamic form switching on type
- `components/teacher/SubmissionReviewer.tsx` — audio player + score input
- `components/teacher/ClassCard.tsx`
- `components/teacher/SubmissionTable.tsx`
**Depends on:** AGENT-AUTH
**Parallel with:** AGENT-API, AGENT-STUDENT

---

### AGENT-AUDIO
**Role:** Implement the complete audio recording and playback feature.
**Context:** instructions/07-audio-feature.md + AGENT-STUDENT output + AGENT-TEACHER output
**Must produce:**
- Complete `components/exercise-types/AudioRecorderExercise.tsx`
  (RecordRTC in-browser recording + file upload fallback)
- Complete `components/teacher/SubmissionReviewer.tsx` audio section
  (Wavesurfer.js waveform playback)
- `hooks/useAudioRecorder.ts` — custom hook encapsulating RecordRTC
- `hooks/useAudioPlayer.ts` — custom hook encapsulating Wavesurfer
- `lib/audio-upload.ts` — signed URL fetch + direct Supabase upload
- Supabase Storage bucket policy (audio/ private, policy doc in `supabase/storage-policies.sql`)
**Depends on:** AGENT-STUDENT, AGENT-TEACHER, AGENT-API
**Parallel with:** AGENT-TEST

---

### AGENT-TEST
**Role:** Write tests for critical paths.
**Context:** instructions/08-testing.md + all prior agent outputs
**Must produce:**
- `__tests__/api/auth.test.ts` — login success/failure
- `__tests__/api/exercises.test.ts` — CRUD + role protection
- `__tests__/api/submissions.test.ts` — submit + grade flow
- `__tests__/api/upload.test.ts` — signed URL generation
- `__tests__/components/McqExercise.test.tsx`
- `__tests__/components/ExerciseBuilder.test.tsx`
- `vitest.config.ts` + test setup
- Coverage target: ≥ 60% on `/app/api/**` and `/lib/**`
**Depends on:** AGENT-API
**Parallel with:** AGENT-AUDIO

---

### AGENT-DEPLOY
**Role:** Prepare the project for production deployment.
**Context:** instructions/09-deployment.md + all prior agent outputs
**Must produce:**
- `vercel.json` (build config, env var mapping)
- `.github/workflows/ci.yml` (lint → typecheck → test → build)
- `README.md` (setup guide, env vars, seeding, deploy steps)
- Supabase RLS policies in `supabase/rls-policies.sql`
- Final `npx prisma generate && next build` must succeed with 0 errors
**Depends on:** All other agents
**Parallel with:** Nobody

---

## Conflict Prevention Rules

These file ownership rules prevent merge conflicts when agents run in parallel:

| File / Directory | Owner | Others may |
|---|---|---|
| `prisma/schema.prisma` | AGENT-DB | read only |
| `auth.ts` | AGENT-AUTH | import only |
| `middleware.ts` | AGENT-AUTH | read only |
| `lib/types.ts` | AGENT-SETUP | read only (all types defined upfront) |
| `lib/validations.ts` | AGENT-API | import only |
| `app/api/**` | AGENT-API | read only |
| `app/(auth)/**` | AGENT-AUTH | read only |
| `app/(dashboard)/student/**` | AGENT-STUDENT | read only |
| `app/(dashboard)/teacher/**` | AGENT-TEACHER | read only |
| `components/exercise-types/**` | AGENT-STUDENT | AGENT-AUDIO completes audio component |
| `components/teacher/**` | AGENT-TEACHER | AGENT-AUDIO completes reviewer component |
| `hooks/**` | AGENT-AUDIO | read only |
| `__tests__/**` | AGENT-TEST | read only |
| `supabase/**` | AGENT-DB (schema) + AGENT-AUDIO (storage) + AGENT-DEPLOY (RLS) | scoped files only |

---

## Communication Between Parallel Agents

When a parallel agent needs something from another parallel agent:

1. **Use the interface contract** — don't wait. Import the type signature and build
   against it. Use `// TODO: integrate AGENT-X output` comments.
2. **Mock data** — student and teacher UI agents use local mock data (in
   `lib/mock-data.ts`) until AGENT-API completes.
3. **Prop contracts** — define the component prop types in `lib/types.ts` upfront
   so UI agents can build independently.

---

## Mock Data for Parallel UI Development

Create `lib/mock-data.ts` during Wave 2 for AGENT-STUDENT and AGENT-TEACHER:

```ts
// Agents import from here during parallel dev; replaced by real API calls in Wave 3
export const mockClass = { id: "cls_1", name: "English 101", code: "ENG101" }
export const mockExercises = [
  { id: "ex_1", title: "Vocabulary Quiz 1", type: "MCQ", dueDate: new Date(), status: "PENDING" },
  { id: "ex_2", title: "Pronunciation Practice", type: "AUDIO_RECORDING", dueDate: new Date(), status: "SUBMITTED" },
]
export const mockSubmissions = [
  { id: "sub_1", studentName: "Alice", exerciseTitle: "Vocab Quiz 1", status: "SUBMITTED", score: null },
]
```

---

## Final Integration Checklist (Orchestrator runs this)

- [ ] `npx prisma validate` passes
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm test` passes with ≥ 60% coverage
- [ ] `npm run build` completes successfully
- [ ] Login works for both TEACHER and STUDENT roles
- [ ] Student can complete MCQ, fill-blank, short answer exercises
- [ ] Student can record audio and submit
- [ ] Teacher can create all exercise types
- [ ] Teacher can view, play audio, score, and comment on submissions
- [ ] Supabase RLS policies applied
- [ ] No secrets in client bundle (`SUPABASE_SERVICE_ROLE_KEY` server-only)
