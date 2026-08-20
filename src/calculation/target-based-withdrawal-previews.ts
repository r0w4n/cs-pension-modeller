import { createProjectionTable, type ProjectionRow } from "../projection";
import {
  FLEXIBLE_FUND_ACCOUNT_CONFIG,
  FLEXIBLE_FUND_ACCOUNT_IDS,
  type FlexibleFundAccountId,
  type PensionSettings,
} from "../settings";

export type TargetBasedWithdrawalPreview = {
  accountId: FlexibleFundAccountId;
  currentGrossWithdrawals: number;
  targetBasedGrossWithdrawals: number;
  currentUnallocatedSurplus: number;
  targetBasedUnallocatedSurplus: number;
  currentEndingBalance: number;
  targetBasedEndingBalance: number;
};

export function calculateTargetBasedWithdrawalPreviews(
  currentRows: ProjectionRow[],
  settings: PensionSettings
): TargetBasedWithdrawalPreview[] {
  const displayedRows = getDisplayedRows(currentRows, settings);

  return FLEXIBLE_FUND_ACCOUNT_IDS.filter((accountId) =>
    displayedRows.some(
      (row) =>
        (row.monthlyReducibleFlexibleWithdrawals?.[accountId].gross ?? 0) > 0
    )
  ).map((accountId) =>
    calculateTargetBasedWithdrawalPreview({
      accountId,
      currentRows,
      settings,
    })
  );
}

export function calculateTargetBasedWithdrawalPreview(input: {
  accountId: TargetBasedWithdrawalPreview["accountId"];
  currentRows: ProjectionRow[];
  settings: PensionSettings;
}): TargetBasedWithdrawalPreview {
  const account = FLEXIBLE_FUND_ACCOUNT_CONFIG[input.accountId];
  const previewRows = createProjectionTable({
    ...input.settings,
    [account.strategyField]: "meet_income_target",
  });
  const currentDisplayedRows = getDisplayedRows(
    input.currentRows,
    input.settings
  );
  const previewDisplayedRows = getDisplayedRows(previewRows, input.settings);
  const currentEndingRow = currentDisplayedRows.at(-1);
  const previewEndingRow = previewDisplayedRows.at(-1);

  return {
    accountId: input.accountId,
    currentGrossWithdrawals: sumWithdrawals(
      currentDisplayedRows,
      account.withdrawalField
    ),
    targetBasedGrossWithdrawals: sumWithdrawals(
      previewDisplayedRows,
      account.withdrawalField
    ),
    currentUnallocatedSurplus: sumAvoidableSurplus(currentDisplayedRows),
    targetBasedUnallocatedSurplus: sumAvoidableSurplus(previewDisplayedRows),
    currentEndingBalance: currentEndingRow?.[account.balanceField] ?? 0,
    targetBasedEndingBalance: previewEndingRow?.[account.balanceField] ?? 0,
  };
}

function getDisplayedRows(rows: ProjectionRow[], settings: PensionSettings) {
  return rows.filter((row) => row.date >= settings.startDate);
}

function sumWithdrawals(
  rows: ProjectionRow[],
  withdrawalField:
    | "monthlyIsaPension"
    | "monthlyLisaPension"
    | "monthlySippPension"
    | "monthlyCsAvcPension"
) {
  return rows.reduce((total, row) => total + row[withdrawalField], 0);
}

function sumAvoidableSurplus(rows: ProjectionRow[]) {
  return rows.reduce(
    (total, row) => total + (row.monthlyAvoidableFlexibleSurplus ?? 0),
    0
  );
}
