import {
  getPartialRetirementContributionMultiplier,
  type PensionSettings,
} from "../settings";

const MONTHLY_NUVOS_ACCRUAL_RATE = 0.023 / 12;
export const NUVOS_FINAL_PENSIONABLE_SERVICE_DATE = "2015-03-31";
const NUVOS_FIRST_EARLY_RETIREMENT_BAND_MONTHS = 36;
const NUVOS_SECOND_EARLY_RETIREMENT_BAND_MONTHS = 36;
const NUVOS_FIRST_EARLY_RETIREMENT_BAND_RATE = 0.05 / 12;
const NUVOS_SECOND_EARLY_RETIREMENT_BAND_RATE = 0.04 / 12;
const NUVOS_THIRD_EARLY_RETIREMENT_BAND_RATE = 0.03 / 12;

export function calculateAnnualNuvosPensionAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  nuvosAbsDate: string;
  accrualStopDate: string;
}) {
  const { settings, rowDate, nuvosAbsDate, accrualStopDate } = input;
  const finalAccrualDate = earliestIsoDate(
    accrualStopDate,
    NUVOS_FINAL_PENSIONABLE_SERVICE_DATE
  );

  if (!settings.showNuvos || rowDate < nuvosAbsDate) {
    return 0;
  }

  const benefitComponents: { amount: number; startDate: string }[] = [
    {
      amount: settings.nuvosAccruedPensionAtLastAbs,
      startDate: nuvosAbsDate,
    },
  ];
  let accrualMonthIndex = 1;
  let accrualDate = addMonths(nuvosAbsDate, accrualMonthIndex);

  while (accrualDate <= rowDate && accrualDate <= finalAccrualDate) {
    benefitComponents.push({
      amount: calculateMonthlyNuvosAccrual(settings, accrualDate),
      startDate: accrualDate,
    });
    accrualMonthIndex += 1;
    accrualDate = addMonths(nuvosAbsDate, accrualMonthIndex);
  }

  return benefitComponents.reduce((total, component) => {
    const revaluationFactor = settings.nuvosApplyPensionIncreases
      ? calculateNuvosPensionRevaluationFactor({
          fromDate: component.startDate,
          rowDate,
          cpiPercent:
            settings.projectionBasis === "real"
              ? 0
              : settings.inflationRateAnnual,
        })
      : 1;

    return total + component.amount * revaluationFactor;
  }, 0);
}

export function calculateNuvosPensionRevaluationFactor(input: {
  fromDate: string;
  rowDate: string;
  cpiPercent: number;
}) {
  const { fromDate, rowDate, cpiPercent } = input;
  const cpiRate = cpiPercent / 100;
  const totalYears = calculateWholeYearDifference(fromDate, rowDate);

  return (1 + cpiRate) ** totalYears;
}

export function calculateNuvosEarlyRetirementFactor(
  yearsEarly: number,
  monthsEarly: number
) {
  const totalMonthsEarly = Math.max(0, yearsEarly * 12 + monthsEarly);

  const firstBandMonths = Math.min(
    totalMonthsEarly,
    NUVOS_FIRST_EARLY_RETIREMENT_BAND_MONTHS
  );
  const secondBandMonths = Math.min(
    Math.max(totalMonthsEarly - NUVOS_FIRST_EARLY_RETIREMENT_BAND_MONTHS, 0),
    NUVOS_SECOND_EARLY_RETIREMENT_BAND_MONTHS
  );
  const thirdBandMonths = Math.max(
    totalMonthsEarly -
      NUVOS_FIRST_EARLY_RETIREMENT_BAND_MONTHS -
      NUVOS_SECOND_EARLY_RETIREMENT_BAND_MONTHS,
    0
  );

  // nuvos uses scheme-rule banding rather than the Alpha actuarial factor table:
  // 5% a year for the first 3 years, 4% a year for the next 3, then 3% a year.
  const reduction =
    firstBandMonths * NUVOS_FIRST_EARLY_RETIREMENT_BAND_RATE +
    secondBandMonths * NUVOS_SECOND_EARLY_RETIREMENT_BAND_RATE +
    thirdBandMonths * NUVOS_THIRD_EARLY_RETIREMENT_BAND_RATE;

  return Math.max(0, 1 - reduction);
}

function calculateMonthlyNuvosAccrual(
  settings: PensionSettings,
  rowDate: string
) {
  if (!settings.showNuvos) {
    return 0;
  }

  return (
    settings.nuvosPensionableEarnings *
    MONTHLY_NUVOS_ACCRUAL_RATE *
    getPartialRetirementContributionMultiplier(settings, rowDate)
  );
}

function addMonths(date: string, months: number) {
  const parsed = parseIsoDate(date);
  const monthIndex = parsed.getUTCMonth() + months;
  const year = parsed.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(parsed.getUTCDate(), getDaysInMonth(year, month));

  return formatIsoDate(new Date(Date.UTC(year, month, day)));
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

function earliestIsoDate(firstDate: string, secondDate: string) {
  return firstDate <= secondDate ? firstDate : secondDate;
}
