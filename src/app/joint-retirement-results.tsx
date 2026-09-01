import { useMemo, useState } from "react";
import type { JointRetirementProjection } from "../calculation/joint-retirement-plan";
import type { RetirementIncomeDisplay } from "../projection";
import type { RetirementOutcomeBanner } from "../app-domains";
import {
  createPartnerIndividualSettings,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import {
  formatCurrencyDetailed,
  formatDate,
  formatShortfallOrSurplus,
} from "../result-projection/formatting";
import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
} from "../result-projection/retirement-income-chart-model";
import {
  projectJointRetirementResults,
  type HouseholdEditableMilestone,
  type HouseholdIncomePeriodItem,
  type HouseholdPersonChartControls,
  type HouseholdResidualFlexibleFundWarning,
  type JointTableRow,
} from "../result-projection/joint-retirement-results";
import { applyRetirementIncomeChartParameterPatch } from "./chart-state";
import { snapToLimit } from "./chart-drag-constraints";
import type { SettingsFieldOnChange } from "./form-fields";
import { RetirementOutcomeBannerView } from "./comparison-pension-summary";
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
import {
  AssumptionsVersionStrip,
  RetirementIncomeDisplayToggle,
  ResultsSummarySection,
  SummarySection,
} from "./results-summary";

type PersonView = "you" | "partner";

export function JointRetirementResults({
  projection,
  settings,
  outcome,
  statusItems,
  chartParameters,
  chartLimits,
  retirementIncomeDisplay = "annual",
  onRetirementIncomeDisplayChange,
  validationIssues = [],
  onChange,
}: {
  projection: JointRetirementProjection;
  settings: PensionSettings;
  outcome: RetirementOutcomeBanner;
  statusItems: Array<{ label: string; value: string }>;
  chartParameters: RetirementIncomeChartParameters;
  chartLimits: RetirementIncomeChartLimits;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  validationIssues?: PensionValidationIssue[];
  onChange?: SettingsFieldOnChange;
}) {
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(true);
  const resultsProjection = useMemo(
    () => projectJointRetirementResults(projection, settings, chartParameters),
    [chartParameters, projection, settings]
  );
  const tableRows = resultsProjection.tableRows;
  const visibleTableRows = showMilestonesOnly
    ? tableRows.filter((row) => row.milestones.length > 0)
    : tableRows;
  const milestoneRowCount = tableRows.filter(
    (row) => row.milestones.length > 0
  ).length;

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
              <HouseholdResidualFlexibleFundWarnings
                warnings={resultsProjection.residualFlexibleFundWarnings}
              />
              <HouseholdIncomePeriodSummary
                items={resultsProjection.incomePeriodItems}
                display={retirementIncomeDisplay}
              />
              <div className="summary-status-block">
                <h3>Plan status</h3>
                <p className="section-copy">
                  This section highlights whether the household estimate appears
                  to meet the shared target and where the assumptions may need
                  attention.
                </p>
                <dl className="snapshot-list">
                  {statusItems.map(({ label, value }) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <AssumptionsVersionStrip />
            </>
          }
        />
      </ResultsSummarySection>

      <RetirementIncomeChartAdapter
        retirementIncomeSeries={resultsProjection.incomeSeries}
        retirementIncomeChartParameters={resultsProjection.chartParameters}
        retirementIncomeChartLimits={chartLimits}
        alphaLabel="Household gross income"
        chartTitle="Household Retirement Plan"
        chartDescription="Gross household income is shown against the shared household target while each source remains attributed to You or Partner. Calendar dates are aligned with separate You and Partner age scales. Estimated Income Tax is calculated separately and shown with horizontal blue-grey hatching; red hatching shows a household shortfall. Dragging a marker updates only its named person and source."
        useDataTargets
        timelineMode="calendar"
        seriesDefinitions={resultsProjection.seriesDefinitions}
        periodEvents={resultsProjection.events}
        staticMilestones={onChange ? [] : resultsProjection.staticMilestones}
        editableMilestones={
          onChange ? resultsProjection.editableMilestones : undefined
        }
        chartDataAccessibilitySummary={resultsProjection.accessibilitySummary}
        presentation="standard"
        readOnly={!onChange}
        showParameterControls={false}
        additionalParameterControls={
          onChange ? (
            <HouseholdChartControls
              controls={resultsProjection.personChartControls}
              settings={settings}
              onChange={onChange}
            />
          ) : undefined
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
                  resultsProjection.editableMilestones,
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

function HouseholdChartControls({
  controls,
  settings,
  onChange,
}: {
  controls: HouseholdPersonChartControls[];
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
}) {
  return (
    <div
      className="household-chart-input-controls"
      role="group"
      aria-label="Household chart contribution controls"
    >
      {controls.map((control) => {
        const parameters = control.parameters;
        return (
          <RetirementIncomeControlGrid
            key={control.owner}
            displayedAlphaMonthlyAddedPension={
              parameters.alphaMonthlyAddedPension
            }
            flexibleAccountWarnings={createFlexibleAccountWarnings(
              new Set(),
              control.residualFlexibleFundInsights
            )}
            hasUnavoidableSurplus={false}
            isaMonthlyContribution={parameters.isaMonthlyContribution}
            lisaMonthlyContribution={parameters.lisaMonthlyContribution}
            limits={control.limits}
            labelPrefix={control.ownerLabel}
            onChangeParameters={(patch) =>
              onChangeJointPersonChartParameters(
                settings,
                control.owner,
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
        );
      })}
    </div>
  );
}

function HouseholdResidualFlexibleFundWarnings({
  warnings,
}: {
  warnings: HouseholdResidualFlexibleFundWarning[];
}) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="summary-status-block" aria-labelledby="over-saving-title">
      <h3 id="over-saving-title">Potential over-saving</h3>
      <p className="section-copy">
        These estimates identify target-based pots that retain contributed
        savings at the named person&apos;s planning horizon. Compare lower
        contributions if that was not intended.
      </p>
      <ul className="section-copy">
        {warnings.map((warning) => (
          <li key={warning.key}>
            <strong>
              {warning.ownerLabel} {warning.accountLabel}:
            </strong>{" "}
            {warning.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

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

function createStandalonePersonSettings(
  settings: PensionSettings
): PensionSettings {
  return {
    ...settings,
    partner: undefined,
    jointRetirement: { ...settings.jointRetirement, enabled: false },
  };
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
