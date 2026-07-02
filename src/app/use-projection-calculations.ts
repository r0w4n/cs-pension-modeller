import { useDeferredValue, useMemo } from "react";
import {
  createProjectionTable,
  deriveInflationAssumptions,
  generatePensionSummary,
  type RetirementIncomeDisplay,
} from "../projection";
import { validateSettings, type PensionSettings } from "../settings";
import {
  buildIncomeAgeRangeItems,
  createBridgeChartLimits,
  createBridgeChartParameters,
  createRetirementIncomeSeries,
} from "../app-domains";

export function useProjectionCalculations({
  effectiveSettings,
  retirementIncomeDisplay,
}: {
  effectiveSettings: PensionSettings;
  retirementIncomeDisplay: RetirementIncomeDisplay;
}) {
  const deferredSettings = useDeferredValue(effectiveSettings);
  const validationIssues = useMemo(
    () => validateSettings(deferredSettings),
    [deferredSettings]
  );
  const projectionRows = useMemo(
    () => createProjectionTable(deferredSettings),
    [deferredSettings]
  );
  const pensionSummary = useMemo(
    () => generatePensionSummary(projectionRows, deferredSettings),
    [projectionRows, deferredSettings]
  );
  const retirementIncomeSeries = useMemo(
    () => createRetirementIncomeSeries(projectionRows, deferredSettings),
    [projectionRows, deferredSettings]
  );
  const bridgeChartParameters = useMemo(
    () => createBridgeChartParameters(effectiveSettings),
    [effectiveSettings]
  );
  const bridgeChartLimits = useMemo(
    () => createBridgeChartLimits(effectiveSettings),
    [effectiveSettings]
  );
  const derivedInflationAssumptions = useMemo(
    () => deriveInflationAssumptions(deferredSettings),
    [deferredSettings]
  );
  const incomeAgeRangeItems = pensionSummary
    ? buildIncomeAgeRangeItems(
        pensionSummary,
        retirementIncomeDisplay,
        effectiveSettings.taxationEnabled
      )
    : [];

  return {
    bridgeChartLimits,
    bridgeChartParameters,
    deferredSettings,
    derivedInflationAssumptions,
    incomeAgeRangeItems,
    pensionSummary,
    projectionRows,
    retirementIncomeSeries,
    validationIssues,
  };
}
