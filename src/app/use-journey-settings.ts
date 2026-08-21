import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  getStoredSettingsEnvelope,
  loadStoredSettingsByJourney,
  parseStoredSettingsByJourney,
  saveSettingsByJourney,
  type PensionSettings,
  type PensionSettingsByJourney,
} from "../settings";
import {
  applyBridgeJourneyDefaults,
  applyExpertJourneyDefaults,
  applySimpleJourneyDefaults,
} from "../app-domains/journeys";
import type { AppMode } from "./app-persistence";

type SetChartUndoStack = Dispatch<SetStateAction<PensionSettings[]>>;

export function formatParameterExportTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("-");
}

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
  const [settingsByJourney, setSettingsByJourney] =
    useState<PensionSettingsByJourney>(() => {
      const loaded = loadStoredSettingsByJourney();

      return loaded.migratedFromLegacy
        ? applyLegacyJourneyDefaults(loaded.settings)
        : loaded.settings;
    });
  const activeSettingsJourney = activeJourneyMode ?? initialAppMode ?? "expert";
  const settings = settingsByJourney[activeSettingsJourney];
  const setSettings = useCallback(
    (
      value: PensionSettings | ((current: PensionSettings) => PensionSettings)
    ) => {
      setSettingsByJourney((current) => ({
        ...current,
        [activeSettingsJourney]:
          typeof value === "function"
            ? value(current[activeSettingsJourney])
            : value,
      }));
    },
    [activeSettingsJourney]
  );
  const [settingsFormVersion, setSettingsFormVersion] = useState(0);

  useEffect(() => {
    saveSettingsByJourney(settingsByJourney);
  }, [settingsByJourney]);

  const setActiveJourneySettings = setSettings;

  function loadParameters(input: unknown) {
    const imported = parseStoredSettingsByJourney(input);

    if (!imported) {
      return false;
    }

    const importedSettings = imported.migratedFromLegacy
      ? applyLegacyJourneyDefaults(imported.settings)
      : imported.settings;

    saveSettingsByJourney(importedSettings);
    showSavedLabel();
    setChartUndoStack([]);
    setSettingsFormVersion((current) => current + 1);
    setSettingsByJourney(importedSettings);

    return true;
  }

  function exportParameters() {
    const snapshot = getStoredSettingsEnvelope(settingsByJourney);
    const exportTimestamp = formatParameterExportTimestamp(new Date());
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.download = `cs-pension-parameters-${exportTimestamp}.json`;
    window.document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
    showSavedLabel();
  }

  return {
    exportParameters,
    loadParameters,
    setActiveJourneySettings,
    setSettings,
    setSettingsFormVersion,
    settings,
    settingsByJourney,
    settingsFormVersion,
  };
}

function applyLegacyJourneyDefaults(
  settings: PensionSettingsByJourney
): PensionSettingsByJourney {
  return {
    simple: applySimpleJourneyDefaults(settings.simple),
    bridge: applyBridgeJourneyDefaults(settings.bridge),
    expert: applyExpertJourneyDefaults(settings.expert),
  };
}
