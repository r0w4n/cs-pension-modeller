import { useState } from "react";
import { getSettingsSignature } from "../../app-domains";
import type { PensionSettings } from "../../settings";
import type {
  OptimisationResult,
  OptimisationTarget,
  StrategyRankingMode,
} from "./optimiserTypes";
import { optimiseRetirementPlanAsync } from "./retirementOptimiser";
import {
  getDefaultOptimisationSearchSpace,
  getDefaultOptimisationTarget,
} from "./strategyEvaluator";

export type OptimiserSearchState = {
  maxMonthlyContribution: number;
  includeAddedPension: boolean;
  includePartialRetirement: boolean;
  rankingMode: StrategyRankingMode;
};

export type OptimiserProgress = {
  evaluated: number;
  total: number;
};

export type OptimiserController = {
  searchState: OptimiserSearchState;
  result: OptimisationResult | null;
  isRunning: boolean;
  progress: OptimiserProgress | null;
  updateSearchState: <K extends keyof OptimiserSearchState>(
    key: K,
    value: OptimiserSearchState[K]
  ) => void;
  runOptimiser: (settings: PensionSettings) => Promise<void>;
};

type OptimiserResultState = {
  settingsSignature: string;
  result: OptimisationResult;
};

export function useOptimiserController(
  settings: PensionSettings
): OptimiserController {
  const currentSettingsSignature = getSettingsSignature(settings);
  const [searchState, setSearchState] = useState<OptimiserSearchState>({
    maxMonthlyContribution: 2_000,
    includeAddedPension: settings.showAlpha,
    includePartialRetirement: settings.partialRetirementEnabled,
    rankingMode: "earliest-retirement",
  });
  const [isRunning, setIsRunning] = useState(false);
  const [resultState, setResultState] = useState<OptimiserResultState | null>(
    null
  );
  const [progress, setProgress] = useState<OptimiserProgress | null>(null);
  const result =
    resultState?.settingsSignature === currentSettingsSignature
      ? resultState.result
      : null;

  function updateSearchState<K extends keyof OptimiserSearchState>(
    key: K,
    value: OptimiserSearchState[K]
  ) {
    setSearchState((current) => ({
      ...current,
      [key]: value,
    }));
    setResultState(null);
  }

  async function runOptimiser(currentSettings: PensionSettings) {
    setIsRunning(true);
    setProgress({ evaluated: 0, total: 120 });

    try {
      const target: OptimisationTarget =
        getDefaultOptimisationTarget(currentSettings);
      const { searchSpace } = getDefaultOptimisationSearchSpace({
        settings: currentSettings,
        targetRetirementAge: target.targetRetirementAge,
        maxMonthlyContribution: searchState.maxMonthlyContribution,
        includeAddedPension:
          currentSettings.showAlpha && searchState.includeAddedPension,
        includePartialRetirement:
          currentSettings.partialRetirementEnabled &&
          searchState.includePartialRetirement,
      });

      const nextResult = await optimiseRetirementPlanAsync(
        {
          settings: currentSettings,
          target,
          searchSpace,
          rankingMode: searchState.rankingMode,
          maxCandidatesEvaluated: 120,
          maxReturnedStrategies: 3,
        },
        {
          onProgress: setProgress,
        }
      );

      setResultState({
        settingsSignature: getSettingsSignature(currentSettings),
        result: nextResult,
      });
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  }

  return {
    searchState,
    result,
    isRunning,
    progress,
    updateSearchState,
    runOptimiser,
  };
}
