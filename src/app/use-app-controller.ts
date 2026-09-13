import { useCallback, useEffect, useMemo, useState } from "react";
import { disableAnalytics, trackAnalyticsEvent } from "../analytics";
import type { SettingsKey } from "../fieldDefinitions";
import type { RetirementIncomeChartParameters } from "../result-projection/retirement-income-chart-model";
import {
  isLocalStorageEnabled as loadLocalStorageEnabled,
  LOCAL_DATA_RESET_SIGNAL_KEY,
  LOCAL_STORAGE_ENABLED_KEY,
  saveLocalStoragePreference,
  type PensionSettings,
} from "../settings";
import { DEFAULT_JOURNEY_SETTINGS_PRESENTATION } from "../app-domains";
import {
  clonePensionSettings,
  getSettingsSignature,
} from "../result-projection/comparison-result";
import {
  loadAcknowledgementState,
  loadAnalyticsConsentState as loadStoredAnalyticsConsentState,
  loadStoredGuidanceNotes,
  loadStoredComparisonRetirementIncomeDisplay,
  loadStoredJourneyRetirementIncomeDisplay,
  saveAcknowledgementState,
  saveAnalyticsConsentState,
  saveStoredComparisonRetirementIncomeDisplay,
  saveStoredGuidanceNotes,
  saveStoredJourneyRetirementIncomeDisplay,
  ANALYTICS_CONSENT_STORAGE_KEY,
  type AppMode,
  type RetirementIncomeDisplay,
} from "./app-persistence";
import {
  disableLocalSavingAndClearStoredData,
  enableLocalSavingAndPersistState,
  loadComparisonScenario as loadComparisonScenarioAction,
  resetApplicationLocalDataState,
  resetLocalDataState,
  selectAppMode as selectAppModeAction,
  type LocalDataClearResult,
} from "./app-actions";
import {
  updateRetirementIncomeChartParameters as updateRetirementIncomeChartParametersAction,
  updateSetting as updateSettingAction,
} from "./chart-state";
import { useMobileDateDropdowns as useMobileDateDropdownsHook } from "./form-fields";
import type { JourneyStepViewModel } from "./journey-step-content";
import { useAppModeState } from "./use-app-mode-state";
import { useComparisonState } from "./use-comparison-state";
import { useJourneySettings } from "./use-journey-settings";
import { useProjectionCalculations } from "./use-projection-calculations";
import { useSavedFeedback } from "./use-saved-feedback";
import { useUndoShortcut } from "./use-undo-shortcut";
import { getCachedComparisonResult } from "./comparison-result-cache";
import { useSupportPrompt } from "./use-support-prompt";

export function useAppController() {
  const [isResultsStepActive, setIsResultsStepActive] = useState(false);
  const {
    activeJourneyDefinition,
    activeJourneyMode,
    activeModeRef,
    appMode,
    initialAppMode,
    scrollActiveModeIntoView,
    setAppMode,
    shouldFocusActiveMode,
  } = useAppModeState();
  const {
    savedFeedbackTimerRef,
    setShowSavedFeedback,
    showSavedFeedback,
    showSavedLabel,
  } = useSavedFeedback();
  const [chartUndoStack, setChartUndoStack] = useState<PensionSettings[]>([]);
  const [calculationInvalidationToken, setCalculationInvalidationToken] =
    useState(0);
  const {
    exportParameters,
    loadParameters,
    resetSettingsToDefaults,
    setActiveJourneySettings,
    setSettings,
    setSettingsFormVersion,
    settings,
    settingsByJourney,
    settingsFormVersion,
  } = useJourneySettings({
    activeJourneyMode,
    initialAppMode,
    setChartUndoStack,
    showSavedLabel,
  });
  const [showGuidanceNotes, setShowGuidanceNotes] = useState(
    loadStoredGuidanceNotes
  );
  const [journeyRetirementIncomeDisplay, setJourneyRetirementIncomeDisplay] =
    useState<RetirementIncomeDisplay>(loadStoredJourneyRetirementIncomeDisplay);
  const [
    comparisonRetirementIncomeDisplay,
    setComparisonRetirementIncomeDisplay,
  ] = useState<RetirementIncomeDisplay>(
    loadStoredComparisonRetirementIncomeDisplay
  );
  const {
    comparisonResultCache,
    comparisonScenarios,
    resetComparisonScenarios,
    retirementPlanResultCache,
    setComparisonScenarios,
  } = useComparisonState();
  const [hasAcknowledgedNotice, setHasAcknowledgedNotice] = useState(
    loadAcknowledgementState
  );
  const [analyticsConsentGranted, setAnalyticsConsentGrantedState] = useState(
    loadStoredAnalyticsConsentState
  );
  const [localStorageEnabled, setLocalStorageEnabledState] = useState(
    loadLocalStorageEnabled
  );
  const useDropdownDates = useMobileDateDropdownsHook();
  const {
    retirementIncomeChartLimits,
    retirementIncomeChartParameters,
    deferredSettings,
    derivedInflationAssumptions,
    flexibleWithdrawalSummary,
    incomeAgeRangeItems,
    isProjectionPending,
    calculationError,
    pensionSummary,
    projectionRows,
    retirementPlanResult,
    retirementIncomeSeries,
    targetBasedWithdrawalPreviews,
    clearCalculationState,
    retryFailedCalculation,
    validationIssues,
  } = useProjectionCalculations({
    settings,
    retirementIncomeDisplay: journeyRetirementIncomeDisplay,
    retirementPlanResultCache,
    calculationEnabled: isResultsStepActive,
    invalidationToken: calculationInvalidationToken,
  });
  const { viewModel: supportPrompt, reset: resetSupportPrompt } =
    useSupportPrompt({
      isResultsStepActive,
      isProjectionPending,
      calculationError,
      retirementPlanResult,
      localStorageEnabled,
    });
  const currentComparisonResult = useMemo(() => {
    if (!retirementPlanResult) {
      return null;
    }

    const calculatedSettings = retirementPlanResult.settings;

    return getCachedComparisonResult({
      scenario: {
        id: "current-model",
        name: "Current model",
        settings: clonePensionSettings(calculatedSettings),
        createdAt: "",
        updatedAt: "",
      },
      currentSettingsSignature: getSettingsSignature(settings),
      cache: comparisonResultCache,
      precomputedPlan: retirementPlanResult,
      retirementPlanResultCache,
    });
  }, [
    comparisonResultCache,
    retirementPlanResult,
    retirementPlanResultCache,
    settings,
  ]);

  useUndoShortcut({
    chartUndoStack,
    setChartUndoStack,
    setSettings,
  });

  useEffect(() => {
    saveStoredGuidanceNotes(showGuidanceNotes);
  }, [showGuidanceNotes]);

  useEffect(() => {
    saveStoredJourneyRetirementIncomeDisplay(journeyRetirementIncomeDisplay);
  }, [journeyRetirementIncomeDisplay]);

  useEffect(() => {
    saveStoredComparisonRetirementIncomeDisplay(
      comparisonRetirementIncomeDisplay
    );
  }, [comparisonRetirementIncomeDisplay]);

  useEffect(() => {
    saveAnalyticsConsentState(analyticsConsentGranted);
  }, [analyticsConsentGranted]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key !== LOCAL_DATA_RESET_SIGNAL_KEY &&
        !(
          event.key === LOCAL_STORAGE_ENABLED_KEY && event.newValue === "false"
        ) &&
        event.key !== ANALYTICS_CONSENT_STORAGE_KEY &&
        event.key !== null
      ) {
        return;
      }

      if (event.key === ANALYTICS_CONSENT_STORAGE_KEY) {
        const granted = event.newValue === "true";
        setAnalyticsConsentGrantedState(granted);
        if (!granted) {
          disableAnalytics();
        }
        return;
      }

      resetOpenApplicationAfterLocalDataClear();
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  });

  function resetOpenApplicationAfterLocalDataClear() {
    disableAnalytics();
    clearCalculationState();
    resetSupportPrompt();
    setCalculationInvalidationToken((current) => current + 1);
    resetApplicationLocalDataState({
      resetSettingsToDefaults,
      resetComparisonScenarios,
      setLocalStorageEnabled: setLocalStorageEnabledState,
      setIsResultsStepActive,
      setAppMode,
      setHasAcknowledgedNotice,
      setAnalyticsConsentGranted: setAnalyticsConsentGrantedState,
      setShowGuidanceNotes,
      setJourneyRetirementIncomeDisplay,
      setComparisonRetirementIncomeDisplay,
    });
  }

  function updateSetting<K extends SettingsKey>(
    key: K,
    value: PensionSettings[K]
  ) {
    trackAnalyticsEvent("setting_changed", {
      field_id: key,
      journey_mode: activeJourneyMode ?? "none",
    });
    updateSettingAction({
      key,
      value,
      showSavedLabel,
      setChartUndoStack,
      setSettings: setActiveJourneySettings,
      settingsPresentation:
        activeJourneyDefinition?.settingsPresentation ??
        DEFAULT_JOURNEY_SETTINGS_PRESENTATION,
    });
  }

  function updateRetirementIncomeChartParameters(
    patch: Partial<RetirementIncomeChartParameters>
  ) {
    const changedKeys = Object.keys(patch);

    trackAnalyticsEvent("chart_parameter_changed", {
      chart_parameter: changedKeys[0],
      parameter_count: changedKeys.length,
      journey_mode: activeJourneyMode ?? "none",
    });
    updateRetirementIncomeChartParametersAction({
      patch,
      settings,
      showSavedLabel,
      setChartUndoStack,
      setSettings: setActiveJourneySettings,
      settingsPresentation:
        activeJourneyDefinition?.settingsPresentation ??
        DEFAULT_JOURNEY_SETTINGS_PRESENTATION,
    });
  }

  function loadComparisonScenario(scenarioSettings: PensionSettings) {
    trackAnalyticsEvent("comparison_scenario_loaded", {
      scenario_count: comparisonScenarios.length,
      journey_mode: activeJourneyMode ?? "none",
    });
    loadComparisonScenarioAction({
      savedFeedbackTimerRef,
      setShowSavedFeedback,
      scenarioSettings,
      setChartUndoStack,
      setSettingsFormVersion,
      setSettings: setActiveJourneySettings,
    });
  }

  function clearAllData(): LocalDataClearResult {
    trackAnalyticsEvent("local_data_cleared");
    disableAnalytics();
    clearCalculationState();
    resetSupportPrompt();
    setCalculationInvalidationToken((current) => current + 1);
    return resetLocalDataState({
      resetSettingsToDefaults,
      resetComparisonScenarios,
      setLocalStorageEnabled: setLocalStorageEnabledState,
      setIsResultsStepActive,
      setAppMode,
      setHasAcknowledgedNotice,
      setAnalyticsConsentGranted: setAnalyticsConsentGrantedState,
      setShowGuidanceNotes,
      setJourneyRetirementIncomeDisplay,
      setComparisonRetirementIncomeDisplay,
    });
  }

  function setAnalyticsConsent(granted: boolean) {
    setAnalyticsConsentGrantedState(granted);
  }

  function setLocalStorageEnabled(enabled: boolean) {
    trackAnalyticsEvent("local_storage_preference_changed", {
      enabled,
    });
    const preferenceSaved = saveLocalStoragePreference(enabled);
    setLocalStorageEnabledState(enabled);

    if (!enabled) {
      disableAnalytics();
      clearCalculationState();
      setCalculationInvalidationToken((current) => current + 1);
      return disableLocalSavingAndClearStoredData();
    }

    const saved = enableLocalSavingAndPersistState({
      appMode,
      settingsByJourney,
      comparisonScenarios,
      showGuidanceNotes,
      journeyRetirementIncomeDisplay,
      comparisonRetirementIncomeDisplay,
      analyticsConsentGranted,
      hasAcknowledgedNotice,
    });

    if (!preferenceSaved || !saved) {
      const disabled = disableLocalSavingAndClearStoredData();
      setLocalStorageEnabledState(false);
      disableAnalytics();
      return {
        persistentDataCleared: false,
        localSavingDisabled: disabled.localSavingDisabled,
      };
    }

    return {
      persistentDataCleared: true,
      localSavingDisabled: true,
    };
  }

  const journeyStepViewModel: JourneyStepViewModel = {
    settings,
    isProjectionPending,
    calculationError,
    retirementPlanResult,
    currentComparisonResult,
    validationIssues,
    pensionSummary,
    retirementIncomeSeries,
    retirementIncomeChartParameters,
    retirementIncomeChartLimits,
    derivedInflationAssumptions,
    flexibleWithdrawalSummary,
    incomeAgeRangeItems,
    projectionRows,
    targetBasedWithdrawalPreviews,
    retirementIncomeDisplay: journeyRetirementIncomeDisplay,
    comparisonRetirementIncomeDisplay,
    showGuidanceNotes,
    useDropdownDates,
    onChange: updateSetting,
    onChangeChartParameters: updateRetirementIncomeChartParameters,
    comparisonScenarios,
    comparisonResultCache,
    onScenariosChange: setComparisonScenarios,
    onLoadScenario: loadComparisonScenario,
    onRetirementIncomeDisplayChange: setJourneyRetirementIncomeDisplay,
    onComparisonRetirementIncomeDisplayChange:
      setComparisonRetirementIncomeDisplay,
  };

  function acknowledgeNotice(consentGranted: boolean) {
    setHasAcknowledgedNotice(true);
    saveAcknowledgementState();
    setAnalyticsConsent(consentGranted);
  }

  function selectAppMode(mode: AppMode) {
    trackAnalyticsEvent("journey_selected", {
      journey_mode: mode,
      previous_journey_mode: appMode ?? "none",
    });

    setIsResultsStepActive(false);
    selectAppModeAction({
      mode,
      currentMode: appMode,
      setChartUndoStack,
      shouldFocusActiveModeRef: shouldFocusActiveMode,
      scrollActiveModeIntoView,
      setAppMode,
    });
  }

  const setResultsStepActive = useCallback(
    (active: boolean) => {
      if (active) {
        retryFailedCalculation();
      }

      setIsResultsStepActive(active);
    },
    [retryFailedCalculation]
  );

  return {
    activeJourneyDefinition,
    activeJourneyMode,
    activeModeRef,
    acknowledgeNotice,
    appMode,
    analyticsConsentGranted,
    setAnalyticsConsent,
    retirementIncomeChartLimits,
    retirementIncomeChartParameters,
    comparisonResultCache,
    comparisonScenarios,
    deferredSettings,
    derivedInflationAssumptions,
    exportParameters,
    hasAcknowledgedNotice,
    incomeAgeRangeItems,
    journeyStepViewModel,
    loadParameters,
    localStorageEnabled,
    loadComparisonScenario,
    onResultsStepActiveChange: setResultsStepActive,
    pensionSummary,
    projectionRows,
    clearAllData,
    retirementIncomeDisplay: journeyRetirementIncomeDisplay,
    retirementIncomeSeries,
    selectAppMode,
    setLocalStorageEnabled,
    setComparisonScenarios,
    setJourneyRetirementIncomeDisplay,
    setComparisonRetirementIncomeDisplay,
    setShowGuidanceNotes,
    settings,
    settingsFormVersion,
    showGuidanceNotes,
    showSavedFeedback,
    supportPrompt,
    updateRetirementIncomeChartParameters,
    updateSetting,
    useDropdownDates,
    validationIssues,
    visibleSettings: settings,
  };
}
