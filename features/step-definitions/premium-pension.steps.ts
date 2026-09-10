import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import premiumEarlyRetirementFactorData from "../../src/data/premium_pension_reduction_factors.json";
import { OPTIONAL_SECTION_TOGGLES } from "../../src/app-domains/journeys";
import { fieldGroups } from "../../src/fieldDefinitions";
import { addYears, createProjectionTable } from "../../src/projection-core";
import {
  calculateAnnualPremiumPensionAtDate,
  calculatePremiumPension,
  type PremiumCalculationResult,
} from "../../src/projection-domains/premium";
import { defaultSettings, type PensionSettings } from "../../src/settings";

const ACCEPTANCE_DATE_OF_BIRTH = "1970-04-01";
const ACCEPTANCE_VALUATION_DATE = "2026-04-01";

type PremiumWorld = {
  cpiRate?: number;
  cpiEnabled?: boolean;
  premiumOptionalSectionLabel?: string;
  premiumGroupTitle?: string;
  premiumSchemeExplanation?: string;
  premiumFieldIds?: string[];
  pensionAtValuation?: number;
  valuationDate?: string;
  dateOfBirth?: string;
  premiumNormalPensionAge?: number;
  premiumDrawAge?: number;
  premiumCalculationResult?: PremiumCalculationResult;
  annualPremiumPensionPayable?: number;
  annualReduction?: number;
  premiumPensionAtLaterAgeBeforeIncreases?: number;
  deferredPremiumPensionAtDrawAge?: number;
  annualPremiumPensionAfterIncrease?: number;
  monthlyGrossPremiumPension?: number;
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;

  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function assertCondition(
  condition: unknown,
  message = "Expected condition to be true"
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T) {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
    );
  }
}

function assertDeepEqual(actual: unknown, expected: unknown) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${actualJson} to equal ${expectedJson}`);
  }
}

function expectMoney(actual: number | undefined, expected: number) {
  assertCondition(actual !== undefined, "Expected a monetary result");
  assertEqual(round(actual), expected);
}

function getPremiumPresentation() {
  const premiumToggle = OPTIONAL_SECTION_TOGGLES.find(
    (toggle) => toggle.key === "showPremium"
  );
  const premiumGroup = fieldGroups.find((group) => group.id === "premium");

  assertCondition(premiumToggle, "Premium optional section was not found");
  assertCondition(premiumGroup, "Premium field group was not found");

  return { premiumGroup, premiumToggle };
}

function calculatePreservedPremiumPension(world: PremiumWorld) {
  assertCondition(
    world.pensionAtValuation !== undefined,
    "Expected a Premium pension amount at valuation"
  );

  const result = calculatePremiumPension({
    annualPensionAtValuationDate: world.pensionAtValuation,
    valuationDate: world.valuationDate ?? ACCEPTANCE_VALUATION_DATE,
    dateOfBirth: world.dateOfBirth ?? ACCEPTANCE_DATE_OF_BIRTH,
    drawAge: world.premiumDrawAge ?? world.premiumNormalPensionAge ?? 60,
    normalPensionAge: world.premiumNormalPensionAge ?? 60,
    cpiAssumption: world.cpiEnabled ? (world.cpiRate ?? 0) / 100 : 0,
  });

  world.premiumCalculationResult = result;
  world.deferredPremiumPensionAtDrawAge = result.cpiRevaluedPensionAtDrawAge;
  world.annualPremiumPensionPayable = result.annualPensionPayableAtDrawAge;
  world.annualReduction =
    result.cpiRevaluedPensionAtDrawAge - result.annualPensionPayableAtDrawAge;
}

function createPremiumProjectionSettings(world: PremiumWorld): PensionSettings {
  return {
    ...defaultSettings,
    startDate: world.valuationDate ?? ACCEPTANCE_VALUATION_DATE,
    dateOfBirth: world.dateOfBirth ?? ACCEPTANCE_DATE_OF_BIRTH,
    lifeExpectancy: Math.max(
      world.premiumNormalPensionAge ?? 60,
      world.premiumDrawAge ?? 60,
      61
    ),
    showAlpha: false,
    showClassic: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: true,
    showStatePension: false,
    showSipp: false,
    showCsAvc: false,
    showIsa: false,
    showLisa: false,
    projectionBasis: world.cpiEnabled ? "nominal" : "real",
    inflationRateAnnual: world.cpiRate ?? 0,
    premiumAnnualPensionAtValuationDate: world.pensionAtValuation ?? 0,
    premiumValuationDate: world.valuationDate ?? ACCEPTANCE_VALUATION_DATE,
    premiumDrawAge: world.premiumDrawAge ?? 60,
    premiumNormalPensionAge: world.premiumNormalPensionAge ?? 60,
    premiumHasNpa65: (world.premiumNormalPensionAge ?? 60) === 65,
  };
}

Given(
  "Premium early-retirement factor tables version {string} are loaded",
  function (version: string) {
    assertEqual(
      premiumEarlyRetirementFactorData.source.workbook_version,
      version
    );
  }
);

Given("Premium early-retirement tables are:", function (table: DataTable) {
  const actual = Object.entries(
    premiumEarlyRetirementFactorData.source.tables
  ).map(([normalPensionAge, source]) => ({
    normalPensionAge,
    workbookTable: source.workbook_table,
    guidanceTable: source.guidance_table,
  }));

  assertDeepEqual(actual, table.hashes());
});

When(
  "the Premium pension input group is inspected",
  function (this: PremiumWorld) {
    const { premiumGroup, premiumToggle } = getPremiumPresentation();

    this.premiumOptionalSectionLabel = premiumToggle.label;
    this.premiumGroupTitle = premiumGroup.title;
    this.premiumSchemeExplanation = premiumGroup.description;
    this.premiumFieldIds = premiumGroup.fields.map((field) => field.id);
  }
);

Then(
  "the Premium optional-section label should be {string}",
  function (this: PremiumWorld, expected: string) {
    assertEqual(this.premiumOptionalSectionLabel, expected);
  }
);

Then(
  "the Premium field group title should be {string}",
  function (this: PremiumWorld, expected: string) {
    assertEqual(this.premiumGroupTitle, expected);
  }
);

Then(
  "the Premium field group should explain:",
  function (this: PremiumWorld, expected: string) {
    assertEqual(this.premiumSchemeExplanation, expected.trim());
  }
);

Then(
  "Premium should ask for these production fields:",
  function (this: PremiumWorld, table: DataTable) {
    assertCondition(this.premiumFieldIds, "Premium fields were not inspected");
    assertDeepEqual(
      this.premiumFieldIds.map((fieldId) => ({ fieldId })),
      table.hashes()
    );
  }
);

Then(
  "Premium should not ask for unsupported fields:",
  function (this: PremiumWorld, table: DataTable) {
    assertCondition(this.premiumFieldIds, "Premium fields were not inspected");

    for (const { fieldId } of table.hashes()) {
      assertCondition(
        !this.premiumFieldIds.includes(fieldId),
        `Unsupported Premium field "${fieldId}" is exposed`
      );
    }
  }
);

Given(
  "the member has a deferred Premium pension record",
  function (this: PremiumWorld) {
    this.premiumNormalPensionAge = 60;
  }
);

Given(
  "the member has a Premium pension in payment",
  function (this: PremiumWorld) {
    this.premiumNormalPensionAge = 60;
  }
);

Given(
  "the member has annual Premium pension of {float} at valuation",
  function (this: PremiumWorld, value: number) {
    this.pensionAtValuation = value;
  }
);

Given(
  "the Premium valuation date is {word}",
  function (this: PremiumWorld, valuationDate: string) {
    this.valuationDate = valuationDate;
  }
);

Given(
  "the Premium member date of birth is {word}",
  function (this: PremiumWorld, dateOfBirth: string) {
    this.dateOfBirth = dateOfBirth;
  }
);

Given(
  "the member has Premium normal pension age {int}",
  function (this: PremiumWorld, normalPensionAge: number) {
    this.premiumNormalPensionAge = normalPensionAge;
  }
);

Given(
  "the planned Premium draw age is {float}",
  function (this: PremiumWorld, drawAge: number) {
    this.premiumDrawAge = drawAge;
  }
);

When(
  "the preserved Premium pension is calculated",
  function (this: PremiumWorld) {
    calculatePreservedPremiumPension(this);
  }
);

When(
  "the member draws Premium pension at age {int}",
  function (this: PremiumWorld, drawAge: number) {
    this.premiumDrawAge = drawAge;
    calculatePreservedPremiumPension(this);
  }
);

When(
  "the member draws Premium pension at age {int} and {int} months",
  function (this: PremiumWorld, drawAge: number, drawAgeMonths: number) {
    this.premiumDrawAge = drawAge + drawAgeMonths / 12;
    calculatePreservedPremiumPension(this);
  }
);

Then(
  "the annual Premium pension payable should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.annualPremiumPensionPayable, expected);
  }
);

Then(
  "the Premium early-retirement factor should be {float}",
  function (this: PremiumWorld, expected: number) {
    assertCondition(
      this.premiumCalculationResult?.earlyRetirementFactor !== undefined &&
        this.premiumCalculationResult.earlyRetirementFactor !== null,
      "Expected a Premium early-retirement factor"
    );
    assertEqual(
      round(this.premiumCalculationResult.earlyRetirementFactor, 3),
      expected
    );
  }
);

Then(
  "the Premium early-retirement factor should be unavailable",
  function (this: PremiumWorld) {
    assertEqual(this.premiumCalculationResult?.earlyRetirementFactor, null);
    assertEqual(this.premiumCalculationResult?.factorUnavailable, true);
  }
);

Then(
  "the annual Premium pension payable at age {int} should be {float}",
  function (this: PremiumWorld, _age: number, expected: number) {
    expectMoney(this.annualPremiumPensionPayable, expected);
  }
);

Then(
  "the annual Premium pension payable at age {int} before pension increases should still be {float}",
  function (this: PremiumWorld, age: number, expected: number) {
    const settings = createPremiumProjectionSettings({
      ...this,
      cpiEnabled: false,
      cpiRate: 0,
    });
    const rowDate = addYears(settings.dateOfBirth, age);
    const row = createProjectionTable(settings).find(
      (candidate) => candidate.date === rowDate
    );

    assertCondition(row, `Expected a Premium projection row for ${rowDate}`);
    this.premiumPensionAtLaterAgeBeforeIncreases =
      row.annualPremiumPensionIncludingReduction;
    expectMoney(this.premiumPensionAtLaterAgeBeforeIncreases, expected);
  }
);

Then(
  "calculating Premium at age {int} should use the original early-retirement reduction",
  function (this: PremiumWorld, age: number) {
    const settings = createPremiumProjectionSettings({
      ...this,
      cpiEnabled: false,
      cpiRate: 0,
    });
    const rowDate = addYears(settings.dateOfBirth, age);
    const row = createProjectionTable(settings).find(
      (candidate) => candidate.date === rowDate
    );

    assertCondition(row, `Expected a Premium projection row for ${rowDate}`);
    assertEqual(
      row.annualPremiumPensionIncludingReduction,
      this.annualPremiumPensionPayable
    );
  }
);

Then(
  "the unreduced annual Premium pension at draw age should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.deferredPremiumPensionAtDrawAge, expected);
  }
);

Given(
  "the annual Premium pension payable is {float}",
  function (this: PremiumWorld, value: number) {
    this.annualPremiumPensionPayable = value;
  }
);

When(
  "the pension is increased for {int} year in payment",
  function (this: PremiumWorld, years: number) {
    assertCondition(this.annualPremiumPensionPayable !== undefined);
    const settings = {
      ...defaultSettings,
      showPremium: true,
      projectionBasis: this.cpiEnabled
        ? ("nominal" as const)
        : ("real" as const),
      inflationRateAnnual: this.cpiRate ?? 0,
      premiumAnnualPensionAtValuationDate: this.annualPremiumPensionPayable,
      premiumValuationDate: ACCEPTANCE_VALUATION_DATE,
    };

    this.annualPremiumPensionAfterIncrease =
      calculateAnnualPremiumPensionAtDate({
        settings,
        premiumDrawDate: ACCEPTANCE_VALUATION_DATE,
        rowDate: addYears(ACCEPTANCE_VALUATION_DATE, years),
      });
    this.monthlyGrossPremiumPension =
      this.annualPremiumPensionAfterIncrease / 12;
  }
);

Then(
  "the annual Premium pension after increase should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.annualPremiumPensionAfterIncrease, expected);
  }
);

Then(
  "the monthly gross Premium pension should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.monthlyGrossPremiumPension, expected);
  }
);
