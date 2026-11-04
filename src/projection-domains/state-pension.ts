import {
  calculateStatePensionDrawDate,
  type PensionSettings,
} from "../settings";
import { getModelledAnnualGrowthRate } from "./inflation";

const STATE_PENSION_MINIMUM_INCREASE_PERCENT = 2.5;

export function calculateMonthlyStatePension(
  rowDate: string,
  statePensionStartDate: string,
  annualStatePensionAtDraw: number
) {
  return rowDate >= statePensionStartDate ? annualStatePensionAtDraw / 12 : 0;
}

export function calculateAnnualStatePensionAtDraw(settings: PensionSettings) {
  return calculateAnnualStatePensionAtDate(
    settings,
    settings.statePensionDrawDate
  );
}

export function calculateAnnualStatePensionAtDate(
  settings: PensionSettings,
  rowDate: string
) {
  if (!settings.showStatePension) {
    return 0;
  }

  const baseAnnualStatePensionAtDraw = calculateBaseAnnualStatePensionAtDate(
    settings,
    settings.statePensionDrawDate
  );
  const deferralIncreasePercent = calculateStatePensionDeferralIncreasePercent(
    settings.dateOfBirth,
    settings.statePensionDrawDate
  );
  const annualDeferredExtraAtDraw =
    baseAnnualStatePensionAtDraw * (deferralIncreasePercent / 100);

  if (rowDate <= settings.statePensionDrawDate) {
    return baseAnnualStatePensionAtDraw + annualDeferredExtraAtDraw;
  }

  const baseAnnualStatePensionAtRow = calculateBaseAnnualStatePensionAtDate(
    settings,
    rowDate
  );
  const annualDeferredExtraAtRow =
    annualDeferredExtraAtDraw *
    (1 + getStatePensionDeferredExtraGrowthRate(settings)) **
      calculateWholeYearDifference(settings.statePensionDrawDate, rowDate);

  return baseAnnualStatePensionAtRow + annualDeferredExtraAtRow;
}

export function calculateStatePensionDeferralIncreasePercent(
  dateOfBirth: string,
  statePensionDrawDate: string
) {
  const defaultStatePensionDrawDate =
    calculateStatePensionDrawDate(dateOfBirth);

  if (statePensionDrawDate <= defaultStatePensionDrawDate) {
    return 0;
  }

  const deferredWeeks = calculateWholeWeekDifference(
    defaultStatePensionDrawDate,
    statePensionDrawDate
  );

  if (deferredWeeks < 9) {
    return 0;
  }

  return deferredWeeks / 9;
}

export function getStatePensionNominalIncreaseRate(settings: PensionSettings) {
  return (
    Math.max(
      settings.statePensionCpiPercent,
      settings.statePensionWageGrowthPercent,
      STATE_PENSION_MINIMUM_INCREASE_PERCENT
    ) / 100
  );
}

function calculateBaseAnnualStatePensionAtDate(
  settings: PensionSettings,
  rowDate: string
) {
  if (!settings.statePensionApplyFutureGrowth) {
    return settings.currentStatePension;
  }

  const annualGrowthRate = getStatePensionModelledIncreaseRate(settings);
  const growthYears = calculateWholeYearDifference(settings.startDate, rowDate);

  return settings.currentStatePension * (1 + annualGrowthRate) ** growthYears;
}

function getStatePensionModelledIncreaseRate(settings: PensionSettings) {
  return getModelledAnnualGrowthRate(
    settings,
    getStatePensionNominalIncreaseRate(settings)
  );
}

function getStatePensionDeferredExtraGrowthRate(settings: PensionSettings) {
  if (!settings.statePensionApplyFutureGrowth) {
    return 0;
  }

  return settings.projectionBasis === "real"
    ? 0
    : settings.inflationRateAnnual / 100;
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

function calculateWholeWeekDifference(startDate: string, endDate: string) {
  if (endDate < startDate) {
    return 0;
  }

  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;

  return Math.floor(
    (parseIsoDate(endDate).getTime() - parseIsoDate(startDate).getTime()) /
      millisecondsPerWeek
  );
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
