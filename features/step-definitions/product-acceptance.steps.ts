import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import {
  applyBridgeJourneyDefaults,
  JOURNEY_DEFINITIONS,
  type JourneyDefinition,
  type JourneyStepDefinition,
} from "../../src/app-domains/journeys";
import {
  buildComparisonTableRows,
  createComparisonResult,
  type ComparisonResult,
  type ComparisonTableRow,
} from "../../src/app-domains/comparison";
import {
  loadAcknowledgementState,
  loadStoredAppMode,
  loadStoredComparisonRetirementIncomeDisplay,
  loadStoredGuidanceNotes,
  loadStoredJourneyRetirementIncomeDisplay,
  saveAcknowledgementState,
  saveStoredComparisonRetirementIncomeDisplay,
  saveStoredJourneyRetirementIncomeDisplay,
  type RetirementIncomeDisplay,
} from "../../src/app/app-persistence";
import { applyBridgeChartParameterPatch } from "../../src/app/chart-state";
import {
  calculateAnnualIncomeTax,
  calculateAnnualStatePensionAtDraw,
  calculateMonthlyIncomeTax,
  calculateMonthlyStatePension,
  calculateStatePensionDeferralIncreasePercent,
  createProjectionTable,
  generatePensionSummary,
  generateRetirementBridgeAnalysis,
  prepareBridgeProjectionSettings,
} from "../../src/projection";
import {
  createDefaultSettings,
  saveLocalStoragePreference,
  type PensionSettings,
} from "../../src/settings";

type ProductAcceptanceWorld = {
  precision?: number;
  settings?: PensionSettings;
  annualStatePensionAtDraw?: number;
  statePensionDeferralUplift?: number;
  monthlyStatePensionBeforeStart?: number;
  monthlyStatePensionFromStart?: number;
  monthlyAlphaPension?: number;
  monthlyNuvosPension?: number;
  monthlyStatePension?: number;
  monthlySippPension?: number;
  annualTaxableIncome?: number;
  annualIncomeTax?: number;
  monthlyIncomeTax?: number;
  bridgeAnalysis?: ReturnType<typeof generateRetirementBridgeAnalysis>;
  bridgeSummary?: ReturnType<typeof generatePensionSummary>;
  bridgeFundingNeedBeforeGuaranteedIncome?: number;
  comparisonResults?: ComparisonResult[];
  comparisonRows?: ComparisonTableRow[];
  selectedJourney?: JourneyDefinition;
  acknowledgementLoaded?: boolean;
  appModeLoaded?: ReturnType<typeof loadStoredAppMode>;
  guidanceNotesLoaded?: boolean;
};

type MemoryStorage = Storage & {
  snapshot: () => Record<string, string>;
};

type JourneyAnswerStep = JourneyStepDefinition & {
  kind: "bridge-answer" | "expert-answer";
};

function parseMoney(value: string | number) {
  return Number(value);
}

function parseOnOff(value: string) {
  return value === "on";
}

function roundMoney(value: number, precision = 2) {
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

function expectMoney(
  actual: number | undefined,
  expected: string | number,
  precision = 2
) {
  assertCondition(actual !== undefined, "Expected a monetary result");
  assertEqual(roundMoney(actual, precision), parseMoney(expected));
}

function getSettings(world: ProductAcceptanceWorld) {
  if (!world.settings) {
    world.settings = createDefaultSettings();
  }

  return world.settings;
}

function updateSettings(
  world: ProductAcceptanceWorld,
  updates: Partial<PensionSettings>
) {
  world.settings = {
    ...getSettings(world),
    ...updates,
  };
}

function analyseBridgePlan(world: ProductAcceptanceWorld) {
  const bridgeSettings = prepareBridgeProjectionSettings(getSettings(world));
  const pensionRows = createProjectionTable({
    ...bridgeSettings,
    showSipp: false,
    showIsa: false,
    showLisa: false,
  });

  world.settings = bridgeSettings;
  world.bridgeSummary = generatePensionSummary(pensionRows, bridgeSettings);
  world.bridgeAnalysis = generateRetirementBridgeAnalysis(
    pensionRows,
    bridgeSettings
  );
}

function getBridgeAnalysis(world: ProductAcceptanceWorld) {
  assertCondition(world.bridgeAnalysis, "Bridge analysis has not been run");

  return world.bridgeAnalysis;
}

function getComparisonRow(world: ProductAcceptanceWorld, metric: string) {
  const row = world.comparisonRows?.find(
    (candidate) => candidate.metric === metric
  );

  assertCondition(row, `Comparison metric "${metric}" was not found`);

  return row;
}

function nodeText(value: unknown) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  if (value === null || value === undefined) {
    return "";
  }

  return "";
}

function createMemoryStorage(): MemoryStorage {
  const values = new Map<string, string>();
  const localStorage: MemoryStorage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    snapshot() {
      return Object.fromEntries(values.entries());
    },
  };

  return localStorage;
}

function installLocalStorage() {
  const localStorage = createMemoryStorage();
  const testGlobal = globalThis as typeof globalThis & {
    window?: { localStorage: Storage };
  };

  Object.defineProperty(testGlobal, "window", {
    configurable: true,
    value: { localStorage },
  });

  return localStorage;
}

Given(
  "State Pension outputs are rounded to {int} decimal places",
  function (this: ProductAcceptanceWorld, precision: number) {
    this.precision = precision;
  }
);

Given(
  "Income Tax outputs are rounded to {int} decimal places",
  function (this: ProductAcceptanceWorld, precision: number) {
    this.precision = precision;
  }
);

Given(
  "bridge analysis outputs are rounded to {int} decimal places",
  function (this: ProductAcceptanceWorld, precision: number) {
    this.precision = precision;
  }
);

Given(
  "comparison result outputs are rounded to {int} decimal places",
  function (this: ProductAcceptanceWorld, precision: number) {
    this.precision = precision;
  }
);

Given(
  "the State Pension forecast is {float} per year",
  function (this: ProductAcceptanceWorld, amount: number) {
    updateSettings(this, {
      showStatePension: true,
      currentStatePension: amount,
    });
  }
);

Given(
  "the modelling start date is {word}",
  function (this: ProductAcceptanceWorld, startDate: string) {
    updateSettings(this, { startDate });
  }
);

Given(
  "the State Pension start date is {word}",
  function (this: ProductAcceptanceWorld, statePensionDrawDate: string) {
    updateSettings(this, { statePensionDrawDate });
  }
);

Given(
  "the State Pension projection basis is {string}",
  function (
    this: ProductAcceptanceWorld,
    projectionBasis: PensionSettings["projectionBasis"]
  ) {
    updateSettings(this, { projectionBasis });
  }
);

Given(
  "State Pension CPI growth is {float}%",
  function (this: ProductAcceptanceWorld, statePensionCpiPercent: number) {
    updateSettings(this, { statePensionCpiPercent });
  }
);

Given(
  "State Pension earnings growth is {float}%",
  function (
    this: ProductAcceptanceWorld,
    statePensionWageGrowthPercent: number
  ) {
    updateSettings(this, { statePensionWageGrowthPercent });
  }
);

Given(
  "future State Pension growth is {word}",
  function (this: ProductAcceptanceWorld, enabled: string) {
    updateSettings(this, {
      statePensionApplyFutureGrowth: parseOnOff(enabled),
    });
  }
);

Given(
  "the long-term inflation assumption is {float}%",
  function (this: ProductAcceptanceWorld, inflationRateAnnual: number) {
    updateSettings(this, { inflationRateAnnual });
  }
);

Given(
  "the member date of birth is {word}",
  function (this: ProductAcceptanceWorld, dateOfBirth: string) {
    updateSettings(this, { dateOfBirth });
  }
);

When(
  "the State Pension at the chosen start date is calculated",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);

    this.annualStatePensionAtDraw = calculateAnnualStatePensionAtDraw(settings);
    this.statePensionDeferralUplift =
      calculateStatePensionDeferralIncreasePercent(
        settings.dateOfBirth,
        settings.statePensionDrawDate
      );
  }
);

When(
  "the model checks State Pension income around the start date",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);

    this.monthlyStatePensionBeforeStart = calculateMonthlyStatePension(
      "2055-06-14",
      settings.statePensionDrawDate,
      settings.currentStatePension
    );
    this.monthlyStatePensionFromStart = calculateMonthlyStatePension(
      settings.statePensionDrawDate,
      settings.statePensionDrawDate,
      settings.currentStatePension
    );
  }
);

Then(
  "the annual State Pension at the chosen start date should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(this.annualStatePensionAtDraw, expected, this.precision);
  }
);

Then(
  "the State Pension deferral uplift should be {float}%",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(this.statePensionDeferralUplift, expected, this.precision);
  }
);

Then(
  "the monthly State Pension before the start date should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(this.monthlyStatePensionBeforeStart, expected, this.precision);
  }
);

Then(
  "the monthly State Pension from the start date should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(this.monthlyStatePensionFromStart, expected, this.precision);
  }
);

Given(
  "Income Tax modelling is {word}",
  function (this: ProductAcceptanceWorld, enabled: string) {
    updateSettings(this, { taxationEnabled: enabled === "on" });
  }
);

Given(
  "monthly Alpha pension income is {float}",
  function (this: ProductAcceptanceWorld, amount: number) {
    this.monthlyAlphaPension = amount;
  }
);

Given(
  "monthly nuvos pension income is {float}",
  function (this: ProductAcceptanceWorld, amount: number) {
    this.monthlyNuvosPension = amount;
  }
);

Given(
  "monthly State Pension income is {float}",
  function (this: ProductAcceptanceWorld, amount: number) {
    this.monthlyStatePension = amount;
  }
);

Given(
  "monthly SIPP income is {float}",
  function (this: ProductAcceptanceWorld, amount: number) {
    this.monthlySippPension = amount;
  }
);

Given(
  "the SIPP tax-free withdrawal share is {float}%",
  function (this: ProductAcceptanceWorld, taxFreeShare: number) {
    updateSettings(this, { taxSippTaxFreeWithdrawalPercent: taxFreeShare });
  }
);

Given(
  "the personal allowance is {float}",
  function (this: ProductAcceptanceWorld, taxPersonalAllowance: number) {
    updateSettings(this, { taxPersonalAllowance });
  }
);

Given(
  "the basic rate band is {float}",
  function (this: ProductAcceptanceWorld, taxBasicRateLimit: number) {
    updateSettings(this, { taxBasicRateLimit });
  }
);

When(
  "annual taxable retirement income of {float} is taxed",
  function (this: ProductAcceptanceWorld, annualTaxableIncome: number) {
    this.annualTaxableIncome = annualTaxableIncome;
    this.annualIncomeTax = calculateAnnualIncomeTax(
      getSettings(this),
      annualTaxableIncome
    );
  }
);

When(
  "monthly Income Tax is calculated",
  function (this: ProductAcceptanceWorld) {
    this.monthlyIncomeTax = calculateMonthlyIncomeTax({
      settings: getSettings(this),
      monthlyAlphaPension: this.monthlyAlphaPension ?? 0,
      monthlyNuvosPension: this.monthlyNuvosPension ?? 0,
      monthlyStatePension: this.monthlyStatePension ?? 0,
      monthlySippPension: this.monthlySippPension ?? 0,
    });
  }
);

Then(
  "the annual Income Tax should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(this.annualIncomeTax, expected, this.precision);
  }
);

Then(
  "the monthly Income Tax should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(this.monthlyIncomeTax, expected, this.precision);
  }
);

Given(
  "the bridge plan has no Civil Service pension",
  function (this: ProductAcceptanceWorld) {
    updateSettings(this, {
      startDate: "2026-04-01",
      dateOfBirth: "1980-04-01",
      showAlpha: false,
      showClassic: false,
      showClassicPlus: false,
      showNuvos: false,
      showPremium: false,
    });
  }
);

Given(
  "the bridge plan has no State Pension",
  function (this: ProductAcceptanceWorld) {
    updateSettings(this, { showStatePension: false });
  }
);

Given(
  "the bridge plan includes State Pension of {float} per year from {word}",
  function (
    this: ProductAcceptanceWorld,
    currentStatePension: number,
    statePensionDrawDate: string
  ) {
    updateSettings(this, {
      dateOfBirth: "1960-04-01",
      showStatePension: true,
      currentStatePension,
      statePensionDrawDate,
    });
  }
);

Given(
  "the bridge plan has an ISA balance of {float}",
  function (this: ProductAcceptanceWorld, isaCurrentPot: number) {
    updateSettings(this, {
      showIsa: true,
      isaCurrentPot,
      isaMonthlyContribution: 0,
      isaWithdrawalStrategy: "use_by_age",
    });
  }
);

Given(
  "the bridge plan has a SIPP balance of {float}",
  function (this: ProductAcceptanceWorld, sippCurrentPot: number) {
    updateSettings(this, {
      showSipp: true,
      sippCurrentPot,
      sippMonthlyContribution: 0,
      sippDrawAge: 57,
      sippWithdrawalStrategy: "use_by_age",
    });
  }
);

Given(
  "the bridge retirement age is {float}",
  function (this: ProductAcceptanceWorld, requirementAge: number) {
    updateSettings(this, { requirementAge });
  }
);

Given(
  "the bridge Alpha draw age is {float}",
  function (this: ProductAcceptanceWorld, alphaPensionDrawAge: number) {
    updateSettings(this, {
      showAlpha: true,
      alphaPensionDrawAge,
    });
  }
);

When(
  "the bridge target retirement age is changed to {float}",
  function (this: ProductAcceptanceWorld, retirementAge: number) {
    this.settings = applyBridgeChartParameterPatch(getSettings(this), {
      retirementAge,
    });
  }
);

Then(
  "the bridge retirement age should be {float}",
  function (this: ProductAcceptanceWorld, expectedAge: number) {
    assertCondition(
      getSettings(this).requirementAge === expectedAge,
      `Expected bridge retirement age ${expectedAge}, received ${getSettings(this).requirementAge}.`
    );
  }
);

Then(
  "the bridge Alpha draw age should be {float}",
  function (this: ProductAcceptanceWorld, expectedAge: number) {
    assertCondition(
      getSettings(this).alphaPensionDrawAge === expectedAge,
      `Expected bridge Alpha draw age ${expectedAge}, received ${getSettings(this).alphaPensionDrawAge}.`
    );
  }
);

Given(
  "the bridge life expectancy age is {float}",
  function (this: ProductAcceptanceWorld, lifeExpectancy: number) {
    updateSettings(this, { lifeExpectancy });
  }
);

Given(
  "the bridge target income is {float} per year",
  function (this: ProductAcceptanceWorld, desiredRetirementIncome: number) {
    updateSettings(this, { desiredRetirementIncome });
  }
);

When("the bridge plan is analysed", function (this: ProductAcceptanceWorld) {
  analyseBridgePlan(this);
});

When(
  "the same bridge plan adds guaranteed income of {float} per year from age {float}",
  function (
    this: ProductAcceptanceWorld,
    annualAmount: number,
    startAge: number
  ) {
    const previousAnalysis = getBridgeAnalysis(this);
    this.bridgeFundingNeedBeforeGuaranteedIncome =
      previousAnalysis.totalBridgeRequired +
      previousAnalysis.totalUnfundedShortfall;
    updateSettings(this, {
      additionalGuaranteedIncomes: [
        {
          id: "bdd-guaranteed-income",
          name: "Previous employer DB pension",
          annualAmount,
          startAge,
          endAge: null,
          indexation: "none",
          fixedIncreasePercent: null,
          taxable: true,
        },
      ],
    });
    analyseBridgePlan(this);
  }
);

Then(
  "the bridge plan should work on these assumptions",
  function (this: ProductAcceptanceWorld) {
    assertEqual(getBridgeAnalysis(this).planWorks, true);
  }
);

Then(
  "the retirement income summary should not include Alpha pension",
  function (this: ProductAcceptanceWorld) {
    assertCondition(
      this.bridgeSummary,
      "Bridge summary has not been generated"
    );
    assertEqual(
      this.bridgeSummary.retirementIncome.sources.some(
        (source) => source.key === "alpha"
      ),
      false
    );
  }
);

Then(
  "the first bridge phase should show no secure income source",
  function (this: ProductAcceptanceWorld) {
    assertDeepEqual(getBridgeAnalysis(this).phases[0]?.incomeSourcesActive, [
      "None",
    ]);
  }
);

Then(
  "at least one bridge phase should include {string}",
  function (this: ProductAcceptanceWorld, sourceLabel: string) {
    assertCondition(
      getBridgeAnalysis(this).phases.some((phase) =>
        phase.incomeSourcesActive.includes(sourceLabel)
      ),
      `Expected a bridge phase to include ${sourceLabel}`
    );
  }
);

Then(
  "the stable annual secure income should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(
      getBridgeAnalysis(this).stableAnnualGuaranteedIncome,
      expected,
      this.precision
    );
  }
);

Then(
  "the total bridge funding need should be lower with the guaranteed income",
  function (this: ProductAcceptanceWorld) {
    assertCondition(
      this.bridgeFundingNeedBeforeGuaranteedIncome !== undefined,
      "Initial bridge funding need was not recorded"
    );
    const nextFundingNeed =
      getBridgeAnalysis(this).totalBridgeRequired +
      getBridgeAnalysis(this).totalUnfundedShortfall;

    assertCondition(
      nextFundingNeed < this.bridgeFundingNeedBeforeGuaranteedIncome,
      `Expected ${nextFundingNeed} to be lower than ${this.bridgeFundingNeedBeforeGuaranteedIncome}`
    );
  }
);

Given(
  "a default retirement scenario named {string}",
  function (this: ProductAcceptanceWorld, name: string) {
    const settings = createDefaultSettings();
    const result = createComparisonResult(
      {
        id: name.toLowerCase().replaceAll(" ", "-"),
        name,
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    this.comparisonResults = [...(this.comparisonResults ?? []), result];
  }
);

Given(
  "a retirement scenario named {string} includes nuvos pension",
  function (this: ProductAcceptanceWorld, name: string) {
    const currentSettings = createDefaultSettings();
    const settings = {
      ...createDefaultSettings(),
      showNuvos: true,
      nuvosAccruedPensionAtLastAbs: 12000,
      nuvosPensionableEarnings: 12000,
      nuvosPensionDrawAge: 65,
      nuvosPensionLeaveAge: 65,
    };
    const result = createComparisonResult(
      {
        id: name.toLowerCase().replaceAll(" ", "-"),
        name,
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(currentSettings)
    );

    this.comparisonResults = [...(this.comparisonResults ?? []), result];
  }
);

When(
  "comparison table rows are built",
  function (this: ProductAcceptanceWorld) {
    this.comparisonRows = buildComparisonTableRows(
      this.comparisonResults ?? []
    );
  }
);

When(
  "comparison table rows are built using {word} recurring values",
  function (this: ProductAcceptanceWorld, display: RetirementIncomeDisplay) {
    this.comparisonRows = buildComparisonTableRows(
      this.comparisonResults ?? [],
      {
        retirementIncomeDisplay: display,
      }
    );
  }
);

When(
  "comparison table rows are built without bridge funding and flexible assets",
  function (this: ProductAcceptanceWorld) {
    this.comparisonRows = buildComparisonTableRows(
      this.comparisonResults ?? [],
      {
        hideBridgeFundingSection: true,
        hideFlexibleAssetsSection: true,
      }
    );
  }
);

Then(
  "the comparison should include the {string} section",
  function (this: ProductAcceptanceWorld, section: string) {
    assertCondition(
      this.comparisonRows?.some(
        (row) => row.isSectionDivider && row.section === section
      ),
      `Expected comparison section "${section}"`
    );
  }
);

Then(
  "the comparison should not include the {string} section",
  function (this: ProductAcceptanceWorld, section: string) {
    assertEqual(
      this.comparisonRows?.some(
        (row) => row.isSectionDivider && row.section === section
      ),
      false
    );
  }
);

Then(
  "the comparison should include the {string} metric",
  function (this: ProductAcceptanceWorld, metric: string) {
    assertCondition(
      this.comparisonRows?.some((row) => row.metric === metric),
      `Expected comparison metric "${metric}"`
    );
  }
);

Then(
  "the comparison should not include the {string} metric",
  function (this: ProductAcceptanceWorld, metric: string) {
    assertEqual(
      this.comparisonRows?.some((row) => row.metric === metric),
      false
    );
  }
);

Then(
  "the {string} comparison value should include {string}",
  function (this: ProductAcceptanceWorld, metric: string, expected: string) {
    const firstValue = getComparisonRow(this, metric).values[0];

    assertCondition(
      nodeText(firstValue).includes(expected),
      `Expected ${nodeText(firstValue)} to include ${expected}`
    );
  }
);

Then(
  "the {string} comparison value for {string} should be {string}",
  function (
    this: ProductAcceptanceWorld,
    metric: string,
    scenarioName: string,
    expected: string
  ) {
    const scenarioIndex = (this.comparisonResults ?? []).findIndex(
      (result) => result.scenario.name === scenarioName
    );

    assertCondition(scenarioIndex >= 0, `Scenario "${scenarioName}" not found`);
    assertEqual(
      nodeText(getComparisonRow(this, metric).values[scenarioIndex]),
      expected
    );
  }
);

When(
  "the modeller journeys are loaded",
  function (this: ProductAcceptanceWorld) {
    this.selectedJourney = undefined;
  }
);

When(
  "the {string} journey is loaded",
  function (this: ProductAcceptanceWorld, title: string) {
    this.selectedJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.title === title
    );
    assertCondition(this.selectedJourney, `Journey "${title}" not found`);
  }
);

Then(
  "the available journey titles should include:",
  function (table: DataTable) {
    const titles = JOURNEY_DEFINITIONS.map((journey) => journey.title);

    for (const row of table.hashes()) {
      assertCondition(
        titles.some((title) => title === row.title),
        `Expected journey title "${row.title}"`
      );
    }
  }
);

Then(
  "the journey should include a step titled {string}",
  function (this: ProductAcceptanceWorld, title: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    assertCondition(
      this.selectedJourney.steps.some((step) => step.title === title),
      `Expected journey step "${title}"`
    );
  }
);

Then(
  "the journey result should use the shared bridge answer",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertEqual(answerStep.kind, "bridge-answer");
  }
);

Then(
  "the journey should hide bridge funding details by default",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertEqual(answerStep.hideBridgeFundingSection, true);
  }
);

Then(
  "the journey should show bridge funding details by default",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertEqual(answerStep.hideBridgeFundingSection === true, false);
  }
);

Then(
  "the journey result should show the projection table",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertEqual(answerStep.showProjectionTable, true);
  }
);

Given("default modeller settings", function (this: ProductAcceptanceWorld) {
  this.settings = createDefaultSettings();
});

When(
  "bridge journey defaults are applied",
  function (this: ProductAcceptanceWorld) {
    this.settings = applyBridgeJourneyDefaults(getSettings(this));
  }
);

Then(
  "State Pension, ISA, LISA and SIPP should be included",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);

    assertEqual(settings.showStatePension, true);
    assertEqual(settings.showIsa, true);
    assertEqual(settings.showLisa, true);
    assertEqual(settings.showSipp, true);
  }
);

Then(
  "Income Tax modelling should be off",
  function (this: ProductAcceptanceWorld) {
    assertEqual(getSettings(this).taxationEnabled, false);
  }
);

Then(
  "ISA, LISA and SIPP withdrawals should use the use-by-age strategy",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);

    assertEqual(settings.isaWithdrawalStrategy, "use_by_age");
    assertEqual(settings.lisaWithdrawalStrategy, "use_by_age");
    assertEqual(settings.sippWithdrawalStrategy, "use_by_age");
  }
);

Given("browser local storage is available", function () {
  installLocalStorage();
  saveLocalStoragePreference(true);
});

Given("browser local storage is disabled", function () {
  installLocalStorage();
  saveLocalStoragePreference(false);
});

When("the important information notice is acknowledged", function () {
  saveAcknowledgementState();
});

When(
  "the journey retirement income display is saved as {string}",
  function (display: RetirementIncomeDisplay) {
    saveStoredJourneyRetirementIncomeDisplay(display);
  }
);

When(
  "the comparison retirement income display is saved as {string}",
  function (display: RetirementIncomeDisplay) {
    saveStoredComparisonRetirementIncomeDisplay(display);
  }
);

When(
  "the stored modeller preferences are loaded",
  function (this: ProductAcceptanceWorld) {
    this.acknowledgementLoaded = loadAcknowledgementState();
    this.appModeLoaded = loadStoredAppMode();
    this.guidanceNotesLoaded = loadStoredGuidanceNotes();
  }
);

Then("the acknowledgement should be remembered locally", function () {
  assertEqual(loadAcknowledgementState(), true);
});

Then(
  "the journey retirement income display should load as {string}",
  function (expected: RetirementIncomeDisplay) {
    assertEqual(loadStoredJourneyRetirementIncomeDisplay(), expected);
  }
);

Then(
  "the comparison retirement income display should load as {string}",
  function (expected: RetirementIncomeDisplay) {
    assertEqual(loadStoredComparisonRetirementIncomeDisplay(), expected);
  }
);

Then(
  "no previous acknowledgement should be loaded",
  function (this: ProductAcceptanceWorld) {
    assertEqual(this.acknowledgementLoaded, false);
  }
);

Then(
  "no previous modeller mode should be loaded",
  function (this: ProductAcceptanceWorld) {
    assertEqual(this.appModeLoaded, null);
  }
);

Then("guidance notes should be shown", function (this: ProductAcceptanceWorld) {
  assertEqual(this.guidanceNotesLoaded, true);
});

function getJourneyAnswerStep(journey: JourneyDefinition): JourneyAnswerStep {
  const answerStep = journey.steps.find(
    (step): step is JourneyAnswerStep =>
      step.kind === "bridge-answer" || step.kind === "expert-answer"
  );

  assertCondition(answerStep, "Journey answer step was not found");

  return answerStep;
}
