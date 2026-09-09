import { useEffect, useRef, useState } from "react";
import type { ComparisonScenario } from "../result-projection/comparison-result";
import type { ComparisonResultCache } from "./comparison-result-cache";
import type { RetirementPlanResultCache } from "./retirement-plan-result-cache";
import {
  loadStoredComparisonScenarios,
  saveStoredComparisonScenarios,
} from "./comparison-storage";

export function useComparisonState() {
  const skipNextComparisonSaveRef = useRef(false);
  const [comparisonScenarios, setComparisonScenarios] = useState<
    ComparisonScenario[]
  >(loadStoredComparisonScenarios);
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

    saveStoredComparisonScenarios(comparisonScenarios);
  }, [comparisonScenarios]);

  function resetComparisonScenarios() {
    skipNextComparisonSaveRef.current = true;
    setComparisonScenarios([]);
  }

  return {
    comparisonResultCache,
    retirementPlanResultCache,
    comparisonScenarios,
    resetComparisonScenarios,
    setComparisonScenarios,
  };
}
