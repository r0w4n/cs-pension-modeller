import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SettingsKey } from "../fieldDefinitions";
import {
  calculateRetirementIncomeTargetAtDate,
  createProjectionTable,
  deriveInflationAssumptions,
  generatePensionSummary,
  type RetirementIncomeDisplay,
} from "../projection";
import type { RetirementIncomeBridgeParameters } from "../RetirementIncomeBridgeChart";
import {
  createDefaultSettings,
  clearStoredSettings,
  getStoredSettingsSnapshot,
  isLocalStorageEnabled as loadLocalStorageEnabled,
  loadStoredSettings,
  parseStoredSettings,
  saveLocalStoragePreference,
  saveSettings,
  validateSettings,
  type PensionSettings,
} from "../settings";
import {
  loadAcknowledgementState,
  loadStoredAppMode,
  loadStoredGuidanceNotes,
  saveAcknowledgementState,
  clearStoredAppPreferences,
  saveStoredAppMode,
  saveStoredGuidanceNotes,
  type AppMode,
} from "./app-persistence";
import {
  loadComparisonScenario as loadComparisonScenarioAction,
  selectAppMode as selectAppModeAction,
  showSavedLabel as showSavedLabelAction,
} from "./app-actions";
import {
  updateBridgeChartParameters as updateBridgeChartParametersAction,
  updateSetting as updateSettingAction,
} from "./chart-state";
import {
  addYearsToIsoDate,
  buildRetirementIncomeItems,
  clonePensionSettings,
  createBridgeChartLimits,
  createBridgeChartParameters,
  createRetirementIncomeSeries,
  formatCurrencyDetailed,
  getRetirementIncomeTargetTitle,
  getRetirementIncomeTitle,
  clearStoredComparisonScenarios,
  loadStoredComparisonScenarios,
  saveStoredComparisonScenarios,
  type ComparisonResultCache,
  type ComparisonScenario,
} from "../app-domains";
import {
  JOURNEY_DEFINITIONS,
  applySimpleJourneyAssumptions,
  applySimpleJourneyDefaults,
} from "../app-domains/journeys";
import { useMobileDateDropdowns as useMobileDateDropdownsHook } from "./form-fields";
import type { JourneyStepViewModel } from "./journey-step-content";
import type { JourneyMode } from "./journey-mode-screen";

const [
  bridgeJourneyDefinition,
  simpleJourneyDefinition,
  expertJourneyDefinition,
] = JOURNEY_DEFINITIONS;

const JOURNEY_DEFINITION_BY_MODE = {
  bridge: bridgeJourneyDefinition,
  simple: simpleJourneyDefinition,
  expert: expertJourneyDefinition,
} satisfies Record<JourneyMode, (typeof JOURNEY_DEFINITIONS)[number]>;

export function useAppController() {
  const initialAppMode = loadStoredAppMode();
  const [settings, setSettings] = useState<PensionSettings>(loadStoredSettings);
  const [simpleJourneySettings, setSimpleJourneySettings] =
    useState<PensionSettings | null>(() => {
      if (initialAppMode !== "simple") {
        return null;
      }

      return applySimpleJourneyDefaults(loadStoredSettings());
    });
  const [chartUndoStack, setChartUndoStack] = useState<PensionSettings[]>([]);
  const [settingsFormVersion, setSettingsFormVersion] = useState(0);
  const [appMode, setAppMode] = useState<AppMode | null>(initialAppMode);
  const [showGuidanceNotes, setShowGuidanceNotes] = useState(
    loadStoredGuidanceNotes
  );
  const [retirementIncomeDisplay, setRetirementIncomeDisplay] =
    useState<RetirementIncomeDisplay>("monthly");
  const [comparisonScenarios, setComparisonScenarios] = useState<
    ComparisonScenario[]
  >(loadStoredComparisonScenarios);
  const [hasAcknowledgedNotice, setHasAcknowledgedNotice] = useState(
    loadAcknowledgementState
  );
  const [localStorageEnabled, setLocalStorageEnabledState] = useState(
    loadLocalStorageEnabled
  );
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const savedFeedbackTimer = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null);
  const [comparisonResultCache] = useState<ComparisonResultCache>(
    () => new Map()
  );
  const activeModeRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusActiveMode = useRef(false);
  const scrollActiveModeIntoView = useCallback(() => {
    window.requestAnimationFrame(() => {
      activeModeRef.current?.focus({ preventScroll: true });
      if (typeof activeModeRef.current?.scrollIntoView === "function") {
        activeModeRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }, []);
  const activeJourneyMode = appMode;
  const activeJourneyDefinition = activeJourneyMode
    ? JOURNEY_DEFINITION_BY_MODE[activeJourneyMode]
    : null;
  const useDropdownDates = useMobileDateDropdownsHook();
  const simpleJourneyEffectiveSettings = useMemo(() => {
    if (activeJourneyMode !== "simple") {
      return null;
    }

    return applySimpleJourneyAssumptions(
      simpleJourneySettings ?? applySimpleJourneyDefaults(settings)
    );
  }, [activeJourneyMode, settings, simpleJourneySettings]);
  const effectiveSettings = useMemo(
    () =>
      activeJourneyMode === "simple"
        ? (simpleJourneyEffectiveSettings ??
          applySimpleJourneyDefaults(settings))
        : settings,
    [activeJourneyMode, settings, simpleJourneyEffectiveSettings]
  );
  const deferredSettings = useDeferredValue(effectiveSettings);
  const validationIssues = useMemo(
    () => validateSettings(deferredSettings),
    [deferredSettings]
  );
  const projectionRows = useMemo(
    () => createProjectionTable(deferredSettings),
    [deferredSettings]
  );
  const pensionSummary = useMemo(
    () => generatePensionSummary(projectionRows, deferredSettings),
    [projectionRows, deferredSettings]
  );
  const retirementIncomeSeries = useMemo(
    () => createRetirementIncomeSeries(projectionRows, deferredSettings),
    [projectionRows, deferredSettings]
  );
  const bridgeChartParameters = useMemo(
    () => createBridgeChartParameters(effectiveSettings),
    [effectiveSettings]
  );
  const bridgeChartLimits = useMemo(
    () => createBridgeChartLimits(effectiveSettings),
    [effectiveSettings]
  );
  const derivedInflationAssumptions = useMemo(
    () => deriveInflationAssumptions(deferredSettings),
    [deferredSettings]
  );
  const retirementIncomeTitle = getRetirementIncomeTitle(
    effectiveSettings.taxationEnabled,
    retirementIncomeDisplay
  );
  const retirementIncomeItems = pensionSummary
    ? buildRetirementIncomeItems(pensionSummary, retirementIncomeDisplay)
    : [];
  const retirementIncomeTotal = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? (pensionSummary?.retirementIncome.totalMonthlyIncome ?? 0)
      : (pensionSummary?.retirementIncome.totalAnnualIncome ?? 0)
  );
  const retirementIncomeTargetTitle = getRetirementIncomeTargetTitle(
    retirementIncomeDisplay
  );
  const annualRetirementIncomeTarget = calculateRetirementIncomeTargetAtDate(
    effectiveSettings,
    addYearsToIsoDate(
      effectiveSettings.dateOfBirth,
      effectiveSettings.requirementAge
    )
  );
  const retirementIncomeTarget = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? annualRetirementIncomeTarget / 12
      : annualRetirementIncomeTarget
  );

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredComparisonScenarios(comparisonScenarios);
  }, [comparisonScenarios]);

  useEffect(() => {
    saveStoredGuidanceNotes(showGuidanceNotes);
  }, [showGuidanceNotes]);

  useEffect(() => {
    if (!appMode || !shouldFocusActiveMode.current) {
      return;
    }

    shouldFocusActiveMode.current = false;
    scrollActiveModeIntoView();
  }, [appMode, scrollActiveModeIntoView]);

  useEffect(() => {
    const savedFeedbackTimeout = savedFeedbackTimer.current;
    return () => {
      if (savedFeedbackTimeout) {
        window.clearTimeout(savedFeedbackTimeout);
      }
    };
  }, []);

  useEffect(() => {
    const handleUndoShortcut = (event: globalThis.KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "z" ||
        event.shiftKey ||
        event.altKey ||
        (!event.metaKey && !event.ctrlKey) ||
        chartUndoStack.length === 0 ||
        isEditableShortcutTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      setChartUndoStack((current) => {
        const previousSettings = current.at(-1);

        if (!previousSettings) {
          return current;
        }

        if (activeJourneyMode === "simple") {
          setSimpleJourneySettings(clonePensionSettings(previousSettings));
        } else {
          setSettings(previousSettings);
        }

        return current.slice(0, -1);
      });
    };

    window.addEventListener("keydown", handleUndoShortcut);

    return () => window.removeEventListener("keydown", handleUndoShortcut);
  }, [activeJourneyMode, chartUndoStack.length]);

  function showSavedLabel() {
    showSavedLabelAction({
      savedFeedbackTimerRef: savedFeedbackTimer,
      setShowSavedFeedback,
    });
  }

  const setActiveJourneySettings = useCallback(
    (
      value: PensionSettings | ((current: PensionSettings) => PensionSettings)
    ) => {
      if (activeJourneyMode === "simple") {
        setSimpleJourneySettings((current) => {
          const baseSettings = current ?? applySimpleJourneyDefaults(settings);
          const nextSettings =
            typeof value === "function" ? value(baseSettings) : value;

          return nextSettings.dateOfBirth !== baseSettings.dateOfBirth
            ? applySimpleJourneyDefaults(nextSettings)
            : applySimpleJourneyAssumptions(nextSettings);
        });
        return;
      }

      if (typeof value === "function") {
        setSettings((current) => value(current));
        return;
      }

      setSettings(value);
    },
    [activeJourneyMode, settings]
  );

  function updateSetting<K extends SettingsKey>(
    key: K,
    value: PensionSettings[K]
  ) {
    updateSettingAction({
      key,
      value,
      showSavedLabel,
      startTransition,
      setChartUndoStack,
      setSettings: setActiveJourneySettings,
    });
  }

  function updateBridgeChartParameters(
    patch: Partial<RetirementIncomeBridgeParameters>
  ) {
    updateBridgeChartParametersAction({
      patch,
      settings: effectiveSettings,
      showSavedLabel,
      setChartUndoStack,
      setSettings: setActiveJourneySettings,
    });
  }

  function loadComparisonScenario(scenarioSettings: PensionSettings) {
    loadComparisonScenarioAction({
      savedFeedbackTimerRef: savedFeedbackTimer,
      setShowSavedFeedback,
      scenarioSettings,
      setChartUndoStack,
      setSettingsFormVersion,
      setSettings: setActiveJourneySettings,
    });
  }

  function resetSettings() {
    const defaultSettings = createDefaultSettings();

    saveSettings(defaultSettings);
    showSavedLabel();
    setChartUndoStack([]);
    setSettingsFormVersion((current) => current + 1);
    setSimpleJourneySettings(null);
    setSettings(defaultSettings);
  }

  function loadParameters(input: unknown) {
    const importedSettings = parseStoredSettings(input);

    if (!importedSettings) {
      return false;
    }

    saveSettings(importedSettings);
    showSavedLabel();
    setChartUndoStack([]);
    setSettingsFormVersion((current) => current + 1);
    setSimpleJourneySettings(null);
    setSettings(importedSettings);

    return true;
  }

  function exportParameters() {
    const snapshot = getStoredSettingsSnapshot(effectiveSettings);
    const fileDate = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.download = `cs-pension-parameters-${fileDate}.json`;
    window.document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
    showSavedLabel();
  }

  function setLocalStorageEnabled(enabled: boolean) {
    saveLocalStoragePreference(enabled);
    setLocalStorageEnabledState(enabled);

    if (!enabled) {
      clearStoredSettings();
      clearStoredAppPreferences();
      clearStoredComparisonScenarios();
      return;
    }

    saveSettings(settings);
    saveStoredComparisonScenarios(comparisonScenarios);
    saveStoredGuidanceNotes(showGuidanceNotes);

    if (hasAcknowledgedNotice) {
      saveAcknowledgementState();
    }

    if (appMode) {
      saveStoredAppMode(appMode);
    }
  }

  const journeyStepViewModel: JourneyStepViewModel = {
    settings: effectiveSettings,
    validationIssues,
    pensionSummary,
    retirementIncomeSeries,
    bridgeChartParameters,
    bridgeChartLimits,
    derivedInflationAssumptions,
    projectionRows,
    retirementIncomeDisplay,
    retirementIncomeItems,
    retirementIncomeTitle,
    retirementIncomeTotal,
    retirementIncomeTargetTitle,
    retirementIncomeTarget,
    showGuidanceNotes,
    useDropdownDates,
    onChange: updateSetting,
    onChangeChartParameters: updateBridgeChartParameters,
    comparisonScenarios,
    comparisonResultCache,
    onScenariosChange: setComparisonScenarios,
    onLoadScenario: loadComparisonScenario,
    onRetirementIncomeDisplayChange: setRetirementIncomeDisplay,
  };

  function acknowledgeNotice() {
    setHasAcknowledgedNotice(true);
    saveAcknowledgementState();
  }

  function selectAppMode(mode: AppMode) {
    if (mode === "simple") {
      setSimpleJourneySettings(
        (current) => current ?? applySimpleJourneyDefaults(settings)
      );
    }

    selectAppModeAction({
      mode,
      currentMode: appMode,
      setSettings,
      setChartUndoStack,
      shouldFocusActiveModeRef: shouldFocusActiveMode,
      scrollActiveModeIntoView,
      setAppMode,
    });
  }

  return {
    activeJourneyDefinition,
    activeJourneyMode,
    activeModeRef,
    acknowledgeNotice,
    appMode,
    bridgeChartLimits,
    bridgeChartParameters,
    comparisonResultCache,
    comparisonScenarios,
    deferredSettings,
    derivedInflationAssumptions,
    exportParameters,
    hasAcknowledgedNotice,
    journeyStepViewModel,
    loadParameters,
    localStorageEnabled,
    loadComparisonScenario,
    pensionSummary,
    projectionRows,
    resetSettings,
    retirementIncomeDisplay,
    retirementIncomeItems,
    retirementIncomeSeries,
    retirementIncomeTarget,
    retirementIncomeTargetTitle,
    retirementIncomeTitle,
    retirementIncomeTotal,
    selectAppMode,
    setLocalStorageEnabled,
    setComparisonScenarios,
    setRetirementIncomeDisplay,
    setShowGuidanceNotes,
    settings,
    settingsFormVersion,
    showGuidanceNotes,
    showSavedFeedback,
    updateBridgeChartParameters,
    updateSetting,
    useDropdownDates,
    validationIssues,
    visibleSettings: effectiveSettings,
  };
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}
