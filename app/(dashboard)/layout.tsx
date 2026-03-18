import { requireSession } from "@/lib/auth-helpers"
import Link from "next/link"
import { signOut } from "@/auth"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const isTeacher = session.user.role === "TEACHER"

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">EduFlow</h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{session.user.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {isTeacher ? (
            <>
              <SidebarLink href="/teacher" label="Dashboard" />
              <SidebarLink href="/teacher/exercises/new" label="New exercise" />
            </>
          ) : (
            <>
              <SidebarLink href="/student" label="My exercises" />
            </>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button
              type="submit"
              className="w-full text-left text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors"
    >
      {label}
    </Link>
  )
}
