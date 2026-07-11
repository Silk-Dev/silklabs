"use server"

import { prisma } from "@/lib/prisma"
import { projectSchema, roleSchema, createProjectWizardSchema } from "@/lib/validation"
import { requireAuth, assertProjectOwner } from "@/lib/dal"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      roles: { include: { tags: { include: { tag: true } }, applications: true } },
      teamMembers: { include: { user: { select: { id: true, name: true, image: true, email: true } } } },
    },
  })
}

export async function getMyProjects() {
  const session = await requireAuth()
  return prisma.project.findMany({
    where: { ownerId: session.user.id },
    include: { roles: true, teamMembers: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function createProject(data: unknown) {
  const session = await requireAuth()
  const parsed = projectSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const project = await prisma.project.create({
    data: { ownerId: session.user.id, ...parsed.data },
  })

  await prisma.teamMember.create({
    data: { projectId: project.id, userId: session.user.id, role: "Owner" },
  })

  revalidatePath("/projects")
  return { success: true, projectId: project.id }
}

export async function createProjectWithRoles(data: unknown) {
  const session = await requireAuth()

  const parsed = createProjectWizardSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { roles, techStack, coverImage, ...projectData } = parsed.data

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: { ownerId: session.user.id, ...projectData },
    })

    await tx.teamMember.create({
      data: { projectId: project.id, userId: session.user.id, role: "Owner" },
    })

    if (roles && roles.length > 0) {
      for (const role of roles) {
        const created = await tx.role.create({
          data: { projectId: project.id, title: role.title, description: role.description ?? null },
        })

        if (role.tags && role.tags.length > 0) {
          for (const tagName of role.tags) {
            const tag = await tx.tag.upsert({
              where: { name: tagName },
              create: { name: tagName, category: "tech" },
              update: {},
            })
            await tx.roleTag.create({
              data: { roleId: created.id, tagId: tag.id },
            })
          }
        }
      }
    }

    return project
  })

  revalidatePath("/projects")
  redirect(`/projects/${result.id}`)
}

export async function updateProject(projectId: string, data: unknown) {
  const session = await requireAuth()
  await assertProjectOwner(projectId, session.user.id)

  const parsed = projectSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.project.update({
    where: { id: projectId },
    data: parsed.data,
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteProject(projectId: string) {
  const session = await requireAuth()
  await assertProjectOwner(projectId, session.user.id)
  await prisma.project.delete({ where: { id: projectId } })
  revalidatePath("/projects")
  return { success: true }
}

export async function addRole(data: unknown) {
  const parsed = roleSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { projectId, tags, ...roleData } = parsed.data

  const role = await prisma.role.create({
    data: { projectId, ...roleData },
  })

  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName, category: "tech" },
        update: {},
      })
      await prisma.roleTag.create({
        data: { roleId: role.id, tagId: tag.id },
      })
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function updateRole(roleId: string, data: unknown) {
  const parsed = roleSchema.partial().safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { projectId: true } })
  if (!role) return { error: "Role not found" }

  const session = await requireAuth()
  await assertProjectOwner(role.projectId, session.user.id)

  const { tags, ...roleData } = parsed.data

  await prisma.role.update({ where: { id: roleId }, data: roleData })

  if (tags) {
    await prisma.roleTag.deleteMany({ where: { roleId } })
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName, category: "tech" },
        update: {},
      })
      await prisma.roleTag.create({ data: { roleId, tagId: tag.id } })
    }
  }

  revalidatePath(`/projects/${role.projectId}`)
  return { success: true }
}

export async function removeRole(roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { projectId: true } })
  if (!role) return { error: "Role not found" }

  const session = await requireAuth()
  await assertProjectOwner(role.projectId, session.user.id)

  await prisma.role.delete({ where: { id: roleId } })
  revalidatePath(`/projects/${role.projectId}`)
  return { success: true }
}
