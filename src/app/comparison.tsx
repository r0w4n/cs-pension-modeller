import type { ReactNode } from "react";
import {
  type RetirementIncomeDisplay,
  type deriveInflationAssumptions,
} from "../projection";
import type { PensionSettings, PensionValidationIssue } from "../settings";
import type { RetirementPlanResult } from "../calculation/retirement-plan";
import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomePoint,
} from "../result-projection/retirement-income-chart-model";
import { type ComparisonScenario } from "../app-domains";
import type { ComparisonResultCache } from "./comparison-result-cache";
import { DeferredBelowFold } from "./deferred-below-fold";
import { RetirementIncomeChartAdapter } from "./retirement-income-chart-adapter";
import { ComparisonPensionSummary } from "./comparison-pension-summary";
import { ComparisonResults } from "./comparison-results";
import {
  MAX_COMPARISON_SCENARIOS,
  useComparisonState,
  useScenarioActions,
} from "./comparison-state";
import { ScenarioBuilder } from "./scenario-builder";
import {
  InflationBasisPanel,
  RetirementIncomeDisplayToggle,
} from "./results-summary";
import { SavedScenariosSection } from "./saved-scenarios";

export {
  PensionSummarySection,
  SimplePensionDetails,
  SimplePensionSummary,
} from "./comparison-pension-summary";

type ComparisonSectionProps = {
  children: ReactNode;
};

export type ComparisonPanelProps = {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  scenarios: ComparisonScenario[];
  comparisonResultCache?: ComparisonResultCache;
  retirementPlanResult?: RetirementPlanResult;
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (settings: PensionSettings) => void;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  derivedInflationAssumptions?: ReturnType<typeof deriveInflationAssumptions>;
  retirementIncomeSeries?: RetirementIncomePoint[];
  retirementIncomeChartParameters?: RetirementIncomeChartParameters;
  retirementIncomeChartLimits?: RetirementIncomeChartLimits;
  hideInactiveLegendItems?: boolean;
  hideBridgeFundingSection?: boolean;
  hideFlexibleAssetsSection?: boolean;
  showPensionSummary?: boolean;
  onChangeChartParameters?: (
    patch: Partial<RetirementIncomeChartParameters>
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
  retirementPlanResult,
  onScenariosChange,
  onLoadScenario,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  derivedInflationAssumptions,
  retirementIncomeSeries,
  retirementIncomeChartParameters,
  retirementIncomeChartLimits,
  hideInactiveLegendItems,
  hideBridgeFundingSection,
  hideFlexibleAssetsSection,
  showPensionSummary = true,
  onChangeChartParameters,
}: ComparisonPanelProps) {
  const { currentScenarioIsValid, comparisonPanelData } = useComparisonState({
    settings,
    validationIssues,
    scenarios,
    comparisonResultCache,
    retirementPlanResult,
    retirementIncomeSeries,
    retirementIncomeDisplay,
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
    incomeAgeRangeItems,
    savedResults,
  } = comparisonPanelData;

  return (
    <section className="panel comparison-panel" aria-label="Comparison results">
      {showPensionSummary ? (
        <ComparisonPensionSummary
          activeResult={activeResult}
          retirementIncomeDisplay={retirementIncomeDisplay}
          onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
          incomeAgeRangeItems={incomeAgeRangeItems}
          statusItems={resultStatusItems}
        />
      ) : null}

      <div className="comparison-panel-header">
        <div>
          <h2>Comparison</h2>
          <p className="section-copy">
            Compare the key decision metrics across scenarios.
          </p>
        </div>
        {retirementIncomeDisplay && onRetirementIncomeDisplayChange ? (
          <RetirementIncomeDisplayToggle
            value={retirementIncomeDisplay}
            onChange={onRetirementIncomeDisplayChange}
            ariaLabel="Comparison display"
            monthlyAriaLabel="Show monthly comparison values"
            annualAriaLabel="Show annual comparison values"
          />
        ) : null}
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
          retirementIncomeDisplay={retirementIncomeDisplay}
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
        <RetirementIncomeChartAdapter
          retirementIncomeSeries={retirementIncomeSeries}
          retirementIncomeChartParameters={retirementIncomeChartParameters}
          retirementIncomeChartLimits={retirementIncomeChartLimits}
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
