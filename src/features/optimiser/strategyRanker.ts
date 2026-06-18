import type { EvaluatedStrategy, StrategyRankingMode } from "./optimiserTypes";

export function rankStrategies(
  strategies: EvaluatedStrategy[],
  rankingMode: StrategyRankingMode
) {
  return strategies
    .map((strategy) => ({
      ...strategy,
      rankingScore: calculateRankingScore(strategy, rankingMode),
    }))
    .sort((first, second) => {
      if (first.viable !== second.viable) {
        return first.viable ? -1 : 1;
      }

      return first.rankingScore - second.rankingScore;
    });
}

export function deduplicateStrategies(strategies: EvaluatedStrategy[]) {
  const seen = new Set<string>();

  return strategies.filter((strategy) => {
    const key = [
      strategy.viable ? "viable" : "near-miss",
      strategy.retirementAge,
      strategy.alphaDrawAge,
      Math.round(strategy.totalMonthlyContribution / 50) * 50,
      strategy.withdrawalOrder,
      strategy.withdrawalStrategy,
      strategy.partialRetirementEnabled
        ? `${strategy.partialRetirementStartAge}-${strategy.partialRetirementWorkPercent}`
        : "partial-off",
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function calculateRankingScore(
  strategy: EvaluatedStrategy,
  rankingMode: StrategyRankingMode
) {
  const viabilityPenalty = strategy.viable
    ? 0
    : Math.abs(strategy.projectedSurplusOrShortfall) / 10;
  const targetFitPenalty = strategy.viable
    ? strategy.scoreBreakdown.surplusScore * 0.75
    : 0;

  if (rankingMode === "earliest-retirement") {
    return (
      strategy.retirementAge * 10_000 +
      strategy.totalMonthlyContribution +
      targetFitPenalty +
      viabilityPenalty
    );
  }

  if (rankingMode === "lowest-complexity") {
    return (
      strategy.scoreBreakdown.complexityScore * 10_000 +
      strategy.totalMonthlyContribution +
      strategy.retirementAge * 100 +
      targetFitPenalty +
      viabilityPenalty
    );
  }

  return (
    strategy.totalMonthlyContribution * 10 +
    targetFitPenalty +
    strategy.retirementAge * 100 +
    strategy.scoreBreakdown.complexityScore * 25 +
    viabilityPenalty
  );
}
