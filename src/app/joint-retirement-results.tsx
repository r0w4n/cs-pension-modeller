import { useMemo, useState } from "react";
import type {
  HouseholdProjectionRow,
  JointRetirementProjection,
} from "../calculation/joint-retirement-plan";
import {
  calculateDateAge,
  createPartnerCalculationSettings,
  formatCurrency,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import {
  formatCurrencyDetailed,
  formatDate,
} from "../result-projection/formatting";
import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomeChartEvent,
  RetirementIncomePoint,
  RetirementIncomeChartSeriesDefinition,
} from "../result-projection/retirement-income-chart-model";
import {
  createHouseholdChartEvents,
  createHouseholdChartMilestones,
  describeHouseholdChartEvent,
} from "../result-projection/joint-retirement-chart";
import {
  createRetirementIncomeChartLimits,
  createRetirementIncomeChartParameters,
  createRetirementIncomeSeries,
} from "../result-projection/retirement-income";
import { sourceMeta } from "../result-projection/retirement-income-chart-layout";
import { addYearsToIsoDate } from "../model-date";
import { applyRetirementIncomeChartParameterPatch } from "./chart-state";
import type { SettingsFieldOnChange } from "./form-fields";
import {
  updateSpendingSmilePercentage,
  updateSpendingSmileStartAge,
} from "../spending-smile";
import {
  AssumptionsVersionStrip,
  ResultsSummarySection,
  SummarySection,
  SummaryToggle,
} from "./results-summary";
import { RetirementOutcomeBannerView } from "./comparison-pension-summary";
import type { RetirementOutcomeBanner } from "../app-domains";
import {
  ProjectionDateCell,
  ProjectionTableFrame,
  type TableColumn,
} from "./projection-table";
import { RetirementIncomeChartAdapter } from "./retirement-income-chart-adapter";

type View = "combined" | "you" | "partner";
type PersonView = Exclude<View, "combined">;

type JointTableRow = HouseholdProjectionRow & {
  milestones: string[];
  milestoneDates: string[];
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export function JointRetirementResults({
  projection,
  settings,
  chartParameters,
  chartLimits,
  validationIssues = [],
  onChange,
}: {
  projection: JointRetirementProjection;
  settings: PensionSettings;
  chartParameters: RetirementIncomeChartParameters;
  chartLimits: RetirementIncomeChartLimits;
  validationIssues?: PensionValidationIssue[];
  onChange?: SettingsFieldOnChange;
}) {
  const [view, setView] = useState<View>("combined");
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(true);
  const personBundles = useMemo(
    () => createJointPersonChartBundles(projection, settings),
    [projection, settings]
  );
  const firstShortfall = projection.rows.find(
    (row) => row.household.shortfall > 0
  );
  const maxShortfall = Math.max(
    0,
    ...projection.rows.map((row) => row.household.shortfall)
  );
  const tableRows = useMemo(
    () => createJointTableRows(projection.rows, view),
    [projection.rows, view]
  );
  const visibleTableRows = showMilestonesOnly
    ? tableRows.filter((row) => row.milestones.length > 0)
    : tableRows;
  const combinedSeries = useMemo(
    () => createJointRetirementIncomeSeries(projection, personBundles),
    [personBundles, projection]
  );
  const combinedSeriesDefinitions = useMemo(
    () => createHouseholdSeriesDefinitions(personBundles),
    [personBundles]
  );
  const combinedEvents = useMemo(
    () => createHouseholdChartEvents(settings),
    [settings]
  );
  const combinedMilestones = useMemo(
    () => createHouseholdChartMilestones(settings),
    [settings]
  );
  const combinedChartAccessibilitySummary = useMemo(
    () =>
      createHouseholdChartAccessibilitySummary(
        projection,
        combinedSeries,
        combinedSeriesDefinitions,
        combinedEvents
      ),
    [combinedEvents, combinedSeries, combinedSeriesDefinitions, projection]
  );
  const milestoneRowCount = tableRows.filter(
    (row) => row.milestones.length > 0
  ).length;
  const outcome = buildHouseholdOutcome(projection);
  const hasTransitionTarget =
    projection.firstRetirementMonth !== projection.bothRetiredMonth;
  const summaryItems = [
    {
      label: "Household target starts",
      value: formatDate(projection.firstRetirementMonth),
    },
    {
      label: "Both people retired",
      value: formatDate(projection.bothRetiredMonth),
    },
    ...(hasTransitionTarget
      ? [
          {
            label: "Transition household target",
            value: formatCurrency(
              settings.jointRetirement.transitionDesiredRetirementIncome
            ),
          },
        ]
      : []),
    {
      label: "Fully-retired household target",
      value: formatCurrency(
        settings.jointRetirement.fullyRetiredDesiredRetirementIncome
      ),
    },
    {
      label: "Largest modelled monthly household shortfall",
      value: formatCurrency(maxShortfall),
    },
    {
      label: "First household shortfall",
      value: firstShortfall
        ? formatDate(firstShortfall.date)
        : "No shortfall modelled",
    },
  ];

  return (
    <>
      <ResultsSummarySection>
        <SummarySection
          title="Household retirement income summary"
          headingLevel={2}
          variant="feature"
          description="This planning estimate combines both people’s income after estimating Income Tax separately, then assesses it against the shared household target."
          items={summaryItems}
          footer={
            <>
              <RetirementOutcomeBannerView outcome={outcome} />
              <div className="summary-status-block">
                <h3>How the household assessment works</h3>
                <p>
                  The target belongs to the household. Select You or Partner
                  below to inspect that person’s contribution; their income is
                  not treated as a separate spending target.
                </p>
              </div>
              <div className="summary-status-block">
                <h3>Household planning horizon</h3>
                <p>
                  The household projection runs from the first retirement date
                  to the later planning horizon. Before the first retirement, no
                  household target is assessed.
                </p>
                <dl className="snapshot-list">
                  <div>
                    <dt>First retirement</dt>
                    <dd>{formatDate(projection.firstRetirementMonth)}</dd>
                  </div>
                  <div>
                    <dt>Both retired</dt>
                    <dd>{formatDate(projection.bothRetiredMonth)}</dd>
                  </div>
                  <div>
                    <dt>Household projection ends</dt>
                    <dd>{formatDate(projection.householdEndMonth)}</dd>
                  </div>
                </dl>
              </div>
              <AssumptionsVersionStrip />
            </>
          }
        />
      </ResultsSummarySection>

      <div className="joint-chart-view-selector">
        <SummaryToggle
          ariaLabel="Joint results chart view"
          value={view}
          options={[
            {
              value: "combined",
              label: "Combined",
              ariaLabel: "Combined retirement income",
            },
            { value: "you", label: "You", ariaLabel: "Your retirement income" },
            {
              value: "partner",
              label: "Partner",
              ariaLabel: "Partner retirement income",
            },
          ]}
          onChange={setView}
        />
      </div>

      {view === "combined" ? (
        <RetirementIncomeChartAdapter
          retirementIncomeSeries={combinedSeries}
          retirementIncomeChartParameters={createHouseholdChartParameters(
            chartParameters,
            settings,
            projection
          )}
          retirementIncomeChartLimits={chartLimits}
          alphaLabel="Household gross income"
          chartDescription="Gross household income is shown against the shared household target. Estimated Income Tax is shown with horizontal blue-grey hatching between combined take-home and gross income, and red hatching shows when the household estimate is below its target. The target begins when the first person retires and can change when the second person retires."
          readOnly
          useDataTargets
          timelineMode="calendar"
          seriesDefinitions={combinedSeriesDefinitions}
          periodEvents={combinedEvents}
          staticMilestones={combinedMilestones}
          chartDataAccessibilitySummary={combinedChartAccessibilitySummary}
          presentation="standard"
        />
      ) : (
        <RetirementIncomeChartAdapter
          key={view}
          retirementIncomeSeries={personBundles[view].series}
          retirementIncomeChartParameters={personBundles[view].parameters}
          retirementIncomeChartLimits={personBundles[view].limits}
          validationIssues={validationIssues.filter(
            (issue) =>
              issue.personId === view || issue.field === "jointRetirement"
          )}
          chartDescription={`This is ${view === "you" ? "Your" : "Partner’s"} editable retirement-income chart. The target line is the shared household target; household shortfall is shown in Combined. Estimated Income Tax can appear before ${view === "you" ? "your" : "Partner’s"} retirement where a pension or employment income starts earlier.`}
          showShortfallOverlay={false}
          useDataTargets
          presentation="standard"
          onChangeChartParameters={
            onChange
              ? (patch) =>
                  onChangeJointPersonChartParameters(
                    settings,
                    view,
                    patch,
                    onChange
                  )
              : undefined
          }
          onChangeTargetIncome={
            onChange
              ? (value, age) =>
                  onChangeJointTargetFromPersonChart(
                    settings,
                    view,
                    value,
                    age,
                    onChange
                  )
              : undefined
          }
        />
      )}

      <section className="panel" aria-labelledby="household-projection-title">
        <div className="panel-heading">
          <h2 id="household-projection-title">
            {view === "combined"
              ? "Monthly household income projection table"
              : `Monthly ${view === "you" ? "Your" : "Partner’s"} income projection table`}
          </h2>
          <p className="section-copy">
            {view === "combined"
              ? "Each row keeps both people's income and estimated Income Tax together against the shared household target."
              : `Each row shows ${view === "you" ? "Your" : "Partner’s"} contribution to household income. The shared household target is not split between you.`}
          </p>
        </div>

        <ProjectionTableFrame
          columns={getJointTableColumns(view)}
          rows={visibleTableRows}
          emptyMessage="No household projection rows are available for the current settings."
          getRowKey={(row) => row.date}
          getRowClassName={(row) =>
            row.milestones.length > 0
              ? "projection-row projection-row--milestone"
              : "projection-row"
          }
          getRowTitle={(row) =>
            row.milestones.length > 0 ? row.milestones.join(", ") : undefined
          }
          controls={
            <>
              <button
                type="button"
                className="secondary-button"
                aria-pressed={showMilestonesOnly}
                onClick={() => setShowMilestonesOnly((current) => !current)}
              >
                {showMilestonesOnly
                  ? "Show all rows"
                  : "Only show milestone rows"}
              </button>
              <p className="table-status">
                Showing {visibleTableRows.length} of {tableRows.length} rows
                {showMilestonesOnly ? ` (${milestoneRowCount} milestones)` : ""}
                .
              </p>
              <p className="table-status table-status--basis">
                {settings.projectionBasis === "real"
                  ? "Projection basis: Real terms, today's money"
                  : "Projection basis: Nominal terms, future inflated values"}
              </p>
            </>
          }
          renderCells={(row) => renderJointTableCells(row, view)}
        />
      </section>
    </>
  );
}

type JointPersonChartBundle = {
  settings: PensionSettings;
  series: RetirementIncomePoint[];
  parameters: RetirementIncomeChartParameters;
  limits: RetirementIncomeChartLimits;
};

function createJointPersonChartBundles(
  projection: JointRetirementProjection,
  settings: PensionSettings
): Record<PersonView, JointPersonChartBundle> {
  const partnerSettings = createPartnerCalculationSettings(settings);

  return {
    you: createJointPersonChartBundle(projection, settings, settings, "you"),
    partner: createJointPersonChartBundle(
      projection,
      settings,
      partnerSettings,
      "partner"
    ),
  };
}

function createJointPersonChartBundle(
  projection: JointRetirementProjection,
  householdSettings: PensionSettings,
  personSettings: PensionSettings,
  owner: PersonView
): JointPersonChartBundle {
  const personRows = projection.people[owner].rows;
  const personSeries = createRetirementIncomeSeries(personRows, {
    ...personSettings,
    desiredRetirementIncome: 0,
    spendingStrategyType: "FLAT",
    jointRetirement: {
      ...personSettings.jointRetirement,
      enabled: false,
    },
  });
  const targetByMonth = new Map(
    projection.rows.map((row) => [calendarMonth(row.date), row.target ?? 0])
  );
  const series = personSeries.map((point) => ({
    ...point,
    targetIncomeAnnual: targetByMonth.get(calendarMonth(point.date)) ?? 0,
    shortfallAnnual: 0,
  }));
  const laterRetiree = getLaterRetirementSettings(householdSettings);
  const parameters = createRetirementIncomeChartParameters(personSettings);

  return {
    settings: personSettings,
    series,
    parameters: {
      ...parameters,
      targetIncomeAnnual:
        householdSettings.jointRetirement.fullyRetiredDesiredRetirementIncome,
      spendingSmileEnabled:
        householdSettings.jointRetirement.spendingStrategyType ===
        "SPENDING_SMILE",
      goGoPercentage:
        householdSettings.jointRetirement.spendingSmile.goGoPercentage,
      slowGoStartAge: mapHouseholdAgeToPerson(
        laterRetiree,
        householdSettings.jointRetirement.spendingSmile.slowGoStartAge,
        personSettings
      ),
      slowGoPercentage:
        householdSettings.jointRetirement.spendingSmile.slowGoPercentage,
      noGoStartAge: mapHouseholdAgeToPerson(
        laterRetiree,
        householdSettings.jointRetirement.spendingSmile.noGoStartAge,
        personSettings
      ),
      noGoPercentage:
        householdSettings.jointRetirement.spendingSmile.noGoPercentage,
    },
    limits: createRetirementIncomeChartLimits(personSettings),
  };
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function createHouseholdSeriesDefinitions(
  bundles: Record<PersonView, JointPersonChartBundle>
): RetirementIncomeChartSeriesDefinition[] {
  const definitions: RetirementIncomeChartSeriesDefinition[] = [];
  const sources = [
    ["isaIncomeAnnual", "ISA"],
    ["lisaIncomeAnnual", "LISA"],
    ["sippIncomeAnnual", "SIPP"],
    ["csAvcIncomeAnnual", "Civil Service AVC"],
    ["partialRetirementIncomeAnnual", "employment income"],
    ["alphaIncomeAnnual", "Alpha pension"],
    ["classicIncomeAnnual", "classic pension"],
    ["classicPlusIncomeAnnual", "classic plus pension"],
    ["nuvosIncomeAnnual", "Nuvos pension"],
    ["premiumIncomeAnnual", "Premium pension"],
    ["statePensionIncomeAnnual", "State Pension"],
  ] as const;

  for (const [sourceKey, label] of sources) {
    for (const owner of ["you", "partner"] as const) {
      const person = bundles[owner].settings;
      const enabled =
        sourceKey === "partialRetirementIncomeAnnual"
          ? bundles[owner].series.some(
              (point) => point.partialRetirementIncomeAnnual > 0
            )
          : sourceKey === "isaIncomeAnnual"
            ? person.showIsa
            : sourceKey === "lisaIncomeAnnual"
              ? person.showLisa
              : sourceKey === "sippIncomeAnnual"
                ? person.showSipp
                : sourceKey === "csAvcIncomeAnnual"
                  ? person.showCsAvc
                  : sourceKey === "alphaIncomeAnnual"
                    ? person.showAlpha
                    : sourceKey === "classicIncomeAnnual"
                      ? person.showClassic
                      : sourceKey === "classicPlusIncomeAnnual"
                        ? person.showClassicPlus
                        : sourceKey === "nuvosIncomeAnnual"
                          ? person.showNuvos
                          : sourceKey === "premiumIncomeAnnual"
                            ? person.showPremium
                            : person.showStatePension;
      if (!enabled) {
        continue;
      }
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
  const sourceKeys = [
    "isaIncomeAnnual",
    "lisaIncomeAnnual",
    "sippIncomeAnnual",
    "csAvcIncomeAnnual",
    "partialRetirementIncomeAnnual",
    "alphaIncomeAnnual",
    "classicIncomeAnnual",
    "classicPlusIncomeAnnual",
    "nuvosIncomeAnnual",
    "premiumIncomeAnnual",
    "statePensionIncomeAnnual",
  ] as const;
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
    const incomeSeries = sourceKeys.flatMap((sourceKey) =>
      (["you", "partner"] as const).flatMap((owner) => {
        const point = personPoints[owner].get(calendarMonth(row.date));
        const amount = point?.[sourceKey] ?? 0;
        const isEmployment = sourceKey === "partialRetirementIncomeAnnual";
        if (isEmployment && row.date < projection.firstRetirementMonth) {
          return [];
        }
        return [
          {
            key: `${owner}-${sourceKey}`,
            annualAmount: amount,
          },
        ];
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
  events: RetirementIncomeChartEvent[]
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

function onChangeJointPersonChartParameters(
  settings: PensionSettings,
  owner: PersonView,
  patch: Partial<RetirementIncomeChartParameters>,
  onChange: SettingsFieldOnChange
) {
  const currentPerson =
    owner === "you" ? settings : createPartnerCalculationSettings(settings);
  const personPatch = selectPersonChartPatch(patch);
  if (Object.keys(personPatch).length > 0) {
    const nextPerson = applyRetirementIncomeChartParameterPatch(
      currentPerson,
      personPatch
    );
    const changedPersonSettings = selectChangedPersonSettings(
      currentPerson,
      nextPerson
    );
    if (owner === "you") {
      (
        Object.keys(changedPersonSettings) as Array<keyof PensionSettings>
      ).forEach((key) => onChange(key, nextPerson[key]));
    } else if (settings.partner) {
      onChange("partner", {
        ...settings.partner,
        ...changedPersonSettings,
      });
    }
  }

  const later = getLaterRetirementSettings(settings);
  const nextSmile = { ...settings.jointRetirement.spendingSmile };
  const selected = currentPerson;
  (["goGoPercentage", "slowGoPercentage", "noGoPercentage"] as const).forEach(
    (key) => {
      if (patch[key] !== undefined) {
        Object.assign(
          nextSmile,
          updateSpendingSmilePercentage(nextSmile, key, patch[key])
        );
      }
    }
  );
  (["slowGoStartAge", "noGoStartAge"] as const).forEach((key) => {
    if (patch[key] === undefined) {
      return;
    }
    const selectedDate = addYearsToIsoDate(selected.dateOfBirth, patch[key]);
    const householdAge = calculateDateAge(later.dateOfBirth, selectedDate);
    Object.assign(
      nextSmile,
      updateSpendingSmileStartAge(
        nextSmile,
        key,
        householdAge,
        later.requirementAge,
        later.lifeExpectancy
      )
    );
  });
  if (
    JSON.stringify(nextSmile) !==
    JSON.stringify(settings.jointRetirement.spendingSmile)
  ) {
    onChange("jointRetirement", {
      ...settings.jointRetirement,
      spendingSmile: nextSmile,
    });
  }
}

const chartPersonSettingKeys = [
  "requirementAge",
  "alphaPensionLeaveAge",
  "alphaPensionDrawAge",
  "alphaAddedPensionMonthly",
  "sippDrawAge",
  "sippWithdrawalTargetAge",
  "sippMonthlyContribution",
  "isaDrawAge",
  "isaWithdrawalTargetAge",
  "isaMonthlyContribution",
  "lisaDrawAge",
  "lisaWithdrawalTargetAge",
  "lisaMonthlyContribution",
  "csAvcDrawAge",
  "csAvcWithdrawalTargetAge",
  "csAvcMonthlyContribution",
  "nuvosPensionDrawAge",
  "premiumDrawAge",
  "statePensionDrawDate",
  "partialRetirementStartAge",
  "partialRetirementWorkPercent",
  "partialRetirementEnabled",
  "showAlpha",
  "showClassic",
  "showClassicPlus",
  "showCsAvc",
  "showIsa",
  "showLisa",
  "showSipp",
  "showNuvos",
  "showPremium",
  "showStatePension",
] as const satisfies readonly (keyof PensionSettings)[];

function selectChangedPersonSettings(
  current: PensionSettings,
  next: PensionSettings
): Partial<PensionSettings> {
  const changed: Partial<PensionSettings> = {};
  for (const key of chartPersonSettingKeys) {
    if (current[key] !== next[key]) {
      Object.assign(changed, { [key]: next[key] });
    }
  }
  return changed;
}

function selectPersonChartPatch(
  patch: Partial<RetirementIncomeChartParameters>
) {
  const result = { ...patch };
  for (const key of [
    "targetIncomeAnnual",
    "goGoPercentage",
    "slowGoStartAge",
    "slowGoPercentage",
    "noGoStartAge",
    "noGoPercentage",
  ] as const) {
    delete result[key];
  }
  return result;
}

function onChangeJointTargetFromPersonChart(
  settings: PensionSettings,
  owner: PersonView,
  value: number,
  age: number | undefined,
  onChange: SettingsFieldOnChange
) {
  const person =
    owner === "you"
      ? settings
      : (createPartnerCalculationSettings(settings) as PensionSettings);
  const targetDate =
    age === undefined
      ? "9999-12-01"
      : addYearsToIsoDate(person.dateOfBirth, age);
  const later = getLaterRetirementSettings(settings);
  const key =
    calendarMonth(targetDate) <
    calendarMonth(addYearsToIsoDate(later.dateOfBirth, later.requirementAge))
      ? "transitionDesiredRetirementIncome"
      : "fullyRetiredDesiredRetirementIncome";
  onChange("jointRetirement", {
    ...settings.jointRetirement,
    [key]: value,
  });
}

function getLaterRetirementSettings(settings: PensionSettings) {
  const partner = createPartnerCalculationSettings(settings);
  const youDate = calendarMonth(
    addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge)
  );
  const partnerDate = calendarMonth(
    addYearsToIsoDate(partner.dateOfBirth, partner.requirementAge)
  );
  return partnerDate >= youDate ? partner : settings;
}

function mapHouseholdAgeToPerson(
  laterRetiree: PensionSettings,
  age: number,
  person: PensionSettings
) {
  const date = addYearsToIsoDate(laterRetiree.dateOfBirth, age);
  return calculateDateAge(person.dateOfBirth, date);
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

function getJointTableColumns(view: View): TableColumn[] {
  return view === "combined"
    ? [
        { key: "date", label: "Date", width: "7rem" },
        {
          key: "target",
          label: "Monthly household target",
          width: "10rem",
        },
        { key: "gross", label: "Monthly gross income", width: "10rem" },
        {
          key: "tax",
          label: "Estimated monthly Income Tax",
          width: "10rem",
        },
        { key: "net", label: "Monthly net income", width: "10rem" },
        { key: "shortfall", label: "Monthly shortfall", width: "9rem" },
      ]
    : [
        { key: "date", label: "Date", width: "7rem" },
        { key: "gross", label: "Monthly gross income", width: "10rem" },
        {
          key: "tax",
          label: "Estimated monthly Income Tax",
          width: "10rem",
        },
        { key: "net", label: "Monthly net income", width: "10rem" },
        {
          key: "flexible",
          label: "Monthly flexible withdrawals",
          width: "11rem",
        },
      ];
}

function renderJointTableCells(row: JointTableRow, view: View) {
  if (view === "combined") {
    return [
      <ProjectionDateCell
        key={`${row.date}-date`}
        date={row.date}
        milestones={row.milestones}
        milestoneDates={row.milestoneDates}
      />,
      row.target === null
        ? "Not assessed"
        : formatCurrencyDetailed(row.target / 12),
      formatCurrencyDetailed(row.household.grossIncome),
      formatCurrencyDetailed(row.household.estimatedIncomeTax),
      formatCurrencyDetailed(row.household.netIncome),
      formatCurrencyDetailed(row.household.shortfall),
    ];
  }

  const person = view === "you" ? row.people.you : row.people.partner;
  const gross = person?.totalMonthlyIncomeBeforeTax ?? 0;
  const tax = person?.monthlyIncomeTax ?? 0;
  const flexible = person
    ? person.monthlySippPension +
      person.monthlyCsAvcPension +
      person.monthlyIsaPension +
      person.monthlyLisaPension
    : 0;

  return [
    <ProjectionDateCell
      key={`${row.date}-date`}
      date={row.date}
      milestones={row.milestones}
      milestoneDates={row.milestoneDates}
    />,
    formatCurrencyDetailed(gross),
    formatCurrencyDetailed(tax),
    formatCurrencyDetailed(gross - tax),
    formatCurrencyDetailed(flexible),
  ];
}

function createJointTableRows(
  rows: HouseholdProjectionRow[],
  view: View
): JointTableRow[] {
  const rowsForView = rows.filter(
    (row) => view === "combined" || row.people[view] !== null
  );

  return rowsForView.map((row, index) => {
    const previous = rowsForView[index - 1];
    const milestones = getJointRowMilestones(row, previous, view);
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
  view: View
) {
  const personMilestones =
    view === "combined"
      ? [
          ...(row.people.you?.milestones.map(
            (milestone) => `You: ${milestone}`
          ) ?? []),
          ...(row.people.partner?.milestones.map(
            (milestone) => `Partner: ${milestone}`
          ) ?? []),
        ]
      : (row.people[view]?.milestones ?? []);
  const previousTarget = previous?.target;
  const targetBegins = row.target !== null && previousTarget == null;
  const targetChanges =
    row.target !== null &&
    previousTarget !== null &&
    previousTarget !== undefined &&
    Math.abs(row.target - previousTarget) > 0.005;
  const householdMilestones =
    view !== "combined"
      ? []
      : targetBegins
        ? ["Household target begins"]
        : targetChanges
          ? ["Household target changes"]
          : [];

  return [...new Set([...householdMilestones, ...personMilestones])];
}

function buildHouseholdOutcome(
  projection: JointRetirementProjection
): RetirementOutcomeBanner {
  const assessedRows = projection.rows.filter((row) => row.target !== null);
  const firstShortfall = assessedRows.find(
    (row) => row.household.shortfall > 0
  );

  if (firstShortfall) {
    return {
      status: "shortfall",
      label: "Shortfall",
      message: `The household estimate falls below the shared target from ${formatDate(firstShortfall.date)} in the rows shown. Review the assumptions and the household income projection below.`,
    };
  }

  return {
    status: "onTrack",
    label: "Looks workable",
    message:
      "Based on the assumptions entered, the household estimate meets the shared target throughout the assessed rows shown.",
  };
}
