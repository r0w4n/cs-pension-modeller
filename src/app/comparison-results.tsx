import {
  formatCapitalPreservation,
  formatCurrencyDetailed,
  formatDecimalAge,
  formatTargetMissDuration,
  type ComparisonInsights,
  type ComparisonResult,
} from "../app-domains";
import type { RetirementIncomeDisplay } from "../projection";
import { ComparisonSummaryTable } from "./comparison-summary-table";
import { SummarySection } from "./results-summary";

export function ComparisonResults({
  results,
  insights,
  retirementIncomeDisplay = "annual",
  hideBridgeFundingSection = false,
  hideFlexibleAssetsSection = false,
}: {
  results: ComparisonResult[];
  insights: ComparisonInsights;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  hideBridgeFundingSection?: boolean;
  hideFlexibleAssetsSection?: boolean;
}) {
  if (results.length === 0) {
    return (
      <section className="summary-section summary-section--compact">
        <div className="summary-section-header">
          <h3>Cannot calculate</h3>
        </div>
        <p className="section-copy">
          Fix the current validation issues to populate the result and
          comparison view.
        </p>
      </section>
    );
  }

  return (
    <>
      {results.length >= 2 ? (
        <ComparisonInsightsGrid
          insights={insights}
          retirementIncomeDisplay={retirementIncomeDisplay}
        />
      ) : null}
      <ComparisonSummaryTable
        results={results}
        retirementIncomeDisplay={retirementIncomeDisplay}
        hideBridgeFundingSection={hideBridgeFundingSection}
        hideFlexibleAssetsSection={hideFlexibleAssetsSection}
      />
    </>
  );
}

function ComparisonInsightsGrid({
  insights,
  retirementIncomeDisplay,
}: {
  insights: ComparisonInsights;
  retirementIncomeDisplay: RetirementIncomeDisplay;
}) {
  return (
    <div className="comparison-insight-grid">
      <SummarySection
        title="Earliest retirement"
        items={[
          {
            label:
              insights.earliestRetirementResult?.scenario.name ??
              "Not available",
            value: insights.earliestRetirementResult
              ? formatDecimalAge(
                  insights.earliestRetirementResult.scenario.settings
                    .requirementAge
                )
              : "Not available",
          },
        ]}
      />
      <SummarySection
        title="Best maintains target"
        items={[
          {
            label: insights.bestTargetResult?.scenario.name ?? "Not available",
            value: insights.bestTargetResult
              ? formatTargetMissDuration(
                  insights.bestTargetResult.targetMissMonths
                )
              : "Not available",
          },
        ]}
      />
      <SummarySection
        title="Lowest shortfall risk"
        items={[
          {
            label:
              insights.lowestShortfallRiskResult?.scenario.name ??
              "Not available",
            value: insights.lowestShortfallRiskResult
              ? formatRecurringShortfallOrSurplus(
                  Math.max(0, -insights.lowestShortfallRiskResult.annualGap),
                  Math.max(0, insights.lowestShortfallRiskResult.annualGap),
                  retirementIncomeDisplay
                )
              : "Not available",
          },
        ]}
      />
      <SummarySection
        title="Preserves pots longest"
        items={[
          {
            label:
              insights.longestCapitalResult?.scenario.name ?? "Not available",
            value: insights.longestCapitalResult
              ? formatCapitalPreservation(insights.longestCapitalResult)
              : "Not available",
          },
        ]}
      />
      <SummarySection
        title="Highest later income"
        items={[
          {
            label:
              insights.highestLaterIncomeResult?.scenario.name ??
              "Not available",
            value: insights.highestLaterIncomeResult
              ? formatRecurringCurrency(
                  insights.highestLaterIncomeResult.lifeExpectancyAnnualIncome,
                  retirementIncomeDisplay
                )
              : "Not available",
          },
        ]}
      />
    </div>
  );
}

function formatRecurringCurrency(
  annualValue: number,
  display: RetirementIncomeDisplay
) {
  return display === "monthly"
    ? `${formatCurrencyDetailed(annualValue / 12)} per month`
    : `${formatCurrencyDetailed(annualValue)} per year`;
}

function formatRecurringShortfallOrSurplus(
  annualShortfall: number,
  annualSurplus: number,
  display: RetirementIncomeDisplay
) {
  const shortfall =
    display === "monthly" ? annualShortfall / 12 : annualShortfall;
  const surplus = display === "monthly" ? annualSurplus / 12 : annualSurplus;
  const period = display === "monthly" ? "per month" : "per year";

  if (shortfall > 0) {
    return `${formatCurrencyDetailed(shortfall)} shortfall ${period}`;
  }

  if (surplus > 0) {
    return `${formatCurrencyDetailed(surplus)} surplus ${period}`;
  }

  return `${formatCurrencyDetailed(0)} ${period}`;
}
