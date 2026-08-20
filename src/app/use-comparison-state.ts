import { useEffect, useState } from "react";
import type { ComparisonScenario } from "../app-domains";
import type { ComparisonResultCache } from "./comparison-result-cache";
import type { RetirementPlanResultCache } from "./retirement-plan-result-cache";
import {
  loadStoredComparisonScenarios,
  saveStoredComparisonScenarios,
} from "./comparison-storage";

export function useComparisonState() {
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
    saveStoredComparisonScenarios(comparisonScenarios);
  }, [comparisonScenarios]);

  return {
    comparisonResultCache,
    retirementPlanResultCache,
    comparisonScenarios,
    setComparisonScenarios,
  };
}
