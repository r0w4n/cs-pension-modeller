import {
  calculateRetirementPlan,
  type RetirementPlanResult,
} from "../calculation/retirement-plan";
import type { PensionSettings } from "../settings";

export type RetirementPlanResultCache = Map<string, RetirementPlanResult>;

const MAX_CACHED_RETIREMENT_PLANS = 12;

export function getCachedRetirementPlanResult({
  settings,
  cache,
  precomputedPlan,
}: {
  settings: PensionSettings;
  cache?: RetirementPlanResultCache;
  precomputedPlan?: RetirementPlanResult;
}) {
  const settingsSignature = JSON.stringify(settings);

  if (
    precomputedPlan &&
    JSON.stringify(precomputedPlan.settings) === settingsSignature
  ) {
    cacheRetirementPlanResult(cache, settingsSignature, precomputedPlan);
    return precomputedPlan;
  }

  const cachedPlan = cache?.get(settingsSignature);

  if (cachedPlan) {
    return cachedPlan;
  }

  const plan = calculateRetirementPlan(settings);
  cacheRetirementPlanResult(cache, settingsSignature, plan);
  return plan;
}

function cacheRetirementPlanResult(
  cache: RetirementPlanResultCache | undefined,
  settingsSignature: string,
  plan: RetirementPlanResult
) {
  if (!cache) {
    return;
  }

  cache.delete(settingsSignature);
  cache.set(settingsSignature, plan);

  while (cache.size > MAX_CACHED_RETIREMENT_PLANS) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey === undefined) {
      break;
    }

    cache.delete(oldestKey);
  }
}
