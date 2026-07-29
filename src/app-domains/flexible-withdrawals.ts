import type { ProjectionRow } from "../projection";
import {
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
  affectedAges: number[];
  totalReducibleGrossWithdrawal: number;
  totalAvoidableNetSurplus: number;
  largestAnnualAvoidableSurplus: number;
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

const ACCOUNT_LABELS: Record<FlexibleFundAccountId, string> = {
  sipp: "SIPP",
  csAvc: "Civil Service AVC",
  lisa: "LISA",
  isa: "ISA",
};

export function getFlexibleWithdrawalPriorityAccounts(
  settings: PensionSettings
) {
  return getIncludedFlexibleWithdrawalAccounts(settings).filter(
    (accountId) =>
      settings[getWithdrawalStrategyFieldId(accountId)] === "meet_income_target"
  );
}

export function getFlexibleWithdrawalNonPriorityAccounts(
  settings: PensionSettings
) {
  return getIncludedFlexibleWithdrawalAccounts(settings).filter(
    (accountId) =>
      settings[getWithdrawalStrategyFieldId(accountId)] !== "meet_income_target"
  );
}

export function shouldShowFlexibleWithdrawalPriority(
  settings: PensionSettings
) {
  return (
    settings.spendingStrategyType === "SPENDING_SMILE" ||
    getIncludedFlexibleWithdrawalAccounts(settings).length > 0
  );
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
  const displayedRows = rows.filter((row) => row.date >= settings.startDate);
  const accounts = FLEXIBLE_FUND_ACCOUNT_IDS.map((accountId) => {
    const affectedRows = displayedRows.filter(
      (row) =>
        (row.monthlyReducibleFlexibleWithdrawals?.[accountId].gross ?? 0) > 0
    );

    return {
      accountId,
      label: ACCOUNT_LABELS[accountId],
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

  return {
    accounts,
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
  return ACCOUNT_LABELS[accountId];
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
  switch (accountId) {
    case "sipp":
      return settings.showSipp;
    case "csAvc":
      return settings.showCsAvc;
    case "lisa":
      return settings.showLisa;
    case "isa":
      return settings.showIsa;
  }
}

export function getWithdrawalStrategyFieldId(accountId: FlexibleFundAccountId) {
  switch (accountId) {
    case "sipp":
      return "sippWithdrawalStrategy" as const;
    case "csAvc":
      return "csAvcWithdrawalStrategy" as const;
    case "lisa":
      return "lisaWithdrawalStrategy" as const;
    case "isa":
      return "isaWithdrawalStrategy" as const;
  }
}

export function getWithdrawalForAccount(
  row: ProjectionRow,
  accountId: FlexibleFundAccountId
) {
  switch (accountId) {
    case "sipp":
      return row.monthlySippPension;
    case "csAvc":
      return row.monthlyCsAvcPension;
    case "lisa":
      return row.monthlyLisaPension;
    case "isa":
      return row.monthlyIsaPension;
  }
}

export function getBalanceForAccount(
  row: ProjectionRow,
  accountId: FlexibleFundAccountId
) {
  switch (accountId) {
    case "sipp":
      return row.sippPot;
    case "csAvc":
      return row.csAvcPot;
    case "lisa":
      return row.lisaPot;
    case "isa":
      return row.isaPot;
  }
}
