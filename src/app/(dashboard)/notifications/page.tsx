import { getNotifications } from "@/services/workspace.service"
import { NotificationsClient } from "./notifications-client"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const notifications = await getNotifications()

  return <NotificationsClient initialNotifications={notifications} />
}
