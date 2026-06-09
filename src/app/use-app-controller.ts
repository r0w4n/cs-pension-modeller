import { startTransition, useEffect, useState } from "react";
import type { SettingsKey } from "../fieldDefinitions";
import type { RetirementIncomeBridgeParameters } from "../RetirementIncomeBridgeChart";
import {
  clearAllLocalStorageData,
  clearStoredSettings,
  isLocalStorageEnabled as loadLocalStorageEnabled,
  saveLocalStoragePreference,
  saveSettings,
  type PensionSettings,
} from "../settings";
import {
  clearStoredComparisonScenarios,
  saveStoredComparisonScenarios,
} from "../app-domains";
import {
  loadAcknowledgementState,
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
} from "./app-actions";
import {
  updateBridgeChartParameters as updateBridgeChartParametersAction,
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
import { applySimpleJourneyDefaults } from "../app-domains/journeys";
import type { RetirementIncomeDisplay } from "../projection";

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
    effectiveSettings,
    exportParameters,
    loadParameters,
    setActiveJourneySettings,
    setSettings,
    setSettingsFormVersion,
    setSimpleJourneySettings,
    settings,
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
  const [retirementIncomeDisplay, setRetirementIncomeDisplay] =
    useState<RetirementIncomeDisplay>("monthly");
  const { comparisonResultCache, comparisonScenarios, setComparisonScenarios } =
    useComparisonState();
  const [hasAcknowledgedNotice, setHasAcknowledgedNotice] = useState(
    loadAcknowledgementState
  );
  const [localStorageEnabled, setLocalStorageEnabledState] = useState(
    loadLocalStorageEnabled
  );
  const useDropdownDates = useMobileDateDropdownsHook();
  const {
    bridgeChartLimits,
    bridgeChartParameters,
    deferredSettings,
    derivedInflationAssumptions,
    pensionSummary,
    projectionRows,
    retirementIncomeItems,
    retirementIncomeSeries,
    retirementIncomeTarget,
    retirementIncomeTargetTitle,
    retirementIncomeTitle,
    retirementIncomeTotal,
    validationIssues,
  } = useProjectionCalculations({
    effectiveSettings,
    retirementIncomeDisplay,
  });

  useUndoShortcut({
    activeJourneyMode,
    chartUndoStack,
    setChartUndoStack,
    setSettings,
    setSimpleJourneySettings,
  });

  useEffect(() => {
    saveStoredGuidanceNotes(showGuidanceNotes);
  }, [showGuidanceNotes]);

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
      savedFeedbackTimerRef,
      setShowSavedFeedback,
      scenarioSettings,
      setChartUndoStack,
      setSettingsFormVersion,
      setSettings: setActiveJourneySettings,
    });
  }

  function clearAllData() {
    clearAllLocalStorageData();
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

    if (appMode) {
      saveStoredAppMode(appMode);
    }

    saveSettings(settings);
    saveStoredComparisonScenarios(comparisonScenarios);
    saveStoredGuidanceNotes(showGuidanceNotes);

    if (hasAcknowledgedNotice) {
      saveAcknowledgementState();
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
    clearAllData,
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
