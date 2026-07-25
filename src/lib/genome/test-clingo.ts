const clingo = require("clingo-wasm")
const fs = require("fs")
const path = require("path")

async function main() {
  const lpPath = path.resolve(__dirname, "../../../graph/team_assembly.lp")
  const baseLp = fs.readFileSync(lpPath, "utf-8")

  const facts = [
    'required("healthcare_domain_expertise").',
    'required("app_development").',
    'required("logistics").',
    'human("maya").',
    'proven("maya", "app_development").',
    'proven("maya", "ai").',
    'team_viability("maya", 85).',
    'human("sarah").',
    'proven("sarah", "healthcare_domain_expertise").',
    'proven("sarah", "regulatory_compliance").',
    'team_viability("sarah", 92).',
    'human("marcus").',
    'proven("marcus", "logistics").',
    'proven("marcus", "app_development").',
    'team_viability("marcus", 78).',
    "max_team(3).",
  ].join("\n")

  const program = facts + "\n" + baseLp
  console.log("Running Clingo with", program.split("\n").length, "lines")

  const result = await clingo.run(program, 0)
  console.log("Result:", JSON.stringify(result, null, 2))
}

main().catch((e) => {
  console.error("Error:", e)
  process.exit(1)
})
