import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
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
