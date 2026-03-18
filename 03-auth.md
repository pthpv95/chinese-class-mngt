# instructions/03-auth.md
# AGENT-AUTH — Authentication & Authorization

## Objective
Implement complete auth with NextAuth v5, credentials provider, JWT sessions,
role-based routing via middleware, and reusable server-side auth helpers.

---

## Step 1 — auth.ts (NextAuth v5 Config)

Create `auth.ts` in the project root:

```ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import type { UserRole } from "@/lib/types"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
          },
        })

        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        )
        if (!passwordMatch) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: UserRole }).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
})
```

---

## Step 2 — NextAuth Type Augmentation

Create `types/next-auth.d.ts`:

```ts
import type { UserRole } from "@/lib/types"

declare module "next-auth" {
  interface User {
    role: UserRole
  }
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: UserRole
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
  }
}
```

---

## Step 3 — API Route Handler

Create `app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

---

## Step 4 — Middleware (Edge Protection)

Create `middleware.ts` in the project root:

```ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session

  const isAuthPage = nextUrl.pathname.startsWith("/login")
  const isTeacherPage = nextUrl.pathname.startsWith("/teacher")
  const isStudentPage = nextUrl.pathname.startsWith("/student")
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")

  // Allow auth API routes always
  if (isApiAuthRoute) return NextResponse.next()

  // Redirect logged-in users away from login
  if (isAuthPage && isLoggedIn) {
    const role = session.user.role
    return NextResponse.redirect(
      new URL(role === "TEACHER" ? "/teacher" : "/student", req.url)
    )
  }

  // Redirect unauthenticated users to login
  if ((isTeacherPage || isStudentPage) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Role-based access control
  if (isTeacherPage && session?.user.role !== "TEACHER") {
    return NextResponse.redirect(new URL("/student", req.url))
  }

  if (isStudentPage && session?.user.role !== "STUDENT") {
    return NextResponse.redirect(new URL("/teacher", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/teacher/:path*",
    "/student/:path*",
    "/login",
    "/api/((?!auth).)*",
  ],
}
```

---

## Step 5 — Auth Helpers (Server-Side)

Create `lib/auth-helpers.ts`:

```ts
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
```

---

## Step 6 — Login Page

Create `app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  )
}
```

Create `app/(auth)/login/page.tsx`:

```tsx
"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginForm) {
    setError(null)
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      return
    }

    // Fetch session to get role for redirect
    const res = await fetch("/api/auth/session")
    const session = await res.json()
    router.push(session?.user?.role === "TEACHER" ? "/teacher" : "/student")
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Sign in</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back to your learning portal</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Email address
          </label>
          <input
            {...register("email")}
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@school.edu"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Password
          </label>
          <input
            {...register("password")}
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Demo: teacher@demo.com or alice@demo.com — password123
        </p>
      </div>
    </div>
  )
}
```

---

## Step 7 — Root Layout with SessionProvider

Update `app/layout.tsx`:

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "next-auth/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EduFlow — E-Learning Portal",
  description: "Homework and exercise management for teachers and students",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

---

## Step 8 — Root Redirect

Create `app/page.tsx`:

```tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function RootPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  redirect(session.user.role === "TEACHER" ? "/teacher" : "/student")
}
```

---

## Completion Checklist

- [ ] `auth.ts` exports `handlers`, `auth`, `signIn`, `signOut`
- [ ] `types/next-auth.d.ts` adds `id` and `role` to session
- [ ] `middleware.ts` protects all /teacher and /student routes
- [ ] Login page renders and authenticates correctly
- [ ] Wrong role redirects correctly (student → /student, teacher → /teacher)
- [ ] `lib/auth-helpers.ts` exports all 4 helpers
- [ ] `npx tsc --noEmit` passes

## Handoff Summary
```
AGENT: AGENT-AUTH
STATUS: COMPLETE
FILES_CREATED: auth.ts, middleware.ts, types/next-auth.d.ts, lib/auth-helpers.ts,
               app/(auth)/layout.tsx, app/(auth)/login/page.tsx,
               app/layout.tsx, app/page.tsx
FILES_MODIFIED: none
EXPORTS: auth, signIn, signOut, handlers from auth.ts;
         requireSession, requireTeacher, requireStudent, getApiSession from lib/auth-helpers.ts
NOTES: Use getApiSession() in all API routes. Use requireTeacher/requireStudent in
       Server Components. Session contains: user.id, user.name, user.email, user.role
```
