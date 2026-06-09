import {
  formatCapitalPreservation,
  formatCurrencyDetailed,
  formatDecimalAge,
  formatShortfallOrSurplus,
  formatTargetMissDuration,
  type ComparisonInsights,
  type ComparisonResult,
} from "../app-domains";
import { ComparisonSummaryTable } from "./comparison-summary-table";
import { SummarySection } from "./results-summary";

export function ComparisonResults({
  results,
  insights,
  hideBridgeFundingSection = false,
  hideFlexibleAssetsSection = false,
}: {
  results: ComparisonResult[];
  insights: ComparisonInsights;
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
        <ComparisonInsightsGrid insights={insights} />
      ) : null}
      <ComparisonSummaryTable
        results={results}
        hideBridgeFundingSection={hideBridgeFundingSection}
        hideFlexibleAssetsSection={hideFlexibleAssetsSection}
      />
    </>
  );
}

function ComparisonInsightsGrid({
  insights,
}: {
  insights: ComparisonInsights;
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
              ? formatShortfallOrSurplus(
                  Math.max(0, -insights.lowestShortfallRiskResult.annualGap),
                  Math.max(0, insights.lowestShortfallRiskResult.annualGap)
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
              ? `${formatCurrencyDetailed(
                  insights.highestLaterIncomeResult.lifeExpectancyAnnualIncome
                )} per year`
              : "Not available",
          },
        ]}
      />
    </div>
  );
}
