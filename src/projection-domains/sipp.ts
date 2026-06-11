import {
  getPartialRetirementSavingsContributionMultiplier,
  type AddedPensionLumpSum,
  type PensionSettings,
} from "../settings";
import { getModelledAnnualGrowthRate } from "./inflation";

export function calculateSippPotAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showSipp) {
    return 0;
  }

  return calculateSippProjectionRow({
    settings,
    rowDate,
    drawDate,
    endDate:
      input.endDate ?? addYears(settings.dateOfBirth, settings.lifeExpectancy),
  }).sippPot;
}

export function calculateMonthlySippPension(input: {
  potAtDraw: number;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["sippWithdrawalStrategy"];
  withdrawalPercent: number;
  targetDate?: string;
}) {
  const {
    potAtDraw,
    drawDate,
    endDate,
    strategy,
    withdrawalPercent,
    targetDate,
  } = input;

  if (strategy === "percentage") {
    return (potAtDraw * (withdrawalPercent / 100)) / 12;
  }

  const drawdownMonths = Math.max(
    1,
    countScheduledWithdrawalDatesRemaining(
      drawDate,
      strategy === "use_by_age" ? (targetDate ?? endDate) : endDate
    )
  );
  return potAtDraw / drawdownMonths;
}

export function calculateTotalSippContributionsAfterTaxRelief(
  settings: PensionSettings,
  drawDate: string
) {
  if (!settings.showSipp) {
    return 0;
  }

  const contributionStopDate = getPotContributionStopDate(settings, drawDate);

  if (contributionStopDate <= settings.startDate) {
    return 0;
  }

  const contributionMultiplier = getSippContributionMultiplier(
    settings.sippTaxReliefRate
  );

  let regularContributions = 0;

  for (
    let monthIndex = 0;
    addMonths(settings.startDate, monthIndex) < contributionStopDate;
    monthIndex += 1
  ) {
    const contributionDate = addMonths(settings.startDate, monthIndex);
    regularContributions +=
      settings.sippMonthlyContribution *
      contributionMultiplier *
      getPartialRetirementSavingsContributionMultiplier(
        settings,
        contributionDate
      );
  }

  return (
    calculateLumpSumsBeforeDate(settings.sippLumpSums, contributionStopDate) *
      contributionMultiplier +
    regularContributions
  );
}

export function calculateSippProjectionRow(input: {
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
    showPot: settings.showSipp,
    currentPot: settings.sippCurrentPot,
    monthlyContribution: settings.sippMonthlyContribution,
    lumpSums: settings.sippLumpSums,
    realInterestPercent: settings.sippRealInterestPercent,
    withdrawalStrategy: settings.sippWithdrawalStrategy,
    withdrawalPercent: settings.sippWithdrawalPercent,
    withdrawalTargetAge: settings.sippWithdrawalTargetAge,
    contributionMultiplier: getSippContributionMultiplier(
      settings.sippTaxReliefRate
    ),
  });

  return {
    sippPot: projection.pot,
    monthlySippPension: projection.monthlyWithdrawal,
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
  withdrawalStrategy: PensionSettings["sippWithdrawalStrategy"];
  withdrawalPercent: number;
  withdrawalTargetAge: number;
  contributionMultiplier: number;
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
    contributionMultiplier,
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
  const contributionStopDate = getPotContributionStopDate(settings, drawDate);
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
      pot +=
        monthlyContribution *
        contributionMultiplier *
        getPartialRetirementSavingsContributionMultiplier(
          settings,
          projectionMonthDate
        );
    }
    pot += calculateScheduledPotLumpSums({
      lumpSums,
      previousRowDate: previousProjectionMonthDate,
      rowDate: projectionMonthDate,
      contributionMultiplier,
      latestPaymentDateExclusive: contributionStopDate,
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

function calculateMonthlyWithdrawalFromPot(input: {
  pot: number;
  rowDate: string;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["sippWithdrawalStrategy"];
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

function getPotContributionStopDate(
  settings: PensionSettings,
  drawDate: string
) {
  return minIsoDate(
    drawDate,
    addYears(settings.dateOfBirth, settings.requirementAge)
  );
}

function getSippContributionMultiplier(
  taxReliefRate: PensionSettings["sippTaxReliefRate"]
) {
  if (taxReliefRate === "20") {
    return 1 / 0.8;
  }

  if (taxReliefRate === "40") {
    return 1 / 0.6;
  }

  return 1;
}

function calculateScheduledPotLumpSums(input: {
  lumpSums: AddedPensionLumpSum[];
  previousRowDate?: string;
  rowDate: string;
  contributionMultiplier: number;
  latestPaymentDateExclusive: string;
}) {
  const {
    lumpSums,
    previousRowDate,
    rowDate,
    contributionMultiplier,
    latestPaymentDateExclusive,
  } = input;

  return lumpSums.reduce((total, lumpSum) => {
    const matchingPaymentDates = getScheduledPaymentDatesThroughRow(
      lumpSum,
      previousRowDate,
      rowDate
    ).filter((paymentDate) => paymentDate < latestPaymentDateExclusive);

    return (
      total +
      matchingPaymentDates.length * lumpSum.amount * contributionMultiplier
    );
  }, 0);
}

function calculateLumpSumsBeforeDate(
  lumpSums: AddedPensionLumpSum[],
  rowDate: string
) {
  return lumpSums.reduce(
    (total, lumpSum) =>
      total +
      getScheduledPaymentDates(lumpSum).filter(
        (paymentDate) => paymentDate < rowDate
      ).length *
        lumpSum.amount,
    0
  );
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
