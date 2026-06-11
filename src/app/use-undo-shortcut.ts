import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { PensionSettings } from "../settings";

type SetChartUndoStack = Dispatch<SetStateAction<PensionSettings[]>>;
type SetSettings = Dispatch<SetStateAction<PensionSettings>>;

export function useUndoShortcut({
  chartUndoStack,
  setChartUndoStack,
  setSettings,
}: {
  chartUndoStack: PensionSettings[];
  setChartUndoStack: SetChartUndoStack;
  setSettings: SetSettings;
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

        setSettings(previousSettings);

        return current.slice(0, -1);
      });
    };

    window.addEventListener("keydown", handleUndoShortcut);

    return () => window.removeEventListener("keydown", handleUndoShortcut);
  }, [chartUndoStack.length, setChartUndoStack, setSettings]);
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
