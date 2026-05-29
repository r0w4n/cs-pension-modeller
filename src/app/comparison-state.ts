import type { RetirementIncomeDisplay } from "../projection";
import type { RetirementIncomePoint } from "../RetirementIncomeBridgeChart";
import {
  buildComparisonStatusItems,
  buildRetirementIncomeItems,
  calculateComparisonInsights,
  createComparisonResult,
  formatCurrencyDetailed,
  getRetirementIncomeTargetTitle,
  getRetirementIncomeTitle,
  getSettingsSignature,
  type ComparisonInsights,
  type ComparisonResult,
  type ComparisonResultCache,
  type ComparisonScenario,
} from "../app-domains";
import type { SummaryItem } from "./results-summary";

export type ComparisonPanelData = {
  activeResult: ComparisonResult | null;
  hasVisibleShortfall: boolean;
  insights: ComparisonInsights;
  resultStatusItems: SummaryItem[];
  results: ComparisonResult[];
  retirementIncomeItems: SummaryItem[];
  retirementIncomeTarget: string;
  retirementIncomeTargetTitle: string;
  retirementIncomeTitle: string;
  retirementIncomeTotal: string;
  savedResults: Array<ComparisonResult & { currentMatchesSaved: boolean }>;
};

export function buildComparisonPanelData({
  comparisonResultCache,
  currentResult,
  currentSettingsSignature,
  retirementIncomeDisplay,
  retirementIncomeSeries,
  scenarios,
  taxationEnabled,
}: {
  comparisonResultCache: ComparisonResultCache | undefined;
  currentResult: ComparisonResult | null;
  currentSettingsSignature: string;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  retirementIncomeSeries?: RetirementIncomePoint[];
  scenarios: ComparisonScenario[];
  taxationEnabled: boolean;
}): ComparisonPanelData {
  const savedBaseResults = scenarios.map((scenario) =>
    createComparisonResult(scenario, "", comparisonResultCache),
  );
  const savedResults = savedBaseResults.map((result) => ({
    ...result,
    currentMatchesSaved:
      getSettingsSignature(result.scenario.settings) === currentSettingsSignature,
  }));
  const matchingSavedResult = savedResults.find((result) => result.currentMatchesSaved) ?? null;
  const results = matchingSavedResult
    ? savedResults
    : currentResult
      ? [currentResult, ...savedResults]
      : savedResults;
  const activeResult = matchingSavedResult ?? currentResult ?? savedResults[0] ?? null;
  const hasVisibleShortfall =
    retirementIncomeSeries?.some((point) => point.shortfallAnnual > 0) ?? false;

  return {
    activeResult,
    hasVisibleShortfall,
    insights: calculateComparisonInsights(results),
    resultStatusItems: activeResult ? buildComparisonStatusItems(activeResult) : [],
    results,
    savedResults,
    ...buildRetirementIncomeSummary(
      activeResult,
      retirementIncomeDisplay,
      taxationEnabled,
    ),
  };
}

function buildRetirementIncomeSummary(
  activeResult: ComparisonResult | null,
  retirementIncomeDisplay: RetirementIncomeDisplay | undefined,
  taxationEnabled: boolean,
) {
  if (!activeResult || !retirementIncomeDisplay) {
    return {
      retirementIncomeItems: [] as SummaryItem[],
      retirementIncomeTarget: "",
      retirementIncomeTargetTitle: "",
      retirementIncomeTitle: "",
      retirementIncomeTotal: "",
    };
  }

  return {
    retirementIncomeItems: buildRetirementIncomeItems(
      activeResult.summary,
      retirementIncomeDisplay,
    ),
    retirementIncomeTarget: formatCurrencyDetailed(
      retirementIncomeDisplay === "monthly"
        ? activeResult.annualTarget / 12
        : activeResult.annualTarget,
    ),
    retirementIncomeTargetTitle:
      getRetirementIncomeTargetTitle(retirementIncomeDisplay),
    retirementIncomeTitle: getRetirementIncomeTitle(
      taxationEnabled,
      retirementIncomeDisplay,
    ),
    retirementIncomeTotal: formatCurrencyDetailed(
      retirementIncomeDisplay === "monthly"
        ? activeResult.summary.retirementIncome.totalMonthlyIncome
        : activeResult.summary.retirementIncome.totalAnnualIncome,
    ),
  };
}
