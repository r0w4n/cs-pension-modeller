import {
  calculateNormalPensionAge,
  getAlphaEpaDate,
  isValidIsoDate,
  resolveAlphaAbsDate,
  validateSettings,
  type PensionSettings,
} from "./settings";
import {
  getModelledAnnualGrowthRate,
  getModelledPensionInflationPercent,
} from "./projection-domains/inflation";
import { getAlphaEarlyRetirementFactor } from "./projection-domains/alpha";
import {
  calculateClassicEarlyRetirementFactor,
  CLASSIC_NORMAL_PENSION_AGE,
} from "./projection-domains/classic";
import {
  calculateNuvosEarlyRetirementFactor,
  NUVOS_FINAL_PENSIONABLE_SERVICE_DATE,
} from "./projection-domains/nuvos";
import { getPremiumEarlyRetirementFactor } from "./projection-domains/premium";
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
  classicDrawDate: string;
  classicNpaDate: string;
  classicReductionFactor: number;
  classicPlusDrawDate: string;
  classicPlusNpaDate: string;
  classicPlusReductionFactor: number;
  premiumDrawDate: string;
  premiumNpaDate: string;
  premiumReductionFactor: number | null;
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
  lisaNominalReturnAnnual: number;
  lisaModelledReturnAnnual: number;
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
  lisaDrawDate: string;
  alphaAbsDate: string;
  nuvosAbsDate: string;
  premiumDrawDate: string;
};

export function deriveInflationAssumptions(
  settings: PensionSettings
): DerivedInflationAssumptions {
  const inflationRateAnnual = settings.inflationRateAnnual / 100;
  const inflationRateMonthly = (1 + inflationRateAnnual) ** (1 / 12) - 1;
  const sippNominalReturnAnnual = settings.sippRealInterestPercent / 100;
  const isaNominalReturnAnnual = settings.isaRealInterestPercent / 100;
  const lisaNominalReturnAnnual = settings.lisaRealInterestPercent / 100;
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
    lisaNominalReturnAnnual,
    lisaModelledReturnAnnual: getModelledAnnualGrowthRate(
      settings,
      lisaNominalReturnAnnual
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
    minIsoDate(
      nuvosDrawDate,
      addYears(settings.dateOfBirth, settings.nuvosPensionLeaveAge)
    ),
    NUVOS_FINAL_PENSIONABLE_SERVICE_DATE
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
  const classicDrawDate = addYears(
    settings.dateOfBirth,
    settings.classicPensionDrawAge
  );
  const classicNpaDate = addYears(
    settings.dateOfBirth,
    CLASSIC_NORMAL_PENSION_AGE
  );
  const classicMonthsEarly =
    classicDrawDate >= classicNpaDate
      ? 0
      : calculateWholeMonthDifference(classicDrawDate, classicNpaDate);
  const classicReductionFactor = calculateClassicEarlyRetirementFactor(
    Math.floor(classicMonthsEarly / 12),
    classicMonthsEarly % 12
  );
  const classicPlusDrawDate = addYears(
    settings.dateOfBirth,
    settings.classicPlusPensionDrawAge
  );
  const classicPlusNpaDate = addYears(
    settings.dateOfBirth,
    CLASSIC_NORMAL_PENSION_AGE
  );
  const classicPlusMonthsEarly =
    classicPlusDrawDate >= classicPlusNpaDate
      ? 0
      : calculateWholeMonthDifference(classicPlusDrawDate, classicPlusNpaDate);
  const classicPlusReductionFactor = calculateClassicEarlyRetirementFactor(
    Math.floor(classicPlusMonthsEarly / 12),
    classicPlusMonthsEarly % 12
  );
  const premiumDrawDate = addYears(
    settings.dateOfBirth,
    settings.premiumDrawAge
  );
  const premiumNpaDate = addYears(
    settings.dateOfBirth,
    settings.premiumNormalPensionAge
  );
  const premiumReductionFactor =
    premiumDrawDate >= premiumNpaDate
      ? 1
      : getPremiumEarlyRetirementFactor(
          settings.premiumDrawAge,
          settings.premiumNormalPensionAge
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
    classicDrawDate,
    classicNpaDate,
    classicReductionFactor,
    classicPlusDrawDate,
    classicPlusNpaDate,
    classicPlusReductionFactor,
    premiumDrawDate,
    premiumNpaDate,
    premiumReductionFactor,
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
    lisaDrawDate: addYears(settings.dateOfBirth, settings.lisaDrawAge),
    alphaAbsDate: resolveAlphaAbsDate(settings.alphaPensionAbsDate),
    nuvosAbsDate: resolveAlphaAbsDate(settings.nuvosPensionAbsDate),
    premiumDrawDate: addYears(settings.dateOfBirth, settings.premiumDrawAge),
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
  if (!isValidIsoDate(date) || !Number.isFinite(months)) {
    return date;
  }

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
