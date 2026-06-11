import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { PensionSettings } from "../settings";
import {
  applyBridgeJourneyDefaults,
  clonePensionSettings,
} from "../app-domains";
import { saveStoredAppMode, type AppMode } from "./app-persistence";

type SetSettings = Dispatch<SetStateAction<PensionSettings>>;
type SetChartUndoStack = Dispatch<SetStateAction<PensionSettings[]>>;
type SetAppMode = Dispatch<SetStateAction<AppMode | null>>;
type SetBoolean = Dispatch<SetStateAction<boolean>>;
type SetNumber = Dispatch<SetStateAction<number>>;

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
  setSettings,
  setChartUndoStack,
  shouldFocusActiveModeRef,
  scrollActiveModeIntoView,
  setAppMode,
}: {
  mode: AppMode;
  currentMode: AppMode | null;
  setSettings: SetSettings;
  setChartUndoStack: SetChartUndoStack;
  shouldFocusActiveModeRef: MutableRefObject<boolean>;
  scrollActiveModeIntoView: () => void;
  setAppMode: SetAppMode;
}) {
  if (mode === "bridge") {
    setSettings((current) => applyBridgeJourneyDefaults(current));
    setChartUndoStack([]);
  }

  if (mode === "simple") {
    setChartUndoStack([]);
  }

  shouldFocusActiveModeRef.current = true;
  if (mode === currentMode) {
    scrollActiveModeIntoView();
  }
  setAppMode(mode);
  saveStoredAppMode(mode);
}
