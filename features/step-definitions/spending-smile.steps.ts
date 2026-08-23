import { Given, Then, When } from "@cucumber/cucumber";
import { fieldGroups } from "../../src/fieldDefinitions";
import { applyRetirementIncomeChartParameterPatch } from "../../src/app/chart-state";
import { JOURNEY_DEFINITIONS } from "../../src/app-domains";
import {
  reconcileSpendingSmilePhaseAges,
  resolveAnnualSpendingTarget,
  updateSpendingSmileStartAge,
  type ResolvedSpendingTarget,
  type SmilePercentageField,
} from "../../src/spending-smile";
import {
  createDefaultSettings,
  validateSettings,
  type PensionSettings,
  type SpendingSmileStrategy,
} from "../../src/settings";

type SpendingSmileWorld = {
  settings?: PensionSettings;
  resolvedTarget?: ResolvedSpendingTarget;
  savedSmileConfiguration?: SpendingSmileStrategy;
  targetControlDisplayed?: boolean;
};

Given(
  "the user is configuring their retirement income target",
  function (this: SpendingSmileWorld) {
    this.settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1990-01-01",
      startDate: "2050-01-01",
      requirementAge: 60,
      lifeExpectancy: 95,
      projectionBasis: "real",
    };
  }
);

Given(
  "the Retirement Living Standards target control is displayed",
  function (this: SpendingSmileWorld) {
    const targetGroup = fieldGroups.find(
      (group) => group.id === "retirement-target"
    );
    this.targetControlDisplayed = Boolean(
      targetGroup?.fields.some(
        (field) => field.id === "desiredRetirementIncome"
      )
    );
  }
);

Given(
  "the user has selected a Retirement Living Standards target of £{int}",
  function (this: SpendingSmileWorld, target: number) {
    getSettings(this).desiredRetirementIncome = target;
  }
);

Given(
  "the user selected {string}",
  function (this: SpendingSmileWorld, selection: string) {
    selectStrategy(getSettings(this), selection);
  }
);

Given(
  "the {string} percentage is {int} percent",
  function (this: SpendingSmileWorld, phase: string, percentage: number) {
    setPercentage(getSettings(this), phase, percentage);
  }
);

Given(
  "the user's retirement age is {int}",
  function (this: SpendingSmileWorld, age: number) {
    getSettings(this).requirementAge = age;
  }
);

Given(
  "the modelled life expectancy is {int}",
  function (this: SpendingSmileWorld, age: number) {
    getSettings(this).lifeExpectancy = age;
  }
);

When(
  "the modelled life expectancy is changed to {int}",
  function (this: SpendingSmileWorld, age: number) {
    const settings = getSettings(this);
    settings.lifeExpectancy = age;
    settings.spendingSmile = reconcileSpendingSmilePhaseAges(
      settings.spendingSmile,
      settings.requirementAge,
      age
    );
  }
);

Given(
  "the slow-go start age is {int}",
  function (this: SpendingSmileWorld, age: number) {
    const settings = getSettings(this);
    settings.spendingStrategyType = "SPENDING_SMILE";
    settings.spendingSmile = updateSpendingSmileStartAge(
      settings.spendingSmile,
      "slowGoStartAge",
      age,
      settings.requirementAge,
      settings.lifeExpectancy
    );
  }
);

Given(
  "the no-go start age is {int}",
  function (this: SpendingSmileWorld, age: number) {
    const settings = getSettings(this);
    settings.spendingStrategyType = "SPENDING_SMILE";
    settings.spendingSmile = updateSpendingSmileStartAge(
      settings.spendingSmile,
      "noGoStartAge",
      age,
      settings.requirementAge,
      settings.lifeExpectancy
    );
  }
);

Given(
  "the user previously configured a Go-Go, Slow-Go, No-Go strategy",
  function (this: SpendingSmileWorld) {
    const settings = getSettings(this);
    settings.spendingSmile = {
      goGoPercentage: 110,
      slowGoStartAge: 72,
      slowGoPercentage: 82,
      noGoStartAge: 84,
      noGoPercentage: 68,
    };
    settings.spendingStrategyType = "SPENDING_SMILE";
    this.savedSmileConfiguration = { ...settings.spendingSmile };
  }
);

When(
  "the user selects {string}",
  function (this: SpendingSmileWorld, selection: string) {
    selectStrategy(getSettings(this), selection);
  }
);

When(
  "the spending target is calculated at age {int}",
  function (this: SpendingSmileWorld, age: number) {
    this.resolvedTarget = resolveAnnualSpendingTarget({
      settings: getSettings(this),
      rowDate: `${1990 + age}-01-01`,
    });
  }
);

When(
  "the slow-go start age is set to {int}",
  function (this: SpendingSmileWorld, age: number) {
    const settings = getSettings(this);
    settings.spendingStrategyType = "SPENDING_SMILE";
    settings.spendingSmile = updateSpendingSmileStartAge(
      settings.spendingSmile,
      "slowGoStartAge",
      age,
      settings.requirementAge,
      settings.lifeExpectancy
    );
  }
);

When(
  "the no-go start age is set to {int}",
  function (this: SpendingSmileWorld, age: number) {
    const settings = getSettings(this);
    settings.spendingStrategyType = "SPENDING_SMILE";
    settings.spendingSmile = updateSpendingSmileStartAge(
      settings.spendingSmile,
      "noGoStartAge",
      age,
      settings.requirementAge,
      settings.lifeExpectancy
    );
  }
);

When(
  "the {string} percentage is set to {float} percent",
  function (this: SpendingSmileWorld, phase: string, percentage: number) {
    const settings = getSettings(this);
    settings.spendingStrategyType = "SPENDING_SMILE";
    setPercentage(settings, phase, percentage);
  }
);

Then(
  "the Retirement Living Standards target should be displayed first",
  function (this: SpendingSmileWorld) {
    assertEqual(this.targetControlDisplayed, true);
    const personalGroupIndex = fieldGroups.findIndex(
      (group) => group.id === "personal"
    );
    const targetGroupIndex = fieldGroups.findIndex(
      (group) => group.id === "retirement-target"
    );
    const targetGroup = fieldGroups[targetGroupIndex];

    assertEqual(targetGroupIndex, personalGroupIndex + 1);
    assertEqual(targetGroup?.fields[0]?.id, "desiredRetirementIncome");
  }
);

Then(
  "the spending strategy dropdown should be displayed beneath it",
  function () {
    const targetGroup = fieldGroups.find(
      (group) => group.id === "retirement-target"
    );
    const targetStep = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "expert-journey"
    )?.steps.find((step) => step.id === `expert-${targetGroup?.id ?? ""}`);
    assertEqual(
      targetStep?.kind === "fields" &&
        targetStep.showSpendingSmileEditor === true,
      true
    );
  }
);

Then(
  "the Go-Go, Slow-Go, No-Go configuration fields should not be displayed",
  function (this: SpendingSmileWorld) {
    assertEqual(getSettings(this).spendingStrategyType, "FLAT");
  }
);

Then(
  "the Go-Go, Slow-Go, No-Go configuration fields should be displayed",
  function (this: SpendingSmileWorld) {
    assertEqual(getSettings(this).spendingStrategyType, "SPENDING_SMILE");
  }
);

Then(
  "the stored phased-spending configuration should contain percentages and phase ages",
  function (this: SpendingSmileWorld) {
    const configuration = getSettings(this).spendingSmile;
    assertEqual(typeof configuration.goGoPercentage, "number");
    assertEqual(typeof configuration.slowGoStartAge, "number");
    assertEqual(typeof configuration.slowGoPercentage, "number");
    assertEqual(typeof configuration.noGoStartAge, "number");
    assertEqual(typeof configuration.noGoPercentage, "number");
  }
);

Then(
  "the stored phased-spending configuration should not contain monetary phase targets",
  function (this: SpendingSmileWorld) {
    const configuration = getSettings(this).spendingSmile as unknown as Record<
      string,
      unknown
    >;
    assertEqual("goGo" in configuration, false);
    assertEqual("slowGo" in configuration, false);
    assertEqual("noGo" in configuration, false);
    assertEqual("annualAmountReal" in configuration, false);
  }
);

Then(
  "all phase targets should be calculated from the selected Retirement Living Standards target",
  function (this: SpendingSmileWorld) {
    const settings = getSettings(this);
    settings.desiredRetirementIncome = 30_000;
    settings.spendingSmile = {
      ...settings.spendingSmile,
      slowGoStartAge: 70,
      noGoStartAge: 80,
    };
    const targetAt75 = resolveAnnualSpendingTarget({
      settings,
      rowDate: "2065-01-01",
    });
    assertEqual(
      targetAt75.annualRealTarget,
      30_000 * (settings.spendingSmile.slowGoPercentage / 100)
    );
  }
);

Then(
  "the spending target should remain at {int} percent of the selected target",
  function (this: SpendingSmileWorld, percentage: number) {
    const settings = getSettings(this);
    [settings.requirementAge, settings.spendingSmile.noGoStartAge + 1].forEach(
      (age) => {
        this.resolvedTarget = resolveAnnualSpendingTarget({
          settings,
          rowDate: `${1990 + age}-01-01`,
        });
        assertEqual(this.resolvedTarget.percentageOfTarget, percentage);
        assertEqual(
          this.resolvedTarget.annualRealTarget,
          settings.desiredRetirementIncome
        );
      }
    );
  }
);

Then(
  "the spending phase should be {string}",
  function (this: SpendingSmileWorld, phase: string) {
    assertEqual(this.resolvedTarget?.phase, phase);
  }
);

Then(
  "the spending target should be £{int} per year",
  function (this: SpendingSmileWorld, target: number) {
    assertEqual(this.resolvedTarget?.annualRealTarget, target);
  }
);

Then(
  "validation reports {string}",
  function (this: SpendingSmileWorld, message: string) {
    const issue = validateSettings(getSettings(this)).find(
      (candidate) =>
        candidate.field === "spendingSmile" && candidate.message === message
    );
    assertEqual(issue?.message, message);
  }
);

Then(
  "the no-go start age should be {int}",
  function (this: SpendingSmileWorld, age: number) {
    assertEqual(getSettings(this).spendingSmile.noGoStartAge, age);
  }
);

Then(
  "the slow-go start age should be {int}",
  function (this: SpendingSmileWorld, age: number) {
    assertEqual(getSettings(this).spendingSmile.slowGoStartAge, age);
  }
);

Then(
  "validation should not report a phased-spending age error",
  function (this: SpendingSmileWorld) {
    const hasPhaseAgeError = validateSettings(getSettings(this)).some(
      (issue) =>
        issue.field === "spendingSmile" &&
        (issue.itemId === "slowGoStartAge" || issue.itemId === "noGoStartAge")
    );
    assertEqual(hasPhaseAgeError, false);
  }
);

Then(
  "validation should not report a no-go life expectancy error",
  function (this: SpendingSmileWorld) {
    const hasLifeExpectancyError = validateSettings(getSettings(this)).some(
      (issue) =>
        issue.itemId === "noGoStartAge" &&
        issue.message.includes("life expectancy")
    );
    assertEqual(hasLifeExpectancyError, false);
  }
);

Then(
  "the previously configured phase percentages and ages should be restored",
  function (this: SpendingSmileWorld) {
    assertEqual(getSettings(this).spendingSmile, this.savedSmileConfiguration);
  }
);

When(
  "the {string} results-chart phase is changed to {int} percent",
  function (this: SpendingSmileWorld, phase: string, percentage: number) {
    const settings = getSettings(this);
    const fieldByPhase: Record<string, SmilePercentageField> = {
      "Go-go": "goGoPercentage",
      "Slow-go": "slowGoPercentage",
      "No-go": "noGoPercentage",
    };
    const field = fieldByPhase[phase];
    if (!field) {
      throw new Error(`Unknown SMILE phase: ${phase}`);
    }
    this.settings = applyRetirementIncomeChartParameterPatch(settings, {
      [field]: percentage,
    });
  }
);

When(
  "the {string} results-chart start age is changed to {int}",
  function (this: SpendingSmileWorld, phase: string, age: number) {
    const settings = getSettings(this);
    const fieldByPhase = {
      "Slow-go": "slowGoStartAge",
      "No-go": "noGoStartAge",
    } as const;
    const field = fieldByPhase[phase as keyof typeof fieldByPhase];
    if (!field) {
      throw new Error(`Unknown SMILE phase boundary: ${phase}`);
    }
    this.settings = applyRetirementIncomeChartParameterPatch(settings, {
      [field]: age,
    });
  }
);

Then(
  "the {string} percentage should be {int} percent",
  function (this: SpendingSmileWorld, phase: string, percentage: number) {
    const fieldByPhase: Record<string, SmilePercentageField> = {
      "Go-go": "goGoPercentage",
      "Slow-go": "slowGoPercentage",
      "No-go": "noGoPercentage",
    };
    const field = fieldByPhase[phase];
    if (!field) {
      throw new Error(`Unknown SMILE phase: ${phase}`);
    }
    assertEqual(getSettings(this).spendingSmile[field], percentage);
  }
);

function selectStrategy(settings: PensionSettings, selection: string) {
  settings.spendingStrategyType =
    selection === "Go-Go, Slow-Go, No-Go" ? "SPENDING_SMILE" : "FLAT";
}

function setPercentage(
  settings: PensionSettings,
  phase: string,
  percentage: number
) {
  const fieldByPhase: Record<string, SmilePercentageField> = {
    "Go-go": "goGoPercentage",
    "Slow-go": "slowGoPercentage",
    "No-go": "noGoPercentage",
  };
  const field = fieldByPhase[phase];
  if (!field) {
    throw new Error(`Unknown SMILE phase: ${phase}`);
  }
  settings.spendingSmile[field] = percentage;
}

function getSettings(world: SpendingSmileWorld) {
  if (!world.settings) {
    throw new Error("Retirement target settings have not been created");
  }
  return world.settings;
}

function assertEqual(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
    );
  }
}
