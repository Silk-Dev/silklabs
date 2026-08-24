"use server"

import { prisma } from "@/lib/prisma"

type NotificationPayload = {
  type: string
  title: string
  body?: string
  link?: string
}

export async function createNotification(
  userId: string,
  data: NotificationPayload
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link,
    },
  })

  await notifyPg(userId, JSON.stringify(notification))

  return notification
}

export async function createNotificationForProjectOwner(
  projectId: string,
  data: NotificationPayload
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })
  if (!project) return

  return createNotification(project.ownerId, data)
}

export async function notifyOnApplication(
  projectId: string,
  applicantName: string,
  roleTitle: string
) {
  return createNotificationForProjectOwner(projectId, {
    type: "new_application",
    title: "New Application",
    body: `${applicantName} applied for ${roleTitle}`,
    link: `/projects/${projectId}`,
  })
}

export async function notifyOnApplicationStatus(
  applicantId: string,
  projectTitle: string,
  roleTitle: string,
  status: string
) {
  return createNotification(applicantId, {
    type: "application_status",
    title: `Application ${status}`,
    body: `Your application for ${roleTitle} in ${projectTitle} was ${status}`,
    link: `/projects`,
  })
}

export async function notifyOnTeamMemberAdded(
  userId: string,
  projectTitle: string,
  addedByName: string
) {
  return createNotification(userId, {
    type: "team_invite",
    title: "Team Invite",
    body: `${addedByName} added you to ${projectTitle}`,
    link: `/projects`,
  })
}

async function notifyPg(userId: string, payload: string) {
  const channel = `notify_${userId.replace(/-/g, "_")}`
  // Fail closed: never interpolate an unvalidated identifier into raw SQL.
  if (!/^[a-zA-Z0-9_]+$/.test(channel)) {
    throw new Error(`Invalid pg_notify channel derived from userId: ${channel}`)
  }
  try {
    await prisma.$executeRawUnsafe(
      `SELECT pg_notify('${channel}', $1)`,
      payload
    )
  } catch {
    // pg_notify best-effort; notification is already in DB
  }
}
