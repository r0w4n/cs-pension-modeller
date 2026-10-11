/* eslint-disable @eslint-react/set-state-in-effect -- worker, storage and date-boundary effects synchronise external state */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAnalyticsConsent,
  disableAnalytics,
  trackAnalyticsEvent,
  trackPageView,
} from "../../analytics";
import {
  createQuickCalculatorBaseSettings,
  type QuickCalculatorBatchResult,
} from "../../calculation/quick-calculator-scenarios";
import {
  calculateDateAge,
  createDefaultSettings,
  getTodayIsoDate,
  isLocalStorageEnabled,
  LOCAL_DATA_RESET_SIGNAL_KEY,
  LOCAL_STORAGE_ENABLED_KEY,
  normalizeSetting,
  normalizeAlphaPensionDrawAge,
  type PensionSettings,
} from "../../settings";
import { projectQuickCalculatorResults } from "../../result-projection/quick-calculator-results";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  loadAcknowledgementState,
  loadAnalyticsConsentState,
  saveAcknowledgementState,
  saveAnalyticsConsentState,
} from "../app-persistence";
import { useSavedFeedback } from "../use-saved-feedback";
import type { CurrencyDraftState, RangeDraftState } from "../form-field-values";
import type { SettingsFieldOnChange } from "../form-field-types";
import {
  isQuickCalculatorStatePersistable,
  loadQuickCalculatorState,
  QUICK_CALCULATOR_STORAGE_KEY,
  saveQuickCalculatorState,
  type QuickCalculatorCompletion,
  type QuickCalculatorStoredInputs,
} from "./quick-calculator-storage";
import {
  createQuickCalculatorDefaults,
  FRESH_QUICK_CALCULATOR_COMPLETION,
  getQuickCalculatorAgeDefaults,
  QUICK_DEFAULT_ACCRUED_PENSION,
  QUICK_DEFAULT_PENSIONABLE_EARNINGS,
  QUICK_DEFAULT_WORK_PERCENT,
} from "./quick-calculator-defaults";
import {
  getQuickCalculatorReadiness,
  hasQuickCalculatorDraftToPreserve,
  type QuickCalculatorDraftErrors,
  type QuickCalculatorDraftField,
  type QuickCalculatorDirtyDrafts,
} from "./quick-calculator-readiness";
import type { QuickCalculatorWorkerResponse } from "./quick-calculator-worker";

type CalculationState =
  | { status: "idle"; batch: null }
  | { status: "pending"; batch: QuickCalculatorBatchResult | null }
  | { status: "ready"; batch: QuickCalculatorBatchResult }
  | { status: "error"; batch: QuickCalculatorBatchResult | null };

export function useQuickCalculator() {
  const defaultsRef = useRef(createDefaultSettings());
  const initialStateRef = useRef(loadInitialState(defaultsRef.current));
  const [inputs, setInputs] = useState<PensionSettings>(
    initialStateRef.current.settings
  );
  const [birthMonthDraft, setBirthMonthDraft] = useState(
    initialStateRef.current.completion.dateOfBirth
      ? initialStateRef.current.settings.dateOfBirth.slice(0, 7)
      : ""
  );
  const [completion, setCompletion] = useState<QuickCalculatorCompletion>(
    initialStateRef.current.completion
  );
  const [calculationDate, setCalculationDate] = useState(getTodayIsoDate);
  const [calculationState, setCalculationState] = useState<CalculationState>({
    status: "idle",
    batch: null,
  });
  const [retryCounter, setRetryCounter] = useState(0);
  const [draftErrors, setDraftErrors] = useState<QuickCalculatorDraftErrors>(
    {}
  );
  const [dirtyDrafts, setDirtyDrafts] = useState<QuickCalculatorDirtyDrafts>(
    {}
  );
  const [storageMessage, setStorageMessage] = useState<string | null>(
    initialStateRef.current.storageMessage
  );
  const [resetVersion, setResetVersion] = useState(0);
  const [hasLocalEdits, setHasLocalEdits] = useState(false);
  const [localSavingEnabled, setLocalSavingEnabled] = useState(
    isLocalStorageEnabled
  );
  const [hasAcknowledgedNotice, setHasAcknowledgedNotice] = useState(
    loadAcknowledgementState
  );
  const hasTrackedPageViewRef = useRef(false);
  const hasTrackedEstimateRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const adoptingExternalStateRef = useRef(false);
  const hasLocalEditsRef = useRef(false);
  const localSavingEnabledRef = useRef(localSavingEnabled);
  const { hideSavedLabel, showSavedFeedback, showSavedLabel } =
    useSavedFeedback();

  const refreshCalculationDate = useCallback(() => {
    const today = getTodayIsoDate();
    setCalculationDate((current) => (current === today ? current : today));
    return today;
  }, []);

  const clearOpenState = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    requestIdRef.current += 1;
    adoptingExternalStateRef.current = false;
    const defaults = createQuickCalculatorDefaults(defaultsRef.current);
    setInputs(defaults);
    setBirthMonthDraft("");
    setCompletion(FRESH_QUICK_CALCULATOR_COMPLETION);
    setDraftErrors({});
    setDirtyDrafts({});
    setCalculationState({ status: "idle", batch: null });
    setRetryCounter(0);
    hasLocalEditsRef.current = false;
    setHasLocalEdits(false);
    hideSavedLabel();
    setResetVersion((current) => current + 1);
  }, [hideSavedLabel]);

  const clearForDisabledSaving = useCallback(() => {
    localSavingEnabledRef.current = false;
    setLocalSavingEnabled(false);
    disableAnalytics();
    clearOpenState();
    setHasAcknowledgedNotice(false);
    setStorageMessage("Local data was cleared. Quick inputs were reset.");
  }, [clearOpenState]);

  const readiness = getQuickCalculatorReadiness({
    inputs,
    completion,
    draftErrors,
    dirtyDrafts,
  });
  const hasDraftToPreserve = hasQuickCalculatorDraftToPreserve({
    inputs,
    draftErrors,
    dirtyDrafts,
  });
  const baseSettingsResult = useMemo(
    () =>
      readiness.calculationEnabled
        ? createQuickCalculatorBaseSettings({
            defaults: defaultsRef.current,
            inputs,
            calculationDate,
          })
        : null,
    [calculationDate, inputs, readiness.calculationEnabled]
  );
  const baseSettings =
    baseSettingsResult?.status === "ready" ? baseSettingsResult.settings : null;
  const hasInputProblems =
    readiness.requiredInputsComplete &&
    (!readiness.calculationEnabled || baseSettingsResult?.status === "invalid");
  const settingsSignature = useMemo(
    () => (baseSettings ? JSON.stringify(baseSettings) : null),
    [baseSettings]
  );

  useEffect(() => {
    const trackConsentedUsage = () => {
      if (
        !hasAcknowledgedNotice ||
        !applyAnalyticsConsent(loadAnalyticsConsentState())
      ) {
        disableAnalytics();
        return;
      }

      if (!hasTrackedPageViewRef.current) {
        trackPageView();
        hasTrackedPageViewRef.current = true;
      }
      if (
        calculationState.status === "ready" &&
        !hasTrackedEstimateRef.current
      ) {
        trackAnalyticsEvent("quick_calculator_estimates_viewed");
        hasTrackedEstimateRef.current = true;
      }
    };

    trackConsentedUsage();

    const handleAnalyticsStorage = (event: StorageEvent) => {
      if (
        event.key === ANALYTICS_CONSENT_STORAGE_KEY ||
        event.key === LOCAL_STORAGE_ENABLED_KEY ||
        event.key === LOCAL_DATA_RESET_SIGNAL_KEY ||
        event.key === null
      ) {
        trackConsentedUsage();
      }
    };
    window.addEventListener("storage", handleAnalyticsStorage);
    return () => window.removeEventListener("storage", handleAnalyticsStorage);
  }, [calculationState.status, hasAcknowledgedNotice]);

  useEffect(() => {
    if (!baseSettings || !settingsSignature) {
      workerRef.current?.terminate();
      workerRef.current = null;
      requestIdRef.current += 1;
      setCalculationState({ status: "idle", batch: null });
      return;
    }

    workerRef.current?.terminate();
    const requestId = ++requestIdRef.current;
    setCalculationState((current) => ({
      status: "pending",
      batch: current.batch,
    }));

    if (typeof Worker === "undefined") {
      setCalculationState((current) => ({
        status: "error",
        batch: current.batch,
      }));
      return;
    }

    let worker: Worker;
    try {
      worker = new Worker(
        new URL("./quick-calculator-worker.ts", import.meta.url),
        {
          type: "module",
        }
      );
    } catch {
      setCalculationState((current) => ({
        status: "error",
        batch: current.batch,
      }));
      return;
    }
    workerRef.current = worker;

    const fail = () => {
      worker.terminate();
      if (requestId === requestIdRef.current) {
        setCalculationState((current) => ({
          status: "error",
          batch: current.batch,
        }));
      }
    };
    const handleMessage = (
      event: MessageEvent<QuickCalculatorWorkerResponse>
    ) => {
      if (
        requestId !== requestIdRef.current ||
        event.data.requestId !== requestId ||
        event.data.settingsSignature !== settingsSignature
      ) {
        return;
      }
      worker.terminate();
      workerRef.current = null;
      if (!event.data.ok) {
        fail();
        return;
      }
      setCalculationState({ status: "ready", batch: event.data.result });
    };
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", fail);
    worker.postMessage({
      requestId,
      settingsSignature,
      calculationDate,
      baseSettings,
    });

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", fail);
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };
  }, [baseSettings, calculationDate, retryCounter, settingsSignature]);

  useEffect(() => {
    if (adoptingExternalStateRef.current) {
      adoptingExternalStateRef.current = false;
      return;
    }
    const savingEnabledAtBoundary = isLocalStorageEnabled();
    if (!savingEnabledAtBoundary) {
      if (localSavingEnabledRef.current) {
        clearForDisabledSaving();
      } else {
        if (localSavingEnabled) {
          setLocalSavingEnabled(false);
        }
        setStorageMessage("Inputs are not being saved on this device.");
      }
      return;
    }
    if (!localSavingEnabled) {
      return;
    }
    if (!hasLocalEdits) {
      return;
    }

    const state = {
      inputs: pickStoredInputs(inputs),
      completion,
    };
    if (readiness.hasDraftProblems) {
      hideSavedLabel();
      if (!isQuickCalculatorStatePersistable(state)) {
        setStorageMessage(
          "Current changes have not been saved. Enter valid EPA dates to replace the last saved inputs."
        );
      } else {
        setStorageMessage(null);
      }
      return;
    }
    if (!isQuickCalculatorStatePersistable(state)) {
      hideSavedLabel();
      setStorageMessage(
        "Current changes have not been saved. Enter valid EPA dates to replace the last saved inputs."
      );
      return;
    }

    const saved = saveQuickCalculatorState(state);
    if (saved) {
      if (hasDraftToPreserve) {
        hideSavedLabel();
        setStorageMessage(
          "State Pension is excluded and the other inputs were saved. Its unfinished amount remains only on this open page."
        );
      } else {
        setStorageMessage(null);
        showSavedLabel();
      }
    } else {
      hideSavedLabel();
      setStorageMessage(
        "The browser could not save these quick calculator inputs."
      );
    }
  }, [
    clearForDisabledSaving,
    completion,
    hasDraftToPreserve,
    hasLocalEdits,
    hideSavedLabel,
    inputs,
    localSavingEnabled,
    readiness.hasDraftProblems,
    showSavedLabel,
  ]);

  useEffect(() => {
    let dateBoundaryTimer: number | undefined;

    const scheduleDateBoundaryRefresh = () => {
      if (dateBoundaryTimer !== undefined) {
        window.clearTimeout(dateBoundaryTimer);
      }
      dateBoundaryTimer = window.setTimeout(() => {
        refreshCalculationDate();
        scheduleDateBoundaryRefresh();
      }, getMillisecondsUntilNextLocalDate());
    };

    const reconcileLocalSaving = () => {
      const enabled = isLocalStorageEnabled();
      const wasEnabled = localSavingEnabledRef.current;
      localSavingEnabledRef.current = enabled;
      setLocalSavingEnabled(enabled);

      if (!enabled) {
        if (wasEnabled) {
          clearForDisabledSaving();
        } else {
          setStorageMessage("Inputs are not being saved on this device.");
        }
        return;
      }

      if (!wasEnabled && !hasLocalEditsRef.current) {
        setStorageMessage(
          "Local saving is enabled. New quick calculator inputs will be saved on this device."
        );
      }
    };

    const handleFocus = () => {
      refreshCalculationDate();
      scheduleDateBoundaryRefresh();
      reconcileLocalSaving();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCalculationDate();
        scheduleDateBoundaryRefresh();
        reconcileLocalSaving();
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_DATA_RESET_SIGNAL_KEY || event.key === null) {
        clearForDisabledSaving();
        return;
      }
      if (
        event.key === LOCAL_STORAGE_ENABLED_KEY &&
        event.newValue === "false"
      ) {
        if (localSavingEnabledRef.current) {
          clearForDisabledSaving();
        }
        return;
      }
      if (
        event.key === LOCAL_STORAGE_ENABLED_KEY &&
        event.newValue === "true"
      ) {
        localSavingEnabledRef.current = true;
        setLocalSavingEnabled(true);
        if (!hasLocalEditsRef.current) {
          setStorageMessage(
            "Local saving is enabled. New quick calculator inputs will be saved on this device."
          );
        }
        return;
      }
      if (
        event.key === QUICK_CALCULATOR_STORAGE_KEY &&
        event.newValue === null
      ) {
        clearOpenState();
        setStorageMessage(
          "Quick calculator inputs were reset in another open tab."
        );
        return;
      }
      if (event.key === QUICK_CALCULATOR_STORAGE_KEY && hasDraftToPreserve) {
        hideSavedLabel();
        setStorageMessage(
          "Quick calculator inputs changed in another tab. Your local draft has been kept."
        );
        return;
      }
      if (event.key === QUICK_CALCULATOR_STORAGE_KEY) {
        const loaded = loadQuickCalculatorState();
        if (loaded.status === "loaded") {
          hideSavedLabel();
          workerRef.current?.terminate();
          workerRef.current = null;
          requestIdRef.current += 1;
          adoptingExternalStateRef.current = true;
          setInputs((current) => ({ ...current, ...loaded.state.inputs }));
          setBirthMonthDraft(
            loaded.state.completion.dateOfBirth
              ? loaded.state.inputs.dateOfBirth.slice(0, 7)
              : ""
          );
          setCompletion(loaded.state.completion);
          setDraftErrors({});
          setDirtyDrafts({});
          setCalculationState({ status: "idle", batch: null });
          hasLocalEditsRef.current = false;
          setHasLocalEdits(false);
          setResetVersion((current) => current + 1);
        } else if (loaded.status === "invalid") {
          hideSavedLabel();
          setStorageMessage(
            "Quick calculator data changed in another tab but could not be used."
          );
        }
      }
    };
    scheduleDateBoundaryRefresh();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (dateBoundaryTimer !== undefined) {
        window.clearTimeout(dateBoundaryTimer);
      }
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    clearForDisabledSaving,
    clearOpenState,
    hasDraftToPreserve,
    hideSavedLabel,
    refreshCalculationDate,
  ]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      requestIdRef.current += 1;
    },
    []
  );

  const onChange: SettingsFieldOnChange = useCallback(
    (key, value) => {
      refreshCalculationDate();
      hasLocalEditsRef.current = true;
      setHasLocalEdits(true);
      setInputs((current) => ({
        ...current,
        [key]: normalizeSetting(key, value, {
          fallbackStartDate: current.startDate,
        }),
        ...(key === "alphaHasProtectedPensionAge" && value === false
          ? {
              alphaPensionDrawAge: normalizeAlphaPensionDrawAge(
                current.alphaPensionDrawAge,
                current.dateOfBirth
              ),
              alphaPensionLeaveAge: normalizeAlphaPensionDrawAge(
                current.alphaPensionDrawAge,
                current.dateOfBirth
              ),
              requirementAge: normalizeAlphaPensionDrawAge(
                current.alphaPensionDrawAge,
                current.dateOfBirth
              ),
            }
          : {}),
      }));
    },
    [refreshCalculationDate]
  );

  function updateBirthMonth(value: string) {
    const currentCalculationDate = refreshCalculationDate();
    setBirthMonthDraft(value);
    const completeMonth = /^\d{4}-\d{2}$/.test(value);
    if (!completeMonth) {
      setCompletion((current) => ({ ...current, dateOfBirth: false }));
      setDraftErrors((current) => ({
        ...current,
        dateOfBirth: "Choose both a birth month and year.",
      }));
      return;
    }

    hasLocalEditsRef.current = true;
    setHasLocalEdits(true);
    const dateOfBirth = `${value}-01`;
    const currentAge = calculateDateAge(dateOfBirth, currentCalculationDate);
    if (currentAge <= 0) {
      setDraftErrors((current) => ({
        ...current,
        dateOfBirth: "Birth month must be before the current date.",
      }));
      return;
    }
    const ageDefaults = getQuickCalculatorAgeDefaults(
      dateOfBirth,
      currentCalculationDate
    );
    const selectedAge = ageDefaults.retirementAge;
    const reducedHoursAge = ageDefaults.reducedHoursAge;

    setInputs((current) => ({
      ...current,
      dateOfBirth,
      ...(!completion.retirementAgeInitialised && selectedAge <= 70
        ? {
            alphaPensionDrawAge: selectedAge,
            alphaPensionLeaveAge: selectedAge,
            requirementAge: selectedAge,
          }
        : {}),
      ...(!completion.partialRetirementAgeInitialised && reducedHoursAge <= 70
        ? { partialRetirementStartAge: reducedHoursAge }
        : {}),
    }));
    setCompletion((current) => ({
      ...current,
      dateOfBirth: true,
      retirementAgeInitialised:
        current.retirementAgeInitialised || selectedAge <= 70,
      partialRetirementAgeInitialised:
        current.partialRetirementAgeInitialised || reducedHoursAge <= 70,
    }));
    setDraftErrors((current) => {
      const next = { ...current };
      delete next.dateOfBirth;
      if (!ageDefaults.supported) {
        next.dateOfBirth =
          "This date of birth cannot be modelled with future retirement ages inside the supported maximum age of 70.";
      }
      return next;
    });
  }

  function handleDraft(
    key: QuickCalculatorDraftField,
    state: CurrencyDraftState | RangeDraftState,
    required = false
  ) {
    refreshCalculationDate();
    hasLocalEditsRef.current = true;
    setHasLocalEdits(true);
    if (state.status === "invalid") {
      setDraftErrors((current) => ({ ...current, [key]: state.message }));
      setDirtyDrafts((current) => ({ ...current, [key]: true }));
      if (required) {
        setCompletion((current) => ({ ...current, [key]: false }));
      }
      return;
    }
    setDraftErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setDirtyDrafts((current) => ({
      ...current,
      [key]: state.status === "valid-draft",
    }));
    if (required && state.status === "committed") {
      setCompletion((current) => ({ ...current, [key]: true }));
    }
    if (state.status === "committed" && key === "alphaPensionDrawAge") {
      setCompletion((current) => ({
        ...current,
        retirementAgeInitialised: true,
      }));
    }
    if (state.status === "committed" && key === "partialRetirementStartAge") {
      setCompletion((current) => ({
        ...current,
        partialRetirementAgeInitialised: true,
      }));
    }
  }

  function acknowledgeNotice(consentGranted: boolean) {
    setHasAcknowledgedNotice(true);
    saveAcknowledgementState();
    saveAnalyticsConsentState(consentGranted);
  }

  const ageResetValues = getQuickCalculatorAgeDefaults(
    inputs.dateOfBirth,
    calculationDate
  );

  return {
    inputs,
    birthMonthDraft,
    completion,
    draftErrors,
    calculationState,
    projectedResults:
      !hasInputProblems && calculationState.batch
        ? projectQuickCalculatorResults(calculationState.batch)
        : null,
    resultsAreForPreviousInputs:
      !hasInputProblems &&
      calculationState.status === "pending" &&
      calculationState.batch !== null,
    requiredInputsComplete: readiness.requiredInputsComplete,
    hasInputProblems,
    inputValidationIssues: baseSettingsResult?.validationIssues ?? [],
    storageMessage,
    showSavedFeedback,
    calculationDate,
    inflationRateAnnual: defaultsRef.current.inflationRateAnnual,
    resetVersion,
    hasAcknowledgedNotice,
    onChange,
    setCompletion,
    updateBirthMonth,
    handleDraft,
    updateEpaPeriods: (periods: PensionSettings["alphaEpaPeriods"]) => {
      refreshCalculationDate();
      hasLocalEditsRef.current = true;
      setHasLocalEdits(true);
      setInputs((current) => ({ ...current, alphaEpaPeriods: periods }));
    },
    acknowledgeNotice,
    resetValues: {
      accruedPensionAtLastAbs: QUICK_DEFAULT_ACCRUED_PENSION,
      pensionableEarnings: QUICK_DEFAULT_PENSIONABLE_EARNINGS,
      alphaPensionDrawAge: ageResetValues.supported
        ? ageResetValues.retirementAge
        : inputs.alphaPensionDrawAge,
      alphaAddedPensionMonthly: 0,
      partialRetirementStartAge: ageResetValues.supported
        ? ageResetValues.reducedHoursAge
        : inputs.partialRetirementStartAge,
      partialRetirementWorkPercent: QUICK_DEFAULT_WORK_PERCENT,
      currentStatePension: defaultsRef.current.currentStatePension,
    },
    retry: () => setRetryCounter((current) => current + 1),
  };
}

function loadInitialState(defaults: PensionSettings) {
  const stored = loadQuickCalculatorState();
  if (stored.status === "loaded") {
    return {
      settings: {
        ...createQuickCalculatorDefaults(defaults),
        ...stored.state.inputs,
      },
      completion: stored.state.completion,
      storageMessage: null,
    };
  }

  return {
    settings: createQuickCalculatorDefaults(defaults),
    completion: FRESH_QUICK_CALCULATOR_COMPLETION,
    storageMessage:
      stored.status === "invalid"
        ? "Saved quick calculator data could not be loaded. Valid new entries can replace it when saving is enabled; manage saved data in Settings."
        : isLocalStorageEnabled()
          ? null
          : "Inputs are not being saved on this device.",
  };
}

function pickStoredInputs(
  settings: PensionSettings
): QuickCalculatorStoredInputs {
  return {
    dateOfBirth: settings.dateOfBirth,
    alphaPensionAbsDate: settings.alphaPensionAbsDate,
    accruedPensionAtLastAbs: settings.accruedPensionAtLastAbs,
    pensionableEarnings: settings.pensionableEarnings,
    alphaPensionDrawAge: settings.alphaPensionDrawAge,
    alphaHasProtectedPensionAge: settings.alphaHasProtectedPensionAge,
    alphaAddedPensionMonthly: settings.alphaAddedPensionMonthly,
    alphaAddedPensionFactorType: settings.alphaAddedPensionFactorType,
    partialRetirementStartAge: settings.partialRetirementStartAge,
    partialRetirementWorkPercent: settings.partialRetirementWorkPercent,
    showStatePension: settings.showStatePension,
    currentStatePension: settings.currentStatePension,
    statePensionForecastConfirmed: settings.statePensionForecastConfirmed,
    alphaEpaEnabled: settings.alphaEpaEnabled,
    alphaEpaPeriods: settings.alphaEpaPeriods.map((period) => ({ ...period })),
  };
}

export function getMillisecondsUntilNextLocalDate(now = new Date()) {
  const nextDate = new Date(now);
  nextDate.setHours(24, 0, 0, 0);
  return Math.max(1, nextDate.getTime() - now.getTime());
}
