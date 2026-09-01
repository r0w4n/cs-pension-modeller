import { addYearsToIsoDate } from "../model-date";
import {
  createPartnerCalculationSettings,
  type FlexibleFundAccountId,
  type HouseholdFlexibleFundAccountId,
  type PensionSettings,
} from "../settings";
import type { JointRetirementProjection } from "./joint-retirement-plan";
import { normalizeMoney } from "../money";

export type HouseholdRetirementAssessment = {
  meetsTargetThroughout: boolean;
  targetMissMonths: number;
  firstShortfallDate: string | null;
  firstShortfallAnnualTarget: number;
  firstShortfallAnnualAmount: number;
  largestAnnualShortfall: number;
  totalLifetimeShortfall: number;
  lowestAnnualIncome: number;
  firstRetirementAnnualIncome: number;
  firstRetirementAnnualTarget: number;
  firstRetirementAnnualGap: number;
  fullyRetiredAnnualIncome: number;
  fullyRetiredAnnualTarget: number;
  fullyRetiredAnnualGap: number;
  firstFlexibleFundExhaustionDate: string | null;
  firstFlexibleFundExhaustionAccount: HouseholdFlexibleFundAccountId | null;
  finalFlexibleAssets: number;
};

type HouseholdAccountDefinition = {
  owner: "you" | "partner";
  account: FlexibleFundAccountId;
  enabled: boolean;
  drawAge: number;
  useByAge: number;
  useByStrategy: string;
  dateOfBirth: string;
};

const householdPotKeys: Record<
  FlexibleFundAccountId,
  "isaPot" | "lisaPot" | "sippPot" | "csAvcPot"
> = {
  isa: "isaPot",
  lisa: "lisaPot",
  sipp: "sippPot",
  csAvc: "csAvcPot",
};

// The assessment deliberately mirrors the established single-person
// assessment while retaining the household's calendar-month target and
// separate pots.
export function assessHouseholdRetirementPlan(
  projection: JointRetirementProjection,
  settings: PensionSettings
): HouseholdRetirementAssessment {
  const partnerSettings = createPartnerCalculationSettings(settings);
  const assessedRows = projection.rows.filter((row) => row.target !== null);
  const shortfallRows = assessedRows.filter(
    (row) => row.household.shortfall > 0
  );
  const firstShortfall = shortfallRows[0];
  const firstRetirement = assessedRows[0];
  const fullyRetired =
    assessedRows.find((row) => row.date >= projection.bothRetiredMonth) ??
    assessedRows.at(-1);
  const largestMonthlyShortfall = Math.max(
    0,
    ...shortfallRows.map((row) => row.household.shortfall)
  );
  const finalFlexibleAssets =
    getFlexibleAssets(projection.people.you.rows.at(-1)) +
    getFlexibleAssets(projection.people.partner.rows.at(-1));

  const firstFlexibleFundExhaustion = findFirstFlexibleFundExhaustion(
    projection,
    settings,
    partnerSettings
  );

  return {
    meetsTargetThroughout:
      assessedRows.length > 0 && shortfallRows.length === 0,
    targetMissMonths: shortfallRows.length,
    firstShortfallDate: firstShortfall?.date ?? null,
    firstShortfallAnnualTarget: normalizeMoney(firstShortfall?.target ?? 0),
    firstShortfallAnnualAmount: normalizeMoney(
      (firstShortfall?.household.shortfall ?? 0) * 12
    ),
    largestAnnualShortfall: normalizeMoney(largestMonthlyShortfall * 12),
    totalLifetimeShortfall: normalizeMoney(
      shortfallRows.reduce((total, row) => total + row.household.shortfall, 0)
    ),
    lowestAnnualIncome: normalizeMoney(
      assessedRows.length
        ? Math.min(...assessedRows.map((row) => row.household.netIncome * 12))
        : 0
    ),
    firstRetirementAnnualIncome: normalizeMoney(
      (firstRetirement?.household.netIncome ?? 0) * 12
    ),
    firstRetirementAnnualTarget: normalizeMoney(firstRetirement?.target ?? 0),
    firstRetirementAnnualGap: normalizeMoney(
      (firstRetirement?.household.netIncome ?? 0) * 12 -
        (firstRetirement?.target ?? 0)
    ),
    fullyRetiredAnnualIncome: normalizeMoney(
      (fullyRetired?.household.netIncome ?? 0) * 12
    ),
    fullyRetiredAnnualTarget: normalizeMoney(fullyRetired?.target ?? 0),
    fullyRetiredAnnualGap: normalizeMoney(
      (fullyRetired?.household.netIncome ?? 0) * 12 -
        (fullyRetired?.target ?? 0)
    ),
    firstFlexibleFundExhaustionDate: firstFlexibleFundExhaustion?.date ?? null,
    firstFlexibleFundExhaustionAccount:
      firstFlexibleFundExhaustion?.account ?? null,
    finalFlexibleAssets: normalizeMoney(finalFlexibleAssets),
  };
}

function findFirstFlexibleFundExhaustion(
  projection: JointRetirementProjection,
  settings: PensionSettings,
  partnerSettings: PensionSettings
) {
  const definitions = createAccountDefinitions(settings, partnerSettings);
  const candidates = definitions.flatMap((definition) => {
    const rows = projection.people[definition.owner].rows;
    const drawDate = addYearsToIsoDate(
      definition.dateOfBirth,
      definition.drawAge
    );
    const useByDate = addYearsToIsoDate(
      definition.dateOfBirth,
      definition.useByAge
    );
    const potKey = householdPotKeys[definition.account];
    let hasHeldFunds = false;
    const depletion = rows.find((row) => {
      hasHeldFunds ||= row[potKey] > 0;
      return (
        hasHeldFunds &&
        row.date >= drawDate &&
        row.date <=
          (definition.useByStrategy === "use_by_age"
            ? useByDate
            : "9999-12-31") &&
        row[potKey] <= 0
      );
    });
    return depletion
      ? [
          {
            date: depletion.date,
            account: `${definition.owner}:${definition.account}` as const,
          },
        ]
      : [];
  });

  return candidates.sort((first, second) =>
    first.date.localeCompare(second.date)
  )[0];
}

function getFlexibleAssets(
  row: JointRetirementProjection["people"]["you"]["rows"][number] | undefined
) {
  return row ? row.isaPot + row.lisaPot + row.sippPot + row.csAvcPot : 0;
}

function createAccountDefinitions(
  settings: PensionSettings,
  partner: PensionSettings
): HouseholdAccountDefinition[] {
  return (
    [
      ["you", settings],
      ["partner", partner],
    ] as const
  )
    .flatMap(([owner, person]) => [
      {
        owner,
        account: "isa" as const,
        enabled: person.showIsa,
        drawAge: person.isaDrawAge,
        useByAge: person.isaWithdrawalTargetAge,
        useByStrategy: person.isaWithdrawalStrategy,
        dateOfBirth: person.dateOfBirth,
      },
      {
        owner,
        account: "lisa" as const,
        enabled: person.showLisa,
        drawAge: person.lisaDrawAge,
        useByAge: person.lisaWithdrawalTargetAge,
        useByStrategy: person.lisaWithdrawalStrategy,
        dateOfBirth: person.dateOfBirth,
      },
      {
        owner,
        account: "sipp" as const,
        enabled: person.showSipp,
        drawAge: person.sippDrawAge,
        useByAge: person.sippWithdrawalTargetAge,
        useByStrategy: person.sippWithdrawalStrategy,
        dateOfBirth: person.dateOfBirth,
      },
      {
        owner,
        account: "csAvc" as const,
        enabled: person.showCsAvc,
        drawAge: person.csAvcDrawAge,
        useByAge: person.csAvcWithdrawalTargetAge,
        useByStrategy: person.csAvcWithdrawalStrategy,
        dateOfBirth: person.dateOfBirth,
      },
    ])
    .filter((definition) => definition.enabled);
}
