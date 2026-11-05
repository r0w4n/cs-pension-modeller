import { Given, When, Then } from "@cucumber/cucumber";
import { loadStoredComparisonState } from "../../src/app/comparison-storage";
import { buildRetirementOutcomeBanner } from "../../src/app-domains/comparison-outcome";
import {
  calculateComparisonInsights,
  getComparisonAssessment,
} from "../../src/app-domains/comparison";
import { calculateRetirementPlan } from "../../src/calculation/retirement-plan";
import {
  createComparisonResult,
  type ComparisonScenario,
  type ComparisonResult,
} from "../../src/result-projection/comparison-result";
import {
  createDefaultSettings,
  createDefaultPartnerSettings,
} from "../../src/settings";

const STORAGE_KEY = "cs-pension-modeller.comparisonScenarios";
type ComparisonValidationWorld = {
  rawComparisonData?: string;
  comparisonLoad?: ReturnType<typeof loadStoredComparisonState>;
  invalidComparison?: ComparisonScenario;
  assessedComparison?: ComparisonResult;
};

function requireCondition(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function createScenario(id: string): ComparisonScenario {
  return {
    id,
    name: id,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    settings: {
      ...createDefaultSettings(),
      startDate: "2026-06-01",
      dateOfBirth: "1970-06-01",
      requirementAge: 68,
      lifeExpectancy: 80,
      showAlpha: false,
      showSipp: false,
      showIsa: false,
      statePensionDrawDate: "2038-06-01",
      currentStatePension: 20000,
      statePensionForecastConfirmed: true,
      statePensionApplyFutureGrowth: false,
      desiredRetirementIncome: 10000,
      taxationEnabled: true,
      retirementIncomeTargetBasis: "after_tax",
    },
  };
}

Given(
  "saved comparison data contains a valid plan and a malformed State Pension amount",
  function (this: ComparisonValidationWorld) {
    const invalid = createScenario("invalid");
    Object.assign(invalid.settings, { currentStatePension: "invalid" });
    this.rawComparisonData = JSON.stringify([invalid, createScenario("valid")]);
    window.localStorage.setItem(STORAGE_KEY, this.rawComparisonData);
  }
);

Given(
  "saved comparison data is unreadable JSON",
  function (this: ComparisonValidationWorld) {
    this.rawComparisonData = "{invalid JSON";
    window.localStorage.setItem(STORAGE_KEY, this.rawComparisonData);
  }
);

When(
  "saved comparisons are loaded with recovery information",
  function (this: ComparisonValidationWorld) {
    this.comparisonLoad = loadStoredComparisonState();
  }
);

Then(
  "only the valid saved comparison should be available for calculation",
  function (this: ComparisonValidationWorld) {
    requireCondition(
      this.comparisonLoad?.scenarios.length === 1 &&
        this.comparisonLoad.scenarios[0]?.id === "valid",
      "Expected only the valid saved scenario"
    );
    const plan = calculateRetirementPlan(
      this.comparisonLoad.scenarios[0].settings,
      { includeTargetBasedWithdrawalPreviews: false }
    );
    requireCondition(
      plan.validationIssues.length === 0 && !plan.assessment.hasInvalidValues,
      "Expected valid saved settings to calculate normally"
    );
  }
);

Then(
  "no saved comparisons should be available for calculation",
  function (this: ComparisonValidationWorld) {
    requireCondition(
      this.comparisonLoad?.scenarios.length === 0,
      "Expected unreadable data to be excluded from calculation"
    );
  }
);

Then(
  "the original comparison data should remain unchanged for recovery",
  function (this: ComparisonValidationWorld) {
    requireCondition(
      this.rawComparisonData &&
        this.comparisonLoad?.recoveryJson === this.rawComparisonData &&
        window.localStorage.getItem(STORAGE_KEY) === this.rawComparisonData,
      "Expected original saved data to remain unchanged and recoverable"
    );
  }
);

Given(
  "a {string} comparison calculation has a malformed State Pension amount",
  function (this: ComparisonValidationWorld, model: string) {
    const scenario = createScenario("invalid-calculation");
    if (model === "household") {
      scenario.settings.partner = {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1970-06-01",
        requirementAge: 68,
        lifeExpectancy: 80,
        showAlpha: false,
        showSipp: false,
        showIsa: false,
        statePensionDrawDate: "2038-06-01",
        statePensionForecastConfirmed: true,
      };
      scenario.settings.jointRetirement = {
        ...scenario.settings.jointRetirement,
        enabled: true,
      };
      Object.assign(scenario.settings.partner, {
        currentStatePension: "invalid",
      });
    } else {
      requireCondition(
        model === "single-person",
        "Expected a supported comparison model"
      );
      Object.assign(scenario.settings, { currentStatePension: "invalid" });
    }
    this.invalidComparison = scenario;
  }
);

When(
  "that comparison outcome is assessed",
  function (this: ComparisonValidationWorld) {
    requireCondition(
      this.invalidComparison,
      "Expected an invalid calculation scenario"
    );
    const plan = calculateRetirementPlan(this.invalidComparison.settings, {
      includeTargetBasedWithdrawalPreviews: false,
    });
    this.assessedComparison = createComparisonResult(
      this.invalidComparison,
      "",
      plan
    );
  }
);

Then(
  "the comparison should say Needs checking rather than Looks workable",
  function (this: ComparisonValidationWorld) {
    requireCondition(
      this.assessedComparison,
      "Expected an assessed comparison"
    );
    requireCondition(
      !getComparisonAssessment(this.assessedComparison).meetsTargetThroughout,
      "Invalid amounts must not satisfy the income target"
    );
    requireCondition(
      buildRetirementOutcomeBanner(this.assessedComparison).label ===
        "Needs checking",
      "Expected a clear unavailable-assessment status"
    );
  }
);

Then(
  "the invalid comparison should not be selected by comparison insights",
  function (this: ComparisonValidationWorld) {
    requireCondition(
      this.assessedComparison,
      "Expected an assessed comparison"
    );
    requireCondition(
      Object.values(
        calculateComparisonInsights([this.assessedComparison])
      ).every((value) => value === null),
      "Expected invalid results to be excluded from comparison insights"
    );
  }
);
