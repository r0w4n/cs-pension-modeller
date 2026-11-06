import { Given, When, Then, type DataTable } from "@cucumber/cucumber";
import { validateCurrencyDraft } from "../../src/app-domains/currency-draft";
import { fieldGroups } from "../../src/fieldDefinitions";
import { createDefaultSettings } from "../../src/settings";
import { calculateRetirementPlan } from "../../src/calculation/retirement-plan";
import {
  createComparisonResult,
  type ComparisonResult,
} from "../../src/result-projection/comparison-result";
import { projectSimpleIncomeSummary } from "../../src/result-projection/simple-income-summary";
import { buildChartShortfallRanges } from "../../src/result-projection/chart-shortfall-ranges";

function requireCondition(value: unknown): asserts value {
  if (!value)
    throw new Error("Expected the presentation prerequisite to be available");
}
function assertEqual(actual: unknown, expected: unknown) {
  if (actual !== expected)
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
}
function assertDeepEqual(actual: unknown, expected: unknown) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected));
}

type PresentationWorld = {
  targetDraftStatus?: string;
  presentationResult?: ComparisonResult;
  headline?: ReturnType<typeof projectSimpleIncomeSummary>;
  shortfallRanges?: ReturnType<typeof buildChartShortfallRanges>;
};

When(
  "the spending target draft is {string}",
  function (this: PresentationWorld, draft: string) {
    const field = fieldGroups
      .flatMap((group) => group.fields)
      .find((field) => field.id === "desiredRetirementIncome");
    requireCondition(field?.type === "currency-input");
    this.targetDraftStatus = validateCurrencyDraft(draft, field).status;
  }
);
Then(
  "the spending target draft should be {string}",
  function (this: PresentationWorld, status: string) {
    assertEqual(this.targetDraftStatus, status);
  }
);
Given(
  "retirement at age 60 with only State Pension starting at age 68",
  function (this: PresentationWorld) {
    const settings = {
      ...createDefaultSettings(),
      startDate: "2026-06-01",
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 80,
      showAlpha: false,
      showIsa: false,
      showSipp: false,
      showStatePension: true,
      statePensionDrawDate: "2038-06-01",
      currentStatePension: 12000,
      statePensionApplyFutureGrowth: false,
      statePensionForecastConfirmed: true,
      desiredRetirementIncome: 10000,
      taxationEnabled: false,
      inflationRateAnnual: 0,
    };
    this.presentationResult = createComparisonResult(
      {
        id: "timing-example",
        name: "Timing example",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      "",
      calculateRetirementPlan(settings, {
        includeTargetBasedWithdrawalPreviews: false,
      })
    );
  }
);
When(
  "the Simple income headline is projected monthly",
  function (this: PresentationWorld) {
    requireCondition(this.presentationResult);
    this.headline = projectSimpleIncomeSummary(
      this.presentationResult,
      "monthly"
    );
  }
);
Then(
  "the headline income at retirement should be zero",
  function (this: PresentationWorld) {
    assertEqual(this.headline?.income, 0);
    assertEqual(this.headline?.retirementAge, "60");
    requireCondition((this.headline?.difference ?? 0) < 0);
  }
);
Then(
  "the later pension income should be shown separately at age 68",
  function (this: PresentationWorld) {
    assertEqual(this.headline?.secureStartAge, "68");
    assertEqual(
      this.headline?.secureIncome,
      (this.presentationResult?.assessment.allSecureAnnualIncome ?? 0) / 12
    );
    requireCondition((this.headline?.secureIncome ?? 0) > 0);
  }
);
When(
  "chart shortfalls are projected for these ages:",
  function (this: PresentationWorld, table: DataTable) {
    this.shortfallRanges = buildChartShortfallRanges(
      table.hashes().map((row) => ({
        age: Number(row.age),
        shortfallAnnual: Number(row.shortfall),
      })),
      60
    );
  }
);
Then(
  "the chart should report two separate shortfall ranges",
  function (this: PresentationWorld) {
    assertDeepEqual(this.shortfallRanges, [
      { start: 60, end: 60 },
      { start: 67, end: 68 },
    ]);
  }
);
When(
  "chart shortfalls are projected for a household calendar timeline",
  function (this: PresentationWorld) {
    this.shortfallRanges = buildChartShortfallRanges(
      [
        { age: 59, timelineValue: 2029, shortfallAnnual: 1000 },
        { age: 60, timelineValue: 2030, shortfallAnnual: 1000 },
        { age: 61, timelineValue: 2031, shortfallAnnual: 1000 },
      ],
      2030
    );
  }
);
Then(
  "the shortfall range should use years 2030 to 2031",
  function (this: PresentationWorld) {
    assertDeepEqual(this.shortfallRanges, [{ start: 2030, end: 2031 }]);
  }
);
