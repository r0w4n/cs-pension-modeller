import { useCallback, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "../analytics";
import type { RetirementIncomeDisplay } from "../projection";
import type { RetirementIncomePoint } from "../RetirementIncomeBridgeChart";
import {
  buildComparisonStatusItems,
  buildIncomeAgeRangeItems,
  calculateComparisonInsights,
  clonePensionSettings,
  createComparisonResult,
  createComparisonScenarioId,
  getSettingsSignature,
  type ComparisonInsights,
  type ComparisonResult,
  type ComparisonResultCache,
  type ComparisonScenario,
  type IncomeAgeRangeItem,
} from "../app-domains";
import type { PensionSettings, PensionValidationIssue } from "../settings";
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
  hideBridgeFundingSection = false,
}: {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  scenarios: ComparisonScenario[];
  comparisonResultCache?: ComparisonResultCache;
  retirementIncomeSeries?: RetirementIncomePoint[];
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  hideBridgeFundingSection?: boolean;
}) {
  const currentSettingsSignature = useMemo(
    () => getSettingsSignature(settings),
    [settings]
  );
  const currentScenarioIsValid = validationIssues.length === 0;
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
        hideBridgeFundingSection,
      }),
    [
      comparisonResultCache,
      currentResult,
      currentSettingsSignature,
      retirementIncomeDisplay,
      retirementIncomeSeries,
      scenarios,
      settings.taxationEnabled,
      hideBridgeFundingSection,
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
  comparisonResultCache,
  currentResult,
  currentSettingsSignature,
  retirementIncomeDisplay,
  retirementIncomeSeries,
  scenarios,
  taxationEnabled,
  hideBridgeFundingSection = false,
}: {
  comparisonResultCache: ComparisonResultCache | undefined;
  currentResult: ComparisonResult | null;
  currentSettingsSignature: string;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  retirementIncomeSeries?: RetirementIncomePoint[];
  scenarios: ComparisonScenario[];
  taxationEnabled: boolean;
  hideBridgeFundingSection?: boolean;
}): ComparisonPanelData {
  const savedBaseResults = scenarios.map((scenario) =>
    createComparisonResult(scenario, "", comparisonResultCache)
  );
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
      ? buildComparisonStatusItems(activeResult, { hideBridgeFundingSection })
      : [],
    results,
    savedResults,
    incomeAgeRangeItems: buildIncomeAgeRangeSummary(
      activeResult,
      retirementIncomeDisplay,
      taxationEnabled
    ),
  };
}

function buildIncomeAgeRangeSummary(
  activeResult: ComparisonResult | null,
  retirementIncomeDisplay: RetirementIncomeDisplay | undefined,
  taxationEnabled: boolean
) {
  if (!activeResult || !retirementIncomeDisplay) {
    return [] as IncomeAgeRangeItem[];
  }

  return buildIncomeAgeRangeItems(
    activeResult.summary,
    retirementIncomeDisplay,
    taxationEnabled
  );
}
