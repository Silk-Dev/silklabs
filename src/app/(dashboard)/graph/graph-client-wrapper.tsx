"use client"

import dynamic from "next/dynamic"

const GraphClient = dynamic(() => import("@/components/graph/graph-client"), {
  ssr: false,
})

export default function DynGraphClient() {
  return <GraphClient />
}
