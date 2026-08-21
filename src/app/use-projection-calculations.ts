import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { RetirementIncomeDisplay } from "../projection";
import type { PensionSettings } from "../settings";
import {
  projectRetirementIncomeDisplay,
  projectRetirementPlanControls,
  projectRetirementPlanResult,
} from "../result-projection/retirement-results";
import {
  getCachedRetirementPlanResult,
  type RetirementPlanResultCache,
} from "./retirement-plan-result-cache";
import type { RetirementPlanCalculationWorkerResponse } from "./retirement-plan-calculation-worker";

export function useProjectionCalculations({
  settings,
  retirementIncomeDisplay,
  retirementPlanResultCache,
}: {
  settings: PensionSettings;
  retirementIncomeDisplay: RetirementIncomeDisplay;
  retirementPlanResultCache?: RetirementPlanResultCache;
}) {
  const deferredSettings = useDeferredValue(settings);
  const [retirementPlanResult, setRetirementPlanResult] = useState(() =>
    getCachedRetirementPlanResult({
      settings,
      cache: retirementPlanResultCache,
    })
  );
  const deferredSettingsSignature = useMemo(
    () => JSON.stringify(deferredSettings),
    [deferredSettings]
  );
  const settingsSignature = useMemo(() => JSON.stringify(settings), [settings]);
  const calculatedSettingsSignature = useMemo(
    () => JSON.stringify(retirementPlanResult.settings),
    [retirementPlanResult.settings]
  );

  useEffect(() => {
    if (deferredSettingsSignature === calculatedSettingsSignature) {
      return;
    }

    let active = true;
    const commitPlan = (plan: typeof retirementPlanResult) => {
      if (active) {
        setRetirementPlanResult(plan);
      }
    };
    const calculateOnMainThread = () => {
      queueMicrotask(() => {
        commitPlan(
          getCachedRetirementPlanResult({
            settings: deferredSettings,
            cache: retirementPlanResultCache,
          })
        );
      });
    };
    const cachedPlan = retirementPlanResultCache?.get(
      deferredSettingsSignature
    );

    if (cachedPlan) {
      queueMicrotask(() => commitPlan(cachedPlan));
      return () => {
        active = false;
      };
    }

    if (typeof Worker === "undefined") {
      calculateOnMainThread();
      return () => {
        active = false;
      };
    }

    let worker: Worker;

    try {
      worker = new Worker(
        new URL("./retirement-plan-calculation-worker.ts", import.meta.url),
        { type: "module" }
      );
    } catch {
      calculateOnMainThread();
      return () => {
        active = false;
      };
    }

    const handleMessage = (
      event: MessageEvent<RetirementPlanCalculationWorkerResponse>
    ) => {
      if (!active) {
        return;
      }

      if (!event.data.ok) {
        worker.terminate();
        calculateOnMainThread();
        return;
      }

      const result = getCachedRetirementPlanResult({
        settings: deferredSettings,
        cache: retirementPlanResultCache,
        precomputedPlan: event.data.result,
      });
      worker.terminate();
      commitPlan(result);
    };
    const handleError = () => {
      if (!active) {
        return;
      }

      worker.terminate();
      calculateOnMainThread();
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage(deferredSettings);

    return () => {
      active = false;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
    };
  }, [
    calculatedSettingsSignature,
    deferredSettings,
    deferredSettingsSignature,
    retirementPlanResultCache,
  ]);
  const resultsProjection = useMemo(
    () => projectRetirementPlanResult(retirementPlanResult),
    [retirementPlanResult]
  );
  const resultDisplayProjection = useMemo(
    () =>
      projectRetirementIncomeDisplay(
        retirementPlanResult,
        retirementIncomeDisplay,
        retirementPlanResult.settings.retirementIncomeTargetBasis
      ),
    [retirementIncomeDisplay, retirementPlanResult]
  );
  const resultControlProjection = useMemo(
    () => projectRetirementPlanControls(settings),
    [settings]
  );

  return {
    ...resultsProjection,
    ...resultDisplayProjection,
    ...resultControlProjection,
    deferredSettings,
    isProjectionPending: settingsSignature !== calculatedSettingsSignature,
    derivedInflationAssumptions: retirementPlanResult.inflationAssumptions,
    pensionSummary: retirementPlanResult.summary,
    projectionRows: retirementPlanResult.rows,
    retirementPlanResult,
    validationIssues: retirementPlanResult.validationIssues,
  };
}
