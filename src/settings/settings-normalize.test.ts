import {
  normalizeSettings,
  normalizeSetting,
  normalizeSippDrawAge,
  normalizeStatePensionDrawDate,
} from "./settings-normalize";
import { createDefaultSettings } from "./settings-defaults";

describe("settings-normalize", () => {
  it("normalizes ranges and enum values", () => {
    expect(normalizeSetting("desiredRetirementIncome", 43899.6)).toBe(43900);
    expect(normalizeSetting("pensionableEarnings", 0)).toBe(0);
    expect(normalizeSetting("isaDrawAge", 85)).toBe(85);
    expect(normalizeSetting("isaDrawAge", 120)).toBe(100);
    expect(normalizeSetting("projectionBasis", "bad" as never)).toBe("real");
    expect(normalizeSetting("retirementIncomeTargetBasis", "after_tax")).toBe(
      "after_tax"
    );
    expect(
      normalizeSetting("retirementIncomeTargetBasis", "bad" as never)
    ).toBe("gross");
    expect(normalizeSetting("statePensionForecastConfirmed", 1 as never)).toBe(
      true
    );
    expect(
      normalizeSetting("alphaAddedPensionFactorType", "bad" as never)
    ).toBe("self");
    expect(normalizeSetting("classicCalculationMode", "bad" as never)).toBe(
      "manual"
    );
    expect(normalizeSetting("classicFinalSalaryLink", "bad" as never)).toBe(
      "broken"
    );
  });

  it("rounds numeric modelling ages to the nearest quarter year", () => {
    expect(normalizeSetting("requirementAge", 67.16666666666667)).toBe(67.25);
    expect(normalizeSetting("alphaPensionDrawAge", 63.1)).toBe(63);
    expect(normalizeSetting("sippWithdrawalTargetAge", 79.9)).toBe(80);
  });

  it("normalizes date-based values", () => {
    expect(normalizeStatePensionDrawDate("bad-date", "1987-06-15")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
    expect(normalizeSippDrawAge(55, "1987-06-15")).toBe(55);
    expect(normalizeSippDrawAge(72, "1987-06-15")).toBe(72);
  });

  it("preserves an ISA draw age that differs from retirement age", () => {
    const settings = normalizeSettings({
      ...createDefaultSettings(),
      requirementAge: 65,
      isaDrawAge: 72,
    });

    expect(settings.requirementAge).toBe(65);
    expect(settings.isaDrawAge).toBe(72);
  });

  it("enables the tax estimate required by an after-tax target", () => {
    const settings = normalizeSettings({
      ...createDefaultSettings(),
      retirementIncomeTargetBasis: "after_tax",
      taxationEnabled: false,
    });

    expect(settings.taxationEnabled).toBe(true);
  });

  it("caps stored SMILE phase ages to life expectancy", () => {
    const settings = normalizeSettings({
      ...createDefaultSettings(),
      lifeExpectancy: 80,
      spendingSmile: {
        ...createDefaultSettings().spendingSmile,
        slowGoStartAge: 75,
        noGoStartAge: 85,
      },
    });

    expect(settings.spendingSmile).toMatchObject({
      slowGoStartAge: 75,
      noGoStartAge: 80,
    });
  });

  it("moves stored SMILE phase ages clear of retirement and each other", () => {
    const settings = normalizeSettings({
      ...createDefaultSettings(),
      requirementAge: 70,
      lifeExpectancy: 80,
      spendingSmile: {
        ...createDefaultSettings().spendingSmile,
        slowGoStartAge: 70,
        noGoStartAge: 70,
      },
    });

    expect(settings.spendingSmile).toMatchObject({
      slowGoStartAge: 71,
      noGoStartAge: 72,
    });
  });

  it("defaults missing additional guaranteed incomes to an empty list", () => {
    const settings = normalizeSettings({
      ...createDefaultSettings(),
      additionalGuaranteedIncomes: undefined as never,
    });

    expect(settings.additionalGuaranteedIncomes).toEqual([]);
  });

  it("defaults missing additional guaranteed income visibility to included", () => {
    const settings = normalizeSettings({
      ...createDefaultSettings(),
      showAdditionalGuaranteedIncome: undefined as never,
    });

    expect(settings.showAdditionalGuaranteedIncome).toBe(true);
  });

  it("normalizes additional guaranteed income rows", () => {
    expect(
      normalizeSetting("additionalGuaranteedIncomes", [
        {
          id: "",
          name: "  Previous employer DB pension  ",
          annualAmount: "4500",
          startAge: "60",
          endAge: "",
          indexation: "unknown",
          fixedIncreasePercent: "3",
          taxable: undefined,
        },
      ] as never)
    ).toEqual([
      {
        id: "additional-income-1",
        name: "Previous employer DB pension",
        annualAmount: 4500,
        startAge: 60,
        endAge: null,
        indexation: "cpi",
        fixedIncreasePercent: null,
        taxable: true,
      },
    ]);
  });
});
