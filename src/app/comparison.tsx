import type { ReactNode } from "react";
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
  type ComparisonResultCache,
  type ComparisonScenario,
} from "../app-domains";
import { ComparisonBridgeChart, DeferredBelowFold } from "./chart";
import { ComparisonPensionSummary } from "./comparison-pension-summary";
import { ComparisonResults } from "./comparison-results";
import {
  MAX_COMPARISON_SCENARIOS,
  useComparisonState,
  useScenarioActions,
} from "./comparison-state";
import { ScenarioBuilder } from "./scenario-builder";
import { InflationBasisPanel } from "./results-summary";
import { SavedScenariosSection } from "./saved-scenarios";

export { PensionSummarySection } from "./comparison-pension-summary";

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
  derivedInflationAssumptions?: ReturnType<typeof deriveInflationAssumptions>;
  retirementIncomeSeries?: RetirementIncomePoint[];
  bridgeChartParameters?: RetirementIncomeBridgeParameters;
  bridgeChartLimits?: RetirementIncomeBridgeLimits;
  hideInactiveLegendItems?: boolean;
  hideBridgeFundingSection?: boolean;
  hideFlexibleAssetsSection?: boolean;
  onChangeChartParameters?: (
    patch: Partial<RetirementIncomeBridgeParameters>
  ) => void;
};

export function ComparisonSection({ children }: ComparisonSectionProps) {
  return <>{children}</>;
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
  derivedInflationAssumptions,
  retirementIncomeSeries,
  bridgeChartParameters,
  bridgeChartLimits,
  hideInactiveLegendItems,
  hideBridgeFundingSection,
  hideFlexibleAssetsSection,
  onChangeChartParameters,
}: ComparisonPanelProps) {
  const { currentScenarioIsValid, comparisonPanelData } = useComparisonState({
    settings,
    validationIssues,
    scenarios,
    comparisonResultCache,
    retirementIncomeSeries,
    retirementIncomeDisplay,
    hideBridgeFundingSection,
  });
  const scenarioActions = useScenarioActions({
    scenarios,
    settings,
    validationIssues,
    onScenariosChange,
  });
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
      />

      <div className="comparison-panel-header">
        <h2>Comparison</h2>
        <p className="section-copy">
          Compare the key decision metrics across scenarios.
        </p>
      </div>

      <DeferredBelowFold estimatedHeight={180}>
        <ScenarioBuilder
          scenarioCount={scenarios.length}
          isValid={currentScenarioIsValid}
          limitReached={scenarioActions.comparisonLimitReached}
          nameValue={scenarioActions.scenarioNameDraft}
          onNameChange={scenarioActions.setScenarioNameDraft}
          onAdd={scenarioActions.addCurrentScenario}
        />
      </DeferredBelowFold>

      <DeferredBelowFold estimatedHeight={860}>
        <ComparisonResults
          results={results}
          insights={insights}
          hideBridgeFundingSection={hideBridgeFundingSection}
          hideFlexibleAssetsSection={hideFlexibleAssetsSection}
        />
      </DeferredBelowFold>

      <DeferredBelowFold estimatedHeight={260}>
        <SavedScenariosSection
          scenarios={scenarios}
          savedResults={savedResults}
          maxScenarios={MAX_COMPARISON_SCENARIOS}
          onLoadScenario={onLoadScenario}
          renameScenario={scenarioActions.renameScenario}
          removeScenario={scenarioActions.removeScenario}
        />
      </DeferredBelowFold>

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
