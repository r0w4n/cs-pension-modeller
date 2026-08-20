import { useDeferredValue, useMemo } from "react";
import type { RetirementIncomeDisplay } from "../projection";
import type { PensionSettings } from "../settings";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import {
  projectRetirementIncomeDisplay,
  projectRetirementPlanControls,
  projectRetirementPlanResult,
} from "../result-projection/retirement-results";

export function useProjectionCalculations({
  settings,
  retirementIncomeDisplay,
}: {
  settings: PensionSettings;
  retirementIncomeDisplay: RetirementIncomeDisplay;
}) {
  const deferredSettings = useDeferredValue(settings);
  const retirementPlanResult = useMemo(
    () => calculateRetirementPlan(deferredSettings),
    [deferredSettings]
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
