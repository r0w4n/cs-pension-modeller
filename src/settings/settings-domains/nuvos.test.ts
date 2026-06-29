import {
  coerceNuvosSettings,
  normalizeNuvosBooleanSetting,
  validateNuvosRules,
} from "./nuvos";
import type { StoredPensionSettings } from "../settings-types";

describe("nuvos domain", () => {
  it("normalizes booleans", () => {
    expect(normalizeNuvosBooleanSetting(0)).toBe(false);
    expect(normalizeNuvosBooleanSetting("yes")).toBe(true);
  });

  it("validates nuvos date constraints", () => {
    const issues = validateNuvosRules({
      settings: {
        showNuvos: true,
        nuvosPensionAbsDate: "2026",
        startDate: "2026-04-25",
      },
      lifeExpectancyDate: "2050-01-01",
      nuvosDrawDate: "2051-01-01",
      nuvosAbsDate: "2027-04-01",
    });

    expect(issues.map((issue) => issue.field)).toEqual([
      "nuvosPensionDrawAge",
      "nuvosPensionAbsDate",
    ]);
  });

  it("coerces stored values", () => {
    const storedSettings = {
      showNuvos: true,
      nuvosPensionAbsDate: "2025",
      nuvosAccruedPensionAtLastAbs: "1000",
      nuvosPensionableEarnings: "42000",
      nuvosPensionLeaveAge: "65",
      nuvosPensionDrawAge: "65",
      nuvosApplyPensionIncreases: false,
      nuvosAssumedCpiPercent: "2.5",
    } as unknown as Partial<StoredPensionSettings>;

    expect(coerceNuvosSettings(storedSettings)).toEqual({
      showNuvos: true,
      nuvosPensionAbsDate: "2025",
      nuvosAccruedPensionAtLastAbs: 1000,
      nuvosPensionableEarnings: 42000,
      nuvosPensionLeaveAge: 65,
      nuvosPensionDrawAge: 65,
      nuvosApplyPensionIncreases: false,
      nuvosAssumedCpiPercent: 2.5,
    });
  });
});
