"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Placeholder } from "@tiptap/extensions"
import { toast } from "sonner"
import { updateProjectStory } from "@/services/project.service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface StoryEditorDialogProps {
  projectId: string
  projectTitle: string
  initialWhatWeAre: string | null
  initialWhatWereBuilding: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn =
    "h-7 px-2 font-mono text-[10px] uppercase tracking-[0.06em] border border-border-metal bg-surface/60 text-outline hover:bg-surface hover:text-primary data-[active=true]:border-primary-container/40 data-[active=true]:text-primary-container"

  const items = [
    { label: "B", active: () => editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "I", active: () => editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "H2", active: () => editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "H3", active: () => editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "• List", active: () => editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "1. List", active: () => editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", active: () => editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Undo", active: () => false, run: () => editor.chain().focus().undo().run() },
    { label: "Redo", active: () => false, run: () => editor.chain().focus().redo().run() },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          data-active={item.active()}
          className={btn}
          onClick={item.run}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function StoryField({
  name,
  label,
  hint,
  initialContent,
  placeholder,
}: {
  name: string
  label: string
  hint: string
  initialContent: string | null
  placeholder: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        Placeholder.configure({ placeholder }),
      ],
      content: initialContent ?? "",
      editorProps: {
        attributes: {
          class:
            "min-h-[140px] max-h-[320px] overflow-y-auto border border-border-metal bg-surface/40 p-4 font-mono text-[12px] leading-relaxed tracking-[0.04em] text-outline focus:outline-none focus:border-primary-container/30",
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (inputRef.current) {
          inputRef.current.value = ed.isEmpty ? "" : ed.getHTML()
        }
      },
    },
    []
  )

  return (
    <div className="space-y-2">
      {/* Hidden input carries the live HTML into the surrounding form's submit handler. */}
      <input type="hidden" name={name} ref={inputRef} defaultValue={initialContent ?? ""} />
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-primary">{label}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">{hint}</p>
      </div>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

export function StoryEditorDialog({
  projectId,
  projectTitle,
  initialWhatWeAre,
  initialWhatWereBuilding,
  open,
  onOpenChange,
}: StoryEditorDialogProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [wipeFields, setWipeFields] = useState<string[] | null>(null)
  const [pendingValues, setPendingValues] = useState<{ whatWeAre: string | null; whatWereBuilding: string | null } | null>(null)

  async function doSave(values: { whatWeAre: string | null; whatWereBuilding: string | null }) {
    setSaving(true)
    try {
      const result = await updateProjectStory(projectId, values)
      if (result && "error" in result && result.error) {
        toast.error("Failed to save story")
      } else {
        toast.success("Campaign story updated")
        onOpenChange(false)
        router.refresh()
      }
    } catch {
      toast.error("Failed to save story")
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const values = {
      whatWeAre: (form.get("whatWeAre") as string) || null,
      whatWereBuilding: (form.get("whatWereBuilding") as string) || null,
    }

    // Trust guard: clearing a published section must be an explicit decision.
    const wipes: string[] = []
    if (initialWhatWeAre && !values.whatWeAre) wipes.push("\u201cWhat we are\u201d")
    if (initialWhatWereBuilding && !values.whatWereBuilding) wipes.push("\u201cWhat we're building\u201d")
    if (wipes.length > 0) {
      setPendingValues(values)
      setWipeFields(wipes)
      return
    }

    setWipeFields(null)
    await doSave(values)
  }

  async function handleDiscardAndSave() {
    setWipeFields(null)
    if (pendingValues) await doSave(pendingValues)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Edit campaign story</DialogTitle>
          <DialogDescription>
            Shape how &ldquo;{projectTitle}&rdquo; reads to potential teammates.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <StoryField
              name="whatWeAre"
              label="What we are"
              hint="Who is behind this venture and why does it exist?"
              initialContent={initialWhatWeAre}
              placeholder="Tell your origin story…"
            />
            <StoryField
              name="whatWereBuilding"
              label="What we're building"
              hint="The product, the problem it solves, who it's for."
              initialContent={initialWhatWereBuilding}
              placeholder="Describe what you're building…"
            />

            {wipeFields && (
              <div className="border border-destructive/40 bg-destructive/10 p-3" role="alert">
                <p className="font-mono text-[11px] leading-relaxed text-destructive">
                  Warning: saving will remove the published {wipeFields.join(" and ")} section{wipeFields.length > 1 ? "s" : ""}.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-7 font-mono text-[10px]" onClick={() => setWipeFields(null)}>
                    Keep editing
                  </Button>
                  <Button type="button" variant="destructive" size="sm" className="h-7 font-mono text-[10px]" disabled={saving} onClick={handleDiscardAndSave}>
                    Discard &amp; save
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save story"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
