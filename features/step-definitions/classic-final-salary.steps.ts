import { Given, Then, When } from "@cucumber/cucumber";
import {
  defaultSettings,
  normalizeSettings,
  type PensionSettings,
} from "../../src/settings";
import {
  calculateRetirementPlan,
  type RetirementPlanResult,
} from "../../src/calculation/retirement-plan";

type FinalSalaryWorld = {
  finalSalarySettings?: PensionSettings;
  finalSalaryPlan?: RetirementPlanResult;
};

Given(
  "a salary-linked {string} estimate with Alpha leaving age {int} and legacy draw age {int}",
  function (
    this: FinalSalaryWorld,
    scheme: string,
    leaveAge: number,
    drawAge: number
  ) {
    if (scheme !== "classic" && scheme !== "classic plus") {
      throw new Error(`Unsupported legacy scheme: ${scheme}`);
    }
    this.finalSalarySettings = normalizeSettings({
      ...defaultSettings,
      startDate: "2026-06-01",
      dateOfBirth: "1970-06-01",
      requirementAge: Math.max(leaveAge, drawAge),
      lifeExpectancy: 75,
      showAlpha: true,
      accruedPensionAtLastAbs: 0,
      pensionableEarnings: 0,
      alphaPensionLeaveAge: leaveAge,
      alphaPensionDrawAge: Math.max(leaveAge, drawAge),
      alphaPayRisePercent: 3,
      partialRetirementEnabled: leaveAge > drawAge,
      partialRetirementStartAge: drawAge,
      partialRetirementWorkPercent: 50,
      showClassic: scheme === "classic",
      classicCalculationMode: "estimate",
      classicFinalSalaryLink: "maintained",
      classicCurrentFinalPensionableEarnings: 70000,
      classicReckonableServiceYears: 10,
      classicPensionDrawAge: drawAge,
      classicApplyPensionIncreases: false,
      showClassicPlus: scheme === "classic plus",
      classicPlusCalculationMode: "estimate",
      classicPlusFinalSalaryLink: "maintained",
      classicPlusCurrentFinalPensionableEarnings: 70000,
      classicPlusPre2002ServiceYears: 10,
      classicPlusPost2002ServiceYears: 5,
      classicPlusPensionDrawAge: drawAge,
      classicPlusApplyPensionIncreases: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      projectionBasis: "nominal",
      inflationRateAnnual: 0,
    });
  }
);

When(
  "the legacy plan is projected from 1 June 2026 with 3% pay rises and no inflation",
  function (this: FinalSalaryWorld) {
    if (!this.finalSalarySettings) {
      throw new Error("A salary-linked plan must be entered first");
    }
    this.finalSalaryPlan = calculateRetirementPlan(this.finalSalarySettings, {
      includeTargetBasedWithdrawalPreviews: false,
    });
    if (this.finalSalaryPlan.validationIssues.length > 0) {
      throw new Error(JSON.stringify(this.finalSalaryPlan.validationIssues));
    }
  }
);

Then(
  "the legacy gross annual pension on {string} should be {float}",
  function (this: FinalSalaryWorld, date: string, expected: number) {
    if (!this.finalSalaryPlan) {
      throw new Error("The legacy plan must be calculated first");
    }
    const row = this.finalSalaryPlan.rows.find((row) => row.date === date);
    if (!row) {
      throw new Error(`No projected row on ${date}`);
    }
    const annual =
      (this.finalSalaryPlan.settings.showClassic
        ? row.monthlyClassicPensionGross
        : row.monthlyClassicPlusPensionGross) * 12;
    if (!Number.isFinite(annual) || Math.abs(annual - expected) > 0.005) {
      throw new Error(`Expected £${expected}, received £${annual}`);
    }
  }
);
