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
import {
  calculateFlexibleFundProjectionAtDate,
  calculateFlexibleFundProjectionRows,
} from "./flexible-fund-forward-projection";

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

export function calculateLisaPotBeforeWithdrawalAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showLisa) {
    return 0;
  }

  return calculatePotProjectionAtDate({
    settings,
    rowDate,
    drawDate,
    endDate:
      input.endDate ?? addYears(settings.dateOfBirth, settings.lifeExpectancy),
    showPot: settings.showLisa,
    currentPot: settings.lisaCurrentPot,
    monthlyContribution: settings.lisaMonthlyContribution,
    lumpSums: settings.lisaLumpSums,
    realInterestPercent: settings.lisaRealInterestPercent,
    withdrawalStrategy: settings.lisaWithdrawalStrategy,
    withdrawalPercent: settings.lisaWithdrawalPercent,
    withdrawalTargetAge: settings.lisaWithdrawalTargetAge,
  }).potBeforeWithdrawal;
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

export function calculateLisaProjectionRows(input: {
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
        lisaPot: projection.pot,
        monthlyLisaPension: projection.monthlyWithdrawal,
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
  withdrawalStrategy: PensionSettings["lisaWithdrawalStrategy"];
  withdrawalPercent: number;
  withdrawalTargetAge: number;
}) {
  const taxYearContributions: LisaTaxYearContributionTracker = new Map();

  return calculateFlexibleFundProjectionAtDate({
    ...input,
    contributionStopDate: getLisaContributionStopDate(
      input.settings,
      input.drawDate
    ),
    calculateRegularContributionWithAdditions: ({ amount, contributionDate }) =>
      calculateLisaContributionWithBonus({
        amount:
          amount *
          getPartialRetirementSavingsContributionMultiplier(
            input.settings,
            contributionDate
          ),
        contributionDate,
        taxYearContributions,
      }),
    calculateLumpSumContributionWithAdditions: ({ amount, contributionDate }) =>
      calculateLisaContributionWithBonus({
        amount,
        contributionDate,
        taxYearContributions,
      }),
  });
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
}) {
  const taxYearContributions: LisaTaxYearContributionTracker = new Map();

  return calculateFlexibleFundProjectionRows({
    settings: input.settings,
    rowDates: input.rowDates,
    drawDate: input.drawDate,
    endDate: input.endDate,
    showPot: input.settings.showLisa,
    currentPot: input.settings.lisaCurrentPot,
    monthlyContribution: input.settings.lisaMonthlyContribution,
    lumpSums: input.settings.lisaLumpSums,
    realInterestPercent: input.settings.lisaRealInterestPercent,
    withdrawalStrategy: input.settings.lisaWithdrawalStrategy,
    withdrawalPercent: input.settings.lisaWithdrawalPercent,
    withdrawalTargetAge: input.settings.lisaWithdrawalTargetAge,
    contributionStopDate: getLisaContributionStopDate(
      input.settings,
      input.drawDate
    ),
    calculateRegularContributionWithAdditions: ({ amount, contributionDate }) =>
      calculateLisaContributionWithBonus({
        amount:
          amount *
          getPartialRetirementSavingsContributionMultiplier(
            input.settings,
            contributionDate
          ),
        contributionDate,
        taxYearContributions,
      }),
    calculateLumpSumContributionWithAdditions: ({ amount, contributionDate }) =>
      calculateLisaContributionWithBonus({
        amount,
        contributionDate,
        taxYearContributions,
      }),
  });
}
