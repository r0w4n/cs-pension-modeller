import {
  createComparisonResult,
  getSettingsSignature,
  type CachedComparisonResult,
  type ComparisonResult,
  type ComparisonScenario,
} from "../app-domains/comparison";
import type { RetirementPlanResult } from "../calculation/retirement-plan";

export type ComparisonResultCache = Map<string, CachedComparisonResult>;

export function getCachedComparisonResult({
  scenario,
  currentSettingsSignature,
  cache,
  precomputedPlan,
}: {
  scenario: ComparisonScenario;
  currentSettingsSignature: string;
  cache?: ComparisonResultCache;
  precomputedPlan?: RetirementPlanResult;
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

  const result = createComparisonResult(
    scenario,
    currentSettingsSignature,
    precomputedPlan
  );
  const {
    currentMatchesSaved: _currentMatchesSaved,
    scenario: _scenario,
    ...cached
  } = result;

  cache?.set(settingsSignature, cached);

  return result;
}
