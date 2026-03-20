"use server"

import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createClass(formData: FormData) {
  const session = await requireTeacher()
  const name = formData.get("name") as string
  if (!name?.trim()) return
  await prisma.class.create({ data: { name: name.trim(), teacherId: session.user.id } })
  revalidatePath("/teacher")
}
