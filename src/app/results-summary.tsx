import type { ReactNode } from "react";
import { deriveInflationAssumptions, type RetirementIncomeDisplay } from "../projection";
import type { PensionSettings, PensionValidationIssue } from "../settings";
import { formatModelledReturn, formatPercent } from "../app-domains";
import {
  GOVERNED_ASSUMPTIONS_REGISTRY,
  getAffectedFieldLabels,
  getGovernedAssumptionsLatestReviewDate,
} from "../assumptions-registry";
import { resolveAppBaseHref } from "./app-base";

const MODELLER_LIMITATIONS = [
  "Income Tax is estimated from configurable standard assumptions. It does not cover Scottish tax bands, benefit interactions, tax code changes, or other personal reliefs.",
  "Inflation is only modelled where explicit CPI or growth assumptions are enabled.",
  "State Pension modelling does not cover benefit interactions, overseas rules, lump-sum arrears choices, or pre-2016 deferral rules.",
  "Added pension purchase revaluation is simplified.",
  "Scheme-specific edge cases are not exhaustively represented.",
] as const;

type ResultsSummarySectionProps = {
  children: ReactNode;
};

export type SummaryItem = {
  label: string;
  value: string;
  infoUrl?: string;
  infoLinkText?: string;
};

type SummarySectionProps = {
  title: string;
  items: SummaryItem[];
  headingLevel?: 2 | 3;
  description?: string;
  groupTitle?: string;
  variant?: "compact" | "feature";
  controls?: ReactNode;
  footer?: ReactNode;
};

export function ResultsSummarySection({ children }: ResultsSummarySectionProps) {
  return <>{children}</>;
}

export function SummarySection({
  title,
  items,
  headingLevel = 3,
  description,
  groupTitle,
  variant = "compact",
  controls,
  footer,
}: SummarySectionProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <section className={`summary-section summary-section--${variant}`}>
      <div className="summary-section-header">
        <Heading>{title}</Heading>
        {controls}
      </div>
      {description ? <p className="section-copy">{description}</p> : null}
      <div className="summary-section-inner">
        {groupTitle ? <h3>{groupTitle}</h3> : null}
        <dl className="snapshot-list">
          {items.map(({ label, value, infoUrl, infoLinkText }) => (
            <div key={label}>
              <dt>
                <span className="field-label-group">
                  <span>{label}</span>
                  {infoUrl ? (
                    <InfoLink href={infoUrl} text={infoLinkText ?? `More about ${label}`} />
                  ) : null}
                </span>
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {footer}
      </div>
    </section>
  );
}

type RetirementIncomeDisplayToggleProps = {
  value: RetirementIncomeDisplay;
  onChange: (display: RetirementIncomeDisplay) => void;
};

export function RetirementIncomeDisplayToggle({
  value,
  onChange,
}: RetirementIncomeDisplayToggleProps) {
  return (
    <div className="summary-toggle" role="group" aria-label="Pension Summary display">
      <button
        type="button"
        className={
          value === "monthly"
            ? "summary-toggle-button summary-toggle-button--active"
            : "summary-toggle-button"
        }
        aria-pressed={value === "monthly"}
        onClick={() => onChange("monthly")}
      >
        Monthly
      </button>
      <button
        type="button"
        className={
          value === "annual"
            ? "summary-toggle-button summary-toggle-button--active"
            : "summary-toggle-button"
        }
        aria-pressed={value === "annual"}
        onClick={() => onChange("annual")}
      >
        Annual
      </button>
    </div>
  );
}

type RetirementIncomeSummaryFooterProps = {
  totalLabel: string;
  totalValue: string;
  targetLabel: string;
  targetValue: string;
};

export function RetirementIncomeSummaryFooter({
  totalLabel,
  totalValue,
  targetLabel,
  targetValue,
}: RetirementIncomeSummaryFooterProps) {
  return (
    <>
      <div className="summary-total" aria-label={totalLabel}>
        <span>{totalLabel}</span>
        <strong>{totalValue}</strong>
      </div>
      <div className="summary-target" aria-label={targetLabel}>
        <span>{targetLabel}</span>
        <strong>{targetValue}</strong>
      </div>
    </>
  );
}

export function ValidationIssuesSection({
  validationIssues,
}: {
  validationIssues: PensionValidationIssue[];
}) {
  if (validationIssues.length === 0) {
    return null;
  }

  return (
    <section className="settings-section" aria-live="polite">
      <div className="section-heading">
        <h3>Check these assumptions</h3>
        <p className="section-copy">
          The projection is paused until these settings are brought back into a
          valid range.
        </p>
      </div>

      <ul className="section-copy">
        {validationIssues.map((issue) => (
          <li key={`${issue.field}-${issue.itemId ?? "field"}-${issue.message}`}>
            {issue.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ModellerLimitations({
  showLimitations,
  onToggleLimitations,
}: {
  showLimitations: boolean;
  onToggleLimitations: () => void;
}) {
  return (
    <div className="summary-limitations" aria-label="Modeller limitations">
      <p className="section-copy">
        This modeller supports planning decisions, not scheme statements, HMRC
        calculations, or regulated advice.
      </p>
      <button
        type="button"
        className="secondary-button limitations-toggle"
        aria-expanded={showLimitations}
        aria-controls="pension-summary-limitations-list"
        onClick={onToggleLimitations}
      >
        {showLimitations ? "Hide limitations" : "Show limitations"}
      </button>

      {showLimitations ? (
        <div id="pension-summary-limitations-list" className="limitations-content">
          <p className="section-copy">
            Important assumptions and omissions to keep in mind:
          </p>
          <ul className="limitations-list">
            {MODELLER_LIMITATIONS.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function AssumptionsVersionStrip() {
  const appBaseHref = resolveAppBaseHref();
  const latestReviewDate = getGovernedAssumptionsLatestReviewDate();

  return (
    <div className="assumptions-version-strip" aria-label="Assumptions version">
      <div className="assumptions-version-strip-copy">
        <strong>Assumptions version {GOVERNED_ASSUMPTIONS_REGISTRY.version}</strong>
        <span>
          {GOVERNED_ASSUMPTIONS_REGISTRY.assumptions.length} governed rules. Latest
          review {latestReviewDate}.
        </span>
      </div>
      <a
        className="static-backlink assumptions-version-link"
        href={`${appBaseHref}methodology/index.html`}
      >
        View methodology
      </a>
    </div>
  );
}

export function GovernedAssumptionsTable() {
  return (
    <div className="assumption-table-shell">
      <table className="assumption-table">
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">Source</th>
            <th scope="col">Effective date</th>
            <th scope="col">Last reviewed</th>
            <th scope="col">Affected fields</th>
          </tr>
        </thead>
        <tbody>
          {GOVERNED_ASSUMPTIONS_REGISTRY.assumptions.map((assumption) => (
            <tr key={assumption.id}>
              <th scope="row">
                <div className="assumption-rule-title">{assumption.title}</div>
                <div className="assumption-rule-summary">{assumption.summary}</div>
              </th>
              <td data-label="Source">
                <a
                  className="field-info-link"
                  href={assumption.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {assumption.sourceLabel}
                </a>
              </td>
              <td data-label="Effective date">{assumption.effectiveDate}</td>
              <td data-label="Last reviewed">{assumption.lastReviewedDate}</td>
              <td data-label="Affected fields">
                {getAffectedFieldLabels(assumption.affectedFields).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InflationBasisPanel({
  settings,
  assumptions,
}: {
  settings: PensionSettings;
  assumptions: ReturnType<typeof deriveInflationAssumptions>;
}) {
  const isRealTerms = settings.projectionBasis === "real";
  const basisLabel = isRealTerms
    ? "Projection basis: Real terms, today's money"
    : "Projection basis: Nominal terms, future inflated values";
  const explanation = isRealTerms
    ? "You are viewing results in real terms. This means all figures are shown in today's money. Inflation-linked increases have been removed from Alpha, nuvos, and State Pension where they only preserve purchasing power. SIPP and ISA growth uses inflation-adjusted real returns."
    : "You are viewing results in nominal terms. This means future figures include assumed inflation. Retirement income targets, pension increases, and investment balances are projected as future pound amounts.";
  const rows = buildInflationRows(settings, assumptions, isRealTerms);

  return (
    <section className="panel inflation-panel" aria-labelledby="inflation-summary-title">
      <div className="panel-heading">
        <h2 id="inflation-summary-title">{basisLabel}</h2>
        <p className="section-copy">{explanation}</p>
      </div>

      <div className="assumption-table-shell">
        <table className="assumption-table">
          <thead>
            <tr>
              <th scope="col">Assumption</th>
              <th scope="col">User value</th>
              <th scope="col">Modelled value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.assumption}>
                <th scope="row">{row.assumption}</th>
                <td data-label="User value">{row.userValue}</td>
                <td data-label="Modelled value">{row.modelledValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildInflationRows(
  settings: PensionSettings,
  assumptions: ReturnType<typeof deriveInflationAssumptions>,
  isRealTerms: boolean,
) {
  const rows = [
    {
      assumption: "Inflation",
      userValue: formatPercent(assumptions.inflationRateAnnual),
      modelledValue: formatPercent(assumptions.inflationRateAnnual),
    },
    {
      assumption: "Alpha in-service revaluation",
      userValue: "CPI + 1.5%",
      modelledValue: settings.applyPensionIncreases
        ? isRealTerms
          ? "1.5% real"
          : formatPercent(assumptions.alphaModelledInServiceRevaluationAnnual)
        : "Not applied",
    },
    {
      assumption: "Deferred Alpha increase",
      userValue: "CPI",
      modelledValue: settings.applyPensionIncreases
        ? isRealTerms
          ? "0% real"
          : formatPercent(assumptions.alphaModelledDeferredIncreaseAnnual)
        : "Not applied",
    },
  ];

  if (settings.showSipp) {
    rows.push(
      createReturnRow(
        "SIPP nominal return",
        true,
        assumptions.sippNominalReturnAnnual,
        assumptions.sippModelledReturnAnnual,
        settings.projectionBasis,
      ),
    );
  }

  if (settings.showIsa) {
    rows.push(
      createReturnRow(
        "ISA nominal return",
        true,
        assumptions.isaNominalReturnAnnual,
        assumptions.isaModelledReturnAnnual,
        settings.projectionBasis,
      ),
    );
  }

  if (settings.showNuvos) {
    rows.push({
      assumption: "Deferred nuvos increase",
      userValue: "CPI",
      modelledValue: settings.nuvosApplyPensionIncreases
        ? isRealTerms
          ? "0% real"
          : formatPercent(assumptions.nuvosModelledDeferredIncreaseAnnual)
        : "Not applied",
    });
  }

  if (settings.showStatePension) {
    rows.push(
      createReturnRow(
        "State Pension increase",
        settings.statePensionApplyFutureGrowth,
        assumptions.statePensionNominalIncreaseAnnual,
        assumptions.statePensionModelledIncreaseAnnual,
        settings.projectionBasis,
      ),
    );
  }

  return rows;
}

function createReturnRow(
  assumption: string,
  isApplied: boolean,
  userAnnualRate: number,
  modelledAnnualRate: number,
  projectionBasis: PensionSettings["projectionBasis"],
) {
  return {
    assumption,
    userValue: isApplied ? formatPercent(userAnnualRate) : "Not applied",
    modelledValue: isApplied
      ? formatModelledReturn(modelledAnnualRate, projectionBasis)
      : "0%",
  };
}

function InfoLink({ href, text }: { href: string; text: string }) {
  return (
    <a className="field-info-link" href={href} target="_blank" rel="noreferrer">
      {text}
    </a>
  );
}
