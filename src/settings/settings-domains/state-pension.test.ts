import {
  coerceStatePensionSettings,
  normalizeStatePensionBooleanSetting,
  normalizeStatePensionDrawDate,
  validateStatePensionRules,
} from "./state-pension";
import type { StoredPensionSettings } from "../settings-types";

describe("state-pension domain", () => {
  it("normalizes booleans and draw dates", () => {
    expect(normalizeStatePensionBooleanSetting(1)).toBe(true);
    expect(normalizeStatePensionDrawDate("bad-date", "1987-06-15")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
  });

  it("validates state pension date constraints", () => {
    const issues = validateStatePensionRules({
      settings: {
        showStatePension: true,
        statePensionDrawDate: "2050-01-01",
      },
      lifeExpectancyDate: "2049-12-31",
      defaultStatePensionDrawDate: "2055-06-15",
    });

    expect(issues.map((issue) => issue.field)).toEqual([
      "lifeExpectancy",
      "statePensionDrawDate",
    ]);
  });

  it("coerces stored values", () => {
    const storedSettings = {
      showStatePension: true,
      currentStatePension: "12000",
      statePensionForecastConfirmed: true,
      statePensionDrawDate: "2045-01-01",
      statePensionApplyFutureGrowth: false,
      statePensionCpiPercent: "1.5",
      statePensionWageGrowthPercent: "2.5",
    } as unknown as Partial<StoredPensionSettings>;

    expect(coerceStatePensionSettings(storedSettings)).toEqual({
      showStatePension: true,
      currentStatePension: 12000,
      statePensionForecastConfirmed: true,
      statePensionDrawDate: "2045-01-01",
      statePensionApplyFutureGrowth: false,
      statePensionCpiPercent: 1.5,
      statePensionWageGrowthPercent: 2.5,
    });
  });
});
