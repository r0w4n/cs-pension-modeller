import { useCallback, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "../analytics";
import type { RetirementIncomeDisplay } from "../projection";
import type { RetirementIncomePoint } from "../result-projection/retirement-income-chart-model";
import {
  buildComparisonStatusItems,
  calculateComparisonInsights,
  type ComparisonInsights,
} from "../app-domains";
import {
  clonePensionSettings,
  getSettingsSignature,
  type ComparisonResult,
  type ComparisonScenario,
} from "../result-projection/comparison-result";
import {
  buildIncomeAgeRangeItems,
  type IncomeAgeRangeItem,
} from "../result-projection/income-age-ranges";
import type { RetirementPlanResult } from "../calculation/retirement-plan";
import type { PensionSettings, PensionValidationIssue } from "../settings";
import { getCachedComparisonResult } from "./comparison-result-cache";
import type { ComparisonResultCache } from "./comparison-result-cache";
import { createComparisonScenarioId } from "./comparison-storage";
import type { SummaryItem } from "./results-summary";

export const MAX_COMPARISON_SCENARIOS = 5;

export type ComparisonPanelData = {
  activeResult: ComparisonResult | null;
  hasVisibleShortfall: boolean;
  insights: ComparisonInsights;
  resultStatusItems: SummaryItem[];
  results: ComparisonResult[];
  incomeAgeRangeItems: IncomeAgeRangeItem[];
  savedResults: Array<ComparisonResult & { currentMatchesSaved: boolean }>;
};

export function useComparisonState({
  settings,
  validationIssues,
  scenarios,
  comparisonResultCache,
  retirementIncomeSeries,
  retirementIncomeDisplay,
  retirementPlanResult,
}: {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  scenarios: ComparisonScenario[];
  comparisonResultCache?: ComparisonResultCache;
  retirementIncomeSeries?: RetirementIncomePoint[];
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  retirementPlanResult?: RetirementPlanResult;
}) {
  const calculatedSettings = retirementPlanResult?.settings ?? settings;
  const currentSettingsSignature = useMemo(
    () => getSettingsSignature(settings),
    [settings]
  );
  const currentScenarioIsValid = validationIssues.length === 0;
  const currentScenario = useMemo<ComparisonScenario>(
    () => ({
      id: "current-model",
      name: "Current model",
      settings: clonePensionSettings(calculatedSettings),
      createdAt: "",
      updatedAt: "",
    }),
    [calculatedSettings]
  );
  const currentResult = useMemo(
    () =>
      currentScenarioIsValid
        ? getCachedComparisonResult({
            scenario: currentScenario,
            currentSettingsSignature,
            cache: comparisonResultCache,
            precomputedPlan: retirementPlanResult,
          })
        : null,
    [
      comparisonResultCache,
      currentScenario,
      currentScenarioIsValid,
      currentSettingsSignature,
      retirementPlanResult,
    ]
  );
  const savedBaseResults = useMemo(
    () =>
      scenarios.map((scenario) =>
        getCachedComparisonResult({
          scenario,
          currentSettingsSignature: "",
          cache: comparisonResultCache,
        })
      ),
    [comparisonResultCache, scenarios]
  );
  const comparisonPanelData = useMemo(
    () =>
      buildComparisonPanelData({
        currentResult,
        currentSettingsSignature,
        retirementIncomeDisplay,
        retirementIncomeSeries,
        savedBaseResults,
      }),
    [
      currentResult,
      currentSettingsSignature,
      retirementIncomeDisplay,
      retirementIncomeSeries,
      savedBaseResults,
    ]
  );

  return {
    currentScenario,
    currentResult,
    currentSettingsSignature,
    currentScenarioIsValid,
    comparisonPanelData,
  };
}

export function useScenarioActions({
  scenarios,
  settings,
  validationIssues,
  onScenariosChange,
}: {
  scenarios: ComparisonScenario[];
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
}) {
  const [scenarioNameDraft, setScenarioNameDraft] = useState("");
  const currentScenarioIsValid = validationIssues.length === 0;
  const comparisonLimitReached = scenarios.length >= MAX_COMPARISON_SCENARIOS;

  const addCurrentScenario = useCallback(() => {
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
    trackAnalyticsEvent("comparison_scenario_added", {
      scenario_count: scenarios.length + 1,
    });
    setScenarioNameDraft("");
  }, [
    comparisonLimitReached,
    currentScenarioIsValid,
    onScenariosChange,
    scenarioNameDraft,
    scenarios,
    settings,
  ]);

  const renameScenario = useCallback(
    (id: string, name: string) => {
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
    },
    [onScenariosChange, scenarios]
  );

  const removeScenario = useCallback(
    (id: string) => {
      onScenariosChange(scenarios.filter((scenario) => scenario.id !== id));
      trackAnalyticsEvent("comparison_scenario_removed", {
        scenario_count: Math.max(0, scenarios.length - 1),
      });
    },
    [onScenariosChange, scenarios]
  );

  return {
    currentScenarioIsValid,
    comparisonLimitReached,
    scenarioNameDraft,
    setScenarioNameDraft,
    addCurrentScenario,
    renameScenario,
    removeScenario,
  };
}

export function buildComparisonPanelData({
  currentResult,
  currentSettingsSignature,
  retirementIncomeDisplay,
  retirementIncomeSeries,
  savedBaseResults,
}: {
  currentResult: ComparisonResult | null;
  currentSettingsSignature: string;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  retirementIncomeSeries?: RetirementIncomePoint[];
  savedBaseResults: ComparisonResult[];
}): ComparisonPanelData {
  const savedResults = savedBaseResults.map((result) => ({
    ...result,
    currentMatchesSaved:
      getSettingsSignature(result.scenario.settings) ===
      currentSettingsSignature,
  }));
  const matchingSavedResult =
    savedResults.find((result) => result.currentMatchesSaved) ?? null;
  const results = matchingSavedResult
    ? savedResults
    : currentResult
      ? [currentResult, ...savedResults]
      : savedResults;
  const activeResult =
    matchingSavedResult ?? currentResult ?? savedResults[0] ?? null;
  const hasVisibleShortfall =
    retirementIncomeSeries?.some((point) => point.shortfallAnnual > 0) ?? false;

  return {
    activeResult,
    hasVisibleShortfall,
    insights: calculateComparisonInsights(results),
    resultStatusItems: activeResult
      ? buildComparisonStatusItems(activeResult)
      : [],
    results,
    savedResults,
    incomeAgeRangeItems: buildIncomeAgeRangeSummary(
      activeResult,
      retirementIncomeDisplay,
      activeResult?.scenario.settings.retirementIncomeTargetBasis ?? "gross"
    ),
  };
}

function buildIncomeAgeRangeSummary(
  activeResult: ComparisonResult | null,
  retirementIncomeDisplay: RetirementIncomeDisplay | undefined,
  targetBasis: PensionSettings["retirementIncomeTargetBasis"]
) {
  if (!activeResult || !retirementIncomeDisplay) {
    return [] as IncomeAgeRangeItem[];
  }

  return buildIncomeAgeRangeItems(
    activeResult.summary,
    retirementIncomeDisplay,
    targetBasis
  );
}
