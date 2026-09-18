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

export function calculateSippPotBeforeWithdrawalAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showSipp) {
    return 0;
  }

  return calculatePotProjectionAtDate({
    settings,
    rowDate,
    drawDate,
    endDate:
      input.endDate ?? addYears(settings.dateOfBirth, settings.lifeExpectancy),
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
  }).potBeforeWithdrawal;
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

export function calculateSippProjectionRows(input: {
  settings: PensionSettings;
  rowDates: string[];
  drawDate: string;
  endDate: string;
}) {
  const projections = calculatePotProjectionRows({
    settings: input.settings,
    rowDates: input.rowDates,
    drawDate: input.drawDate,
    endDate: input.endDate,
  });

  return new Map(
    [...projections].map(([date, projection]) => [
      date,
      {
        sippPot: projection.pot,
        monthlySippPension: projection.monthlyWithdrawal,
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
  withdrawalStrategy: PensionSettings["sippWithdrawalStrategy"];
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
  const contributionMultiplier = getSippContributionMultiplier(
    input.settings.sippTaxReliefRate
  );

  return calculateFlexibleFundProjectionRows({
    settings: input.settings,
    rowDates: input.rowDates,
    drawDate: input.drawDate,
    endDate: input.endDate,
    showPot: input.settings.showSipp,
    currentPot: input.settings.sippCurrentPot,
    monthlyContribution: input.settings.sippMonthlyContribution,
    lumpSums: input.settings.sippLumpSums,
    realInterestPercent: input.settings.sippRealInterestPercent,
    withdrawalStrategy: input.settings.sippWithdrawalStrategy,
    withdrawalPercent: input.settings.sippWithdrawalPercent,
    withdrawalTargetAge: input.settings.sippWithdrawalTargetAge,
    contributionStopDate: getPotContributionStopDate(
      input.settings,
      input.drawDate
    ),
    contributionMultiplier,
    calculateRegularContributionWithAdditions: ({ amount, contributionDate }) =>
      amount *
      contributionMultiplier *
      getPartialRetirementSavingsContributionMultiplier(
        input.settings,
        contributionDate
      ),
    calculateLumpSumContributionWithAdditions: ({ amount }) =>
      amount * contributionMultiplier,
  });
}
