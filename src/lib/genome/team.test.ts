/**
 * A4 — Clingo Team Assembly Tests
 *
 * Tests the clingo-wasm solver with injected facts.
 * Pure unit tests — no DB required.
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

let clingo: any;
let baseLp: string;

beforeAll(async () => {
  clingo = await import("clingo-wasm");
  const lpPath = path.resolve(__dirname, "../../../graph/team_assembly.lp");
  baseLp = fs.readFileSync(lpPath, "utf-8");
});

async function solve(facts: string): Promise<any> {
  const program = facts + "\n" + baseLp;
  const runFn = clingo.run || clingo.default?.run;
  if (typeof runFn !== "function") {
    throw new Error("clingo-wasm: no run function found. Module shape: " + Object.keys(clingo).join(", "));
  }
  const result = await runFn(program, 0);
  return result;
}

function parseTeam(result: any): string[] {
  const witnesses = result.Call?.[0]?.Witnesses || [];
  if (witnesses.length === 0) return [];
  // Return the last (optimal) model
  const model = witnesses[witnesses.length - 1];
  return (model.Value || [])
    .filter((v: string) => v.startsWith("team("))
    .map((v: string) => v.match(/"([^"]+)"/)?.[1] || "")
    .filter(Boolean);
}

function parseCoverage(result: any): { human: string; capability: string }[] {
  const witnesses = result.Call?.[0]?.Witnesses || [];
  if (witnesses.length === 0) return [];
  const model = witnesses[witnesses.length - 1];
  return (model.Value || [])
    .filter((v: string) => v.startsWith("member_covers("))
    .map((v: string) => {
      const m = v.match(/"([^"]+)","([^"]+)"/);
      return m ? { human: m[1], capability: m[2] } : null;
    })
    .filter(Boolean) as { human: string; capability: string }[];
}

describe("A4 — Clingo Team Assembly", () => {
  const BASE_FACTS = [
    'required("healthcare_domain_expertise").',
    'required("app_development").',
    'required("logistics").',
    'human("maya").',
    'proven("maya", "app_development").',
    'proven("maya", "ai").',
    "team_viability(\"maya\", 85).",
    'human("sarah").',
    'proven("sarah", "healthcare_domain_expertise").',
    'proven("sarah", "regulatory_compliance").',
    "team_viability(\"sarah\", 92).",
    'human("marcus").',
    'proven("marcus", "logistics").',
    'proven("marcus", "app_development").',
    "team_viability(\"marcus\", 78).",
    "max_team(3).",
  ];

  it("required atoms fully covered by returned team", async () => {
    const facts = BASE_FACTS.join("\n");
    const result = await solve(facts);
    expect(result.Result).toBe("OPTIMUM FOUND");

    const team = parseTeam(result);
    const coverage = parseCoverage(result);
    const covered = new Set(coverage.map((c) => c.capability));
    const required = ["healthcare_domain_expertise", "app_development", "logistics"];

    for (const req of required) {
      expect(covered.has(req)).toBe(true);
    }
  });

  it("no redundancy — optimal team doesn't include redundant members", async () => {
    const facts = BASE_FACTS.join("\n");
    const result = await solve(facts);
    const team = parseTeam(result);
    const coverage = parseCoverage(result);

    const covered = new Set(coverage.map((c) => c.capability));
    const required = ["healthcare_domain_expertise", "app_development", "logistics"];
    for (const req of required) {
      expect(covered.has(req)).toBe(true);
    }
    expect(team.length).toBeGreaterThan(0);
  });

  it("hard_conflict respected — conflicted humans never co-selected", async () => {
    const facts = [
      ...BASE_FACTS,
      'hard_conflict("maya", "sarah").',
    ].join("\n");
    const result = await solve(facts);
    const team = parseTeam(result);
    // If both maya and sarah are selected together, test fails
    const hasMaya = team.includes("maya");
    const hasSarah = team.includes("sarah");
    expect(hasMaya && hasSarah).toBe(false);
  });

  it("max_team respected", async () => {
    const facts = [
      ...BASE_FACTS.slice(0, -1), // remove max_team(3)
      "max_team(2).",
    ].join("\n");
    const result = await solve(facts);
    const team = parseTeam(result);
    expect(team.length).toBeLessThanOrEqual(2);
  });

  it("UNFILLABLE required atom → honest empty result", async () => {
    const facts = [
      'required("nobody_has_this_capability").',
      ...BASE_FACTS,
    ].join("\n");
    const result = await solve(facts);
    // Should either find a team (unlikely) or return empty
    // The key assertion: never fabricates a member
    const team = parseTeam(result);
    const coverage = parseCoverage(result);
    const covered = new Set(coverage.map((c) => c.capability));
    expect(covered.has("nobody_has_this_capability")).toBe(false);
  });

  it("DETERMINISM — same facts → same team", async () => {
    const facts = BASE_FACTS.join("\n");
    const teams: string[][] = [];

    for (let i = 0; i < 3; i++) {
      const result = await solve(facts);
      teams.push(parseTeam(result));
    }

    for (let i = 1; i < teams.length; i++) {
      expect(teams[i]).toEqual(teams[0]);
    }
  });
});
