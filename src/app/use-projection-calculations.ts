import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { RetirementIncomeDisplay } from "../projection";
import type { RetirementPlanResult } from "../calculation/retirement-plan";
import { validateSettings, type PensionSettings } from "../settings";
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
  calculationEnabled,
}: {
  settings: PensionSettings;
  retirementIncomeDisplay: RetirementIncomeDisplay;
  retirementPlanResultCache?: RetirementPlanResultCache;
  calculationEnabled: boolean;
}) {
  const deferredSettings = useDeferredValue(settings);
  const [retirementPlanResult, setRetirementPlanResult] =
    useState<RetirementPlanResult | null>(() =>
      calculationEnabled
        ? getCachedRetirementPlanResult({
            settings,
            cache: retirementPlanResultCache,
          })
        : null
    );
  const deferredSettingsSignature = useMemo(
    () => JSON.stringify(deferredSettings),
    [deferredSettings]
  );
  const settingsSignature = useMemo(() => JSON.stringify(settings), [settings]);
  const calculatedSettingsSignature = useMemo(
    () =>
      retirementPlanResult
        ? JSON.stringify(retirementPlanResult.settings)
        : null,
    [retirementPlanResult]
  );
  const latestSettingsSignatureRef = useRef(settingsSignature);
  latestSettingsSignatureRef.current = settingsSignature;

  useEffect(() => {
    if (!calculationEnabled) {
      return;
    }

    if (deferredSettingsSignature === calculatedSettingsSignature) {
      return;
    }

    let active = true;
    const commitPlan = (
      plan: RetirementPlanResult,
      planSettingsSignature: string
    ) => {
      if (
        active &&
        planSettingsSignature === latestSettingsSignatureRef.current
      ) {
        setRetirementPlanResult(plan);
      }
    };
    const calculateOnMainThread = () => {
      commitPlan(
        getCachedRetirementPlanResult({
          settings: deferredSettings,
          cache: retirementPlanResultCache,
        }),
        deferredSettingsSignature
      );
    };
    const cachedPlan = retirementPlanResultCache?.get(
      deferredSettingsSignature
    );

    if (cachedPlan) {
      commitPlan(cachedPlan, deferredSettingsSignature);
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
      commitPlan(result, deferredSettingsSignature);
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
    calculationEnabled,
    deferredSettings,
    deferredSettingsSignature,
    retirementPlanResultCache,
  ]);
  const resultsProjection = useMemo(
    () =>
      retirementPlanResult
        ? projectRetirementPlanResult(retirementPlanResult)
        : null,
    [retirementPlanResult]
  );
  const resultDisplayProjection = useMemo(
    () =>
      retirementPlanResult
        ? projectRetirementIncomeDisplay(
            retirementPlanResult,
            retirementIncomeDisplay,
            retirementPlanResult.settings.retirementIncomeTargetBasis
          )
        : null,
    [retirementIncomeDisplay, retirementPlanResult]
  );
  const resultControlProjection = useMemo(
    () => projectRetirementPlanControls(settings),
    [settings]
  );
  const validationIssues = useMemo(
    () => validateSettings(settings),
    [settings]
  );

  return {
    retirementIncomeSeries: resultsProjection?.retirementIncomeSeries ?? [],
    flexibleWithdrawalSummary: resultsProjection?.flexibleWithdrawalSummary ?? {
      accounts: [],
      residualAccounts: [],
      affectedAges: [],
      totalReducibleGrossWithdrawal: 0,
      totalAvoidableNetSurplus: 0,
      largestAnnualAvoidableSurplus: 0,
    },
    targetBasedWithdrawalPreviews:
      resultsProjection?.targetBasedWithdrawalPreviews ?? [],
    incomeAgeRangeItems: resultDisplayProjection?.incomeAgeRangeItems ?? [],
    ...resultControlProjection,
    deferredSettings,
    isProjectionPending:
      calculationEnabled && settingsSignature !== calculatedSettingsSignature,
    derivedInflationAssumptions:
      retirementPlanResult?.inflationAssumptions ?? null,
    pensionSummary: retirementPlanResult?.summary ?? null,
    projectionRows: retirementPlanResult?.rows ?? [],
    retirementPlanResult,
    validationIssues,
  };
}
