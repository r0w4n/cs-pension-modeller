import { createProjectionTable, type ProjectionRow } from "../projection";
import {
  FLEXIBLE_FUND_ACCOUNT_CONFIG,
  FLEXIBLE_FUND_ACCOUNT_IDS,
  type FlexibleFundAccountId,
  type PensionSettings,
} from "../settings";

export type FlexibleWithdrawalAccountInsight = {
  accountId: FlexibleFundAccountId;
  label: string;
  affectedAges: number[];
  reducibleGrossWithdrawal: number;
  avoidableNetSurplus: number;
};

export type FlexibleWithdrawalSummary = {
  accounts: FlexibleWithdrawalAccountInsight[];
  residualAccounts: ResidualFlexibleFundInsight[];
  affectedAges: number[];
  totalReducibleGrossWithdrawal: number;
  totalAvoidableNetSurplus: number;
  largestAnnualAvoidableSurplus: number;
};

export type ResidualFlexibleFundInsight = {
  accountId: FlexibleFundAccountId;
  label: string;
  endingBalance: number;
  planningHorizonAge: number;
  wasUsed: boolean;
};

export type TargetBasedWithdrawalPreview = {
  accountId: FlexibleFundAccountId;
  currentGrossWithdrawals: number;
  targetBasedGrossWithdrawals: number;
  currentUnallocatedSurplus: number;
  targetBasedUnallocatedSurplus: number;
  currentEndingBalance: number;
  targetBasedEndingBalance: number;
};

const MINIMUM_DISPLAYED_RESIDUAL_BALANCE = 1;

export function getFlexibleWithdrawalPriorityAccounts(
  settings: PensionSettings
) {
  return getIncludedFlexibleWithdrawalAccounts(settings).filter(
    (accountId) =>
      getWithdrawalStrategy(settings, accountId) === "meet_income_target"
  );
}

export function getFlexibleWithdrawalNonPriorityAccounts(
  settings: PensionSettings
) {
  return getIncludedFlexibleWithdrawalAccounts(settings).filter(
    (accountId) =>
      getWithdrawalStrategy(settings, accountId) !== "meet_income_target"
  );
}

export function shouldShowFlexibleWithdrawalPriority(
  settings: PensionSettings
) {
  return settings.spendingStrategyType === "SPENDING_SMILE";
}

function getIncludedFlexibleWithdrawalAccounts(settings: PensionSettings) {
  return settings.flexibleWithdrawalPriority.filter((accountId) =>
    isFlexibleFundAccountIncluded(settings, accountId)
  );
}

export function summarizeFlexibleWithdrawalInsights(
  rows: ProjectionRow[],
  settings: PensionSettings
): FlexibleWithdrawalSummary {
  const displayedRows = getDisplayedRows(rows, settings);
  const accounts = FLEXIBLE_FUND_ACCOUNT_IDS.map((accountId) => {
    const affectedRows = displayedRows.filter(
      (row) =>
        (row.monthlyReducibleFlexibleWithdrawals?.[accountId].gross ?? 0) > 0
    );

    return {
      accountId,
      label: getFlexibleFundAccountLabel(accountId),
      affectedAges: Array.from(
        new Set(affectedRows.map((row) => Math.floor(row.age)))
      ),
      reducibleGrossWithdrawal: affectedRows.reduce(
        (total, row) =>
          total +
          (row.monthlyReducibleFlexibleWithdrawals?.[accountId].gross ?? 0),
        0
      ),
      avoidableNetSurplus: affectedRows.reduce(
        (total, row) =>
          total +
          (row.monthlyReducibleFlexibleWithdrawals?.[accountId].net ?? 0),
        0
      ),
    };
  }).filter((insight) => insight.reducibleGrossWithdrawal > 0);
  const affectedAges = Array.from(
    new Set(accounts.flatMap((account) => account.affectedAges))
  ).sort((first, second) => first - second);
  const residualAccounts = createResidualFlexibleFundInsights(
    displayedRows,
    settings
  );

  return {
    accounts,
    residualAccounts,
    affectedAges,
    totalReducibleGrossWithdrawal: accounts.reduce(
      (total, account) => total + account.reducibleGrossWithdrawal,
      0
    ),
    totalAvoidableNetSurplus: displayedRows.reduce(
      (total, row) => total + (row.monthlyAvoidableFlexibleSurplus ?? 0),
      0
    ),
    largestAnnualAvoidableSurplus: displayedRows.reduce(
      (largest, row) =>
        Math.max(largest, (row.monthlyAvoidableFlexibleSurplus ?? 0) * 12),
      0
    ),
  };
}

export function getFlexibleFundAccountLabel(accountId: FlexibleFundAccountId) {
  return FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].label;
}

export function reorderFlexibleWithdrawalAccounts(
  accounts: FlexibleFundAccountId[],
  accountId: FlexibleFundAccountId,
  nextPosition: number
) {
  const currentIndex = accounts.indexOf(accountId);
  const nextIndex = nextPosition - 1;

  if (
    currentIndex < 0 ||
    nextIndex < 0 ||
    nextIndex >= accounts.length ||
    currentIndex === nextIndex
  ) {
    return accounts;
  }

  const reorderedAccounts = [...accounts];
  reorderedAccounts.splice(currentIndex, 1);
  reorderedAccounts.splice(nextIndex, 0, accountId);
  return reorderedAccounts;
}

function isFlexibleFundAccountIncluded(
  settings: PensionSettings,
  accountId: FlexibleFundAccountId
) {
  return settings[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].showField];
}

export function getWithdrawalStrategyFieldId(accountId: FlexibleFundAccountId) {
  return FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].strategyField;
}

export function getFlexibleFundAccountIdForStrategyField(fieldId: string) {
  return FLEXIBLE_FUND_ACCOUNT_IDS.find(
    (accountId) =>
      FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].strategyField === fieldId
  );
}

export function getWithdrawalForAccount(
  row: ProjectionRow,
  accountId: FlexibleFundAccountId
) {
  return row[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].withdrawalField];
}

export function getBalanceForAccount(
  row: ProjectionRow,
  accountId: FlexibleFundAccountId
) {
  return row[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].balanceField];
}

export function createTargetBasedWithdrawalPreview(input: {
  accountId: TargetBasedWithdrawalPreview["accountId"];
  currentRows: ProjectionRow[];
  settings: PensionSettings;
}): TargetBasedWithdrawalPreview {
  const strategyField = getWithdrawalStrategyFieldId(input.accountId);
  const previewRows = createProjectionTable({
    ...input.settings,
    [strategyField]: "meet_income_target",
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
      input.accountId
    ),
    targetBasedGrossWithdrawals: sumWithdrawals(
      previewDisplayedRows,
      input.accountId
    ),
    currentUnallocatedSurplus: sumAvoidableSurplus(currentDisplayedRows),
    targetBasedUnallocatedSurplus: sumAvoidableSurplus(previewDisplayedRows),
    currentEndingBalance: currentEndingRow
      ? getBalanceForAccount(currentEndingRow, input.accountId)
      : 0,
    targetBasedEndingBalance: previewEndingRow
      ? getBalanceForAccount(previewEndingRow, input.accountId)
      : 0,
  };
}

function createResidualFlexibleFundInsights(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  const finalRow = rows.at(-1);

  if (!finalRow) {
    return [];
  }

  return FLEXIBLE_FUND_ACCOUNT_IDS.flatMap((accountId) => {
    const account = FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId];
    const endingBalance = getBalanceForAccount(finalRow, accountId);
    const shouldFlag =
      isFlexibleFundAccountIncluded(settings, accountId) &&
      getWithdrawalStrategy(settings, accountId) === "meet_income_target" &&
      settings[account.contributionField] > 0 &&
      endingBalance >= MINIMUM_DISPLAYED_RESIDUAL_BALANCE;

    return shouldFlag
      ? [
          {
            accountId,
            label: account.label,
            endingBalance,
            planningHorizonAge: finalRow.age + finalRow.ageMonths / 12,
            wasUsed: rows.some(
              (row) => getWithdrawalForAccount(row, accountId) > 0
            ),
          },
        ]
      : [];
  });
}

function getWithdrawalStrategy(
  settings: PensionSettings,
  accountId: FlexibleFundAccountId
) {
  return settings[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].strategyField];
}

function getDisplayedRows(rows: ProjectionRow[], settings: PensionSettings) {
  return rows.filter((row) => row.date >= settings.startDate);
}

function sumWithdrawals(
  rows: ProjectionRow[],
  accountId: FlexibleFundAccountId
) {
  return rows.reduce(
    (total, row) => total + getWithdrawalForAccount(row, accountId),
    0
  );
}

function sumAvoidableSurplus(rows: ProjectionRow[]) {
  return rows.reduce(
    (total, row) => total + (row.monthlyAvoidableFlexibleSurplus ?? 0),
    0
  );
}
