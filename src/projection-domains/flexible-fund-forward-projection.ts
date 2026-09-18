import { addMonths, addYears, minIsoDate } from "../derive-inputs";
import type { PensionSettings, AddedPensionLumpSum } from "../settings";
import { calculateAnchoredMonthDifference as calculateWholeMonthDifference } from "../projection-date";
import { getModelledMonthlyGrowthRate } from "./inflation";

export type FlexibleFundProjectionPoint = {
  pot: number;
  potBeforeWithdrawal: number;
  monthlyWithdrawal: number;
};

type FlexibleWithdrawalStrategy = PensionSettings["sippWithdrawalStrategy"];

export type FlexibleFundProjectionInput<
  Strategy extends FlexibleWithdrawalStrategy,
> = {
  settings: PensionSettings;
  rowDates: string[];
  drawDate: string;
  endDate: string;
  showPot: boolean;
  currentPot: number;
  monthlyContribution: number;
  lumpSums: AddedPensionLumpSum[];
  realInterestPercent: number;
  withdrawalStrategy: Strategy;
  withdrawalPercent: number;
  withdrawalTargetAge: number;
  contributionStopDate: string;
  contributionMultiplier?: number;
  includeContributionStopDate?: boolean;
  calculateRegularContributionWithAdditions?: (input: {
    amount: number;
    contributionDate: string;
  }) => number;
  calculateLumpSumContributionWithAdditions?: (input: {
    amount: number;
    contributionDate: string;
  }) => number;
};

export function calculateFlexibleFundProjectionRows<
  Strategy extends FlexibleWithdrawalStrategy,
>(input: FlexibleFundProjectionInput<Strategy>) {
  const emptyProjection = {
    pot: 0,
    potBeforeWithdrawal: 0,
    monthlyWithdrawal: 0,
  };
  const projectionByDate = new Map<string, FlexibleFundProjectionPoint>();

  input.rowDates.forEach((rowDate) => {
    if (rowDate < input.settings.startDate || !input.showPot) {
      projectionByDate.set(rowDate, emptyProjection);
    }
  });

  if (!input.showPot) {
    return projectionByDate;
  }

  const monthlyInterestRate = getModelledMonthlyGrowthRate(
    input.settings,
    input.realInterestPercent / 100
  );
  const withdrawalEndDate =
    input.withdrawalStrategy === "use_by_age"
      ? addYears(input.settings.dateOfBirth, input.withdrawalTargetAge)
      : input.endDate;
  const contributionMultiplier = input.contributionMultiplier ?? 1;
  const calculateRegularContribution =
    input.calculateRegularContributionWithAdditions ??
    ((contribution: { amount: number }) =>
      contribution.amount * contributionMultiplier);
  const calculateLumpSumContribution =
    input.calculateLumpSumContributionWithAdditions ??
    ((contribution: { amount: number }) =>
      contribution.amount * contributionMultiplier);
  const lumpSumSchedules = input.lumpSums.map((lumpSum) =>
    getScheduledPaymentDates(lumpSum).filter((paymentDate) =>
      isBeforeContributionStopDate({
        paymentDate,
        contributionStopDate: input.contributionStopDate,
        includeContributionStopDate: input.includeContributionStopDate,
      })
    )
  );
  const projectionRowDates = input.rowDates.filter(
    (rowDate) => rowDate >= input.settings.startDate
  );
  let pot = input.currentPot;
  let monthlyWithdrawal: number;
  let potBeforeWithdrawal: number;
  let latestProjection: FlexibleFundProjectionPoint | undefined;
  let levelUseByAgeMonthlyWithdrawal: number | undefined;
  let previousProjectionMonthDate: string | undefined;
  let projectionRowIndex = 0;

  for (
    let monthIndex = 0;
    projectionRowIndex < projectionRowDates.length;
    monthIndex += 1
  ) {
    const projectionMonthDate = addMonths(input.settings.startDate, monthIndex);

    while (
      latestProjection &&
      projectionRowDates[projectionRowIndex] &&
      projectionRowDates[projectionRowIndex] < projectionMonthDate
    ) {
      projectionByDate.set(
        projectionRowDates[projectionRowIndex],
        latestProjection
      );
      projectionRowIndex += 1;
    }

    if (monthIndex > 0) {
      pot *= 1 + monthlyInterestRate;
    }

    if (
      isBeforeContributionStopDate({
        paymentDate: projectionMonthDate,
        contributionStopDate: input.contributionStopDate,
        includeContributionStopDate: input.includeContributionStopDate,
      })
    ) {
      pot += calculateRegularContribution({
        amount: input.monthlyContribution,
        contributionDate: projectionMonthDate,
      });
    }

    lumpSumSchedules.forEach((paymentDates, scheduleIndex) => {
      const lumpSum = input.lumpSums[scheduleIndex];
      paymentDates.forEach((paymentDate) => {
        if (
          paymentDate <= projectionMonthDate &&
          (!previousProjectionMonthDate ||
            paymentDate > previousProjectionMonthDate)
        ) {
          pot += calculateLumpSumContribution({
            amount: lumpSum.amount,
            contributionDate: paymentDate,
          });
        }
      });
    });

    potBeforeWithdrawal = pot;

    if (projectionMonthDate >= input.drawDate) {
      if (input.withdrawalStrategy === "use_by_age") {
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
          drawDate: input.drawDate,
          endDate: withdrawalEndDate,
          strategy: input.withdrawalStrategy,
          withdrawalPercent: input.withdrawalPercent,
        });
      }
    } else {
      monthlyWithdrawal = 0;
    }

    pot = Math.max(0, pot - monthlyWithdrawal);
    latestProjection = {
      pot,
      potBeforeWithdrawal,
      monthlyWithdrawal,
    };

    while (
      projectionRowDates[projectionRowIndex] &&
      projectionRowDates[projectionRowIndex] === projectionMonthDate
    ) {
      projectionByDate.set(
        projectionRowDates[projectionRowIndex],
        latestProjection
      );
      projectionRowIndex += 1;
    }

    previousProjectionMonthDate = projectionMonthDate;
  }

  return projectionByDate;
}

export function calculateFlexibleFundProjectionAtDate<
  Strategy extends FlexibleWithdrawalStrategy,
>(
  input: Omit<FlexibleFundProjectionInput<Strategy>, "rowDates"> & {
    rowDate: string;
  }
) {
  return (
    calculateFlexibleFundProjectionRows({
      ...input,
      rowDates: [input.rowDate],
    }).get(input.rowDate) ?? {
      pot: 0,
      potBeforeWithdrawal: 0,
      monthlyWithdrawal: 0,
    }
  );
}

export function countScheduledWithdrawalDatesRemaining(
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

export function calculateMonthlyWithdrawalFromPot(input: {
  pot: number;
  rowDate: string;
  drawDate: string;
  endDate: string;
  strategy: FlexibleWithdrawalStrategy;
  withdrawalPercent: number;
}) {
  const { pot, rowDate, drawDate, endDate, strategy, withdrawalPercent } =
    input;

  if (pot <= 0 || rowDate < drawDate) {
    return 0;
  }

  if (strategy === "meet_income_target") {
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

export function calculateLevelMonthlyWithdrawalFromPot(input: {
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

export function getPotContributionStopDate(
  settings: PensionSettings,
  drawDate: string
) {
  return minIsoDate(
    drawDate,
    addYears(settings.dateOfBirth, settings.requirementAge)
  );
}

export function calculateScheduledContributionsBeforeDate(input: {
  lumpSums: AddedPensionLumpSum[];
  rowDate: string;
  includeRowDate?: boolean;
  contributionMultiplier?: number;
}) {
  const contributionMultiplier = input.contributionMultiplier ?? 1;

  return input.lumpSums.reduce(
    (total, lumpSum) =>
      total +
      getScheduledPaymentDates(lumpSum).filter((paymentDate) =>
        input.includeRowDate
          ? paymentDate <= input.rowDate
          : paymentDate < input.rowDate
      ).length *
        lumpSum.amount *
        contributionMultiplier,
    0
  );
}

export function getScheduledPaymentDates(lumpSum: AddedPensionLumpSum) {
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

function isBeforeContributionStopDate(input: {
  paymentDate: string;
  contributionStopDate: string;
  includeContributionStopDate?: boolean;
}) {
  return input.includeContributionStopDate
    ? input.paymentDate <= input.contributionStopDate
    : input.paymentDate < input.contributionStopDate;
}
