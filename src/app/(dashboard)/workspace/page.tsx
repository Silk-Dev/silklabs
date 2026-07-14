import { getMessages } from "@/services/workspace.service"
import { WorkspaceClient } from "./workspace-client"

export const dynamic = "force-dynamic"

export default async function WorkspacePage() {
  const messages = await getMessages()

  return <WorkspaceClient initialMessages={messages} />
}
