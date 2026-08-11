import { createDefaultSettings } from "../settings-defaults";
import {
  getPartialRetirementContributionMultiplier,
  getPartialRetirementMonthlyEmploymentIncome,
  getPreRetirementMonthlyEmploymentTaxContext,
  getPartialRetirementSavingsContributionMultiplier,
  getPartialRetirementStartDate,
  validatePartialRetirementRules,
} from "./partial-retirement";

describe("partial-retirement settings module", () => {
  it("computes partial retirement start date", () => {
    const settings = createDefaultSettings();
    expect(getPartialRetirementStartDate(settings)).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
  });

  it("calculates contribution multipliers", () => {
    const settings = {
      ...createDefaultSettings(),
      partialRetirementEnabled: true,
      partialRetirementWorkPercent: 50,
      fullSalary: 100,
    };
    const startDate = getPartialRetirementStartDate(settings);

    expect(
      getPartialRetirementContributionMultiplier(settings, startDate)
    ).toBe(0.5);
    expect(
      getPartialRetirementSavingsContributionMultiplier(settings, startDate)
    ).toBe(0.5);
  });

  it("uses full salary as tax-only context until partial or full retirement", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1980-06-01",
      requirementAge: 68,
      partialRetirementEnabled: true,
      partialRetirementStartAge: 60,
      partialRetirementWorkPercent: 50,
      fullSalary: 48_000,
    };

    expect(
      getPreRetirementMonthlyEmploymentTaxContext(settings, "2040-05-01")
    ).toBe(4_000);
    expect(
      getPreRetirementMonthlyEmploymentTaxContext(settings, "2040-06-01")
    ).toBe(0);
    expect(
      getPartialRetirementMonthlyEmploymentIncome(settings, "2040-06-01")
    ).toBe(2_000);
    expect(
      getPreRetirementMonthlyEmploymentTaxContext(settings, "2048-06-01")
    ).toBe(0);
  });

  it("validates partial retirement window", () => {
    const settings = {
      ...createDefaultSettings(),
      partialRetirementEnabled: true,
    };

    const issues = validatePartialRetirementRules({
      settings,
      lifeExpectancyDate: settings.dateOfBirth,
      retirementDate: settings.dateOfBirth,
      partialRetirementStartDate: settings.dateOfBirth,
    });

    expect(issues.length).toBeGreaterThan(0);
  });
});
