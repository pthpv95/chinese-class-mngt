import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { McqExercise } from "@/components/exercise-types/McqExercise"
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const mockContent = {
  questions: [
    { text: "What is 2+2?", options: ["3", "4", "5", "6"], answer: 1 },
    { text: "Capital of France?", options: ["Berlin", "London", "Paris", "Rome"], answer: 2 },
  ],
}

describe("McqExercise", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
  })

  it("renders all questions and options", () => {
    render(
      <McqExercise
        exerciseId="ex-1"
        content={mockContent}
        existingAnswer={null}
        readonly={false}
      />
    )
    expect(screen.getByText(/What is 2\+2\?/)).toBeInTheDocument()
    expect(screen.getByText(/Capital of France\?/)).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("Paris")).toBeInTheDocument()
  })

  it("submit button is disabled until all questions answered", () => {
    render(
      <McqExercise
        exerciseId="ex-1"
        content={mockContent}
        existingAnswer={null}
        readonly={false}
      />
    )
    const btn = screen.getByRole("button", { name: /submit/i })
    expect(btn).toBeDisabled()
  })

  it("enables submit after all questions answered", () => {
    render(
      <McqExercise
        exerciseId="ex-1"
        content={mockContent}
        existingAnswer={null}
        readonly={false}
      />
    )
    fireEvent.click(screen.getByText("4"))
    fireEvent.click(screen.getByText("Paris"))
    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled()
  })

  it("calls API on submit", async () => {
    render(
      <McqExercise
        exerciseId="ex-1"
        content={mockContent}
        existingAnswer={null}
        readonly={false}
      />
    )
    fireEvent.click(screen.getByText("4"))
    fireEvent.click(screen.getByText("Paris"))
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/submissions",
        expect.objectContaining({ method: "POST" })
      )
    })
  })

  it("renders readonly without submit button", () => {
    render(
      <McqExercise
        exerciseId="ex-1"
        content={mockContent}
        existingAnswer="[1,2]"
        readonly={true}
      />
    )
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument()
  })
})
