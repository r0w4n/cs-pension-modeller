import { useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "../analytics";
import type { SettingsKey } from "../fieldDefinitions";
import type { RetirementIncomeChartParameters } from "../result-projection/retirement-income-chart-model";
import {
  clearAllLocalStorageData,
  clearStoredSettings,
  isLocalStorageEnabled as loadLocalStorageEnabled,
  saveLocalStoragePreference,
  saveSettingsByJourney,
  type PensionSettings,
} from "../settings";
import { DEFAULT_JOURNEY_SETTINGS_PRESENTATION } from "../app-domains";
import {
  clonePensionSettings,
  getSettingsSignature,
} from "../result-projection/comparison-result";
import {
  loadAcknowledgementState,
  loadStoredGuidanceNotes,
  loadStoredComparisonRetirementIncomeDisplay,
  loadStoredJourneyRetirementIncomeDisplay,
  saveAcknowledgementState,
  clearStoredAppPreferences,
  saveStoredAppMode,
  saveStoredGuidanceNotes,
  saveStoredComparisonRetirementIncomeDisplay,
  saveStoredJourneyRetirementIncomeDisplay,
  type AppMode,
  type RetirementIncomeDisplay,
} from "./app-persistence";
import {
  loadComparisonScenario as loadComparisonScenarioAction,
  selectAppMode as selectAppModeAction,
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
import {
  clearStoredComparisonScenarios,
  saveStoredComparisonScenarios,
} from "./comparison-storage";
import { getCachedComparisonResult } from "./comparison-result-cache";

export function useAppController() {
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
  const {
    exportParameters,
    loadParameters,
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
    retirementPlanResultCache,
    setComparisonScenarios,
  } = useComparisonState();
  const [hasAcknowledgedNotice, setHasAcknowledgedNotice] = useState(
    loadAcknowledgementState
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
    pensionSummary,
    projectionRows,
    retirementPlanResult,
    retirementIncomeSeries,
    targetBasedWithdrawalPreviews,
    validationIssues,
  } = useProjectionCalculations({
    settings,
    retirementIncomeDisplay: journeyRetirementIncomeDisplay,
    retirementPlanResultCache,
  });
  const currentComparisonResult = useMemo(() => {
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

  function clearAllData() {
    trackAnalyticsEvent("local_data_cleared");
    clearAllLocalStorageData();
  }

  function setLocalStorageEnabled(enabled: boolean) {
    trackAnalyticsEvent("local_storage_preference_changed", {
      enabled,
    });
    saveLocalStoragePreference(enabled);
    setLocalStorageEnabledState(enabled);

    if (!enabled) {
      clearStoredSettings();
      clearStoredAppPreferences();
      clearStoredComparisonScenarios();
      return;
    }

    if (appMode) {
      saveStoredAppMode(appMode);
    }

    saveSettingsByJourney(settingsByJourney);
    saveStoredComparisonScenarios(comparisonScenarios);
    saveStoredGuidanceNotes(showGuidanceNotes);
    saveStoredJourneyRetirementIncomeDisplay(journeyRetirementIncomeDisplay);
    saveStoredComparisonRetirementIncomeDisplay(
      comparisonRetirementIncomeDisplay
    );

    if (hasAcknowledgedNotice) {
      saveAcknowledgementState();
    }
  }

  const journeyStepViewModel: JourneyStepViewModel = {
    settings,
    isProjectionPending,
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

  function acknowledgeNotice() {
    trackAnalyticsEvent("notice_acknowledged");
    setHasAcknowledgedNotice(true);
    saveAcknowledgementState();
  }

  function selectAppMode(mode: AppMode) {
    trackAnalyticsEvent("journey_selected", {
      journey_mode: mode,
      previous_journey_mode: appMode ?? "none",
    });

    selectAppModeAction({
      mode,
      currentMode: appMode,
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
    updateRetirementIncomeChartParameters,
    updateSetting,
    useDropdownDates,
    validationIssues,
    visibleSettings: settings,
  };
}
