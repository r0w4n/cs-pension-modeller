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
  getBalanceForAccount,
  getWithdrawalForAccount,
  getWithdrawalStrategyFieldId,
  summarizeFlexibleWithdrawalInsights,
  type TargetBasedWithdrawalPreview,
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
  const flexibleWithdrawalSummary = useMemo(
    () => summarizeFlexibleWithdrawalInsights(projectionRows, deferredSettings),
    [deferredSettings, projectionRows]
  );
  const targetBasedWithdrawalPreviews = useMemo(
    () =>
      flexibleWithdrawalSummary.accounts.map((account) =>
        createTargetBasedWithdrawalPreview({
          accountId: account.accountId,
          currentRows: projectionRows,
          settings: deferredSettings,
        })
      ),
    [deferredSettings, flexibleWithdrawalSummary.accounts, projectionRows]
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
    flexibleWithdrawalSummary,
    pensionSummary,
    projectionRows,
    retirementIncomeSeries,
    targetBasedWithdrawalPreviews,
    validationIssues,
  };
}

function createTargetBasedWithdrawalPreview(input: {
  accountId: TargetBasedWithdrawalPreview["accountId"];
  currentRows: ReturnType<typeof createProjectionTable>;
  settings: PensionSettings;
}): TargetBasedWithdrawalPreview {
  const strategyField = getWithdrawalStrategyFieldId(input.accountId);
  const previewRows = createProjectionTable({
    ...input.settings,
    [strategyField]: "meet_income_target",
  });
  const currentDisplayedRows = input.currentRows.filter(
    (row) => row.date >= input.settings.startDate
  );
  const previewDisplayedRows = previewRows.filter(
    (row) => row.date >= input.settings.startDate
  );
  const currentEndingRow = currentDisplayedRows.at(-1);
  const previewEndingRow = previewDisplayedRows.at(-1);

  return {
    accountId: input.accountId,
    currentGrossWithdrawals: currentDisplayedRows.reduce(
      (total, row) => total + getWithdrawalForAccount(row, input.accountId),
      0
    ),
    targetBasedGrossWithdrawals: previewDisplayedRows.reduce(
      (total, row) => total + getWithdrawalForAccount(row, input.accountId),
      0
    ),
    currentUnallocatedSurplus: currentDisplayedRows.reduce(
      (total, row) => total + (row.monthlyAvoidableFlexibleSurplus ?? 0),
      0
    ),
    targetBasedUnallocatedSurplus: previewDisplayedRows.reduce(
      (total, row) => total + (row.monthlyAvoidableFlexibleSurplus ?? 0),
      0
    ),
    currentEndingBalance: currentEndingRow
      ? getBalanceForAccount(currentEndingRow, input.accountId)
      : 0,
    targetBasedEndingBalance: previewEndingRow
      ? getBalanceForAccount(previewEndingRow, input.accountId)
      : 0,
  };
}
