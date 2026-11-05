import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  createComparisonResult,
  getSettingsSignature,
  type ComparisonScenario,
} from "../result-projection/comparison-result";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { buildIncomeAgeRangeItems } from "../result-projection/income-age-ranges";
import {
  createDefaultSettings,
  createDefaultPartnerSettings,
  saveLocalStoragePreference,
  normalizeSettings,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import {
  MAX_COMPARISON_SCENARIOS,
  buildComparisonPanelData,
  useComparisonState,
  useScenarioActions,
} from "./comparison-state";
import { useComparisonState as useApplicationComparisonState } from "./use-comparison-state";
import { clearLocalData } from "./app-actions";

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

  it("uses the active saved scenario's target basis for income ranges", () => {
    const savedScenario = createScenario("saved", "Saved tax-off plan", {
      ...createDefaultSettings(),
      startDate: "2026-06-01",
      dateOfBirth: "1966-06-01",
      requirementAge: 60,
      lifeExpectancy: 61,
      taxationEnabled: false,
      retirementIncomeTargetBasis: "gross",
    });
    const panel = buildComparisonPanelData({
      currentResult: null,
      currentSettingsSignature: "different-current-plan",
      retirementIncomeDisplay: "annual",
      savedBaseResults: [
        createComparisonResult(
          savedScenario,
          "",
          calculateRetirementPlan(savedScenario.settings)
        ),
      ],
    });

    expect(panel.incomeAgeRangeItems).toEqual(
      buildIncomeAgeRangeItems(panel.activeResult!.summary, "annual", "gross")
    );
  });

  it("keeps comparison projection aligned with the last completed plan", () => {
    const calculatedSettings = createDefaultSettings();
    const pendingSettings = {
      ...calculatedSettings,
      desiredRetirementIncome:
        calculatedSettings.desiredRetirementIncome + 1000,
    };
    const retirementPlanResult = calculateRetirementPlan(calculatedSettings);
    const { result } = renderHook(() =>
      useComparisonState({
        settings: pendingSettings,
        validationIssues: [],
        scenarios: [],
        retirementPlanResult,
      })
    );

    expect(result.current.currentScenario.settings).toEqual(calculatedSettings);
    expect(result.current.currentResult?.scenario.settings).toEqual(
      calculatedSettings
    );
    expect(result.current.currentResult?.currentMatchesSaved).toBe(false);
  });

  it("clears comparison and retirement-plan caches when scenarios are reset", () => {
    const { result } = renderHook(() => useApplicationComparisonState());
    const settings = createDefaultSettings();
    const scenario = createScenario("scenario-1", "Scenario 1", settings);
    const plan = calculateRetirementPlan(settings);
    const comparisonResult = createComparisonResult(
      scenario,
      JSON.stringify(settings),
      plan
    );
    const {
      currentMatchesSaved: _currentMatchesSaved,
      scenario: _scenario,
      ...cachedResult
    } = comparisonResult;

    act(() => {
      result.current.comparisonResultCache.set(
        getSettingsSignature(settings),
        cachedResult
      );
      result.current.retirementPlanResultCache.set(
        getSettingsSignature(settings),
        plan
      );
      result.current.setComparisonScenarios([scenario]);
    });

    expect(result.current.comparisonResultCache.size).toBe(1);
    expect(result.current.retirementPlanResultCache.size).toBe(1);
    expect(result.current.comparisonScenarios).toHaveLength(1);

    act(() => {
      result.current.resetComparisonScenarios();
    });

    expect(result.current.comparisonResultCache.size).toBe(0);
    expect(result.current.retirementPlanResultCache.size).toBe(0);
    expect(result.current.comparisonScenarios).toHaveLength(0);
  });

  it("does not overwrite malformed saved comparisons on mount or after subsequent scenario edits", () => {
    const key = "cs-pension-modeller.comparisonScenarios";
    const valid = createScenario("valid", "Valid saved plan");
    const raw = JSON.stringify([
      valid,
      {
        ...createScenario("bad", "Malformed plan"),
        settings: { ...valid.settings, currentStatePension: "invalid" },
      },
    ]);
    window.localStorage.setItem(key, raw);
    const { result, unmount } = renderHook(() =>
      useApplicationComparisonState()
    );
    expect(
      result.current.comparisonScenarios.map((scenario) => scenario.id)
    ).toEqual(["valid"]);
    expect(window.localStorage.getItem(key)).toBe(raw);
    act(() =>
      result.current.setComparisonScenarios([
        valid,
        createScenario("new", "New session plan"),
      ])
    );
    expect(window.localStorage.getItem(key)).toBe(raw);
    unmount();
    const { result: reloadedResult, unmount: unmountReloaded } = renderHook(
      () => useApplicationComparisonState()
    );
    expect(
      reloadedResult.current.comparisonScenarios.map((scenario) => scenario.id)
    ).toEqual(["valid"]);
    expect(window.localStorage.getItem(key)).toBe(raw);
    unmountReloaded();
    window.localStorage.removeItem(key);
  });

  it("downloads the original saved data and removes recovery state through clear-all-data", async () => {
    vi.useRealTimers();
    const key = "cs-pension-modeller.comparisonScenarios";
    const raw = JSON.stringify([
      {
        ...createScenario("bad", "Malformed plan"),
        settings: {
          ...createDefaultSettings(),
          currentStatePension: "invalid",
        },
      },
    ]);
    window.localStorage.setItem(key, raw);
    const createObjectURL = vi
      .fn<(blob: Blob) => string>()
      .mockReturnValue("blob:comparison-recovery");
    const revokeObjectURL = vi.fn();
    const originalCreate = Object.getOwnPropertyDescriptor(
      window.URL,
      "createObjectURL"
    );
    const originalRevoke = Object.getOwnPropertyDescriptor(
      window.URL,
      "revokeObjectURL"
    );
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const { result, unmount } = renderHook(() =>
      useApplicationComparisonState()
    );
    try {
      expect(result.current.onDownloadComparisonRecovery).toBeTypeOf(
        "function"
      );
      act(() => result.current.onDownloadComparisonRecovery?.());
      const blob = createObjectURL.mock.calls[0]?.[0];
      expect(blob).toBeInstanceOf(Blob);
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else
            reject(new Error("Expected the recovery download to contain text"));
        };
        reader.onerror = () =>
          reject(new Error("Could not read recovery download"));
        reader.readAsText(blob);
      });
      expect(content).toBe(raw);
      expect(click).toHaveBeenCalledOnce();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:comparison-recovery");
      expect(window.localStorage.getItem(key)).toBe(raw);
      act(() => {
        clearLocalData();
        result.current.resetComparisonScenarios();
      });
      expect(result.current.onDownloadComparisonRecovery).toBeUndefined();
      expect(result.current.comparisonScenarios).toEqual([]);
      expect(window.localStorage.getItem(key)).toBeNull();
      act(() =>
        result.current.setComparisonScenarios([
          createScenario("new", "New plan"),
        ])
      );
      expect(window.localStorage.getItem(key)).toBeNull();
      act(() => {
        saveLocalStoragePreference(true);
        result.current.setComparisonScenarios([
          createScenario("new", "New plan"),
        ]);
      });
      expect(window.localStorage.getItem(key)).not.toContain("Malformed plan");
      unmount();
      const { result: reloadedResult, unmount: unmountReloaded } = renderHook(
        () => useApplicationComparisonState()
      );
      expect(
        reloadedResult.current.onDownloadComparisonRecovery
      ).toBeUndefined();
      expect(
        reloadedResult.current.comparisonScenarios.map(
          (scenario) => scenario.id
        )
      ).toEqual(["new"]);
      unmountReloaded();
    } finally {
      click.mockRestore();
      if (originalCreate)
        Object.defineProperty(window.URL, "createObjectURL", originalCreate);
      else Reflect.deleteProperty(window.URL, "createObjectURL");
      if (originalRevoke)
        Object.defineProperty(window.URL, "revokeObjectURL", originalRevoke);
      else Reflect.deleteProperty(window.URL, "revokeObjectURL");
      window.localStorage.clear();
    }
  });

  it("does not compare single-person and household scenarios together", () => {
    const singleSettings = createDefaultSettings();
    const householdSettings = normalizeSettings({
      ...createDefaultSettings(),
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1970-06-01",
        showStatePension: false,
      },
      jointRetirement: {
        ...createDefaultSettings().jointRetirement,
        enabled: true,
      },
    });
    const singleScenario = createScenario("single", "Single", singleSettings);
    const householdScenario = createScenario(
      "household",
      "Household",
      householdSettings
    );
    const panel = buildComparisonPanelData({
      currentResult: createComparisonResult(
        householdScenario,
        "current",
        calculateRetirementPlan(householdSettings)
      ),
      currentSettingsSignature: "current",
      retirementIncomeDisplay: "annual",
      savedBaseResults: [
        createComparisonResult(
          singleScenario,
          "",
          calculateRetirementPlan(singleSettings)
        ),
      ],
    });

    expect(panel.results.map((result) => result.modelType)).toEqual([
      "household",
    ]);
    expect(panel.savedResults).toHaveLength(1);
  });
});
