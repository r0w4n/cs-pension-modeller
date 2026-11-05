import {
  createDefaultSettings,
  parseStoredSettings,
  saveLocalStoragePreference,
  type PensionSettings,
} from "../settings";
import {
  clearStoredComparisonScenarios,
  loadStoredComparisonScenarios,
  saveStoredComparisonScenarios,
} from "./comparison-storage";
import {
  createComparisonResult,
  type ComparisonScenario,
} from "../result-projection/comparison-result";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { buildRetirementOutcomeBanner } from "../app-domains/comparison-outcome";
import {
  buildComparisonStatusItems,
  calculateComparisonInsights,
} from "../app-domains/comparison";

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

  it("migrates legacy saved scenario settings before comparison projection", () => {
    const legacySettings = {
      ...createDefaultSettings(),
    } as Partial<PensionSettings>;
    delete legacySettings.classicPensionDrawAge;
    delete legacySettings.classicPlusPensionDrawAge;

    window.localStorage.setItem(
      COMPARISON_SCENARIOS_STORAGE_KEY,
      JSON.stringify([
        createScenario(
          "legacy-scenario",
          "Legacy scenario",
          legacySettings as PensionSettings
        ),
      ])
    );

    const [loadedScenario] = loadStoredComparisonScenarios();

    if (!loadedScenario) {
      throw new Error("Expected the legacy saved scenario to load.");
    }

    expect(loadedScenario?.settings.classicPensionDrawAge).toBe(60);
    expect(loadedScenario?.settings.classicPlusPensionDrawAge).toBe(60);
    expect(() =>
      createComparisonResult(
        loadedScenario,
        "",
        calculateRetirementPlan(loadedScenario.settings)
      )
    ).not.toThrow();
  });

  it("migrates saved gross targets to the current after-tax meaning", () => {
    window.localStorage.setItem(
      COMPARISON_SCENARIOS_STORAGE_KEY,
      JSON.stringify([
        createScenario("gross-scenario", "Gross scenario", {
          ...createDefaultSettings(),
          taxationEnabled: false,
          retirementIncomeTargetBasis: "gross",
        }),
      ])
    );

    const [loadedScenario] = loadStoredComparisonScenarios();

    expect(loadedScenario?.settings).toEqual(
      expect.objectContaining({
        taxationEnabled: true,
        retirementIncomeTargetBasis: "after_tax",
      })
    );
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

  it("rejects malformed financial settings while retaining valid neighbouring scenarios and raw storage", () => {
    const malformedSettings = {
      ...createDefaultSettings(),
      currentStatePension: "invalid",
      statePensionForecastConfirmed: true,
    };
    expect(parseStoredSettings(malformedSettings)).toBeNull();
    const raw = JSON.stringify([
      {
        ...createScenario("bad", "Malformed scenario"),
        settings: malformedSettings,
      },
      createScenario("valid", "Valid scenario"),
    ]);
    window.localStorage.setItem(COMPARISON_SCENARIOS_STORAGE_KEY, raw);
    const loaded = loadStoredComparisonScenarios();
    const outcomes = loaded.map((scenario) =>
      buildRetirementOutcomeBanner(
        createComparisonResult(
          scenario,
          "",
          calculateRetirementPlan(scenario.settings)
        )
      )
    );

    expect(loaded.map((scenario) => scenario.id)).toEqual(["valid"]);
    expect(outcomes).toHaveLength(1);
    expect(window.localStorage.getItem(COMPARISON_SCENARIOS_STORAGE_KEY)).toBe(
      raw
    );
  });

  it("does not report a malformed numeric calculation as workable even if the storage boundary is bypassed", () => {
    const scenario = createScenario("bad", "Malformed scenario");
    Object.assign(scenario.settings, {
      currentStatePension: "invalid",
      statePensionForecastConfirmed: true,
    });
    const plan = calculateRetirementPlan(scenario.settings);
    expect(
      plan.rows.some((row) => !Number.isFinite(row.totalMonthlyNetIncome))
    ).toBe(true);
    expect(plan.assessment.meetsTargetThroughout).toBe(false);
    expect(
      buildRetirementOutcomeBanner(createComparisonResult(scenario, "", plan))
    ).toMatchObject({ label: "Needs checking", status: "atRisk" });
    const result = createComparisonResult(scenario, "", plan);
    expect(buildComparisonStatusItems(result)).toContainEqual({
      label: "Overall status",
      value: "Needs checking",
    });
    expect(Object.values(calculateComparisonInsights([result]))).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });
});
