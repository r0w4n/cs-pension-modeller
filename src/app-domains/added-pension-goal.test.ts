import { createDefaultSettings } from "../settings";
import {
  calculateAddedPensionMonthlyIncome,
  createAddedPensionGoalBasis,
  estimateAddedPensionMonthlyContribution,
} from "./added-pension-goal";

describe("Added Pension income target", () => {
  const settings = {
    ...createDefaultSettings(),
    startDate: "2026-06-01",
    dateOfBirth: "1987-06-15",
    alphaPensionAbsDate: "2025",
    accruedPensionAtLastAbs: 5000,
    pensionableEarnings: 42000,
    requirementAge: 68,
    alphaPensionLeaveAge: 68,
    alphaPensionDrawAge: 68,
    statePensionDrawDate: "2055-06-15",
    desiredRetirementIncome: 36000,
    showSipp: false,
    showCsAvc: false,
    showIsa: false,
    showLisa: false,
    taxationEnabled: false,
  };

  it("compares the existing projection with the retirement income target", () => {
    const basis = createAddedPensionGoalBasis(settings);

    expect(basis.targetMonthlyIncome).toBe(3000);
    expect(basis.projectedMonthlyIncome).toBeGreaterThan(0);
    expect(basis.monthlyIncomePerContributionPound).toBeGreaterThan(0);
  });

  it("converts the monthly income gap into the supported payment setting", () => {
    const basis = createAddedPensionGoalBasis(settings);
    const desiredExtraMonthlyIncome = 100;
    const contribution = estimateAddedPensionMonthlyContribution(
      basis,
      desiredExtraMonthlyIncome
    );
    const estimatedIncome = calculateAddedPensionMonthlyIncome(
      basis,
      contribution
    );

    expect(contribution).toBeGreaterThan(0);
    expect(estimatedIncome).toBeCloseTo(desiredExtraMonthlyIncome, -1);
  });
});
