import type { ReactNode } from "react";
import {
  deriveInflationAssumptions,
  type RetirementIncomeDisplay,
} from "../projection";
import type { PensionSettings, PensionValidationIssue } from "../settings";
import { formatModelledReturn, formatPercent } from "../app-domains";
import { resolveAppBaseHref } from "./app-base";

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

export function ResultsSummarySection({
  children,
}: ResultsSummarySectionProps) {
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
                    <InfoLink
                      href={infoUrl}
                      text={infoLinkText ?? `More about ${label}`}
                    />
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
  ariaLabel?: string;
  monthlyAriaLabel?: string;
  annualAriaLabel?: string;
};

export function RetirementIncomeDisplayToggle({
  value,
  onChange,
  ariaLabel = "Retirement income summary display",
  monthlyAriaLabel,
  annualAriaLabel,
}: RetirementIncomeDisplayToggleProps) {
  return (
    <div className="summary-toggle" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={
          value === "monthly"
            ? "summary-toggle-button summary-toggle-button--active"
            : "summary-toggle-button"
        }
        aria-pressed={value === "monthly"}
        aria-label={monthlyAriaLabel}
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
        aria-label={annualAriaLabel}
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
          <li
            key={`${issue.field}-${issue.itemId ?? "field"}-${issue.message}`}
          >
            {issue.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AssumptionsVersionStrip() {
  const appBaseHref = resolveAppBaseHref();

  return (
    <section
      className="assumptions-version-strip"
      aria-label="Planning and privacy disclaimer"
    >
      <div className="assumptions-version-strip-copy">
        <h3>Planning tool only</h3>
        <p>
          This modeller is for illustration, not financial advice. It is
          independent of the Civil Service Pension Scheme, Capita, the Cabinet
          Office and Alpha. Results depend on your inputs, so check important
          decisions against your official pension statement and, where
          appropriate, a regulated financial adviser.
        </p>
      </div>
      <a
        className="static-backlink assumptions-version-link"
        href={`${appBaseHref}methodology/index.html`}
      >
        View methodology
      </a>
    </section>
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
    ? "You are viewing results in real terms. This means all figures are shown in today's money. Inflation-linked increases have been removed from Alpha, nuvos, and State Pension where they only preserve purchasing power. SIPP, ISA and LISA growth uses inflation-adjusted real returns."
    : "You are viewing results in nominal terms. This means future figures include assumed inflation. Retirement income targets, pension increases, and investment balances are projected as future pound amounts.";
  const rows = buildInflationRows(settings, assumptions, isRealTerms);

  return (
    <section
      className="panel inflation-panel"
      aria-labelledby="inflation-summary-title"
    >
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
  isRealTerms: boolean
) {
  const rows = [
    {
      assumption: "Inflation",
      userValue: formatPercent(assumptions.inflationRateAnnual),
      modelledValue: formatPercent(assumptions.inflationRateAnnual),
    },
    {
      assumption: "Alpha in-service revaluation",
      userValue: "CPI",
      modelledValue: settings.applyPensionIncreases
        ? isRealTerms
          ? "0% real"
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
        settings.projectionBasis
      )
    );
  }

  if (settings.showIsa) {
    rows.push(
      createReturnRow(
        "ISA nominal return",
        true,
        assumptions.isaNominalReturnAnnual,
        assumptions.isaModelledReturnAnnual,
        settings.projectionBasis
      )
    );
  }

  if (settings.showLisa) {
    rows.push(
      createReturnRow(
        "LISA nominal return",
        true,
        assumptions.lisaNominalReturnAnnual,
        assumptions.lisaModelledReturnAnnual,
        settings.projectionBasis
      )
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
        settings.projectionBasis
      )
    );
  }

  return rows;
}

function createReturnRow(
  assumption: string,
  isApplied: boolean,
  userAnnualRate: number,
  modelledAnnualRate: number,
  projectionBasis: PensionSettings["projectionBasis"]
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
