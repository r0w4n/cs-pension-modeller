import { describe, expect, it } from "vitest";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { getSettingsSignature } from "../app-domains";
import { createDefaultSettings } from "../settings";
import {
  getCachedComparisonResult,
  type ComparisonResultCache,
} from "./comparison-result-cache";

describe("getCachedComparisonResult", () => {
  it("keeps mutable result reuse in the application shell", () => {
    const settings = createDefaultSettings();
    const signature = getSettingsSignature(settings);
    const cache: ComparisonResultCache = new Map();
    const plan = calculateRetirementPlan(settings);
    const scenario = {
      id: "current-model",
      name: "Current model",
      settings,
      createdAt: "",
      updatedAt: "",
    };

    const firstResult = getCachedComparisonResult({
      scenario,
      currentSettingsSignature: signature,
      cache,
      precomputedPlan: plan,
    });
    const renamedResult = getCachedComparisonResult({
      scenario: { ...scenario, name: "Renamed model" },
      currentSettingsSignature: signature,
      cache,
    });

    expect(cache.size).toBe(1);
    expect(firstResult.currentMatchesSaved).toBe(true);
    expect(renamedResult.scenario.name).toBe("Renamed model");
    expect(renamedResult.rows).toBe(firstResult.rows);
  });
});
