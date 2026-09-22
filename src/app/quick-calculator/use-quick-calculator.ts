/* eslint-disable @eslint-react/set-state-in-effect -- worker, storage and date-boundary effects synchronise external state */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type PensionSettings,
} from "../../settings";
import { projectQuickCalculatorResults } from "../../result-projection/quick-calculator-results";
import {
  loadAcknowledgementState,
  saveAcknowledgementState,
  saveAnalyticsConsentState,
} from "../app-persistence";
import type { CurrencyDraftState, RangeDraftState } from "../form-field-values";
import type { SettingsFieldOnChange } from "../form-field-types";
import {
  clearStoredQuickCalculatorState,
  loadQuickCalculatorState,
  QUICK_CALCULATOR_STORAGE_KEY,
  saveQuickCalculatorState,
  type QuickCalculatorCompletion,
  type QuickCalculatorStoredInputs,
} from "./quick-calculator-storage";
import {
  getQuickCalculatorReadiness,
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

const EMPTY_COMPLETION: QuickCalculatorCompletion = {
  dateOfBirth: false,
  accruedPensionAtLastAbs: false,
  pensionableEarnings: false,
  retirementAgeInitialised: false,
  partialRetirementAgeInitialised: false,
};

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
  const [storageMessage, setStorageMessage] = useState(
    initialStateRef.current.storageMessage
  );
  const [resetVersion, setResetVersion] = useState(0);
  const [hasLocalEdits, setHasLocalEdits] = useState(false);
  const [hasAcknowledgedNotice, setHasAcknowledgedNotice] = useState(
    loadAcknowledgementState
  );
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const adoptingExternalStateRef = useRef(false);

  const readiness = getQuickCalculatorReadiness({
    inputs,
    completion,
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
    if (!isLocalStorageEnabled()) {
      setStorageMessage("Inputs are not being saved on this device.");
      return;
    }
    if (!hasLocalEdits) {
      return;
    }

    const saved = saveQuickCalculatorState({
      inputs: pickStoredInputs(inputs),
      completion,
    });
    setStorageMessage(
      saved
        ? "Quick calculator inputs are saved locally on this device."
        : "The browser could not save these quick calculator inputs."
    );
  }, [completion, hasLocalEdits, inputs]);

  const clearOpenState = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    requestIdRef.current += 1;
    const defaults = createQuickDefaults(defaultsRef.current);
    setInputs(defaults);
    setBirthMonthDraft("");
    setCompletion(EMPTY_COMPLETION);
    setDraftErrors({});
    setDirtyDrafts({});
    setCalculationState({ status: "idle", batch: null });
    setHasLocalEdits(false);
    setResetVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    const refreshDate = () => {
      const today = getTodayIsoDate();
      setCalculationDate((current) => (current === today ? current : today));
    };
    const handleFocus = () => {
      refreshDate();
      if (!isLocalStorageEnabled()) {
        setStorageMessage("Inputs are not being saved on this device.");
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === LOCAL_DATA_RESET_SIGNAL_KEY ||
        event.key === null ||
        (event.key === LOCAL_STORAGE_ENABLED_KEY && event.newValue === "false")
      ) {
        clearOpenState();
        setHasAcknowledgedNotice(false);
        setStorageMessage("Local data was cleared. Quick inputs were reset.");
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
      if (
        event.key === QUICK_CALCULATOR_STORAGE_KEY &&
        !readiness.hasDraftProblems
      ) {
        const loaded = loadQuickCalculatorState();
        if (loaded.status === "loaded") {
          adoptingExternalStateRef.current = true;
          setInputs((current) => ({ ...current, ...loaded.state.inputs }));
          setBirthMonthDraft(
            loaded.state.completion.dateOfBirth
              ? loaded.state.inputs.dateOfBirth.slice(0, 7)
              : ""
          );
          setCompletion(loaded.state.completion);
          setCalculationState({ status: "idle", batch: null });
          setHasLocalEdits(false);
          setResetVersion((current) => current + 1);
        } else if (loaded.status === "invalid") {
          setStorageMessage(
            "Quick calculator data changed in another tab but could not be used."
          );
        }
      }
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [clearOpenState, readiness.hasDraftProblems]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      requestIdRef.current += 1;
    },
    []
  );

  const onChange: SettingsFieldOnChange = useCallback((key, value) => {
    setHasLocalEdits(true);
    setInputs((current) => ({
      ...current,
      [key]: normalizeSetting(key, value, {
        fallbackStartDate: current.startDate,
      }),
    }));
  }, []);

  function updateBirthMonth(value: string) {
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

    setHasLocalEdits(true);
    const dateOfBirth = `${value}-01`;
    const currentAge = calculateDateAge(dateOfBirth, calculationDate);
    if (currentAge <= 0) {
      setDraftErrors((current) => ({
        ...current,
        dateOfBirth: "Birth month must be before the current date.",
      }));
      return;
    }
    const nextFutureQuarterAge = Math.floor(currentAge * 4 + 1) / 4;
    const selectedAge = Math.max(60, nextFutureQuarterAge);
    const reducedHoursAge = Math.max(55, nextFutureQuarterAge);

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
      if (selectedAge > 70 || reducedHoursAge > 70) {
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
  }

  function acknowledgeNotice(consentGranted: boolean) {
    setHasAcknowledgedNotice(true);
    saveAcknowledgementState();
    saveAnalyticsConsentState(consentGranted);
  }

  function resetQuickCalculator() {
    const removed = clearStoredQuickCalculatorState();
    clearOpenState();
    setStorageMessage(
      removed
        ? "Quick calculator inputs were reset."
        : "Inputs were reset in this tab, but the browser could not remove the saved quick calculator data."
    );
  }

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
    resetVersion,
    hasAcknowledgedNotice,
    onChange,
    setCompletion,
    updateBirthMonth,
    handleDraft,
    updateEpaPeriods: (periods: PensionSettings["alphaEpaPeriods"]) => {
      setHasLocalEdits(true);
      setInputs((current) => ({ ...current, alphaEpaPeriods: periods }));
    },
    acknowledgeNotice,
    resetQuickCalculator,
    retry: () => setRetryCounter((current) => current + 1),
  };
}

function loadInitialState(defaults: PensionSettings) {
  const stored = loadQuickCalculatorState();
  if (stored.status === "loaded") {
    return {
      settings: { ...createQuickDefaults(defaults), ...stored.state.inputs },
      completion: stored.state.completion,
      storageMessage: "Quick calculator inputs were restored from this device.",
    };
  }

  return {
    settings: createQuickDefaults(defaults),
    completion: EMPTY_COMPLETION,
    storageMessage:
      stored.status === "invalid"
        ? "Saved quick calculator data could not be used. Reset the calculator to replace it."
        : isLocalStorageEnabled()
          ? "Quick calculator inputs are saved locally on this device."
          : "Inputs are not being saved on this device.",
  };
}

function createQuickDefaults(defaults: PensionSettings): PensionSettings {
  return {
    ...defaults,
    dateOfBirth: "",
    alphaAddedPensionMonthly: 0,
    alphaAddedPensionFactorType: "self",
    partialRetirementWorkPercent: 50,
    showStatePension: true,
    alphaEpaEnabled: false,
    alphaEpaPeriods: [],
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
