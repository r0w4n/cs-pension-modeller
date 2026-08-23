import { Given, Then, When } from "@cucumber/cucumber";
import { fieldGroups } from "../../src/fieldDefinitions";
import {
  applyBridgeJourneyDefaults,
  applySimpleJourneyDefaults,
  JOURNEY_DEFINITIONS,
} from "../../src/app-domains";
import {
  createRetirementIncomeChartLimits,
  createRetirementIncomeSeries,
} from "../../src/result-projection/retirement-income";
import {
  calculateTargetBasedWithdrawalPreview,
  type TargetBasedWithdrawalPreview,
} from "../../src/calculation/target-based-withdrawal-previews";
import {
  getFlexibleWithdrawalNonPriorityAccounts,
  getFlexibleWithdrawalPriorityAccounts,
  reorderFlexibleWithdrawalAccounts,
  shouldShowFlexibleWithdrawalPriority,
  summarizeFlexibleWithdrawalInsights,
} from "../../src/result-projection/flexible-withdrawals";
import {
  createProjectionTable,
  type ProjectionRow,
} from "../../src/projection";
import {
  createDefaultAdditionalGuaranteedIncome,
  createDefaultSettings,
  getStoredSettingsSnapshot,
  parseStoredSettings,
  type PensionSettings,
} from "../../src/settings";

type FlexibleWithdrawalWorld = {
  settings?: PensionSettings;
  rows?: ProjectionRow[];
  chartSeries?: ReturnType<typeof createRetirementIncomeSeries>;
  chartLimits?: ReturnType<typeof createRetirementIncomeChartLimits>;
  restoredSettings?: PensionSettings;
  selectors?: Array<{ options?: readonly { value: string; label: string }[] }>;
  targetBasedPreview?: TargetBasedWithdrawalPreview;
};

When(
  "the retirement income chart limits are prepared",
  function (this: FlexibleWithdrawalWorld) {
    this.chartLimits = createRetirementIncomeChartLimits(getSettings(this));
  }
);

Then(
  "the ISA and SIPP contribution drag controls should have a monthly maximum of {float}",
  function (this: FlexibleWithdrawalWorld, expected: number) {
    assertCondition(this.chartLimits);
    assertEqual(this.chartLimits.isaMonthlyContribution.max, expected);
    assertEqual(this.chartLimits.sippMonthlyContribution.max, expected);
  }
);

Given(
  "a target-based flexible withdrawal scenario",
  function (this: FlexibleWithdrawalWorld) {
    this.settings = createScenarioSettings();
  }
);

When(
  "the expert flexible-account withdrawal selectors are inspected",
  function (this: FlexibleWithdrawalWorld) {
    const strategyIds = new Set([
      "sippWithdrawalStrategy",
      "csAvcWithdrawalStrategy",
      "isaWithdrawalStrategy",
      "lisaWithdrawalStrategy",
    ]);
    this.selectors = fieldGroups
      .flatMap((group) => group.fields)
      .filter((field) => strategyIds.has(field.id))
      .map((field) => ("options" in field ? field : {}));
  }
);

Then(
  "each selector should offer {string}",
  function (this: FlexibleWithdrawalWorld, label: string) {
    assertCondition(this.selectors?.length === 4);
    assertCondition(
      this.selectors.every((selector) =>
        selector.options?.some((option) => option.label === label)
      )
    );
  }
);

Then(
  "each selector should retain the three existing withdrawal strategies",
  function (this: FlexibleWithdrawalWorld) {
    const legacyValues = ["zero_at_death", "percentage", "use_by_age"];
    assertCondition(
      this.selectors?.every((selector) =>
        legacyValues.every((value) =>
          selector.options?.some((option) => option.value === value)
        )
      )
    );
  }
);

Then(
  "the funding priority should belong to the expert target and bridge withdrawal-plan sections",
  function () {
    const targetSteps = [
      JOURNEY_DEFINITIONS.find(
        (journey) => journey.id === "expert-journey"
      )?.steps.find((step) => step.id === "expert-retirement-target"),
      JOURNEY_DEFINITIONS.find(
        (journey) => journey.id === "early-retirement-bridge"
      )?.steps.find((step) => step.id === "bridge-strategy"),
    ];

    assertCondition(
      targetSteps.every(
        (step) =>
          step?.kind === "fields" &&
          step.showFlexibleWithdrawalPriority === true
      )
    );
  }
);

Then(
  "the funding priority should not belong to simplified sections",
  function () {
    const simpleJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "simple-early-retirement"
    );

    assertCondition(
      simpleJourney?.steps.every(
        (step) =>
          step.kind !== "fields" ||
          !("showFlexibleWithdrawalPriority" in step) ||
          step.showFlexibleWithdrawalPriority !== true
      )
    );
  }
);

Then(
  "the funding priority should not belong to an expert account withdrawal section",
  function () {
    const accountSteps = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "expert-journey"
    )?.steps.filter(
      (step) => step.id === "expert-sipp" || step.id === "expert-isa"
    );

    assertCondition(
      accountSteps?.every(
        (step) =>
          step.kind !== "fields" || step.showFlexibleWithdrawalPriority !== true
      )
    );
  }
);

Given(
  "Go-Go, Slow-Go, No-Go spending is enabled with only a SIPP included",
  function (this: FlexibleWithdrawalWorld) {
    Object.assign(getSettings(this), {
      spendingStrategyType: "SPENDING_SMILE",
      showSipp: true,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
      sippWithdrawalStrategy: "use_by_age",
    });
  }
);

Then(
  "the funding priority should remain available",
  function (this: FlexibleWithdrawalWorld) {
    assertCondition(shouldShowFlexibleWithdrawalPriority(getSettings(this)));
  }
);

Then(
  "the target-based priority should be empty",
  function (this: FlexibleWithdrawalWorld) {
    const accounts = getFlexibleWithdrawalPriorityAccounts(getSettings(this));
    assertEqual(accounts.length, 0);
  }
);

When(
  "SIPP changes to the use-by-age strategy",
  function (this: FlexibleWithdrawalWorld) {
    getSettings(this).sippWithdrawalStrategy = "use_by_age";
  }
);

When(
  "ISA changes to the annual-percentage strategy",
  function (this: FlexibleWithdrawalWorld) {
    getSettings(this).isaWithdrawalStrategy = "percentage";
  }
);

Then(
  "the target-based priority should include only ISA",
  function (this: FlexibleWithdrawalWorld) {
    const accounts = getFlexibleWithdrawalPriorityAccounts(getSettings(this));
    assertEqual(accounts.length, 1);
    assertEqual(accounts[0], "isa");
  }
);

Then(
  "the other-strategy accounts should include only SIPP",
  function (this: FlexibleWithdrawalWorld) {
    const accounts = getFlexibleWithdrawalNonPriorityAccounts(
      getSettings(this)
    );
    assertEqual(accounts.length, 1);
    assertEqual(accounts[0], "sipp");
  }
);

Then(
  "the other-strategy accounts should include SIPP and ISA",
  function (this: FlexibleWithdrawalWorld) {
    const accounts = getFlexibleWithdrawalNonPriorityAccounts(
      getSettings(this)
    );
    assertEqual(accounts.length, 2);
    assertCondition(accounts.includes("sipp"));
    assertCondition(accounts.includes("isa"));
  }
);

Then(
  "the simplified journey should not expose flexible withdrawal strategy controls",
  function () {
    const strategyFieldIds = new Set([
      "sippWithdrawalStrategy",
      "csAvcWithdrawalStrategy",
      "isaWithdrawalStrategy",
      "lisaWithdrawalStrategy",
    ]);
    const simpleFieldIds =
      JOURNEY_DEFINITIONS.find(
        (journey) => journey.id === "simple-early-retirement"
      )?.steps.flatMap((step) =>
        step.kind === "fields" ? step.fieldIds : []
      ) ?? [];

    assertCondition(
      simpleFieldIds.every((fieldId) => !strategyFieldIds.has(fieldId))
    );
  }
);

Then(
  "the bridge withdrawal-plan step should expose flexible withdrawal strategy controls",
  function () {
    const targetStep = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "early-retirement-bridge"
    )?.steps.find((step) => step.id === "bridge-strategy");

    assertCondition(
      targetStep?.kind === "fields" &&
        targetStep.showFlexibleWithdrawalPriority === true
    );
  }
);

Then(
  "simplified journey settings should store legacy withdrawal strategies",
  function (this: FlexibleWithdrawalWorld) {
    const simplifiedSettings = applySimpleJourneyDefaults({
      ...getSettings(this),
      sippWithdrawalStrategy: "meet_income_target",
      csAvcWithdrawalStrategy: "meet_income_target",
      isaWithdrawalStrategy: "meet_income_target",
      lisaWithdrawalStrategy: "meet_income_target",
    });

    assertCondition(
      [
        simplifiedSettings.sippWithdrawalStrategy,
        simplifiedSettings.csAvcWithdrawalStrategy,
        simplifiedSettings.isaWithdrawalStrategy,
        simplifiedSettings.lisaWithdrawalStrategy,
      ].every((strategy) => strategy !== "meet_income_target")
    );
  }
);

Then(
  "bridge journey settings should store legacy withdrawal strategies",
  function (this: FlexibleWithdrawalWorld) {
    const bridgeSettings = applyBridgeJourneyDefaults({
      ...getSettings(this),
      sippWithdrawalStrategy: "meet_income_target",
      csAvcWithdrawalStrategy: "meet_income_target",
      isaWithdrawalStrategy: "meet_income_target",
      lisaWithdrawalStrategy: "meet_income_target",
    });

    assertCondition(
      [
        bridgeSettings.sippWithdrawalStrategy,
        bridgeSettings.csAvcWithdrawalStrategy,
        bridgeSettings.isaWithdrawalStrategy,
        bridgeSettings.lisaWithdrawalStrategy,
      ].every((strategy) => strategy !== "meet_income_target")
    );
  }
);

Given(
  /the (?:flat )?annual income target is ([\d.]+)/,
  function (this: FlexibleWithdrawalWorld, amount: string) {
    const settings = getSettings(this);
    settings.desiredRetirementIncome = Number(amount);
    settings.spendingStrategyType = "FLAT";
  }
);

Given(
  "the annual income target is phase-adjusted from {float} to {float} at age {int}",
  function (
    this: FlexibleWithdrawalWorld,
    initialTarget: number,
    laterTarget: number,
    age: number
  ) {
    const settings = getSettings(this);
    settings.desiredRetirementIncome = initialTarget;
    settings.spendingStrategyType = "SPENDING_SMILE";
    settings.lifeExpectancy = age + 1;
    settings.spendingSmile = {
      goGoPercentage: 100,
      slowGoStartAge: age,
      slowGoPercentage: (laterTarget / initialTarget) * 100,
      noGoStartAge: age + 1,
      noGoPercentage: 40,
    };
  }
);

Given(
  "an ISA with {float} uses the target-based strategy",
  function (this: FlexibleWithdrawalWorld, balance: number) {
    Object.assign(getSettings(this), {
      showIsa: true,
      isaCurrentPot: balance,
      isaWithdrawalStrategy: "meet_income_target",
    });
  }
);

Given(
  "a SIPP with {float} uses the target-based strategy",
  function (this: FlexibleWithdrawalWorld, balance: number) {
    Object.assign(getSettings(this), {
      showSipp: true,
      sippCurrentPot: balance,
      sippWithdrawalStrategy: "meet_income_target",
    });
  }
);

Given(
  "a LISA with {float} uses the target-based strategy from age {int}",
  function (this: FlexibleWithdrawalWorld, balance: number, age: number) {
    Object.assign(getSettings(this), {
      showLisa: true,
      lisaCurrentPot: balance,
      lisaDrawAge: age,
      lisaWithdrawalStrategy: "meet_income_target",
    });
  }
);

Given(
  /monthly (SIPP|LISA) contributions are ([\d.]+)/,
  function (
    this: FlexibleWithdrawalWorld,
    accountLabel: string,
    amount: string
  ) {
    if (accountLabel === "SIPP") {
      getSettings(this).sippMonthlyContribution = Number(amount);
      return;
    }

    getSettings(this).lisaMonthlyContribution = Number(amount);
  }
);

Given(
  "a target-based SIPP hands over to a LISA",
  function (this: FlexibleWithdrawalWorld) {
    Object.assign(getSettings(this), {
      desiredRetirementIncome: 12000,
      showSipp: true,
      sippCurrentPot: 1500,
      sippMonthlyContribution: 0,
      sippDrawAge: 61,
      sippWithdrawalStrategy: "meet_income_target",
      showLisa: true,
      lisaCurrentPot: 5000,
      lisaMonthlyContribution: 0,
      lisaDrawAge: 61,
      lisaWithdrawalStrategy: "meet_income_target",
      flexibleWithdrawalPriority: ["sipp", "lisa", "isa", "csAvc"],
    });
  }
);

When(
  "the retirement income chart series is prepared",
  function (this: FlexibleWithdrawalWorld) {
    const settings = getSettings(this);
    this.rows = createProjectionTable(settings);
    this.chartSeries = createRetirementIncomeSeries(this.rows, settings);
  }
);

Then(
  "flexible funding should not exceed the active income target during the handover",
  function (this: FlexibleWithdrawalWorld) {
    const settings = getSettings(this);
    const retirementPoints = this.chartSeries?.filter(
      (point) =>
        point.age >= settings.requirementAge &&
        point.age < settings.requirementAge + 0.25
    );

    assertCondition(retirementPoints?.length);
    assertCondition(
      retirementPoints.every(
        (point) => point.totalIncomeAnnual <= point.targetIncomeAnnual + 0.01
      )
    );
  }
);

Given(
  /(.+) is before (.+) in the target-based priority/,
  function (
    this: FlexibleWithdrawalWorld,
    firstLabel: string,
    secondLabel: string
  ) {
    const settings = getSettings(this);
    const first = accountIdFromLabel(firstLabel);
    const second = accountIdFromLabel(secondLabel);
    settings.flexibleWithdrawalPriority = [
      first,
      second,
      ...settings.flexibleWithdrawalPriority.filter(
        (accountId) => accountId !== first && accountId !== second
      ),
    ];
  }
);

When(
  /(.+) is moved to target-based priority (\d+)/,
  function (
    this: FlexibleWithdrawalWorld,
    accountLabel: string,
    priority: string
  ) {
    const settings = getSettings(this);
    settings.flexibleWithdrawalPriority = [
      ...reorderFlexibleWithdrawalAccounts(
        settings.flexibleWithdrawalPriority,
        accountIdFromLabel(accountLabel),
        Number(priority)
      ),
    ];
  }
);

Given(
  "Income Tax applies with no Personal Allowance",
  function (this: FlexibleWithdrawalWorld) {
    Object.assign(getSettings(this), {
      taxationEnabled: true,
      taxPersonalAllowance: 0,
      taxPersonalAllowanceTaperThreshold: 200_000,
      taxBasicRateLimit: 100_000,
      taxAdditionalRateThreshold: 200_000,
      taxBasicRatePercent: 20,
      taxHigherRatePercent: 40,
      taxAdditionalRatePercent: 45,
      taxSippTaxFreeWithdrawalPercent: 25,
    });
  }
);

Given(
  "the income target is after estimated tax",
  function (this: FlexibleWithdrawalWorld) {
    getSettings(this).retirementIncomeTargetBasis = "after_tax";
  }
);

Given(
  "guaranteed annual net income is {float}",
  function (this: FlexibleWithdrawalWorld, amount: number) {
    const income = createDefaultAdditionalGuaranteedIncome(61);
    Object.assign(income, {
      id: "guaranteed-income",
      annualAmount: amount,
      taxable: false,
    });
    Object.assign(getSettings(this), {
      showAdditionalGuaranteedIncome: true,
      additionalGuaranteedIncomes: [income],
    });
  }
);

Given(
  "an ISA explicitly withdraws {float} per year",
  function (this: FlexibleWithdrawalWorld, amount: number) {
    Object.assign(getSettings(this), {
      showIsa: true,
      isaCurrentPot: amount * 10,
      isaWithdrawalStrategy: "percentage",
      isaWithdrawalPercent: 10,
    });
  }
);

When(
  "the flexible withdrawal projection is calculated",
  function (this: FlexibleWithdrawalWorld) {
    this.rows = createProjectionTable(getSettings(this));
  }
);

When(
  "target-based ISA withdrawals are previewed",
  function (this: FlexibleWithdrawalWorld) {
    const settings = getSettings(this);
    const rows = createProjectionTable(settings);
    this.targetBasedPreview = calculateTargetBasedWithdrawalPreview({
      accountId: "isa",
      currentRows: rows,
      settings,
    });
  }
);

When(
  "the flexible withdrawal settings are exported and parsed",
  function (this: FlexibleWithdrawalWorld) {
    this.restoredSettings =
      parseStoredSettings(getStoredSettingsSnapshot(getSettings(this))) ??
      undefined;
  }
);

Then(
  /annual (ISA|SIPP|LISA) withdrawals at retirement should be ([\d.]+)/,
  function (
    this: FlexibleWithdrawalWorld,
    accountLabel: string,
    expected: string
  ) {
    assertClose(
      getAnnualWithdrawal(getRetirementRow(this), accountLabel),
      Number(expected)
    );
  }
);

Then(
  /annual ISA withdrawals at age (\d+) should be ([\d.]+)/,
  function (this: FlexibleWithdrawalWorld, age: string, expected: string) {
    const row = getRows(this).find(
      (candidate) => candidate.age === Number(age) && candidate.ageMonths === 0
    );
    assertCondition(row);
    assertClose(row.monthlyIsaPension * 12, Number(expected));
  }
);

Then(
  "annual net income at retirement should be {float}",
  function (this: FlexibleWithdrawalWorld, expected: number) {
    assertClose(getRetirementRow(this).totalMonthlyNetIncome * 12, expected);
  }
);

Then(
  "gross annual SIPP withdrawals should be higher than {float}",
  function (this: FlexibleWithdrawalWorld, amount: number) {
    assertCondition(getRetirementRow(this).monthlySippPension * 12 > amount);
  }
);

Then(
  "avoidable flexible-fund surplus at retirement should be {float}",
  function (this: FlexibleWithdrawalWorld, expected: number) {
    assertClose(
      (getRetirementRow(this).monthlyAvoidableFlexibleSurplus ?? 0) * 12,
      expected
    );
  }
);

Then(
  "unavoidable surplus at retirement should be {float}",
  function (this: FlexibleWithdrawalWorld, expected: number) {
    assertClose(
      (getRetirementRow(this).monthlyUnavoidableSurplus ?? 0) * 12,
      expected
    );
  }
);

Then(
  "the annual ISA withdrawal identified as reducible should be {float}",
  function (this: FlexibleWithdrawalWorld, expected: number) {
    assertClose(
      (getRetirementRow(this).monthlyReducibleFlexibleWithdrawals?.isa.gross ??
        0) * 12,
      expected
    );
  }
);

Then(
  "no flexible withdrawal should be identified as reducible",
  function (this: FlexibleWithdrawalWorld) {
    const insights = getRetirementRow(this).monthlyReducibleFlexibleWithdrawals;
    assertCondition(
      !insights ||
        Object.values(insights).every((insight) => insight.gross === 0)
    );
  }
);

Then(
  /(.+) should be identified as potential over-saving/,
  function (this: FlexibleWithdrawalWorld, accountLabel: string) {
    const summary = summarizeFlexibleWithdrawalInsights(
      getRows(this),
      getSettings(this)
    );
    assertCondition(
      summary.residualAccounts.some(
        (account) => account.accountId === accountIdFromLabel(accountLabel)
      )
    );
  }
);

Then(
  "the ISA strategy should remain Annual percentage",
  function (this: FlexibleWithdrawalWorld) {
    assertEqual(getSettings(this).isaWithdrawalStrategy, "percentage");
  }
);

Then(
  "the preview should reduce ISA withdrawals",
  function (this: FlexibleWithdrawalWorld) {
    assertCondition(this.targetBasedPreview);
    assertCondition(
      this.targetBasedPreview.targetBasedGrossWithdrawals <
        this.targetBasedPreview.currentGrossWithdrawals
    );
  }
);

Then(
  "the preview should reduce unallocated surplus",
  function (this: FlexibleWithdrawalWorld) {
    assertCondition(this.targetBasedPreview);
    assertCondition(
      this.targetBasedPreview.targetBasedUnallocatedSurplus <
        this.targetBasedPreview.currentUnallocatedSurplus
    );
  }
);

Then(
  /(.+) should (?:remain|be) before (.+) in the target-based priority/,
  function (
    this: FlexibleWithdrawalWorld,
    firstLabel: string,
    secondLabel: string
  ) {
    const priority = getSettings(this).flexibleWithdrawalPriority;
    assertCondition(
      priority.indexOf(accountIdFromLabel(firstLabel)) <
        priority.indexOf(accountIdFromLabel(secondLabel))
    );
  }
);

Then(
  "the restored ISA strategy should be target-based",
  function (this: FlexibleWithdrawalWorld) {
    assertEqual(
      this.restoredSettings?.isaWithdrawalStrategy,
      "meet_income_target"
    );
  }
);

function createScenarioSettings(): PensionSettings {
  return {
    ...createDefaultSettings(),
    startDate: "2026-01-01",
    dateOfBirth: "1966-01-01",
    requirementAge: 61,
    lifeExpectancy: 62,
    projectionBasis: "real",
    inflationRateAnnual: 0,
    desiredRetirementIncome: 0,
    showAlpha: false,
    showClassic: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: false,
    showStatePension: false,
    showSipp: false,
    showCsAvc: false,
    showIsa: false,
    showLisa: false,
    showAdditionalGuaranteedIncome: false,
    additionalGuaranteedIncomes: [],
    taxationEnabled: false,
    sippDrawAge: 61,
    sippRealInterestPercent: 0,
    csAvcDrawAge: 61,
    csAvcRealInterestPercent: 0,
    isaDrawAge: 61,
    isaRealInterestPercent: 0,
    lisaDrawAge: 61,
    lisaRealInterestPercent: 0,
  };
}

function getSettings(world: FlexibleWithdrawalWorld) {
  if (!world.settings) {
    world.settings = createScenarioSettings();
  }

  return world.settings;
}

function getRows(world: FlexibleWithdrawalWorld) {
  assertCondition(world.rows);
  return world.rows;
}

function getRetirementRow(world: FlexibleWithdrawalWorld) {
  const row = getRows(world).find(
    (candidate) => candidate.date === "2027-01-01"
  );
  assertCondition(row);
  return row;
}

function getAnnualWithdrawal(row: ProjectionRow, accountLabel: string) {
  if (accountLabel === "ISA") {
    return row.monthlyIsaPension * 12;
  }
  if (accountLabel === "LISA") {
    return row.monthlyLisaPension * 12;
  }
  return row.monthlySippPension * 12;
}

function accountIdFromLabel(label: string) {
  const normalized = label.trim().toUpperCase();

  if (normalized === "ISA") return "isa" as const;
  if (normalized === "LISA") return "lisa" as const;
  if (normalized === "SIPP") return "sipp" as const;
  return "csAvc" as const;
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

function assertClose(actual: number, expected: number, precision = 2) {
  const tolerance = 0.5 * 10 ** -precision;

  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${actual} to be close to ${expected}`);
  }
}
