import { describe, expect, it } from "vitest";
import {
  calculateSmilePhaseTarget,
  createDefaultSpendingSmile,
  normalizeSpendingSmile,
  reconcileSpendingSmilePhaseAges,
  resolveAnnualSpendingTarget,
  updateSpendingSmileStartAge,
  updateSpendingSmilePercentage,
} from "./spending-smile";
import {
  createDefaultSettings,
  getStoredSettingsSnapshot,
  parseStoredSettings,
  validateSettings,
  type PensionSettings,
} from "./settings";

describe("SMILE spending", () => {
  it.each([
    ["2050-01-01", "GO_GO", 100, 40_000],
    ["2064-12-01", "GO_GO", 100, 40_000],
    ["2065-01-01", "SLOW_GO", 85, 34_000],
    ["2074-12-01", "SLOW_GO", 85, 34_000],
    ["2075-01-01", "NO_GO", 70, 28_000],
    ["2085-01-01", "NO_GO", 70, 28_000],
  ] as const)(
    "resolves %s to %s at %s% (£%s) in real terms",
    (rowDate, phase, percentageOfTarget, annualRealTarget) => {
      const settings = createSmileSettings();

      expect(resolveAnnualSpendingTarget({ settings, rowDate })).toMatchObject({
        phase,
        percentageOfTarget,
        annualRealTarget,
      });
    }
  );

  it("calculates a phase target from the single selected monetary target", () => {
    expect(calculateSmilePhaseTarget(30_000, 85)).toBe(25_500);
  });

  it("allows every phase percentage to be edited", () => {
    let strategy = createDefaultSpendingSmile();
    strategy = updateSpendingSmilePercentage(strategy, "goGoPercentage", 110.4);
    strategy = updateSpendingSmilePercentage(
      strategy,
      "slowGoPercentage",
      82.5
    );
    strategy = updateSpendingSmilePercentage(strategy, "noGoPercentage", 64.6);

    expect(strategy).toMatchObject({
      goGoPercentage: 110,
      slowGoPercentage: 83,
      noGoPercentage: 65,
    });
  });

  it("normalizes stored percentages to whole numbers", () => {
    expect(
      normalizeSpendingSmile(
        {
          goGoPercentage: 100.4,
          slowGoPercentage: 84.5,
          noGoPercentage: 70.6,
        },
        30_000
      )
    ).toMatchObject({
      goGoPercentage: 100,
      slowGoPercentage: 85,
      noGoPercentage: 71,
    });
  });

  it("caps phase ages when life expectancy is reduced", () => {
    expect(
      reconcileSpendingSmilePhaseAges(createDefaultSpendingSmile(), 68, 80)
    ).toMatchObject({
      slowGoStartAge: 75,
      noGoStartAge: 80,
    });
    expect(
      reconcileSpendingSmilePhaseAges(createDefaultSpendingSmile(), 68, 74)
    ).toMatchObject({
      slowGoStartAge: 73,
      noGoStartAge: 74,
    });
  });

  it("keeps edited phase ages in sequence", () => {
    const strategy = createDefaultSpendingSmile();

    expect(
      updateSpendingSmileStartAge(strategy, "slowGoStartAge", 60, 68, 95)
    ).toMatchObject({
      slowGoStartAge: 69,
      noGoStartAge: 85,
    });
    expect(
      updateSpendingSmileStartAge(strategy, "noGoStartAge", 70, 68, 95)
    ).toMatchObject({
      slowGoStartAge: 75,
      noGoStartAge: 76,
    });
  });

  it("inflates the applicable phase-adjusted target in nominal terms", () => {
    const settings = {
      ...createSmileSettings(),
      startDate: "2050-01-01",
      inflationRateAnnual: 3,
    };

    const result = resolveAnnualSpendingTarget({
      settings,
      rowDate: "2065-01-01",
    });

    expect(result.annualRealTarget).toBe(34_000);
    expect(result.annualNominalTarget).toBeCloseTo(34_000 * 1.03 ** 15);
  });

  it("ignores stored SMILE percentages when flat spending is active", () => {
    const settings = {
      ...createSmileSettings(),
      spendingStrategyType: "FLAT" as const,
      desiredRetirementIncome: 35_000,
      spendingSmile: {
        ...createDefaultSpendingSmile(),
        goGoPercentage: 150,
        slowGoPercentage: 20,
        noGoPercentage: 10,
      },
    };

    expect(
      resolveAnnualSpendingTarget({
        settings,
        rowDate: "2075-01-01",
      })
    ).toMatchObject({
      phase: "FLAT",
      percentageOfTarget: 100,
      annualRealTarget: 35_000,
    });
  });

  it("normalizes legacy monetary phase targets into percentages of the selected target", () => {
    const normalized = normalizeSpendingSmile(
      {
        initialized: true,
        inputMode: "ANNUAL_AMOUNT",
        slowGoStartAge: 73,
        noGoStartAge: 83,
        goGo: { annualAmountReal: 45_000, percentageOfGoGo: 100 },
        slowGo: { annualAmountReal: 36_000, percentageOfGoGo: 80 },
        noGo: { annualAmountReal: 27_000, percentageOfGoGo: 60 },
      },
      30_000
    );

    expect(normalized).toEqual({
      goGoPercentage: 150,
      slowGoStartAge: 73,
      slowGoPercentage: 120,
      noGoStartAge: 83,
      noGoPercentage: 90,
    });
    expect(normalized).not.toHaveProperty("goGo");
    expect(normalized).not.toHaveProperty("slowGo");
    expect(normalized).not.toHaveProperty("noGo");
  });

  it("validates phase ages and percentages only while SMILE is active", () => {
    const settings = createSmileSettings();
    settings.spendingSmile.goGoPercentage = 0;
    settings.spendingSmile.slowGoStartAge = 60;
    settings.spendingSmile.noGoStartAge = 101;

    expect(validateSettings(settings)).toEqual(
      expect.arrayContaining([
        {
          field: "spendingSmile",
          itemId: "goGoPercentage",
          message: "Go-go percentage must be greater than 0%.",
        },
        {
          field: "spendingSmile",
          itemId: "slowGoStartAge",
          message: "Slow-go years must start after your retirement age.",
        },
        {
          field: "spendingSmile",
          itemId: "noGoStartAge",
          message:
            "No-go age cannot be later than your modelled life expectancy of age 95.",
        },
      ])
    );

    settings.spendingStrategyType = "FLAT";
    expect(
      validateSettings(settings).some(
        (issue) => issue.field === "spendingSmile"
      )
    ).toBe(false);
  });

  it("persists percentages and phase ages without monetary phase targets", () => {
    const settings = createSmileSettings();
    settings.spendingSmile = {
      goGoPercentage: 105,
      slowGoStartAge: 73,
      slowGoPercentage: 80,
      noGoStartAge: 83,
      noGoPercentage: 65,
    };

    const reloaded = parseStoredSettings(getStoredSettingsSnapshot(settings));

    expect(reloaded?.spendingStrategyType).toBe("SPENDING_SMILE");
    expect(reloaded?.spendingSmile).toEqual(settings.spendingSmile);
    expect(reloaded?.spendingSmile).not.toHaveProperty("goGo");
  });
});

function createSmileSettings(): PensionSettings {
  return {
    ...createDefaultSettings(),
    dateOfBirth: "1990-01-01",
    startDate: "2050-01-01",
    requirementAge: 60,
    desiredRetirementIncome: 40_000,
    lifeExpectancy: 95,
    projectionBasis: "real",
    spendingStrategyType: "SPENDING_SMILE",
    spendingSmile: createDefaultSpendingSmile(),
  };
}
