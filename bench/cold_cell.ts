/**
 * bench/cold_cell.ts
 * Measures cold-start clingo solve for one grid cell.
 * Applies TOP-K pre-filtering (same as team/route.ts) so the
 * solver never sees more than (atoms × K) candidates.
 *
 * Usage: npx tsx bench/cold_cell.ts <requiredAtoms> <candidateHumans>
 * Output: JSON line { atoms, humans, cold_ms }
 */

import * as fs from "fs";
import * as path from "path";

const requiredAtoms = parseInt(process.argv[2] || "2", 10);
const candidateHumans = parseInt(process.argv[3] || "5", 10);
const TOP_K = 3;

async function main() {
  const clingo = await import("clingo-wasm");
  const runFn = (clingo as any).run || (clingo as any).default?.run;

  const lpPath = path.resolve(__dirname, "../graph/team_assembly.lp");
  const baseLp = fs.readFileSync(lpPath, "utf-8");

  // Generate candidate humans with random capability assignments
  const rawHumans = Array.from({ length: candidateHumans }, (_, i) => ({
    id: `human_${i}`,
    capabilities: Array.from(
      { length: Math.min(requiredAtoms + 2, 5) },
      (_, j) => `cap_${j % requiredAtoms}`
    ),
    viability: Math.floor(Math.random() * 100),
  }));

  // Apply same pre-filtering as team/route.ts: keep top-K per required atom
  const selected = new Set<string>();
  for (let ai = 0; ai < requiredAtoms; ai++) {
    const cap = `cap_${ai}`;
    const scored = rawHumans
      .filter((h) => h.capabilities.includes(cap))
      .sort((a, b) => {
        if (b.viability !== a.viability) return b.viability - a.viability;
        return a.id.localeCompare(b.id);
      })
      .slice(0, TOP_K);
    for (const s of scored) selected.add(s.id);
  }
  const humans = rawHumans.filter((h) => selected.has(h.id));

  const facts: string[] = [];
  for (let ai = 0; ai < requiredAtoms; ai++) facts.push(`required("cap_${ai}").`);
  for (const h of humans) {
    facts.push(`human("${h.id}").`);
    for (const cap of h.capabilities) facts.push(`proven("${h.id}", "${cap}").`);
    facts.push(`team_viability("${h.id}", ${h.viability}).`);
  }
  facts.push(`max_team(${Math.min(requiredAtoms + 2, 5)}).`);

  const program = facts.join("\n") + "\n" + baseLp;

  // Cold solve — WASM init already happened during import
  const start = performance.now();
  await runFn(program, 0);
  const elapsed = performance.now() - start;

  console.log(JSON.stringify({
    atoms: requiredAtoms,
    humans: candidateHumans,
    filtered: humans.length,
    cold_ms: Math.round(elapsed * 10) / 10,
  }));
}

main().catch((e) => {
  console.error(JSON.stringify({ atoms: requiredAtoms, humans: candidateHumans, error: e.message }));
  process.exit(1);
});
