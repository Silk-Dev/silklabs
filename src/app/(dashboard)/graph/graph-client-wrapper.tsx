"use client"

import dynamic from "next/dynamic"
import { forwardRef, useImperativeHandle, useRef } from "react"

// Forward a ref so GraphConsole can pass genome state to the canvas
const GraphClient = dynamic(() => import("@/components/graph/graph-client"), {
  ssr: false,
})

export default function GraphCanvas({ genomeMode, genomeAtoms }: {
  genomeMode?: string
  genomeAtoms?: string[]
}) {
  return <GraphClient genomeMode={genomeMode} genomeAtoms={genomeAtoms} />
}
