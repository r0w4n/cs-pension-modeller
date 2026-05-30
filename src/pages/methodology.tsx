import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GOVERNED_ASSUMPTIONS_REGISTRY } from "../assumptions-registry";
import { GovernedAssumptionsTable } from "../app/results-summary";
import { StaticPageLayout } from "./static-page-layout";
import "../index.css";

const MODELLER_LIMITATIONS = [
  "Income Tax is estimated from configurable standard assumptions. It does not cover Scottish tax bands, benefit interactions, tax code changes, or other personal reliefs.",
  "Inflation is only modelled where explicit CPI or growth assumptions are enabled.",
  "State Pension modelling does not cover benefit interactions, overseas rules, lump-sum arrears choices, or pre-2016 deferral rules.",
  "Added pension purchase revaluation is simplified.",
  "Scheme-specific edge cases are not exhaustively represented.",
] as const;

function MethodologyPage() {
  return (
    <StaticPageLayout
      eyebrow="Civil Service"
      title="Methodology"
      lead="How the modeller builds projections and what it does (and does not) include."
    >
      <section>
        <h2>Projection approach</h2>
        <p className="section-copy">
          The modeller builds a month-by-month projection from your chosen start date to
          the selected life expectancy date. Each month updates pension accrual and, once
          a draw date is reached, includes the relevant income streams in the totals.
        </p>
      </section>

      <section>
        <h2>Assumptions</h2>
        <p className="section-copy">
          Calculations depend entirely on the assumptions you enter (for example accrual,
          draw ages, contribution rates, inflation and growth settings). Where defaults
          exist, they are intended as a starting point rather than a recommendation.
        </p>
        <p className="section-copy">
          Governed pension rules are tracked separately in assumptions version{" "}
          <strong>{GOVERNED_ASSUMPTIONS_REGISTRY.version}</strong>, released on{" "}
          {GOVERNED_ASSUMPTIONS_REGISTRY.releasedOn}.
        </p>
        <GovernedAssumptionsTable />
      </section>

      <section>
        <h2>Limitations</h2>
        <ul className="section-copy">
          {MODELLER_LIMITATIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </StaticPageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MethodologyPage />
  </StrictMode>,
);
