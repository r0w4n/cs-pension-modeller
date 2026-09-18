import {
  getPartialRetirementSavingsContributionMultiplier,
  type AddedPensionLumpSum,
  type PensionSettings,
} from "../settings";
import {
  calculateFlexibleFundProjectionAtDate,
  calculateFlexibleFundProjectionRows,
  calculateScheduledContributionsBeforeDate,
  countScheduledWithdrawalDatesRemaining,
  getPotContributionStopDate,
  type FlexibleFundProjectionPoint,
} from "./flexible-fund-forward-projection";

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

  if (strategy === "meet_income_target") {
    return 0;
  }

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

export function calculateCsAvcProjectionRows(input: {
  settings: PensionSettings;
  rowDates: string[];
  drawDate: string;
  endDate: string;
}) {
  const projections = calculatePotProjectionRows(input);

  return new Map(
    [...projections].map(([date, projection]) => [
      date,
      {
        csAvcPot: projection.pot,
        monthlyCsAvcPension: projection.monthlyWithdrawal,
      },
    ])
  );
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
  return calculateFlexibleFundProjectionAtDate({
    ...input,
    contributionStopDate: getPotContributionStopDate(
      input.settings,
      input.drawDate
    ),
    includeContributionStopDate: true,
    calculateRegularContributionWithAdditions: ({ amount, contributionDate }) =>
      amount *
      input.contributionMultiplier *
      getPartialRetirementSavingsContributionMultiplier(
        input.settings,
        contributionDate
      ),
    calculateLumpSumContributionWithAdditions: ({ amount }) =>
      amount * input.contributionMultiplier,
  });
}

function calculateLumpSumsThroughDate(
  lumpSums: AddedPensionLumpSum[],
  rowDate: string
) {
  return calculateScheduledContributionsBeforeDate({
    lumpSums,
    rowDate,
    includeRowDate: true,
  });
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

function calculatePotProjectionRows(input: {
  settings: PensionSettings;
  rowDates: string[];
  drawDate: string;
  endDate: string;
}): Map<string, FlexibleFundProjectionPoint> {
  return calculateFlexibleFundProjectionRows({
    settings: input.settings,
    rowDates: input.rowDates,
    drawDate: input.drawDate,
    endDate: input.endDate,
    showPot: input.settings.showCsAvc,
    currentPot: input.settings.csAvcCurrentPot,
    monthlyContribution: input.settings.csAvcMonthlyContribution,
    lumpSums: input.settings.csAvcLumpSums,
    realInterestPercent: input.settings.csAvcRealInterestPercent,
    withdrawalStrategy: input.settings.csAvcWithdrawalStrategy,
    withdrawalPercent: input.settings.csAvcWithdrawalPercent,
    withdrawalTargetAge: input.settings.csAvcWithdrawalTargetAge,
    contributionStopDate: getPotContributionStopDate(
      input.settings,
      input.drawDate
    ),
    includeContributionStopDate: true,
    calculateRegularContributionWithAdditions: ({ amount, contributionDate }) =>
      amount *
      getPartialRetirementSavingsContributionMultiplier(
        input.settings,
        contributionDate
      ),
  });
}
