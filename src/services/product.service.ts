"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/dal"
import { productSchema } from "@/lib/validation"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getProduct(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      owner: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  })
}

export async function getMyProducts() {
  const session = await requireAuth()
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  })
  if (!profile) return []
  return prisma.product.findMany({
    where: { ownerId: profile.userId },
    orderBy: { createdAt: "desc" },
  })
}

export async function getPublishedProducts(page = 1, limit = 12) {
  const skip = (page - 1) * limit

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { status: "Published" },
      include: {
        owner: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where: { status: "Published" } }),
  ])

  return { products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function createProduct(data: unknown) {
  const session = await requireAuth()
  const parsed = productSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  let profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
  if (!profile) {
    profile = await prisma.profile.create({
      data: { userId: session.user.id },
    })
  }

  await prisma.product.create({
    data: { ownerId: profile.userId, ...parsed.data },
  })

  revalidatePath("/products")
  return { success: true }
}

export async function updateProduct(productId: string, data: unknown) {
  const session = await requireAuth()
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
  if (!profile) return { error: "Profile not found" }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.ownerId !== profile.userId) return { error: "Not found or forbidden" }

  const parsed = productSchema.partial().safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.product.update({ where: { id: productId }, data: parsed.data })

  revalidatePath(`/products/${productId}`)
  return { success: true }
}

export async function deleteProduct(productId: string) {
  const session = await requireAuth()
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
  if (!profile) return { error: "Profile not found" }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.ownerId !== profile.userId) return { error: "Not found or forbidden" }

  await prisma.product.delete({ where: { id: productId } })
  revalidatePath("/products")
  return { success: true }
}

export async function publishProduct(productId: string) {
  return updateProduct(productId, { status: "Published" })
}
