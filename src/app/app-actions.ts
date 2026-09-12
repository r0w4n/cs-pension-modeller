import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { PensionSettings, PensionSettingsByJourney } from "../settings";
import {
  clearAllLocalStorageData,
  clearStoredSettings,
  saveLocalStoragePreference,
  saveSettingsByJourney,
  signalLocalDataReset,
} from "../settings";
import {
  clonePensionSettings,
  type ComparisonScenario,
} from "../result-projection/comparison-result";
import {
  clearStoredAppPreferences,
  saveAcknowledgementState,
  saveAnalyticsConsentState,
  saveStoredComparisonRetirementIncomeDisplay,
  saveStoredGuidanceNotes,
  saveStoredJourneyRetirementIncomeDisplay,
  saveStoredAppMode,
  type AppMode,
  type RetirementIncomeDisplay,
} from "./app-persistence";
import {
  clearStoredComparisonScenarios,
  saveStoredComparisonScenarios,
} from "./comparison-storage";

type SetSettings = Dispatch<SetStateAction<PensionSettings>>;
type SetChartUndoStack = Dispatch<SetStateAction<PensionSettings[]>>;
type SetAppMode = Dispatch<SetStateAction<AppMode | null>>;
type SetBoolean = Dispatch<SetStateAction<boolean>>;
type SetNumber = Dispatch<SetStateAction<number>>;
type SetDisplay = Dispatch<SetStateAction<RetirementIncomeDisplay>>;

export type LocalDataClearResult = {
  persistentDataCleared: boolean;
  localSavingDisabled: boolean;
};

export function clearLocalData() {
  const persistentDataCleared = clearAllLocalStorageData();
  const localSavingDisabled = saveLocalStoragePreference(false);
  signalLocalDataReset();

  return {
    persistentDataCleared,
    localSavingDisabled,
  };
}

export function disableLocalSavingAndClearStoredData() {
  const persistentDataCleared = [
    clearStoredSettings(),
    clearStoredAppPreferences(),
    clearStoredComparisonScenarios(),
  ].every(Boolean);
  const localSavingDisabled = saveLocalStoragePreference(false);
  signalLocalDataReset();

  return {
    persistentDataCleared,
    localSavingDisabled,
  };
}

export function enableLocalSavingAndPersistState({
  appMode,
  settingsByJourney,
  comparisonScenarios,
  showGuidanceNotes,
  journeyRetirementIncomeDisplay,
  comparisonRetirementIncomeDisplay,
  analyticsConsentGranted,
  hasAcknowledgedNotice,
}: {
  appMode: AppMode | null;
  settingsByJourney: PensionSettingsByJourney;
  comparisonScenarios: ComparisonScenario[];
  showGuidanceNotes: boolean;
  journeyRetirementIncomeDisplay: RetirementIncomeDisplay;
  comparisonRetirementIncomeDisplay: RetirementIncomeDisplay;
  analyticsConsentGranted: boolean;
  hasAcknowledgedNotice: boolean;
}) {
  const outcomes = [
    appMode ? saveStoredAppMode(appMode) : true,
    saveSettingsByJourney(settingsByJourney),
    saveStoredComparisonScenarios(comparisonScenarios),
    saveStoredGuidanceNotes(showGuidanceNotes),
    saveStoredJourneyRetirementIncomeDisplay(journeyRetirementIncomeDisplay),
    saveStoredComparisonRetirementIncomeDisplay(
      comparisonRetirementIncomeDisplay
    ),
    saveAnalyticsConsentState(analyticsConsentGranted),
  ];

  if (hasAcknowledgedNotice) {
    outcomes.push(saveAcknowledgementState());
  }

  return outcomes.every(Boolean);
}

export function resetLocalDataState({
  resetSettingsToDefaults,
  resetComparisonScenarios,
  setLocalStorageEnabled,
  setIsResultsStepActive,
  setAppMode,
  setHasAcknowledgedNotice,
  setAnalyticsConsentGranted,
  setShowGuidanceNotes,
  setJourneyRetirementIncomeDisplay,
  setComparisonRetirementIncomeDisplay,
}: {
  resetSettingsToDefaults: () => void;
  resetComparisonScenarios: () => void;
  setLocalStorageEnabled: SetBoolean;
  setIsResultsStepActive: SetBoolean;
  setAppMode: SetAppMode;
  setHasAcknowledgedNotice: SetBoolean;
  setAnalyticsConsentGranted: SetBoolean;
  setShowGuidanceNotes: SetBoolean;
  setJourneyRetirementIncomeDisplay: SetDisplay;
  setComparisonRetirementIncomeDisplay: SetDisplay;
}): LocalDataClearResult {
  const clearResult = clearLocalData();
  resetApplicationLocalDataState({
    resetSettingsToDefaults,
    resetComparisonScenarios,
    setLocalStorageEnabled,
    setIsResultsStepActive,
    setAppMode,
    setHasAcknowledgedNotice,
    setAnalyticsConsentGranted,
    setShowGuidanceNotes,
    setJourneyRetirementIncomeDisplay,
    setComparisonRetirementIncomeDisplay,
  });

  return clearResult;
}

export function resetApplicationLocalDataState({
  resetSettingsToDefaults,
  resetComparisonScenarios,
  setLocalStorageEnabled,
  setIsResultsStepActive,
  setAppMode,
  setHasAcknowledgedNotice,
  setAnalyticsConsentGranted,
  setShowGuidanceNotes,
  setJourneyRetirementIncomeDisplay,
  setComparisonRetirementIncomeDisplay,
}: {
  resetSettingsToDefaults: () => void;
  resetComparisonScenarios: () => void;
  setLocalStorageEnabled: SetBoolean;
  setIsResultsStepActive: SetBoolean;
  setAppMode: SetAppMode;
  setHasAcknowledgedNotice: SetBoolean;
  setAnalyticsConsentGranted: SetBoolean;
  setShowGuidanceNotes: SetBoolean;
  setJourneyRetirementIncomeDisplay: SetDisplay;
  setComparisonRetirementIncomeDisplay: SetDisplay;
}) {
  setLocalStorageEnabled(false);
  resetSettingsToDefaults();
  resetComparisonScenarios();
  setIsResultsStepActive(false);
  setAppMode(null);
  setHasAcknowledgedNotice(false);
  setAnalyticsConsentGranted(false);
  setShowGuidanceNotes(true);
  setJourneyRetirementIncomeDisplay("monthly");
  setComparisonRetirementIncomeDisplay("monthly");
}

export function showSavedLabel({
  savedFeedbackTimerRef,
  setShowSavedFeedback,
}: {
  savedFeedbackTimerRef: MutableRefObject<ReturnType<
    typeof window.setTimeout
  > | null>;
  setShowSavedFeedback: SetBoolean;
}) {
  if (savedFeedbackTimerRef.current) {
    window.clearTimeout(savedFeedbackTimerRef.current);
  }

  setShowSavedFeedback(true);
  savedFeedbackTimerRef.current = window.setTimeout(() => {
    setShowSavedFeedback(false);
    savedFeedbackTimerRef.current = null;
  }, 1400);
}

export function loadComparisonScenario({
  savedFeedbackTimerRef,
  setShowSavedFeedback,
  scenarioSettings,
  setChartUndoStack,
  setSettingsFormVersion,
  setSettings,
}: {
  savedFeedbackTimerRef: MutableRefObject<ReturnType<
    typeof window.setTimeout
  > | null>;
  setShowSavedFeedback: SetBoolean;
  scenarioSettings: PensionSettings;
  setChartUndoStack: SetChartUndoStack;
  setSettingsFormVersion: SetNumber;
  setSettings: SetSettings;
}) {
  showSavedLabel({ savedFeedbackTimerRef, setShowSavedFeedback });
  setChartUndoStack([]);
  setSettingsFormVersion((current) => current + 1);
  setSettings(clonePensionSettings(scenarioSettings));
}

export function selectAppMode({
  mode,
  currentMode,
  setChartUndoStack,
  shouldFocusActiveModeRef,
  scrollActiveModeIntoView,
  setAppMode,
}: {
  mode: AppMode;
  currentMode: AppMode | null;
  setChartUndoStack: SetChartUndoStack;
  shouldFocusActiveModeRef: MutableRefObject<boolean>;
  scrollActiveModeIntoView: () => void;
  setAppMode: SetAppMode;
}) {
  setChartUndoStack([]);

  shouldFocusActiveModeRef.current = true;
  if (mode === currentMode) {
    scrollActiveModeIntoView();
  }
  setAppMode(mode);
  saveStoredAppMode(mode);
}
