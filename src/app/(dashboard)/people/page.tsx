import { getPeople } from "@/services/people.service"
import { PeopleList } from "./people-list"
import { PeopleHeader } from "./people-header"

export const dynamic = "force-dynamic"

export default async function PeoplePage() {
  const people = await getPeople()

  const onlineCount = people.length

  return (
    <div className="space-y-6 [animation:entrance_0.5s_ease-out_both]">
      <PeopleHeader onlineCount={onlineCount} totalCount={people.length} />
      <PeopleList people={people} />
    </div>
  )
}
