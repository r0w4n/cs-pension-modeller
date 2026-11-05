import { useCallback, useEffect, useRef, useState } from "react";
import type { ComparisonScenario } from "../result-projection/comparison-result";
import type { ComparisonResultCache } from "./comparison-result-cache";
import type { RetirementPlanResultCache } from "./retirement-plan-result-cache";
import {
  loadStoredComparisonState,
  saveStoredComparisonScenarios,
} from "./comparison-storage";

export function useComparisonState() {
  const skipNextComparisonSaveRef = useRef(false);
  const [comparisonState, setComparisonState] = useState(
    loadStoredComparisonState
  );
  const { scenarios: comparisonScenarios, recoveryJson } = comparisonState;
  const setComparisonScenarios = useCallback(
    (scenarios: ComparisonScenario[]) => {
      setComparisonState((current) => ({ ...current, scenarios }));
    },
    []
  );
  const [comparisonResultCache] = useState<ComparisonResultCache>(
    () => new Map()
  );
  const [retirementPlanResultCache] = useState<RetirementPlanResultCache>(
    () => new Map()
  );

  useEffect(() => {
    if (skipNextComparisonSaveRef.current) {
      skipNextComparisonSaveRef.current = false;
      return;
    }

    if (recoveryJson === null) {
      saveStoredComparisonScenarios(comparisonScenarios);
    }
  }, [comparisonScenarios, recoveryJson]);

  function resetComparisonScenarios() {
    skipNextComparisonSaveRef.current = true;
    setComparisonState({ scenarios: [], recoveryJson: null });
    comparisonResultCache.clear();
    retirementPlanResultCache.clear();
  }

  function downloadComparisonRecovery() {
    if (recoveryJson === null) {
      return;
    }
    const blob = new Blob([recoveryJson], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = "cs-pension-comparison-recovery.json";
    window.document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return {
    comparisonResultCache,
    retirementPlanResultCache,
    comparisonScenarios,
    onDownloadComparisonRecovery:
      recoveryJson === null ? undefined : downloadComparisonRecovery,
    resetComparisonScenarios,
    setComparisonScenarios,
  };
}
