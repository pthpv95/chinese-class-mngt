import { requireSession } from "@/lib/auth-helpers"
import { signOut } from "@/auth"
import { DashboardShell } from "@/components/ui/DashboardShell"
import { ChatPanel } from "@/components/teacher/chat/ChatPanel"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const isTeacher = session.user.role === "TEACHER"

  const navLinks = isTeacher
    ? [
        { href: "/teacher", label: "Dashboard" },
        { href: "/teacher/exercises/new", label: "New exercise" },
      ]
    : [{ href: "/student", label: "My exercises" }]

  async function handleSignOut() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <DashboardShell email={session.user.email ?? ""} navLinks={navLinks} signOutAction={handleSignOut}>
      {children}
      {isTeacher && <ChatPanel />}
    </DashboardShell>
  )
}
