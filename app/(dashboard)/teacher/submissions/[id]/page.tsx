import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { SubmissionReviewer } from "@/components/teacher/SubmissionReviewer"
import { createPresignedDownloadUrl } from "@/lib/storage"
import type { ExerciseType } from "@/lib/types"
import Link from "next/link"

export default async function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireTeacher()

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      exercise: {
        select: { id: true, title: true, type: true, content: true, createdById: true, classId: true },
      },
    },
  })

  if (!submission || submission.exercise.createdById !== session.user.id) notFound()

  const audioUrl = submission.audioUrl
    ? await createPresignedDownloadUrl(submission.audioUrl).catch(() => null)
    : null

  return (
    <div className="max-w-2xl">
      <Link
        href={`/teacher/classes/${submission.exercise.classId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-5 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Back
      </Link>
      <div className="mb-6">
        <p className="text-xs text-gray-500">{submission.exercise.title}</p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-0.5">
          {submission.student.name}&apos;s submission
        </h2>
      </div>
      <SubmissionReviewer
        submissionId={submission.id}
        exerciseType={submission.exercise.type as ExerciseType}
        textAnswer={submission.textAnswer}
        audioUrl={audioUrl}
        audioDurationSec={submission.audioDurationSec}
        content={submission.exercise.content as Record<string, unknown>}
        currentScore={submission.score}
        currentComment={submission.teacherComment}
        status={submission.status as "SUBMITTED" | "GRADED"}
      />
    </div>
  )
}
