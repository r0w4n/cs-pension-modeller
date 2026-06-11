import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  getStoredSettingsSnapshot,
  loadStoredSettings,
  parseStoredSettings,
  saveSettings,
  type PensionSettings,
} from "../settings";
import {
  applySimpleJourneyAssumptions,
  applySimpleJourneyDefaults,
  mergeSimpleJourneySettings,
} from "../app-domains/journeys";
import type { AppMode } from "./app-persistence";

type SetChartUndoStack = Dispatch<SetStateAction<PensionSettings[]>>;

export function useJourneySettings({
  activeJourneyMode,
  initialAppMode,
  setChartUndoStack,
  showSavedLabel,
}: {
  activeJourneyMode: AppMode | null;
  initialAppMode: AppMode | null;
  setChartUndoStack: SetChartUndoStack;
  showSavedLabel: () => void;
}) {
  const [settings, setSettings] = useState<PensionSettings>(() => {
    const storedSettings = loadStoredSettings();

    return initialAppMode === "simple"
      ? applySimpleJourneyDefaults(storedSettings)
      : storedSettings;
  });
  const [settingsFormVersion, setSettingsFormVersion] = useState(0);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const effectiveSettings = useMemo(
    () =>
      activeJourneyMode === "simple"
        ? applySimpleJourneyAssumptions(settings)
        : settings,
    [activeJourneyMode, settings]
  );

  const setActiveJourneySettings = useCallback(
    (
      value: PensionSettings | ((current: PensionSettings) => PensionSettings)
    ) => {
      if (activeJourneyMode === "simple") {
        setSettings((current) => {
          const baseSettings = applySimpleJourneyAssumptions(current);
          const nextSettings =
            typeof value === "function" ? value(baseSettings) : value;
          const sharedSettings =
            nextSettings.dateOfBirth !== current.dateOfBirth
              ? applySimpleJourneyDefaults(nextSettings)
              : nextSettings;

          return mergeSimpleJourneySettings(current, sharedSettings);
        });
        return;
      }

      if (typeof value === "function") {
        setSettings((current) => value(current));
        return;
      }

      setSettings(value);
    },
    [activeJourneyMode]
  );

  function loadParameters(input: unknown) {
    const importedSettings = parseStoredSettings(input);

    if (!importedSettings) {
      return false;
    }

    saveSettings(importedSettings);
    showSavedLabel();
    setChartUndoStack([]);
    setSettingsFormVersion((current) => current + 1);
    setSettings(
      activeJourneyMode === "simple"
        ? applySimpleJourneyDefaults(importedSettings)
        : importedSettings
    );

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

  return {
    effectiveSettings,
    exportParameters,
    loadParameters,
    setActiveJourneySettings,
    setSettings,
    setSettingsFormVersion,
    settings,
    settingsFormVersion,
  };
}
