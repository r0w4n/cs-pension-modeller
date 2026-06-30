import {
  getPartialRetirementSavingsContributionMultiplier,
  type AddedPensionLumpSum,
  type PensionSettings,
} from "../settings";
import {
  LISA_ANNUAL_ALLOWANCE,
  LISA_CONTRIBUTION_STOP_AGE,
  LISA_GOVERNMENT_BONUS_RATE,
} from "../settings/settings-domains/lisa";
import { getModelledAnnualGrowthRate } from "./inflation";

type LisaTaxYearContributionTracker = Map<string, number>;

export function calculateLisaPotAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showLisa) {
    return 0;
  }

  return calculateLisaProjectionRow({
    settings,
    rowDate,
    drawDate,
    endDate:
      input.endDate ?? addYears(settings.dateOfBirth, settings.lifeExpectancy),
  }).lisaPot;
}

export function calculateTotalLisaContributionsWithBonus(
  settings: PensionSettings,
  drawDate: string
) {
  if (!settings.showLisa) {
    return 0;
  }

  const contributionStopDate = getLisaContributionStopDate(settings, drawDate);

  if (contributionStopDate <= settings.startDate) {
    return 0;
  }

  const taxYearContributions: LisaTaxYearContributionTracker = new Map();
  let totalContributions = 0;

  for (
    let monthIndex = 0;
    addMonths(settings.startDate, monthIndex) < contributionStopDate;
    monthIndex += 1
  ) {
    const contributionDate = addMonths(settings.startDate, monthIndex);
    totalContributions += calculateLisaContributionWithBonus({
      amount:
        settings.lisaMonthlyContribution *
        getPartialRetirementSavingsContributionMultiplier(
          settings,
          contributionDate
        ),
      contributionDate,
      taxYearContributions,
    });
  }

  settings.lisaLumpSums.forEach((lumpSum) => {
    getScheduledPaymentDates(lumpSum)
      .filter((paymentDate) => paymentDate < contributionStopDate)
      .forEach((paymentDate) => {
        totalContributions += calculateLisaContributionWithBonus({
          amount: lumpSum.amount,
          contributionDate: paymentDate,
          taxYearContributions,
        });
      });
  });

  return totalContributions;
}

export function calculateLisaProjectionRow(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate: string;
}) {
  const { settings, rowDate, drawDate, endDate } = input;
  const projection = calculatePotProjectionAtDate({
    settings,
    rowDate,
    drawDate,
    endDate,
    showPot: settings.showLisa,
    currentPot: settings.lisaCurrentPot,
    monthlyContribution: settings.lisaMonthlyContribution,
    lumpSums: settings.lisaLumpSums,
    realInterestPercent: settings.lisaRealInterestPercent,
    withdrawalStrategy: settings.lisaWithdrawalStrategy,
    withdrawalPercent: settings.lisaWithdrawalPercent,
    withdrawalTargetAge: settings.lisaWithdrawalTargetAge,
  });

  return {
    lisaPot: projection.pot,
    monthlyLisaPension: projection.monthlyWithdrawal,
  };
}

function calculatePotProjectionAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate: string;
  showPot: boolean;
  currentPot: number;
  monthlyContribution: number;
  lumpSums: AddedPensionLumpSum[];
  realInterestPercent: number;
  withdrawalStrategy: PensionSettings["lisaWithdrawalStrategy"];
  withdrawalPercent: number;
  withdrawalTargetAge: number;
}) {
  const {
    settings,
    rowDate,
    drawDate,
    endDate,
    showPot,
    currentPot,
    monthlyContribution,
    lumpSums,
    realInterestPercent,
    withdrawalStrategy,
    withdrawalPercent,
    withdrawalTargetAge,
  } = input;

  if (!showPot || rowDate < settings.startDate) {
    return {
      pot: 0,
      monthlyWithdrawal: 0,
    };
  }

  const monthlyInterestRate =
    (1 + getModelledAnnualGrowthRate(settings, realInterestPercent / 100)) **
      (1 / 12) -
    1;
  const projectionMonthCount = calculateWholeMonthDifference(
    settings.startDate,
    rowDate
  );
  const withdrawalEndDate =
    withdrawalStrategy === "use_by_age"
      ? addYears(settings.dateOfBirth, withdrawalTargetAge)
      : endDate;
  const contributionStopDate = getLisaContributionStopDate(settings, drawDate);
  const taxYearContributions: LisaTaxYearContributionTracker = new Map();
  let pot = currentPot;
  let monthlyWithdrawal = 0;
  let levelUseByAgeMonthlyWithdrawal: number | undefined;
  let previousProjectionMonthDate: string | undefined;

  for (
    let monthIndex = 0;
    monthIndex <= projectionMonthCount;
    monthIndex += 1
  ) {
    const projectionMonthDate = addMonths(settings.startDate, monthIndex);

    if (monthIndex > 0) {
      pot *= 1 + monthlyInterestRate;
    }

    if (projectionMonthDate < contributionStopDate) {
      pot += calculateLisaContributionWithBonus({
        amount:
          monthlyContribution *
          getPartialRetirementSavingsContributionMultiplier(
            settings,
            projectionMonthDate
          ),
        contributionDate: projectionMonthDate,
        taxYearContributions,
      });
    }
    pot += calculateScheduledLisaLumpSums({
      lumpSums,
      previousRowDate: previousProjectionMonthDate,
      rowDate: projectionMonthDate,
      latestPaymentDateExclusive: contributionStopDate,
      taxYearContributions,
    });

    if (projectionMonthDate >= drawDate) {
      if (withdrawalStrategy === "use_by_age") {
        levelUseByAgeMonthlyWithdrawal ??=
          calculateLevelMonthlyWithdrawalFromPot({
            pot,
            rowDate: projectionMonthDate,
            endDate: withdrawalEndDate,
            monthlyInterestRate,
          });
        monthlyWithdrawal = Math.min(pot, levelUseByAgeMonthlyWithdrawal);
      } else {
        monthlyWithdrawal = calculateMonthlyWithdrawalFromPot({
          pot,
          rowDate: projectionMonthDate,
          drawDate,
          endDate: withdrawalEndDate,
          strategy: withdrawalStrategy,
          withdrawalPercent,
        });
      }
    } else {
      monthlyWithdrawal = 0;
    }
    pot = Math.max(0, pot - monthlyWithdrawal);

    previousProjectionMonthDate = projectionMonthDate;
  }

  return {
    pot,
    monthlyWithdrawal,
  };
}

function calculateLisaContributionWithBonus(input: {
  amount: number;
  contributionDate: string;
  taxYearContributions: LisaTaxYearContributionTracker;
}) {
  const { amount, contributionDate, taxYearContributions } = input;

  if (amount <= 0) {
    return 0;
  }

  const taxYear = getUkTaxYear(contributionDate);
  const contributedThisTaxYear = taxYearContributions.get(taxYear) ?? 0;
  const eligibleContribution = Math.min(
    amount,
    Math.max(0, LISA_ANNUAL_ALLOWANCE - contributedThisTaxYear)
  );

  taxYearContributions.set(
    taxYear,
    contributedThisTaxYear + eligibleContribution
  );

  return eligibleContribution * (1 + LISA_GOVERNMENT_BONUS_RATE);
}

function calculateMonthlyWithdrawalFromPot(input: {
  pot: number;
  rowDate: string;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["lisaWithdrawalStrategy"];
  withdrawalPercent: number;
}) {
  const { pot, rowDate, drawDate, endDate, strategy, withdrawalPercent } =
    input;

  if (pot <= 0 || rowDate < drawDate) {
    return 0;
  }

  if (strategy === "percentage") {
    return Math.min(pot, (pot * (withdrawalPercent / 100)) / 12);
  }

  const drawdownMonthsRemaining =
    strategy === "use_by_age" || strategy === "zero_at_death"
      ? countScheduledWithdrawalDatesRemaining(rowDate, endDate)
      : Math.max(1, calculateWholeMonthDifference(rowDate, endDate));

  return Math.min(pot, pot / drawdownMonthsRemaining);
}

function calculateLevelMonthlyWithdrawalFromPot(input: {
  pot: number;
  rowDate: string;
  endDate: string;
  monthlyInterestRate: number;
}) {
  const { pot, rowDate, endDate, monthlyInterestRate } = input;
  const drawdownMonthsRemaining = countScheduledWithdrawalDatesRemaining(
    rowDate,
    endDate
  );

  if (pot <= 0) {
    return 0;
  }

  if (Math.abs(monthlyInterestRate) < 0.0000000001) {
    return pot / drawdownMonthsRemaining;
  }

  const discountFactor = 1 / (1 + monthlyInterestRate);
  const annuityDueFactor =
    (1 - discountFactor ** drawdownMonthsRemaining) / (1 - discountFactor);

  return annuityDueFactor > 0
    ? pot / annuityDueFactor
    : pot / drawdownMonthsRemaining;
}

function countScheduledWithdrawalDatesRemaining(
  rowDate: string,
  endDate: string
) {
  if (endDate < rowDate) {
    return 1;
  }

  const wholeMonths = calculateWholeMonthDifference(rowDate, endDate);
  const lastScheduledDate = addMonths(rowDate, wholeMonths);

  return lastScheduledDate <= endDate
    ? wholeMonths + 1
    : Math.max(1, wholeMonths);
}

function getLisaContributionStopDate(
  settings: PensionSettings,
  drawDate: string
) {
  return minIsoDate(
    minIsoDate(
      drawDate,
      addYears(settings.dateOfBirth, settings.requirementAge)
    ),
    addYears(settings.dateOfBirth, LISA_CONTRIBUTION_STOP_AGE)
  );
}

function calculateScheduledLisaLumpSums(input: {
  lumpSums: AddedPensionLumpSum[];
  previousRowDate?: string;
  rowDate: string;
  latestPaymentDateExclusive: string;
  taxYearContributions: LisaTaxYearContributionTracker;
}) {
  const {
    lumpSums,
    previousRowDate,
    rowDate,
    latestPaymentDateExclusive,
    taxYearContributions,
  } = input;

  return lumpSums.reduce((total, lumpSum) => {
    const matchingPaymentDates = getScheduledPaymentDatesThroughRow(
      lumpSum,
      previousRowDate,
      rowDate
    ).filter((paymentDate) => paymentDate < latestPaymentDateExclusive);

    return (
      total +
      matchingPaymentDates.reduce(
        (sum, paymentDate) =>
          sum +
          calculateLisaContributionWithBonus({
            amount: lumpSum.amount,
            contributionDate: paymentDate,
            taxYearContributions,
          }),
        0
      )
    );
  }, 0);
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

function getUkTaxYear(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const taxYearStart = month > 4 || (month === 4 && day >= 6) ? year : year - 1;

  return `${taxYearStart}-${taxYearStart + 1}`;
}

function minIsoDate(firstDate: string, secondDate: string) {
  return firstDate <= secondDate ? firstDate : secondDate;
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

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
