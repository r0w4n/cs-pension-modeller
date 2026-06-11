import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import type { ComparisonScenario } from "../app-domains";
import {
  createDefaultSettings,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import {
  MAX_COMPARISON_SCENARIOS,
  useScenarioActions,
} from "./comparison-state";

function createScenario(
  id: string,
  name: string,
  settings: PensionSettings = createDefaultSettings()
): ComparisonScenario {
  return {
    id,
    name,
    settings,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function renderScenarioActions({
  initialScenarios = [],
  settings = createDefaultSettings(),
  validationIssues = [],
}: {
  initialScenarios?: ComparisonScenario[];
  settings?: PensionSettings;
  validationIssues?: PensionValidationIssue[];
} = {}) {
  return renderHook(() => {
    const [scenarios, setScenarios] = useState(initialScenarios);
    const actions = useScenarioActions({
      scenarios,
      settings,
      validationIssues,
      onScenariosChange: setScenarios,
    });

    return { ...actions, scenarios };
  });
}

describe("comparison state scenario actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a cloned scenario with a trimmed custom name and clears the draft", () => {
    const settings = createDefaultSettings();
    const { result } = renderScenarioActions({ settings });

    act(() => {
      result.current.setScenarioNameDraft("  Early retirement  ");
    });
    act(() => {
      result.current.addCurrentScenario();
    });

    expect(result.current.scenarios).toHaveLength(1);
    expect(result.current.scenarios[0]?.name).toBe("Early retirement");
    expect(result.current.scenarios[0]?.settings).toEqual(settings);
    expect(result.current.scenarios[0]?.settings).not.toBe(settings);
    expect(result.current.scenarioNameDraft).toBe("");
  });

  it("uses the next numbered fallback name when the draft is blank", () => {
    const { result } = renderScenarioActions({
      initialScenarios: [createScenario("scenario-1", "Scenario 1")],
    });

    act(() => {
      result.current.addCurrentScenario();
    });

    expect(result.current.scenarios[1]?.name).toBe("Scenario 2");
  });

  it("blocks adding scenarios when validation fails or the limit is reached", () => {
    const { result: invalidResult } = renderScenarioActions({
      validationIssues: [
        {
          field: "desiredRetirementIncome",
          message: "Required",
        },
      ],
    });

    act(() => {
      invalidResult.current.setScenarioNameDraft("Blocked");
    });
    act(() => {
      invalidResult.current.addCurrentScenario();
    });

    expect(invalidResult.current.scenarios).toHaveLength(0);

    const { result: fullResult } = renderScenarioActions({
      initialScenarios: Array.from(
        { length: MAX_COMPARISON_SCENARIOS },
        (_, index) =>
          createScenario(`scenario-${index + 1}`, `Scenario ${index + 1}`)
      ),
    });

    act(() => {
      fullResult.current.setScenarioNameDraft("One too many");
    });
    act(() => {
      fullResult.current.addCurrentScenario();
    });

    expect(fullResult.current.scenarios).toHaveLength(MAX_COMPARISON_SCENARIOS);
  });

  it("renames scenarios with a numbered fallback and can remove them", () => {
    const { result } = renderScenarioActions({
      initialScenarios: [
        createScenario("scenario-1", "Scenario 1"),
        createScenario("scenario-2", "Scenario 2"),
      ],
    });

    act(() => {
      result.current.renameScenario("scenario-2", "  ");
    });

    expect(result.current.scenarios[1]?.name).toBe("Scenario 2");
    expect(result.current.scenarios[1]?.updatedAt).toBe(
      "2026-06-09T12:00:00.000Z"
    );

    act(() => {
      result.current.removeScenario("scenario-1");
    });

    expect(result.current.scenarios.map((scenario) => scenario.id)).toEqual([
      "scenario-2",
    ]);
  });
});
