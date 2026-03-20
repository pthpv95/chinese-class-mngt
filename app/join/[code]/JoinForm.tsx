"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})
type FormValues = z.infer<typeof schema>

interface Props {
  classCode: string
  className: string
}

export function JoinForm({ classCode, className }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [emailExists, setEmailExists] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    setError(null)
    setEmailExists(false)

    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, code: classCode }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setEmailExists(true)
        return
      }
      setError((json.error as string | undefined) ?? "Something went wrong. Please try again.")
      return
    }

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError("Account created but sign-in failed. Please sign in manually.")
      return
    }

    router.push("/student")
  }

  const inputClass =
    "w-full rounded-lg border border-pink-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-pink-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-pink-100 dark:border-gray-800 p-8">
          <div className="mb-6">
            <p className="text-xs font-medium text-pink-500 uppercase tracking-wide mb-1">
              Class invitation
            </p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{className}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create your account to join this class.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Full name
              </label>
              <input
                {...register("name")}
                type="text"
                autoComplete="name"
                placeholder="Your name"
                className={inputClass}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@school.edu"
                className={inputClass}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className={inputClass}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {emailExists && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  An account with this email already exists.{" "}
                  <Link
                    href={`/login?callbackUrl=/join/${classCode}`}
                    className="font-medium underline"
                  >
                    Sign in to join the class.
                  </Link>
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating account…" : "Create account & join class"}
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              href={`/login?callbackUrl=/join/${classCode}`}
              className="text-pink-500 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
