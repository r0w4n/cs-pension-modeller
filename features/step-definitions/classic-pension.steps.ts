import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import { addYears } from "../../src/projection-core";
import { defaultSettings } from "../../src/settings";
import type { PensionSettings } from "../../src/settings";
import {
  calculateClassicAnnualPensionAtDate,
  calculateClassicAutomaticLumpSumAtDate,
  calculateClassicBenefits,
  calculateClassicEarlyRetirementFactor,
  calculateClassicPensionRevaluationFactor,
  calculateClassicPlusAnnualPensionAtDate,
  calculateClassicPlusAutomaticLumpSumAtDate,
  calculateClassicPlusBenefits,
  type ClassicCalculationBreakdown,
  type ClassicPlusCalculationBreakdown,
} from "../../src/projection-domains/classic";

const ACCEPTANCE_START_DATE = "2026-04-01";
const CLASSIC_PLUS_PRE_2002_LUMP_SUM_COMPONENT = "pre-2002";

type ClassicScheme = "classic" | "classic plus";
type ClassicCalculationMode = "estimate" | "manual";

type ClassicWorld = {
  classicPrecision?: number;
  classicLumpSumPrecision?: number;
  classicScheme?: ClassicScheme;
  classicCalculationMode?: ClassicCalculationMode;
  classicFinalPensionableEarnings?: number;
  classicCurrentFinalPensionableEarnings?: number;
  classicPreservedFinalPensionableEarnings?: number;
  classicFinalSalaryLink?: "maintained" | "broken";
  classicSalaryIncrease?: number;
  classicReckonableServiceYears?: number;
  classicPlusPre2002ServiceYears?: number;
  classicPlusPost2002ServiceYears?: number;
  classicAnnualPension?: number;
  classicAutomaticLumpSum?: number;
  classicDeferredYears?: number;
  classicCpiRate?: number;
  classicCpiEnabled?: boolean;
  classicNormalPensionAge?: number;
  classicDrawAge?: number;
  classicProjectedYears?: number;
  classicResult?: ClassicCalculationBreakdown;
  classicPlusResult?: ClassicPlusCalculationBreakdown;
  classicPayableAnnualPension?: number;
  classicPayableAutomaticLumpSum?: number;
};

type BreakdownRow = Record<string, string>;

function parseMoney(value: string | number) {
  return Number(value);
}

function parsePercent(value: string) {
  return Number(value.replace("%", ""));
}

function parseOnOff(value: string) {
  return value === "on";
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertEqual<T>(actual: T, expected: T) {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
    );
  }
}

function expectMoney(actual: number, expected: string | number) {
  assertEqual(roundMoney(actual), parseMoney(expected));
}

function expectBreakdownRows(actual: BreakdownRow[], expected: DataTable) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected.hashes()));
}

function getClassicCalculationMode(mode: string): ClassicCalculationMode {
  if (mode === "enter known pension") {
    return "manual";
  }

  if (mode === "estimate from salary and service") {
    return "estimate";
  }

  throw new Error(`Unsupported classic calculation mode "${mode}"`);
}

function calculateClassicWorldResult(world: ClassicWorld) {
  if (world.classicScheme === "classic plus") {
    if (world.classicCalculationMode === "manual") {
      world.classicPlusResult = {
        pre2002AnnualPension: world.classicAnnualPension ?? 0,
        post2002AnnualPension: 0,
        annualPension: world.classicAnnualPension ?? 0,
        automaticLumpSum: world.classicAutomaticLumpSum ?? 0,
        finalPensionableEarnings: 0,
        pre2002ServiceYears: world.classicPlusPre2002ServiceYears ?? 0,
        post2002ServiceYears: world.classicPlusPost2002ServiceYears ?? 0,
      };
      return;
    }

    world.classicPlusResult = calculateClassicPlusBenefits({
      finalPensionableEarnings: world.classicFinalPensionableEarnings ?? 0,
      pre2002ServiceYears: world.classicPlusPre2002ServiceYears ?? 0,
      post2002ServiceYears: world.classicPlusPost2002ServiceYears ?? 0,
    });
    return;
  }

  if (world.classicCalculationMode === "manual") {
    world.classicResult = {
      annualPension: world.classicAnnualPension ?? 0,
      automaticLumpSum: world.classicAutomaticLumpSum ?? 0,
      finalPensionableEarnings: 0,
      reckonableServiceYears: world.classicReckonableServiceYears ?? 0,
    };
    return;
  }

  world.classicResult = calculateClassicBenefits({
    finalPensionableEarnings: world.classicFinalPensionableEarnings ?? 0,
    reckonableServiceYears: world.classicReckonableServiceYears ?? 0,
  });
}

function getClassicResult(world: ClassicWorld) {
  if (!world.classicResult) {
    calculateClassicWorldResult(world);
  }

  if (!world.classicResult) {
    throw new Error("Classic pension result has not been calculated");
  }

  return world.classicResult;
}

function getClassicPlusResult(world: ClassicWorld) {
  if (!world.classicPlusResult) {
    calculateClassicWorldResult(world);
  }

  if (!world.classicPlusResult) {
    throw new Error("Classic plus pension result has not been calculated");
  }

  return world.classicPlusResult;
}

function buildSettings(world: ClassicWorld): PensionSettings {
  return {
    ...defaultSettings,
    startDate: ACCEPTANCE_START_DATE,
    showClassic: world.classicScheme === "classic",
    showClassicPlus: world.classicScheme === "classic plus",
    classicCalculationMode: world.classicCalculationMode ?? "estimate",
    classicCurrentFinalPensionableEarnings:
      world.classicCurrentFinalPensionableEarnings ?? 0,
    classicPreservedFinalPensionableEarnings:
      world.classicPreservedFinalPensionableEarnings ?? 0,
    classicFinalSalaryLink: world.classicFinalSalaryLink ?? "maintained",
    classicReckonableServiceYears: world.classicReckonableServiceYears ?? 0,
    classicPlusCalculationMode: world.classicCalculationMode ?? "estimate",
    classicPlusCurrentFinalPensionableEarnings:
      world.classicCurrentFinalPensionableEarnings ?? 0,
    classicPlusPreservedFinalPensionableEarnings:
      world.classicPreservedFinalPensionableEarnings ?? 0,
    classicPlusFinalSalaryLink: world.classicFinalSalaryLink ?? "maintained",
    classicPlusPre2002ServiceYears: world.classicPlusPre2002ServiceYears ?? 0,
    classicPlusPost2002ServiceYears: world.classicPlusPost2002ServiceYears ?? 0,
    alphaPayRisePercent: world.classicSalaryIncrease ?? 0,
    projectionBasis: "real",
  };
}

function projectClassicPension(world: ClassicWorld, years: number) {
  const settings = buildSettings(world);
  const rowDate = addYears(ACCEPTANCE_START_DATE, years);
  const projectedFinalPensionableEarnings =
    world.classicFinalSalaryLink === "broken"
      ? (world.classicPreservedFinalPensionableEarnings ?? 0)
      : (world.classicCurrentFinalPensionableEarnings ?? 0) *
        (1 + (world.classicSalaryIncrease ?? 0) / 100) ** years;

  if (world.classicScheme === "classic plus") {
    const annualPension = calculateClassicPlusAnnualPensionAtDate({
      settings,
      rowDate,
    });
    const automaticLumpSum = calculateClassicPlusAutomaticLumpSumAtDate({
      settings,
      rowDate,
    });
    const breakdown = calculateClassicPlusBenefits({
      finalPensionableEarnings: projectedFinalPensionableEarnings,
      pre2002ServiceYears: world.classicPlusPre2002ServiceYears ?? 0,
      post2002ServiceYears: world.classicPlusPost2002ServiceYears ?? 0,
    });

    world.classicPlusResult = {
      ...breakdown,
      annualPension,
      automaticLumpSum,
      finalPensionableEarnings: projectedFinalPensionableEarnings,
    };
    return;
  }

  const annualPension = calculateClassicAnnualPensionAtDate({
    settings,
    rowDate,
  });
  const automaticLumpSum = calculateClassicAutomaticLumpSumAtDate({
    settings,
    rowDate,
  });

  world.classicResult = {
    annualPension,
    automaticLumpSum,
    finalPensionableEarnings: projectedFinalPensionableEarnings,
    reckonableServiceYears: world.classicReckonableServiceYears ?? 0,
  };
}

function applyDeferredRevaluation(world: ClassicWorld) {
  const factor = world.classicCpiEnabled
    ? calculateClassicPensionRevaluationFactor({
        fromDate: ACCEPTANCE_START_DATE,
        rowDate: addYears(
          ACCEPTANCE_START_DATE,
          world.classicDeferredYears ?? 0
        ),
        cpiPercent: world.classicCpiRate ?? 0,
      })
    : 1;

  world.classicAnnualPension = (world.classicAnnualPension ?? 0) * factor;
  world.classicAutomaticLumpSum = (world.classicAutomaticLumpSum ?? 0) * factor;
}

function applyEarlyRetirementReduction(world: ClassicWorld, drawAge: number) {
  const yearsEarly = (world.classicNormalPensionAge ?? 60) - drawAge;
  const factor = calculateClassicEarlyRetirementFactor(yearsEarly, 0);

  world.classicPayableAnnualPension =
    (world.classicAnnualPension ?? 0) * factor;
  world.classicPayableAutomaticLumpSum =
    (world.classicAutomaticLumpSum ?? 0) * factor;
}

Given(
  "classic pension outputs are rounded to {int} decimal places",
  function (this: ClassicWorld, precision: number) {
    this.classicPrecision = precision;
  }
);

Given(
  "classic lump sum outputs are rounded to {int} decimal places",
  function (this: ClassicWorld, precision: number) {
    this.classicLumpSumPrecision = precision;
  }
);

Given(
  /^the user has added a (classic|classic plus) pension pot$/,
  function (this: ClassicWorld, scheme: ClassicScheme) {
    this.classicScheme = scheme;
  }
);

Given(
  /^the (classic|classic plus) calculation mode is "([^"]+)"$/,
  function (this: ClassicWorld, scheme: ClassicScheme, mode: string) {
    this.classicScheme = scheme;
    this.classicCalculationMode = getClassicCalculationMode(mode);
  }
);

Given(
  /^the (classic|classic plus) final pensionable earnings are ([0-9.]+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, amount: string) {
    this.classicScheme = scheme;
    this.classicFinalPensionableEarnings = parseMoney(amount);
  }
);

Given(
  "the classic reckonable service is {float} years",
  function (this: ClassicWorld, years: number) {
    this.classicReckonableServiceYears = years;
  }
);

Given(
  "the classic plus pre-2002 reckonable service is {float} years",
  function (this: ClassicWorld, years: number) {
    this.classicPlusPre2002ServiceYears = years;
  }
);

Given(
  "the classic plus post-2002 reckonable service is {float} years",
  function (this: ClassicWorld, years: number) {
    this.classicPlusPost2002ServiceYears = years;
  }
);

Given(
  /^the (classic|classic plus) final salary link is "(maintained|broken)"$/,
  function (
    this: ClassicWorld,
    scheme: ClassicScheme,
    finalSalaryLink: "maintained" | "broken"
  ) {
    this.classicScheme = scheme;
    this.classicFinalSalaryLink = finalSalaryLink;
  }
);

Given(
  /^the current (classic|classic plus) final pensionable earnings are ([0-9.]+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, amount: string) {
    this.classicScheme = scheme;
    this.classicCurrentFinalPensionableEarnings = parseMoney(amount);
  }
);

Given(
  /^the preserved (classic|classic plus) final pensionable earnings are ([0-9.]+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, amount: string) {
    this.classicScheme = scheme;
    this.classicPreservedFinalPensionableEarnings = parseMoney(amount);
  }
);

Given(
  /^the (classic|classic plus) salary increase assumption is ([0-9.]+)%$/,
  function (this: ClassicWorld, scheme: ClassicScheme, rate: string) {
    this.classicScheme = scheme;
    this.classicSalaryIncrease = parsePercent(rate);
  }
);

Given(
  /^the (?:annual )?(classic|classic plus) pension at deferral is ([0-9.]+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, amount: string) {
    this.classicScheme = scheme;
    this.classicAnnualPension = parseMoney(amount);
  }
);

Given(
  /^the automatic (classic|classic plus) lump sum at deferral is ([0-9.]+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, amount: string) {
    this.classicScheme = scheme;
    this.classicAutomaticLumpSum = parseMoney(amount);
  }
);

Given(
  /^the (classic|classic plus) pension is deferred$/,
  function (this: ClassicWorld, scheme: ClassicScheme) {
    this.classicScheme = scheme;
  }
);

Given(
  /^the (classic|classic plus) pension is deferred for (\d+) years$/,
  function (this: ClassicWorld, scheme: ClassicScheme, years: string) {
    this.classicScheme = scheme;
    this.classicDeferredYears = Number(years);
  }
);

Given(
  /^the (classic|classic plus) annual CPI assumption is ([0-9.]+)%$/,
  function (this: ClassicWorld, scheme: ClassicScheme, rate: string) {
    this.classicScheme = scheme;
    this.classicCpiRate = parsePercent(rate);
  }
);

Given(
  /^(classic|classic plus) CPI revaluation is (on|off)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, enabled: string) {
    this.classicScheme = scheme;
    this.classicCpiEnabled = parseOnOff(enabled);
  }
);

Given(
  /^the (classic|classic plus) normal pension age is (\d+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, age: string) {
    this.classicScheme = scheme;
    this.classicNormalPensionAge = Number(age);
  }
);

Given(
  /^the unreduced annual (classic|classic plus) pension is ([0-9.]+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, amount: string) {
    this.classicScheme = scheme;
    this.classicAnnualPension = parseMoney(amount);
  }
);

Given(
  /^the unreduced automatic (classic|classic plus) lump sum is ([0-9.]+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, amount: string) {
    this.classicScheme = scheme;
    this.classicAutomaticLumpSum = parseMoney(amount);
  }
);

When(
  /^the (classic|classic plus) pension pot is calculated$/,
  function (this: ClassicWorld, scheme: ClassicScheme) {
    this.classicScheme = scheme;
    calculateClassicWorldResult(this);
  }
);

When(
  /^the user enters annual (classic|classic plus) pension of ([0-9.]+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, amount: string) {
    this.classicScheme = scheme;
    this.classicAnnualPension = parseMoney(amount);
  }
);

When(
  /^the user enters automatic (classic|classic plus) lump sum of ([0-9.]+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, amount: string) {
    this.classicScheme = scheme;
    this.classicAutomaticLumpSum = parseMoney(amount);
    calculateClassicWorldResult(this);
  }
);

When(
  /^the user projects the (classic|classic plus) pension for (\d+) years$/,
  function (this: ClassicWorld, scheme: ClassicScheme, years: string) {
    this.classicScheme = scheme;
    this.classicProjectedYears = Number(years);
    projectClassicPension(this, Number(years));
  }
);

When(
  "the user remains in alpha for {int} further scheme years",
  function (this: ClassicWorld, _years: number) {
    calculateClassicWorldResult(this);
  }
);

When(
  /^the deferred (classic|classic plus) pension is projected to draw age$/,
  function (this: ClassicWorld, scheme: ClassicScheme) {
    this.classicScheme = scheme;
    applyDeferredRevaluation(this);
  }
);

When(
  /^the user draws (classic|classic plus) pension at age (\d+)$/,
  function (this: ClassicWorld, scheme: ClassicScheme, drawAge: string) {
    this.classicScheme = scheme;
    this.classicDrawAge = Number(drawAge);
    applyEarlyRetirementReduction(this, Number(drawAge));
  }
);

Then(
  "the unreduced annual classic pension should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicResult(this).annualPension, amount);
  }
);

Then(
  "the automatic classic lump sum should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicResult(this).automaticLumpSum, amount);
  }
);

Then(
  "the modeller should not recalculate classic pension from salary and service",
  function (this: ClassicWorld) {
    expectMoney(getClassicResult(this).finalPensionableEarnings, 0);
  }
);

Then(
  "the classic calculation breakdown should show:",
  function (this: ClassicWorld, table: DataTable) {
    const result = getClassicResult(this);

    expectBreakdownRows(
      [
        {
          item: "finalPensionableEarnings",
          value: roundMoney(result.finalPensionableEarnings).toFixed(2),
        },
        {
          item: "reckonableServiceYears",
          value: result.reckonableServiceYears.toFixed(4),
        },
        {
          item: "annualPension",
          value: roundMoney(result.annualPension).toFixed(2),
        },
        {
          item: "automaticLumpSum",
          value: roundMoney(result.automaticLumpSum).toFixed(2),
        },
      ],
      table
    );
  }
);

Then(
  "the pre-2002 annual classic plus pension should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicPlusResult(this).pre2002AnnualPension, amount);
  }
);

Then(
  "the post-2002 annual classic plus pension should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicPlusResult(this).post2002AnnualPension, amount);
  }
);

Then(
  "the total unreduced annual classic plus pension should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicPlusResult(this).annualPension, amount);
  }
);

Then(
  "the automatic classic plus lump sum should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicPlusResult(this).automaticLumpSum, amount);
  }
);

Then(
  "the modeller should not recalculate classic plus pension from salary and service",
  function (this: ClassicWorld) {
    expectMoney(getClassicPlusResult(this).finalPensionableEarnings, 0);
  }
);

Then(
  "the classic plus calculation breakdown should show:",
  function (this: ClassicWorld, table: DataTable) {
    const result = getClassicPlusResult(this);

    expectBreakdownRows(
      [
        {
          component: CLASSIC_PLUS_PRE_2002_LUMP_SUM_COMPONENT,
          annualPension: roundMoney(result.pre2002AnnualPension).toFixed(2),
          automaticLumpSum: roundMoney(result.automaticLumpSum).toFixed(2),
        },
        {
          component: "post-2002",
          annualPension: roundMoney(result.post2002AnnualPension).toFixed(2),
          automaticLumpSum: "0.00",
        },
        {
          component: "total",
          annualPension: roundMoney(result.annualPension).toFixed(2),
          automaticLumpSum: roundMoney(result.automaticLumpSum).toFixed(2),
        },
      ],
      table
    );
  }
);

Then(
  "the final pensionable earnings used for classic should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicResult(this).finalPensionableEarnings, amount);
  }
);

Then(
  "the final pensionable earnings used for classic should remain {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicResult(this).finalPensionableEarnings, amount);
  }
);

Then(
  "the final pensionable earnings used for classic plus should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicPlusResult(this).finalPensionableEarnings, amount);
  }
);

Then(
  "the final pensionable earnings used for classic plus should remain {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(getClassicPlusResult(this).finalPensionableEarnings, amount);
  }
);

Then(
  "the classic reckonable service should remain {float} years",
  function (this: ClassicWorld, years: number) {
    assertEqual(this.classicReckonableServiceYears, years);
  }
);

Then(
  "the classic plus pre-2002 reckonable service should remain {float} years",
  function (this: ClassicWorld, years: number) {
    assertEqual(this.classicPlusPre2002ServiceYears, years);
  }
);

Then(
  "the classic plus post-2002 reckonable service should remain {float} years",
  function (this: ClassicWorld, years: number) {
    assertEqual(this.classicPlusPost2002ServiceYears, years);
  }
);

Then("no new classic accrual should be added", function (this: ClassicWorld) {
  assertEqual(getClassicResult(this).reckonableServiceYears, 10);
});

Then(
  "no new classic plus accrual should be added",
  function (this: ClassicWorld) {
    const result = getClassicPlusResult(this);

    assertEqual(result.pre2002ServiceYears, 10);
    assertEqual(result.post2002ServiceYears, 5);
  }
);

Then(
  "the unreduced annual classic pension at draw age should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(this.classicAnnualPension ?? 0, amount);
  }
);

Then(
  "the automatic classic lump sum at draw age should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(this.classicAutomaticLumpSum ?? 0, amount);
  }
);

Then(
  "the unreduced annual classic plus pension at draw age should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(this.classicAnnualPension ?? 0, amount);
  }
);

Then(
  "the automatic classic plus lump sum at draw age should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(this.classicAutomaticLumpSum ?? 0, amount);
  }
);

Then(
  "the annual classic pension payable should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(this.classicPayableAnnualPension ?? 0, amount);
  }
);

Then(
  "the automatic classic lump sum payable should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(this.classicPayableAutomaticLumpSum ?? 0, amount);
  }
);

Then(
  "the annual classic pension reduction should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(
      (this.classicAnnualPension ?? 0) -
        (this.classicPayableAnnualPension ?? 0),
      amount
    );
  }
);

Then(
  "the automatic classic lump sum reduction should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(
      (this.classicAutomaticLumpSum ?? 0) -
        (this.classicPayableAutomaticLumpSum ?? 0),
      amount
    );
  }
);

Then(
  "the annual classic plus pension payable should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(this.classicPayableAnnualPension ?? 0, amount);
  }
);

Then(
  "the automatic classic plus lump sum payable should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(this.classicPayableAutomaticLumpSum ?? 0, amount);
  }
);

Then(
  "the annual classic plus pension reduction should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(
      (this.classicAnnualPension ?? 0) -
        (this.classicPayableAnnualPension ?? 0),
      amount
    );
  }
);

Then(
  "the automatic classic plus lump sum reduction should be {float}",
  function (this: ClassicWorld, amount: number) {
    expectMoney(
      (this.classicAutomaticLumpSum ?? 0) -
        (this.classicPayableAutomaticLumpSum ?? 0),
      amount
    );
  }
);
