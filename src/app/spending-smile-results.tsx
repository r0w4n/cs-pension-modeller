import { useEffect, useMemo } from "react";
import { trackAnalyticsEvent } from "../analytics";
import {
  createBridgeSpendingPhaseOutcomes,
  type SpendingPhaseOutcome,
} from "../app-domains";
import type { RetirementBridgeAnalysis } from "../projection";
import {
  getRlsClassificationLabel,
  retirementLivingStandards,
} from "../spending-smile";
import { formatCurrency, type PensionSettings } from "../settings";

const phaseLabels = {
  GO_GO: "Go-go",
  SLOW_GO: "Slow-go",
  NO_GO: "No-go",
} as const;

export function SpendingSmileResults({
  settings,
  analysis,
}: {
  settings: PensionSettings;
  analysis: RetirementBridgeAnalysis;
}) {
  const outcomes = useMemo(
    () => createBridgeSpendingPhaseOutcomes(analysis, settings),
    [analysis, settings]
  );

  useEffect(() => {
    trackAnalyticsEvent("spending_smile_results_viewed", {
      household_type: settings.spendingSmile.householdType,
      expert_mode: true,
    });
  }, [settings.spendingSmile.householdType]);

  if (settings.spendingStrategyType !== "SPENDING_SMILE") {
    return null;
  }

  const activeOutcomes = outcomes.filter(
    (outcome) => outcome.status !== "NOT_REACHED"
  );
  const allActiveFunded =
    activeOutcomes.length > 0 &&
    activeOutcomes.every((outcome) => outcome.fullyFunded);
  const laterShortfall = outcomes.find(
    (outcome) =>
      outcome.phase !== "GO_GO" && outcome.status === "PARTIALLY_FUNDED"
  );
  const goGoFunded = outcomes[0]?.fullyFunded;

  return (
    <section className="spending-smile-results" aria-labelledby="smile-results">
      <div className="section-heading">
        <p className="eyebrow">Today&apos;s money</p>
        <h2 id="smile-results">Spending Smile</h2>
        <p className="section-copy">
          Phase-by-phase results for your modelled spending target. These are
          planning estimates rather than guaranteed outcomes.
        </p>
      </div>

      <div className="summary-table-shell" tabIndex={0}>
        <table>
          <caption className="visually-hidden">
            Spending Smile phase funding results
          </caption>
          <thead>
            <tr>
              <th scope="col">Phase</th>
              <th scope="col">Ages</th>
              <th scope="col">Annual target</th>
              <th scope="col">RLS comparison</th>
              <th scope="col">Modelled result</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((outcome) => (
              <OutcomeRow
                key={outcome.phase}
                outcome={outcome}
                settings={settings}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="spending-smile-result-messages">
        {outcomes.map((outcome) => (
          <PhaseResultMessage
            key={outcome.phase}
            outcome={outcome}
            settings={settings}
          />
        ))}
      </div>

      <section className="spending-smile-recommendations">
        <h3>Options to explore</h3>
        {allActiveFunded ? (
          <p>
            All Spending Smile phases reached in this projection meet their
            targets. Review the phase ages and spending assumptions to confirm
            that they reflect the retirement lifestyle you want to model.
          </p>
        ) : goGoFunded && laterShortfall ? (
          <p>
            Your Go-go target is met, but a shortfall begins during the{" "}
            {phaseLabels[laterShortfall.phase]} years. Explore reducing
            early-retirement spending, moving the next phase earlier, retiring
            later or increasing retirement savings.
          </p>
        ) : (
          <p>
            One or more phase targets are not fully met in this projection.
            Compare different spending targets, phase ages, retirement dates and
            savings assumptions.
          </p>
        )}
        <p>
          No monetary adjustment is shown unless an alternative scenario has
          been fully recalculated.
        </p>
      </section>

      <p className="spending-smile-warning">
        Pensions UK/Loughborough University Retirement Living Standards are
        annual expenditure benchmarks, not gross income figures, and exclude
        rent and mortgage payments. Add any expected housing costs to your
        target.
      </p>
    </section>
  );
}

function OutcomeRow({
  outcome,
  settings,
}: {
  outcome: SpendingPhaseOutcome;
  settings: PensionSettings;
}) {
  return (
    <tr>
      <th scope="row">{phaseLabels[outcome.phase]}</th>
      <td>{formatAgeRange(outcome, settings.lifeExpectancy)}</td>
      <td>{formatCurrency(getPhaseTarget(outcome, settings))}</td>
      <td>{getRlsClassificationLabel(outcome.rlsClassification)}</td>
      <td>{formatStatus(outcome)}</td>
    </tr>
  );
}

function PhaseResultMessage({
  outcome,
  settings,
}: {
  outcome: SpendingPhaseOutcome;
  settings: PensionSettings;
}) {
  const phase = phaseLabels[outcome.phase];
  const target = getPhaseTarget(outcome, settings);
  const household =
    settings.spendingSmile.householdType === "ONE_PERSON"
      ? "one-person"
      : "two-person";

  if (outcome.status === "NOT_REACHED") {
    return (
      <p>
        {phase} is not reached because it starts after the end of the current
        projection.
      </p>
    );
  }

  return (
    <div>
      <p>
        Your {phase} target of {formatCurrency(target)} per year{" "}
        {outcome.fullyFunded
          ? `is fully funded from age ${outcome.startAge} to ${Math.min(
              outcome.endAge ?? settings.lifeExpectancy,
              settings.lifeExpectancy
            )} in this projection.`
          : `is ${Math.round(Math.min(1, outcome.fundingRatio) * 100)}% funded across the years included in this projection.`}
      </p>
      {outcome.firstShortfallAge !== null ? (
        <p>
          A modelled annual shortfall begins at age {outcome.firstShortfallAge}.
        </p>
      ) : null}
      <p>
        This target is{" "}
        {getRlsClassificationLabel(outcome.rlsClassification).toLowerCase()} for
        a {household} household.
      </p>
      {outcome.rlsClassification === "BELOW_MINIMUM" ? (
        <p className="spending-smile-warning">
          This phase is below the current Retirement Living Standards Minimum
          for the selected household type. The benchmark also excludes rent and
          mortgage costs.
        </p>
      ) : null}
    </div>
  );
}

function getPhaseTarget(
  outcome: SpendingPhaseOutcome,
  settings: PensionSettings
) {
  if (outcome.phase === "GO_GO") {
    return settings.spendingSmile.goGo.annualAmountReal;
  }
  if (outcome.phase === "SLOW_GO") {
    return settings.spendingSmile.slowGo.annualAmountReal;
  }
  return settings.spendingSmile.noGo.annualAmountReal;
}

function formatAgeRange(outcome: SpendingPhaseOutcome, lifeExpectancy: number) {
  if (outcome.status === "NOT_REACHED") {
    return `From ${outcome.startAge}`;
  }
  return `${outcome.startAge}–${Math.min(
    outcome.endAge ?? lifeExpectancy,
    lifeExpectancy
  )}`;
}

function formatStatus(outcome: SpendingPhaseOutcome) {
  if (outcome.status === "NOT_REACHED") {
    return "Not reached";
  }
  if (outcome.status === "FULLY_FUNDED") {
    return "Fully funded";
  }
  return `${Math.round(Math.min(1, outcome.fundingRatio) * 100)}% funded`;
}

export const spendingSmileRlsVersion = retirementLivingStandards.version;
