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
import { getProjectionBasisToNominalFactor } from "./tax";

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

  // Reuse the production payment timeline so regular payments and lump sums
  // consume the cash allowance in the same order as the projected balance.
  // Start empty and neutralise investment growth; before the first withdrawal,
  // this balance is the sum of accepted contributions and bonuses only.
  return calculatePotProjectionAtDate({
    settings,
    rowDate: contributionStopDate,
    drawDate,
    endDate: drawDate,
    showPot: true,
    currentPot: 0,
    monthlyContribution: settings.lisaMonthlyContribution,
    lumpSums: settings.lisaLumpSums,
    realInterestPercent:
      settings.projectionBasis === "real" ? settings.inflationRateAnnual : 0,
    withdrawalStrategy: settings.lisaWithdrawalStrategy,
    withdrawalPercent: settings.lisaWithdrawalPercent,
    withdrawalTargetAge: settings.lisaWithdrawalTargetAge,
  }).potBeforeWithdrawal;
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
        settings: input.settings,
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
        settings: input.settings,
        amount,
        contributionDate,
        taxYearContributions,
      }),
  });
}

function calculateLisaContributionWithBonus(input: {
  settings: PensionSettings;
  amount: number;
  contributionDate: string;
  taxYearContributions: LisaTaxYearContributionTracker;
}) {
  const { amount, contributionDate, taxYearContributions } = input;

  if (amount <= 0) {
    return 0;
  }

  const taxYear = getUkTaxYear(contributionDate);
  const basisConversionFactor = getProjectionBasisToNominalFactor(
    input.settings,
    contributionDate
  );
  // The statutory allowance is fixed in cash pounds, including in real-terms
  // projections. Regular payments and lump sums consume the same cash ledger.
  const contributedThisTaxYearNominal = taxYearContributions.get(taxYear) ?? 0;
  const eligibleContributionNominal = Math.min(
    amount * basisConversionFactor,
    Math.max(0, LISA_ANNUAL_ALLOWANCE - contributedThisTaxYearNominal)
  );

  taxYearContributions.set(
    taxYear,
    contributedThisTaxYearNominal + eligibleContributionNominal
  );

  return (
    (eligibleContributionNominal * (1 + LISA_GOVERNMENT_BONUS_RATE)) /
    basisConversionFactor
  );
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
        settings: input.settings,
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
        settings: input.settings,
        amount,
        contributionDate,
        taxYearContributions,
      }),
  });
}
