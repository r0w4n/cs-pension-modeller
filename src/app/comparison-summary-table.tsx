import {
  buildComparisonTableRows,
  type ComparisonResult,
  type ComparisonTableRow,
} from "../app-domains";
import type { RetirementIncomeDisplay } from "../projection";
import { useMobileDateDropdowns } from "./form-fields";
import { ProjectionTableFrame, type TableColumn } from "./projection-table";

export type ComparisonSummaryTableProps = {
  results: ComparisonResult[];
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  hideBridgeFundingSection?: boolean;
  hideFlexibleAssetsSection?: boolean;
};

export function ComparisonSummaryTable({
  results,
  retirementIncomeDisplay = "annual",
  hideBridgeFundingSection = false,
  hideFlexibleAssetsSection = false,
}: ComparisonSummaryTableProps) {
  const columns: TableColumn[] = [
    { key: "metric", label: "Metric", width: "16rem" },
    ...results.map((result, index) => ({
      key: result.scenario.id,
      label: result.scenario.name || `Scenario ${index + 1}`,
      width: "13rem",
    })),
  ];
  const rows = buildComparisonTableRows(results, {
    retirementIncomeDisplay,
    hideBridgeFundingSection,
    hideFlexibleAssetsSection,
  });
  const showMobileCards = useMobileDateDropdowns("(max-width: 640px)");
  const minWidth = `${16 + results.length * 13}rem`;

  if (showMobileCards) {
    return (
      <section className="summary-section summary-section--compact">
        <div className="summary-section-inner">
          <section className="bridge-table-section">
            <div className="projection-mobile-cards projection-mobile-cards--active">
              {rows
                .filter((row) => !row.isSectionDivider)
                .map((row) => (
                  <ComparisonMobileCard
                    key={row.key}
                    row={row}
                    results={results}
                  />
                ))}
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="summary-section summary-section--compact">
      <div className="summary-section-inner">
        <section className="bridge-table-section">
          <ProjectionTableFrame
            columns={columns}
            rows={rows}
            emptyMessage="No comparison rows are available."
            getRowKey={(row) => row.key}
            getRowClassName={(row) =>
              row.isSectionDivider
                ? "comparison-summary-row comparison-summary-row--divider"
                : "comparison-summary-row"
            }
            minWidth={minWidth}
            renderCells={(row) => [
              row.isSectionDivider ? (
                <strong key={row.key}>{row.section}</strong>
              ) : (
                row.metric
              ),
              ...row.values,
            ]}
          />
        </section>
      </div>
    </section>
  );
}

function ComparisonMobileCard({
  row,
  results,
}: {
  row: ComparisonTableRow;
  results: ComparisonResult[];
}) {
  return (
    <article className="projection-mobile-card comparison-mobile-card">
      <div className="projection-mobile-card-row">
        <span>Metric</span>
        <div className="projection-mobile-card-value">{row.metric}</div>
      </div>
      {results.map((result, index) => (
        <div
          key={`${row.key}-${result.scenario.id}`}
          className="projection-mobile-card-row"
        >
          <span>{result.scenario.name || `Scenario ${index + 1}`}</span>
          <div className="projection-mobile-card-value">
            {row.values[index]}
          </div>
        </div>
      ))}
    </article>
  );
}
