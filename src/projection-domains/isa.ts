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

export function calculateIsaPotAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showIsa) {
    return 0;
  }

  return calculateIsaProjectionRow({
    settings,
    rowDate,
    drawDate,
    endDate:
      input.endDate ?? addYears(settings.dateOfBirth, settings.lifeExpectancy),
  }).isaPot;
}

export function calculateIsaPotBeforeWithdrawalAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showIsa) {
    return 0;
  }

  return calculatePotProjectionAtDate({
    settings,
    rowDate,
    drawDate,
    endDate:
      input.endDate ?? addYears(settings.dateOfBirth, settings.lifeExpectancy),
    showPot: settings.showIsa,
    currentPot: settings.isaCurrentPot,
    monthlyContribution: settings.isaMonthlyContribution,
    lumpSums: settings.isaLumpSums,
    realInterestPercent: settings.isaRealInterestPercent,
    withdrawalStrategy: settings.isaWithdrawalStrategy,
    withdrawalPercent: settings.isaWithdrawalPercent,
    withdrawalTargetAge: settings.isaWithdrawalTargetAge,
    contributionMultiplier: 1,
  }).potBeforeWithdrawal;
}

export function calculateMonthlyIsaPension(input: {
  potAtDraw: number;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["isaWithdrawalStrategy"];
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

export function calculateTotalIsaContributions(
  settings: PensionSettings,
  drawDate: string
) {
  if (!settings.showIsa) {
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
      settings.isaMonthlyContribution *
      getPartialRetirementSavingsContributionMultiplier(
        settings,
        contributionDate
      );
  }

  return (
    calculateLumpSumsBeforeDate(settings.isaLumpSums, contributionStopDate) +
    regularContributions
  );
}

export function calculateIsaProjectionRow(input: {
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
    showPot: settings.showIsa,
    currentPot: settings.isaCurrentPot,
    monthlyContribution: settings.isaMonthlyContribution,
    lumpSums: settings.isaLumpSums,
    realInterestPercent: settings.isaRealInterestPercent,
    withdrawalStrategy: settings.isaWithdrawalStrategy,
    withdrawalPercent: settings.isaWithdrawalPercent,
    withdrawalTargetAge: settings.isaWithdrawalTargetAge,
    contributionMultiplier: 1,
  });

  return {
    isaPot: projection.pot,
    monthlyIsaPension: projection.monthlyWithdrawal,
  };
}

export function calculateIsaProjectionRows(input: {
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
        isaPot: projection.pot,
        monthlyIsaPension: projection.monthlyWithdrawal,
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
  withdrawalStrategy: PensionSettings["isaWithdrawalStrategy"];
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

function calculateLumpSumsBeforeDate(
  lumpSums: AddedPensionLumpSum[],
  rowDate: string
) {
  return calculateScheduledContributionsBeforeDate({ lumpSums, rowDate });
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
    showPot: input.settings.showIsa,
    currentPot: input.settings.isaCurrentPot,
    monthlyContribution: input.settings.isaMonthlyContribution,
    lumpSums: input.settings.isaLumpSums,
    realInterestPercent: input.settings.isaRealInterestPercent,
    withdrawalStrategy: input.settings.isaWithdrawalStrategy,
    withdrawalPercent: input.settings.isaWithdrawalPercent,
    withdrawalTargetAge: input.settings.isaWithdrawalTargetAge,
    contributionStopDate: getPotContributionStopDate(
      input.settings,
      input.drawDate
    ),
    calculateRegularContributionWithAdditions: ({ amount, contributionDate }) =>
      amount *
      getPartialRetirementSavingsContributionMultiplier(
        input.settings,
        contributionDate
      ),
  });
}
