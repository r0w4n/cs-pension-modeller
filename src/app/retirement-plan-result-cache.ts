import {
  calculateRetirementPlan,
  type RetirementPlanCalculationOptions,
  type RetirementPlanResult,
} from "../calculation/retirement-plan";
import type { PensionSettings } from "../settings";

export type RetirementPlanResultCache = Map<string, RetirementPlanResult>;

const MAX_CACHED_RETIREMENT_PLANS = 12;

export function getCachedRetirementPlanResult({
  settings,
  cache,
  precomputedPlan,
  options,
}: {
  settings: PensionSettings;
  cache?: RetirementPlanResultCache;
  precomputedPlan?: RetirementPlanResult;
  options?: RetirementPlanCalculationOptions;
}) {
  const settingsSignature = getRetirementPlanCacheKey(settings, options);
  const planSettingsSignature = JSON.stringify(settings);

  if (
    precomputedPlan &&
    JSON.stringify(precomputedPlan.settings) === planSettingsSignature
  ) {
    cacheRetirementPlanResult(cache, settingsSignature, precomputedPlan);
    return precomputedPlan;
  }

  const cachedPlan = cache?.get(settingsSignature);

  if (cachedPlan) {
    return cachedPlan;
  }

  const plan = calculateRetirementPlan(settings, options);
  cacheRetirementPlanResult(cache, settingsSignature, plan);
  return plan;
}

export function getRetirementPlanCacheKey(
  settings: PensionSettings,
  options: RetirementPlanCalculationOptions = {}
) {
  if (options.includeTargetBasedWithdrawalPreviews !== false) {
    return JSON.stringify(settings);
  }

  return JSON.stringify({
    settings,
    includeTargetBasedWithdrawalPreviews: false,
  });
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
