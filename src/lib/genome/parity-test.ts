/**
 * parity-test.ts — Phase 1 verification
 * Run with: npx tsx src/lib/genome/parity-test.ts
 *
 * Verifies that the TypeScript genome hash and normalize functions
 * produce byte-identical output to the Python pipeline.
 * Must print "ALL PARITY CHECKS PASSED" or exit with error.
 */

import { normalizeAtom, genomeHash } from "./hash"
import * as fs from "fs"
import * as path from "path"

interface TestData {
  hash_cases: [string[], string][]
  normalize_cases: [string, string][]
}

async function main() {
  const testPath = path.resolve(__dirname, "../../../graph/hash_parity_test.json")
  const raw = fs.readFileSync(testPath, "utf-8")
  const data: TestData = JSON.parse(raw)

  let failures = 0

  // Test normalize
  console.log("=== Normalize Parity ===")
  for (const [input, expected] of data.normalize_cases) {
    const result = normalizeAtom(input)
    const ok = result === expected
    if (!ok) {
      console.error(`  ✗ normalizeAtom(${JSON.stringify(input)}) => ${JSON.stringify(result)}, expected ${JSON.stringify(expected)}`)
      failures++
    } else {
      console.log(`  ✓ ${input} => ${result}`)
    }
  }

  // Test hash
  console.log("\n=== Hash Parity ===")
  for (const [atoms, expected] of data.hash_cases) {
    const result = genomeHash(atoms)
    const ok = result === expected
    if (!ok) {
      console.error(`  ✗ genomeHash(${JSON.stringify(atoms)}) => ${JSON.stringify(result)}, expected ${JSON.stringify(expected)}`)
      failures++
    } else {
      console.log(`  ✓ ${JSON.stringify(atoms)} => ${result}`)
    }
  }

  if (failures > 0) {
    console.error(`\n✗ ${failures} PARITY FAILURES — hash drift detected!`)
    process.exit(1)
  }

  console.log("\n✓ ALL PARITY CHECKS PASSED — TypeScript hash matches Python pipeline")
}

main()
