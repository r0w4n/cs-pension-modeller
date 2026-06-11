import {
  createDefaultSettings,
  saveLocalStoragePreference,
  type PensionSettings,
} from "../settings";
import {
  clearStoredComparisonScenarios,
  loadStoredComparisonScenarios,
  saveStoredComparisonScenarios,
  type ComparisonScenario,
} from "./comparison";

const COMPARISON_SCENARIOS_STORAGE_KEY =
  "cs-pension-modeller.comparisonScenarios";

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

describe("comparison scenario storage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00Z"));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves and loads comparison scenarios, capping storage at five entries", () => {
    const scenarios = Array.from({ length: 6 }, (_, index) =>
      createScenario(`scenario-${index + 1}`, `Scenario ${index + 1}`)
    );

    saveStoredComparisonScenarios(scenarios);

    const stored = JSON.parse(
      window.localStorage.getItem(COMPARISON_SCENARIOS_STORAGE_KEY) ?? "[]"
    ) as ComparisonScenario[];

    expect(stored).toHaveLength(5);
    expect(loadStoredComparisonScenarios()).toHaveLength(5);
    expect(loadStoredComparisonScenarios()[4]?.id).toBe("scenario-5");
  });

  it("normalizes partial stored scenarios and ignores invalid entries", () => {
    window.localStorage.setItem(
      COMPARISON_SCENARIOS_STORAGE_KEY,
      JSON.stringify([
        {
          settings: {
            ...createDefaultSettings(),
            desiredRetirementIncome: 48000,
          },
        },
        null,
        {
          id: "",
          name: "   ",
          settings: createDefaultSettings(),
        },
      ])
    );

    const loaded = loadStoredComparisonScenarios();

    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.name).toBe("Scenario 1");
    expect(loaded[0]?.createdAt).toBe("2026-06-09T12:00:00.000Z");
    expect(loaded[0]?.updatedAt).toBe("2026-06-09T12:00:00.000Z");
    expect(loaded[1]?.name).toBe("Scenario 3");
    expect(loaded[1]?.id).toMatch(/\S/);
  });

  it("returns an empty list for corrupted storage or when local storage is disabled", () => {
    window.localStorage.setItem(COMPARISON_SCENARIOS_STORAGE_KEY, "{bad json");
    expect(loadStoredComparisonScenarios()).toEqual([]);

    window.localStorage.clear();
    saveLocalStoragePreference(false);
    saveStoredComparisonScenarios([createScenario("scenario-1", "Scenario 1")]);

    expect(loadStoredComparisonScenarios()).toEqual([]);
    expect(
      window.localStorage.getItem(COMPARISON_SCENARIOS_STORAGE_KEY)
    ).toBeNull();
  });

  it("clears saved comparison scenarios", () => {
    window.localStorage.setItem(
      COMPARISON_SCENARIOS_STORAGE_KEY,
      JSON.stringify([createScenario("scenario-1", "Scenario 1")])
    );

    clearStoredComparisonScenarios();

    expect(
      window.localStorage.getItem(COMPARISON_SCENARIOS_STORAGE_KEY)
    ).toBeNull();
  });
});
