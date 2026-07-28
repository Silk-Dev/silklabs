"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ─── Constants ───
const COLS: Record<string, string> = {
  "Artificial Intelligence": "#00f0ff",
  "Hardware & Robotics": "#ff5c00",
  "Enterprise Software & SaaS": "#60a5fa",
  Fintech: "#34d399",
  "Healthcare & Biotech": "#f87171",
  "Consumer & E-commerce": "#f472b6",
  "Education & HR": "#a78bfa",
  "Media & Entertainment": "#fb923c",
  "Climate & Energy": "#4ade80",
  "Transportation & Logistics": "#22d3ee",
  "Security & Infrastructure": "#818cf8",
  "Legal, Gov & Civic Tech": "#c084fc",
}
const CATS = Object.keys(COLS)
const CTRY_COLS = [
  "#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA",
  "#FCBAD3", "#A8D8EA", "#FFD3B6", "#45B7D1", "#FFA07A", "#98FB98",
  "#DDA0DD", "#F0E68C", "#FFB347", "#77DD77", "#89CFF0", "#FF6961",
]
const R1 = 4
const R2 = 10
const R3 = 22

let nextUid = 0
const uid = () => ++nextUid

export default function GraphClient({ genomeMode, genomeAtoms }: {
  genomeMode?: string
  genomeAtoms?: string[]
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [wasmStatus, setWasmStatus] = useState<"loading" | "loaded" | "failed">("loading")

  // All state is stored in a ref to avoid re-renders during animation frames
  const S = useRef<any>({
    tags: [], pos: [], counts: [], edges: [], tagCos: {}, cats: [], hier: {},
    tagCat: {}, tagSub: {}, sel: new Set<string>(), suggested: new Set<string>(),
    idxMap: {} as Record<string, number>, wasm: null as any,
    tx: 0, ty: 0, scale: 1, drag: false, dragOx: 0, dragOy: 0, dragTx: 0, dragTy: 0, hoverIdx: -1,
    catNodes: [] as any[], subNodes: [] as any[],
    countries: [] as string[], tagCountries: {} as Record<string, Record<string, number>>,
    selCtries: new Set<string>(), ctryColors: {} as Record<string, string>,
    companyLookup: null as any, tagEmbs: [] as number[][],
    initialScale: 1,
  })
  const [tab, setTab] = useState("tags")
  const [ideaStatus, setIdeaStatus] = useState("")
  const SCALED = useRef<any[]>([])
  const compareRef = useRef<{ a: (name: string) => void; b: (name: string) => void }>(null!)
  const genomeAtomsRef = useRef<string[]>([])
  genomeAtomsRef.current = genomeAtoms || []
  let W = 0, H = 0

  // ─── Data loading ───
  useEffect(() => {
    const s = S.current
    Promise.all([
      fetch("/graph/graph_data.json").then((r) => r.json()),
      fetch("/graph/graph_engine.wasm")
        .then((r) => r.arrayBuffer())
        .then((buf) => WebAssembly.instantiate(buf, {
          env: {},
          wasi_snapshot_preview1: { fd_write: () => 0, fd_close: () => 0, fd_seek: () => 0, fd_read: () => 0 },
        }))
        .then((mod) => { s.wasm = mod.instance.exports; setWasmStatus("loaded") })
        .catch(() => { setWasmStatus("failed"); console.warn("Graph: WASM culling engine failed to load — falling back to full-node render. Compile graph_engine.cpp with Emscripten if needed.") }),
      fetch("/graph/companies_light.json")
        .then((r) => r.json())
        .then((cs) => {
          s.companyLookup = {}
          for (const c of cs) {
            const key = (c.n || '').toLowerCase().trim()
            if (key) s.companyLookup[key] = { name: c.n, tags: c.t || [], country: c.c || '', source: c.s || '', description: '' }
          }
        })
        .catch(() => {}),
    ]).then(([d]) => {
      s.tags = d.tags
      s.tagEmbs = d.tagEmbs || []
      s.pos = d.positions
      s.counts = d.tagCounts
      s.maxCount = Math.max(...d.tagCounts)
      s.edges = d.edges
      s.tagCos = d.tagCompanies
      s.cats = d.categories
      s.hier = d.hierarchy
      for (const c of d.categories) for (const tn of c.tagNames) {
        s.tagCat[tn] = c.path[0] || ""
        s.tagSub[tn] = c.path[1] || ""
      }
      s.tags.forEach((t: string, i: number) => { s.idxMap[t] = i })
      if (d.countries) {
        s.countries = d.countries
        s.tagCountries = d.tagCountries || {}
        s.countries.forEach((c: string, i: number) => { s.ctryColors[c] = CTRY_COLS[i % CTRY_COLS.length] })
      }
      computeRadialLayout(s, SCALED)
      s.baseScales = SCALED.current.map(p => [p[0], p[1]])
      setReady(true)
    })
  }, [])

  // ─── Canvas setup ───
  useEffect(() => {
    if (!ready) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const s = S.current
    let animId = 0
    let dirty = false
    let prevTime = 0
    const CAM_LERP = 0.08

    const scheduleAnim = () => {
      dirty = true
      if (!animId) animId = requestAnimationFrame(draw)
    }

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * devicePixelRatio
      canvas.height = H * devicePixelRatio
      canvas.style.width = W + "px"
      canvas.style.height = H + "px"
      ctx.scale(devicePixelRatio, devicePixelRatio)
      setInitialScale(s, SCALED.current, W, H)
      scheduleAnim()
    }

    resize()
    window.addEventListener("resize", resize)

    function draw(time: number) {
      const dt = prevTime ? Math.min((time - prevTime) / (1000 / 60), 3) : 1
      prevTime = time
      animId = 0
      if (!dirty && !camTarget && s.hoverIdx < 0) return
      dirty = false
      ctx.clearRect(0, 0, W, H)
      const scaled = SCALED.current
      if (!scaled.length) { scheduleAnim(); return }

      // Camera animation (lerp toward target)
      if (camTarget) {
        const tx = camTarget.x, ty = camTarget.y
        const dx = tx - s.tx, dy = ty - s.ty
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) { s.tx = tx; s.ty = ty; camTarget = null }
        else { const t = 1 - Math.pow(1 - CAM_LERP, dt); s.tx += dx * t; s.ty += dy * t }
      }

      // Reset from base positions each frame so hover pull doesn't accumulate
      if (s.baseScales) {
        for (let i = 0; i < scaled.length; i++) {
          if (s.baseScales[i]) {
            scaled[i][0] = s.baseScales[i][0]
            scaled[i][1] = s.baseScales[i][1]
          }
        }
      }

      // Hover smudge: pull connected nodes toward hovered
      if (s.hoverIdx >= 0 && s.edges) {
        const hx = scaled[s.hoverIdx][0], hy = scaled[s.hoverIdx][1]
        const connected = new Set<number>()
        for (const e of s.edges) {
          const a = e[0] as number, b = e[1] as number
          if (a === s.hoverIdx) connected.add(b)
          if (b === s.hoverIdx) connected.add(a)
        }
        if (connected.size > 0) {
          const pullMax = 0.3 / s.scale
          for (const ci of connected) {
            const [cx, cy] = scaled[ci] || [0, 0]
            const dx = hx - cx, dy = hy - cy
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist > 0) {
              const pull = Math.min(pullMax, pullMax * Math.min(1, dist / 15))
              scaled[ci][0] += dx * pull
              scaled[ci][1] += dy * pull
            }
          }
        }
      }

      const visible = cullNodes(s, SCALED.current, W, H)
      const visSet = visible ? new Set(visible) : null

      ctx.save()
      ctx.translate(W / 2, H / 2)
      ctx.scale(s.scale, s.scale)
      ctx.translate(-s.tx, -s.ty)

      const maxC = s.maxCount
      const sel = s.sel
      const z = s.initialScale ? s.scale / s.initialScale : 0

      let activeCats: Set<string> | undefined, activeSubs: Set<string> | undefined
      if (sel.size > 0) {
        activeCats = new Set()
        activeSubs = new Set()
        for (const t of sel) {
          const c = s.tagCat[t]
          const sb = s.tagSub[t]
          if (c) activeCats.add(c)
          if (sb) activeSubs.add(sb)
        }
      }
      const dim = (v: any) => sel.size > 0 && !v

      // Spokes
      ctx.strokeStyle = "rgba(255,255,255,0.05)"
      ctx.lineWidth = 1 / s.scale
      for (const cat of CATS) {
        const subs = s.hier[cat]
        if (!subs) continue
        for (const [sn, ts] of Object.entries(subs)) {
          if (!(ts as string[]).length) continue
          const idx = s.idxMap[(ts as string[])[0]]
          if (idx === undefined) continue
          const [x, y] = scaled[idx]
          const a = Math.atan2(y, x)
          let maxR = 0
          for (const t of ts as string[]) {
            const i = s.idxMap[t]
            if (i === undefined) continue
            const [px, py] = scaled[i]
            const r = Math.sqrt(px * px + py * py)
            if (r > maxR) maxR = r
          }
          const spDim = dim(activeSubs && activeSubs.has(sn))
          ctx.globalAlpha = spDim ? 0.01 : 0.05
          ctx.beginPath()
          ctx.moveTo(R1 * 0.5 * Math.cos(a), R1 * 0.5 * Math.sin(a))
          ctx.lineTo(maxR * Math.cos(a), maxR * Math.sin(a))
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1

      // Category arcs
      if (s.catNodes) {
        ctx.lineWidth = 3 / s.scale
        for (let ci = 0; ci < s.catNodes.length; ci++) {
          const cn = s.catNodes[ci]
          const aStart = (ci / s.catNodes.length) * 2 * Math.PI - Math.PI / 2 + 0.02
          const aEnd = ((ci + 1) / s.catNodes.length) * 2 * Math.PI - Math.PI / 2 - 0.02
          const caDim = dim(activeCats && activeCats.has(cn.name))
          ctx.globalAlpha = caDim ? 0.08 : 0.5
          ctx.beginPath()
          ctx.arc(0, 0, R1, aStart, aEnd)
          ctx.strokeStyle = cn.color
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }

      // Category labels
      if (s.catNodes && z > 1.2) {
        for (const cn of s.catNodes) {
          const x = R1 * Math.cos(cn.angle)
          const y = R1 * Math.sin(cn.angle)
          const caDim = dim(activeCats && activeCats.has(cn.name))
          if (caDim) ctx.globalAlpha = 0.1
          const lbl = cn.name.length > 10 ? cn.name.slice(0, 8) + ".." : cn.name
          ctx.fillStyle = cn.color
          ctx.font = `bold ${Math.min(10, 7 * z) / s.scale}px sans-serif`
          ctx.textBaseline = "middle"
          ctx.save()
          ctx.translate(x, y)
          // Flip label on left half so text isn't upside-down
          const flip = cn.angle > Math.PI / 2 || cn.angle < -Math.PI / 2
          if (flip) {
            ctx.rotate(cn.angle + Math.PI)
            ctx.textAlign = "right"
            ctx.fillText(lbl, -5 / s.scale, 0)
          } else {
            ctx.rotate(cn.angle)
            ctx.textAlign = "left"
            ctx.fillText(lbl, 5 / s.scale, 0)
          }
          ctx.restore()
          if (caDim) ctx.globalAlpha = 1
        }
      }

      // Subcategory dots
      if (s.subNodes && s.scale > 0.5) {
        for (const sn of s.subNodes) {
          const x = R2 * Math.cos(sn.angle)
          const y = R2 * Math.sin(sn.angle)
          const dr = 4 / s.scale
          const rgb = hex2rgb(sn.color)
          const sbDim = dim(activeSubs && activeSubs.has(sn.name))
          const sa = sbDim ? 0.08 : 0.5
          ctx.beginPath()
          ctx.arc(x, y, dr, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${sa})`
          ctx.fill()
          ctx.strokeStyle = sbDim ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.1)"
          ctx.lineWidth = 0.5 / s.scale
          ctx.stroke()
          if (z > 2.5) {
            const fs = Math.min(12, 6 * z) / s.scale
            ctx.fillStyle = sbDim ? "#444" : "#888"
            ctx.font = `${fs}px sans-serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            const lbl = sn.name.length > 14 ? sn.name.slice(0, 12) + "…" : sn.name
            ctx.fillText(lbl, x, y + dr + 2 / s.scale)
          }
        }
      }

      // Tag nodes
      for (let i = 0; i < s.tags.length; i++) {
        if (visSet && !visSet.has(i)) continue
        const t = s.tags[i]
        const c = s.counts[i]
        const [x, y] = scaled[i]
        const r = (8 + (c / maxC) * 6) / s.scale
        const col = tcol(s, t)
        const rgb = hex2rgb(col)

        const ctrySel = s.selCtries.size > 0
        const ctryMatches: string[] = []
        if (ctrySel) {
          const tc = s.tagCountries[String(i)]
          if (tc) for (const ct of s.selCtries) { if (tc[ct]) ctryMatches.push(s.ctryColors[ct]) }
        }
        const ctryMatch = ctryMatches.length > 0
        const hl = (sel.size === 0 || sel.has(t)) && (!ctrySel || ctryMatch)
        const isSug = !sel.has(t) && s.suggested && s.suggested.has(t)

        if (!hl && !isSug) ctx.globalAlpha = 0.2
        else if (sel.has(t)) ctx.globalAlpha = 1
        else if (isSug && sel.size > 0) ctx.globalAlpha = 0.5
        else ctx.globalAlpha = sel.size === 0 ? 1 : 0.15

        // Glow (only for highlighted nodes; skip when nothing selected — 16K+ redundant gradients)
        if ((hl || isSug) && sel.size > 0) {
          const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5)
          grd.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${hl ? 0.25 : 0.08})`)
          grd.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`)
          ctx.fillStyle = grd
          ctx.beginPath()
          ctx.arc(x, y, r * 2.5, 0, Math.PI * 2)
          ctx.fill()
        }

        // Circle
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${hl ? 0.9 : 0.3})`
        ctx.fill()
        ctx.strokeStyle = `rgba(255,255,255,${hl ? 0.15 : 0.05})`
        ctx.lineWidth = 1 / s.scale
        ctx.stroke()

        // Suggested dashed border
        if (isSug && sel.size > 0) {
          ctx.setLineDash([3 / s.scale, 3 / s.scale])
          ctx.beginPath()
          ctx.arc(x, y, r + 1.5 / s.scale, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.6)`
          ctx.lineWidth = 1.5 / s.scale
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Country ring
        if (ctryMatch) {
          ctx.beginPath()
          ctx.arc(x, y, r + 1.5 / s.scale, 0, Math.PI * 2)
          ctx.strokeStyle = ctryMatches[0]
          ctx.lineWidth = 2 / s.scale
          ctx.stroke()
        }

        // Label: only for hovered, selected, or suggested nodes
        if (z > 2.5 && (i === s.hoverIdx || sel.has(t) || isSug)) {
          const fs = Math.min(13, 7 * z) / s.scale
          ctx.fillStyle = isSug ? "#888" : hl ? "#fff" : "#666"
          ctx.font = `${fs}px sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          const lbl = t.length > 12 ? t.slice(0, 10) + ".." : t
          ctx.fillText(lbl, x, y + r + 2 / s.scale)
        }
      }

      // ── Genome-aware overlay ──
      const ga = genomeAtomsRef.current
      if (ga.length > 0) {
        for (let i = 0; i < s.tags.length; i++) {
          const t = s.tags[i]
          if (ga.includes(t.toLowerCase())) {
            const [x, y] = scaled[i]
            const r = (8 + (s.counts[i] / maxC) * 6) / s.scale
            // Bright highlight ring
            ctx.beginPath()
            ctx.arc(x, y, r + 3 / s.scale, 0, Math.PI * 2)
            ctx.strokeStyle = "#22c55e"
            ctx.lineWidth = 2 / s.scale
            ctx.stroke()
            // Glow
            const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
            grd.addColorStop(0, "rgba(34,197,94,0.15)")
            grd.addColorStop(1, "rgba(34,197,94,0)")
            ctx.fillStyle = grd
            ctx.beginPath()
            ctx.arc(x, y, r * 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      ctx.restore()
      ctx.globalAlpha = 1
      if (camTarget || s.hoverIdx >= 0 || s.drag) animId = requestAnimationFrame(draw)
    }

    // Camera animation state
    let camTarget: { x: number; y: number } | null = null

    scheduleAnim()

    // ─── Interaction handlers ───
    const hitTest = (px: number, py: number, useSmudge = false) => {
      const [wx, wy] = screenToWorld(s, px, py, W, H)
      const maxC = s.maxCount
      let best = -1
      let bestD = Infinity
      const sc = SCALED.current
      for (let i = 0; i < s.tags.length; i++) {
        const [x, y] = sc[i] || [0, 0]
        const r = (8 + (s.counts[i] / maxC) * 6) / s.scale
        const dx = x - wx
        const dy = y - wy
        const d = dx * dx + dy * dy
        if (d < r * r && d < bestD) {
          best = i
          bestD = d
        }
      }
      return best
    }

    const onMouseDown = (e: MouseEvent) => {
      s.drag = true
      s.dragOx = e.clientX
      s.dragOy = e.clientY
      s.dragTx = s.tx
      s.dragTy = s.ty
      // Cancel camera animation on drag
      camTarget = null
      scheduleAnim()
    }

    const onMouseMove = (e: MouseEvent) => {
      if (s.drag) {
        s.tx = s.dragTx - (e.clientX - s.dragOx) / s.scale
        s.ty = s.dragTy - (e.clientY - s.dragOy) / s.scale
        camTarget = null
        scheduleAnim()
      }
      const idx = hitTest(e.clientX, e.clientY)
      if (idx !== s.hoverIdx) {
        const prevHover = s.hoverIdx
        s.hoverIdx = idx
        canvas!.style.cursor = idx >= 0 ? "pointer" : "grab"
        // Restore base positions when hover ends so hitTest stays accurate
        if (prevHover >= 0 && idx < 0 && s.baseScales) {
          const sc = SCALED.current
          for (let i = 0; i < sc.length; i++) {
            if (s.baseScales[i]) { sc[i][0] = s.baseScales[i][0]; sc[i][1] = s.baseScales[i][1] }
          }
        }
        scheduleAnim()
      }
    }

    const onMouseUp = () => { s.drag = false }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const dz = -e.deltaY * 0.001
      const ns = Math.max(s.scale * 0.1, Math.min(s.scale * 5, s.scale * (1 + dz)))
      const mx = e.clientX
      const my = e.clientY
      const wx = (mx - W / 2) / s.scale + s.tx
      const wy = (my - H / 2) / s.scale + s.ty
      s.scale = ns
      s.tx = wx - (mx - W / 2) / s.scale
      s.ty = wy - (my - H / 2) / s.scale
      scheduleAnim()
    }

    const onClick = (e: MouseEvent) => {
      if (s.drag && (Math.abs(e.clientX - s.dragOx) > 3 || Math.abs(e.clientY - s.dragOy) > 3)) return
      const idx = hitTest(e.clientX, e.clientY)
      if (idx >= 0) {
        toggleTag(s.tags[idx])
        // Animate camera to center on clicked node
        const [x, y] = SCALED.current[idx] || [0, 0]
        camTarget = { x, y }
        scheduleAnim()
      }
    }

    canvas!.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    canvas!.addEventListener("wheel", onWheel, { passive: false })
    canvas!.addEventListener("click", onClick)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
      canvas!.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      canvas!.removeEventListener("wheel", onWheel)
      canvas!.removeEventListener("click", onClick)
    }
  }, [ready])

  // ─── Tag selection (DOM-only update, no React re-render) ───
  const updateChipsDOM = useCallback(() => {
    const el = document.getElementById("tab-tags-cc")
    if (!el) return
    const s = S.current
    el.innerHTML = ""
    for (const t of s.sel) {
      const c = document.createElement("span")
      c.className = "inline-flex items-center gap-0.5 px-2 py-0.5 bg-white/[0.06] rounded-xl text-[11px] text-gray-300 cursor-pointer hover:bg-white/[0.12]"
      c.innerHTML = `${t}<span style="font-size:13px;color:#555;margin-left:2px;line-height:1">×</span>`
      c.onclick = () => { s.sel.delete(t); updateSuggested(s); updateChipsDOM() }
      el.appendChild(c)
    }
    for (const c of s.selCtries) {
      const ch = document.createElement("span")
      ch.className = "inline-flex items-center gap-0.5 px-2 py-0.5 bg-white/[0.06] rounded-xl text-[11px] text-gray-300 cursor-pointer hover:bg-white/[0.12]"
      ch.innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full mr-1" style="background:${s.ctryColors[c]}"></span>${c}<span style="font-size:13px;color:#555;margin-left:2px;line-height:1">×</span>`
      ch.onclick = () => { s.selCtries.delete(c); updateChipsDOM() }
      el.appendChild(ch)
    }
    // Match count
    const mc = document.getElementById("tab-tags-mc")
    if (!mc) return
    if (!s.sel.size && !s.selCtries.size) { mc.textContent = ""; return }
    const selArr = Array.from(s.sel) as string[]
    let match: string[] | null = null
    if (selArr.length) {
      for (const t of selArr) {
        const idx = s.idxMap[t]
        if (idx === undefined) continue
        const cos = s.tagCos[String(idx)]
        if (!cos) continue
        const names = cos.map((c: any) => c.n)
        if (match === null) match = names
        else match = match.filter((n) => names.includes(n))
      }
    } else {
      match = []
      for (const cos of Object.values(s.tagCos) as any) {
        for (const e of cos) match.push(e.n)
      }
    }
    const n = match ? match.length : 0
    mc.textContent = `${n} compan${n !== 1 ? "ies" : "y"}`
    // Update legend selection
    document.querySelectorAll("#ltree > div > div:first-child > span:nth-child(3)").forEach((el) => {
      const name = el.textContent || ""
      const parent = el.closest("div")
      if (parent) {
        const div = parent as HTMLDivElement
        if (s.sel.has(name)) {
          div.style.color = "#dbfcff"
          div.style.fontWeight = "500"
        } else {
          div.style.color = ""
          div.style.fontWeight = ""
        }
      }
    })
  }, [])

  const addTag = useCallback((t: string) => {
    const s = S.current
    if (s.sel.has(t)) return
    s.sel.add(t)
    updateSuggested(s)
    updateChipsDOM()
  }, [updateChipsDOM])

  const removeTag = useCallback((t: string) => {
    const s = S.current
    if (!s.sel.has(t)) return
    s.sel.delete(t)
    updateSuggested(s)
    updateChipsDOM()
  }, [updateChipsDOM])

  const toggleTag = useCallback((t: string) => {
    if (S.current.sel.has(t)) removeTag(t)
    else addTag(t)
  }, [addTag, removeTag])

  // ─── Build legend (once ready) ───
  const legendRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ready || !legendRef.current) return
    const s = S.current
    const el = legendRef.current
    el.innerHTML = ""
    for (const cat of CATS) {
      const subs = s.hier[cat]
      if (!subs) continue
      let tc = 0
      for (const t of Object.values(subs)) tc += (t as string[]).length
      const d = document.createElement("div")
      d.className = "mx-1 mb-0.5 rounded-md cursor-pointer hover:bg-white/[0.03]"
      d.innerHTML = `<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;font-size:12px;font-weight:500;color:#dbfcff;user-select:none;border-radius:0.375rem"><span class="ar">▶</span><span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${COLS[cat]}"></span><span style="flex:1">${cat}</span><span style="font-size:10px;color:#666;margin-left:auto">${tc}</span></div><div class="lsc"></div>`
      const h = d.firstElementChild!
      const sc = d.querySelector(".lsc")!
      h.addEventListener("click", () => { sc.classList.toggle("on"); h.querySelector(".ar")!.classList.toggle("on") })
      for (const [sn, ts] of Object.entries(subs)) {
        const sd = document.createElement("div")
        sd.className = "my-0.5"
        sd.innerHTML = `<div style="display:flex;align-items:center;gap:5px;padding:4px 6px;font-size:11px;color:#aaa;cursor:pointer;border-radius:0.25rem;user-select:none"><span class="ar" style="width:10px;font-size:8px">▶</span><span style="flex:1">${sn}</span></div><div class="ltg"></div>`
        const sh = sd.firstElementChild!
        const tg = sd.querySelector(".ltg")!
        sh.addEventListener("click", (e) => { e.stopPropagation(); tg.classList.toggle("on"); sh.querySelector(".ar")!.classList.toggle("on") })
        for (const tag of ts as string[]) {
          const idx = s.idxMap[tag]
          const cnt = idx !== undefined ? s.counts[idx] : 0
          const td = document.createElement("div")
          td.className = "flex items-center gap-1 py-0.5 px-1.5 text-[10px] text-gray-500 cursor-pointer rounded hover:bg-white/[0.04] hover:text-gray-300 select-none"
          td.innerHTML = `<span style="width:5px;height:5px;border-radius:50%;flex-shrink:0;opacity:0.5;background:${COLS[cat]}"></span><span style="flex:1">${tag}</span><span style="font-size:9px;color:#555;margin-left:auto">${cnt}</span>`
          td.addEventListener("click", (e) => { e.stopPropagation(); toggleTag(tag) })
          tg.appendChild(td)
        }
        if ((ts as string[]).length <= 3) { tg.classList.add("on"); sh.querySelector(".ar")!.classList.add("on") }
        sc.appendChild(sd)
      }
      if (CATS.indexOf(cat) < 3) { sc.classList.add("on"); h.querySelector(".ar")!.classList.add("on") }
      el.appendChild(d)
    }
  }, [ready, toggleTag])

  // ─── Tags tab content ───
  return (
    <>
      {/* WASM warning banner */}
      {wasmStatus === "failed" && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-950/80 px-3 py-1.5 backdrop-blur-sm shadow-lg">
          <span className="text-amber-400 text-[11px]">⚠</span>
          <span className="font-mono text-[10px] text-amber-300">Graph culling unavailable — all nodes shown. No action needed.</span>
          <button className="ml-2 text-amber-400/60 hover:text-amber-300 text-[10px]" onClick={() => setWasmStatus("loaded" satisfies any)}>✕</button>
        </div>
      )}

      {/* Loading state */}
      {!ready && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#0d1515" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-outline border-t-transparent rounded-full animate-spin" />
            <span className="text-outline font-mono text-sm">Loading graph…</span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} id="canvas" className="fixed inset-0 top-14 block z-5" style={{ background: "#0d1515", willChange: "transform" }} />

      {/* Right Panel (combined legend + tabs) */}
      <div className="fixed top-3 right-3 z-10 w-[300px] bg-surface border border-border-metal rounded-xl shadow-2xl flex flex-col" style={{ maxHeight: "calc(100vh - 16px)" }}>
        {/* Collapsible legend section */}
        <details className="group border-b border-border-metal [&_summary::-webkit-details-marker]:hidden" open>
          <summary className="flex items-center gap-2 px-3 py-2 font-mono text-[11px] font-medium tracking-[0.06em] text-outline uppercase cursor-pointer select-none hover:text-foreground">
            <span className="ar on">▶</span> Tags ({S.current.tags.length})
          </summary>
          <div ref={legendRef} className="overflow-y-auto max-h-[35vh] border-t border-border-metal pt-1"></div>
        </details>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b border-border-metal bg-transparent px-0">
            {["tags", "companies", "compare", "decon"].map((t) => (
              <TabsTrigger key={t} value={t} className="flex-1 text-[11px] h-8 rounded-none data-active:bg-transparent data-active:border-b-2 data-active:border-primary data-active:text-foreground">
                {t === "tags" ? "Tags" : t === "decon" ? "Decon" : t.charAt(0).toUpperCase() + t.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="tags" className="flex-1 overflow-y-auto p-2.5 space-y-2 mt-0">
            <TagsTab S={S} addTag={addTag} toggleTag={toggleTag} updateChipsDOM={updateChipsDOM} />
          </TabsContent>
          <TabsContent value="companies" className="flex-1 overflow-y-auto p-2.5 mt-0"><CompaniesTab S={S} /></TabsContent>
          <TabsContent value="compare" className="flex-1 overflow-y-auto p-2.5 mt-0"><CompareTab S={S} compareRef={compareRef} /></TabsContent>
          <TabsContent value="decon" className="flex-1 overflow-y-auto p-2.5 mt-0">
            <DeconTab S={S} ideaStatus={ideaStatus} setIdeaStatus={setIdeaStatus} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Company detail popup */}
      <CompanyDetail S={S} addTag={addTag} setTab={setTab} compareRef={compareRef} />

      {/* Tooltip */}
      <div id="tt" className="fixed z-20 bg-surface/96 border border-border-metal rounded-lg px-3 py-2 text-xs pointer-events-none hidden shadow-xl transition-opacity duration-125 ease-out">
        <div className="ttn text-foreground font-medium"></div>
        <div className="ttc text-outline mt-0.5"></div>
        <div className="tcat text-muted-foreground text-[10px] mt-0.5"></div>
      </div>
    </>
  )
}

// ═══════════════════ PRIVATE HELPERS ═══════════════════

function hex2rgb(h: string) {
  const v = parseInt(h.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

const COL_CACHE = new Map<string, string>()
function tcol(S: any, t: string) {
  let c = COL_CACHE.get(t)
  if (c) return c
  c = "#666"
  for (const cat of CATS) { if (S.tagCat[t] === cat) { c = COLS[cat]; break } }
  COL_CACHE.set(t, c)
  return c
}

function computeRadialLayout(S: any, SCALED: { current: any[] }) {
  const cats = CATS.filter((c) => S.hier[c])
  const nCats = cats.length
  SCALED.current = new Array(S.tags.length)
  const placed = new Set<string>()
  S.catNodes = []
  S.subNodes = []

  const angleDist = (i: number, n: number, center: number, span: number) => center - span / 2 + ((i + 0.5) / n) * span

  cats.forEach((cat, ci) => {
    const a0 = (ci / nCats) * 2 * Math.PI - Math.PI / 2
    S.catNodes.push({ name: cat, angle: a0, color: COLS[cat] })
    const subs = S.hier[cat]
    const sk = Object.keys(subs)
    const catArc = (2 * Math.PI) / nCats
    const sArc = Math.min(catArc * 0.85, (Math.PI * 0.8) / sk.length)

    sk.forEach((sub, si) => {
      const a1 = angleDist(si, sk.length, a0, sArc)
      S.subNodes.push({ name: sub, angle: a1, color: COLS[cat], catAng: a0 })
      const tags = subs[sub]

      tags.forEach((tag: string, ti: number) => {
        if (placed.has(tag)) return
        placed.add(tag)
        const idx = S.idxMap[tag]
        if (idx === undefined) return
        const frac = tags.length > 1 ? ti / (tags.length - 1) : 0.5
        const r = R2 + 0.6 + frac * (R3 - R2 - 0.6)
        SCALED.current[idx] = [r * Math.cos(a1), r * Math.sin(a1)]
      })

      const subIdx = S.idxMap[sub]
      if (subIdx !== undefined && !placed.has(sub)) {
        placed.add(sub)
        SCALED.current[subIdx] = [R2 * Math.cos(a1), R2 * Math.sin(a1)]
      }
    })

    const catIdx = S.idxMap[cat]
    if (catIdx !== undefined && !placed.has(cat)) {
      placed.add(cat)
      SCALED.current[catIdx] = [R1 * Math.cos(a0), R1 * Math.sin(a0)]
    }
  })

  for (let i = 0; i < S.tags.length; i++) {
    if (!SCALED.current[i]) {
      const t = S.tags[i]
      const cat = S.tagCat[t]
      const ci = cats.indexOf(cat)
      const a0 = ci >= 0 ? (ci / nCats) * 2 * Math.PI - Math.PI / 2 : Math.random() * 2 * Math.PI
      const a2 = a0 + (Math.random() - 0.5) * 0.3
      SCALED.current[i] = [R3 * Math.cos(a2), R3 * Math.sin(a2)]
    }
  }
}

function setInitialScale(S: any, scaled: any[], W: number, H: number) {
  let maxExt = 0
  for (const p of scaled) {
    if (!p) continue
    const d = Math.max(Math.abs(p[0]), Math.abs(p[1]))
    if (d > maxExt) maxExt = d
  }
  if (maxExt > 0) S.scale = (Math.min(W, H) * 0.85) / (maxExt * 2)
  if (!S.initialScale) S.initialScale = S.scale
}

function cullNodes(S: any, scaled: any[], W: number, H: number) {
  if (!S.wasm) return null
  const n = scaled.length
  const ptr = S.wasm.malloc(n * 2 * 4)
  const view = new Float32Array(S.wasm.memory.buffer, ptr, n * 2)
  for (let i = 0; i < n; i++) {
    view[i * 2] = scaled[i][0]
    view[i * 2 + 1] = scaled[i][1]
  }
  const outPtr = S.wasm.malloc(4)
  const rPtr = S.wasm.cull_nodes(ptr, n, S.tx, S.ty, W, H, S.scale, 0.5, outPtr)
  const outView = new Int32Array(S.wasm.memory.buffer, outPtr, 1)
  const count = outView[0]
  const rView = new Float32Array(S.wasm.memory.buffer, rPtr, count * 2 + 1)
  const indices: number[] = []
  for (let i = 0; i < count; i++) indices.push((rView[i * 2 + 1] | 0))
  S.wasm.free(ptr)
  S.wasm.free(outPtr)
  S.wasm.free_result(rPtr)
  return indices
}

function screenToWorld(S: any, px: number, py: number, W: number, H: number) {
  return [(px - W / 2) / S.scale + S.tx, (py - H / 2) / S.scale + S.ty]
}

function updateSuggested(S: any) {
  if (!S.sel.size) { S.suggested = new Set<string>(); return }
  const selArr = Array.from(S.sel) as string[]
  let inter: string[] | null = null
  for (const t of selArr) {
    const idx = S.idxMap[t]
    if (idx === undefined) continue
    const cos: any[] = S.tagCos[String(idx)]
    if (!cos) continue
    const names = cos.map((c: any) => c.n.toLowerCase())
    if (inter === null) inter = names
    else inter = inter.filter((n) => names.includes(n))
  }
  if (!inter || !inter.length) { S.suggested = new Set<string>(); return }
  const interSet = new Set<string>(inter)
  const sug = new Set<string>()
  for (const t of S.tags) {
    if (S.sel.has(t)) continue
    const idx = S.idxMap[t]
    if (idx === undefined) continue
    const cos: any[] = S.tagCos[String(idx)]
    if (!cos) continue
    for (const c of cos) { if (interSet.has(c.n.toLowerCase())) { sug.add(t); break } }
  }
  S.suggested = sug
}

// ═══════════════════ TAB COMPONENTS ═══════════════════

function TagsTab({ S, addTag, toggleTag, updateChipsDOM }: any) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<string[]>([])
  const [ctrySearch, setCtrySearch] = useState("")
  const [showCtry, setShowCtry] = useState(false)

  const s = S.current

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    setResults(s.tags.filter((t: string) => t.toLowerCase().includes(q) && !s.sel.has(t)).slice(0, 15))
  }, [query, s.tags, s.sel])

  const filteredCtrys = s.countries.filter((c: string) => !ctrySearch.trim() || c.toLowerCase().includes(ctrySearch.toLowerCase()))

  return (
    <div className="p-2.5 space-y-2 overflow-y-auto">
      <div className="relative">
        <Input placeholder="Search tags..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-7 text-xs" />
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface/98 border border-border-metal rounded-lg shadow-xl z-10">
            {results.map((t) => {
              const idx = s.idxMap[t]
              const cnt = idx !== undefined ? s.counts[idx] : 0
              return (
                <div key={t} className="flex items-center gap-2 px-3 py-1.5 text-xs text-outline hover:bg-surface-variant hover:text-foreground cursor-pointer"
                  onClick={() => { addTag(t); setQuery(""); setResults([]) }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tcol(s, t) }}></span>
                  <span className="flex-1">{t}</span>
                  <span className="text-[10px] text-muted-foreground">{cnt}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Country selector */}
      <div className="relative">
        <div className="cursor-pointer px-2.5 py-1.5 bg-surface hover:bg-surface-variant border border-border-metal rounded-lg text-xs text-outline transition-colors text-center select-none"
          onClick={() => setShowCtry(!showCtry)}>
          🌍 Country {s.selCtries.size > 0 && `(${s.selCtries.size})`}
        </div>
        {showCtry && (
          <>
            <div className="fixed inset-0 z-0" onClick={() => setShowCtry(false)} />
            <div className="absolute top-full left-0 mt-1 bg-surface/98 border border-border-metal rounded-lg w-52 shadow-xl z-10">
              <Input placeholder="Filter countries..." value={ctrySearch} onChange={(e) => setCtrySearch(e.target.value)} className="w-[calc(100%-12px)] mx-1.5 my-1.5 h-6 text-[11px]" />
              {filteredCtrys.map((c: string) => {
                const on = s.selCtries.has(c)
                return (
                  <div key={c} className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-outline hover:bg-surface-variant hover:text-foreground cursor-pointer"
                    onClick={() => { if (on) s.selCtries.delete(c); else s.selCtries.add(c); updateChipsDOM() }}>
                    <span className={`w-3 h-3 rounded border flex items-center justify-center text-[8px] ${on ? "bg-surface-variant border-border-metal" : "border-border-metal"}`}>
                      {on ? "✓" : ""}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.ctryColors[c] }}></span>
                    <span className="flex-1">{c}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Chips (DOM-managed) */}
      <div id="tab-tags-cc" className="flex flex-wrap gap-1 min-h-[20px]"></div>
      <div id="tab-tags-mc" className="text-[11px] text-muted-foreground min-h-[16px]"></div>
    </div>
  )
}

function GapTab({ S }: any) {
  const s = S.current
  const ca = Array.from(s.selCtries) as string[]

  if (ca.length < 2) {
    return <div className="p-2.5 text-xs text-muted-foreground">Select at least 2 countries from the Tags tab.</div>
  }

  const tagPresence: Record<string, Set<number>> = {}
  for (const c of ca) tagPresence[c] = new Set()
  for (const [tiStr, cc] of Object.entries(s.tagCountries)) {
    const idx = parseInt(tiStr)
    for (const [ctry] of Object.entries(cc as Record<string, number>)) {
      if (tagPresence[ctry]) tagPresence[ctry].add(idx)
    }
  }

  const onlyA: number[] = []
  const onlyB: number[] = []
  const both: number[] = []
  const neither: number[] = []
  for (let i = 0; i < s.tags.length; i++) {
    const inA = tagPresence[ca[0]]?.has(i)
    const inB = tagPresence[ca[1]]?.has(i)
    if (inA && !inB) onlyA.push(i)
    else if (!inA && inB) onlyB.push(i)
    else if (inA && inB) both.push(i)
    else neither.push(i)
  }

  return (
    <div className="p-2.5 overflow-y-auto text-xs space-y-1.5">
      <div className="text-outline font-mono text-[11px] uppercase tracking-[0.06em] mb-1">{ca[0]} vs {ca[1]}</div>
      <div><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: s.ctryColors[ca[0]] }}></span>
        <span className="text-foreground/80">Only in {ca[0]}</span> <span className="text-muted-foreground">({onlyA.length})</span>
        <div className="pl-4 text-[10px] text-muted-foreground">{onlyA.slice(0, 6).map((i) => s.tags[i]).join(", ")}{onlyA.length > 6 ? `, +${onlyA.length - 6} more` : ""}</div>
      </div>
      <div><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: s.ctryColors[ca[1]] }}></span>
        <span className="text-foreground/80">Only in {ca[1]}</span> <span className="text-muted-foreground">({onlyB.length})</span>
        <div className="pl-4 text-[10px] text-muted-foreground">{onlyB.slice(0, 6).map((i) => s.tags[i]).join(", ")}{onlyB.length > 6 ? `, +${onlyB.length - 6} more` : ""}</div>
      </div>
      <div><span className="inline-block w-2 h-2 rounded-full bg-outline mr-1"></span>
        <span className="text-foreground/80">Both</span> <span className="text-muted-foreground">({both.length})</span></div>
      <div><span className="inline-block w-2 h-2 rounded-full bg-muted mr-1"></span>
        <span className="text-foreground/80">Neither</span> <span className="text-muted-foreground">({neither.length})</span></div>
    </div>
  )
}

function CompaniesTab({ S }: any) {
  const s = S.current
  const sel = Array.from(s.sel) as string[]
  const [q, setQ] = useState("")

  let match: Set<string> | null = null
  let mData: any = null

  if (sel.length) {
    for (const t of sel) {
      const idx = s.idxMap[t]
      if (idx === undefined) continue
      const cos = s.tagCos[String(idx)] || []
      const m = new Map(cos.map((c: any) => [c.n, c]))
      if (match === null) { match = new Set(m.keys()) as Set<string>; mData = m } else match = new Set([...match].filter((n) => m.has(n))) as Set<string>
    }
  } else {
    const m = new Map()
    for (const cos of Object.values(s.tagCos) as any) {
      for (const e of cos) if (!m.has(e.n)) m.set(e.n, e)
    }
    match = new Set(m.keys())
    mData = m
  }

  const sorted = match ? Array.from(match).filter((n) => !q.trim() || n.toLowerCase().includes(q.toLowerCase())).sort() : []

  return (
    <div className="p-2.5 overflow-y-auto">
      <Input placeholder="Search companies..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-2 h-7 text-xs" />
      {sorted.length === 0 ? (
        <div className="text-xs text-muted-foreground mt-4 text-center">Select tags to see companies.</div>
      ) : (
        sorted.map((n: string) => {
          const c = mData instanceof Map ? mData.get(n) : mData[n]
          const loc = c?.l?.length < 80 ? c.l : ""
          const ctry = c?.c ? <span className="text-muted-foreground text-[10px] ml-1.5">{c.c}</span> : null
          return (
            <div key={n} className="px-3.5 py-2 border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02]" onClick={() => (window as any).showCDP?.(n)}>
              <div className="text-sm font-medium text-foreground">{n}{ctry}</div>
              {loc && <div className="text-[11px] text-gray-600 mt-0.5">{loc}</div>}
            </div>
          )
        })
      )}
    </div>
  )
}

function CompareTab({ S, compareRef }: any) {
  const s = S.current
  const [aName, setAName] = useState("")
  const [bName, setBName] = useState("")
  const [result, setResult] = useState<any>(null)

  // Expose setter so CompanyDetail can fill names
  useEffect(() => {
    compareRef.current = { a: setAName, b: setBName }
    return () => { compareRef.current = null! }
  }, [])

  const run = () => {
    if (!aName.trim() || !bName.trim() || !s.companyLookup) { setResult(null); return }
    const ca = s.companyLookup[aName.toLowerCase().trim()]
    const cb = s.companyLookup[bName.toLowerCase().trim()]
    if (!ca || !cb) { setResult({ error: "Company not found" }); return }
    const tagsA = new Set<string>(ca.tags || [])
    const tagsB = new Set<string>(cb.tags || [])
    const shared: string[] = []
    const onlyA: string[] = []
    const onlyB: string[] = []
    for (const t of tagsA) if (tagsB.has(t)) shared.push(t); else onlyA.push(t)
    for (const t of tagsB) if (!tagsA.has(t)) onlyB.push(t)
    setResult({ ca, cb, shared, onlyA, onlyB })
  }

  // Country gap when 2+ countries selected
  const ca = Array.from(s.selCtries) as string[]
  let countryView: React.ReactNode = null
  if (ca.length >= 2) {
    const tagPresence: Record<string, Set<number>> = {}
    for (const c of ca) tagPresence[c] = new Set()
    for (const [tiStr, cc] of Object.entries(s.tagCountries)) {
      const idx = parseInt(tiStr)
      for (const [ctry] of Object.entries(cc as Record<string, number>)) {
        if (tagPresence[ctry]) tagPresence[ctry].add(idx)
      }
    }
    const groups: { label: string; indices: number[]; color: string }[] = [
      { label: `Only in ${ca[0]}`, indices: [], color: s.ctryColors[ca[0]] || "#888" },
      { label: `Only in ${ca[1]}`, indices: [], color: s.ctryColors[ca[1]] || "#888" },
    ]
    const both: number[] = []
    for (let i = 0; i < s.tags.length; i++) {
      const inA = tagPresence[ca[0]]?.has(i)
      const inB = tagPresence[ca[1]]?.has(i)
      if (inA && !inB) groups[0].indices.push(i)
      else if (!inA && inB) groups[1].indices.push(i)
      else if (inA && inB) both.push(i)
    }
    countryView = (
      <div className="mb-3 pb-3 border-b border-white/5">
        <div className="text-outline font-mono text-[11px] uppercase tracking-[0.06em] mb-2">{ca[0]} vs {ca[1]}</div>
        <div className="space-y-1.5">
          <div>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: groups[0].color }}></span>
            <span className="text-foreground/80">{groups[0].label}</span>
            <span className="text-muted-foreground ml-1">({groups[0].indices.length})</span>
            <div className="pl-4 text-[10px] text-muted-foreground">{groups[0].indices.slice(0, 6).map((i) => s.tags[i]).join(", ")}{groups[0].indices.length > 6 ? `, +${groups[0].indices.length - 6} more` : ""}</div>
          </div>
          <div>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: groups[1].color }}></span>
            <span className="text-foreground/80">{groups[1].label}</span>
            <span className="text-muted-foreground ml-1">({groups[1].indices.length})</span>
            <div className="pl-4 text-[10px] text-muted-foreground">{groups[1].indices.slice(0, 6).map((i) => s.tags[i]).join(", ")}{groups[1].indices.length > 6 ? `, +${groups[1].indices.length - 6} more` : ""}</div>
          </div>
          <div>
            <span className="inline-block w-2 h-2 rounded-full bg-outline mr-1.5"></span>
            <span className="text-foreground/80">Both countries</span>
            <span className="text-muted-foreground ml-1">({both.length})</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2.5 overflow-y-auto text-xs">
      {countryView}
      <div className="text-gray-500 mb-2">Compare two companies by their tags.</div>
      <div className="flex gap-2 mb-2">
        <Input placeholder="Company A..." value={aName} onChange={(e) => setAName(e.target.value)} className="flex-1 h-7 text-xs" />
        <Input placeholder="Company B..." value={bName} onChange={(e) => setBName(e.target.value)} className="flex-1 h-7 text-xs" />
      </div>
      <Button variant="outline" size="sm" onClick={run} className="w-full">Compare</Button>

      {result?.error && <div className="text-gray-600 mt-2">{result.error}</div>}
      {result?.ca && (
        <div className="mt-2 space-y-1.5">
          <div className="text-gray-400 font-medium mb-1">{result.ca.name} vs {result.cb.name}</div>
          {[{ label: "Shared", tags: result.shared, color: "#4ade80" },
            { label: `Only in ${result.ca.name}`, tags: result.onlyA, color: "#93c5fd" },
            { label: `Only in ${result.cb.name}`, tags: result.onlyB, color: "#fca5a5" },
          ].map((g) => (
            <div key={g.label}>
              <span className="text-gray-300">{g.label} ({g.tags.length})</span>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {g.tags.map((t: string) => (
                  <span key={t} className="inline-block px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.04)", color: g.color }}
                    onClick={() => {
                      const idx = s.idxMap[t]
                      if (idx !== undefined) { S.current.sel.add(t); updateSuggested(S.current) }
                    }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeconTab({ S, ideaStatus, setIdeaStatus }: any) {
  const s = S.current
  const [text, setText] = useState("")
  const [results, setResults] = useState<any[]>([])
  const modelRef = useRef<any>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    setIdeaStatus("Loading model (23MB)...")
    import("@xenova/transformers/dist/transformers.js").then(async (mod) => {
      const p = await mod.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
      modelRef.current = p
      setIdeaStatus("Ready.")
      if (text.trim()) runDecon(text)
    }).catch((e: any) => setIdeaStatus("Failed: " + e.message))
  }, [])

  const runDecon = async (txt: string) => {
    if (!modelRef.current || !s.tagEmbs.length) return
    setIdeaStatus("Embedding...")
    try {
      const out = await modelRef.current(txt, { pooling: "mean", normalize: true })
      const vec = Array.from(out.data) as number[]
      const sims = s.tagEmbs.map((emb: number[], i: number) => {
        let dot = 0
        for (let j = 0; j < vec.length; j++) dot += vec[j] * emb[j]
        return { idx: i, sim: dot }
      })
      sims.sort((a: any, b: any) => b.sim - a.sim)
      setResults(sims.slice(0, 10))
      setIdeaStatus("Top 10 matches.")
    } catch (e: any) {
      setIdeaStatus("Error: " + e.message)
    }
  }

  useEffect(() => {
    if (!text.trim()) { setResults([]); return }
    const timer = setTimeout(() => runDecon(text), 500)
    return () => clearTimeout(timer)
  }, [text])

  return (
    <div className="p-2.5 overflow-y-auto">
      <div className="text-[11px] text-gray-500 mb-2">Describe your idea and see where it lands.</div>
      <textarea placeholder="Describe your product or idea..." rows={3} value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full px-2.5 py-2 bg-muted border border-input rounded-lg text-xs text-foreground placeholder-muted-foreground outline-none focus:border-ring resize-none" />
      <div className="text-[10px] text-gray-600 mt-1">{ideaStatus}</div>
      <div className="mt-2 space-y-1">
        {results.map((r: any, i: number) => {
          const t = s.tags[r.idx]
          const col = tcol(s, t)
          const cnt = s.counts[r.idx]
          const pct = (r.sim * 100).toFixed(0)
          return (
            <div key={r.idx} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-white/5 cursor-pointer"
              onClick={() => { S.current.sel.add(t); updateSuggested(S.current) }}>
              <span className="text-[10px] text-gray-500 w-4 text-right">{i + 1}</span>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }}></span>
              <span className="text-xs text-gray-200 flex-1">{t}</span>
              <span className="text-[10px] text-gray-500">{pct}%</span>
              <span className="text-[10px] text-gray-600">{cnt} co.</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompanyDetail({ S, addTag, setTab, compareRef }: any) {
  const s = S.current
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState("")

  useEffect(() => {
    ; (window as any).showCDP = (n: string) => { setName(n); setVisible(true) }
    ; (window as any).closeCDP = () => setVisible(false)
    return () => { delete (window as any).showCDP; delete (window as any).closeCDP }
  }, [])

  const c = s.companyLookup?.[name.toLowerCase().trim()]

  return (
    <Dialog open={visible} onOpenChange={setVisible}>
      <DialogContent className="min-w-[380px] max-w-[480px]">
        <DialogTitle className="text-base font-semibold text-foreground">{name}</DialogTitle>
        {c ? (
          <div className="mt-3 space-y-4 text-sm">
            {/* SOURCE */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground mb-1">Source</div>
              <div className="text-foreground">{c.source || "—"}</div>
            </div>
            {/* COUNTRY */}
            {c.country && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground mb-1">Country</div>
                <div className="text-foreground">{c.country}</div>
              </div>
            )}
            {/* CONNECTS TO (tags) */}
            {c.tags?.length && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground mb-2">Connects to</div>
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map((t: string) => (
                    <button key={t}
                      className="px-2.5 py-1 text-xs text-foreground/80 bg-surface-variant rounded-full hover:bg-muted-foreground/20 transition-colors"
                      onClick={() => addTag(t)}>{t}</button>
                  ))}
                </div>
              </div>
            )}
            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-border-metal">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { compareRef.current?.a(name); setTab("compare"); setVisible(false) }}>Compare as A</Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { compareRef.current?.b(name); setTab("compare"); setVisible(false) }}>Compare as B</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mt-2">No additional data available.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
