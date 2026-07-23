import addedPensionFactors from "../data/alpha_pension_added_pension_factors.json";
import alphaEarlyRetirementFactors from "../data/alpha_pension_reduction_factors.json";
import {
  getPartialRetirementContributionMultiplier,
  type AddedPensionFactorType,
  type AddedPensionLumpSum,
  type PensionSettings,
} from "../settings";
import {
  calculateNormalPensionAge,
  calculateStatePensionDrawDate,
} from "../settings/settings-shared/state";

type AddedPensionPurchaseType = "lump_sum" | "monthly";

type AddedPensionFactorTable = {
  minimum_age: number;
  self: readonly number[];
  self_plus_beneficiaries: readonly number[];
};

type AddedPensionFactorsData = {
  factors: Record<
    AddedPensionPurchaseType,
    Record<string, AddedPensionFactorTable>
  >;
  revaluation_factors: {
    minimum_aprils: number;
    values: readonly number[];
  };
};

type AlphaEarlyRetirementFactorTable = Record<
  number,
  Record<number, readonly number[]>
>;

const ALPHA_EARLY_RETIREMENT_FACTORS = (
  alphaEarlyRetirementFactors as {
    factors: AlphaEarlyRetirementFactorTable;
  }
).factors;

const ADDED_PENSION_FACTORS = addedPensionFactors as AddedPensionFactorsData;
const MONTHLY_ALPHA_ACCRUAL_RATE = 0.0232 / 12;
const DEFAULT_ALPHA_ACCRUAL_RATE = 0.0232;

export function calculateMonthlyAlphaAccrual(pensionableEarnings: number) {
  return pensionableEarnings * MONTHLY_ALPHA_ACCRUAL_RATE;
}

export function calculateProjectedAlphaPensionableEarnings(
  settings: PensionSettings,
  rowDate: string
) {
  if (settings.alphaPayRisePercent <= 0) {
    return settings.pensionableEarnings;
  }

  const fullYearsSinceStart = calculateWholeYearDifference(
    settings.startDate,
    rowDate
  );
  const annualPayRiseRate = settings.alphaPayRisePercent / 100;

  return (
    settings.pensionableEarnings *
    (1 + annualPayRiseRate) ** fullYearsSinceStart
  );
}

export function calculateMonthlyStandardAlphaAccrual(
  settings: PensionSettings,
  rowDate: string
) {
  if (!settings.showAlpha) {
    return 0;
  }

  return isEpaAccrualDate(settings, rowDate)
    ? 0
    : calculateMonthlyAlphaAccrual(
        calculateProjectedAlphaPensionableEarnings(settings, rowDate)
      ) * getPartialRetirementContributionMultiplier(settings, rowDate);
}

export function calculateMonthlyEpaAlphaAccrual(
  settings: PensionSettings,
  rowDate: string
) {
  if (!settings.showAlpha) {
    return 0;
  }

  return isEpaAccrualDate(settings, rowDate)
    ? calculateMonthlyAlphaAccrual(
        calculateProjectedAlphaPensionableEarnings(settings, rowDate)
      ) * getPartialRetirementContributionMultiplier(settings, rowDate)
    : 0;
}

export function calculateStartingAlphaPensionAtStartDate(input: {
  alphaPensionAccruedAtLastStatement: number;
  alphaPensionAbsDate: string;
  startDate: string;
  pensionableEarnings: number;
  alphaAccrualRate?: number;
}) {
  const {
    alphaPensionAccruedAtLastStatement,
    alphaPensionAbsDate,
    startDate,
    pensionableEarnings,
    alphaAccrualRate = DEFAULT_ALPHA_ACCRUAL_RATE,
  } = input;
  const monthsBetween = Math.max(
    0,
    calculateWholeMonthDifference(alphaPensionAbsDate, startDate)
  );
  const additionalAccruedAlpha =
    pensionableEarnings * alphaAccrualRate * (monthsBetween / 12);

  return alphaPensionAccruedAtLastStatement + additionalAccruedAlpha;
}

export function calculateAccruedAlphaPension(
  startingAccruedAlphaPension: number,
  cumulativeMonthlyAccrual: number
) {
  return startingAccruedAlphaPension + cumulativeMonthlyAccrual;
}

export function calculateAlphaPensionRevaluationFactor(input: {
  fromDate: string;
  rowDate: string;
  activeUntilDate: string;
  cpiPercent: number;
}) {
  const { fromDate, rowDate, activeUntilDate, cpiPercent } = input;
  const cpiRate = cpiPercent / 100;
  const totalYears = calculateWholeYearDifference(fromDate, rowDate);
  const activeYears = Math.min(
    totalYears,
    calculateWholeYearDifference(fromDate, activeUntilDate)
  );
  const deferredYears = totalYears - activeYears;

  return (1 + cpiRate) ** activeYears * (1 + cpiRate) ** deferredYears;
}

export function calculateMonthlyAddedPension(input: {
  rowDate: string;
  stopDate: string;
  dateOfBirth: string;
  addedPensionMonthlyContribution: number;
  calculationDate?: string;
  contributionMultiplier?: number;
  factorType?: AddedPensionFactorType;
}) {
  const {
    rowDate,
    stopDate,
    dateOfBirth,
    addedPensionMonthlyContribution,
    calculationDate = rowDate,
    contributionMultiplier = 1,
    factorType = "self",
  } = input;

  if (rowDate > stopDate) {
    return 0;
  }

  const normalPensionAge = calculateNormalPensionAge(dateOfBirth);
  const normalPensionDate = calculateStatePensionDrawDate(dateOfBirth);
  const age = calculateAge(dateOfBirth, calculationDate);
  const factor = getAddedPensionFactorForAge(
    age,
    factorType,
    "monthly",
    normalPensionAge
  );

  if (!factor) {
    return 0;
  }

  const revaluationFactor = getAddedPensionRevaluationFactor(
    calculationDate,
    normalPensionDate
  );

  if (!revaluationFactor) {
    return 0;
  }

  return (
    (addedPensionMonthlyContribution * contributionMultiplier) /
    (factor * revaluationFactor)
  );
}

export function getAddedPensionPeriodCalculationDate(
  contributionStartDate: string,
  rowDate: string
) {
  const rowYear = Number(rowDate.slice(0, 4));
  const schemeYearStart = `${rowDate.slice(5) < "04-01" ? rowYear - 1 : rowYear}-04-01`;

  return contributionStartDate > schemeYearStart
    ? contributionStartDate
    : schemeYearStart;
}

export function calculateLumpSumAddedPension(input: {
  rowDate: string;
  previousRowDate?: string;
  dateOfBirth: string;
  lumpSums: AddedPensionLumpSum[];
  factorType?: AddedPensionFactorType;
}) {
  const {
    rowDate,
    previousRowDate,
    dateOfBirth,
    lumpSums,
    factorType = "self",
  } = input;

  return lumpSums.reduce((total, lumpSum) => {
    const matchingPaymentDates = getScheduledPaymentDatesThroughRow(
      lumpSum,
      previousRowDate,
      rowDate
    );

    const purchasedPension = matchingPaymentDates.reduce(
      (runningTotal, paymentDate) => {
        const age = calculateAge(dateOfBirth, paymentDate);
        const normalPensionAge = calculateNormalPensionAge(dateOfBirth);
        const factor = getAddedPensionFactorForAge(
          age,
          lumpSum.factorType ?? factorType,
          "lump_sum",
          normalPensionAge
        );

        if (!factor) {
          return runningTotal;
        }

        const revaluationFactor = getAddedPensionRevaluationFactor(
          paymentDate,
          calculateStatePensionDrawDate(dateOfBirth)
        );

        if (!revaluationFactor) {
          return runningTotal;
        }

        return runningTotal + lumpSum.amount / (factor * revaluationFactor);
      },
      0
    );

    return total + purchasedPension;
  }, 0);
}

export function getAddedPensionFactorForAge(
  age: number,
  factorType: AddedPensionFactorType = "self",
  purchaseType: AddedPensionPurchaseType = "monthly",
  normalPensionAge = 68
) {
  const normalPensionAgeInMonths = toCompletedAgeMonths(normalPensionAge);
  const lowerNormalPensionAge = Math.floor(normalPensionAgeInMonths / 12);
  const completedMonths = normalPensionAgeInMonths % 12;
  const lowerFactor = getPublishedAddedPensionFactor(
    age,
    factorType,
    purchaseType,
    lowerNormalPensionAge
  );

  if (completedMonths === 0) {
    return lowerFactor ?? 0;
  }

  const upperFactor = getPublishedAddedPensionFactor(
    age,
    factorType,
    purchaseType,
    lowerNormalPensionAge + 1
  );

  if (lowerFactor === null || upperFactor === null) {
    return 0;
  }

  return lowerFactor + (upperFactor - lowerFactor) * (completedMonths / 12);
}

export function getAddedPensionRevaluationFactor(
  calculationDate: string,
  normalPensionDate: string
) {
  const numberOfAprils = countFirstAprilsAfter(
    calculationDate,
    normalPensionDate
  );
  const { minimum_aprils: minimumAprils, values } =
    ADDED_PENSION_FACTORS.revaluation_factors;

  return values[numberOfAprils - minimumAprils] ?? 0;
}

export function getAlphaEarlyRetirementFactor(
  normalPensionAge: number,
  retirementAge: number
) {
  const normalPensionAgeInMonths = toCompletedAgeMonths(normalPensionAge);
  const retirementAgeInMonths = toCompletedAgeMonths(retirementAge);

  if (retirementAgeInMonths >= normalPensionAgeInMonths) {
    return 1;
  }

  const lowerNormalPensionAge = Math.floor(normalPensionAgeInMonths / 12);
  const normalPensionAgeMonths = normalPensionAgeInMonths % 12;
  const lowerFactor = getPublishedAlphaEarlyRetirementFactor(
    lowerNormalPensionAge,
    retirementAgeInMonths
  );

  if (normalPensionAgeMonths === 0) {
    return lowerFactor ?? 1;
  }

  const upperFactor = getPublishedAlphaEarlyRetirementFactor(
    lowerNormalPensionAge + 1,
    retirementAgeInMonths
  );

  if (lowerFactor === null || upperFactor === null) {
    return 1;
  }

  return (
    lowerFactor + (upperFactor - lowerFactor) * (normalPensionAgeMonths / 12)
  );
}

export function calculateAnnualAlphaPensionIncludingReduction(
  accruedAlphaPension: number,
  alphaPensionDrawDate: string,
  npaDate: string,
  reductionFactor: number
) {
  return alphaPensionDrawDate > npaDate
    ? accruedAlphaPension
    : accruedAlphaPension * reductionFactor;
}

export function calculateAnnualAlphaPensionIncludingEpaReduction(input: {
  standardAlphaPension: number;
  epaAlphaPension: number;
  alphaPensionDrawDate: string;
  npaDate: string;
  epaDate: string;
  reductionFactor: number;
  epaReductionFactor: number;
}) {
  const {
    standardAlphaPension,
    epaAlphaPension,
    alphaPensionDrawDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  } = input;
  const standardPensionAfterReduction =
    alphaPensionDrawDate > npaDate
      ? standardAlphaPension
      : standardAlphaPension * reductionFactor;
  const epaPensionAfterReduction =
    alphaPensionDrawDate >= epaDate
      ? epaAlphaPension
      : epaAlphaPension * epaReductionFactor;

  return standardPensionAfterReduction + epaPensionAfterReduction;
}

export function calculateMonthlyAlphaPensionGross(
  rowDate: string,
  alphaPensionDrawDate: string,
  annualAlphaPensionIncludingReduction: number
) {
  if (rowDate < alphaPensionDrawDate) {
    return 0;
  }

  return annualAlphaPensionIncludingReduction / 12;
}

export function calculateMonthlyAlphaPensionIncludingReduction(
  accruedAlphaPension: number,
  alphaPensionDrawDate: string,
  npaDate: string,
  reductionFactor: number
) {
  const annualAlphaPensionIncludingReduction =
    alphaPensionDrawDate > npaDate
      ? accruedAlphaPension
      : accruedAlphaPension * reductionFactor;

  return annualAlphaPensionIncludingReduction / 12;
}

function isEpaAccrualDate(settings: PensionSettings, rowDate: string) {
  return (
    settings.alphaEpaEnabled &&
    rowDate >= settings.alphaEpaStartDate &&
    rowDate <= settings.alphaEpaEndDate
  );
}

function getPublishedAlphaEarlyRetirementFactor(
  normalPensionAge: number,
  retirementAgeInMonths: number
) {
  const retirementAge = Math.floor(retirementAgeInMonths / 12);
  const completedMonths = retirementAgeInMonths % 12;

  return (
    ALPHA_EARLY_RETIREMENT_FACTORS[normalPensionAge]?.[retirementAge]?.[
      completedMonths
    ] ?? null
  );
}

function getPublishedAddedPensionFactor(
  age: number,
  factorType: AddedPensionFactorType,
  purchaseType: AddedPensionPurchaseType,
  normalPensionAge: number
) {
  const table =
    ADDED_PENSION_FACTORS.factors[purchaseType][String(normalPensionAge)];

  if (!table) {
    return null;
  }

  return table[factorType][age - table.minimum_age] ?? null;
}

function countFirstAprilsAfter(
  calculationDate: string,
  normalPensionDate: string
) {
  const calculationYear = Number(calculationDate.slice(0, 4));
  let firstApril = `${calculationYear}-04-01`;

  if (firstApril <= calculationDate) {
    firstApril = `${calculationYear + 1}-04-01`;
  }

  if (firstApril > normalPensionDate) {
    return 0;
  }

  return (
    Number(normalPensionDate.slice(0, 4)) -
    Number(firstApril.slice(0, 4)) +
    (normalPensionDate.slice(5) >= "04-01" ? 1 : 0)
  );
}

function toCompletedAgeMonths(age: number) {
  return Math.floor(age * 12 + 1e-8);
}

function calculateAge(dateOfBirth: string, rowDate: string) {
  const birth = parseIsoDate(dateOfBirth);
  const row = parseIsoDate(rowDate);

  let age = row.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthday =
    row.getUTCMonth() > birth.getUTCMonth() ||
    (row.getUTCMonth() === birth.getUTCMonth() &&
      row.getUTCDate() >= birth.getUTCDate());

  if (!hasHadBirthday) {
    age -= 1;
  }

  return age;
}

function getScheduledPaymentDatesThroughRow(
  lumpSum: AddedPensionLumpSum,
  previousRowDate: string | undefined,
  rowDate: string
) {
  return getScheduledPaymentDates(lumpSum).filter(
    (scheduledDate) =>
      scheduledDate <= rowDate &&
      (!previousRowDate || scheduledDate > previousRowDate)
  );
}

function getScheduledPaymentDates(lumpSum: AddedPensionLumpSum) {
  const dates: string[] = [];
  let scheduledDate = lumpSum.startDate;

  while (scheduledDate <= lumpSum.endDate) {
    dates.push(scheduledDate);

    if (lumpSum.cadence === "once") {
      break;
    }

    scheduledDate = addYears(scheduledDate, 1);
  }

  return dates;
}

function addYears(date: string, years: number) {
  return addMonths(date, Math.round(years * 12));
}

function addMonths(date: string, months: number) {
  const parsed = parseIsoDate(date);
  const monthIndex = parsed.getUTCMonth() + months;
  const year = parsed.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(parsed.getUTCDate(), getDaysInMonth(year, month));

  return formatIsoDate(new Date(Date.UTC(year, month, day)));
}

function calculateWholeMonthDifference(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  let monthDifference = (endYear - startYear) * 12 + (endMonth - startMonth);

  if (endDay < startDay) {
    monthDifference -= 1;
  }

  return monthDifference;
}

function calculateWholeYearDifference(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  let yearDifference = endYear - startYear;

  if (endMonth < startMonth || (endMonth === startMonth && endDay < startDay)) {
    yearDifference -= 1;
  }

  return Math.max(0, yearDifference);
}

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
