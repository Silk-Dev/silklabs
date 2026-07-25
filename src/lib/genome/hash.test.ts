/**
 * A1 — Genome Hash Unit Tests
 *
 * Falsifiable assertions for the canonical genome hash.
 * If any of these pass with wrong behavior, the test is a false positive.
 */

import { describe, it, expect } from "vitest";
import { normalizeAtom, genomeHash, classify } from "./hash";

// ─── Python parity cases (from hash_parity_test.json) ───

const PARITY_NORMALIZE: [string, string][] = [
  ["healthcare", "healthcare"],
  ["b2c", "b2c"],
  ["on-demand", "on_demand"],
  ["Self-Driving Vehicles", "self_driving_vehicles"],
  ["AI", "ai"],
  ["Food & Beverage", "food_and_beverage"],
  ["B2B", "b2b"],
];

const PARITY_HASH: [string[], string][] = [
  [["healthcare", "b2c", "on_demand"], "b2c|healthcare|on_demand"],
  [["air_taxis", "automotive", "automotive_commerce", "autonomous_trucking", "ridesharing"], "air_taxis|automotive|automotive_commerce|autonomous_trucking|ridesharing"],
  [["healthcare"], "healthcare"],
  [["b2c", "healthcare", "on_demand"], "b2c|healthcare|on_demand"],
  [["agriculture", "b2c", "physical", "full_time"], "agriculture|b2c|full_time|physical"],
  [["entertainment", "b2c", "physical", "gig_labor"], "b2c|entertainment|gig_labor|physical"],
  [["healthcare", "b2b", "digital", "full_time", "fda"], "b2b|digital|fda|full_time|healthcare"],
  [["agriculture", "b2c", "physical", "seasonal"], "agriculture|b2c|physical|seasonal"],
];

describe("normalizeAtom", () => {
  it.each(PARITY_NORMALIZE)("normalizeAtom(%j) === %j", (input, expected) => {
    expect(normalizeAtom(input)).toBe(expected);
  });

  it("is idempotent: normalizeAtom(normalizeAtom(x)) === normalizeAtom(x)", () => {
    const inputs = ["Healthcare", "On-Demand", "Self-Driving Vehicles", "AI", "Food & Beverage"];
    for (const input of inputs) {
      const once = normalizeAtom(input);
      const twice = normalizeAtom(once);
      expect(twice).toBe(once);
    }
  });

  it("strips leading/trailing underscores", () => {
    expect(normalizeAtom("_healthcare_")).toBe("healthcare");
  });

  it("collapses multiple underscores", () => {
    expect(normalizeAtom("health___care")).toBe("health_care");
  });

  it("removes special characters entirely (no replacement)", () => {
    // normalizeAtom strips non-alphanumeric chars; they are removed, not replaced
    expect(normalizeAtom("health@care#$test")).toBe("healthcaretest");
  });

  it("replaces spaces with underscores", () => {
    expect(normalizeAtom("health care test")).toBe("health_care_test");
  });
});

describe("genomeHash", () => {
  it.each(PARITY_HASH)("genomeHash(%j) === %j", (atoms, expected) => {
    expect(genomeHash(atoms)).toBe(expected);
  });

  it("is order-independent", () => {
    const a = genomeHash(["a", "b", "c"]);
    const b = genomeHash(["c", "a", "b"]);
    const c = genomeHash(["b", "c", "a"]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toBe("a|b|c");
  });

  it("does not mutate the input array", () => {
    const input = ["c", "a", "b"];
    const original = [...input];
    genomeHash(input);
    expect(input).toEqual(original);
  });

  it("returns empty string for empty array", () => {
    expect(genomeHash([])).toBe("");
  });

  it("handles single atom", () => {
    expect(genomeHash(["healthcare"])).toBe("healthcare");
  });

  // SNAPSHOT — breaks loudly if algorithm changes
  it("SNAPSHOT: fixed genome hashes to known value", () => {
    const result = genomeHash(["healthcare", "b2c", "on_demand"]);
    expect(result).toMatchSnapshot();
  });
});

describe("classify", () => {
  it("returns WHITESPACE for density 0", () => {
    expect(classify(0)).toBe("WHITESPACE");
  });

  it("returns COMPETITIVE for density 1-20", () => {
    expect(classify(1)).toBe("COMPETITIVE");
    expect(classify(10)).toBe("COMPETITIVE");
    expect(classify(20)).toBe("COMPETITIVE");
  });

  it("returns RED_OCEAN for density > 20", () => {
    expect(classify(21)).toBe("RED_OCEAN");
    expect(classify(100)).toBe("RED_OCEAN");
  });

  it("handles negative density gracefully (returns COMPETITIVE)", () => {
    // Negative density passes through the <= 20 branch (COMPETITIVE).
    // classify is a pure mapping, not a validator.
    expect(classify(-1)).toBe("COMPETITIVE");
  });
});
