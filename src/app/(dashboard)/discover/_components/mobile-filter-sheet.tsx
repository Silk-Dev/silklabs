"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SlidersHorizontalIcon } from "lucide-react"
import { DiscoverFilters } from "./discover-filters"

interface MobileFilterSheetProps {
  tags: { id: string; name: string; category: string | null }[]
  selectedTags: string[]
  selectedPhase: string | null
  roleAvailableOnly: boolean
}

export function MobileFilterSheet(props: MobileFilterSheetProps) {
  return (
    <Sheet>
      <SheetTrigger>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontalIcon className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <DiscoverFilters {...props} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
