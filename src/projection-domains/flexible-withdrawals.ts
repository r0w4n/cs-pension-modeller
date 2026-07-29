import {
  FLEXIBLE_FUND_ACCOUNT_IDS,
  type FlexibleFundAccountId,
  type PensionSettings,
} from "../settings";
import { addYears } from "../derive-inputs";
import type { ProjectionRow } from "../projection-core";
import { calculateMonthlyIncomeTax } from "./tax";
import {
  calculateRetirementIncomeTargetAtDate,
  getModelledMonthlyGrowthRate,
} from "./inflation";

type MonthlyWithdrawals = Record<FlexibleFundAccountId, number>;
type FlexibleBalances = Record<FlexibleFundAccountId, number>;

const MONEY_TOLERANCE = 0.005;

export function coordinateFlexibleWithdrawals(
  rows: ProjectionRow[],
  settings: PensionSettings
): ProjectionRow[] {
  const requirementDate = addYears(
    settings.dateOfBirth,
    settings.requirementAge
  );
  const targetAccounts = getTargetBasedAccounts(settings);
  const balances = createZeroAccountRecord();
  const growthRates = getMonthlyGrowthRates(settings);
  const accessDates = getAccessDates(settings);
  let balancesInitialized = false;
  let cumulativeAvoidableFlexibleSurplus = 0;

  return rows.map((sourceRow) => {
    const row = cloneProjectionRow(sourceRow);

    if (row.date < requirementDate) {
      return row;
    }

    if (targetAccounts.length > 0) {
      if (!balancesInitialized) {
        balances.sipp = row.sippPot;
        balances.csAvc = row.csAvcPot;
        balances.lisa = row.lisaPot;
        balances.isa = row.isaPot;
        balancesInitialized = true;
      } else {
        for (const accountId of targetAccounts) {
          balances[accountId] *= 1 + growthRates[accountId];
        }
      }

      applyTargetBasedWithdrawals({
        accessDates,
        balances,
        row,
        settings,
        targetAccounts,
      });
    }

    const analysis = analyseFlexibleSurplus(row, settings);
    cumulativeAvoidableFlexibleSurplus +=
      analysis.monthlyAvoidableFlexibleSurplus;

    return {
      ...row,
      ...analysis,
      cumulativeAvoidableFlexibleSurplus,
    };
  });
}

function applyTargetBasedWithdrawals(input: {
  accessDates: Record<FlexibleFundAccountId, string>;
  balances: FlexibleBalances;
  row: ProjectionRow;
  settings: PensionSettings;
  targetAccounts: FlexibleFundAccountId[];
}) {
  const { accessDates, balances, row, settings, targetAccounts } = input;
  const withdrawals = getMonthlyWithdrawals(row);
  const monthlyTarget =
    calculateRetirementIncomeTargetAtDate(settings, row.date) / 12;

  for (const accountId of targetAccounts) {
    const availableBalance = Math.max(0, balances[accountId]);
    const currentNetIncome = calculateMonthlyNetIncome({
      row,
      settings,
      withdrawals,
    });
    const remainingNetRequirement = Math.max(
      0,
      monthlyTarget - currentNetIncome
    );
    const canDraw =
      isAccountShown(settings, accountId) &&
      row.date >= accessDates[accountId] &&
      availableBalance > 0 &&
      remainingNetRequirement > MONEY_TOLERANCE;
    const grossWithdrawal = canDraw
      ? solveGrossWithdrawal({
          accountId,
          availableBalance,
          remainingNetRequirement,
          calculateNetIncome: (candidateWithdrawal) =>
            calculateMonthlyNetIncome({
              row,
              settings,
              withdrawals: {
                ...withdrawals,
                [accountId]: candidateWithdrawal,
              },
            }) - currentNetIncome,
        })
      : 0;

    withdrawals[accountId] = grossWithdrawal;
    balances[accountId] = Math.max(0, availableBalance - grossWithdrawal);
    setAccountProjectionValues(row, accountId, {
      balance: balances[accountId],
      withdrawal: grossWithdrawal,
    });
  }

  updateRowIncomeTotals(row, settings, withdrawals);
}

export function analyseFlexibleSurplus(
  row: ProjectionRow,
  settings: PensionSettings
) {
  const monthlyActiveIncomeTarget =
    calculateRetirementIncomeTargetAtDate(settings, row.date) / 12;
  const withdrawals = getMonthlyWithdrawals(row);
  const zeroWithdrawals = createZeroAccountRecord();
  const totalMonthlyNetIncome = calculateMonthlyNetIncome({
    row,
    settings,
    withdrawals,
  });
  const monthlyGuaranteedNetIncome = calculateMonthlyNetIncome({
    row,
    settings,
    withdrawals: zeroWithdrawals,
  });
  const totalSurplus = Math.max(
    0,
    totalMonthlyNetIncome - monthlyActiveIncomeTarget
  );
  const monthlyUnavoidableSurplus = Math.max(
    0,
    monthlyGuaranteedNetIncome - monthlyActiveIncomeTarget
  );
  const flexibleNetIncome = Math.max(
    0,
    totalMonthlyNetIncome - monthlyGuaranteedNetIncome
  );
  const monthlyAvoidableFlexibleSurplus = Math.min(
    flexibleNetIncome,
    totalSurplus
  );
  const monthlyReducibleFlexibleWithdrawals = attributeReducibleWithdrawals({
    avoidableNetSurplus: monthlyAvoidableFlexibleSurplus,
    row,
    settings,
    withdrawals,
  });

  return {
    monthlyActiveIncomeTarget,
    monthlyGuaranteedNetIncome,
    monthlyUnavoidableSurplus,
    monthlyAvoidableFlexibleSurplus,
    monthlyReducibleFlexibleWithdrawals,
  };
}

function attributeReducibleWithdrawals(input: {
  avoidableNetSurplus: number;
  row: ProjectionRow;
  settings: PensionSettings;
  withdrawals: MonthlyWithdrawals;
}) {
  const result = createZeroInsightRecord();
  let remainingAvoidableNetSurplus = input.avoidableNetSurplus;
  const mutableWithdrawals = { ...input.withdrawals };
  let currentNetIncome = calculateMonthlyNetIncome({
    row: input.row,
    settings: input.settings,
    withdrawals: mutableWithdrawals,
  });

  // Explicit withdrawals are reduced in reverse configured funding order.
  // This deterministic rule mirrors the account order visible to the user.
  for (const accountId of [
    ...input.settings.flexibleWithdrawalPriority,
  ].reverse()) {
    if (
      remainingAvoidableNetSurplus <= MONEY_TOLERANCE ||
      getWithdrawalStrategy(input.settings, accountId) === "meet_income_target"
    ) {
      continue;
    }

    const grossWithdrawal = mutableWithdrawals[accountId];

    if (grossWithdrawal <= 0) {
      continue;
    }

    const netIncomeWithoutAccount = calculateMonthlyNetIncome({
      row: input.row,
      settings: input.settings,
      withdrawals: {
        ...mutableWithdrawals,
        [accountId]: 0,
      },
    });
    const maximumNetReduction = Math.max(
      0,
      currentNetIncome - netIncomeWithoutAccount
    );
    const reducibleGross =
      maximumNetReduction <= remainingAvoidableNetSurplus + MONEY_TOLERANCE
        ? grossWithdrawal
        : solveGrossReduction({
            accountId,
            currentNetIncome,
            grossWithdrawal,
            requiredNetReduction: remainingAvoidableNetSurplus,
            row: input.row,
            settings: input.settings,
            withdrawals: mutableWithdrawals,
          });
    const nextWithdrawals = {
      ...mutableWithdrawals,
      [accountId]: Math.max(0, grossWithdrawal - reducibleGross),
    };
    const nextNetIncome = calculateMonthlyNetIncome({
      row: input.row,
      settings: input.settings,
      withdrawals: nextWithdrawals,
    });
    const attributedNet = Math.min(
      remainingAvoidableNetSurplus,
      Math.max(0, currentNetIncome - nextNetIncome)
    );

    result[accountId] = {
      gross: reducibleGross,
      net: attributedNet,
    };
    mutableWithdrawals[accountId] = nextWithdrawals[accountId];
    currentNetIncome = nextNetIncome;
    remainingAvoidableNetSurplus = Math.max(
      0,
      remainingAvoidableNetSurplus - attributedNet
    );
  }

  return result;
}

function solveGrossReduction(input: {
  accountId: FlexibleFundAccountId;
  currentNetIncome: number;
  grossWithdrawal: number;
  requiredNetReduction: number;
  row: ProjectionRow;
  settings: PensionSettings;
  withdrawals: MonthlyWithdrawals;
}) {
  let lowerReduction = 0;
  let upperReduction = input.grossWithdrawal;

  for (let iteration = 0; iteration < 50; iteration += 1) {
    const candidateReduction = (lowerReduction + upperReduction) / 2;
    const candidateNetIncome = calculateMonthlyNetIncome({
      row: input.row,
      settings: input.settings,
      withdrawals: {
        ...input.withdrawals,
        [input.accountId]: input.grossWithdrawal - candidateReduction,
      },
    });
    const netReduction = input.currentNetIncome - candidateNetIncome;

    if (netReduction < input.requiredNetReduction) {
      lowerReduction = candidateReduction;
    } else {
      upperReduction = candidateReduction;
    }
  }

  return upperReduction;
}

function solveGrossWithdrawal(input: {
  accountId: FlexibleFundAccountId;
  availableBalance: number;
  remainingNetRequirement: number;
  calculateNetIncome: (grossWithdrawal: number) => number;
}) {
  const directWithdrawal = Math.min(
    input.availableBalance,
    input.remainingNetRequirement
  );
  const directNetIncome = input.calculateNetIncome(directWithdrawal);

  if (
    input.accountId === "isa" ||
    input.accountId === "lisa" ||
    Math.abs(directNetIncome - directWithdrawal) <= MONEY_TOLERANCE
  ) {
    return directWithdrawal;
  }

  const maximumNetIncome = input.calculateNetIncome(input.availableBalance);

  if (maximumNetIncome <= input.remainingNetRequirement) {
    return input.availableBalance;
  }

  let lowerWithdrawal = 0;
  let upperWithdrawal = input.availableBalance;

  for (let iteration = 0; iteration < 50; iteration += 1) {
    const candidateWithdrawal = (lowerWithdrawal + upperWithdrawal) / 2;
    const candidateNetIncome = input.calculateNetIncome(candidateWithdrawal);

    if (candidateNetIncome < input.remainingNetRequirement) {
      lowerWithdrawal = candidateWithdrawal;
    } else {
      upperWithdrawal = candidateWithdrawal;
    }
  }

  return upperWithdrawal;
}

function updateRowIncomeTotals(
  row: ProjectionRow,
  settings: PensionSettings,
  withdrawals: MonthlyWithdrawals
) {
  row.monthlySippPension = withdrawals.sipp;
  row.monthlyCsAvcPension = withdrawals.csAvc;
  row.monthlyLisaPension = withdrawals.lisa;
  row.monthlyIsaPension = withdrawals.isa;
  row.totalMonthlyIncomeBeforeTax =
    getGuaranteedMonthlyGrossIncome(row) +
    Object.values(withdrawals).reduce((total, value) => total + value, 0);
  row.monthlyIncomeTax = calculateTax(row, settings, withdrawals);
  row.totalMonthlyNetIncome =
    row.totalMonthlyIncomeBeforeTax - row.monthlyIncomeTax;
}

function calculateMonthlyNetIncome(input: {
  row: ProjectionRow;
  settings: PensionSettings;
  withdrawals: MonthlyWithdrawals;
}) {
  const grossIncome =
    getGuaranteedMonthlyGrossIncome(input.row) +
    Object.values(input.withdrawals).reduce(
      (total, withdrawal) => total + withdrawal,
      0
    );

  return (
    grossIncome - calculateTax(input.row, input.settings, input.withdrawals)
  );
}

function calculateTax(
  row: ProjectionRow,
  settings: PensionSettings,
  withdrawals: MonthlyWithdrawals
) {
  return calculateMonthlyIncomeTax({
    settings,
    monthlyAlphaPension: row.monthlyAlphaPensionGross,
    monthlyClassicPension: row.monthlyClassicPensionGross,
    monthlyClassicPlusPension: row.monthlyClassicPlusPensionGross,
    monthlyNuvosPension: row.monthlyNuvosPensionGross,
    monthlyPremiumPension: row.monthlyPremiumPensionGross,
    monthlyStatePension: row.monthlyStatePension,
    monthlySippPension: withdrawals.sipp,
    monthlyCsAvcPension: withdrawals.csAvc,
    monthlyAdditionalGuaranteedIncomeTaxable:
      row.monthlyAdditionalGuaranteedIncomeTaxable,
  });
}

function getGuaranteedMonthlyGrossIncome(row: ProjectionRow) {
  return (
    row.monthlyAlphaPensionGross +
    row.monthlyClassicPensionGross +
    row.monthlyClassicPlusPensionGross +
    row.monthlyNuvosPensionGross +
    row.monthlyPremiumPensionGross +
    row.monthlyAdditionalGuaranteedIncomeGross +
    row.monthlyStatePension
  );
}

function getMonthlyWithdrawals(row: ProjectionRow): MonthlyWithdrawals {
  return {
    sipp: row.monthlySippPension,
    csAvc: row.monthlyCsAvcPension,
    lisa: row.monthlyLisaPension,
    isa: row.monthlyIsaPension,
  };
}

function getTargetBasedAccounts(settings: PensionSettings) {
  return settings.flexibleWithdrawalPriority.filter(
    (accountId) =>
      getWithdrawalStrategy(settings, accountId) === "meet_income_target"
  );
}

function getWithdrawalStrategy(
  settings: PensionSettings,
  accountId: FlexibleFundAccountId
) {
  switch (accountId) {
    case "sipp":
      return settings.sippWithdrawalStrategy;
    case "csAvc":
      return settings.csAvcWithdrawalStrategy;
    case "lisa":
      return settings.lisaWithdrawalStrategy;
    case "isa":
      return settings.isaWithdrawalStrategy;
  }
}

function isAccountShown(
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

function getAccessDates(
  settings: PensionSettings
): Record<FlexibleFundAccountId, string> {
  return {
    sipp: addYears(settings.dateOfBirth, settings.sippDrawAge),
    csAvc: addYears(settings.dateOfBirth, settings.csAvcDrawAge),
    lisa: addYears(settings.dateOfBirth, settings.lisaDrawAge),
    isa: addYears(settings.dateOfBirth, settings.isaDrawAge),
  };
}

function getMonthlyGrowthRates(
  settings: PensionSettings
): Record<FlexibleFundAccountId, number> {
  return {
    sipp: getModelledMonthlyGrowthRate(
      settings,
      settings.sippRealInterestPercent / 100
    ),
    csAvc: getModelledMonthlyGrowthRate(
      settings,
      settings.csAvcRealInterestPercent / 100
    ),
    lisa: getModelledMonthlyGrowthRate(
      settings,
      settings.lisaRealInterestPercent / 100
    ),
    isa: getModelledMonthlyGrowthRate(
      settings,
      settings.isaRealInterestPercent / 100
    ),
  };
}

function setAccountProjectionValues(
  row: ProjectionRow,
  accountId: FlexibleFundAccountId,
  values: { balance: number; withdrawal: number }
) {
  switch (accountId) {
    case "sipp":
      row.sippPot = values.balance;
      row.monthlySippPension = values.withdrawal;
      break;
    case "csAvc":
      row.csAvcPot = values.balance;
      row.monthlyCsAvcPension = values.withdrawal;
      break;
    case "lisa":
      row.lisaPot = values.balance;
      row.monthlyLisaPension = values.withdrawal;
      break;
    case "isa":
      row.isaPot = values.balance;
      row.monthlyIsaPension = values.withdrawal;
      break;
  }
}

function createZeroAccountRecord(): FlexibleBalances {
  return {
    sipp: 0,
    csAvc: 0,
    lisa: 0,
    isa: 0,
  };
}

function createZeroInsightRecord(): NonNullable<
  ProjectionRow["monthlyReducibleFlexibleWithdrawals"]
> {
  return Object.fromEntries(
    FLEXIBLE_FUND_ACCOUNT_IDS.map((accountId) => [
      accountId,
      { gross: 0, net: 0 },
    ])
  ) as NonNullable<ProjectionRow["monthlyReducibleFlexibleWithdrawals"]>;
}

function cloneProjectionRow(row: ProjectionRow): ProjectionRow {
  return {
    ...row,
    monthlyReducibleFlexibleWithdrawals: createZeroInsightRecord(),
  };
}
