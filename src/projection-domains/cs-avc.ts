import {
  getPartialRetirementSavingsContributionMultiplier,
  type AddedPensionLumpSum,
  type PensionSettings,
} from "../settings";
import { calculateAnchoredMonthDifference as calculateWholeMonthDifference } from "../projection-date";
import { getModelledMonthlyGrowthRate } from "./inflation";

export function calculateCsAvcPotAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showCsAvc) {
    return 0;
  }

  return calculateCsAvcProjectionRow({
    settings,
    rowDate,
    drawDate,
    endDate:
      input.endDate ?? addYears(settings.dateOfBirth, settings.lifeExpectancy),
  }).csAvcPot;
}

export function calculateCsAvcPotBeforeWithdrawalAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showCsAvc) {
    return 0;
  }

  return calculatePotProjectionAtDate({
    settings,
    rowDate,
    drawDate,
    endDate:
      input.endDate ?? addYears(settings.dateOfBirth, settings.lifeExpectancy),
    showPot: settings.showCsAvc,
    currentPot: settings.csAvcCurrentPot,
    monthlyContribution: settings.csAvcMonthlyContribution,
    lumpSums: settings.csAvcLumpSums,
    realInterestPercent: settings.csAvcRealInterestPercent,
    withdrawalStrategy: settings.csAvcWithdrawalStrategy,
    withdrawalPercent: settings.csAvcWithdrawalPercent,
    withdrawalTargetAge: settings.csAvcWithdrawalTargetAge,
    contributionMultiplier: 1,
  }).potBeforeWithdrawal;
}

export function calculateMonthlyCsAvcPension(input: {
  potAtDraw: number;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["csAvcWithdrawalStrategy"];
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
      strategy === "use_by_age" ? (targetDate ?? endDate) : endDate,
      { includeEndDate: strategy !== "use_by_age" }
    )
  );
  return potAtDraw / drawdownMonths;
}

export function calculateTotalCsAvcContributions(
  settings: PensionSettings,
  drawDate: string
) {
  if (!settings.showCsAvc) {
    return 0;
  }

  const contributionStopDate = getPotContributionStopDate(settings, drawDate);

  if (contributionStopDate <= settings.startDate) {
    return 0;
  }

  let regularContributions = 0;

  for (
    let monthIndex = 0;
    addMonths(settings.startDate, monthIndex) < contributionStopDate;
    monthIndex += 1
  ) {
    const contributionDate = addMonths(settings.startDate, monthIndex);
    regularContributions +=
      settings.csAvcMonthlyContribution *
      getPartialRetirementSavingsContributionMultiplier(
        settings,
        contributionDate
      );
  }

  return (
    calculateLumpSumsThroughDate(settings.csAvcLumpSums, contributionStopDate) +
    regularContributions
  );
}

export function calculateCsAvcProjectionRow(input: {
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
    showPot: settings.showCsAvc,
    currentPot: settings.csAvcCurrentPot,
    monthlyContribution: settings.csAvcMonthlyContribution,
    lumpSums: settings.csAvcLumpSums,
    realInterestPercent: settings.csAvcRealInterestPercent,
    withdrawalStrategy: settings.csAvcWithdrawalStrategy,
    withdrawalPercent: settings.csAvcWithdrawalPercent,
    withdrawalTargetAge: settings.csAvcWithdrawalTargetAge,
    contributionMultiplier: 1,
  });

  return {
    csAvcPot: projection.pot,
    monthlyCsAvcPension: projection.monthlyWithdrawal,
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
  withdrawalStrategy: PensionSettings["csAvcWithdrawalStrategy"];
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
      potBeforeWithdrawal: 0,
      monthlyWithdrawal: 0,
    };
  }

  const monthlyInterestRate = getModelledMonthlyGrowthRate(
    settings,
    realInterestPercent / 100
  );
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
  let potBeforeWithdrawal = currentPot;
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
      latestPaymentDateInclusive: contributionStopDate,
    });
    potBeforeWithdrawal = pot;

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
    potBeforeWithdrawal,
    monthlyWithdrawal,
  };
}

function calculateMonthlyWithdrawalFromPot(input: {
  pot: number;
  rowDate: string;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["csAvcWithdrawalStrategy"];
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
      ? countScheduledWithdrawalDatesRemaining(rowDate, endDate, {
          includeEndDate: strategy !== "use_by_age",
        })
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
    endDate,
    { includeEndDate: false }
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
  endDate: string,
  options: { includeEndDate?: boolean } = {}
) {
  const includeEndDate = options.includeEndDate ?? true;

  if (endDate < rowDate) {
    return 1;
  }

  const wholeMonths = calculateWholeMonthDifference(rowDate, endDate);
  const lastScheduledDate = addMonths(rowDate, wholeMonths);
  const lastScheduledDateIsInRange = includeEndDate
    ? lastScheduledDate <= endDate
    : lastScheduledDate < endDate;

  return lastScheduledDateIsInRange
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

function calculateScheduledPotLumpSums(input: {
  lumpSums: AddedPensionLumpSum[];
  previousRowDate?: string;
  rowDate: string;
  contributionMultiplier: number;
  latestPaymentDateInclusive: string;
}) {
  const {
    lumpSums,
    previousRowDate,
    rowDate,
    contributionMultiplier,
    latestPaymentDateInclusive,
  } = input;

  return lumpSums.reduce((total, lumpSum) => {
    const matchingPaymentDates = getScheduledPaymentDatesThroughRow(
      lumpSum,
      previousRowDate,
      rowDate
    ).filter((paymentDate) => paymentDate <= latestPaymentDateInclusive);

    return (
      total +
      matchingPaymentDates.length * lumpSum.amount * contributionMultiplier
    );
  }, 0);
}

function calculateLumpSumsThroughDate(
  lumpSums: AddedPensionLumpSum[],
  rowDate: string
) {
  return lumpSums.reduce(
    (total, lumpSum) =>
      total +
      getScheduledPaymentDates(lumpSum).filter(
        (paymentDate) => paymentDate <= rowDate
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

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
