# CLAUDE.md — E-Learning Homework App (MVP)

## Project Overview

A Next.js 14 full-stack e-learning app where teachers create exercises and students
submit answers (text or voice). Built with Supabase (PostgreSQL + Storage),
Prisma ORM, NextAuth.js v5, Tailwind CSS, and deployed on Vercel.

## Repository Layout

```
/
├── CLAUDE.md               ← you are here
├── agents.md               ← multi-agent coordination plan
├── coding-rules.md         ← non-negotiable coding standards
├── instructions/
│   ├── 01-project-setup.md
│   ├── 02-database-schema.md
│   ├── 03-auth.md
│   ├── 04-api-routes.md
│   ├── 05-student-ui.md
│   ├── 06-teacher-ui.md
│   ├── 07-audio-feature.md
│   ├── 08-testing.md
│   └── 09-deployment.md
├── app/
├── components/
├── lib/
├── prisma/
└── public/
```

---

## Orchestrator Responsibilities

When running as the **orchestrator** agent, your job is:

1. Read `agents.md` to understand the full agent graph and parallel tracks.
2. Spawn sub-agents in the correct dependency order (see Dependency Graph below).
3. Pass each sub-agent its scoped instruction file + relevant context.
4. Validate outputs at each gate before unblocking the next wave.
5. Merge completed work and resolve any integration conflicts.
6. Never write application code yourself — delegate everything.

### Dependency Graph

```
Wave 0 (must complete first — no parallelism):
  └── AGENT-SETUP   → runs instructions/01-project-setup.md
                       Output: initialized repo, .env.local template, package.json

Wave 1 (parallel after Wave 0):
  ├── AGENT-DB      → runs instructions/02-database-schema.md
  └── AGENT-AUTH    → runs instructions/03-auth.md

Wave 2 (parallel after Wave 1):
  ├── AGENT-API     → runs instructions/04-api-routes.md
  ├── AGENT-STUDENT → runs instructions/05-student-ui.md
  └── AGENT-TEACHER → runs instructions/06-teacher-ui.md

Wave 3 (parallel after Wave 2):
  ├── AGENT-AUDIO   → runs instructions/07-audio-feature.md
  └── AGENT-TEST    → runs instructions/08-testing.md

Wave 4 (after Wave 3):
  └── AGENT-DEPLOY  → runs instructions/09-deployment.md
```

### Gate Checks

Before advancing each wave, verify:

| After Wave | Gate Check |
|---|---|
| Wave 0 | `package.json` exists, all deps listed, `.env.local.example` created |
| Wave 1 | `prisma/schema.prisma` valid (`npx prisma validate`), NextAuth config exports `authOptions` |
| Wave 2 | All API routes return correct status codes, UI pages render without errors |
| Wave 3 | Audio upload/playback works end-to-end, test coverage ≥ 60% |

---

## Environment Variables

Every agent must assume these env vars exist. Never hardcode values.

```bash
# .env.local
DATABASE_URL=""            # Supabase PostgreSQL connection string
DIRECT_URL=""              # Direct connection (for Prisma migrations)
NEXTAUTH_SECRET=""         # openssl rand -base64 32
NEXTAUTH_URL=""            # http://localhost:3000 in dev
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""  # server-side only, never expose to client
```

---

## Non-Negotiable Rules

1. Read `coding-rules.md` before writing any code — always.
2. Every file must have TypeScript strict mode. No `any`.
3. Every API route must validate session and role before touching the DB.
4. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client bundle.
5. Every agent completes its own instruction file fully before reporting done.
6. If blocked by a missing dependency from another agent, stop and report clearly.
7. Run `npx tsc --noEmit` and fix all errors before marking a task complete.

---

## Tech Stack Pinned Versions

```json
{
  "next": "14.2.x",
  "next-auth": "5.0.0-beta.x",
  "prisma": "^5.14.x",
  "@prisma/client": "^5.14.x",
  "@supabase/supabase-js": "^2.43.x",
  "tailwindcss": "^3.4.x",
  "zustand": "^4.5.x",
  "recordrtc": "^5.6.x",
  "wavesurfer.js": "^7.7.x",
  "zod": "^3.23.x",
  "react-hook-form": "^7.51.x",
  "@hookform/resolvers": "^3.3.x"
}
```

---

## Shared Types Location

All shared TypeScript types live in `/lib/types.ts`. Every agent imports from
there — never redefine types locally.

```ts
// lib/types.ts — agents must populate this file, not duplicate types elsewhere
export type UserRole = "TEACHER" | "STUDENT"
export type ExerciseType = "MCQ" | "FILL_BLANK" | "SHORT_ANSWER" | "AUDIO_RECORDING" | "FILE_UPLOAD"
export type SubmissionStatus = "PENDING" | "SUBMITTED" | "GRADED"
```

---

## Handoff Protocol Between Agents

When an agent finishes, it must output a structured summary:

```
AGENT: <name>
STATUS: COMPLETE | BLOCKED | PARTIAL
FILES_CREATED: <comma-separated list>
FILES_MODIFIED: <comma-separated list>
EXPORTS: <key exports other agents depend on>
NOTES: <any integration warnings>
```

The orchestrator reads this summary and uses it to brief the next wave.
