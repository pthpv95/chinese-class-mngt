import type { ExerciseListItem, SubmissionListItem } from "@/lib/types"

export const mockClass = {
  id: "cls_mock_1",
  name: "English 101",
  code: "ENG101",
  teacherName: "Ms. Johnson",
  studentCount: 24,
}

export const mockExercises: ExerciseListItem[] = [
  {
    id: "ex_mock_1",
    title: "Vocabulary Quiz — Chapter 3",
    type: "MCQ",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    submissionStatus: null,
    className: "English 101",
  },
  {
    id: "ex_mock_2",
    title: "Pronunciation Practice",
    type: "AUDIO_RECORDING",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    submissionStatus: "SUBMITTED",
    className: "English 101",
  },
  {
    id: "ex_mock_3",
    title: "Fill in the Blanks — Tenses",
    type: "FILL_BLANK",
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    submissionStatus: "GRADED",
    className: "English 101",
  },
]

export const mockSubmissions: SubmissionListItem[] = [
  { id: "sub_1", studentName: "Alice Nguyen", exerciseTitle: "Vocab Quiz", status: "GRADED", score: 85, submittedAt: new Date() },
  { id: "sub_2", studentName: "Bob Tran", exerciseTitle: "Vocab Quiz", status: "SUBMITTED", score: null, submittedAt: new Date() },
  { id: "sub_3", studentName: "Carol Le", exerciseTitle: "Vocab Quiz", status: "PENDING", score: null, submittedAt: null },
]
