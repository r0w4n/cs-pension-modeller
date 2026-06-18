import {
  calculateStatePensionDrawAge,
  type PensionSettings,
} from "../../settings";
import type {
  CandidateStrategy,
  EvaluatedStrategy,
  OptimisationResult,
  OptimiserInput,
} from "./optimiserTypes";
import {
  createSearchSpaceAroundStrategies,
  generateCandidateStrategies,
} from "./strategyGenerator";
import { evaluateStrategy } from "./strategyEvaluator";
import { deduplicateStrategies, rankStrategies } from "./strategyRanker";

const DEFAULT_MAX_CANDIDATES_EVALUATED = 120;
const DEFAULT_MAX_RETURNED_STRATEGIES = 8;
const REFINEMENT_SEED_COUNT = 6;
const EVALUATION_CHUNK_SIZE = 6;

export function optimiseRetirementPlan(
  input: OptimiserInput
): OptimisationResult {
  const maxCandidatesEvaluated =
    input.maxCandidatesEvaluated ?? DEFAULT_MAX_CANDIDATES_EVALUATED;
  const maxReturnedStrategies =
    input.maxReturnedStrategies ?? DEFAULT_MAX_RETURNED_STRATEGIES;
  const coarseBudget = Math.max(1, Math.floor(maxCandidatesEvaluated * 0.6));
  const coarse = generateCandidateStrategies(input.searchSpace, {
    normalPensionAge: input.settings.normalPensionAge,
    nuvosDrawAge: getNuvosDrawAge(
      input.settings,
      input.target.targetRetirementAge
    ),
    statePensionAge: input.settings.showStatePension
      ? calculateStatePensionDrawAge(
          input.settings.dateOfBirth,
          input.settings.statePensionDrawDate
        )
      : null,
    maxCandidates: coarseBudget,
  });
  const coarseEvaluated = coarse.candidates.map((candidate) =>
    evaluateStrategy({
      settings: input.settings,
      candidate,
      target: input.target,
    })
  );
  const coarseRanked = rankStrategies(coarseEvaluated, input.rankingMode);
  const refinementSeeds = coarseRanked
    .slice(0, REFINEMENT_SEED_COUNT)
    .map<CandidateStrategy>((strategy) => strategy);
  const refinedSearchSpace = createSearchSpaceAroundStrategies({
    baseSearchSpace: input.searchSpace,
    strategies: refinementSeeds,
    contributionStep: 50,
    contributionWindow: 150,
  });
  const refinedBudget = Math.max(
    0,
    maxCandidatesEvaluated - coarse.candidates.length
  );
  const refined = generateCandidateStrategies(refinedSearchSpace, {
    normalPensionAge: input.settings.normalPensionAge,
    nuvosDrawAge: getNuvosDrawAge(
      input.settings,
      input.target.targetRetirementAge
    ),
    statePensionAge: input.settings.showStatePension
      ? calculateStatePensionDrawAge(
          input.settings.dateOfBirth,
          input.settings.statePensionDrawDate
        )
      : null,
    maxCandidates: refinedBudget,
  });
  const seenCandidates = new Set(
    coarse.candidates.map((candidate) => candidate.id)
  );
  const refinedEvaluated = refined.candidates
    .filter((candidate) => !seenCandidates.has(candidate.id))
    .map((candidate) =>
      evaluateStrategy({
        settings: input.settings,
        candidate,
        target: input.target,
      })
    );
  const ranked = deduplicateStrategies(
    rankStrategies([...coarseEvaluated, ...refinedEvaluated], input.rankingMode)
  );
  const strategies = ranked
    .filter((strategy) => strategy.viable)
    .slice(0, maxReturnedStrategies);
  const nearMisses = ranked
    .filter((strategy) => !strategy.viable)
    .slice(0, maxReturnedStrategies);

  return {
    target: input.target,
    rankingMode: input.rankingMode,
    strategies,
    nearMisses,
    evaluatedCandidateCount: coarseEvaluated.length + refinedEvaluated.length,
    generatedCandidateCount:
      coarse.generatedCandidateCount + refined.generatedCandidateCount,
    searchSpaceWarning:
      [coarse.warning, refined.warning].filter(Boolean).join(" ").trim() ||
      null,
    caps: {
      maxCandidatesEvaluated,
      maxReturnedStrategies,
    },
  };
}

export async function optimiseRetirementPlanAsync(
  input: OptimiserInput,
  options: {
    onProgress?: (progress: { evaluated: number; total: number }) => void;
  } = {}
): Promise<OptimisationResult> {
  const maxCandidatesEvaluated =
    input.maxCandidatesEvaluated ?? DEFAULT_MAX_CANDIDATES_EVALUATED;
  const maxReturnedStrategies =
    input.maxReturnedStrategies ?? DEFAULT_MAX_RETURNED_STRATEGIES;
  const coarseBudget = Math.max(1, Math.floor(maxCandidatesEvaluated * 0.6));
  const commonGenerationOptions = {
    normalPensionAge: input.settings.normalPensionAge,
    nuvosDrawAge: getNuvosDrawAge(
      input.settings,
      input.target.targetRetirementAge
    ),
    statePensionAge: input.settings.showStatePension
      ? calculateStatePensionDrawAge(
          input.settings.dateOfBirth,
          input.settings.statePensionDrawDate
        )
      : null,
  };
  const coarse = generateCandidateStrategies(input.searchSpace, {
    ...commonGenerationOptions,
    maxCandidates: coarseBudget,
  });
  const coarseEvaluated = await evaluateCandidatesInChunks({
    input,
    candidates: coarse.candidates,
    totalCandidateCount: maxCandidatesEvaluated,
    alreadyEvaluatedCount: 0,
    onProgress: options.onProgress,
  });
  const coarseRanked = rankStrategies(coarseEvaluated, input.rankingMode);
  const refinementSeeds = coarseRanked
    .slice(0, REFINEMENT_SEED_COUNT)
    .map<CandidateStrategy>((strategy) => strategy);
  const refinedSearchSpace = createSearchSpaceAroundStrategies({
    baseSearchSpace: input.searchSpace,
    strategies: refinementSeeds,
    contributionStep: 100,
    contributionWindow: 100,
  });
  const refinedBudget = Math.max(
    0,
    maxCandidatesEvaluated - coarse.candidates.length
  );
  const refined = generateCandidateStrategies(refinedSearchSpace, {
    ...commonGenerationOptions,
    maxCandidates: refinedBudget,
  });
  const seenCandidates = new Set(
    coarse.candidates.map((candidate) => candidate.id)
  );
  const refinedCandidates = refined.candidates.filter(
    (candidate) => !seenCandidates.has(candidate.id)
  );
  const refinedEvaluated = await evaluateCandidatesInChunks({
    input,
    candidates: refinedCandidates,
    totalCandidateCount: maxCandidatesEvaluated,
    alreadyEvaluatedCount: coarseEvaluated.length,
    onProgress: options.onProgress,
  });

  return createOptimisationResult({
    input,
    coarseWarning: coarse.warning,
    refinedWarning: refined.warning,
    coarseEvaluated,
    refinedEvaluated,
    generatedCandidateCount:
      coarse.generatedCandidateCount + refined.generatedCandidateCount,
    maxCandidatesEvaluated,
    maxReturnedStrategies,
  });
}

function createOptimisationResult(input: {
  input: OptimiserInput;
  coarseWarning: string | null;
  refinedWarning: string | null;
  coarseEvaluated: EvaluatedStrategy[];
  refinedEvaluated: EvaluatedStrategy[];
  generatedCandidateCount: number;
  maxCandidatesEvaluated: number;
  maxReturnedStrategies: number;
}) {
  const ranked = deduplicateStrategies(
    rankStrategies(
      [...input.coarseEvaluated, ...input.refinedEvaluated],
      input.input.rankingMode
    )
  );
  const strategies = ranked
    .filter((strategy) => strategy.viable)
    .slice(0, input.maxReturnedStrategies);
  const nearMisses = ranked
    .filter((strategy) => !strategy.viable)
    .slice(0, input.maxReturnedStrategies);

  return {
    target: input.input.target,
    rankingMode: input.input.rankingMode,
    strategies,
    nearMisses,
    evaluatedCandidateCount:
      input.coarseEvaluated.length + input.refinedEvaluated.length,
    generatedCandidateCount: input.generatedCandidateCount,
    searchSpaceWarning:
      [input.coarseWarning, input.refinedWarning]
        .filter(Boolean)
        .join(" ")
        .trim() || null,
    caps: {
      maxCandidatesEvaluated: input.maxCandidatesEvaluated,
      maxReturnedStrategies: input.maxReturnedStrategies,
    },
  };
}

async function evaluateCandidatesInChunks(input: {
  input: OptimiserInput;
  candidates: CandidateStrategy[];
  totalCandidateCount: number;
  alreadyEvaluatedCount: number;
  onProgress?: (progress: { evaluated: number; total: number }) => void;
}) {
  const evaluated: EvaluatedStrategy[] = [];

  for (
    let startIndex = 0;
    startIndex < input.candidates.length;
    startIndex += EVALUATION_CHUNK_SIZE
  ) {
    const chunk = input.candidates.slice(
      startIndex,
      startIndex + EVALUATION_CHUNK_SIZE
    );

    evaluated.push(
      ...chunk.map((candidate) =>
        evaluateStrategy({
          settings: input.input.settings,
          candidate,
          target: input.input.target,
        })
      )
    );
    input.onProgress?.({
      evaluated: input.alreadyEvaluatedCount + evaluated.length,
      total: input.totalCandidateCount,
    });

    await yieldToBrowser();
  }

  return evaluated;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });
}

function getNuvosDrawAge(
  settings: PensionSettings,
  targetRetirementAge: number
) {
  if (!settings.showNuvos) {
    return null;
  }

  return Math.max(targetRetirementAge, settings.nuvosPensionDrawAge);
}
