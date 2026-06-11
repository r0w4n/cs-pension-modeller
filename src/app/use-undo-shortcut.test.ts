import { fireEvent, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { defaultSettings, type PensionSettings } from "../settings";
import { useUndoShortcut } from "./use-undo-shortcut";

function createSettings(
  overrides: Partial<PensionSettings> = {}
): PensionSettings {
  return {
    ...defaultSettings,
    ...overrides,
  };
}

describe("useUndoShortcut", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("applies the last undo state for non-editable keyboard shortcuts", () => {
    const previousSettings = createSettings({ desiredRetirementIncome: 42000 });

    const { result } = renderHook(() => {
      const [settings, setSettings] = useState(createSettings());
      const [chartUndoStack, setChartUndoStack] = useState([previousSettings]);

      useUndoShortcut({
        chartUndoStack,
        setChartUndoStack,
        setSettings,
      });

      return { chartUndoStack, settings };
    });

    fireEvent.keyDown(window, { ctrlKey: true, key: "z" });

    expect(result.current.settings.desiredRetirementIncome).toBe(42000);
    expect(result.current.chartUndoStack).toHaveLength(0);
  });

  it("ignores the shortcut when focus is inside an editable field", () => {
    const previousSettings = createSettings({ desiredRetirementIncome: 42000 });
    const input = document.createElement("input");
    document.body.append(input);

    const { result } = renderHook(() => {
      const [settings, setSettings] = useState(createSettings());
      const [chartUndoStack, setChartUndoStack] = useState([previousSettings]);

      useUndoShortcut({
        chartUndoStack,
        setChartUndoStack,
        setSettings,
      });

      return { chartUndoStack, settings };
    });

    fireEvent.keyDown(input, { ctrlKey: true, key: "z" });

    expect(result.current.settings.desiredRetirementIncome).toBe(
      defaultSettings.desiredRetirementIncome
    );
    expect(result.current.chartUndoStack).toHaveLength(1);
  });

  it("restores simple-journey undo state through the shared settings", () => {
    const previousSettings = createSettings({ dateOfBirth: "1988-03-14" });

    const { result } = renderHook(() => {
      const [settings, setSettings] = useState(
        createSettings({ dateOfBirth: "1990-01-01" })
      );
      const [chartUndoStack, setChartUndoStack] = useState([previousSettings]);

      useUndoShortcut({
        chartUndoStack,
        setChartUndoStack,
        setSettings,
      });

      return { chartUndoStack, settings };
    });

    fireEvent.keyDown(window, { ctrlKey: true, key: "z" });

    expect(result.current.settings.dateOfBirth).toBe("1988-03-14");
    expect(result.current.chartUndoStack).toHaveLength(0);
  });
});
