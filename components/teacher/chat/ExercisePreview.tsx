"use client"

interface ExercisePreviewProps {
  input: Record<string, unknown>
}

interface McqQuestion {
  text: string
  options: string[]
  answer: number
}

export function ExercisePreview({ input }: ExercisePreviewProps) {
  const title = input.title as string | undefined
  const type = input.type as string | undefined
  const content = input.content as Record<string, unknown> | undefined

  return (
    <div className="text-xs space-y-1.5">
      {title && (
        <div>
          <span className="text-gray-500 dark:text-gray-400">Title:</span>{" "}
          <span className="font-medium">{title}</span>
        </div>
      )}
      {type && (
        <div>
          <span className="text-gray-500 dark:text-gray-400">Type:</span>{" "}
          <span className="font-mono text-amber-700 dark:text-amber-400">{type}</span>
        </div>
      )}

      {type === "MCQ" && Array.isArray(content?.questions) && (
        <div className="mt-2 space-y-2">
          {(content.questions as McqQuestion[]).slice(0, 3).map((q, i) => (
            <div key={i} className="pl-2 border-l-2 border-amber-300 dark:border-amber-700">
              <div className="font-medium">{i + 1}. {q.text}</div>
              <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                {q.options.map((opt, j) => (
                  <span key={j} className={j === q.answer ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                    {String.fromCharCode(65 + j)}. {opt}
                    {j < q.options.length - 1 ? " | " : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {(content.questions as McqQuestion[]).length > 3 && (
            <div className="text-gray-400">
              +{(content.questions as McqQuestion[]).length - 3} more questions
            </div>
          )}
        </div>
      )}

      {type === "FILL_BLANK" && typeof content?.template === "string" && (
        <div className="mt-1 pl-2 border-l-2 border-amber-300 dark:border-amber-700">
          <div className="font-mono">{content.template}</div>
          <div className="text-green-600 dark:text-green-400 mt-0.5">
            Answers: {(content.answers as string[])?.join(", ")}
          </div>
        </div>
      )}

      {type === "SHORT_ANSWER" && typeof content?.prompt === "string" && (
        <div className="mt-1 pl-2 border-l-2 border-amber-300 dark:border-amber-700">
          <div>{content.prompt}</div>
          {typeof content.sampleAnswer === "string" && (
            <div className="text-green-600 dark:text-green-400 mt-0.5">
              Sample: {content.sampleAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
