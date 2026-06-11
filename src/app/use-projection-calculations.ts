import { useDeferredValue, useMemo } from "react";
import {
  calculateRetirementIncomeTargetAtDate,
  createProjectionTable,
  deriveInflationAssumptions,
  generatePensionSummary,
  type RetirementIncomeDisplay,
} from "../projection";
import { validateSettings, type PensionSettings } from "../settings";
import {
  addYearsToIsoDate,
  buildRetirementIncomeItems,
  createBridgeChartLimits,
  createBridgeChartParameters,
  createRetirementIncomeSeries,
  formatCurrencyDetailed,
  getRetirementIncomeTargetTitle,
  getRetirementIncomeTitle,
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
  const retirementIncomeTitle = getRetirementIncomeTitle(
    effectiveSettings.taxationEnabled,
    retirementIncomeDisplay
  );
  const retirementIncomeItems = pensionSummary
    ? buildRetirementIncomeItems(pensionSummary, retirementIncomeDisplay)
    : [];
  const retirementIncomeTotal = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? (pensionSummary?.retirementIncome.totalMonthlyIncome ?? 0)
      : (pensionSummary?.retirementIncome.totalAnnualIncome ?? 0)
  );
  const retirementIncomeTargetTitle = getRetirementIncomeTargetTitle(
    retirementIncomeDisplay
  );
  const annualRetirementIncomeTarget = calculateRetirementIncomeTargetAtDate(
    effectiveSettings,
    addYearsToIsoDate(
      effectiveSettings.dateOfBirth,
      effectiveSettings.requirementAge
    )
  );
  const retirementIncomeTarget = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? annualRetirementIncomeTarget / 12
      : annualRetirementIncomeTarget
  );

  return {
    bridgeChartLimits,
    bridgeChartParameters,
    deferredSettings,
    derivedInflationAssumptions,
    pensionSummary,
    projectionRows,
    retirementIncomeItems,
    retirementIncomeSeries,
    retirementIncomeTarget,
    retirementIncomeTargetTitle,
    retirementIncomeTitle,
    retirementIncomeTotal,
    validationIssues,
  };
}
