"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

interface NavLink {
  href: string
  label: string
}

interface DashboardShellProps {
  children: React.ReactNode
  email: string
  navLinks: NavLink[]
  signOutAction: () => Promise<void>
}

export function DashboardShell({ children, email, navLinks, signOutAction }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Close sidebar on escape key
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="min-h-screen flex bg-rose-50 dark:bg-gray-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-pink-100 dark:border-gray-800 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5 border-b border-pink-100 dark:border-gray-800 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-pink-600 dark:text-pink-400">EduFlow ✦</h1>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{email}</p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {/* Close button — mobile only */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden -mr-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close menu"
            >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                pathname === link.href
                  ? "bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-gray-800 hover:text-pink-700 dark:hover:text-pink-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-pink-100 dark:border-gray-800">
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full text-left text-sm text-gray-500 hover:text-pink-700 dark:hover:text-pink-300 px-3 py-2 rounded-lg hover:bg-pink-50 dark:hover:bg-gray-800 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-pink-100 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1 text-gray-500 hover:text-pink-700 dark:hover:text-pink-300 rounded-lg hover:bg-pink-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-bold text-pink-600 dark:text-pink-400">EduFlow ✦</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
