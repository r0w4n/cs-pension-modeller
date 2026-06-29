import {
  calculateNormalPensionAge,
  getAlphaEpaDate,
  resolveAlphaAbsDate,
  validateSettings,
  type PensionSettings,
} from "./settings";
import {
  getModelledAnnualGrowthRate,
  getModelledPensionInflationPercent,
} from "./projection-domains/inflation";
import { getAlphaEarlyRetirementFactor } from "./projection-domains/alpha";
import { calculateNuvosEarlyRetirementFactor } from "./projection-domains/nuvos";
import { getStatePensionNominalIncreaseRate } from "./projection-domains/state-pension";

export const NUVOS_NORMAL_PENSION_AGE = 65;

export type DerivedProjectionInputs = {
  endDate: string;
  drawDate: string;
  alphaStopDate: string;
  accrualStopDate: string;
  nuvosDrawDate: string;
  nuvosAccrualStopDate: string;
  nuvosNpaDate: string;
  nuvosReductionFactor: number;
  addedPensionStopDate: string;
  npaDate: string;
  epaDate: string;
  reductionFactor: number;
  epaReductionFactor: number;
};

export type DerivedInflationAssumptions = {
  projectionBasis: PensionSettings["projectionBasis"];
  inflationRateAnnual: number;
  inflationRateMonthly: number;
  sippNominalReturnAnnual: number;
  sippModelledReturnAnnual: number;
  isaNominalReturnAnnual: number;
  isaModelledReturnAnnual: number;
  alphaNominalInServiceRevaluationAnnual: number;
  alphaModelledInServiceRevaluationAnnual: number;
  alphaNominalDeferredIncreaseAnnual: number;
  alphaModelledDeferredIncreaseAnnual: number;
  nuvosNominalDeferredIncreaseAnnual: number;
  nuvosModelledDeferredIncreaseAnnual: number;
  statePensionNominalIncreaseAnnual: number;
  statePensionModelledIncreaseAnnual: number;
};

export type ProjectionRuntimeDates = {
  sippDrawDate: string;
  isaDrawDate: string;
  alphaAbsDate: string;
  nuvosAbsDate: string;
};

export function deriveInflationAssumptions(
  settings: PensionSettings
): DerivedInflationAssumptions {
  const inflationRateAnnual = settings.inflationRateAnnual / 100;
  const inflationRateMonthly = (1 + inflationRateAnnual) ** (1 / 12) - 1;
  const sippNominalReturnAnnual = settings.sippRealInterestPercent / 100;
  const isaNominalReturnAnnual = settings.isaRealInterestPercent / 100;
  const alphaNominalInServiceRevaluationAnnual = inflationRateAnnual;
  const statePensionNominalIncreaseAnnual =
    getStatePensionNominalIncreaseRate(settings);

  return {
    projectionBasis: settings.projectionBasis,
    inflationRateAnnual,
    inflationRateMonthly,
    sippNominalReturnAnnual,
    sippModelledReturnAnnual: getModelledAnnualGrowthRate(
      settings,
      sippNominalReturnAnnual
    ),
    isaNominalReturnAnnual,
    isaModelledReturnAnnual: getModelledAnnualGrowthRate(
      settings,
      isaNominalReturnAnnual
    ),
    alphaNominalInServiceRevaluationAnnual,
    alphaModelledInServiceRevaluationAnnual:
      settings.projectionBasis === "real"
        ? 0
        : alphaNominalInServiceRevaluationAnnual,
    alphaNominalDeferredIncreaseAnnual: inflationRateAnnual,
    alphaModelledDeferredIncreaseAnnual:
      settings.projectionBasis === "real" ? 0 : inflationRateAnnual,
    nuvosNominalDeferredIncreaseAnnual: inflationRateAnnual,
    nuvosModelledDeferredIncreaseAnnual:
      settings.projectionBasis === "real" ? 0 : inflationRateAnnual,
    statePensionNominalIncreaseAnnual,
    statePensionModelledIncreaseAnnual: getModelledAnnualGrowthRate(
      settings,
      statePensionNominalIncreaseAnnual
    ),
  };
}

export function deriveProjectionInputs(
  settings: PensionSettings
): DerivedProjectionInputs | null {
  if (validateSettings(settings).length > 0) {
    return null;
  }

  const endDate = getLifeExpectancyDate(
    settings.dateOfBirth,
    settings.lifeExpectancy
  );
  const drawDate = addYears(settings.dateOfBirth, settings.alphaPensionDrawAge);
  const alphaStopDate = addYears(
    settings.dateOfBirth,
    settings.alphaPensionLeaveAge
  );
  const accrualStopDate = minIsoDate(drawDate, alphaStopDate);
  const nuvosDrawDate = addYears(
    settings.dateOfBirth,
    settings.nuvosPensionDrawAge
  );
  const nuvosAccrualStopDate = minIsoDate(
    nuvosDrawDate,
    addYears(settings.dateOfBirth, settings.nuvosPensionLeaveAge)
  );
  const nuvosNpaDate = addYears(settings.dateOfBirth, NUVOS_NORMAL_PENSION_AGE);
  const nuvosMonthsEarly =
    nuvosDrawDate >= nuvosNpaDate
      ? 0
      : calculateWholeMonthDifference(nuvosDrawDate, nuvosNpaDate);
  const nuvosReductionFactor = calculateNuvosEarlyRetirementFactor(
    Math.floor(nuvosMonthsEarly / 12),
    nuvosMonthsEarly % 12
  );
  const addedPensionStopDate = accrualStopDate;
  const normalPensionAge = calculateNormalPensionAge(settings.dateOfBirth);
  const npaDate = addYears(settings.dateOfBirth, normalPensionAge);
  const epaDate = getAlphaEpaDate(settings);
  const reductionFactor =
    drawDate > npaDate
      ? 1
      : getAlphaEarlyRetirementFactor(
          normalPensionAge,
          settings.alphaPensionDrawAge
        );
  const epaDrawAge = normalPensionAge - settings.alphaEpaYearsBeforeNpa;
  const epaReductionFactor =
    !settings.alphaEpaEnabled || drawDate >= epaDate
      ? 1
      : getAlphaEarlyRetirementFactor(epaDrawAge, settings.alphaPensionDrawAge);

  return {
    endDate,
    drawDate,
    alphaStopDate,
    accrualStopDate,
    nuvosDrawDate,
    nuvosAccrualStopDate,
    nuvosNpaDate,
    nuvosReductionFactor,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  };
}

export function createProjectionRuntimeDates(
  settings: PensionSettings
): ProjectionRuntimeDates {
  return {
    sippDrawDate: addYears(settings.dateOfBirth, settings.sippDrawAge),
    isaDrawDate: addYears(settings.dateOfBirth, settings.isaDrawAge),
    alphaAbsDate: resolveAlphaAbsDate(settings.alphaPensionAbsDate),
    nuvosAbsDate: resolveAlphaAbsDate(settings.nuvosPensionAbsDate),
  };
}

export function getLifeExpectancyDate(
  dateOfBirth: string,
  lifeExpectancyAge: number
) {
  return addYears(dateOfBirth, lifeExpectancyAge);
}

export function generateMonthlyDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addMonths(currentDate, 1);
  }

  if (dates.at(-1) !== endDate) {
    dates.push(endDate);
  }

  return dates;
}

export function calculateAge(dateOfBirth: string, rowDate: string) {
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

export function calculateAgeMonths(dateOfBirth: string, rowDate: string) {
  const birth = parseIsoDate(dateOfBirth);
  const row = parseIsoDate(rowDate);

  let months =
    (row.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    (row.getUTCMonth() - birth.getUTCMonth());

  if (row.getUTCDate() < birth.getUTCDate()) {
    months -= 1;
  }

  return Math.max(0, months % 12);
}

export function calculateWholeMonthDifference(
  startDate: string,
  endDate: string
) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const monthDifference =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());

  return Math.max(0, monthDifference);
}

export function calculateYearDifference(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const monthDifference =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());
  const dayAdjustment = (end.getUTCDate() - start.getUTCDate()) / 30;

  return Number(((monthDifference + dayAdjustment) / 12).toFixed(1));
}

export function addYears(date: string, years: number) {
  return addMonths(date, Math.round(years * 12));
}

export function addMonths(date: string, months: number) {
  const parsed = parseIsoDate(date);
  const monthIndex = parsed.getUTCMonth() + months;
  const year = parsed.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(parsed.getUTCDate(), getDaysInMonth(year, month));

  return formatIsoDate(new Date(Date.UTC(year, month, day)));
}

export function minIsoDate(firstDate: string, secondDate: string) {
  return firstDate <= secondDate ? firstDate : secondDate;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export { getModelledPensionInflationPercent };
