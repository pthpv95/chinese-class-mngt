import { vi } from "vitest"

export const prismaMock = {
  user: { findUnique: vi.fn(), create: vi.fn() },
  class: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  exercise: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  submission: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  classEnrollment: { upsert: vi.fn() },
}

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
