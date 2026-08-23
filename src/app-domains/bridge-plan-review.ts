import {
  FLEXIBLE_FUND_ACCOUNT_CONFIG,
  FLEXIBLE_WITHDRAWAL_STRATEGY_OPTIONS,
  formatCurrency,
  formatModelAge,
  formatModelAgeCompact,
  type FlexibleFundAccountId,
  type PensionSettings,
} from "../settings";

export type BridgePlanReviewItem = {
  label: string;
  value: string;
};

export type BridgePlanReviewSection = {
  title: string;
  description: string;
  items: BridgePlanReviewItem[];
};

const POT_BALANCE_FIELDS = {
  sipp: "sippCurrentPot",
  csAvc: "csAvcCurrentPot",
  lisa: "lisaCurrentPot",
  isa: "isaCurrentPot",
} as const satisfies Record<FlexibleFundAccountId, keyof PensionSettings>;

const POT_WITHDRAWAL_PERCENT_FIELDS = {
  sipp: "sippWithdrawalPercent",
  csAvc: "csAvcWithdrawalPercent",
  lisa: "lisaWithdrawalPercent",
  isa: "isaWithdrawalPercent",
} as const satisfies Record<FlexibleFundAccountId, keyof PensionSettings>;

const POT_WITHDRAWAL_TARGET_AGE_FIELDS = {
  sipp: "sippWithdrawalTargetAge",
  csAvc: "csAvcWithdrawalTargetAge",
  lisa: "lisaWithdrawalTargetAge",
  isa: "isaWithdrawalTargetAge",
} as const satisfies Record<FlexibleFundAccountId, keyof PensionSettings>;

const BRIDGE_POT_REVIEW_ORDER = [
  "isa",
  "lisa",
  "sipp",
  "csAvc",
] as const satisfies readonly FlexibleFundAccountId[];

export function buildBridgePlanReview(
  settings: PensionSettings
): BridgePlanReviewSection[] {
  const includedPots = BRIDGE_POT_REVIEW_ORDER.filter(
    (accountId) => settings[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].showField]
  );
  const targetBasedPots = settings.flexibleWithdrawalPriority.filter(
    (accountId) =>
      includedPots.includes(accountId) &&
      settings[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].strategyField] ===
        "meet_income_target"
  );

  return [
    {
      title: "Retirement target",
      description:
        "The spending target and planning period used in the illustration.",
      items: [
        {
          label: "Spending target after estimated tax",
          value: `${formatCurrency(settings.desiredRetirementIncome / 12)} a month (${formatCurrency(settings.desiredRetirementIncome)} a year)`,
        },
        {
          label: "Retirement age",
          value: formatModelAge(settings.requirementAge),
        },
        {
          label: "Planning horizon",
          value: `Up to age ${formatModelAgeCompact(settings.lifeExpectancy)}`,
        },
        {
          label: "Spending strategy",
          value:
            settings.spendingStrategyType === "SPENDING_SMILE"
              ? "Go-Go, Slow-Go, No-Go"
              : "Flat spending",
        },
        {
          label: "Income Tax rules",
          value:
            settings.taxRegime === "scotland"
              ? "Scotland"
              : "England, Wales or Northern Ireland",
        },
      ],
    },
    {
      title: "Pensions and guaranteed income",
      description:
        "Income sources selected for this scenario. Amounts and start dates come from the detail screens.",
      items: [
        {
          label: "Included pensions",
          value: getIncludedPensionLabels(settings).join(", ") || "None",
        },
        {
          label: "Other guaranteed income",
          value: describeAdditionalGuaranteedIncome(settings),
        },
      ],
    },
    {
      title: "Bridging money and withdrawal instructions",
      description:
        "Each selected pot keeps the withdrawal strategy shown here. Return to ‘How should your bridging money be used?’ to change a strategy or the target-based order.",
      items: [
        ...(includedPots.length > 0
          ? includedPots.map((accountId) => ({
              label: FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].label,
              value: `${formatCurrency(Number(settings[POT_BALANCE_FIELDS[accountId]]))} current balance; ${describeWithdrawalStrategy(
                settings,
                accountId
              )}`,
            }))
          : [
              {
                label: "Flexible pots",
                value: "None selected",
              },
            ]),
        {
          label: "Income-target funding order",
          value:
            targetBasedPots.length > 0
              ? targetBasedPots
                  .map(
                    (accountId) => FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].label
                  )
                  .join(" → ")
              : "No selected pot uses ‘Use to meet income target’",
        },
      ],
    },
  ];
}

function getIncludedPensionLabels(settings: PensionSettings) {
  return [
    settings.showAlpha ? "Alpha" : "",
    settings.showClassic ? "classic" : "",
    settings.showClassicPlus ? "classic plus" : "",
    settings.showNuvos ? "nuvos" : "",
    settings.showPremium ? "Premium" : "",
    settings.showStatePension ? "State Pension" : "",
  ].filter(Boolean);
}

function describeAdditionalGuaranteedIncome(settings: PensionSettings) {
  if (!settings.showAdditionalGuaranteedIncome) {
    return "Not included";
  }

  const includedIncomes = settings.additionalGuaranteedIncomes.filter(
    (income) => Number(income.annualAmount) > 0
  );

  if (includedIncomes.length === 0) {
    return "Selected, but no income has been added";
  }

  return includedIncomes
    .map((income) => income.name.trim() || "Unnamed income")
    .join(", ");
}

function describeWithdrawalStrategy(
  settings: PensionSettings,
  accountId: FlexibleFundAccountId
) {
  const strategy =
    settings[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].strategyField];
  const label =
    FLEXIBLE_WITHDRAWAL_STRATEGY_OPTIONS.find(
      (option) => option.value === strategy
    )?.label ?? strategy;

  if (strategy === "percentage") {
    return `${label} (${Number(settings[POT_WITHDRAWAL_PERCENT_FIELDS[accountId]])}% a year)`;
  }

  if (strategy === "use_by_age") {
    return `${label} ${formatModelAgeCompact(
      Number(settings[POT_WITHDRAWAL_TARGET_AGE_FIELDS[accountId]])
    )}`;
  }

  return label;
}
