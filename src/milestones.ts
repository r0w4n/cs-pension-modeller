import {
  getPartialRetirementStartDate,
  type AddedPensionLumpSum,
  type PensionSettings,
} from "./settings";
import { addYears, generateMonthlyDateRange } from "./derive-inputs";

const CALCULATION_START_LABEL = "Calculation start";
const LAST_ABS_STATEMENT_LABEL = "Last ABS";
const STOPS_ALPHA_ACCRUAL_LABEL = "Leave Alpha Pension Scheme";
const STARTS_ALPHA_PENSION_LABEL = "Starts Drawing Alpha Pension";
const STOPS_NUVOS_ACCRUAL_LABEL = "Leave nuvos Pension Scheme";
const STARTS_NUVOS_PENSION_LABEL = "Starts Drawing nuvos Pension";
const STARTS_PREMIUM_PENSION_LABEL = "Starts Drawing Premium Pension";
const STARTS_SIPP_LABEL = "Starts Drawing SIPP";
const STARTS_CS_AVC_LABEL = "Starts Drawing Civil Service AVC";
const STARTS_ISA_LABEL = "Starts Drawing ISA";
const STARTS_LISA_LABEL = "Starts Drawing LISA";
const STARTS_STATE_PENSION_LABEL = "Starts Drawing State Pension";
const STARTS_PARTIAL_RETIREMENT_LABEL = "Starts Partial Retirement";
const LIFE_EXPECTANCY_LABEL = "Life expectancy";
const LUMP_SUM_ADDED_PENSION_LABEL = "Lump Sum Added Pension";
const SIPP_LUMP_SUM_LABEL = "SIPP Lump Sum";
const CS_AVC_LUMP_SUM_LABEL = "Civil Service AVC Lump Sum";
const ISA_LUMP_SUM_LABEL = "ISA Lump Sum";
const LISA_LUMP_SUM_LABEL = "LISA Lump Sum";

export type MilestoneDefinition = {
  date: string;
  label: string;
};

export function generateMilestoneDefinitions(
  startDate: string,
  alphaPensionStopDate: string,
  alphaPensionDrawDate: string,
  sippDrawDate: string,
  isaDrawDate: string,
  statePensionStartDate: string,
  lifeExpectancyDate: string,
  lumpSums: AddedPensionLumpSum[] = [],
  alphaAbsDate?: string,
  sippLumpSums: AddedPensionLumpSum[] = [],
  isaLumpSums: AddedPensionLumpSum[] = [],
  includeStatePension = true,
  nuvosPensionStopDate = "",
  nuvosPensionDrawDate = "",
  nuvosAbsDate = "",
  premiumPensionDrawDate = "",
  partialRetirementStartDate = "",
  lisaDrawDate = "",
  lisaLumpSums: AddedPensionLumpSum[] = [],
  csAvcDrawDate = "",
  csAvcLumpSums: AddedPensionLumpSum[] = []
): MilestoneDefinition[] {
  return [
    ...(alphaAbsDate
      ? [{ date: alphaAbsDate, label: LAST_ABS_STATEMENT_LABEL }]
      : []),
    ...(nuvosAbsDate ? [{ date: nuvosAbsDate, label: "Last nuvos ABS" }] : []),
    { date: startDate, label: CALCULATION_START_LABEL },
    ...(alphaPensionStopDate
      ? [{ date: alphaPensionStopDate, label: STOPS_ALPHA_ACCRUAL_LABEL }]
      : []),
    ...(alphaPensionDrawDate
      ? [{ date: alphaPensionDrawDate, label: STARTS_ALPHA_PENSION_LABEL }]
      : []),
    ...(nuvosPensionStopDate
      ? [{ date: nuvosPensionStopDate, label: STOPS_NUVOS_ACCRUAL_LABEL }]
      : []),
    ...(nuvosPensionDrawDate
      ? [{ date: nuvosPensionDrawDate, label: STARTS_NUVOS_PENSION_LABEL }]
      : []),
    ...(premiumPensionDrawDate
      ? [{ date: premiumPensionDrawDate, label: STARTS_PREMIUM_PENSION_LABEL }]
      : []),
    ...(sippDrawDate ? [{ date: sippDrawDate, label: STARTS_SIPP_LABEL }] : []),
    ...(csAvcDrawDate
      ? [{ date: csAvcDrawDate, label: STARTS_CS_AVC_LABEL }]
      : []),
    ...(isaDrawDate ? [{ date: isaDrawDate, label: STARTS_ISA_LABEL }] : []),
    ...(lisaDrawDate ? [{ date: lisaDrawDate, label: STARTS_LISA_LABEL }] : []),
    ...(includeStatePension
      ? [{ date: statePensionStartDate, label: STARTS_STATE_PENSION_LABEL }]
      : []),
    ...(partialRetirementStartDate
      ? [
          {
            date: partialRetirementStartDate,
            label: STARTS_PARTIAL_RETIREMENT_LABEL,
          },
        ]
      : []),
    { date: lifeExpectancyDate, label: LIFE_EXPECTANCY_LABEL },
    ...generateLumpSumMilestoneDefinitions(lumpSums),
    ...generateSippLumpSumMilestoneDefinitions(sippLumpSums),
    ...generateCsAvcLumpSumMilestoneDefinitions(csAvcLumpSums),
    ...generateIsaLumpSumMilestoneDefinitions(isaLumpSums),
    ...generateLisaLumpSumMilestoneDefinitions(lisaLumpSums),
  ];
}

export function buildMilestoneMap(
  milestones: MilestoneDefinition[],
  startDate: string,
  endDate: string
) {
  return buildMilestoneMapForRowDates(
    milestones,
    generateMonthlyDateRange(startDate, endDate)
  );
}

export function buildMilestoneMapForRowDates(
  milestones: MilestoneDefinition[],
  rows: string[]
) {
  const milestoneMap = new Map<string, string[]>();

  for (const milestone of milestones) {
    const matchingRowDate = rows.find((rowDate) => rowDate >= milestone.date);

    if (!matchingRowDate) {
      continue;
    }

    const existingMilestones = milestoneMap.get(matchingRowDate) ?? [];
    milestoneMap.set(matchingRowDate, [...existingMilestones, milestone.label]);
  }

  return milestoneMap;
}

export function buildMilestoneDateMapForRowDates(
  milestones: MilestoneDefinition[],
  rows: string[]
) {
  const milestoneMap = new Map<string, string[]>();

  for (const milestone of milestones) {
    const matchingRowDate = rows.find((rowDate) => rowDate >= milestone.date);

    if (!matchingRowDate) {
      continue;
    }

    const existingMilestones = milestoneMap.get(matchingRowDate) ?? [];
    milestoneMap.set(matchingRowDate, [...existingMilestones, milestone.date]);
  }

  return milestoneMap;
}

export function buildProjectionMilestoneDefinitions(input: {
  settings: PensionSettings;
  endDate: string;
  accrualStopDate: string;
  drawDate: string;
  sippDrawDate: string;
  csAvcDrawDate: string;
  isaDrawDate: string;
  lisaDrawDate: string;
  alphaAbsDate: string;
  nuvosAccrualStopDate: string;
  nuvosDrawDate: string;
  nuvosAbsDate: string;
  premiumDrawDate: string;
}) {
  const {
    settings,
    endDate,
    accrualStopDate,
    drawDate,
    sippDrawDate,
    csAvcDrawDate,
    isaDrawDate,
    lisaDrawDate,
    alphaAbsDate,
    nuvosAccrualStopDate,
    nuvosDrawDate,
    nuvosAbsDate,
    premiumDrawDate,
  } = input;

  return generateMilestoneDefinitions(
    settings.startDate,
    settings.showAlpha ? accrualStopDate : "",
    settings.showAlpha ? drawDate : "",
    settings.showSipp ? sippDrawDate : "",
    settings.showIsa ? isaDrawDate : "",
    settings.statePensionDrawDate,
    endDate,
    settings.alphaAddedPensionLumpSums,
    alphaAbsDate,
    settings.showSipp ? settings.sippLumpSums : [],
    settings.showIsa ? settings.isaLumpSums : [],
    settings.showStatePension,
    settings.showNuvos ? nuvosAccrualStopDate : "",
    settings.showNuvos ? nuvosDrawDate : "",
    settings.showNuvos ? nuvosAbsDate : "",
    settings.showPremium ? premiumDrawDate : "",
    settings.partialRetirementEnabled
      ? getPartialRetirementStartDate(settings)
      : "",
    settings.showLisa ? lisaDrawDate : "",
    settings.showLisa ? settings.lisaLumpSums : [],
    settings.showCsAvc ? csAvcDrawDate : "",
    settings.showCsAvc ? settings.csAvcLumpSums : []
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

function generateLumpSumMilestoneDefinitions(lumpSums: AddedPensionLumpSum[]) {
  return lumpSums.flatMap((lumpSum) =>
    getScheduledPaymentDates(lumpSum).map((date) => ({
      date,
      label: formatLumpSumMilestoneLabel(lumpSum.amount),
    }))
  );
}

function generateSippLumpSumMilestoneDefinitions(
  lumpSums: AddedPensionLumpSum[]
) {
  return lumpSums.flatMap((lumpSum) =>
    getScheduledPaymentDates(lumpSum).map((date) => ({
      date,
      label: formatSippLumpSumMilestoneLabel(lumpSum.amount),
    }))
  );
}

function generateCsAvcLumpSumMilestoneDefinitions(
  lumpSums: AddedPensionLumpSum[]
) {
  return lumpSums.flatMap((lumpSum) =>
    getScheduledPaymentDates(lumpSum).map((date) => ({
      date,
      label: formatCsAvcLumpSumMilestoneLabel(lumpSum.amount),
    }))
  );
}

function generateIsaLumpSumMilestoneDefinitions(
  lumpSums: AddedPensionLumpSum[]
) {
  return lumpSums.flatMap((lumpSum) =>
    getScheduledPaymentDates(lumpSum).map((date) => ({
      date,
      label: formatIsaLumpSumMilestoneLabel(lumpSum.amount),
    }))
  );
}

function generateLisaLumpSumMilestoneDefinitions(
  lumpSums: AddedPensionLumpSum[]
) {
  return lumpSums.flatMap((lumpSum) =>
    getScheduledPaymentDates(lumpSum).map((date) => ({
      date,
      label: formatLisaLumpSumMilestoneLabel(lumpSum.amount),
    }))
  );
}

function formatLumpSumMilestoneLabel(amount: number) {
  return `${LUMP_SUM_ADDED_PENSION_LABEL} (${formatWholeCurrency(amount)})`;
}

function formatSippLumpSumMilestoneLabel(amount: number) {
  return `${SIPP_LUMP_SUM_LABEL} (${formatWholeCurrency(amount)})`;
}

function formatCsAvcLumpSumMilestoneLabel(amount: number) {
  return `${CS_AVC_LUMP_SUM_LABEL} (${formatWholeCurrency(amount)})`;
}

function formatIsaLumpSumMilestoneLabel(amount: number) {
  return `${ISA_LUMP_SUM_LABEL} (${formatWholeCurrency(amount)})`;
}

function formatLisaLumpSumMilestoneLabel(amount: number) {
  return `${LISA_LUMP_SUM_LABEL} (${formatWholeCurrency(amount)})`;
}

function formatWholeCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}
