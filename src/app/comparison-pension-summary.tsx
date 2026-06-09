import type { RetirementIncomeDisplay } from "../projection";
import type { ComparisonResult } from "../app-domains";
import {
  AssumptionsVersionStrip,
  RetirementIncomeDisplayToggle,
  RetirementIncomeSummaryFooter,
  SummarySection,
  type SummaryItem,
} from "./results-summary";

export type PensionSummarySectionProps = {
  activeResult: ComparisonResult | null;
  description: string;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  retirementIncomeItems: SummaryItem[];
  retirementIncomeTitle: string;
  retirementIncomeTotal: string;
  retirementIncomeTargetTitle: string;
  retirementIncomeTarget: string;
  statusItems: SummaryItem[];
  headingLevel?: 2 | 3;
};

export function PensionSummarySection({
  activeResult,
  description,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  retirementIncomeItems,
  retirementIncomeTitle,
  retirementIncomeTotal,
  retirementIncomeTargetTitle,
  retirementIncomeTarget,
  statusItems,
  headingLevel = 3,
}: PensionSummarySectionProps) {
  if (!activeResult || !retirementIncomeDisplay) {
    return null;
  }

  return (
    <SummarySection
      title="Pension Summary"
      headingLevel={headingLevel}
      variant="feature"
      description={description}
      items={retirementIncomeItems}
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
          <RetirementIncomeSummaryFooter
            totalLabel={retirementIncomeTitle}
            totalValue={retirementIncomeTotal}
            targetLabel={retirementIncomeTargetTitle}
            targetValue={retirementIncomeTarget}
          />
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
  retirementIncomeItems: SummaryItem[];
  retirementIncomeTitle: string;
  retirementIncomeTotal: string;
  retirementIncomeTargetTitle: string;
  retirementIncomeTarget: string;
  statusItems: SummaryItem[];
};

export function ComparisonPensionSummary({
  activeResult,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  retirementIncomeItems,
  retirementIncomeTitle,
  retirementIncomeTotal,
  retirementIncomeTargetTitle,
  retirementIncomeTarget,
  statusItems,
}: ComparisonPensionSummaryProps) {
  if (!activeResult || !retirementIncomeDisplay) {
    return null;
  }

  return (
    <PensionSummarySection
      activeResult={activeResult}
      description="This summary uses your current journey assumptions and shows your projected annual income before tax."
      retirementIncomeDisplay={retirementIncomeDisplay}
      onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
      retirementIncomeItems={retirementIncomeItems}
      retirementIncomeTitle={retirementIncomeTitle}
      retirementIncomeTotal={retirementIncomeTotal}
      retirementIncomeTargetTitle={retirementIncomeTargetTitle}
      retirementIncomeTarget={retirementIncomeTarget}
      statusItems={statusItems}
    />
  );
}
