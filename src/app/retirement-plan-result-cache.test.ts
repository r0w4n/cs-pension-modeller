import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { createDefaultSettings } from "../settings";
import {
  getCachedRetirementPlanResult,
  type RetirementPlanResultCache,
} from "./retirement-plan-result-cache";

describe("getCachedRetirementPlanResult", () => {
  it("reuses a canonical plan for equivalent settings", () => {
    const settings = createDefaultSettings();
    const cache: RetirementPlanResultCache = new Map();
    const firstPlan = getCachedRetirementPlanResult({ settings, cache });
    const secondPlan = getCachedRetirementPlanResult({
      settings: structuredClone(settings),
      cache,
    });

    expect(secondPlan).toBe(firstPlan);
    expect(cache.size).toBe(1);
  });

  it("adds a matching precomputed canonical plan to the application cache", () => {
    const settings = createDefaultSettings();
    const cache: RetirementPlanResultCache = new Map();
    const precomputedPlan = calculateRetirementPlan(settings);

    const result = getCachedRetirementPlanResult({
      settings: structuredClone(settings),
      cache,
      precomputedPlan,
    });

    expect(result).toBe(precomputedPlan);
    expect(cache.get(JSON.stringify(settings))).toBe(precomputedPlan);
  });

  it("bounds the application cache as settings change", () => {
    const baseSettings = createDefaultSettings();
    const basePlan = calculateRetirementPlan(baseSettings);
    const cache: RetirementPlanResultCache = new Map();

    for (let index = 0; index < 13; index += 1) {
      const settings = {
        ...baseSettings,
        desiredRetirementIncome:
          baseSettings.desiredRetirementIncome + index * 100,
      };

      getCachedRetirementPlanResult({
        settings,
        cache,
        precomputedPlan: { ...basePlan, settings },
      });
    }

    expect(cache.size).toBe(12);
    expect(cache.has(JSON.stringify(baseSettings))).toBe(false);
  });
});
