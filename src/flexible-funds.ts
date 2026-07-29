export const FLEXIBLE_FUND_ACCOUNT_IDS = [
  "sipp",
  "csAvc",
  "lisa",
  "isa",
] as const;

export type FlexibleFundAccountId = (typeof FLEXIBLE_FUND_ACCOUNT_IDS)[number];

export type FlexibleWithdrawalStrategy =
  | "zero_at_death"
  | "percentage"
  | "use_by_age"
  | "meet_income_target";

export const FLEXIBLE_WITHDRAWAL_STRATEGY_OPTIONS: ReadonlyArray<{
  value: FlexibleWithdrawalStrategy;
  label: string;
}> = [
  { value: "zero_at_death", label: "Zero at death" },
  { value: "percentage", label: "Annual percentage" },
  { value: "use_by_age", label: "Use by age" },
  { value: "meet_income_target", label: "Use to meet income target" },
];

export function normalizeFlexibleWithdrawalStrategy(
  value: unknown
): FlexibleWithdrawalStrategy {
  return FLEXIBLE_WITHDRAWAL_STRATEGY_OPTIONS.some(
    (option) => option.value === value
  )
    ? (value as FlexibleWithdrawalStrategy)
    : "use_by_age";
}

export const FLEXIBLE_FUND_ACCOUNT_CONFIG = {
  sipp: {
    label: "SIPP",
    showField: "showSipp",
    strategyField: "sippWithdrawalStrategy",
    contributionField: "sippMonthlyContribution",
    drawAgeField: "sippDrawAge",
    realInterestField: "sippRealInterestPercent",
    balanceField: "sippPot",
    withdrawalField: "monthlySippPension",
  },
  csAvc: {
    label: "Civil Service AVC",
    showField: "showCsAvc",
    strategyField: "csAvcWithdrawalStrategy",
    contributionField: "csAvcMonthlyContribution",
    drawAgeField: "csAvcDrawAge",
    realInterestField: "csAvcRealInterestPercent",
    balanceField: "csAvcPot",
    withdrawalField: "monthlyCsAvcPension",
  },
  lisa: {
    label: "LISA",
    showField: "showLisa",
    strategyField: "lisaWithdrawalStrategy",
    contributionField: "lisaMonthlyContribution",
    drawAgeField: "lisaDrawAge",
    realInterestField: "lisaRealInterestPercent",
    balanceField: "lisaPot",
    withdrawalField: "monthlyLisaPension",
  },
  isa: {
    label: "ISA",
    showField: "showIsa",
    strategyField: "isaWithdrawalStrategy",
    contributionField: "isaMonthlyContribution",
    drawAgeField: "isaDrawAge",
    realInterestField: "isaRealInterestPercent",
    balanceField: "isaPot",
    withdrawalField: "monthlyIsaPension",
  },
} as const satisfies Record<
  FlexibleFundAccountId,
  {
    label: string;
    showField: string;
    strategyField: string;
    contributionField: string;
    drawAgeField: string;
    realInterestField: string;
    balanceField: string;
    withdrawalField: string;
  }
>;
