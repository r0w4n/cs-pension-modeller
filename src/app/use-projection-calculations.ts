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
  getRetirementPlanCacheKey,
  type RetirementPlanResultCache,
} from "./retirement-plan-result-cache";
import type { RetirementPlanCalculationWorkerResponse } from "./retirement-plan-calculation-worker";

const FAST_CALCULATION_OPTIONS = {
  includeTargetBasedWithdrawalPreviews: false,
} as const;

const FULL_CALCULATION_OPTIONS = {
  includeTargetBasedWithdrawalPreviews: true,
} as const;

type PreviewCalculationState = {
  settingsSignature: string | null;
  invalidationToken: number;
  requestId: number | null;
  status: "idle" | "pending" | "error";
};

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
          options: FAST_CALCULATION_OPTIONS,
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
  const [previewCalculationState, setPreviewCalculationState] =
    useState<PreviewCalculationState>({
      settingsSignature: null,
      invalidationToken,
      requestId: null,
      status: "idle",
    });
  const [previewRetryCounter, setPreviewRetryCounter] = useState(0);
  const previewRequestIdRef = useRef(0);
  const previewCalculationStateRef = useRef(previewCalculationState);
  previewCalculationStateRef.current = previewCalculationState;
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
  const isPreviewPending =
    previewCalculationState.invalidationToken === invalidationToken &&
    previewCalculationState.settingsSignature === calculatedSettingsSignature &&
    previewCalculationState.status === "pending";
  const previewCalculationError =
    previewCalculationState.invalidationToken === invalidationToken &&
    previewCalculationState.settingsSignature === calculatedSettingsSignature &&
    previewCalculationState.status === "error";

  const clearCalculationState = useCallback(() => {
    setRetirementPlanState({ result: null, invalidationToken });
    setCalculationErrorState({
      settingsSignature: null,
      invalidationToken,
    });
    setPreviewCalculationState({
      settingsSignature: null,
      invalidationToken,
      requestId: null,
      status: "idle",
    });
  }, [invalidationToken]);

  const retryFailedCalculation = useCallback(() => {
    setCalculationErrorState({
      settingsSignature: null,
      invalidationToken,
    });
  }, [invalidationToken]);
  const retryTargetBasedWithdrawalPreviews = useCallback(() => {
    setPreviewCalculationState({
      settingsSignature: null,
      invalidationToken,
      requestId: null,
      status: "idle",
    });
    setPreviewRetryCounter((current) => current + 1);
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
            options: FAST_CALCULATION_OPTIONS,
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
      cachedPlan = retirementPlanResultCache?.get(
        getRetirementPlanCacheKey(deferredSettings, FAST_CALCULATION_OPTIONS)
      );
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
        options: FAST_CALCULATION_OPTIONS,
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
  useEffect(() => {
    if (
      !calculationEnabled ||
      !retirementPlanResult ||
      calculatedSettingsSignature === null ||
      calculatedSettingsSignature !== settingsSignature ||
      !hasTargetBasedWithdrawalPreviewWork(retirementPlanResult) ||
      retirementPlanResult.targetBasedWithdrawalPreviews.length > 0 ||
      (previewCalculationStateRef.current.invalidationToken ===
        invalidationToken &&
        previewCalculationStateRef.current.settingsSignature ===
          calculatedSettingsSignature &&
        previewCalculationStateRef.current.status !== "idle")
    ) {
      return;
    }

    let active = true;
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    let previewPendingTimer: ReturnType<typeof setTimeout> | undefined =
      setTimeout(() => {
        if (active && previewRequestIdRef.current === requestId) {
          setPreviewCalculationState({
            settingsSignature: calculatedSettingsSignature,
            invalidationToken,
            requestId,
            status: "pending",
          });
        }
      }, 0);
    const clearPreviewPendingTimer = () => {
      if (previewPendingTimer !== undefined) {
        clearTimeout(previewPendingTimer);
        previewPendingTimer = undefined;
      }
    };
    const commitPreviewPlan = (plan: RetirementPlanResult) => {
      if (
        active &&
        previewRequestIdRef.current === requestId &&
        JSON.stringify(plan.settings) === latestSettingsSignatureRef.current
      ) {
        clearPreviewPendingTimer();
        setPreviewCalculationState({
          settingsSignature: null,
          invalidationToken,
          requestId: null,
          status: "idle",
        });
        setRetirementPlanState({ result: plan, invalidationToken });
      }
    };
    const markPreviewError = () => {
      if (
        active &&
        previewRequestIdRef.current === requestId &&
        calculatedSettingsSignature === latestSettingsSignatureRef.current
      ) {
        clearPreviewPendingTimer();
        setPreviewCalculationState({
          settingsSignature: calculatedSettingsSignature,
          invalidationToken,
          requestId,
          status: "error",
        });
      }
    };
    const cancelPreviewRequest = () => {
      active = false;
      clearPreviewPendingTimer();
      setPreviewCalculationState((current) =>
        current.requestId === requestId
          ? {
              settingsSignature: null,
              invalidationToken,
              requestId: null,
              status: "idle",
            }
          : current
      );
    };
    const calculateOnMainThread = () => {
      try {
        commitPreviewPlan(
          getCachedRetirementPlanResult({
            settings: retirementPlanResult.settings,
            cache: retirementPlanResultCache,
            options: FULL_CALCULATION_OPTIONS,
          })
        );
      } catch {
        markPreviewError();
      }
    };

    if (typeof Worker === "undefined") {
      calculateOnMainThread();
      return () => {
        cancelPreviewRequest();
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
        cancelPreviewRequest();
      };
    }

    const handleMessage = (
      event: MessageEvent<RetirementPlanCalculationWorkerResponse>
    ) => {
      if (!active) {
        return;
      }

      worker.terminate();

      if (!event.data.ok) {
        markPreviewError();
        return;
      }

      const result = getCachedRetirementPlanResult({
        settings: retirementPlanResult.settings,
        cache: retirementPlanResultCache,
        precomputedPlan: event.data.result,
        options: FULL_CALCULATION_OPTIONS,
      });
      commitPreviewPlan(result);
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
      worker.postMessage({
        settings: retirementPlanResult.settings,
        options: FULL_CALCULATION_OPTIONS,
      });
    } catch {
      worker.terminate();
      calculateOnMainThread();
    }

    return () => {
      cancelPreviewRequest();
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
    };
  }, [
    calculatedSettingsSignature,
    calculationEnabled,
    invalidationToken,
    previewRetryCounter,
    retirementPlanResult,
    retirementPlanResultCache,
    settingsSignature,
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
    isTargetBasedWithdrawalPreviewPending: isPreviewPending,
    targetBasedWithdrawalPreviewError: previewCalculationError,
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
    retryTargetBasedWithdrawalPreviews,
    validationIssues,
  };
}

function hasTargetBasedWithdrawalPreviewWork(result: RetirementPlanResult) {
  return result.rows.some((row) =>
    Object.values(row.monthlyReducibleFlexibleWithdrawals ?? {}).some(
      (withdrawal) => withdrawal.gross > 0
    )
  );
}
