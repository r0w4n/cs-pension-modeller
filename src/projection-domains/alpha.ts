import addedPensionFactors from "../data/alpha_pension_added_pension_factors.json";
import alphaEarlyRetirementFactors from "../data/alpha_pension_reduction_factors.json";
import {
  getPartialRetirementContributionMultiplier,
  type AddedPensionFactorType,
  type AddedPensionLumpSum,
  type PensionSettings,
} from "../settings";

type AddedPensionFactorRecord = {
  age: number;
  self: number | null;
  self_plus_beneficiaries: number | null;
};

type AlphaEarlyRetirementFactorRecord = {
  normal_pension_age: number;
  retirement_age: number;
  reduction_factor: number;
};

const MONTHLY_ALPHA_ACCRUAL_RATE = 0.0232 / 12;
const DEFAULT_ALPHA_ACCRUAL_RATE = 0.0232;
const ALPHA_IN_SERVICE_REVALUATION_UPLIFT_RATE = 0.015;

export function calculateMonthlyAlphaAccrual(pensionableEarnings: number) {
  return pensionableEarnings * MONTHLY_ALPHA_ACCRUAL_RATE;
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
    : calculateMonthlyAlphaAccrual(settings.pensionableEarnings) *
        getPartialRetirementContributionMultiplier(settings, rowDate);
}

export function calculateMonthlyEpaAlphaAccrual(
  settings: PensionSettings,
  rowDate: string
) {
  if (!settings.showAlpha) {
    return 0;
  }

  return isEpaAccrualDate(settings, rowDate)
    ? calculateMonthlyAlphaAccrual(settings.pensionableEarnings) *
        getPartialRetirementContributionMultiplier(settings, rowDate)
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
  const activeRate = cpiRate + ALPHA_IN_SERVICE_REVALUATION_UPLIFT_RATE;
  const totalYears = calculateWholeYearDifference(fromDate, rowDate);
  const activeYears = Math.min(
    totalYears,
    calculateWholeYearDifference(fromDate, activeUntilDate)
  );
  const deferredYears = totalYears - activeYears;

  return (1 + activeRate) ** activeYears * (1 + cpiRate) ** deferredYears;
}

export function calculateMonthlyAddedPension(input: {
  rowDate: string;
  stopDate: string;
  dateOfBirth: string;
  addedPensionMonthlyContribution: number;
  contributionMultiplier?: number;
  factorType?: AddedPensionFactorType;
}) {
  const {
    rowDate,
    stopDate,
    dateOfBirth,
    addedPensionMonthlyContribution,
    contributionMultiplier = 1,
    factorType = "self",
  } = input;

  if (rowDate > stopDate) {
    return 0;
  }

  const age = calculateAge(dateOfBirth, rowDate);
  const factor = getAddedPensionFactorForAge(age, factorType);

  if (!factor) {
    return 0;
  }

  const revaluationFactor = getAddedPensionRevaluationFactor(rowDate, stopDate);

  if (!revaluationFactor) {
    return 0;
  }

  return (
    (addedPensionMonthlyContribution * contributionMultiplier) /
    (factor * revaluationFactor)
  );
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
        const factor = getAddedPensionFactorForAge(
          age,
          lumpSum.factorType ?? factorType
        );

        if (!factor) {
          return runningTotal;
        }

        const revaluationFactor = getAddedPensionRevaluationFactor(
          paymentDate,
          lumpSum.endDate
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
  factorType: AddedPensionFactorType = "self"
) {
  const match = (addedPensionFactors as AddedPensionFactorRecord[]).find(
    (record) => record.age === age
  );

  return match?.[factorType] ?? 0;
}

export function getAddedPensionRevaluationFactor(
  _rowDate: string,
  _stopDate: string
) {
  return 1;
}

export function getAlphaEarlyRetirementFactor(
  normalPensionAge: number,
  retirementAge: number
) {
  if (retirementAge >= normalPensionAge) {
    return 1;
  }

  const records =
    alphaEarlyRetirementFactors as AlphaEarlyRetirementFactorRecord[];
  const normalPensionAges = Array.from(
    new Set(records.map((record) => record.normal_pension_age))
  ).sort((first, second) => first - second);
  const exactNormalPensionAge = normalPensionAges.find(
    (age) => age === normalPensionAge
  );

  if (exactNormalPensionAge !== undefined) {
    return getAlphaEarlyRetirementFactorForNormalPensionAge(
      records,
      exactNormalPensionAge,
      retirementAge
    );
  }

  const lowerNormalPensionAge = [...normalPensionAges]
    .reverse()
    .find((age) => age < normalPensionAge);
  const upperNormalPensionAge = normalPensionAges.find(
    (age) => age > normalPensionAge
  );

  if (
    lowerNormalPensionAge === undefined ||
    upperNormalPensionAge === undefined
  ) {
    return 1;
  }

  const lowerReductionFactor = getAlphaEarlyRetirementFactorForNormalPensionAge(
    records,
    lowerNormalPensionAge,
    retirementAge
  );
  const upperReductionFactor = getAlphaEarlyRetirementFactorForNormalPensionAge(
    records,
    upperNormalPensionAge,
    retirementAge
  );
  const normalPensionAgeProgress =
    (normalPensionAge - lowerNormalPensionAge) /
    (upperNormalPensionAge - lowerNormalPensionAge);

  return (
    lowerReductionFactor +
    (upperReductionFactor - lowerReductionFactor) * normalPensionAgeProgress
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

function getAlphaEarlyRetirementFactorForNormalPensionAge(
  records: AlphaEarlyRetirementFactorRecord[],
  normalPensionAge: number,
  retirementAge: number
) {
  const recordsForNormalPensionAge = records
    .filter((record) => record.normal_pension_age === normalPensionAge)
    .sort((first, second) => first.retirement_age - second.retirement_age);
  const match = recordsForNormalPensionAge.find(
    (record) => record.retirement_age === retirementAge
  );

  if (match) {
    return match.reduction_factor;
  }

  const lowerRecord = [...recordsForNormalPensionAge]
    .reverse()
    .find((record) => record.retirement_age < retirementAge);
  const upperRecord = recordsForNormalPensionAge.find(
    (record) => record.retirement_age > retirementAge
  );

  if (!lowerRecord || !upperRecord) {
    return 1;
  }

  const ageProgress =
    (retirementAge - lowerRecord.retirement_age) /
    (upperRecord.retirement_age - lowerRecord.retirement_age);

  return (
    lowerRecord.reduction_factor +
    (upperRecord.reduction_factor - lowerRecord.reduction_factor) * ageProgress
  );
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
