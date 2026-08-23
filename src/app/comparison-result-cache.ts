import {
  createComparisonResult,
  getSettingsSignature,
  type CachedComparisonResult,
  type ComparisonResult,
  type ComparisonScenario,
} from "../result-projection/comparison-result";
import type { RetirementPlanResult } from "../calculation/retirement-plan";
import {
  getCachedRetirementPlanResult,
  type RetirementPlanResultCache,
} from "./retirement-plan-result-cache";

export type ComparisonResultCache = Map<string, CachedComparisonResult>;

export function getCachedComparisonResult({
  scenario,
  currentSettingsSignature,
  cache,
  precomputedPlan,
  retirementPlanResultCache,
}: {
  scenario: ComparisonScenario;
  currentSettingsSignature: string;
  cache?: ComparisonResultCache;
  precomputedPlan?: RetirementPlanResult;
  retirementPlanResultCache?: RetirementPlanResultCache;
}): ComparisonResult {
  const settingsSignature = getSettingsSignature(scenario.settings);
  const cachedResult = cache?.get(settingsSignature);

  if (cachedResult) {
    return {
      ...cachedResult,
      scenario,
      currentMatchesSaved: settingsSignature === currentSettingsSignature,
    };
  }

  const plan = getCachedRetirementPlanResult({
    settings: scenario.settings,
    cache: retirementPlanResultCache,
    precomputedPlan,
  });
  const result = createComparisonResult(
    scenario,
    currentSettingsSignature,
    plan
  );
  const {
    currentMatchesSaved: _currentMatchesSaved,
    scenario: _scenario,
    ...cached
  } = result;

  cache?.set(settingsSignature, cached);

  return result;
}
