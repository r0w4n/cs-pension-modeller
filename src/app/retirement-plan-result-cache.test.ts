import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { createDefaultSettings, type PensionSettings } from "../settings";
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

  it("does not reuse a fast cached result when full previews are requested later", () => {
    const settings = createPreviewSettings();
    const cache: RetirementPlanResultCache = new Map();
    const fastPlan = getCachedRetirementPlanResult({
      settings,
      cache,
      options: { includeTargetBasedWithdrawalPreviews: false },
    });
    const fullPlan = getCachedRetirementPlanResult({
      settings: structuredClone(settings),
      cache,
      options: { includeTargetBasedWithdrawalPreviews: true },
    });

    expect(fullPlan).not.toBe(fastPlan);
    expect(cache.size).toBe(2);
    expect(fastPlan.targetBasedWithdrawalPreviews).toHaveLength(0);
    expect(fullPlan.targetBasedWithdrawalPreviews.length).toBeGreaterThan(0);
    expect(
      getCachedRetirementPlanResult({
        settings: structuredClone(settings),
        cache,
        options: { includeTargetBasedWithdrawalPreviews: false },
      })
    ).toBe(fastPlan);
    expect(
      getCachedRetirementPlanResult({
        settings: structuredClone(settings),
        cache,
        options: { includeTargetBasedWithdrawalPreviews: true },
      })
    ).toBe(fullPlan);
  });

  it("does not reuse a full cached result when a fast result is requested later", () => {
    const settings = createPreviewSettings();
    const cache: RetirementPlanResultCache = new Map();
    const fullPlan = getCachedRetirementPlanResult({
      settings,
      cache,
      options: { includeTargetBasedWithdrawalPreviews: true },
    });
    const fastPlan = getCachedRetirementPlanResult({
      settings: structuredClone(settings),
      cache,
      options: { includeTargetBasedWithdrawalPreviews: false },
    });

    expect(fastPlan).not.toBe(fullPlan);
    expect(cache.size).toBe(2);
    expect(fastPlan.targetBasedWithdrawalPreviews).toHaveLength(0);
    expect(fullPlan.targetBasedWithdrawalPreviews.length).toBeGreaterThan(0);
    expect(
      getCachedRetirementPlanResult({
        settings: structuredClone(settings),
        cache,
        options: { includeTargetBasedWithdrawalPreviews: true },
      })
    ).toBe(fullPlan);
    expect(
      getCachedRetirementPlanResult({
        settings: structuredClone(settings),
        cache,
        options: { includeTargetBasedWithdrawalPreviews: false },
      })
    ).toBe(fastPlan);
  });
});

function createPreviewSettings(): PensionSettings {
  return {
    ...createDefaultSettings(),
    showAlpha: false,
    showClassic: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: false,
    showStatePension: false,
    showSipp: false,
    showCsAvc: false,
    showIsa: true,
    showLisa: false,
    isaCurrentPot: 120_000,
    isaMonthlyContribution: 0,
    isaWithdrawalStrategy: "percentage",
    isaWithdrawalPercent: 10,
    desiredRetirementIncome: 6_000,
  };
}
