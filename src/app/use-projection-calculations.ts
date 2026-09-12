import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  invalidationToken = 0,
}: {
  settings: PensionSettings;
  retirementIncomeDisplay: RetirementIncomeDisplay;
  retirementPlanResultCache?: RetirementPlanResultCache;
  calculationEnabled: boolean;
  invalidationToken?: number;
}) {
  const deferredSettings = useDeferredValue(settings);
  const [retirementPlanState, setRetirementPlanState] = useState<{
    result: RetirementPlanResult | null;
    invalidationToken: number;
  }>(() => ({
    result: calculationEnabled
      ? getCachedRetirementPlanResult({
          settings,
          cache: retirementPlanResultCache,
        })
      : null,
    invalidationToken,
  }));
  const [calculationErrorState, setCalculationErrorState] = useState<{
    settingsSignature: string | null;
    invalidationToken: number;
  }>({
    settingsSignature: null,
    invalidationToken,
  });
  const deferredSettingsSignature = useMemo(
    () => JSON.stringify(deferredSettings),
    [deferredSettings]
  );
  const settingsSignature = useMemo(() => JSON.stringify(settings), [settings]);
  const retirementPlanResult =
    retirementPlanState.invalidationToken === invalidationToken
      ? retirementPlanState.result
      : null;
  const calculationError =
    calculationErrorState.invalidationToken === invalidationToken &&
    calculationErrorState.settingsSignature !== null;
  const calculatedSettingsSignature = useMemo(
    () =>
      retirementPlanResult
        ? JSON.stringify(retirementPlanResult.settings)
        : null,
    [retirementPlanResult]
  );
  const latestSettingsSignatureRef = useRef(settingsSignature);
  latestSettingsSignatureRef.current = settingsSignature;

  const clearCalculationState = useCallback(() => {
    setRetirementPlanState({ result: null, invalidationToken });
    setCalculationErrorState({
      settingsSignature: null,
      invalidationToken,
    });
  }, [invalidationToken]);

  const retryFailedCalculation = useCallback(() => {
    setCalculationErrorState({
      settingsSignature: null,
      invalidationToken,
    });
  }, [invalidationToken]);

  useEffect(() => {
    if (!calculationEnabled) {
      return;
    }

    if (deferredSettingsSignature === calculatedSettingsSignature) {
      return;
    }

    if (
      calculationErrorState.invalidationToken === invalidationToken &&
      calculationErrorState.settingsSignature === deferredSettingsSignature
    ) {
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
        setCalculationErrorState({
          settingsSignature: null,
          invalidationToken,
        });
        setRetirementPlanState({ result: plan, invalidationToken });
      }
    };
    const calculateOnMainThread = () => {
      try {
        commitPlan(
          getCachedRetirementPlanResult({
            settings: deferredSettings,
            cache: retirementPlanResultCache,
          }),
          deferredSettingsSignature
        );
      } catch {
        if (
          active &&
          deferredSettingsSignature === latestSettingsSignatureRef.current
        ) {
          setRetirementPlanState({ result: null, invalidationToken });
          setCalculationErrorState({
            settingsSignature: deferredSettingsSignature,
            invalidationToken,
          });
        }
      }
    };
    let cachedPlan: RetirementPlanResult | undefined;

    try {
      cachedPlan = retirementPlanResultCache?.get(deferredSettingsSignature);
    } catch {
      calculateOnMainThread();
      return () => {
        active = false;
      };
    }

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
    try {
      worker.postMessage(deferredSettings);
    } catch {
      worker.terminate();
      calculateOnMainThread();
    }

    return () => {
      active = false;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
    };
  }, [
    calculatedSettingsSignature,
    calculationEnabled,
    calculationErrorState,
    deferredSettings,
    deferredSettingsSignature,
    invalidationToken,
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
      calculationEnabled &&
      !calculationError &&
      settingsSignature !== calculatedSettingsSignature,
    calculationError,
    derivedInflationAssumptions:
      retirementPlanResult?.inflationAssumptions ?? null,
    pensionSummary: retirementPlanResult?.summary ?? null,
    projectionRows: retirementPlanResult?.rows ?? [],
    retirementPlanResult,
    clearCalculationState,
    retryFailedCalculation,
    validationIssues,
  };
}
