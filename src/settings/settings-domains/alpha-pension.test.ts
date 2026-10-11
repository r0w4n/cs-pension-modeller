import { createDefaultSettings } from "../settings-defaults";
import {
  createAlphaAbsDateFromYear,
  createDefaultAddedPensionLumpSum,
  getAlphaAbsYear,
  resolveAlphaAbsDate,
  validateAlphaPensionRules,
} from "./alpha-pension";

describe("alpha-pension settings module", () => {
  it("handles alpha ABS helpers", () => {
    expect(createAlphaAbsDateFromYear(2024)).toBe("2024-04-01");
    expect(getAlphaAbsYear("2024-10-01")).toBe(2024);
    expect(resolveAlphaAbsDate("2024")).toBe("2024-04-01");
  });

  it("creates default lump sum", () => {
    const lump = createDefaultAddedPensionLumpSum(
      "lump-sum-1",
      "2026-01-01",
      "self"
    );
    expect(lump.id).toBe("lump-sum-1");
    expect(lump.startDate).toBe("2026-01-01");
    expect(lump.factorType).toBe("self");
  });

  it("validates alpha pension constraints", () => {
    const settings = {
      ...createDefaultSettings(),
      showAlpha: true,
      alphaPensionDrawAge: 56,
      alphaPensionLeaveAge: 70,
    };

    const issues = validateAlphaPensionRules({
      settings,
      lifeExpectancyDate: "2020-01-01",
      alphaDrawDate: "2030-01-01",
      alphaLeaveDate: "2035-01-01",
      alphaAccrualStopDate: "2030-01-01",
      alphaAbsDate: "2030-01-01",
      alphaEpaAgeDate: "2050-01-01",
      latestAlphaAddedPensionPurchaseDate: "2029-01-01",
    });

    expect(issues.length).toBeGreaterThan(0);
  });

  it("accepts age 55 after April 2028 only with confirmed Alpha protection", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1977-05-01",
      requirementAge: 55,
      alphaPensionLeaveAge: 55,
      alphaPensionDrawAge: 55,
    };
    const context = {
      lifeExpectancyDate: "2067-05-01",
      alphaDrawDate: "2032-05-01",
      alphaLeaveDate: "2032-05-01",
      alphaAccrualStopDate: "2032-05-01",
      alphaAbsDate: "2025-04-01",
      alphaEpaAgeDate: "2044-05-01",
      latestAlphaAddedPensionPurchaseDate: "2044-05-01",
    };

    expect(
      validateAlphaPensionRules({ settings, ...context }).some(
        (issue) => issue.field === "alphaPensionDrawAge"
      )
    ).toBe(true);
    expect(
      validateAlphaPensionRules({
        settings: { ...settings, alphaHasProtectedPensionAge: true },
        ...context,
      }).some((issue) => issue.field === "alphaPensionDrawAge")
    ).toBe(false);
  });
});
