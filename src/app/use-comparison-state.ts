import { useEffect, useState } from "react";
import {
  loadStoredComparisonScenarios,
  saveStoredComparisonScenarios,
  type ComparisonResultCache,
  type ComparisonScenario,
} from "../app-domains";

export function useComparisonState() {
  const [comparisonScenarios, setComparisonScenarios] = useState<
    ComparisonScenario[]
  >(loadStoredComparisonScenarios);
  const [comparisonResultCache] = useState<ComparisonResultCache>(
    () => new Map()
  );

  useEffect(() => {
    saveStoredComparisonScenarios(comparisonScenarios);
  }, [comparisonScenarios]);

  return {
    comparisonResultCache,
    comparisonScenarios,
    setComparisonScenarios,
  };
}
