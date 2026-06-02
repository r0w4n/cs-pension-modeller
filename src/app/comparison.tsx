import { useMemo, useState, type ReactNode } from "react";
import {
  type RetirementIncomeDisplay,
  type deriveInflationAssumptions,
} from "../projection";
import type { PensionSettings, PensionValidationIssue } from "../settings";
import type {
  RetirementIncomeBridgeLimits,
  RetirementIncomeBridgeParameters,
  RetirementIncomePoint,
} from "../RetirementIncomeBridgeChart";
import {
  clonePensionSettings,
  createComparisonResult,
  createComparisonScenarioId,
  getSettingsSignature,
  type ComparisonResult,
  type ComparisonResultCache,
  type ComparisonScenario,
} from "../app-domains";
import { ComparisonBridgeChart, DeferredBelowFold } from "./chart";
import { ComparisonResults } from "./comparison-results";
import { buildComparisonPanelData } from "./comparison-state";
import {
  AssumptionsVersionStrip,
  InflationBasisPanel,
  ModellerLimitations,
  RetirementIncomeDisplayToggle,
  RetirementIncomeSummaryFooter,
  SummarySection,
  type SummaryItem,
} from "./results-summary";
import { SavedScenariosSection } from "./saved-scenarios";

type ComparisonSectionProps = {
  children: ReactNode;
};

export type ComparisonPanelProps = {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  scenarios: ComparisonScenario[];
  comparisonResultCache?: ComparisonResultCache;
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (settings: PensionSettings) => void;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  showLimitations?: boolean;
  onToggleLimitations?: () => void;
  derivedInflationAssumptions?: ReturnType<typeof deriveInflationAssumptions>;
  retirementIncomeSeries?: RetirementIncomePoint[];
  bridgeChartParameters?: RetirementIncomeBridgeParameters;
  bridgeChartLimits?: RetirementIncomeBridgeLimits;
  hideInactiveLegendItems?: boolean;
  onChangeChartParameters?: (
    patch: Partial<RetirementIncomeBridgeParameters>
  ) => void;
};

type ComparisonScenarioActions = {
  currentScenarioIsValid: boolean;
  comparisonLimitReached: boolean;
  scenarioNameDraft: string;
  setScenarioNameDraft: (value: string) => void;
  addCurrentScenario: () => void;
};

type PensionSummarySectionProps = {
  activeResult: ComparisonResult | null;
  description: string;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  retirementIncomeItems: SummaryItem[];
  retirementIncomeTitle: string;
  retirementIncomeTotal: string;
  retirementIncomeTargetTitle: string;
  retirementIncomeTarget: string;
  statusItems: SummaryItem[];
  headingLevel?: 2 | 3;
  showLimitations?: boolean;
  onToggleLimitations?: () => void;
};

export function ComparisonSection({ children }: ComparisonSectionProps) {
  return <>{children}</>;
}

export const MAX_COMPARISON_SCENARIOS = 5;

export function ComparisonBuilder({
  scenarioCount,
  actions,
}: {
  scenarioCount: number;
  actions: ComparisonScenarioActions;
}) {
  return (
    <section
      className="comparison-builder"
      aria-labelledby="comparison-builder-title"
    >
      <div>
        <h3 id="comparison-builder-title">Save this result as a scenario</h3>
        <p className="section-copy">
          You can save up to {MAX_COMPARISON_SCENARIOS} scenarios during this
          session.
        </p>
      </div>
      <div className="comparison-add-row">
        <label className="comparison-name-field">
          <span>Scenario name</span>
          <input
            className="text-input"
            type="text"
            value={actions.scenarioNameDraft}
            placeholder={`Scenario ${scenarioCount + 1}`}
            onChange={(event) =>
              actions.setScenarioNameDraft(event.target.value)
            }
          />
        </label>
        <button
          type="button"
          className="primary-button"
          disabled={
            !actions.currentScenarioIsValid || actions.comparisonLimitReached
          }
          onClick={actions.addCurrentScenario}
        >
          Add to comparison
        </button>
      </div>
      {!actions.currentScenarioIsValid ? (
        <p className="table-status">
          Fix the current validation issues before adding a scenario.
        </p>
      ) : null}
      {actions.comparisonLimitReached ? (
        <p className="table-status">
          Comparison limit reached. Remove a scenario before adding another.
        </p>
      ) : null}
    </section>
  );
}

export function ComparisonPanel({
  settings,
  validationIssues,
  scenarios,
  comparisonResultCache,
  onScenariosChange,
  onLoadScenario,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  showLimitations,
  onToggleLimitations,
  derivedInflationAssumptions,
  retirementIncomeSeries,
  bridgeChartParameters,
  bridgeChartLimits,
  hideInactiveLegendItems,
  onChangeChartParameters,
}: ComparisonPanelProps) {
  const [scenarioNameDraft, setScenarioNameDraft] = useState("");
  const currentSettingsSignature = useMemo(
    () => getSettingsSignature(settings),
    [settings]
  );
  const currentScenarioIsValid = validationIssues.length === 0;
  const comparisonLimitReached = scenarios.length >= MAX_COMPARISON_SCENARIOS;
  const currentScenario = useMemo<ComparisonScenario>(
    () => ({
      id: "current-model",
      name: "Current model",
      settings: clonePensionSettings(settings),
      createdAt: "",
      updatedAt: "",
    }),
    [settings]
  );
  const currentResult = useMemo(
    () =>
      currentScenarioIsValid
        ? createComparisonResult(
            currentScenario,
            currentSettingsSignature,
            comparisonResultCache
          )
        : null,
    [
      comparisonResultCache,
      currentScenario,
      currentScenarioIsValid,
      currentSettingsSignature,
    ]
  );
  const comparisonPanelData = useMemo(
    () =>
      buildComparisonPanelData({
        comparisonResultCache,
        currentResult,
        currentSettingsSignature,
        retirementIncomeDisplay,
        retirementIncomeSeries,
        scenarios,
        taxationEnabled: settings.taxationEnabled,
      }),
    [
      comparisonResultCache,
      currentResult,
      currentSettingsSignature,
      retirementIncomeDisplay,
      retirementIncomeSeries,
      scenarios,
      settings.taxationEnabled,
    ]
  );
  const {
    activeResult,
    insights,
    resultStatusItems,
    results,
    retirementIncomeItems,
    retirementIncomeTarget,
    retirementIncomeTargetTitle,
    retirementIncomeTitle,
    retirementIncomeTotal,
    savedResults,
  } = comparisonPanelData;

  function addCurrentScenario() {
    if (!currentScenarioIsValid || comparisonLimitReached) {
      return;
    }

    const scenarioNumber = scenarios.length + 1;
    const now = new Date().toISOString();
    const name = scenarioNameDraft.trim() || `Scenario ${scenarioNumber}`;

    onScenariosChange([
      ...scenarios,
      {
        id: createComparisonScenarioId(),
        name,
        settings: clonePensionSettings(settings),
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setScenarioNameDraft("");
  }

  function renameScenario(id: string, name: string) {
    onScenariosChange(
      scenarios.map((scenario, index) =>
        scenario.id === id
          ? {
              ...scenario,
              name: name.trim() || `Scenario ${index + 1}`,
              updatedAt: new Date().toISOString(),
            }
          : scenario
      )
    );
  }

  function removeScenario(id: string) {
    onScenariosChange(scenarios.filter((scenario) => scenario.id !== id));
  }

  return (
    <section className="panel comparison-panel" aria-label="Comparison results">
      <ComparisonPensionSummary
        activeResult={activeResult}
        retirementIncomeDisplay={retirementIncomeDisplay}
        onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
        retirementIncomeItems={retirementIncomeItems}
        retirementIncomeTitle={retirementIncomeTitle}
        retirementIncomeTotal={retirementIncomeTotal}
        retirementIncomeTargetTitle={retirementIncomeTargetTitle}
        retirementIncomeTarget={retirementIncomeTarget}
        statusItems={resultStatusItems}
        showLimitations={showLimitations}
        onToggleLimitations={onToggleLimitations}
      />

      <DeferredBelowFold
        estimatedHeight={420}
        forceRender={validationIssues.length > 0}
      >
        <ComparisonBridgeChart
          retirementIncomeSeries={retirementIncomeSeries}
          bridgeChartParameters={bridgeChartParameters}
          bridgeChartLimits={bridgeChartLimits}
          hideInactiveLegendItems={hideInactiveLegendItems}
          validationIssues={validationIssues}
          onChangeChartParameters={onChangeChartParameters}
        />
      </DeferredBelowFold>

      <DeferredBelowFold estimatedHeight={180}>
        <ComparisonBuilder
          scenarioCount={scenarios.length}
          actions={{
            currentScenarioIsValid,
            comparisonLimitReached,
            scenarioNameDraft,
            setScenarioNameDraft,
            addCurrentScenario,
          }}
        />
      </DeferredBelowFold>

      <DeferredBelowFold estimatedHeight={420}>
        <ComparisonResults results={results} insights={insights} />
      </DeferredBelowFold>

      <DeferredBelowFold estimatedHeight={260}>
        <SavedScenariosSection
          scenarios={scenarios}
          savedResults={savedResults}
          maxScenarios={MAX_COMPARISON_SCENARIOS}
          onLoadScenario={onLoadScenario}
          renameScenario={renameScenario}
          removeScenario={removeScenario}
        />
      </DeferredBelowFold>

      {derivedInflationAssumptions ? (
        <DeferredBelowFold estimatedHeight={240}>
          <InflationBasisPanel
            settings={settings}
            assumptions={derivedInflationAssumptions}
          />
        </DeferredBelowFold>
      ) : null}
    </section>
  );
}

export function PensionSummarySection({
  activeResult,
  description,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  retirementIncomeItems,
  retirementIncomeTitle,
  retirementIncomeTotal,
  retirementIncomeTargetTitle,
  retirementIncomeTarget,
  statusItems,
  headingLevel = 3,
  showLimitations,
  onToggleLimitations,
}: PensionSummarySectionProps) {
  if (!activeResult || !retirementIncomeDisplay) {
    return null;
  }

  return (
    <SummarySection
      title="Pension Summary"
      headingLevel={headingLevel}
      variant="feature"
      description={description}
      items={retirementIncomeItems}
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
          <RetirementIncomeSummaryFooter
            totalLabel={retirementIncomeTitle}
            totalValue={retirementIncomeTotal}
            targetLabel={retirementIncomeTargetTitle}
            targetValue={retirementIncomeTarget}
          />
          <div className="summary-status-block">
            <h3>Plan status</h3>
            <p className="section-copy">
              This section highlights whether the current plan appears to work,
              where it falls short, and what may need attention.
            </p>
            <dl className="snapshot-list">
              {statusItems.map(({ label, value, infoUrl, infoLinkText }) => (
                <div key={label}>
                  <dt>
                    <span className="field-label-group">
                      <span>{label}</span>
                      {infoUrl ? (
                        <a
                          className="field-info-link"
                          href={infoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {infoLinkText ?? `More about ${label}`}
                        </a>
                      ) : null}
                    </span>
                  </dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {showLimitations !== undefined && onToggleLimitations ? (
            <ModellerLimitations
              showLimitations={showLimitations}
              onToggleLimitations={onToggleLimitations}
            />
          ) : null}
          <AssumptionsVersionStrip />
        </>
      }
    />
  );
}

function ComparisonPensionSummary({
  activeResult,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  retirementIncomeItems,
  retirementIncomeTitle,
  retirementIncomeTotal,
  retirementIncomeTargetTitle,
  retirementIncomeTarget,
  statusItems,
  showLimitations,
  onToggleLimitations,
}: {
  activeResult: ComparisonResult | null;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  retirementIncomeItems: SummaryItem[];
  retirementIncomeTitle: string;
  retirementIncomeTotal: string;
  retirementIncomeTargetTitle: string;
  retirementIncomeTarget: string;
  statusItems: SummaryItem[];
  showLimitations?: boolean;
  onToggleLimitations?: () => void;
}) {
  if (!activeResult || !retirementIncomeDisplay) {
    return null;
  }

  return (
    <PensionSummarySection
      activeResult={activeResult}
      description="This summary uses your current journey assumptions and shows your projected annual income before tax."
      retirementIncomeDisplay={retirementIncomeDisplay}
      onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
      retirementIncomeItems={retirementIncomeItems}
      retirementIncomeTitle={retirementIncomeTitle}
      retirementIncomeTotal={retirementIncomeTotal}
      retirementIncomeTargetTitle={retirementIncomeTargetTitle}
      retirementIncomeTarget={retirementIncomeTarget}
      statusItems={statusItems}
      showLimitations={showLimitations}
      onToggleLimitations={onToggleLimitations}
    />
  );
}
