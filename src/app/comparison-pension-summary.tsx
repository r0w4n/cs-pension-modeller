import type { RetirementIncomeDisplay } from "../projection";
import {
  buildRetirementOutcomeBanner,
  type ComparisonResult,
  type IncomeAgeRangeItem,
  type RetirementOutcomeBanner,
} from "../app-domains";
import {
  AssumptionsVersionStrip,
  RetirementIncomeDisplayToggle,
  SummarySection,
  type SummaryItem,
} from "./results-summary";

export type PensionSummarySectionProps = {
  activeResult: ComparisonResult | null;
  description: string;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  incomeAgeRangeItems: IncomeAgeRangeItem[];
  statusItems: SummaryItem[];
  headingLevel?: 2 | 3;
};

export function PensionSummarySection({
  activeResult,
  description,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  incomeAgeRangeItems,
  statusItems,
  headingLevel = 3,
}: PensionSummarySectionProps) {
  if (!activeResult || !retirementIncomeDisplay) {
    return null;
  }

  const outcomeBanner = buildRetirementOutcomeBanner(activeResult);

  return (
    <SummarySection
      title="Retirement income summary"
      headingLevel={headingLevel}
      variant="feature"
      description={description}
      items={[]}
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
          <RetirementOutcomeBannerView outcome={outcomeBanner} />
          {incomeAgeRangeItems.length > 0 ? (
            <div className="summary-status-block">
              <h3>Income by age range</h3>
              <p className="section-copy">
                Each row groups ages where the modelled income sources are the
                same. Income and target values use the start of the age range.
              </p>
              <div
                className="summary-table-shell"
                aria-label="Income by age range table"
                tabIndex={0}
              >
                <table className="summary-age-range-table">
                  <thead>
                    <tr>
                      <th scope="col">Age range</th>
                      <th scope="col">Sources</th>
                      <th scope="col">Income</th>
                      <th scope="col">Target</th>
                      <th scope="col">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeAgeRangeItems.map((item) => (
                      <tr key={`${item.ageRange}-${item.sources}`}>
                        <th scope="row">{item.ageRange}</th>
                        <td>{item.sources}</td>
                        <td>{item.income}</td>
                        <td>{item.target}</td>
                        <td>{item.difference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
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
          <AssumptionsVersionStrip />
        </>
      }
    />
  );
}

type ComparisonPensionSummaryProps = {
  activeResult: ComparisonResult | null;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  incomeAgeRangeItems: IncomeAgeRangeItem[];
  statusItems: SummaryItem[];
};

export function ComparisonPensionSummary({
  activeResult,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  incomeAgeRangeItems,
  statusItems,
}: ComparisonPensionSummaryProps) {
  if (!activeResult || !retirementIncomeDisplay) {
    return null;
  }

  return (
    <PensionSummarySection
      activeResult={activeResult}
      description="This summary uses your current journey assumptions and shows projected income by age range."
      retirementIncomeDisplay={retirementIncomeDisplay}
      onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
      incomeAgeRangeItems={incomeAgeRangeItems}
      statusItems={statusItems}
    />
  );
}

function RetirementOutcomeBannerView({
  outcome,
}: {
  outcome: RetirementOutcomeBanner;
}) {
  return (
    <section
      className={`summary-outcome-banner summary-outcome-banner--${outcome.status}`}
      aria-label="Retirement outcome"
    >
      <div className="summary-outcome-status">{outcome.label}</div>
      <p>{outcome.message}</p>
    </section>
  );
}
