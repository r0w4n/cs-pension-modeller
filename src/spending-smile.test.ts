import { describe, expect, it } from "vitest";
import {
  applyRlsTarget,
  applySpendingSmileProfile,
  classifyRlsTarget,
  createDefaultSpendingSmile,
  resolveAnnualSpendingTarget,
  switchSpendingSmileInputMode,
  updateGoGoAnnualAmount,
  updatePhaseAnnualAmount,
  updatePhasePercentage,
} from "./spending-smile";
import {
  createDefaultSettings,
  getStoredSettingsSnapshot,
  parseStoredSettings,
  validateSettings,
  type PensionSettings,
} from "./settings";

describe("Spending Smile", () => {
  it.each([
    ["2050-01-01", "GO_GO", 40_000],
    ["2064-12-01", "GO_GO", 40_000],
    ["2065-01-01", "SLOW_GO", 34_000],
    ["2074-12-01", "SLOW_GO", 34_000],
    ["2075-01-01", "NO_GO", 30_000],
    ["2085-01-01", "NO_GO", 30_000],
  ] as const)(
    "resolves %s to %s at £%s in real terms",
    (rowDate, phase, annualRealTarget) => {
      const settings = createSmileSettings();

      expect(resolveAnnualSpendingTarget({ settings, rowDate })).toMatchObject({
        phase,
        annualRealTarget,
      });
    }
  );

  it("inflates the applicable real phase target in nominal terms", () => {
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

  it("recalculates later amounts when Go-go changes in percentage mode", () => {
    const strategy = {
      ...createDefaultSpendingSmile(40_000),
      inputMode: "PERCENTAGE_OF_GO_GO" as const,
    };
    const result = updateGoGoAnnualAmount(strategy, 50_000);

    expect(result.slowGo).toMatchObject({
      annualAmountReal: 42_500,
      percentageOfGoGo: 85,
    });
    expect(result.noGo).toMatchObject({
      annualAmountReal: 37_500,
      percentageOfGoGo: 75,
    });
  });

  it("recalculates an annual amount from a percentage", () => {
    const result = updatePhasePercentage(
      createDefaultSpendingSmile(40_000),
      "slowGo",
      80
    );

    expect(result.slowGo.annualAmountReal).toBe(32_000);
    expect(result.goGo.annualAmountReal).toBe(40_000);
  });

  it("recalculates a displayed percentage from an annual amount", () => {
    const result = updatePhaseAnnualAmount(
      createDefaultSpendingSmile(40_000),
      "slowGo",
      30_000
    );

    expect(result.slowGo).toMatchObject({
      annualAmountReal: 30_000,
      percentageOfGoGo: 75,
      source: "CUSTOM",
    });
  });

  it("handles a zero Go-go target without division by zero", () => {
    const strategy = updateGoGoAnnualAmount(
      createDefaultSpendingSmile(40_000),
      0
    );

    expect(strategy.slowGo.percentageOfGoGo).toBe(0);
    expect(Number.isFinite(strategy.slowGo.percentageOfGoGo)).toBe(true);
  });

  it("switches input modes without changing canonical annual amounts", () => {
    const strategy = createDefaultSpendingSmile(40_000);
    const result = switchSpendingSmileInputMode(
      strategy,
      "PERCENTAGE_OF_GO_GO"
    );

    expect(result.goGo.annualAmountReal).toBe(40_000);
    expect(result.slowGo.annualAmountReal).toBe(34_000);
    expect(result.noGo.annualAmountReal).toBe(30_000);
  });

  it.each([
    [12_000, "BELOW_MINIMUM"],
    [20_000, "MINIMUM_TO_MODERATE"],
    [40_000, "MODERATE_TO_COMFORTABLE"],
    [50_000, "COMFORTABLE_OR_ABOVE"],
  ] as const)("classifies £%s as %s", (target, classification) => {
    expect(classifyRlsTarget(target, "ONE_PERSON")).toBe(classification);
  });

  it("applies one-person and two-person RLS values as canonical targets", () => {
    const onePerson = applyRlsTarget(
      createDefaultSpendingSmile(40_000),
      "slowGo",
      "moderate"
    );
    const twoPerson = applyRlsTarget(
      { ...onePerson, householdType: "TWO_PERSON" },
      "noGo",
      "minimum"
    );

    expect(onePerson.slowGo).toMatchObject({
      annualAmountReal: 32_700,
      source: "RLS_MODERATE",
    });
    expect(twoPerson.noGo).toMatchObject({
      annualAmountReal: 22_500,
      source: "RLS_MINIMUM",
    });
  });

  it("applies the RLS tiered profile", () => {
    const result = applySpendingSmileProfile(
      createDefaultSpendingSmile(40_000),
      "RLS_TIERED",
      40_000
    );

    expect(result.goGo.annualAmountReal).toBe(45_400);
    expect(result.slowGo.annualAmountReal).toBe(32_700);
    expect(result.noGo.annualAmountReal).toBe(13_900);
  });

  it("validates phase ordering only while Spending Smile is active", () => {
    const settings = createSmileSettings();
    settings.spendingSmile.noGoStartAge = 74;

    expect(validateSettings(settings)).toContainEqual({
      field: "spendingSmile",
      message: "No-go years must start after the Slow-go years.",
    });

    settings.spendingStrategyType = "FLAT";
    expect(
      validateSettings(settings).some(
        (issue) => issue.field === "spendingSmile"
      )
    ).toBe(false);
  });

  it("keeps flat target resolution backward compatible", () => {
    const settings = {
      ...createSmileSettings(),
      spendingStrategyType: "FLAT" as const,
      desiredRetirementIncome: 35_000,
    };

    expect(
      resolveAnnualSpendingTarget({
        settings,
        rowDate: "2075-01-01",
      })
    ).toMatchObject({
      phase: "FLAT",
      annualRealTarget: 35_000,
    });
  });

  it("persists and reloads canonical amounts and phase ages", () => {
    const settings = createSmileSettings();
    settings.spendingSmile.slowGoStartAge = 73;
    settings.spendingSmile.noGoStartAge = 83;
    settings.spendingSmile.goGo.annualAmountReal = 45_000;
    settings.spendingSmile.slowGo.annualAmountReal = 36_000;
    settings.spendingSmile.noGo.annualAmountReal = 30_000;

    const reloaded = parseStoredSettings(getStoredSettingsSnapshot(settings));

    expect(reloaded?.spendingStrategyType).toBe("SPENDING_SMILE");
    expect(reloaded?.spendingSmile).toMatchObject({
      slowGoStartAge: 73,
      noGoStartAge: 83,
      goGo: { annualAmountReal: 45_000 },
      slowGo: { annualAmountReal: 36_000 },
      noGo: { annualAmountReal: 30_000 },
    });
  });
});

function createSmileSettings(): PensionSettings {
  return {
    ...createDefaultSettings(),
    dateOfBirth: "1990-01-01",
    startDate: "2050-01-01",
    requirementAge: 60,
    lifeExpectancy: 95,
    projectionBasis: "real" as const,
    spendingStrategyType: "SPENDING_SMILE" as const,
    spendingSmile: {
      ...createDefaultSpendingSmile(40_000),
      initialized: true,
    },
  };
}
