import { useEffect, type Dispatch, type SetStateAction } from "react";
import { clonePensionSettings } from "../app-domains";
import type { PensionSettings } from "../settings";
import type { AppMode } from "./app-persistence";

type SetChartUndoStack = Dispatch<SetStateAction<PensionSettings[]>>;
type SetSettings = Dispatch<SetStateAction<PensionSettings>>;
type SetSimpleJourneySettings = Dispatch<
  SetStateAction<PensionSettings | null>
>;

export function useUndoShortcut({
  activeJourneyMode,
  chartUndoStack,
  setChartUndoStack,
  setSettings,
  setSimpleJourneySettings,
}: {
  activeJourneyMode: AppMode | null;
  chartUndoStack: PensionSettings[];
  setChartUndoStack: SetChartUndoStack;
  setSettings: SetSettings;
  setSimpleJourneySettings: SetSimpleJourneySettings;
}) {
  useEffect(() => {
    const handleUndoShortcut = (event: KeyboardEvent) => {
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
  }, [
    activeJourneyMode,
    chartUndoStack.length,
    setChartUndoStack,
    setSettings,
    setSimpleJourneySettings,
  ]);
}

export function isEditableShortcutTarget(target: EventTarget | null) {
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
