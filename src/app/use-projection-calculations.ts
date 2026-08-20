import { useDeferredValue, useMemo } from "react";
import type { RetirementIncomeDisplay } from "../projection";
import type { PensionSettings } from "../settings";
import {
  projectRetirementIncomeDisplay,
  projectRetirementPlanControls,
  projectRetirementPlanResult,
} from "../result-projection/retirement-results";
import {
  getCachedRetirementPlanResult,
  type RetirementPlanResultCache,
} from "./retirement-plan-result-cache";

export function useProjectionCalculations({
  settings,
  retirementIncomeDisplay,
  retirementPlanResultCache,
}: {
  settings: PensionSettings;
  retirementIncomeDisplay: RetirementIncomeDisplay;
  retirementPlanResultCache?: RetirementPlanResultCache;
}) {
  const deferredSettings = useDeferredValue(settings);
  const retirementPlanResult = useMemo(
    () =>
      getCachedRetirementPlanResult({
        settings: deferredSettings,
        cache: retirementPlanResultCache,
      }),
    [deferredSettings, retirementPlanResultCache]
  );
  const resultsProjection = useMemo(
    () => projectRetirementPlanResult(retirementPlanResult),
    [retirementPlanResult]
  );
  const resultDisplayProjection = useMemo(
    () =>
      projectRetirementIncomeDisplay(
        retirementPlanResult,
        retirementIncomeDisplay,
        settings.retirementIncomeTargetBasis
      ),
    [
      retirementIncomeDisplay,
      retirementPlanResult,
      settings.retirementIncomeTargetBasis,
    ]
  );
  const resultControlProjection = useMemo(
    () => projectRetirementPlanControls(settings),
    [settings]
  );

  return {
    ...resultsProjection,
    ...resultDisplayProjection,
    ...resultControlProjection,
    deferredSettings,
    derivedInflationAssumptions: retirementPlanResult.inflationAssumptions,
    pensionSummary: retirementPlanResult.summary,
    projectionRows: retirementPlanResult.rows,
    retirementPlanResult,
    validationIssues: retirementPlanResult.validationIssues,
  };
}
