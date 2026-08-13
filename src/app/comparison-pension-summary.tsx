import type { RetirementIncomeDisplay } from "../projection";
import {
  buildRetirementOutcomeBanner,
  formatCurrencyDetailed,
  type ComparisonResult,
  type FlexibleWithdrawalSummary,
  type IncomeAgeRangeItem,
  type RetirementOutcomeBanner,
  type TargetBasedWithdrawalPreview,
} from "../app-domains";
import {
  AssumptionsVersionStrip,
  RetirementIncomeDisplayToggle,
  SummarySection,
  type SummaryItem,
} from "./results-summary";
import type { FlexibleFundAccountId } from "../settings";
import { FlexibleWithdrawalInsightPanel } from "./flexible-withdrawal-insight";

export type PensionSummarySectionProps = {
  activeResult: ComparisonResult | null;
  description: string;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
  incomeAgeRangeItems: IncomeAgeRangeItem[];
  statusItems: SummaryItem[];
  headingLevel?: 2 | 3;
  flexibleWithdrawalSummary?: FlexibleWithdrawalSummary;
  targetBasedWithdrawalPreviews?: TargetBasedWithdrawalPreview[];
  onApplyTargetBasedStrategy?: (accountId: FlexibleFundAccountId) => void;
  onReviewWithdrawalStrategy?: (accountId: FlexibleFundAccountId) => void;
};

export function PensionSummarySection({
  activeResult,
  description,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  incomeAgeRangeItems,
  statusItems,
  headingLevel = 3,
  flexibleWithdrawalSummary,
  targetBasedWithdrawalPreviews = [],
  onApplyTargetBasedStrategy,
  onReviewWithdrawalStrategy,
}: PensionSummarySectionProps) {
  if (!activeResult || !retirementIncomeDisplay) {
    return null;
  }

  const outcomeBanner = buildRetirementOutcomeBanner(activeResult);
  const usesAfterTaxTarget =
    activeResult.scenario.settings.retirementIncomeTargetBasis === "after_tax";

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
          {activeResult.summary.premiumPension.factorUnavailable ? (
            <section
              className="summary-outcome-banner summary-outcome-banner--atRisk"
              aria-label="Premium factor unavailable"
            >
              <div className="summary-outcome-status">
                Premium factor unavailable
              </div>
              <p>
                This Premium case is outside the published factors currently
                modelled, so Premium income is excluded. Use a whole-year draw
                age from 55 with Normal Pension Age 60 or 65, or check the
                amount against an official pension quotation.
              </p>
            </section>
          ) : null}
          <RetirementOutcomeBannerView outcome={outcomeBanner} />
          {flexibleWithdrawalSummary &&
          onApplyTargetBasedStrategy &&
          onReviewWithdrawalStrategy ? (
            <FlexibleWithdrawalInsightPanel
              summary={flexibleWithdrawalSummary}
              previews={targetBasedWithdrawalPreviews}
              onApplyTargetBasedStrategy={onApplyTargetBasedStrategy}
              onReviewStrategy={onReviewWithdrawalStrategy}
            />
          ) : null}
          {incomeAgeRangeItems.length > 0 ? (
            <div className="summary-status-block">
              <h3>Income by age range</h3>
              <p className="section-copy">
                Each row groups ages where the modelled income sources are the
                same. Income and target values use the start of the age range
                and are shown{" "}
                {usesAfterTaxTarget ? "after estimated tax" : "before tax"}.
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
                      <th scope="col">
                        {usesAfterTaxTarget
                          ? "Estimated take-home income"
                          : "Income before tax"}
                      </th>
                      <th scope="col">
                        {usesAfterTaxTarget
                          ? "Target spending after estimated tax"
                          : "Target income before tax"}
                      </th>
                      <th scope="col">
                        {usesAfterTaxTarget
                          ? "Estimated spending difference"
                          : "Income difference before tax"}
                      </th>
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

type SimplePensionSummaryProps = {
  activeResult: ComparisonResult | null;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange?: (display: RetirementIncomeDisplay) => void;
};

export function SimplePensionSummary({
  activeResult,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
}: SimplePensionSummaryProps) {
  if (!activeResult || !retirementIncomeDisplay) {
    return null;
  }

  const divisor = retirementIncomeDisplay === "monthly" ? 12 : 1;
  const period = retirementIncomeDisplay === "monthly" ? "a month" : "a year";
  const difference = activeResult.annualGap / divisor;
  const differenceLabel =
    difference < 0 ? "Less than you want" : "More than you want";
  const outcome = buildRetirementOutcomeBanner(activeResult);

  return (
    <section className="summary-section summary-section--feature simple-results-summary">
      <div className="summary-section-header">
        <h2>Your estimated retirement income</h2>
        {onRetirementIncomeDisplayChange ? (
          <RetirementIncomeDisplayToggle
            value={retirementIncomeDisplay}
            onChange={onRetirementIncomeDisplayChange}
          />
        ) : null}
      </div>
      <p className="section-copy">
        An estimate of the money available to spend after Income Tax, based on
        the answers you entered.
      </p>
      <div className="simple-results-figures">
        <div className="simple-results-figure simple-results-figure--primary">
          <span>Money left after estimated tax</span>
          <strong>
            {formatCurrencyDetailed(activeResult.annualIncome / divisor)}{" "}
            {period}
          </strong>
        </div>
        <div className="simple-results-figure">
          <span>Amount you want to spend</span>
          <strong>
            {formatCurrencyDetailed(activeResult.annualTarget / divisor)}{" "}
            {period}
          </strong>
        </div>
        <div className="simple-results-figure">
          <span>{differenceLabel}</span>
          <strong>
            {formatCurrencyDetailed(Math.abs(difference))} {period}
          </strong>
        </div>
      </div>
      <p className="simple-results-context">
        These headline figures are from the point when all the pension income
        you selected has started. The chart below shows how the estimate may
        change at other ages.
      </p>
      <RetirementOutcomeBannerView outcome={outcome} simple />
    </section>
  );
}

type SimplePensionDetailsProps = {
  activeResult: ComparisonResult | null;
  retirementIncomeDisplay?: RetirementIncomeDisplay;
  incomeAgeRangeItems: IncomeAgeRangeItem[];
};

export function SimplePensionDetails({
  activeResult,
  retirementIncomeDisplay,
  incomeAgeRangeItems,
}: SimplePensionDetailsProps) {
  if (!activeResult || !retirementIncomeDisplay) {
    return null;
  }

  const showMonthly = retirementIncomeDisplay === "monthly";
  const sourcePeriod = showMonthly ? "a month" : "a year";
  const sources = activeResult.summary.retirementIncome.sources.filter(
    (source) => source.monthlyIncome !== 0
  );

  return (
    <section className="summary-section summary-section--feature simple-results-details">
      <div>
        <h2>Where the money may come from</h2>
        <p className="section-copy">
          This breakdown is from the point when all the pension income you
          selected has started. Income Tax is shown as money taken off.
        </p>
        <dl className="simple-income-sources">
          {sources.map((source) => {
            const value = showMonthly
              ? source.monthlyIncome
              : source.annualIncome;

            return (
              <div key={source.key}>
                <dt>{source.label}</dt>
                <dd>
                  {value < 0 ? "−" : ""}
                  {formatCurrencyDetailed(Math.abs(value))} {sourcePeriod}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      {incomeAgeRangeItems.length > 0 ? (
        <div className="simple-age-ranges">
          <h2>Income at different ages</h2>
          <p className="section-copy">
            These ranges provide a text version of the important changes shown
            in the chart.
          </p>
          <ul>
            {incomeAgeRangeItems.map((item) => (
              <li key={`${item.ageRange}-${item.sources}`}>
                <strong>{item.ageRange}</strong>
                <span>{item.income} left after estimated tax</span>
                <span>{item.sources}</span>
                <span>{formatSimpleDifference(item.difference)}</span>
              </li>
            ))}
          </ul>
          <details className="simple-results-disclosure">
            <summary>See the detailed figures</summary>
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
                    <th scope="col">Money left after estimated tax</th>
                    <th scope="col">
                      Amount you want to spend after estimated tax
                    </th>
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
                      <td>{formatSimpleDifference(item.difference)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      ) : null}

      <div className="simple-results-checks">
        <h2>What to check</h2>
        <ul>
          <li>
            Compare your Alpha figures with your latest Annual Benefit
            Statement.
          </li>
          {activeResult.scenario.settings.showStatePension ? (
            <li>
              Compare the State Pension amount with your personalised forecast.
            </li>
          ) : null}
          <li>
            Treat the Income Tax figure as an estimate; your actual tax may be
            different.
          </li>
          <li>
            Check important decisions against official pension quotations.
          </li>
        </ul>
      </div>

      <AssumptionsVersionStrip />
    </section>
  );
}

function RetirementOutcomeBannerView({
  outcome,
  simple = false,
}: {
  outcome: RetirementOutcomeBanner;
  simple?: boolean;
}) {
  const simpleMessage =
    outcome.status === "shortfall"
      ? "The estimate shows less money than you want for part of retirement. The chart shows when this may happen."
      : outcome.status === "atRisk"
        ? "The estimate reaches the amount you want, but it uses a temporary State Pension amount."
        : "Based on your answers, the estimate shows at least the amount you want across the ages shown.";
  const simpleLabel = getSimpleOutcomeLabel(outcome);

  return (
    <section
      className={`summary-outcome-banner summary-outcome-banner--${outcome.status}`}
      aria-label="Retirement outcome"
    >
      <div className="summary-outcome-status">
        {simple ? simpleLabel : outcome.label}
      </div>
      <p>{simple ? simpleMessage : outcome.message}</p>
      {outcome.warning ? (
        <div className="summary-outcome-warning">
          <strong>{outcome.warning.heading}</strong>
          <p>
            {simple
              ? "We used a temporary State Pension amount. Your result may change when you enter your own forecast."
              : outcome.warning.message}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function formatSimpleDifference(difference: string) {
  return difference
    .replace(" shortfall", " less than you want")
    .replace(" surplus", " more than you want");
}

function getSimpleOutcomeLabel(outcome: RetirementOutcomeBanner) {
  return outcome.status === "shortfall" ? "Less than you want" : outcome.label;
}
