import {
  addYears,
  calculateTotalGrossMonthlyIncome,
  createProjectionTable,
  type ProjectionRow,
} from "../projection";
import {
  calculatePensionWithdrawalTaxBreakdown,
  consumePensionLumpSumAllowance,
  createPensionLumpSumAllowanceState,
  type PensionLumpSumAllowanceState,
} from "../projection-domains/tax";
import {
  applyTaxYearIncomeTax,
  calculateProjectionRowTaxableIncome,
  deriveTaxYearEffectiveRates,
  getProjectionTaxYearKey,
} from "../projection-domains/tax-year";
import {
  createPartnerCalculationSettings,
  FLEXIBLE_FUND_ACCOUNT_CONFIG,
  FLEXIBLE_FUND_ACCOUNT_IDS,
  type FlexibleFundAccountId,
  type HouseholdFlexibleFundAccountId,
  type PensionSettings,
  type PersonId,
} from "../settings";
import { getModelledMonthlyGrowthRate } from "../projection-domains/inflation";

export type JointPersonProjectionSlice = {
  owner: PersonId;
  rows: ProjectionRow[];
};

export type HouseholdProjectionRow = {
  date: string;
  target: number | null;
  people: {
    you: ProjectionRow | null;
    partner: ProjectionRow | null;
  };
  household: {
    grossIncome: number;
    estimatedIncomeTax: number;
    netIncome: number;
    shortfall: number;
    surplus: number;
  };
};

export type JointRetirementProjection = {
  firstRetirementMonth: string;
  bothRetiredMonth: string;
  householdEndMonth: string;
  rows: HouseholdProjectionRow[];
  people: {
    you: JointPersonProjectionSlice;
    partner: JointPersonProjectionSlice;
  };
};

/**
 * Creates one owner-attributable household projection. The individual scheme
 * engines are intentionally reused, while target funding is coordinated here
 * before a household result is projected for presentation.
 */
export function calculateJointRetirementProjection(
  settings: PensionSettings
): JointRetirementProjection {
  const partnerSettings = createPartnerCalculationSettings(settings);
  const youSettings = createPersonBaseSettings(settings);
  const partnerBaseSettings = createPersonBaseSettings(partnerSettings);
  const dates = deriveHouseholdDates(settings, partnerSettings);

  const baseYouRows = addTransitionEmploymentIncome(
    createProjectionTable(youSettings),
    settings,
    dates
  );
  const basePartnerRows = addTransitionEmploymentIncome(
    createProjectionTable(partnerBaseSettings),
    partnerSettings,
    dates
  );
  const coordinated = coordinateHouseholdTargetWithdrawals({
    settings,
    partnerSettings,
    baseYouRows,
    basePartnerRows,
    dates,
  });

  return {
    ...dates,
    rows: assembleHouseholdRows(
      coordinated.youRows,
      coordinated.partnerRows,
      settings,
      partnerSettings,
      dates
    ),
    people: {
      you: { owner: "you", rows: coordinated.youRows },
      partner: { owner: "partner", rows: coordinated.partnerRows },
    },
  };
}

export function deriveHouseholdDates(
  settings: PensionSettings,
  partnerSettings: PensionSettings
) {
  const youRetirementMonth = toCalendarMonth(
    addYears(settings.dateOfBirth, settings.requirementAge)
  );
  const partnerRetirementMonth = toCalendarMonth(
    addYears(partnerSettings.dateOfBirth, partnerSettings.requirementAge)
  );
  const youEndMonth = toCalendarMonth(
    addYears(settings.dateOfBirth, settings.lifeExpectancy)
  );
  const partnerEndMonth = toCalendarMonth(
    addYears(partnerSettings.dateOfBirth, partnerSettings.lifeExpectancy)
  );

  return {
    firstRetirementMonth:
      youRetirementMonth <= partnerRetirementMonth
        ? youRetirementMonth
        : partnerRetirementMonth,
    bothRetiredMonth:
      youRetirementMonth >= partnerRetirementMonth
        ? youRetirementMonth
        : partnerRetirementMonth,
    householdEndMonth:
      youEndMonth >= partnerEndMonth ? youEndMonth : partnerEndMonth,
  };
}

function createPersonBaseSettings(settings: PensionSettings): PensionSettings {
  return {
    ...createIndividualSettings(settings),
    desiredRetirementIncome: 0,
    spendingStrategyType: "FLAT",
    flexibleWithdrawalPriority: [],
  };
}

function createIndividualSettings(settings: PensionSettings): PensionSettings {
  return {
    ...settings,
    partner: undefined,
    jointRetirement: { ...settings.jointRetirement, enabled: false },
  };
}

function addTransitionEmploymentIncome(
  rows: ProjectionRow[],
  person: PensionSettings,
  dates: Pick<
    JointRetirementProjection,
    "firstRetirementMonth" | "bothRetiredMonth"
  >
) {
  const ownRetirementMonth = toCalendarMonth(
    addYears(person.dateOfBirth, person.requirementAge)
  );
  const partialRetirementStartMonth = toCalendarMonth(
    addYears(person.dateOfBirth, person.partialRetirementStartAge)
  );
  const isLaterRetiree = ownRetirementMonth === dates.bothRetiredMonth;

  return rows.map((row) => {
    const isHouseholdTransitionMonth =
      isLaterRetiree &&
      dates.firstRetirementMonth <= row.date &&
      row.date < ownRetirementMonth;
    const isPartiallyRetired =
      person.partialRetirementEnabled &&
      row.date >= partialRetirementStartMonth;
    const employmentIncome = isHouseholdTransitionMonth
      ? isPartiallyRetired
        ? (row.monthlyEmploymentIncome ?? 0)
        : person.fullSalary / 12
      : (row.monthlyEmploymentIncome ?? 0);
    const next = { ...row, monthlyEmploymentIncome: employmentIncome };

    return {
      ...next,
      totalMonthlyIncomeBeforeTax: calculateRowGrossIncome(next),
    };
  });
}

function coordinateHouseholdTargetWithdrawals(input: {
  settings: PensionSettings;
  partnerSettings: PensionSettings;
  baseYouRows: ProjectionRow[];
  basePartnerRows: ProjectionRow[];
  dates: Pick<
    JointRetirementProjection,
    "firstRetirementMonth" | "bothRetiredMonth" | "householdEndMonth"
  >;
}) {
  let youRows = applyTaxYearIncomeTax(input.baseYouRows, input.settings);
  let partnerRows = applyTaxYearIncomeTax(
    input.basePartnerRows,
    input.partnerSettings
  );

  // Tax rates and taxable withdrawals influence each other. A small bounded
  // iteration mirrors the existing target-withdrawal engine's deterministic
  // convergence approach without combining the two people into one taxpayer.
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const next = applyHouseholdWithdrawals({
      ...input,
      baseYouRows: input.baseYouRows,
      basePartnerRows: input.basePartnerRows,
      youRows,
      partnerRows,
    });
    const nextYouRows = applyTaxYearIncomeTax(next.youRows, input.settings);
    const nextPartnerRows = applyTaxYearIncomeTax(
      next.partnerRows,
      input.partnerSettings
    );
    if (
      withdrawalsEqual(youRows, nextYouRows) &&
      withdrawalsEqual(partnerRows, nextPartnerRows)
    ) {
      youRows = nextYouRows;
      partnerRows = nextPartnerRows;
      break;
    }
    youRows = nextYouRows;
    partnerRows = nextPartnerRows;
  }

  return { youRows, partnerRows };
}

// This is the coordinated monthly household funding loop. Its branches are
// deliberately explicit because eligibility, ownership and tax treatment must
// remain independently auditable.
// eslint-disable-next-line sonarjs/cognitive-complexity, sonarjs/cyclomatic-complexity
function applyHouseholdWithdrawals(input: {
  settings: PensionSettings;
  partnerSettings: PensionSettings;
  baseYouRows: ProjectionRow[];
  basePartnerRows: ProjectionRow[];
  youRows: ProjectionRow[];
  partnerRows: ProjectionRow[];
  dates: Pick<
    JointRetirementProjection,
    "firstRetirementMonth" | "bothRetiredMonth" | "householdEndMonth"
  >;
}) {
  const result = {
    youRows: input.baseYouRows.map((row) => ({ ...row })),
    partnerRows: input.basePartnerRows.map((row) => ({ ...row })),
  };
  const youEffectiveRates = deriveTaxYearEffectiveRates(
    input.youRows,
    input.settings
  );
  const partnerEffectiveRates = deriveTaxYearEffectiveRates(
    input.partnerRows,
    input.partnerSettings
  );
  const youBalances = createFlexibleBalanceStates();
  const partnerBalances = createFlexibleBalanceStates();
  const youAllowanceLedger = createPensionAllowanceLedger(input.settings);
  const partnerAllowanceLedger = createPensionAllowanceLedger(
    input.partnerSettings
  );
  const priority = resolveHouseholdPriority(
    input.settings,
    input.partnerSettings
  );
  const youPensionAccountOrder = resolvePensionAccountOrder(
    "you",
    input.settings.flexibleWithdrawalPriority,
    priority
  );
  const partnerPensionAccountOrder = resolvePensionAccountOrder(
    "partner",
    input.settings.partner?.flexibleWithdrawalPriority ?? [],
    priority
  );

  const youResultByDate = createRowsByCalendarMonth(result.youRows);
  const partnerResultByDate = createRowsByCalendarMonth(result.partnerRows);
  const allDates = [
    ...new Set([...youResultByDate.keys(), ...partnerResultByDate.keys()]),
  ].sort();

  for (const date of allDates) {
    const youRow = youResultByDate.get(date);
    const partnerRow = partnerResultByDate.get(date);
    const youMonthStartAllowance = preparePensionAllowanceForMonth(
      youAllowanceLedger,
      youRow,
      input.settings
    );
    const partnerMonthStartAllowance = preparePensionAllowanceForMonth(
      partnerAllowanceLedger,
      partnerRow,
      input.partnerSettings
    );
    updateRowPensionWithdrawalTax(
      youRow,
      input.settings,
      youMonthStartAllowance,
      youPensionAccountOrder
    );
    updateRowPensionWithdrawalTax(
      partnerRow,
      input.partnerSettings,
      partnerMonthStartAllowance,
      partnerPensionAccountOrder
    );
    if (date < input.dates.firstRetirementMonth) {
      finishPensionAllowanceMonth(youAllowanceLedger, youRow);
      finishPensionAllowanceMonth(partnerAllowanceLedger, partnerRow);
      continue;
    }
    updateTargetAccountBalances(input.settings, youRow, youBalances);
    updateTargetAccountBalances(
      input.partnerSettings,
      partnerRow,
      partnerBalances
    );
    const target = resolveHouseholdTarget(
      input.settings,
      input.partnerSettings,
      date,
      input.dates
    );
    if (target === 0) {
      finishPensionAllowanceMonth(youAllowanceLedger, youRow);
      finishPensionAllowanceMonth(partnerAllowanceLedger, partnerRow);
      continue;
    }
    const youBaseNetIncome = calculateEffectiveNetIncome(
      youRow,
      input.settings,
      youEffectiveRates.get(getProjectionTaxYearKey(youRow?.date ?? date)) ?? 0
    );
    const partnerBaseNetIncome = calculateEffectiveNetIncome(
      partnerRow,
      input.partnerSettings,
      partnerEffectiveRates.get(
        getProjectionTaxYearKey(partnerRow?.date ?? date)
      ) ?? 0
    );
    let remaining = Math.max(
      0,
      target / 12 - (youBaseNetIncome + partnerBaseNetIncome)
    );

    for (const entry of priority) {
      if (remaining <= 0.005) {
        break;
      }
      const [owner, account] = entry.split(":") as [PersonId, FlexibleAccount];
      const person = owner === "you" ? input.settings : input.partnerSettings;
      const row = owner === "you" ? youRow : partnerRow;
      if (!row) {
        continue;
      }
      const balances = owner === "you" ? youBalances : partnerBalances;
      const balance = balances[account];
      const effectiveRate =
        (owner === "you" ? youEffectiveRates : partnerEffectiveRates).get(
          getProjectionTaxYearKey(row.date)
        ) ?? 0;
      const available = balance.amount;
      const monthStartAllowance =
        owner === "you" ? youMonthStartAllowance : partnerMonthStartAllowance;
      const pensionAccountOrder =
        owner === "you" ? youPensionAccountOrder : partnerPensionAccountOrder;

      if (!isAccountEligible(person, row.date, account) || available <= 0) {
        continue;
      }
      const gross = solveGrossAmount({
        account,
        available,
        requiredNet: remaining,
        person,
        row,
        effectiveRate,
        allowanceState: monthStartAllowance,
        pensionAccountOrder,
      });
      if (gross <= 0) {
        continue;
      }
      const netWithdrawal = calculateNetWithdrawal(
        account,
        gross,
        row,
        person,
        effectiveRate,
        monthStartAllowance,
        pensionAccountOrder
      );
      applyAccountWithdrawal(
        row,
        account,
        gross,
        person,
        monthStartAllowance,
        pensionAccountOrder
      );
      balance.amount = Math.max(0, available - gross);
      remaining = Math.max(0, remaining - netWithdrawal);
    }
    finishPensionAllowanceMonth(youAllowanceLedger, youRow);
    finishPensionAllowanceMonth(partnerAllowanceLedger, partnerRow);
  }

  return result;
}

type FlexibleAccount = FlexibleFundAccountId;
type FlexibleBalanceState = {
  amount: number;
  initialized: boolean;
};
type FlexibleBalanceStates = Record<FlexibleAccount, FlexibleBalanceState>;

type PensionAllowanceLedger = {
  state: PensionLumpSumAllowanceState;
  classicLumpSumConsumed: boolean;
  classicPlusLumpSumConsumed: boolean;
  classicDrawDate: string;
  classicPlusDrawDate: string;
};

function createFlexibleBalanceStates(): FlexibleBalanceStates {
  return Object.fromEntries(
    FLEXIBLE_FUND_ACCOUNT_IDS.map((account) => [
      account,
      { amount: 0, initialized: false },
    ])
  ) as FlexibleBalanceStates;
}

function createPensionAllowanceLedger(
  settings: PensionSettings
): PensionAllowanceLedger {
  return {
    state: createPensionLumpSumAllowanceState(settings),
    classicLumpSumConsumed: false,
    classicPlusLumpSumConsumed: false,
    classicDrawDate: addYears(
      settings.dateOfBirth,
      settings.classicPensionDrawAge
    ),
    classicPlusDrawDate: addYears(
      settings.dateOfBirth,
      settings.classicPlusPensionDrawAge
    ),
  };
}

function preparePensionAllowanceForMonth(
  ledger: PensionAllowanceLedger,
  row: ProjectionRow | undefined,
  settings: PensionSettings
) {
  if (!row) {
    return ledger.state;
  }

  if (
    settings.showClassic &&
    !ledger.classicLumpSumConsumed &&
    row.date >= ledger.classicDrawDate
  ) {
    ledger.state = consumePensionLumpSumAllowance(
      ledger.state,
      row.classicAutomaticLumpSumIncludingReduction
    ).nextState;
    ledger.classicLumpSumConsumed = true;
  }
  if (
    settings.showClassicPlus &&
    !ledger.classicPlusLumpSumConsumed &&
    row.date >= ledger.classicPlusDrawDate
  ) {
    ledger.state = consumePensionLumpSumAllowance(
      ledger.state,
      row.classicPlusAutomaticLumpSumIncludingReduction
    ).nextState;
    ledger.classicPlusLumpSumConsumed = true;
  }

  return ledger.state;
}

function finishPensionAllowanceMonth(
  ledger: PensionAllowanceLedger,
  row: ProjectionRow | undefined
) {
  if (row?.pensionLumpSumAllowanceRemaining === undefined) {
    return;
  }

  ledger.state = {
    ...ledger.state,
    remaining: row.pensionLumpSumAllowanceRemaining,
  };
}

function updateTargetAccountBalances(
  person: PensionSettings,
  row: ProjectionRow | undefined,
  balances: FlexibleBalanceStates
) {
  if (!row) {
    return;
  }

  for (const account of FLEXIBLE_FUND_ACCOUNT_IDS) {
    if (!isTargetAccount(person, account)) {
      continue;
    }

    const balance = balances[account];
    if (!balance.initialized) {
      if (!isAccountEligible(person, row.date, account)) {
        continue;
      }
      // The base row contains contributions made while the other person may
      // already be retired. Once accessible, carry the actual remaining pot
      // forward so prior household withdrawals also lose their future growth.
      balance.amount = getAccountBalance(row, account);
      balance.initialized = true;
    } else {
      const monthlyGrowthRate = getModelledMonthlyGrowthRate(
        person,
        person[FLEXIBLE_FUND_ACCOUNT_CONFIG[account].realInterestField] / 100
      );
      balance.amount *= 1 + monthlyGrowthRate;
    }

    setAccountBalance(row, account, balance.amount);
  }
}

function resolveHouseholdPriority(
  settings: PensionSettings,
  partner: PensionSettings
): HouseholdFlexibleFundAccountId[] {
  const active: HouseholdFlexibleFundAccountId[] = (
    ["you", "partner"] as const
  ).flatMap((owner) => {
    const person = owner === "you" ? settings : partner;
    return (["sipp", "csAvc", "isa", "lisa"] as const)
      .filter((account) => isTargetAccount(person, account))
      .map((account): HouseholdFlexibleFundAccountId => `${owner}:${account}`);
  });
  const saved = settings.jointRetirement.flexibleWithdrawalPriority.filter(
    (entry) => active.includes(entry)
  );
  return [...saved, ...active.filter((entry) => !saved.includes(entry))];
}

function resolvePensionAccountOrder(
  owner: PersonId,
  personalPriority: readonly FlexibleFundAccountId[],
  householdPriority: readonly HouseholdFlexibleFundAccountId[]
) {
  const householdAccounts = householdPriority
    .filter((entry) => entry.startsWith(`${owner}:`))
    .map((entry) => entry.slice(entry.indexOf(":") + 1))
    .filter((account): account is FlexibleFundAccountId =>
      FLEXIBLE_FUND_ACCOUNT_IDS.includes(account as FlexibleFundAccountId)
    );

  return [
    ...householdAccounts,
    ...personalPriority.filter(
      (account) => !householdAccounts.includes(account)
    ),
    ...FLEXIBLE_FUND_ACCOUNT_IDS.filter(
      (account) =>
        !householdAccounts.includes(account) &&
        !personalPriority.includes(account)
    ),
  ];
}

function isTargetAccount(person: PensionSettings, account: FlexibleAccount) {
  const strategyField = `${account}WithdrawalStrategy` as const;
  const showField =
    `show${account === "csAvc" ? "CsAvc" : account[0].toUpperCase() + account.slice(1)}` as keyof PensionSettings;
  return (
    person[showField] === true && person[strategyField] === "meet_income_target"
  );
}

function isAccountEligible(
  person: PensionSettings,
  date: string,
  account: FlexibleAccount
) {
  const drawAge = person[`${account}DrawAge` as keyof PensionSettings];
  return (
    typeof drawAge === "number" && date >= addYears(person.dateOfBirth, drawAge)
  );
}

function getAccountBalance(row: ProjectionRow, account: FlexibleAccount) {
  return row[FLEXIBLE_FUND_ACCOUNT_CONFIG[account].balanceField];
}

function setAccountBalance(
  row: ProjectionRow,
  account: FlexibleAccount,
  balance: number
) {
  row[FLEXIBLE_FUND_ACCOUNT_CONFIG[account].balanceField] = balance;
}

function applyAccountWithdrawal(
  row: ProjectionRow,
  account: FlexibleAccount,
  gross: number,
  person: PensionSettings,
  allowanceState: PensionLumpSumAllowanceState,
  pensionAccountOrder: readonly FlexibleFundAccountId[]
) {
  if (account === "sipp") {
    row.monthlySippPension = gross;
  } else if (account === "csAvc") {
    row.monthlyCsAvcPension = gross;
  } else if (account === "isa") {
    row.monthlyIsaPension = gross;
  } else {
    row.monthlyLisaPension = gross;
  }
  const balanceField = FLEXIBLE_FUND_ACCOUNT_CONFIG[account].balanceField;
  row[balanceField] = Math.max(0, row[balanceField] - gross);
  updateRowPensionWithdrawalTax(
    row,
    person,
    allowanceState,
    pensionAccountOrder
  );
  row.totalMonthlyIncomeBeforeTax = calculateRowGrossIncome(row);
}

function updateRowPensionWithdrawalTax(
  row: ProjectionRow | undefined,
  person: PensionSettings,
  allowanceState: PensionLumpSumAllowanceState,
  pensionAccountOrder: readonly FlexibleFundAccountId[]
) {
  if (!row) {
    return;
  }

  const breakdown = calculatePensionWithdrawalTaxBreakdown({
    settings: person,
    sippWithdrawal: row.monthlySippPension,
    csAvcWithdrawal: row.monthlyCsAvcPension,
    allowanceState,
    accountOrder: pensionAccountOrder,
  });
  row.monthlySippTaxableIncome = breakdown.sippTaxable;
  row.monthlyCsAvcTaxableIncome = breakdown.csAvcTaxable;
  row.monthlyTaxFreePensionCash =
    breakdown.sippTaxFree + breakdown.csAvcTaxFree;
  row.pensionLumpSumAllowanceRemaining = breakdown.allowanceRemaining;
}

function solveGrossAmount(input: {
  account: FlexibleAccount;
  available: number;
  requiredNet: number;
  person: PensionSettings;
  row: ProjectionRow;
  effectiveRate: number;
  allowanceState: PensionLumpSumAllowanceState;
  pensionAccountOrder: readonly FlexibleFundAccountId[];
}) {
  let lower = 0;
  let upper = input.available;
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (
      calculateNetWithdrawal(
        input.account,
        middle,
        input.row,
        input.person,
        input.effectiveRate,
        input.allowanceState,
        input.pensionAccountOrder
      ) >= input.requiredNet
    ) {
      upper = middle;
    } else {
      lower = middle;
    }
  }
  return Math.min(input.available, upper);
}

function calculateNetWithdrawal(
  account: FlexibleAccount,
  gross: number,
  row: ProjectionRow,
  person: PensionSettings,
  effectiveRate: number,
  allowanceState: PensionLumpSumAllowanceState,
  pensionAccountOrder: readonly FlexibleFundAccountId[]
) {
  if (account === "isa" || account === "lisa") {
    return gross;
  }

  const currentBreakdown = calculatePensionWithdrawalTaxBreakdown({
    settings: person,
    sippWithdrawal: row.monthlySippPension,
    csAvcWithdrawal: row.monthlyCsAvcPension,
    allowanceState,
    accountOrder: pensionAccountOrder,
  });
  const candidateBreakdown = calculatePensionWithdrawalTaxBreakdown({
    settings: person,
    sippWithdrawal: account === "sipp" ? gross : row.monthlySippPension,
    csAvcWithdrawal: account === "csAvc" ? gross : row.monthlyCsAvcPension,
    allowanceState,
    accountOrder: pensionAccountOrder,
  });
  const currentTaxable =
    currentBreakdown.sippTaxable + currentBreakdown.csAvcTaxable;
  const candidateTaxable =
    candidateBreakdown.sippTaxable + candidateBreakdown.csAvcTaxable;

  return Math.max(
    0,
    gross - (candidateTaxable - currentTaxable) * effectiveRate
  );
}

function calculateRowGrossIncome(row: ProjectionRow) {
  return calculateTotalGrossMonthlyIncome(
    row.monthlyAlphaPensionGross,
    row.monthlyStatePension,
    row.monthlySippPension,
    row.monthlyCsAvcPension,
    row.monthlyIsaPension,
    row.monthlyLisaPension,
    row.monthlyNuvosPensionGross,
    row.monthlyClassicPensionGross,
    row.monthlyClassicPlusPensionGross,
    row.monthlyPremiumPensionGross,
    row.monthlyAdditionalGuaranteedIncomeGross,
    row.monthlyEmploymentIncome
  );
}

function calculateEffectiveNetIncome(
  row: ProjectionRow | null | undefined,
  settings: PensionSettings,
  effectiveRate: number
) {
  if (!row) {
    return 0;
  }
  if (!settings.taxationEnabled) {
    return row.totalMonthlyIncomeBeforeTax;
  }
  return (
    row.totalMonthlyIncomeBeforeTax -
    calculateProjectionRowTaxableIncome(row, settings) * effectiveRate
  );
}

function resolveHouseholdTarget(
  settings: PensionSettings,
  partner: PensionSettings,
  date: string,
  dates: Pick<
    JointRetirementProjection,
    "firstRetirementMonth" | "bothRetiredMonth"
  >
) {
  if (date < dates.firstRetirementMonth) {
    return 0;
  }
  const joint = settings.jointRetirement;
  let target =
    date < dates.bothRetiredMonth
      ? joint.transitionDesiredRetirementIncome
      : joint.fullyRetiredDesiredRetirementIncome;
  if (
    date >= dates.bothRetiredMonth &&
    joint.spendingStrategyType === "SPENDING_SMILE"
  ) {
    const reference =
      toCalendarMonth(addYears(partner.dateOfBirth, partner.requirementAge)) >=
      toCalendarMonth(addYears(settings.dateOfBirth, settings.requirementAge))
        ? partner
        : settings;
    const smile = joint.spendingSmile;
    const percentage =
      date >= addYears(reference.dateOfBirth, smile.noGoStartAge)
        ? smile.noGoPercentage
        : date >= addYears(reference.dateOfBirth, smile.slowGoStartAge)
          ? smile.slowGoPercentage
          : smile.goGoPercentage;
    target *= percentage / 100;
  }
  if (settings.projectionBasis === "nominal") {
    const months = monthsBetween(settings.startDate, date);
    target *= (1 + settings.inflationRateAnnual / 100) ** (months / 12);
  }
  return target;
}

function monthsBetween(start: string, end: string) {
  return (
    (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
    Number(end.slice(5, 7)) -
    Number(start.slice(5, 7))
  );
}

function toCalendarMonth(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(0, 7)}-01` : date;
}

function assembleHouseholdRows(
  youRows: ProjectionRow[],
  partnerRows: ProjectionRow[],
  settings: PensionSettings,
  partner: PensionSettings,
  dates: Pick<
    JointRetirementProjection,
    "firstRetirementMonth" | "bothRetiredMonth"
  >
) {
  const youByDate = createRowsByCalendarMonth(youRows);
  const partnerByDate = createRowsByCalendarMonth(partnerRows);
  const allDates = [
    ...new Set([...youByDate.keys(), ...partnerByDate.keys()]),
  ].sort();

  return allDates.map((date) => {
    const you = youByDate.get(date) ?? null;
    const partnerRow = partnerByDate.get(date) ?? null;
    const target =
      date < dates.firstRetirementMonth
        ? null
        : resolveHouseholdTarget(settings, partner, date, dates);
    const grossIncome =
      (you?.totalMonthlyIncomeBeforeTax ?? 0) +
      (partnerRow?.totalMonthlyIncomeBeforeTax ?? 0);
    const estimatedIncomeTax =
      (you?.monthlyIncomeTax ?? 0) + (partnerRow?.monthlyIncomeTax ?? 0);
    const netIncome = grossIncome - estimatedIncomeTax;
    const gap = target === null ? 0 : netIncome - target / 12;
    return {
      date,
      target,
      people: { you, partner: partnerRow },
      household: {
        grossIncome,
        estimatedIncomeTax,
        netIncome,
        shortfall: Math.max(0, -gap),
        surplus: Math.max(0, gap),
      },
    };
  });
}

function createRowsByCalendarMonth(rows: ProjectionRow[]) {
  const rowsByMonth = new Map<string, ProjectionRow>();
  for (const row of rows) {
    // Projection milestones can use different days within the same month for
    // each person. The household timeline is monthly, so retain the latest
    // row in that month and join both people on one canonical month key.
    rowsByMonth.set(toCalendarMonth(row.date), row);
  }
  return rowsByMonth;
}

function withdrawalsEqual(before: ProjectionRow[], after: ProjectionRow[]) {
  return before.every((row, index) => {
    const next = after[index];
    return (
      next &&
      Math.abs(row.monthlySippPension - next.monthlySippPension) < 0.01 &&
      Math.abs(row.monthlyCsAvcPension - next.monthlyCsAvcPension) < 0.01 &&
      Math.abs(row.monthlyIsaPension - next.monthlyIsaPension) < 0.01 &&
      Math.abs(row.monthlyLisaPension - next.monthlyLisaPension) < 0.01
    );
  });
}
