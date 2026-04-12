import { z } from "zod"

export const CreateClassSchema = z.object({
  name: z.string().min(1).max(100),
})

const ExerciseBaseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["MCQ", "FILL_BLANK", "SHORT_ANSWER", "AUDIO_RECORDING", "FILE_UPLOAD"]),
  classId: z.string().min(1),
  dueDate: z.string().optional(),
  content: z.record(z.string(), z.unknown()),
})

export const CreateExerciseSchema = ExerciseBaseSchema.superRefine((data, ctx) => {
  if (data.type === "MCQ") {
    const questions = (data.content as { questions?: unknown[] }).questions
    if (!Array.isArray(questions) || questions.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["content"], message: "Add at least one question" })
    }
  }
  if (data.type === "FILL_BLANK") {
    const template = (data.content as { template?: string }).template
    if (!template || !template.includes("___")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["content"], message: "Template must contain at least one blank (___)" })
    }
  }
})

export const UpdateExerciseSchema = ExerciseBaseSchema.partial().extend({
  published: z.boolean().optional(),
})

export const CreateSubmissionSchema = z.object({
  exerciseId: z.string().min(1),
  textAnswer: z.string().optional(),
  audioUrl: z.string().min(1).optional(),
  audioDurationSec: z.number().int().positive().optional(),
})

export const GradeSubmissionSchema = z.object({
  score: z.number().int().min(0).max(100),
  maxScore: z.number().int().positive().optional(),
  teacherComment: z.string().max(1000).optional(),
})

export const JoinClassSchema = z.object({
  code: z.string().min(1),
})

const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/wav", "audio/mpeg", "audio/ogg"]

export const AudioUploadSchema = z.object({
  exerciseId: z.string().min(1),
  studentId: z.string().min(1),
  // Accept codec-qualified types like "audio/webm;codecs=pcm" — validate on base type only
  mimeType: z.string().refine(
    (v) => ALLOWED_AUDIO_TYPES.some((t) => v === t || v.startsWith(t + ";")),
    { message: `Must be one of: ${ALLOWED_AUDIO_TYPES.join(", ")}` }
  ),
  fileSizeBytes: z.number().int().positive().max(20 * 1024 * 1024), // 20MB max
})

// Chat schemas
export const SendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  imageUrls: z.array(z.string()).max(5).default([]),
})

export const ConfirmActionSchema = z.object({
  messageId: z.string().min(1),
  actionIndex: z.number().int().min(0),
  editedInput: z.record(z.string(), z.unknown()).optional(),
})

export const ChatImageUploadSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  fileSizeBytes: z.number().int().positive().max(10 * 1024 * 1024), // 10MB max
})

export const CreateConversationSchema = z.object({
  title: z.string().max(200).optional(),
})
