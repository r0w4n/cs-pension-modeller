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
    expect(normalizeSetting("isaDrawAge", 85)).toBe(85);
    expect(normalizeSetting("isaDrawAge", 120)).toBe(100);
    expect(normalizeSetting("projectionBasis", "bad" as never)).toBe("real");
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
});
