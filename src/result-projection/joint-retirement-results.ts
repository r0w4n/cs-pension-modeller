import type {
  HouseholdProjectionRow,
  JointRetirementProjection,
} from "../calculation/joint-retirement-plan";
import { addYearsToIsoDate } from "../model-date";
import type { ProjectionRow } from "../projection";
import {
  calculateDateAge,
  createPartnerIndividualSettings,
  type PensionSettings,
  type PersonId,
} from "../settings";
import {
  createHouseholdChartEvents,
  createHouseholdChartMilestones,
  describeHouseholdChartEvent,
} from "./joint-retirement-chart";
import {
  incomeKeys,
  isRetirementIncomeSourceEnabled,
  sourceMeta,
} from "./retirement-income-chart-layout";
import { createRetirementIncomeMilestones } from "./retirement-income-chart-controls";
import type {
  RetirementIncomeChartEditableMilestone,
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomeChartSeriesDefinition,
  RetirementIncomeMilestoneKey,
  RetirementIncomePoint,
} from "./retirement-income-chart-model";
import {
  createRetirementIncomeChartLimits,
  createRetirementIncomeChartParameters,
  createRetirementIncomeSeries,
} from "./retirement-income";
import { formatCurrencyDetailed, formatDate } from "./formatting";
import {
  formatResidualFlexibleFundWarning,
  summarizeFlexibleWithdrawalInsights,
  type ResidualFlexibleFundInsight,
} from "./flexible-withdrawals";

type PersonView = PersonId;

export type JointTableRow = HouseholdProjectionRow & {
  milestones: string[];
  milestoneDates: string[];
};

export type HouseholdIncomePeriodItem = {
  startDate: string;
  endDate: string;
  sources: string;
  annualIncomeAfterTax: number;
  annualTarget: number;
  annualShortfall: number;
  annualSurplus: number;
};

export type HouseholdEditableMilestone =
  RetirementIncomeChartEditableMilestone & {
    parameterKey: RetirementIncomeMilestoneKey;
    ageLimit: RetirementIncomeChartLimits[RetirementIncomeMilestoneKey];
  };

export type HouseholdResidualFlexibleFundWarning = {
  key: string;
  owner: PersonView;
  ownerLabel: "Your" | "Partner";
  accountLabel: string;
  message: string;
};

export type HouseholdPersonChartControls = {
  owner: PersonView;
  ownerLabel: "Your" | "Partner";
  parameters: RetirementIncomeChartParameters;
  limits: RetirementIncomeChartLimits;
  residualFlexibleFundInsights: ResidualFlexibleFundInsight[];
};

type JointPersonChartBundle = {
  settings: PensionSettings;
  rows: ProjectionRow[];
  series: RetirementIncomePoint[];
  parameters: RetirementIncomeChartParameters;
  limits: RetirementIncomeChartLimits;
};

type PersonControlBundle = Pick<
  JointPersonChartBundle,
  "settings" | "parameters" | "limits"
>;

/**
 * Projects the canonical household result into semantic chart and table data.
 * React components render this model and do not recalculate household income.
 */
export function projectJointRetirementResults(
  projection: JointRetirementProjection,
  settings: PensionSettings,
  chartParameters: RetirementIncomeChartParameters
) {
  const personControlBundles = createPersonControlBundles(settings);
  const householdBundles = createHouseholdPersonChartBundles(
    projection,
    settings
  );
  const incomeSeries = createJointRetirementIncomeSeries(
    projection,
    householdBundles
  );
  const seriesDefinitions = createHouseholdSeriesDefinitions(householdBundles);
  const events = createHouseholdChartEvents(settings);
  const personChartControls =
    createHouseholdPersonChartControls(householdBundles);

  return {
    incomeSeries,
    seriesDefinitions,
    events,
    staticMilestones: createHouseholdChartMilestones(settings),
    editableMilestones: createHouseholdEditableMilestones(personControlBundles),
    chartParameters: createHouseholdChartParameters(
      chartParameters,
      settings,
      projection
    ),
    accessibilitySummary: createHouseholdChartAccessibilitySummary(
      projection,
      incomeSeries,
      seriesDefinitions,
      events
    ),
    incomePeriodItems: createHouseholdIncomePeriodItems(
      projection,
      incomeSeries,
      seriesDefinitions,
      settings
    ),
    tableRows: createJointTableRows(projection.rows, projection, settings),
    personChartControls,
    residualFlexibleFundWarnings:
      createHouseholdResidualFlexibleFundWarnings(personChartControls),
  };
}

function createPersonControlBundles(
  settings: PensionSettings
): Record<PersonView, PersonControlBundle> {
  const youSettings = createStandalonePersonSettings(settings);
  const partnerSettings = createPartnerIndividualSettings(settings);

  return {
    you: createPersonControlBundle(youSettings),
    partner: createPersonControlBundle(partnerSettings),
  };
}

function createPersonControlBundle(settings: PensionSettings) {
  return {
    settings,
    parameters: createRetirementIncomeChartParameters(settings),
    limits: createRetirementIncomeChartLimits(settings),
  };
}

function createHouseholdPersonChartBundles(
  projection: JointRetirementProjection,
  settings: PensionSettings
): Record<PersonView, JointPersonChartBundle> {
  const youSettings = createStandalonePersonSettings(settings);
  const partnerSettings = createPartnerIndividualSettings(settings);

  return {
    you: createPersonChartBundle(projection.people.you.rows, youSettings),
    partner: createPersonChartBundle(
      projection.people.partner.rows,
      partnerSettings
    ),
  };
}

function createPersonChartBundle(
  rows: ProjectionRow[],
  personSettings: PensionSettings
): JointPersonChartBundle {
  return {
    settings: personSettings,
    rows,
    series: createRetirementIncomeSeries(
      rows,
      createHouseholdSeriesSettings(personSettings)
    ),
    parameters: createRetirementIncomeChartParameters(personSettings),
    limits: createRetirementIncomeChartLimits(personSettings),
  };
}

function createStandalonePersonSettings(
  settings: PensionSettings
): PensionSettings {
  return {
    ...settings,
    partner: undefined,
    jointRetirement: { ...settings.jointRetirement, enabled: false },
  };
}

function createHouseholdSeriesSettings(
  settings: PensionSettings
): PensionSettings {
  return {
    ...settings,
    desiredRetirementIncome: 0,
    spendingStrategyType: "FLAT",
    flexibleWithdrawalPriority: [],
  };
}

function createHouseholdEditableMilestones(
  bundles: Record<PersonView, PersonControlBundle>
): HouseholdEditableMilestone[] {
  return (["you", "partner"] as const).flatMap((owner) => {
    const bundle = bundles[owner];
    const ownerLabel = owner === "you" ? "You" : "Partner";

    return createRetirementIncomeMilestones(bundle.parameters, true)
      .filter(
        (milestone) => milestone.editable && milestone.sourceType !== "target"
      )
      .map((milestone) => {
        const ageLimit = bundle.limits[milestone.key];
        return {
          key: `${owner}:${milestone.key}`,
          label: `${ownerLabel}: ${milestone.label}`,
          shortLabel: `${owner === "you" ? "P1" : "P2"} ${milestone.shortLabel}`,
          timelineValue: ageToCalendarTimeline(bundle.settings, milestone.age),
          age: milestone.age,
          colour: milestone.colour,
          owner,
          sourceType: milestone.sourceType,
          parameterKey: milestone.key,
          ageLimit,
          limit: {
            min: ageToCalendarTimeline(bundle.settings, ageLimit.min),
            max: ageToCalendarTimeline(bundle.settings, ageLimit.max),
            step: ageLimit.step,
          },
        };
      });
  });
}

function ageToCalendarTimeline(settings: PensionSettings, age: number) {
  return calendarTimelineValue(addYearsToIsoDate(settings.dateOfBirth, age));
}

function createHouseholdSeriesDefinitions(
  bundles: Record<PersonView, JointPersonChartBundle>
): RetirementIncomeChartSeriesDefinition[] {
  const definitions: RetirementIncomeChartSeriesDefinition[] = [];

  for (const sourceKey of incomeKeys) {
    for (const owner of ["you", "partner"] as const) {
      const person = bundles[owner].settings;
      const enabled =
        sourceKey === "partialRetirementIncomeAnnual"
          ? bundles[owner].series.some(
              (point) => point.partialRetirementIncomeAnnual > 0
            )
          : isRetirementIncomeSourceEnabled(sourceKey, {
              showAlpha: person.showAlpha,
              showClassic: person.showClassic,
              showClassicPlus: person.showClassicPlus,
              showCsAvc: person.showCsAvc,
              partialRetirementEnabled: person.partialRetirementEnabled,
              showIsa: person.showIsa,
              showLisa: person.showLisa,
              showNuvos: person.showNuvos,
              showPremium: person.showPremium,
              showSipp: person.showSipp,
              showStatePension: person.showStatePension,
            });
      if (!enabled) {
        continue;
      }
      const label =
        sourceKey === "partialRetirementIncomeAnnual"
          ? "employment income"
          : sourceMeta[sourceKey].label;
      definitions.push({
        key: `${owner}-${sourceKey}`,
        label: `${owner === "you" ? "Your" : "Partner"} ${label}`,
        owner,
        sourceType: sourceKey,
        colour: sourceMeta[sourceKey].colour,
      });
    }
  }

  const additionalIds = new Set<string>();
  for (const owner of ["you", "partner"] as const) {
    for (const point of bundles[owner].series) {
      for (const stream of point.additionalGuaranteedIncomeStreams ?? []) {
        additionalIds.add(`${owner}:${stream.id}:${stream.label}`);
      }
    }
  }
  [...additionalIds].forEach((id, index) => {
    const [owner, streamId, ...labelParts] = id.split(":");
    definitions.push({
      key: `${owner}-additionalGuaranteedIncome-${streamId}`,
      label: `${owner === "you" ? "Your" : "Partner"} ${labelParts.join(":")}`,
      owner: owner === "you" ? "you" : "partner",
      sourceType: "additionalGuaranteedIncome",
      colour: ["#6d7d10", "#9a5b13", "#0f766e", "#7e3af2"][index % 4],
    });
  });

  return definitions;
}

function createJointRetirementIncomeSeries(
  projection: JointRetirementProjection,
  bundles: Record<PersonView, JointPersonChartBundle>
): RetirementIncomePoint[] {
  const personPoints = {
    you: new Map(
      bundles.you.series.map((point) => [calendarMonth(point.date), point])
    ),
    partner: new Map(
      bundles.partner.series.map((point) => [calendarMonth(point.date), point])
    ),
  };

  return projection.rows.map((row) => {
    const grossIncomeAnnual = row.household.grossIncome * 12;
    const netIncomeAnnual = row.household.netIncome * 12;
    const youPoint = personPoints.you.get(calendarMonth(row.date));
    const partnerPoint = personPoints.partner.get(calendarMonth(row.date));
    const incomeSeries = incomeKeys.flatMap((sourceKey) =>
      (["you", "partner"] as const).flatMap((owner) => {
        const point = personPoints[owner].get(calendarMonth(row.date));
        const amount = point?.[sourceKey] ?? 0;
        if (
          sourceKey === "partialRetirementIncomeAnnual" &&
          row.date < projection.firstRetirementMonth
        ) {
          return [];
        }
        return [{ key: `${owner}-${sourceKey}`, annualAmount: amount }];
      })
    );
    for (const owner of ["you", "partner"] as const) {
      const point = personPoints[owner].get(calendarMonth(row.date));
      for (const stream of point?.additionalGuaranteedIncomeStreams ?? []) {
        incomeSeries.push({
          key: `${owner}-additionalGuaranteedIncome-${stream.id}`,
          annualAmount: stream.annualAmount,
        });
      }
    }

    return {
      date: row.date,
      age: calendarTimelineValue(row.date),
      timelineValue: calendarTimelineValue(row.date),
      personAges: {
        you:
          youPoint?.age ??
          calculateDateAge(bundles.you.settings.dateOfBirth, row.date),
        partner:
          partnerPoint?.age ??
          calculateDateAge(bundles.partner.settings.dateOfBirth, row.date),
      },
      targetIncomeAnnual: row.target ?? 0,
      isaIncomeAnnual: 0,
      lisaIncomeAnnual: 0,
      sippIncomeAnnual: 0,
      csAvcIncomeAnnual: 0,
      alphaIncomeAnnual: grossIncomeAnnual,
      classicIncomeAnnual: 0,
      classicPlusIncomeAnnual: 0,
      nuvosIncomeAnnual: 0,
      premiumIncomeAnnual: 0,
      additionalGuaranteedIncomeAnnual: 0,
      partialRetirementIncomeAnnual: 0,
      statePensionIncomeAnnual: 0,
      totalIncomeAnnual: grossIncomeAnnual,
      takeHomeIncomeAnnual: netIncomeAnnual,
      estimatedIncomeTaxAnnual: row.household.estimatedIncomeTax * 12,
      assessedIncomeAnnual: netIncomeAnnual,
      shortfallAnnual: row.target === null ? 0 : row.household.shortfall * 12,
      guaranteedNetIncomeAnnual: netIncomeAnnual,
      unavoidableSurplusAnnual: row.household.surplus * 12,
      avoidableFlexibleSurplusAnnual: 0,
      flexibleWithdrawalInsights: [],
      incomeSeries,
    };
  });
}

function createHouseholdChartAccessibilitySummary(
  projection: JointRetirementProjection,
  points: RetirementIncomePoint[],
  definitions: RetirementIncomeChartSeriesDefinition[],
  events: ReturnType<typeof createHouseholdChartEvents>
) {
  const pointsByMonth = new Map(
    points.map((point) => [calendarMonth(point.date), point])
  );
  const sampleMonths = [
    projection.firstRetirementMonth,
    projection.bothRetiredMonth,
    projection.householdEndMonth,
  ]
    .map(calendarMonth)
    .filter(
      (month, index, months) =>
        months.indexOf(month) === index && pointsByMonth.has(month)
    );
  const samples = sampleMonths.map((month) => {
    const point = pointsByMonth.get(month);
    if (!point) {
      return "";
    }
    const activeSources = definitions
      .map((definition) => {
        const amount = point.incomeSeries?.find(
          (series) => series.key === definition.key
        )?.annualAmount;
        return amount && amount > 0
          ? `${definition.label.replace("Your ", "You — ").replace("Partner ", "Partner — ")} ${formatCurrencyDetailed(amount)} per year`
          : null;
      })
      .filter((source): source is string => source !== null);
    const target =
      point.targetIncomeAnnual > 0
        ? `household target ${formatCurrencyDetailed(point.targetIncomeAnnual)} per year`
        : "no household target assessed";
    const tax = point.estimatedIncomeTaxAnnual ?? 0;
    const takeHome = point.takeHomeIncomeAnnual ?? point.assessedIncomeAnnual;
    const assessment =
      point.shortfallAnnual > 0
        ? `household shortfall ${formatCurrencyDetailed(point.shortfallAnnual)} per year`
        : point.unavoidableSurplusAnnual > 0 ||
            point.avoidableFlexibleSurplusAnnual > 0
          ? `household surplus ${formatCurrencyDetailed(point.unavoidableSurplusAnnual + point.avoidableFlexibleSurplusAnnual)} per year`
          : "no household shortfall or surplus";
    return `${formatDate(point.date)}: ${target}; ${activeSources.length > 0 ? activeSources.join(", ") : "no attributable income"}; household gross income ${formatCurrencyDetailed(point.totalIncomeAnnual)} per year; estimated Income Tax ${formatCurrencyDetailed(tax)} per year; household take-home income ${formatCurrencyDetailed(takeHome)} per year; ${assessment}.`;
  });

  const eventSummary = events.map(describeHouseholdChartEvent).join("; ");
  return `Combined household retirement income uses a calendar-month timeline. ${samples.join(" ")} Household events available through period inspection: ${eventSummary}.`;
}

function createHouseholdIncomePeriodItems(
  projection: JointRetirementProjection,
  points: RetirementIncomePoint[],
  definitions: RetirementIncomeChartSeriesDefinition[],
  settings: PensionSettings
): HouseholdIncomePeriodItem[] {
  const pointsByMonth = new Map(
    points.map((point) => [calendarMonth(point.date), point])
  );
  const records = projection.rows
    .filter((row) => row.target !== null)
    .map((row) => {
      const point = pointsByMonth.get(calendarMonth(row.date));
      const sources = definitions
        .map((definition) => {
          const amount = point?.incomeSeries?.find(
            (series) => series.key === definition.key
          )?.annualAmount;
          return amount && amount > 0 ? definition.label : null;
        })
        .filter((source): source is string => source !== null);

      return {
        row,
        sources:
          sources.length > 0
            ? sources.join(", ")
            : "No household income modelled",
        signature: `${sources.join("|")}|${getHouseholdTargetPhase(
          row.date,
          projection,
          settings
        )}`,
      };
    });

  if (records.length === 0) {
    return [];
  }

  const items: HouseholdIncomePeriodItem[] = [];
  let current = records[0];
  let currentEnd = current;

  for (const next of records.slice(1)) {
    if (next.signature === current.signature) {
      currentEnd = next;
      continue;
    }
    items.push(createHouseholdIncomePeriodItem(current, currentEnd.row.date));
    current = next;
    currentEnd = next;
  }

  items.push(createHouseholdIncomePeriodItem(current, currentEnd.row.date));
  return items;
}

function createHouseholdIncomePeriodItem(
  record: { row: HouseholdProjectionRow; sources: string },
  endDate: string
): HouseholdIncomePeriodItem {
  return {
    startDate: record.row.date,
    endDate,
    sources: record.sources,
    annualIncomeAfterTax: record.row.household.netIncome * 12,
    annualTarget: record.row.target ?? 0,
    annualShortfall: record.row.household.shortfall * 12,
    annualSurplus: record.row.household.surplus * 12,
  };
}

function createHouseholdChartParameters(
  parameters: RetirementIncomeChartParameters,
  settings: PensionSettings,
  projection: JointRetirementProjection
): RetirementIncomeChartParameters {
  return {
    ...parameters,
    targetIncomeAnnual:
      settings.jointRetirement.fullyRetiredDesiredRetirementIncome,
    spendingSmileEnabled: false,
    partialRetirementEnabled: false,
    showAlpha: false,
    showClassic: false,
    showClassicPlus: false,
    showCsAvc: false,
    showIsa: false,
    showLisa: false,
    showSipp: false,
    showNuvos: false,
    showPremium: false,
    showStatePension: false,
    retirementAge: calendarTimelineValue(projection.firstRetirementMonth),
  };
}

function createHouseholdResidualFlexibleFundWarnings(
  controls: HouseholdPersonChartControls[]
): HouseholdResidualFlexibleFundWarning[] {
  return controls.flatMap((control) =>
    control.residualFlexibleFundInsights.map((insight) => ({
      key: `${control.owner}:${insight.accountId}`,
      owner: control.owner,
      ownerLabel: control.ownerLabel,
      accountLabel: insight.label,
      message: formatResidualFlexibleFundWarning(insight),
    }))
  );
}

function createHouseholdPersonChartControls(
  bundles: Record<PersonView, JointPersonChartBundle>
): HouseholdPersonChartControls[] {
  return (["you", "partner"] as const).map((owner) => {
    const bundle = bundles[owner];
    return {
      owner,
      ownerLabel: owner === "you" ? "Your" : "Partner",
      parameters: bundle.parameters,
      limits: bundle.limits,
      residualFlexibleFundInsights: summarizeFlexibleWithdrawalInsights(
        bundle.rows,
        bundle.settings
      ).residualAccounts,
    };
  });
}

function createJointTableRows(
  rows: HouseholdProjectionRow[],
  projection: JointRetirementProjection,
  settings: PensionSettings
): JointTableRow[] {
  return rows.map((row, index) => {
    const previous = rows[index - 1];
    const milestones = getJointRowMilestones(
      row,
      previous,
      projection,
      settings
    );
    const milestoneDates = [
      ...(row.people.you?.milestoneDates ?? []),
      ...(row.people.partner?.milestoneDates ?? []),
    ];

    return {
      ...row,
      milestones,
      milestoneDates: milestoneDates.length > 0 ? milestoneDates : [row.date],
    };
  });
}

function getJointRowMilestones(
  row: HouseholdProjectionRow,
  previous: HouseholdProjectionRow | undefined,
  projection: JointRetirementProjection,
  settings: PensionSettings
) {
  const personMilestones = [
    ...(row.people.you?.milestones.map((milestone) => `You: ${milestone}`) ??
      []),
    ...(row.people.partner?.milestones.map(
      (milestone) => `Partner: ${milestone}`
    ) ?? []),
  ];
  const previousTarget = previous?.target;
  const targetBegins = row.target !== null && previousTarget == null;
  const targetChanges =
    row.target !== null &&
    previous !== undefined &&
    previousTarget !== null &&
    previousTarget !== undefined &&
    getHouseholdTargetPhase(row.date, projection, settings) !==
      getHouseholdTargetPhase(previous.date, projection, settings);
  const householdMilestones = targetBegins
    ? ["Household target begins"]
    : targetChanges
      ? ["Household target changes"]
      : [];

  return [...new Set([...householdMilestones, ...personMilestones])];
}

function getHouseholdTargetPhase(
  date: string,
  projection: JointRetirementProjection,
  settings: PensionSettings
) {
  if (date < projection.bothRetiredMonth) {
    return "transition";
  }

  if (settings.jointRetirement.spendingStrategyType !== "SPENDING_SMILE") {
    return "fully-retired";
  }

  const partner = createPartnerIndividualSettings(settings);
  const yourRetirementMonth = calendarMonth(
    addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge)
  );
  const partnerRetirementMonth = calendarMonth(
    addYearsToIsoDate(partner.dateOfBirth, partner.requirementAge)
  );
  const reference =
    partnerRetirementMonth >= yourRetirementMonth ? partner : settings;
  const smile = settings.jointRetirement.spendingSmile;

  if (
    calendarMonth(date) >=
    calendarMonth(addYearsToIsoDate(reference.dateOfBirth, smile.noGoStartAge))
  ) {
    return "no-go";
  }
  if (
    calendarMonth(date) >=
    calendarMonth(
      addYearsToIsoDate(reference.dateOfBirth, smile.slowGoStartAge)
    )
  ) {
    return "slow-go";
  }

  return "go-go";
}

function calendarMonth(date: string) {
  return date.slice(0, 7);
}

function calendarTimelineValue(date: string) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return year + (month - 1) / 12 + (day - 1) / 365;
}
