import {
  buildComparisonTableRows,
  formatCapitalPreservation,
  formatCurrencyDetailed,
  formatDecimalAge,
  formatShortfallOrSurplus,
  formatTargetMissDuration,
  type ComparisonInsights,
  type ComparisonResult,
} from "../app-domains";
import { ProjectionTableFrame, type TableColumn } from "./projection-table";
import { SummarySection } from "./results-summary";

export function ComparisonResults({
  results,
  insights,
}: {
  results: ComparisonResult[];
  insights: ComparisonInsights;
}) {
  if (results.length === 0) {
    return (
      <section className="summary-section summary-section--compact">
        <div className="summary-section-header">
          <h3>Cannot calculate</h3>
        </div>
        <p className="section-copy">
          Fix the current validation issues to populate the result and comparison view.
        </p>
      </section>
    );
  }

  return (
    <>
      {results.length >= 2 ? <ComparisonInsightsGrid insights={insights} /> : null}
      <ComparisonSummaryTable results={results} />
    </>
  );
}

function ComparisonInsightsGrid({ insights }: { insights: ComparisonInsights }) {
  return (
    <div className="comparison-insight-grid">
      <SummarySection
        title="Earliest retirement"
        items={[
          {
            label: insights.earliestRetirementResult?.scenario.name ?? "Not available",
            value: insights.earliestRetirementResult
              ? formatDecimalAge(
                  insights.earliestRetirementResult.scenario.settings.requirementAge,
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
              ? formatTargetMissDuration(insights.bestTargetResult.targetMissMonths)
              : "Not available",
          },
        ]}
      />
      <SummarySection
        title="Lowest shortfall risk"
        items={[
          {
            label: insights.lowestShortfallRiskResult?.scenario.name ?? "Not available",
            value: insights.lowestShortfallRiskResult
              ? formatShortfallOrSurplus(
                  Math.max(0, -insights.lowestShortfallRiskResult.annualGap),
                  Math.max(0, insights.lowestShortfallRiskResult.annualGap),
                )
              : "Not available",
          },
        ]}
      />
      <SummarySection
        title="Preserves pots longest"
        items={[
          {
            label: insights.longestCapitalResult?.scenario.name ?? "Not available",
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
            label: insights.highestLaterIncomeResult?.scenario.name ?? "Not available",
            value: insights.highestLaterIncomeResult
              ? `${formatCurrencyDetailed(
                  insights.highestLaterIncomeResult.lifeExpectancyAnnualIncome,
                )} per year`
              : "Not available",
          },
        ]}
      />
    </div>
  );
}

function ComparisonSummaryTable({ results }: { results: ComparisonResult[] }) {
  const columns: TableColumn[] = [
    { key: "section", label: "Section", width: "14rem" },
    { key: "metric", label: "Metric", width: "18rem" },
    ...results.map((result, index) => ({
      key: result.scenario.id,
      label: result.scenario.name || `Scenario ${index + 1}`,
      width: "13rem",
    })),
  ];
  const rows = buildComparisonTableRows(results);
  const minWidth = `${32 + results.length * 13}rem`;

  return (
    <section className="bridge-table-section">
      <div className="summary-section-header">
        <h3>Detailed breakdown</h3>
      </div>
      <p className="section-copy">
        Review the full breakdown for the current model, including retirement timing,
        secure pension income, bridge funding, ISA and SIPP use, flexible asset
        position, and modelling assumptions. If you save additional scenarios, they
        will appear alongside this result so you can compare them using the same
        structure.
      </p>
      <ProjectionTableFrame
        columns={columns}
        rows={rows}
        emptyMessage="No comparison rows are available."
        getRowKey={(row) => row.key}
        getRowClassName={(row) =>
          row.sectionStart
            ? "comparison-summary-row comparison-summary-row--section"
            : "comparison-summary-row"
        }
        minWidth={minWidth}
        renderCells={(row) => [
          row.sectionStart ? <strong>{row.section}</strong> : "",
          row.metric,
          ...row.values,
        ]}
      />
    </section>
  );
}
