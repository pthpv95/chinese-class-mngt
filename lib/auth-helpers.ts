import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { UserRole } from "@/lib/types"

export async function requireSession(requiredRole?: UserRole) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (requiredRole && session.user.role !== requiredRole) {
    redirect(session.user.role === "TEACHER" ? "/teacher" : "/student")
  }
  return session
}

export async function requireTeacher() {
  return requireSession("TEACHER")
}

export async function requireStudent() {
  return requireSession("STUDENT")
}

// Use in API routes (returns null instead of redirecting)
export async function getApiSession(requiredRole?: UserRole) {
  const session = await auth()
  if (!session?.user) return null
  if (requiredRole && session.user.role !== requiredRole) return null
  return session
}
