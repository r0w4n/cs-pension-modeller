import {
  calculateAge,
  calculateAgeMonths,
  type ProjectionRow,
} from "../projection";
import type { PensionSettings } from "../settings";
import { normalizeMoney } from "../money";
import { createRetirementIncomeAssessmentSeries } from "./retirement-income";
import { addYearsToIsoDate } from "./shared";

export type FlexibleFundAssessmentAccount =
  "ISA" | "LISA" | "SIPP" | "Civil Service AVC";

export type RetirementPlanAssessment = {
  assessmentStartDate: string | null;
  assessmentEndDate: string | null;
  assessmentAvailable: boolean;
  meetsTargetThroughout: boolean;
  targetMissMonths: number;
  firstShortfallDate: string | null;
  firstShortfallAge: number | null;
  firstShortfallAnnualTarget: number;
  firstShortfallAnnualAmount: number;
  lastShortfallDate: string | null;
  largestAnnualShortfall: number;
  totalLifetimeShortfall: number;
  lowestAnnualIncome: number;
  retirementAnnualIncome: number;
  retirementAnnualTarget: number;
  retirementAnnualGap: number;
  allSecureIncomeStartDate: string | null;
  allSecureIncomeStartAge: number | null;
  allSecureIncomeStartAgeMonths: number | null;
  allSecureAnnualIncome: number;
  allSecureAnnualSurplus: number;
  planningHorizonSecureAnnualIncome: number;
  planningHorizonSecureAnnualSurplus: number;
  firstFlexibleFundExhaustionDate: string | null;
  firstFlexibleFundExhaustionAge: number | null;
  firstFlexibleFundExhaustionAccount: FlexibleFundAssessmentAccount | null;
};

type AssessmentPoint = ReturnType<
  typeof createRetirementIncomeAssessmentSeries
>[number];

type FlexibleFundDefinition = {
  account: FlexibleFundAssessmentAccount;
  enabled: boolean;
  drawAge: number;
  potKey: "isaPot" | "lisaPot" | "sippPot" | "csAvcPot";
};

export function assessRetirementPlan(
  rows: ProjectionRow[],
  settings: PensionSettings
): RetirementPlanAssessment {
  const assessmentPoints = createRetirementIncomeAssessmentSeries(
    rows,
    settings
  ).filter(
    (point) =>
      point.age >= settings.requirementAge &&
      point.age <= settings.lifeExpectancy
  );
  const retirementPoint = assessmentPoints[0];
  const planningHorizonPoint = assessmentPoints.at(-1);

  return {
    assessmentStartDate: retirementPoint?.date ?? null,
    assessmentEndDate: planningHorizonPoint?.date ?? null,
    assessmentAvailable: assessmentPoints.length > 0,
    ...assessShortfalls(assessmentPoints),
    ...assessRetirementPoint(retirementPoint, settings),
    ...assessSecureIncome(assessmentPoints, settings),
    ...assessFlexibleFundExhaustion(rows, settings),
  };
}

function assessShortfalls(assessmentPoints: AssessmentPoint[]) {
  const shortfallPoints = assessmentPoints.filter(
    (point) => point.shortfallAnnual > 0
  );
  const firstShortfallPoint = shortfallPoints[0];
  const lastShortfallPoint = shortfallPoints.at(-1);

  return {
    meetsTargetThroughout:
      assessmentPoints.length > 0 && shortfallPoints.length === 0,
    targetMissMonths: shortfallPoints.length,
    firstShortfallDate: firstShortfallPoint?.date ?? null,
    firstShortfallAge: firstShortfallPoint?.age ?? null,
    firstShortfallAnnualTarget: normalizeMoney(
      firstShortfallPoint?.targetIncomeAnnual ?? 0
    ),
    firstShortfallAnnualAmount: normalizeMoney(
      firstShortfallPoint?.shortfallAnnual ?? 0
    ),
    lastShortfallDate: lastShortfallPoint?.date ?? null,
    largestAnnualShortfall: normalizeMoney(
      Math.max(0, ...shortfallPoints.map((point) => point.shortfallAnnual))
    ),
    totalLifetimeShortfall: normalizeMoney(
      shortfallPoints.reduce(
        (total, point) => total + point.shortfallAnnual / 12,
        0
      )
    ),
    lowestAnnualIncome: normalizeMoney(
      assessmentPoints.length
        ? Math.min(
            ...assessmentPoints.map((point) => point.assessedIncomeAnnual)
          )
        : 0
    ),
  };
}

function assessRetirementPoint(
  retirementPoint: AssessmentPoint | undefined,
  settings: PensionSettings
) {
  const annualIncome = retirementPoint?.assessedIncomeAnnual ?? 0;
  const annualTarget =
    retirementPoint?.targetIncomeAnnual ?? settings.desiredRetirementIncome;

  return {
    retirementAnnualIncome: normalizeMoney(annualIncome),
    retirementAnnualTarget: normalizeMoney(annualTarget),
    retirementAnnualGap: normalizeMoney(annualIncome - annualTarget),
  };
}

function assessSecureIncome(
  assessmentPoints: AssessmentPoint[],
  settings: PensionSettings
) {
  const planningHorizonPoint = assessmentPoints.at(-1);
  const allSecureIncomeStartDate = getAllSecureIncomeStartDate(settings);
  const allSecureIncomeStartPoint = allSecureIncomeStartDate
    ? assessmentPoints.find((point) => point.date >= allSecureIncomeStartDate)
    : undefined;
  const allSecureAnnualIncome = getSecureAnnualIncome(
    allSecureIncomeStartPoint,
    settings
  );
  const planningHorizonSecureAnnualIncome = getSecureAnnualIncome(
    planningHorizonPoint,
    settings
  );
  const effectiveSecureStartDate = allSecureIncomeStartPoint
    ? allSecureIncomeStartDate
    : null;

  return {
    allSecureIncomeStartDate: effectiveSecureStartDate,
    allSecureIncomeStartAge: effectiveSecureStartDate
      ? calculateAge(settings.dateOfBirth, effectiveSecureStartDate)
      : null,
    allSecureIncomeStartAgeMonths: effectiveSecureStartDate
      ? calculateAgeMonths(settings.dateOfBirth, effectiveSecureStartDate)
      : null,
    allSecureAnnualIncome: normalizeMoney(allSecureAnnualIncome),
    allSecureAnnualSurplus: normalizeMoney(
      allSecureAnnualIncome -
        (allSecureIncomeStartPoint?.targetIncomeAnnual ??
          settings.desiredRetirementIncome)
    ),
    planningHorizonSecureAnnualIncome: normalizeMoney(
      planningHorizonSecureAnnualIncome
    ),
    planningHorizonSecureAnnualSurplus: normalizeMoney(
      planningHorizonSecureAnnualIncome -
        (planningHorizonPoint?.targetIncomeAnnual ??
          settings.desiredRetirementIncome)
    ),
  };
}

function assessFlexibleFundExhaustion(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  const firstFlexibleFundExhaustion = findFirstFlexibleFundExhaustion(
    rows,
    settings
  );

  return {
    firstFlexibleFundExhaustionDate: firstFlexibleFundExhaustion?.date ?? null,
    firstFlexibleFundExhaustionAge: firstFlexibleFundExhaustion?.age ?? null,
    firstFlexibleFundExhaustionAccount:
      firstFlexibleFundExhaustion?.account ?? null,
  };
}

function getAllSecureIncomeStartDate(settings: PensionSettings) {
  const retirementDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.requirementAge
  );
  const planningHorizonDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.lifeExpectancy
  );
  const secureStartDates = [
    ...(settings.showAlpha
      ? [addYearsToIsoDate(settings.dateOfBirth, settings.alphaPensionDrawAge)]
      : []),
    ...(settings.showClassic
      ? [
          addYearsToIsoDate(
            settings.dateOfBirth,
            settings.classicPensionDrawAge
          ),
        ]
      : []),
    ...(settings.showClassicPlus
      ? [
          addYearsToIsoDate(
            settings.dateOfBirth,
            settings.classicPlusPensionDrawAge
          ),
        ]
      : []),
    ...(settings.showNuvos
      ? [addYearsToIsoDate(settings.dateOfBirth, settings.nuvosPensionDrawAge)]
      : []),
    ...(settings.showPremium
      ? [addYearsToIsoDate(settings.dateOfBirth, settings.premiumDrawAge)]
      : []),
    ...(settings.showStatePension ? [settings.statePensionDrawDate] : []),
  ];
  const latestSecureStartDate = secureStartDates.sort().at(-1);

  if (!latestSecureStartDate || latestSecureStartDate > planningHorizonDate) {
    return null;
  }

  return latestSecureStartDate < retirementDate
    ? retirementDate
    : latestSecureStartDate;
}

function getSecureAnnualIncome(
  point: AssessmentPoint | undefined,
  settings: PensionSettings
) {
  if (!point) {
    return 0;
  }

  if (settings.retirementIncomeTargetBasis === "after_tax") {
    return point.guaranteedNetIncomeAnnual;
  }

  return (
    point.alphaIncomeAnnual +
    point.classicIncomeAnnual +
    point.classicPlusIncomeAnnual +
    point.nuvosIncomeAnnual +
    point.premiumIncomeAnnual +
    point.additionalGuaranteedIncomeAnnual +
    point.statePensionIncomeAnnual
  );
}

function findFirstFlexibleFundExhaustion(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  const definitions: FlexibleFundDefinition[] = [
    {
      account: "ISA",
      enabled: settings.showIsa,
      drawAge: settings.isaDrawAge,
      potKey: "isaPot",
    },
    {
      account: "LISA",
      enabled: settings.showLisa,
      drawAge: settings.lisaDrawAge,
      potKey: "lisaPot",
    },
    {
      account: "SIPP",
      enabled: settings.showSipp,
      drawAge: settings.sippDrawAge,
      potKey: "sippPot",
    },
    {
      account: "Civil Service AVC",
      enabled: settings.showCsAvc,
      drawAge: settings.csAvcDrawAge,
      potKey: "csAvcPot",
    },
  ];

  return definitions
    .flatMap((definition) => {
      if (!definition.enabled) {
        return [];
      }

      let hasHeldFunds = false;
      const depletionRow = rows.find((row) => {
        const age = row.age + row.ageMonths / 12;
        hasHeldFunds ||= row[definition.potKey] > 0;

        return (
          hasHeldFunds &&
          age >= definition.drawAge &&
          row[definition.potKey] <= 0
        );
      });

      return depletionRow
        ? [
            {
              account: definition.account,
              date: depletionRow.date,
              age: depletionRow.age + depletionRow.ageMonths / 12,
            },
          ]
        : [];
    })
    .sort((left, right) => left.date.localeCompare(right.date))[0];
}
