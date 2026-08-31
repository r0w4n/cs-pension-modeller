import { useMemo, useState } from "react";
import type {
  HouseholdProjectionRow,
  JointRetirementProjection,
} from "../calculation/joint-retirement-plan";
import type { ProjectionRow, RetirementIncomeDisplay } from "../projection";
import {
  createPartnerIndividualSettings,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import { addYearsToIsoDate } from "../model-date";
import {
  formatCurrencyDetailed,
  formatDate,
  formatShortfallOrSurplus,
} from "../result-projection/formatting";
import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomeChartEvent,
  RetirementIncomeChartEditableMilestone,
  RetirementIncomeMilestoneKey,
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
import { summarizeFlexibleWithdrawalInsights } from "../result-projection/flexible-withdrawals";
import { createRetirementIncomeMilestones } from "../result-projection/retirement-income-chart-controls";
import {
  incomeKeys,
  isRetirementIncomeSourceEnabled,
  sourceMeta,
} from "../result-projection/retirement-income-chart-layout";
import { applyRetirementIncomeChartParameterPatch } from "./chart-state";
import { snapToLimit } from "./chart-drag-constraints";
import type { SettingsFieldOnChange } from "./form-fields";
import {
  AssumptionsVersionStrip,
  RetirementIncomeDisplayToggle,
  ResultsSummarySection,
  SummarySection,
} from "./results-summary";
import { RetirementOutcomeBannerView } from "./comparison-pension-summary";
import type { RetirementOutcomeBanner } from "../app-domains";
import {
  ProjectionDateCell,
  ProjectionTableFrame,
  type TableColumn,
} from "./projection-table";
import { RetirementIncomeChartAdapter } from "./retirement-income-chart-adapter";
import {
  createFlexibleAccountWarnings,
  RetirementIncomeControlGrid,
} from "./retirement-income-chart-controls";

type PersonView = "you" | "partner";

type JointTableRow = HouseholdProjectionRow & {
  milestones: string[];
  milestoneDates: string[];
};

export function JointRetirementResults({
  projection,
  settings,
  chartParameters,
  chartLimits,
  retirementIncomeDisplay = "annual",
  onRetirementIncomeDisplayChange,
  validationIssues = [],
  onChange,
}: {
  projection: JointRetirementProjection;
  settings: PensionSettings;
  chartParameters: RetirementIncomeChartParameters;
  chartLimits: RetirementIncomeChartLimits;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  validationIssues?: PensionValidationIssue[];
  onChange?: SettingsFieldOnChange;
}) {
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(true);
  const personControlBundles = useMemo(
    () => createPersonControlBundles(settings),
    [settings]
  );
  const householdBundles = useMemo(
    () => createHouseholdPersonChartBundles(projection, settings),
    [projection, settings]
  );
  const tableRows = useMemo(
    () => createJointTableRows(projection.rows),
    [projection.rows]
  );
  const visibleTableRows = showMilestonesOnly
    ? tableRows.filter((row) => row.milestones.length > 0)
    : tableRows;
  const combinedSeries = useMemo(
    () => createJointRetirementIncomeSeries(projection, householdBundles),
    [householdBundles, projection]
  );
  const combinedSeriesDefinitions = useMemo(
    () => createHouseholdSeriesDefinitions(householdBundles),
    [householdBundles]
  );
  const incomePeriodItems = useMemo(
    () =>
      createHouseholdIncomePeriodItems(
        projection,
        combinedSeries,
        combinedSeriesDefinitions
      ),
    [combinedSeries, combinedSeriesDefinitions, projection]
  );
  const combinedEvents = useMemo(
    () => createHouseholdChartEvents(settings),
    [settings]
  );
  const combinedMilestones = useMemo(
    () => createHouseholdChartMilestones(settings),
    [settings]
  );
  const editableMilestones = useMemo(
    () => createHouseholdEditableMilestones(personControlBundles),
    [personControlBundles]
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
  return (
    <>
      <ResultsSummarySection>
        <SummarySection
          title="Household retirement income summary"
          headingLevel={2}
          variant="feature"
          description="This planning estimate combines both people’s income after estimating Income Tax separately, then assesses it against the shared household target."
          items={[]}
          controls={
            onRetirementIncomeDisplayChange ? (
              <RetirementIncomeDisplayToggle
                value={retirementIncomeDisplay}
                onChange={onRetirementIncomeDisplayChange}
              />
            ) : undefined
          }
          footer={
            <>
              <RetirementOutcomeBannerView outcome={outcome} />
              <HouseholdIncomePeriodSummary
                items={incomePeriodItems}
                display={retirementIncomeDisplay}
              />
              <div className="summary-status-block">
                <h3>How the household assessment works</h3>
                <p>
                  The Household Retirement Plan keeps each person’s pensions,
                  savings, withdrawals and estimated Income Tax separate while
                  showing how they work together against the shared target.
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
              <div className="summary-status-block">
                <h3>Plan status</h3>
                <p className="section-copy">
                  This section highlights whether the household estimate appears
                  to meet the shared target and where the assumptions may need
                  attention.
                </p>
                <dl className="snapshot-list">
                  {createHouseholdStatusItems(projection, outcome).map(
                    ({ label, value }) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    )
                  )}
                </dl>
              </div>
              <AssumptionsVersionStrip />
            </>
          }
        />
      </ResultsSummarySection>

      <RetirementIncomeChartAdapter
        retirementIncomeSeries={combinedSeries}
        retirementIncomeChartParameters={createHouseholdChartParameters(
          chartParameters,
          settings,
          projection
        )}
        retirementIncomeChartLimits={chartLimits}
        alphaLabel="Household gross income"
        chartTitle="Household Retirement Plan"
        chartDescription="Gross household income is shown against the shared household target while each source remains attributed to You or Partner. Estimated Income Tax is calculated separately and shown with horizontal blue-grey hatching; red hatching shows a household shortfall. Drag controls update only their named person and source. The editing-control key hides handles, never financial data."
        useDataTargets
        timelineMode="calendar"
        seriesDefinitions={combinedSeriesDefinitions}
        periodEvents={combinedEvents}
        staticMilestones={onChange ? [] : combinedMilestones}
        editableMilestones={onChange ? editableMilestones : undefined}
        chartDataAccessibilitySummary={combinedChartAccessibilitySummary}
        presentation="standard"
        showParameterControls={false}
        additionalParameterControls={
          onChange ? (
            <HouseholdContributionControls
              bundles={householdBundles}
              settings={settings}
              onChange={onChange}
            />
          ) : null
        }
        validationIssues={validationIssues}
        onChangeTargetIncome={
          onChange
            ? (value, timelineValue) =>
                onChangeHouseholdTarget(
                  settings,
                  projection,
                  value,
                  timelineValue,
                  onChange
                )
            : undefined
        }
        onChangeEditableMilestone={
          onChange
            ? (key, timelineValue) =>
                onChangeHouseholdMilestone(
                  settings,
                  editableMilestones,
                  key,
                  timelineValue,
                  onChange
                )
            : undefined
        }
      />

      <section className="panel" aria-labelledby="household-projection-title">
        <div className="panel-heading">
          <h2 id="household-projection-title">
            Monthly household income projection table
          </h2>
          <p className="section-copy">
            Each row keeps both people&apos;s income and estimated Income Tax
            together against the shared household target.
          </p>
        </div>

        <ProjectionTableFrame
          columns={getJointTableColumns()}
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
          renderCells={(row) => renderJointTableCells(row)}
        />
      </section>
    </>
  );
}

type HouseholdIncomePeriodItem = {
  startDate: string;
  endDate: string;
  sources: string;
  annualIncomeAfterTax: number;
  annualTarget: number;
  annualShortfall: number;
  annualSurplus: number;
};

function HouseholdIncomePeriodSummary({
  items,
  display,
}: {
  items: HouseholdIncomePeriodItem[];
  display: RetirementIncomeDisplay;
}) {
  if (items.length === 0) {
    return null;
  }

  const divisor = display === "monthly" ? 12 : 1;
  const period = display === "monthly" ? "a month" : "a year";

  return (
    <div className="summary-status-block">
      <h3>Income at different periods</h3>
      <p className="section-copy">
        These periods provide a text version of the important household income
        changes shown in the chart. Dates use the combined calendar timeline.
      </p>
      <div
        className="summary-table-shell"
        aria-label="Household income by period table"
        tabIndex={0}
      >
        <table className="summary-age-range-table">
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Sources</th>
              <th scope="col">Estimated take-home income</th>
              <th scope="col">Household target after estimated tax</th>
              <th scope="col">Difference</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.startDate}-${item.endDate}-${item.sources}`}>
                <th scope="row">
                  {formatDate(item.startDate)} to {formatDate(item.endDate)}
                </th>
                <td>{item.sources}</td>
                <td>
                  {formatCurrencyDetailed(item.annualIncomeAfterTax / divisor)}{" "}
                  {period}
                </td>
                <td>
                  {formatCurrencyDetailed(item.annualTarget / divisor)} {period}
                </td>
                <td>
                  {formatShortfallOrSurplus(
                    item.annualShortfall / divisor,
                    item.annualSurplus / divisor
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function createHouseholdIncomePeriodItems(
  projection: JointRetirementProjection,
  points: RetirementIncomePoint[],
  definitions: RetirementIncomeChartSeriesDefinition[]
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
        signature: `${sources.join("|")}|${row.target}`,
      };
    });

  if (records.length === 0) {
    return [];
  }

  const items: HouseholdIncomePeriodItem[] = [];
  let current = records[0];

  for (const next of records.slice(1)) {
    if (next.signature === current.signature) {
      continue;
    }

    items.push(createHouseholdIncomePeriodItem(current, next.row.date));
    current = next;
  }

  items.push(
    createHouseholdIncomePeriodItem(current, projection.householdEndMonth)
  );
  return items;
}

function createHouseholdIncomePeriodItem(
  record: {
    row: HouseholdProjectionRow;
    sources: string;
  },
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

function createHouseholdStatusItems(
  projection: JointRetirementProjection,
  outcome: RetirementOutcomeBanner
) {
  const assessedRows = projection.rows.filter((row) => row.target !== null);
  const firstShortfall = assessedRows.find(
    (row) => row.household.shortfall > 0
  );
  const largestShortfall = Math.max(
    0,
    ...assessedRows.map((row) => row.household.shortfall)
  );

  return [
    {
      label: "Overall status",
      value: outcome.label,
    },
    {
      label: "Target shortfall",
      value: firstShortfall
        ? `${formatCurrencyDetailed(largestShortfall * 12)} a year at its largest`
        : "Target met throughout assessed periods",
    },
    {
      label: "Main issue",
      value: firstShortfall
        ? `First household shortfall from ${formatDate(firstShortfall.date)}`
        : "No household shortfall modelled",
    },
    {
      label: "Income basis",
      value:
        "After estimated Income Tax, calculated separately for each person; PAYE timing and National Insurance are excluded",
    },
  ];
}

function HouseholdContributionControls({
  bundles,
  settings,
  onChange,
}: {
  bundles: Record<PersonView, JointPersonChartBundle>;
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
}) {
  return (
    <section
      className="household-chart-input-controls"
      aria-label="Household strategy inputs"
    >
      {(["you", "partner"] as const).map((owner) => {
        const bundle = bundles[owner];
        const parameters = bundle.parameters;
        const ownerLabel = owner === "you" ? "Your" : "Partner";
        const residualAccounts = summarizeFlexibleWithdrawalInsights(
          bundle.rows,
          bundle.settings
        ).residualAccounts;
        return (
          <section
            key={owner}
            className="household-chart-person-controls"
            aria-label={`${ownerLabel} household chart controls`}
          >
            <h4>{ownerLabel} inputs</h4>
            <RetirementIncomeControlGrid
              displayedAlphaMonthlyAddedPension={
                parameters.alphaMonthlyAddedPension
              }
              flexibleAccountWarnings={createFlexibleAccountWarnings(
                new Set(),
                residualAccounts
              )}
              hasUnavoidableSurplus={false}
              isaMonthlyContribution={parameters.isaMonthlyContribution}
              lisaMonthlyContribution={parameters.lisaMonthlyContribution}
              limits={bundle.limits}
              labelPrefix={ownerLabel}
              onChangeParameters={(patch) =>
                onChangeJointPersonChartParameters(
                  settings,
                  owner,
                  patch,
                  onChange
                )
              }
              partialRetirementEnabled={parameters.partialRetirementEnabled}
              partialRetirementWorkPercent={
                parameters.partialRetirementWorkPercent
              }
              showAlpha={parameters.showAlpha}
              showIsa={parameters.showIsa}
              showLisa={parameters.showLisa}
              showSipp={parameters.showSipp}
              sippMonthlyContribution={parameters.sippMonthlyContribution}
            />
          </section>
        );
      })}
    </section>
  );
}

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

type HouseholdEditableMilestone = RetirementIncomeChartEditableMilestone & {
  parameterKey: RetirementIncomeMilestoneKey;
  ageLimit: RetirementIncomeChartLimits[RetirementIncomeMilestoneKey];
};

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
    you: createPersonChartBundle(
      projection.people.you.rows,
      youSettings,
      createHouseholdSeriesSettings(youSettings)
    ),
    partner: createPersonChartBundle(
      projection.people.partner.rows,
      partnerSettings,
      createHouseholdSeriesSettings(partnerSettings)
    ),
  };
}

function createPersonChartBundle(
  rows: ProjectionRow[],
  personSettings: PensionSettings,
  seriesSettings: PensionSettings = personSettings
): JointPersonChartBundle {
  return {
    settings: personSettings,
    rows,
    series: createRetirementIncomeSeries(rows, seriesSettings),
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
          // Keep the visible pill label concise while making ownership clear.
          // The full person/source wording remains in the accessible label.
          shortLabel: `${owner === "you" ? "P1" : "P2"} ${milestone.shortLabel}`,
          timelineValue: ageToCalendarTimeline(bundle.settings, milestone.age),
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
    const incomeSeries = incomeKeys.flatMap((sourceKey) =>
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
    owner === "you"
      ? createStandalonePersonSettings(settings)
      : createPartnerIndividualSettings(settings);
  const nextPerson = applyRetirementIncomeChartParameterPatch(
    currentPerson,
    patch
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

function onChangeHouseholdMilestone(
  settings: PensionSettings,
  milestones: HouseholdEditableMilestone[],
  key: string,
  timelineValue: number,
  onChange: SettingsFieldOnChange
) {
  const milestone = milestones.find((candidate) => candidate.key === key);
  if (!milestone) {
    return;
  }

  const age = snapToLimit(
    milestone.ageLimit.min + timelineValue - milestone.limit.min,
    milestone.ageLimit
  );
  onChangeJointPersonChartParameters(
    settings,
    milestone.owner,
    { [milestone.parameterKey]: age },
    onChange
  );
}

function onChangeHouseholdTarget(
  settings: PensionSettings,
  projection: JointRetirementProjection,
  value: number,
  timelineValue: number | undefined,
  onChange: SettingsFieldOnChange
) {
  const bothRetiredTimeline = calendarTimelineValue(
    projection.bothRetiredMonth
  );
  const targetKey =
    timelineValue !== undefined && timelineValue < bothRetiredTimeline
      ? "transitionDesiredRetirementIncome"
      : "fullyRetiredDesiredRetirementIncome";

  onChange("jointRetirement", {
    ...settings.jointRetirement,
    [targetKey]: value,
  });
}

const chartPersonSettingKeys = [
  "desiredRetirementIncome",
  "spendingSmile",
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

function calendarMonth(date: string) {
  return date.slice(0, 7);
}

function calendarTimelineValue(date: string) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return year + (month - 1) / 12 + (day - 1) / 365;
}

function getJointTableColumns(): TableColumn[] {
  return [
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
  ];
}

function renderJointTableCells(row: JointTableRow) {
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

function createJointTableRows(rows: HouseholdProjectionRow[]): JointTableRow[] {
  return rows.map((row, index) => {
    const previous = rows[index - 1];
    const milestones = getJointRowMilestones(row, previous);
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
  previous: HouseholdProjectionRow | undefined
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
    previousTarget !== null &&
    previousTarget !== undefined &&
    Math.abs(row.target - previousTarget) > 0.005;
  const householdMilestones = targetBegins
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
