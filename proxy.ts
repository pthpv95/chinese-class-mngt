import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { locales, defaultLocale } from "./i18n.config"

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session

  // Extract locale from pathname for proper comparison
  const pathname = nextUrl.pathname
  const locale = locales.find((l) => pathname.startsWith(`/${l}`)) || defaultLocale
  const pathWithoutLocale = pathname.replace(new RegExp(`^/(${locales.join("|")})`), "") || "/"

  const isAuthPage = pathWithoutLocale.startsWith("/login")
  const isTeacherPage = pathWithoutLocale.startsWith("/teacher")
  const isStudentPage = pathWithoutLocale.startsWith("/student")
  const isApiAuthRoute = pathWithoutLocale.startsWith("/api/auth")

  // Allow auth API routes always
  if (isApiAuthRoute) return NextResponse.next()

  // Redirect logged-in users away from login
  if (isAuthPage && isLoggedIn) {
    const role = session.user.role
    const redirectPath = role === "TEACHER" ? "/teacher" : "/student"
    return NextResponse.redirect(
      new URL(locale === defaultLocale ? redirectPath : `/${locale}${redirectPath}`, req.url)
    )
  }

  // Redirect unauthenticated users to login
  if ((isTeacherPage || isStudentPage) && !isLoggedIn) {
    const loginPath = locale === defaultLocale ? "/login" : `/${locale}/login`
    return NextResponse.redirect(new URL(loginPath, req.url))
  }

  // Role-based access control
  if (isTeacherPage && session?.user.role !== "TEACHER") {
    const redirectPath = locale === defaultLocale ? "/student" : `/${locale}/student`
    return NextResponse.redirect(new URL(redirectPath, req.url))
  }

  if (isStudentPage && session?.user.role !== "STUDENT") {
    const redirectPath = locale === defaultLocale ? "/teacher" : `/${locale}/teacher`
    return NextResponse.redirect(new URL(redirectPath, req.url))
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
