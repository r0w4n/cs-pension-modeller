import { describe, expect, it } from "vitest";
import { createDefaultSettings } from "../settings";
import { calculateRetirementPlan } from "./retirement-plan";

describe("calculateRetirementPlan", () => {
  it("returns one deterministic canonical result without mutating settings", () => {
    const settings = createDefaultSettings();
    const settingsBeforeCalculation = structuredClone(settings);

    const firstResult = calculateRetirementPlan(settings);
    const secondResult = calculateRetirementPlan(settings);

    expect(firstResult).toEqual(secondResult);
    expect(settings).toEqual(settingsBeforeCalculation);
    expect(firstResult.settings).toBe(settings);
    expect(firstResult.rows.length).toBeGreaterThan(0);
    expect(firstResult.summary).toBeDefined();
    expect(firstResult.assessment).toBeDefined();
  });
});
