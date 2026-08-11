import {
  FLEXIBLE_FUND_ACCOUNT_CONFIG,
  FLEXIBLE_FUND_ACCOUNT_IDS,
  type FlexibleFundAccountId,
  type PensionSettings,
} from "../settings";
import { addYears } from "../derive-inputs";
import { MONEY_TOLERANCE } from "../money";
import type { ProjectionRow } from "../projection-core";
import {
  calculateMonthlyIncomeTax,
  calculateMonthlyTaxableRetirementIncome,
  calculatePensionWithdrawalTaxBreakdown,
  consumePensionLumpSumAllowance,
  createPensionLumpSumAllowanceState,
  type PensionLumpSumAllowanceState,
} from "./tax";
import { getProjectionTaxYearKey } from "./tax-year";
import {
  calculateRetirementIncomeTargetAtDate,
  getModelledMonthlyGrowthRate,
} from "./inflation";

type MonthlyWithdrawals = Record<FlexibleFundAccountId, number>;
type FlexibleBalances = Record<FlexibleFundAccountId, number>;

const BINARY_SEARCH_ITERATIONS = 50;

export function coordinateFlexibleWithdrawals(
  rows: ProjectionRow[],
  settings: PensionSettings,
  taxYearEffectiveRates: ReadonlyMap<string, number> = new Map()
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
  let allowanceState = createPensionLumpSumAllowanceState(settings);
  let classicLumpSumConsumed = false;
  let classicPlusLumpSumConsumed = false;
  const classicDrawDate = addYears(
    settings.dateOfBirth,
    settings.classicPensionDrawAge
  );
  const classicPlusDrawDate = addYears(
    settings.dateOfBirth,
    settings.classicPlusPensionDrawAge
  );

  return rows.map((sourceRow) => {
    const row = cloneProjectionRow(sourceRow);
    if (
      settings.showClassic &&
      !classicLumpSumConsumed &&
      row.date >= classicDrawDate
    ) {
      allowanceState = consumePensionLumpSumAllowance(
        allowanceState,
        row.classicAutomaticLumpSumIncludingReduction
      ).nextState;
      classicLumpSumConsumed = true;
    }
    if (
      settings.showClassicPlus &&
      !classicPlusLumpSumConsumed &&
      row.date >= classicPlusDrawDate
    ) {
      allowanceState = consumePensionLumpSumAllowance(
        allowanceState,
        row.classicPlusAutomaticLumpSumIncludingReduction
      ).nextState;
      classicPlusLumpSumConsumed = true;
    }
    const monthStartAllowanceState = allowanceState;
    const effectiveTaxRate = taxYearEffectiveRates.get(
      getProjectionTaxYearKey(row.date)
    );

    if (row.date >= requirementDate && targetAccounts.length > 0) {
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
        allowanceState: monthStartAllowanceState,
        effectiveTaxRate,
      });
    }

    const withdrawals = getMonthlyWithdrawals(row);
    allowanceState = updateRowIncomeTotals(
      row,
      settings,
      withdrawals,
      monthStartAllowanceState,
      effectiveTaxRate
    );

    return {
      ...row,
      ...analyseFlexibleSurplus(row, settings, {
        allowanceState: monthStartAllowanceState,
        effectiveTaxRate,
      }),
    };
  });
}

function applyTargetBasedWithdrawals(input: {
  accessDates: Record<FlexibleFundAccountId, string>;
  balances: FlexibleBalances;
  row: ProjectionRow;
  settings: PensionSettings;
  targetAccounts: FlexibleFundAccountId[];
  allowanceState: PensionLumpSumAllowanceState;
  effectiveTaxRate?: number;
}) {
  const {
    accessDates,
    allowanceState,
    balances,
    effectiveTaxRate,
    row,
    settings,
    targetAccounts,
  } = input;
  const withdrawals = getMonthlyWithdrawals(row);
  const monthlyTarget =
    calculateRetirementIncomeTargetAtDate(settings, row.date) / 12;

  for (const accountId of targetAccounts) {
    const availableBalance = Math.max(0, balances[accountId]);
    const currentAssessedIncome = calculateMonthlyTargetBasisIncome({
      row,
      settings,
      withdrawals,
      allowanceState,
      effectiveTaxRate,
    });
    const remainingAssessedRequirement = Math.max(
      0,
      monthlyTarget - currentAssessedIncome
    );
    const canDraw =
      isAccountShown(settings, accountId) &&
      row.date >= accessDates[accountId] &&
      availableBalance > 0 &&
      remainingAssessedRequirement > MONEY_TOLERANCE;
    const grossWithdrawal = canDraw
      ? solveGrossWithdrawal({
          accountId,
          availableBalance,
          remainingNetRequirement: remainingAssessedRequirement,
          calculateNetIncome: (candidateWithdrawal) =>
            calculateMonthlyTargetBasisIncome({
              row,
              settings,
              withdrawals: {
                ...withdrawals,
                [accountId]: candidateWithdrawal,
              },
              allowanceState,
              effectiveTaxRate,
            }) - currentAssessedIncome,
        })
      : 0;

    withdrawals[accountId] = grossWithdrawal;
    balances[accountId] = Math.max(0, availableBalance - grossWithdrawal);
    setAccountProjectionValues(row, accountId, {
      balance: balances[accountId],
      withdrawal: grossWithdrawal,
    });
  }
}

export function analyseFlexibleSurplus(
  row: ProjectionRow,
  settings: PensionSettings,
  taxContext: {
    allowanceState?: PensionLumpSumAllowanceState;
    effectiveTaxRate?: number;
  } = {}
) {
  const monthlyActiveIncomeTarget =
    calculateRetirementIncomeTargetAtDate(settings, row.date) / 12;
  const withdrawals = getMonthlyWithdrawals(row);
  const zeroWithdrawals = createZeroAccountRecord();
  const totalMonthlyNetIncome = calculateMonthlyNetIncome({
    row,
    settings,
    withdrawals,
    ...taxContext,
  });
  const monthlyGuaranteedNetIncome = calculateMonthlyNetIncome({
    row,
    settings,
    withdrawals: zeroWithdrawals,
    ...taxContext,
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
    ...taxContext,
  });

  return {
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
  allowanceState?: PensionLumpSumAllowanceState;
  effectiveTaxRate?: number;
}) {
  const result = createZeroInsightRecord();
  let remainingAvoidableNetSurplus = input.avoidableNetSurplus;
  const mutableWithdrawals = { ...input.withdrawals };
  let currentNetIncome = calculateMonthlyNetIncome({
    row: input.row,
    settings: input.settings,
    withdrawals: mutableWithdrawals,
    allowanceState: input.allowanceState,
    effectiveTaxRate: input.effectiveTaxRate,
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
      allowanceState: input.allowanceState,
      effectiveTaxRate: input.effectiveTaxRate,
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
            allowanceState: input.allowanceState,
            effectiveTaxRate: input.effectiveTaxRate,
          });
    const nextWithdrawals = {
      ...mutableWithdrawals,
      [accountId]: Math.max(0, grossWithdrawal - reducibleGross),
    };
    const nextNetIncome = calculateMonthlyNetIncome({
      row: input.row,
      settings: input.settings,
      withdrawals: nextWithdrawals,
      allowanceState: input.allowanceState,
      effectiveTaxRate: input.effectiveTaxRate,
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
  allowanceState?: PensionLumpSumAllowanceState;
  effectiveTaxRate?: number;
}) {
  return findMinimumSufficientValue({
    upperBound: input.grossWithdrawal,
    isSufficient: (candidateReduction) => {
      const candidateNetIncome = calculateMonthlyNetIncome({
        row: input.row,
        settings: input.settings,
        withdrawals: {
          ...input.withdrawals,
          [input.accountId]: input.grossWithdrawal - candidateReduction,
        },
        allowanceState: input.allowanceState,
        effectiveTaxRate: input.effectiveTaxRate,
      });

      return (
        input.currentNetIncome - candidateNetIncome >=
        input.requiredNetReduction
      );
    },
  });
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

  return findMinimumSufficientValue({
    upperBound: input.availableBalance,
    isSufficient: (candidateWithdrawal) =>
      input.calculateNetIncome(candidateWithdrawal) >=
      input.remainingNetRequirement,
  });
}

function findMinimumSufficientValue(input: {
  upperBound: number;
  isSufficient: (candidate: number) => boolean;
}) {
  let lowerBound = 0;
  let upperBound = input.upperBound;

  for (
    let iteration = 0;
    iteration < BINARY_SEARCH_ITERATIONS;
    iteration += 1
  ) {
    const candidate = (lowerBound + upperBound) / 2;

    if (input.isSufficient(candidate)) {
      upperBound = candidate;
    } else {
      lowerBound = candidate;
    }
  }

  return upperBound;
}

function updateRowIncomeTotals(
  row: ProjectionRow,
  settings: PensionSettings,
  withdrawals: MonthlyWithdrawals,
  allowanceState: PensionLumpSumAllowanceState,
  effectiveTaxRate?: number
) {
  row.monthlySippPension = withdrawals.sipp;
  row.monthlyCsAvcPension = withdrawals.csAvc;
  row.monthlyLisaPension = withdrawals.lisa;
  row.monthlyIsaPension = withdrawals.isa;
  row.totalMonthlyIncomeBeforeTax =
    getGuaranteedMonthlyGrossIncome(row) +
    (row.monthlyEmploymentIncome ?? 0) +
    Object.values(withdrawals).reduce((total, value) => total + value, 0);
  const taxDetails = calculateTaxDetails({
    row,
    settings,
    withdrawals,
    allowanceState,
    effectiveTaxRate,
  });
  row.monthlySippTaxableIncome = taxDetails.withdrawalTax.sippTaxable;
  row.monthlyCsAvcTaxableIncome = taxDetails.withdrawalTax.csAvcTaxable;
  row.monthlyTaxFreePensionCash =
    taxDetails.withdrawalTax.sippTaxFree +
    taxDetails.withdrawalTax.csAvcTaxFree;
  row.pensionLumpSumAllowanceRemaining =
    taxDetails.withdrawalTax.allowanceRemaining;
  row.monthlyIncomeTax = taxDetails.tax;
  row.totalMonthlyNetIncome =
    row.totalMonthlyIncomeBeforeTax - row.monthlyIncomeTax;

  return {
    ...allowanceState,
    remaining: taxDetails.withdrawalTax.allowanceRemaining,
  };
}

function calculateMonthlyNetIncome(input: {
  row: ProjectionRow;
  settings: PensionSettings;
  withdrawals: MonthlyWithdrawals;
  allowanceState?: PensionLumpSumAllowanceState;
  effectiveTaxRate?: number;
}) {
  const grossIncome =
    getGuaranteedMonthlyGrossIncome(input.row) +
    (input.row.monthlyEmploymentIncome ?? 0) +
    Object.values(input.withdrawals).reduce(
      (total, withdrawal) => total + withdrawal,
      0
    );

  return (
    grossIncome -
    calculateTaxDetails({
      row: input.row,
      settings: input.settings,
      withdrawals: input.withdrawals,
      allowanceState:
        input.allowanceState ??
        createPensionLumpSumAllowanceState(input.settings),
      effectiveTaxRate: input.effectiveTaxRate,
    }).tax
  );
}

function calculateMonthlyTargetBasisIncome(input: {
  row: ProjectionRow;
  settings: PensionSettings;
  withdrawals: MonthlyWithdrawals;
  allowanceState?: PensionLumpSumAllowanceState;
  effectiveTaxRate?: number;
}) {
  if (input.settings.retirementIncomeTargetBasis === "after_tax") {
    return calculateMonthlyNetIncome(input);
  }

  return (
    getGuaranteedMonthlyGrossIncome(input.row) +
    (input.row.monthlyEmploymentIncome ?? 0) +
    Object.values(input.withdrawals).reduce(
      (total, withdrawal) => total + withdrawal,
      0
    )
  );
}

function calculateTaxDetails(input: {
  row: ProjectionRow;
  settings: PensionSettings;
  withdrawals: MonthlyWithdrawals;
  allowanceState: PensionLumpSumAllowanceState;
  effectiveTaxRate?: number;
}) {
  const { allowanceState, effectiveTaxRate, row, settings, withdrawals } =
    input;
  const withdrawalTax = calculatePensionWithdrawalTaxBreakdown({
    settings,
    sippWithdrawal: withdrawals.sipp,
    csAvcWithdrawal: withdrawals.csAvc,
    allowanceState,
    accountOrder: settings.flexibleWithdrawalPriority,
  });
  const taxInput = {
    settings,
    monthlyAlphaPension: row.monthlyAlphaPensionGross,
    monthlyClassicPension: row.monthlyClassicPensionGross,
    monthlyClassicPlusPension: row.monthlyClassicPlusPensionGross,
    monthlyNuvosPension: row.monthlyNuvosPensionGross,
    monthlyPremiumPension: row.monthlyPremiumPensionGross,
    monthlyStatePension: row.monthlyStatePension,
    monthlySippPension: withdrawals.sipp,
    monthlyCsAvcPension: withdrawals.csAvc,
    monthlySippTaxableOverride: withdrawalTax.sippTaxable,
    monthlyCsAvcTaxableOverride: withdrawalTax.csAvcTaxable,
    monthlyAdditionalGuaranteedIncomeTaxable:
      row.monthlyAdditionalGuaranteedIncomeTaxable,
    monthlyAdditionalGuaranteedIncomeNonTaxable:
      row.monthlyAdditionalGuaranteedIncomeGross -
      row.monthlyAdditionalGuaranteedIncomeTaxable,
    monthlyIsaPension: withdrawals.isa,
    monthlyLisaPension: withdrawals.lisa,
    monthlyEmploymentIncome: row.monthlyEmploymentIncome ?? 0,
  };
  const tax =
    effectiveTaxRate === undefined
      ? calculateMonthlyIncomeTax(taxInput)
      : calculateMonthlyTaxableRetirementIncome(taxInput) * effectiveTaxRate;

  return { tax, withdrawalTax };
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
  return settings[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].strategyField];
}

function isAccountShown(
  settings: PensionSettings,
  accountId: FlexibleFundAccountId
) {
  return settings[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].showField];
}

function getAccessDates(
  settings: PensionSettings
): Record<FlexibleFundAccountId, string> {
  return mapFlexibleFundAccounts((accountId) =>
    addYears(
      settings.dateOfBirth,
      settings[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].drawAgeField]
    )
  );
}

function getMonthlyGrowthRates(
  settings: PensionSettings
): Record<FlexibleFundAccountId, number> {
  return mapFlexibleFundAccounts((accountId) =>
    getModelledMonthlyGrowthRate(
      settings,
      settings[FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].realInterestField] / 100
    )
  );
}

function setAccountProjectionValues(
  row: ProjectionRow,
  accountId: FlexibleFundAccountId,
  values: { balance: number; withdrawal: number }
) {
  const account = FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId];
  row[account.balanceField] = values.balance;
  row[account.withdrawalField] = values.withdrawal;
}

function createZeroAccountRecord(): FlexibleBalances {
  return mapFlexibleFundAccounts(() => 0);
}

function mapFlexibleFundAccounts<T>(
  getValue: (accountId: FlexibleFundAccountId) => T
) {
  return Object.fromEntries(
    FLEXIBLE_FUND_ACCOUNT_IDS.map((accountId) => [
      accountId,
      getValue(accountId),
    ])
  ) as Record<FlexibleFundAccountId, T>;
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
