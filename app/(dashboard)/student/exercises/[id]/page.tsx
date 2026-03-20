import { requireStudent } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { createPresignedDownloadUrl } from "@/lib/storage"
import { McqExercise } from "@/components/exercise-types/McqExercise"
import { FillBlankExercise } from "@/components/exercise-types/FillBlankExercise"
import { ShortAnswerExercise } from "@/components/exercise-types/ShortAnswerExercise"
import { AudioRecorderExerciseLazy as AudioRecorderExercise } from "@/components/exercise-types/AudioRecorderExerciseLazy"
import type { AudioRecordingContent } from "@/lib/types"
import type {
  McqContent,
  FillBlankContent,
  ShortAnswerContent,
} from "@/lib/types"

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireStudent()

  const exercise = await prisma.exercise.findUnique({
    where: { id, published: true },
    include: {
      class: { select: { name: true } },
      submissions: {
        where: { studentId: session.user.id },
        select: {
          id: true,
          status: true,
          score: true,
          teacherComment: true,
          textAnswer: true,
          audioUrl: true,
        },
      },
    },
  })

  if (!exercise) notFound()

  const submission = exercise.submissions[0] ?? null
  const isGraded = submission?.status === "GRADED"

  const existingAudioUrl = submission?.audioUrl
    ? await createPresignedDownloadUrl(submission.audioUrl).catch(() => null)
    : null

  return (
    <div className="max-w-2xl">
      <div className="mb-5 sm:mb-6">
        <p className="text-xs text-gray-500 mb-1">{exercise.class.name}</p>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{exercise.title}</h2>
      </div>

      {isGraded && submission && (
        <div className="mb-5 sm:mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Graded: {submission.score}/100
          </p>
          {submission.teacherComment && (
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              {submission.teacherComment}
            </p>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        {exercise.type === "MCQ" && (
          <McqExercise
            exerciseId={exercise.id}
            content={exercise.content as unknown as McqContent}
            existingAnswer={submission?.textAnswer ?? null}
            readonly={isGraded ?? false}
          />
        )}
        {exercise.type === "FILL_BLANK" && (
          <FillBlankExercise
            exerciseId={exercise.id}
            content={exercise.content as unknown as FillBlankContent}
            existingAnswer={submission?.textAnswer ?? null}
            readonly={isGraded ?? false}
          />
        )}
        {exercise.type === "SHORT_ANSWER" && (
          <ShortAnswerExercise
            exerciseId={exercise.id}
            content={exercise.content as unknown as ShortAnswerContent}
            existingAnswer={submission?.textAnswer ?? null}
            readonly={isGraded ?? false}
          />
        )}
        {exercise.type === "AUDIO_RECORDING" && (
          <AudioRecorderExercise
            exerciseId={exercise.id}
            studentId={session.user.id}
            content={exercise.content as unknown as AudioRecordingContent}
            existingAudioUrl={existingAudioUrl}
            readonly={isGraded ?? false}
          />
        )}
      </div>
    </div>
  )
}
