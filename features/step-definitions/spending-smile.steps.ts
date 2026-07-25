import { Given, Then, When } from "@cucumber/cucumber";
import {
  aggregateSpendingPhaseOutcomes,
  createAnnualSpendingOutcomes,
  type SpendingPhaseOutcome,
} from "../../src/app-domains";
import type { RetirementIncomePoint } from "../../src/RetirementIncomeBridgeChart";
import {
  applyRlsTarget,
  classifyRlsTarget,
  createDefaultSpendingSmile,
  resolveAnnualSpendingTarget,
  updateGoGoAnnualAmount,
  updatePhaseAnnualAmount,
  type ResolvedSpendingTarget,
  type RlsClassification,
  type RlsLevel,
} from "../../src/spending-smile";
import {
  createDefaultSettings,
  validateSettings,
  type PensionSettings,
} from "../../src/settings";

type SpendingSmileWorld = {
  settings?: PensionSettings;
  resolvedTarget?: ResolvedSpendingTarget;
  selectedPhase?: "goGo" | "slowGo" | "noGo";
  classification?: RlsClassification;
  phaseOutcomes?: SpendingPhaseOutcome[];
};

Given(
  "a Spending Smile plan with retirement at age {int} and a £{int} flat target",
  function (this: SpendingSmileWorld, requirementAge: number, target: number) {
    this.settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1990-01-01",
      startDate: "2050-01-01",
      requirementAge,
      lifeExpectancy: 95,
      projectionBasis: "real",
      desiredRetirementIncome: target,
      spendingStrategyType: "SPENDING_SMILE",
      spendingSmile: {
        ...createDefaultSpendingSmile(target),
        initialized: true,
      },
    };
  }
);

Given(
  "Spending Smile percentage input is selected",
  function (this: SpendingSmileWorld) {
    const settings = getSettings(this);
    settings.spendingSmile.inputMode = "PERCENTAGE_OF_GO_GO";
  }
);

Given(
  "life expectancy is {int}",
  function (this: SpendingSmileWorld, lifeExpectancy: number) {
    getSettings(this).lifeExpectancy = lifeExpectancy;
  }
);

Given(
  "the Spending Smile strategy is not active",
  function (this: SpendingSmileWorld) {
    getSettings(this).spendingStrategyType = "FLAT";
  }
);

When(
  "the Spending Smile target is resolved at age {int}",
  function (this: SpendingSmileWorld, age: number) {
    this.resolvedTarget = resolveAnnualSpendingTarget({
      settings: getSettings(this),
      rowDate: `${1990 + age}-01-01`,
    });
  }
);

When(
  "the Go-go target changes to £{int}",
  function (this: SpendingSmileWorld, amount: number) {
    const settings = getSettings(this);
    settings.spendingSmile = updateGoGoAnnualAmount(
      settings.spendingSmile,
      amount
    );
  }
);

When(
  "the Slow-go annual target changes to £{int}",
  function (this: SpendingSmileWorld, amount: number) {
    const settings = getSettings(this);
    settings.spendingSmile = updatePhaseAnnualAmount(
      settings.spendingSmile,
      "slowGo",
      amount
    );
  }
);

When(
  "the user applies the {string} one-person RLS target to {string}",
  function (
    this: SpendingSmileWorld,
    standard: string,
    phase: "goGo" | "slowGo" | "noGo"
  ) {
    const settings = getSettings(this);
    settings.spendingSmile.householdType = "ONE_PERSON";
    settings.spendingSmile = applyRlsTarget(
      settings.spendingSmile,
      phase,
      standard.toLowerCase() as RlsLevel
    );
    this.selectedPhase = phase;
  }
);

When(
  "an annual target of £{int} is classified for one person",
  function (this: SpendingSmileWorld, target: number) {
    this.classification = classifyRlsTarget(target, "ONE_PERSON");
  }
);

When(
  "the No-go phase is configured to start at age {int}",
  function (this: SpendingSmileWorld, age: number) {
    getSettings(this).spendingSmile.noGoStartAge = age;
  }
);

When(
  "Spending Smile phase outcomes are calculated",
  function (this: SpendingSmileWorld) {
    const settings = getSettings(this);
    const series = Array.from(
      { length: settings.lifeExpectancy - settings.requirementAge + 1 },
      (_, index) =>
        createPoint(
          settings.requirementAge + index,
          `${1990 + settings.requirementAge + index}-01-01`
        )
    );
    this.phaseOutcomes = aggregateSpendingPhaseOutcomes(
      createAnnualSpendingOutcomes(series, settings),
      settings
    );
  }
);

Then(
  "the spending phase is {string}",
  function (this: SpendingSmileWorld, phase: string) {
    assertEqual(this.resolvedTarget?.phase, phase);
  }
);

Then(
  "the real annual spending target is £{int}",
  function (this: SpendingSmileWorld, target: number) {
    assertEqual(this.resolvedTarget?.annualRealTarget, target);
  }
);

Then(
  "the Slow-go annual target is £{int}",
  function (this: SpendingSmileWorld, target: number) {
    assertEqual(
      getSettings(this).spendingSmile.slowGo.annualAmountReal,
      target
    );
  }
);

Then(
  "the No-go annual target is £{int}",
  function (this: SpendingSmileWorld, target: number) {
    assertEqual(getSettings(this).spendingSmile.noGo.annualAmountReal, target);
  }
);

Then(
  "the stored Slow-go percentage is {int}%",
  function (this: SpendingSmileWorld, percentage: number) {
    assertEqual(
      getSettings(this).spendingSmile.slowGo.percentageOfGoGo,
      percentage
    );
  }
);

Then(
  "the stored No-go percentage is {int}%",
  function (this: SpendingSmileWorld, percentage: number) {
    assertEqual(
      getSettings(this).spendingSmile.noGo.percentageOfGoGo,
      percentage
    );
  }
);

Then(
  "the selected phase annual target is £{int}",
  function (this: SpendingSmileWorld, amount: number) {
    const phase = getSelectedPhase(this);
    assertEqual(
      getSettings(this).spendingSmile[phase].annualAmountReal,
      amount
    );
  }
);

Then(
  "the selected phase source is {string}",
  function (this: SpendingSmileWorld, source: string) {
    const phase = getSelectedPhase(this);
    assertEqual(getSettings(this).spendingSmile[phase].source, source);
  }
);

Then(
  "its RLS classification is {string}",
  function (this: SpendingSmileWorld, classification: string) {
    assertEqual(this.classification, classification);
  }
);

Then(
  "validation reports {string}",
  function (this: SpendingSmileWorld, message: string) {
    const issue = validateSettings(getSettings(this)).find(
      (candidate) => candidate.field === "spendingSmile"
    );
    assertEqual(issue?.message, message);
  }
);

Then(
  "the No-go phase result is {string}",
  function (this: SpendingSmileWorld, status: string) {
    assertEqual(getNoGoOutcome(this).status, status);
  }
);

Then(
  "the No-go phase contributes £{int} to target expenditure",
  function (this: SpendingSmileWorld, target: number) {
    assertEqual(getNoGoOutcome(this).totalTargetReal, target);
  }
);

function getSettings(world: SpendingSmileWorld) {
  if (!world.settings) {
    throw new Error("Spending Smile settings have not been created");
  }
  return world.settings;
}

function getSelectedPhase(world: SpendingSmileWorld) {
  if (!world.selectedPhase) {
    throw new Error("No Spending Smile phase was selected");
  }
  return world.selectedPhase;
}

function getNoGoOutcome(world: SpendingSmileWorld) {
  const outcome = world.phaseOutcomes?.find(
    (candidate) => candidate.phase === "NO_GO"
  );
  if (!outcome) {
    throw new Error("No-go outcome was not calculated");
  }
  return outcome;
}

function assertEqual(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
    );
  }
}

function createPoint(age: number, date: string): RetirementIncomePoint {
  return {
    date,
    age,
    targetIncomeAnnual: 0,
    isaIncomeAnnual: 0,
    lisaIncomeAnnual: 0,
    sippIncomeAnnual: 0,
    csAvcIncomeAnnual: 0,
    alphaIncomeAnnual: 0,
    classicIncomeAnnual: 0,
    classicPlusIncomeAnnual: 0,
    nuvosIncomeAnnual: 0,
    premiumIncomeAnnual: 0,
    additionalGuaranteedIncomeAnnual: 0,
    partialRetirementIncomeAnnual: 0,
    statePensionIncomeAnnual: 0,
    totalIncomeAnnual: 100_000,
    assessedIncomeAnnual: 100_000,
    shortfallAnnual: 0,
    phase: "alpha-state",
  };
}
