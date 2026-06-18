import { useMemo } from "react";
import {
  createBridgeChartLimits,
  createBridgeChartParameters,
  createRetirementIncomeSeries,
} from "../../app-domains";
import { ComparisonBridgeChart } from "../../app/chart";
import { createProjectionTable } from "../../projection";
import { formatCurrency, type PensionSettings } from "../../settings";
import type {
  EvaluatedStrategy,
  OptimisationResult,
  OptimisationTarget,
  OptimiserWithdrawalStrategy,
  WithdrawalOrder,
} from "./optimiserTypes";
import { createStrategyProjectionSettings } from "./strategyEvaluator";

type OptimiserResultsProps = {
  settings: PensionSettings;
  result: OptimisationResult | null;
  isRunning: boolean;
  progress: { evaluated: number; total: number } | null;
  comparisonLimitReached: boolean;
  onAddToComparison: (
    scenarioSettings: PensionSettings,
    scenarioName: string
  ) => void;
};

export function OptimiserResults({
  settings,
  result,
  isRunning,
  progress,
  comparisonLimitReached,
  onAddToComparison,
}: OptimiserResultsProps) {
  if (isRunning) {
    return (
      <section className="optimiser-results" aria-live="polite">
        <h3>Searching modelled options</h3>
        <p className="section-copy">
          The optimiser is checking contribution, draw age, reduced-hours and
          withdrawal combinations using the current deterministic assumptions.
        </p>
        {progress ? (
          <p className="section-copy">
            Checked {progress.evaluated.toLocaleString("en-GB")} of about{" "}
            {progress.total.toLocaleString("en-GB")} capped candidates.
          </p>
        ) : null}
      </section>
    );
  }

  if (!result) {
    return (
      <section className="optimiser-results" aria-live="polite">
        <h3>Run the optimiser from the search settings step</h3>
        <p className="section-copy">
          The modelled routes will appear here after the optimiser has searched
          the saved assumptions and target.
        </p>
      </section>
    );
  }

  const displayStrategies =
    result.strategies.length > 0 ? result.strategies : result.nearMisses;

  return (
    <section className="optimiser-results" aria-live="polite">
      <div className="optimiser-status-grid">
        <div>
          <span className="card-label">Result</span>
          <strong>
            {result.strategies.length > 0
              ? "Modelled routes found"
              : "No fully viable route found"}
          </strong>
          <p className="section-copy">
            {result.strategies.length > 0
              ? `The optimiser found ${result.strategies.length} potential route${result.strategies.length === 1 ? "" : "s"} that meet the selected target under the current assumptions.`
              : "No strategy in the selected search range fully meets the target. The nearest modelled options are shown below."}
          </p>
        </div>
        <div>
          <span className="card-label">Search</span>
          <strong>
            {result.evaluatedCandidateCount.toLocaleString("en-GB")} checked
          </strong>
          <p className="section-copy">
            Hard cap:{" "}
            {result.caps.maxCandidatesEvaluated.toLocaleString("en-GB")}{" "}
            candidates. Returned at most {result.caps.maxReturnedStrategies}{" "}
            options.
          </p>
        </div>
      </div>

      {result.searchSpaceWarning ? (
        <p className="optimiser-warning">{result.searchSpaceWarning}</p>
      ) : null}

      <div className="optimiser-result-list">
        {displayStrategies.map((strategy, index) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            index={index}
            showNearMiss={!strategy.viable}
            settings={settings}
            target={result.target}
            comparisonLimitReached={comparisonLimitReached}
            onAddToComparison={onAddToComparison}
          />
        ))}
      </div>
    </section>
  );
}

function StrategyCard({
  strategy,
  index,
  showNearMiss,
  settings,
  target,
  comparisonLimitReached,
  onAddToComparison,
}: {
  strategy: EvaluatedStrategy;
  index: number;
  showNearMiss: boolean;
  settings: PensionSettings;
  target: OptimisationTarget;
  comparisonLimitReached: boolean;
  onAddToComparison: (
    scenarioSettings: PensionSettings,
    scenarioName: string
  ) => void;
}) {
  const scenarioName = `${showNearMiss ? "Near miss" : `Option ${index + 1}`} - ${formatCurrency(strategy.totalMonthlyContribution)}/month`;

  return (
    <article className="optimiser-result-card">
      <div className="optimiser-result-card-heading">
        <div>
          <span className="card-label">
            {showNearMiss ? "Near miss" : `Option ${index + 1}`}
          </span>
          <h3>{formatCurrency(strategy.totalMonthlyContribution)}/month</h3>
        </div>
        <span
          className={
            strategy.viable ? "status-pill" : "status-pill status-pill--warn"
          }
        >
          {strategy.viable ? "Meets target" : "Shortfall"}
        </span>
      </div>

      <p className="section-copy">{strategy.explanation}</p>

      <button
        type="button"
        className="secondary-button optimiser-add-comparison-button"
        disabled={comparisonLimitReached}
        onClick={() =>
          onAddToComparison(
            createStrategyProjectionSettings({
              settings,
              candidate: strategy,
              target,
            }),
            scenarioName
          )
        }
      >
        {comparisonLimitReached
          ? "Comparison limit reached"
          : "Add to comparison"}
      </button>

      <dl className="optimiser-metrics">
        <div>
          <dt>SIPP / ISA / added pension</dt>
          <dd>
            {formatCurrency(strategy.monthlySippContribution)} /{" "}
            {formatCurrency(strategy.monthlyIsaContribution)} /{" "}
            {formatCurrency(strategy.monthlyAddedPensionContribution)}
          </dd>
        </div>
        <div>
          <dt>Retirement age</dt>
          <dd>{strategy.retirementAge}</dd>
        </div>
        <div>
          <dt>Partial retirement</dt>
          <dd>
            {strategy.partialRetirementEnabled
              ? `From ${strategy.partialRetirementStartAge} at ${strategy.partialRetirementWorkPercent}%`
              : "Not modelled"}
          </dd>
        </div>
        <div>
          <dt>Alpha draw age</dt>
          <dd>
            {strategy.alphaDrawAge}{" "}
            {strategy.alphaTakenEarly ? "(early draw)" : "(Normal Pension Age)"}
          </dd>
        </div>
        <div>
          <dt>Alpha after reduction</dt>
          <dd>
            {formatCurrency(strategy.annualAlphaPensionAfterReduction)}/year
          </dd>
        </div>
        <div>
          <dt>Withdrawal order</dt>
          <dd>{formatWithdrawalOrder(strategy.withdrawalOrder)}</dd>
        </div>
        <div>
          <dt>Withdrawal strategy</dt>
          <dd>{formatWithdrawalStrategy(strategy.withdrawalStrategy)}</dd>
        </div>
        <div>
          <dt>Bridge before Alpha</dt>
          <dd>
            {strategy.bridgeYearsBeforeAlphaStarts === 0
              ? "None"
              : `${strategy.bridgeYearsBeforeAlphaStarts} year${strategy.bridgeYearsBeforeAlphaStarts === 1 ? "" : "s"}`}
          </dd>
        </div>
        <div>
          <dt>Lowest bridge balance</dt>
          <dd>{formatCurrency(strategy.lowestProjectedBridgeBalance)}</dd>
        </div>
        <div>
          <dt>{strategy.viable ? "Modelled surplus" : "Modelled shortfall"}</dt>
          <dd>
            {formatCurrency(Math.abs(strategy.projectedSurplusOrShortfall))}
          </dd>
        </div>
        {strategy.nuvosDrawAge ? (
          <div>
            <dt>nuvos draw age</dt>
            <dd>{strategy.nuvosDrawAge}</dd>
          </div>
        ) : null}
        {strategy.statePensionAge ? (
          <div>
            <dt>State Pension age</dt>
            <dd>{strategy.statePensionAge}</dd>
          </div>
        ) : null}
        {strategy.firstFailureAge ? (
          <div>
            <dt>First failure age</dt>
            <dd>{strategy.firstFailureAge}</dd>
          </div>
        ) : null}
      </dl>

      <StrategyOutcomeChart
        settings={settings}
        strategy={strategy}
        target={target}
      />
    </article>
  );
}

function StrategyOutcomeChart({
  settings,
  strategy,
  target,
}: {
  settings: PensionSettings;
  strategy: EvaluatedStrategy;
  target: OptimisationTarget;
}) {
  const chart = useMemo(() => {
    const strategySettings = createStrategyProjectionSettings({
      settings,
      candidate: strategy,
      target,
    });
    const projectionRows = createProjectionTable(strategySettings);

    return {
      bridgeChartLimits: createBridgeChartLimits(strategySettings),
      bridgeChartParameters: createBridgeChartParameters(strategySettings),
      retirementIncomeSeries: createRetirementIncomeSeries(
        projectionRows,
        strategySettings
      ),
    };
  }, [settings, strategy, target]);

  return (
    <div className="optimiser-result-chart">
      <ComparisonBridgeChart
        retirementIncomeSeries={chart.retirementIncomeSeries}
        bridgeChartParameters={chart.bridgeChartParameters}
        bridgeChartLimits={chart.bridgeChartLimits}
        hideInactiveLegendItems
        readOnly
      />
    </div>
  );
}

function formatWithdrawalOrder(withdrawalOrder: WithdrawalOrder) {
  if (withdrawalOrder === "isa-first") {
    return "ISA first, then SIPP";
  }

  if (withdrawalOrder === "sipp-first") {
    return "SIPP first, then ISA";
  }

  return "Blended ISA and SIPP";
}

function formatWithdrawalStrategy(strategy: OptimiserWithdrawalStrategy) {
  if (strategy === "zero_at_death") {
    return "Zero at death";
  }

  if (strategy === "percentage") {
    return "Annual percentage";
  }

  return "Use by age";
}
