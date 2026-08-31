import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import {
  applyBridgeJourneyDefaults,
  applySimpleJourneyDefaults,
  JOURNEY_DEFINITIONS,
  OPTIONAL_SECTION_TOGGLES,
  type JourneyDefinition,
  type JourneyStepDefinition,
} from "../../src/app-domains/journeys";
import { fieldGroups } from "../../src/fieldDefinitions";
import { TWO_PERSON_RETIREMENT_LIVING_STANDARDS } from "../../src/data/retirement-living-standards";
import { knowledgeLinks } from "../../src/knowledgeLinks";
import {
  buildComparisonStatusItems,
  buildRetirementOutcomeBanner,
  buildComparisonTableRows,
  type ComparisonTableRow,
} from "../../src/app-domains/comparison";
import {
  createComparisonResult as projectComparisonResult,
  type ComparisonResult,
  type ComparisonScenario,
} from "../../src/result-projection/comparison-result";
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
import { applyRetirementIncomeChartParameterPatch } from "../../src/app/chart-state";
import { getRetirementIncomeChartTitle } from "../../src/RetirementIncomeChart";
import { calculateRetirementPlan } from "../../src/calculation/retirement-plan";
import { calculateJointRetirementProjection } from "../../src/calculation/joint-retirement-plan";
import {
  calculateRetirementChartOverlays,
  RETIREMENT_CHART_OVERLAY_META,
} from "../../src/app-domains/retirement-chart-overlays";
import {
  getRetirementIncomeChartPresentation,
  type RetirementIncomeChartPresentation,
} from "../../src/app-domains/retirement-income-chart-presentation";
import {
  selectRetirementChartLegendKeys,
  type RetirementChartLegendSource,
} from "../../src/app-domains/retirement-chart-legend";
import {
  calculateAnnualIncomeTax,
  calculateTaxYearIncomeTaxAllocation,
  calculateMonthlyTaxableRetirementIncome,
  calculateAnnualStatePensionAtDraw,
  calculateMonthlyIncomeTax,
  calculatePensionWithdrawalTaxBreakdown,
  createPensionLumpSumAllowanceState,
  calculateMonthlyStatePension,
  calculateStatePensionDeferralIncreasePercent,
} from "../../src/projection";
import {
  calculateNormalPensionAge,
  createDefaultPartnerSettings,
  createDefaultSettings,
  getStoredSettingsEnvelope,
  parseStoredSettingsByJourney,
  saveLocalStoragePreference,
  validateSettings,
  normalizeSettings,
  type PensionSettings,
  type PensionSettingsByJourney,
} from "../../src/settings";
import {
  createHouseholdChartEvents,
  createHouseholdChartMilestones,
} from "../../src/result-projection/joint-retirement-chart";
import { getRetirementIncomeEventsForDate } from "../../src/result-projection/retirement-income-chart-layout";
import type { RetirementIncomeChartEvent } from "../../src/result-projection/retirement-income-chart-model";
import { summarizeFlexibleWithdrawalInsights } from "../../src/result-projection/flexible-withdrawals";

function createComparisonResult(
  scenario: ComparisonScenario,
  currentSettingsSignature: string
) {
  return projectComparisonResult(
    scenario,
    currentSettingsSignature,
    calculateRetirementPlan(scenario.settings)
  );
}

type ProductAcceptanceWorld = {
  precision?: number;
  settings?: PensionSettings;
  annualStatePensionAtDraw?: number;
  statePensionDeferralUplift?: number;
  monthlyStatePensionBeforeStart?: number;
  monthlyStatePensionFromStart?: number;
  monthlyAlphaPension?: number;
  monthlyClassicPension?: number;
  monthlyClassicPlusPension?: number;
  monthlyNuvosPension?: number;
  monthlyPremiumPension?: number;
  monthlyStatePension?: number;
  monthlySippPension?: number;
  monthlyCsAvcPension?: number;
  monthlyAdditionalGuaranteedIncomeTaxable?: number;
  monthlyAdditionalGuaranteedIncomeNonTaxable?: number;
  monthlyIsaPension?: number;
  monthlyLisaPension?: number;
  monthlyEmploymentIncome?: number;
  monthlyTaxableRetirementIncome?: number;
  annualisedTaxableRetirementIncome?: number;
  annualTaxableIncome?: number;
  annualIncomeTax?: number;
  monthlyIncomeTax?: number;
  taxYearIncomeEntries?: Array<{
    date: string;
    taxableIncome: number;
    taxableIncomeContext?: number;
  }>;
  taxYearAllocatedTax?: Map<string, number>;
  withdrawalTaxBreakdown?: ReturnType<
    typeof calculatePensionWithdrawalTaxBreakdown
  >;
  chartGrossIncomeAnnual?: number;
  chartTakeHomeIncomeAnnual?: number;
  chartTargetIncomeAnnual?: number;
  chartOverlays?: ReturnType<typeof calculateRetirementChartOverlays>;
  chartLegendSources?: RetirementChartLegendSource[];
  chartLegendKeys?: string[];
  standardChartTitle?: string;
  simpleChartTitle?: string;
  bridgePlan?: ReturnType<typeof calculateRetirementPlan>;
  bridgeShortfallBeforeGuaranteedIncome?: number;
  comparisonResults?: ComparisonResult[];
  comparisonRows?: ComparisonTableRow[];
  selectedJourney?: JourneyDefinition;
  acknowledgementLoaded?: boolean;
  appModeLoaded?: ReturnType<typeof loadStoredAppMode>;
  guidanceNotesLoaded?: boolean;
  journeySettings?: PensionSettingsByJourney;
  jointProjection?: ReturnType<typeof calculateJointRetirementProjection>;
  jointChartPresentation?: RetirementIncomeChartPresentation;
  jointChartEvents?: RetirementIncomeChartEvent[];
  jointChartMilestones?: ReturnType<typeof createHouseholdChartMilestones>;
};

type MemoryStorage = Storage & {
  snapshot: () => Record<string, string>;
};

type JourneyAnswerStep = JourneyStepDefinition & {
  kind: "results";
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

function calculateBridgePlan(world: ProductAcceptanceWorld) {
  world.bridgePlan = calculateRetirementPlan(getSettings(world));
}

function getBridgePlan(world: ProductAcceptanceWorld) {
  assertCondition(
    world.bridgePlan,
    "Bridge retirement plan has not been calculated"
  );

  return world.bridgePlan;
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

  if (
    typeof value === "object" &&
    "value" in value &&
    (typeof value.value === "string" || typeof value.value === "number")
  ) {
    return String(value.value);
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
  "the chart has annual gross retirement income of {float}",
  function (this: ProductAcceptanceWorld, amount: number) {
    this.chartGrossIncomeAnnual = amount;
  }
);

Given(
  "the chart has annual take-home retirement income of {float}",
  function (this: ProductAcceptanceWorld, amount: number) {
    this.chartTakeHomeIncomeAnnual = amount;
  }
);

Given(
  "the chart has annual target retirement income of {float}",
  function (this: ProductAcceptanceWorld, amount: number) {
    this.chartTargetIncomeAnnual = amount;
  }
);

When(
  "retirement chart overlays are prepared",
  function (this: ProductAcceptanceWorld) {
    this.chartOverlays = calculateRetirementChartOverlays({
      grossIncomeAnnual: this.chartGrossIncomeAnnual ?? 0,
      takeHomeIncomeAnnual: this.chartTakeHomeIncomeAnnual ?? 0,
      assessedIncomeAnnual: this.chartTakeHomeIncomeAnnual ?? 0,
      targetIncomeAnnual: this.chartTargetIncomeAnnual ?? 0,
    });
  }
);

Then(
  "chart estimated Income Tax should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(
      this.chartOverlays?.estimatedIncomeTaxAnnual,
      expected,
      this.precision
    );
  }
);

Then(
  "chart shortfall should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(this.chartOverlays?.shortfallAnnual, expected, this.precision);
  }
);

Then(
  "the chart key should identify {string} separately from {string}",
  function (
    this: ProductAcceptanceWorld,
    taxLabel: string,
    shortfallLabel: string
  ) {
    assertCondition(
      new Set<string>([taxLabel, shortfallLabel]).size === 2,
      "Chart labels must be distinct"
    );
    assertCondition(
      RETIREMENT_CHART_OVERLAY_META.estimatedIncomeTax.label === taxLabel,
      `Expected chart tax label ${taxLabel}`
    );
    assertCondition(
      RETIREMENT_CHART_OVERLAY_META.shortfall.label === shortfallLabel,
      `Expected chart shortfall label ${shortfallLabel}`
    );
  }
);

Given(
  "retirement plan outputs are rounded to {int} decimal places",
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
  "monthly CS AVC income is {float}",
  function (this: ProductAcceptanceWorld, amount: number) {
    this.monthlyCsAvcPension = amount;
  }
);

Given(
  "the SIPP tax-free withdrawal share is {float}%",
  function (this: ProductAcceptanceWorld, taxFreeShare: number) {
    updateSettings(this, {
      taxSippWithdrawalTreatment: "custom",
      taxSippTaxFreeWithdrawalPercent: taxFreeShare,
    });
  }
);

Given(
  "the {word} withdrawal treatment is {string}",
  function (this: ProductAcceptanceWorld, account: string, treatment: string) {
    assertCondition(
      treatment === "fully_taxable" ||
        treatment === "ufpls" ||
        treatment === "custom" ||
        treatment === "unknown",
      `Unsupported withdrawal treatment: ${treatment}`
    );
    if (account === "SIPP") {
      updateSettings(this, {
        taxSippWithdrawalTreatment: treatment,
      });
      return;
    }

    assertCondition(
      account === "CS",
      `Unsupported pension account: ${account}`
    );
    updateSettings(this, {
      taxCsAvcWithdrawalTreatment: treatment,
    });
  }
);

Given(
  "the CS AVC withdrawal treatment is {string}",
  function (this: ProductAcceptanceWorld, treatment: string) {
    assertCondition(
      treatment === "fully_taxable" ||
        treatment === "ufpls" ||
        treatment === "custom" ||
        treatment === "unknown",
      `Unsupported withdrawal treatment: ${treatment}`
    );
    updateSettings(this, {
      taxCsAvcWithdrawalTreatment: treatment,
    });
  }
);

Given(
  "the remaining pension lump-sum allowance is {float}",
  function (this: ProductAcceptanceWorld, allowance: number) {
    updateSettings(this, {
      taxTrackLumpSumAllowance: true,
      taxLumpSumAllowance: allowance,
      taxLumpSumAllowanceUsed: 0,
    });
  }
);

Given(
  "monthly {string} income is {float}",
  function (
    this: ProductAcceptanceWorld,
    incomeSource: string,
    amount: number
  ) {
    const fieldByIncomeSource = {
      "Alpha pension": "monthlyAlphaPension",
      "classic pension": "monthlyClassicPension",
      "classic plus pension": "monthlyClassicPlusPension",
      "nuvos pension": "monthlyNuvosPension",
      "Premium pension": "monthlyPremiumPension",
      "State Pension": "monthlyStatePension",
      "taxable additional guaranteed income":
        "monthlyAdditionalGuaranteedIncomeTaxable",
      "non-taxable additional guaranteed income":
        "monthlyAdditionalGuaranteedIncomeNonTaxable",
      "ISA withdrawal": "monthlyIsaPension",
      "qualifying LISA withdrawal": "monthlyLisaPension",
      "reduced-hours employment": "monthlyEmploymentIncome",
    } as const;
    const field =
      fieldByIncomeSource[incomeSource as keyof typeof fieldByIncomeSource];

    assertCondition(
      field,
      `Unsupported retirement income source: ${incomeSource}`
    );
    this[field] = amount;
  }
);

Given(
  "the modelled tax year has these taxable monthly amounts:",
  function (this: ProductAcceptanceWorld, table: DataTable) {
    this.taxYearIncomeEntries = table.hashes().map((row) => ({
      date: row.date ?? "",
      taxableIncome: parseMoney(row.amount ?? 0),
      taxableIncomeContext: parseMoney(row.taxContext ?? 0),
    }));
  }
);

When(
  "the modelled tax-year liability is allocated",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.taxYearIncomeEntries, "No tax-year income provided");
    this.taxYearAllocatedTax = calculateTaxYearIncomeTaxAllocation(
      this.taxYearIncomeEntries,
      getSettings(this)
    );
  }
);

When(
  "tax treatment is applied to a SIPP withdrawal of {float} and a CS AVC withdrawal of {float}",
  function (
    this: ProductAcceptanceWorld,
    sippWithdrawal: number,
    csAvcWithdrawal: number
  ) {
    const settings = getSettings(this);
    this.withdrawalTaxBreakdown = calculatePensionWithdrawalTaxBreakdown({
      settings,
      sippWithdrawal,
      csAvcWithdrawal,
      allowanceState: createPensionLumpSumAllowanceState(settings),
      accountOrder: settings.flexibleWithdrawalPriority,
    });
  }
);

Given(
  "the Income Tax regime is England, Wales or Northern Ireland",
  function (this: ProductAcceptanceWorld) {
    updateSettings(this, { taxRegime: "rest_of_uk" });
  }
);

Given(
  "the Income Tax regime is Scotland",
  function (this: ProductAcceptanceWorld) {
    updateSettings(this, { taxRegime: "scotland" });
  }
);

Given(
  "the personal allowance is {float}",
  function (this: ProductAcceptanceWorld, taxPersonalAllowance: number) {
    updateSettings(this, { taxPersonalAllowance });
  }
);

Given(
  "the personal allowance taper threshold is {float}",
  function (
    this: ProductAcceptanceWorld,
    taxPersonalAllowanceTaperThreshold: number
  ) {
    updateSettings(this, { taxPersonalAllowanceTaperThreshold });
  }
);

Given(
  "the basic rate band is {float}",
  function (this: ProductAcceptanceWorld, taxBasicRateLimit: number) {
    updateSettings(this, { taxBasicRateLimit });
  }
);

Given(
  "the additional rate taxable-income threshold is {float}",
  function (this: ProductAcceptanceWorld, taxAdditionalRateThreshold: number) {
    updateSettings(this, { taxAdditionalRateThreshold });
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
    const input = {
      settings: getSettings(this),
      monthlyAlphaPension: this.monthlyAlphaPension ?? 0,
      monthlyClassicPension: this.monthlyClassicPension ?? 0,
      monthlyClassicPlusPension: this.monthlyClassicPlusPension ?? 0,
      monthlyNuvosPension: this.monthlyNuvosPension ?? 0,
      monthlyPremiumPension: this.monthlyPremiumPension ?? 0,
      monthlyStatePension: this.monthlyStatePension ?? 0,
      monthlySippPension: this.monthlySippPension ?? 0,
      monthlyCsAvcPension: this.monthlyCsAvcPension ?? 0,
      monthlyAdditionalGuaranteedIncomeTaxable:
        this.monthlyAdditionalGuaranteedIncomeTaxable ?? 0,
      monthlyAdditionalGuaranteedIncomeNonTaxable:
        this.monthlyAdditionalGuaranteedIncomeNonTaxable ?? 0,
      monthlyIsaPension: this.monthlyIsaPension ?? 0,
      monthlyLisaPension: this.monthlyLisaPension ?? 0,
      monthlyEmploymentIncome: this.monthlyEmploymentIncome ?? 0,
    };

    this.monthlyTaxableRetirementIncome =
      calculateMonthlyTaxableRetirementIncome(input);
    this.annualisedTaxableRetirementIncome =
      this.monthlyTaxableRetirementIncome * 12;
    this.monthlyIncomeTax = calculateMonthlyIncomeTax(input);
  }
);

Then(
  "the total modelled Income Tax should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(
      [...(this.taxYearAllocatedTax?.values() ?? [])].reduce(
        (total, tax) => total + tax,
        0
      ),
      expected,
      this.precision
    );
  }
);

for (const [step, field] of [
  ["the SIPP tax-free cash should be {float}", "sippTaxFree"],
  ["the SIPP taxable withdrawal should be {float}", "sippTaxable"],
  ["the CS AVC tax-free cash should be {float}", "csAvcTaxFree"],
  ["the CS AVC taxable withdrawal should be {float}", "csAvcTaxable"],
  [
    "the remaining pension lump-sum allowance should be {float}",
    "allowanceRemaining",
  ],
] as const) {
  Then(step, function (this: ProductAcceptanceWorld, expected: number) {
    assertCondition(
      this.withdrawalTaxBreakdown,
      "No pension withdrawal tax breakdown has been calculated"
    );
    expectMoney(this.withdrawalTaxBreakdown[field], expected, this.precision);
  });
}

Then(
  "the monthly taxable retirement income should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(this.monthlyTaxableRetirementIncome, expected, this.precision);
  }
);

Then(
  "the annualised taxable retirement income should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(
      this.annualisedTaxableRetirementIncome,
      expected,
      this.precision
    );
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
      showSipp: false,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
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
  "the bridge plan has Alpha pension of {float} per year",
  function (this: ProductAcceptanceWorld, accruedPensionAtLastAbs: number) {
    const dateOfBirth = "1971-01-01";
    const normalPensionAge = calculateNormalPensionAge(dateOfBirth);

    updateSettings(this, {
      startDate: "2025-04-01",
      dateOfBirth,
      normalPensionAge,
      showAlpha: true,
      alphaPensionAbsDate: "2025",
      alphaPensionDrawAge: normalPensionAge,
      accruedPensionAtLastAbs,
      pensionableEarnings: 0,
      alphaAddedPensionMonthly: 0,
      inflationRateAnnual: 0,
      showClassic: false,
      showClassicPlus: false,
      showNuvos: false,
      showPremium: false,
      showSipp: false,
      showIsa: false,
      showLisa: false,
    });
  }
);

Given(
  "the bridge plan has classic pension of {float} per year from age {float}",
  function (
    this: ProductAcceptanceWorld,
    classicAnnualPension: number,
    classicPensionDrawAge: number
  ) {
    updateSettings(this, {
      startDate: "2026-04-01",
      dateOfBirth: "1980-04-01",
      inflationRateAnnual: 0,
      taxationEnabled: false,
      showAlpha: false,
      showClassic: true,
      classicCalculationMode: "manual",
      classicAnnualPension,
      classicAutomaticLumpSum: 0,
      classicPensionDrawAge,
      classicApplyPensionIncreases: false,
      showClassicPlus: false,
      showNuvos: false,
      showPremium: false,
      showSipp: false,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
    });
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
      startDate: "2025-04-01",
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
      isaDrawAge: getSettings(this).requirementAge,
      isaWithdrawalStrategy: "use_by_age",
      isaWithdrawalTargetAge: getSettings(this).lifeExpectancy,
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
    const settings = getSettings(this);
    updateSettings(this, {
      requirementAge,
      isaDrawAge: settings.showIsa ? requirementAge : settings.isaDrawAge,
      sippDrawAge: settings.showSipp ? requirementAge : settings.sippDrawAge,
    });
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
    this.settings = applyRetirementIncomeChartParameterPatch(
      getSettings(this),
      {
        retirementAge,
      }
    );
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
    const settings = getSettings(this);
    updateSettings(this, {
      lifeExpectancy,
      isaWithdrawalTargetAge: settings.showIsa
        ? lifeExpectancy
        : settings.isaWithdrawalTargetAge,
      sippWithdrawalTargetAge: settings.showSipp
        ? lifeExpectancy
        : settings.sippWithdrawalTargetAge,
      csAvcWithdrawalTargetAge: settings.showCsAvc
        ? lifeExpectancy
        : settings.csAvcWithdrawalTargetAge,
      lisaWithdrawalTargetAge: settings.showLisa
        ? lifeExpectancy
        : settings.lisaWithdrawalTargetAge,
    });
  }
);

Given(
  "the bridge target income is {float} per year",
  function (this: ProductAcceptanceWorld, desiredRetirementIncome: number) {
    updateSettings(this, { desiredRetirementIncome });
  }
);

When(
  "the bridge retirement plan is calculated",
  function (this: ProductAcceptanceWorld) {
    calculateBridgePlan(this);
  }
);

When(
  "the same bridge plan adds guaranteed income of {float} per year from age {float}",
  function (
    this: ProductAcceptanceWorld,
    annualAmount: number,
    startAge: number
  ) {
    this.bridgeShortfallBeforeGuaranteedIncome =
      getBridgePlan(this).assessment.totalLifetimeShortfall;
    updateSettings(this, {
      showAdditionalGuaranteedIncome: true,
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
    calculateBridgePlan(this);
  }
);

Then(
  "the configured withdrawals should meet the income target at retirement",
  function (this: ProductAcceptanceWorld) {
    assertCondition(
      getBridgePlan(this).assessment.retirementAnnualGap >= 0,
      "Expected configured withdrawals to meet the income target at retirement"
    );
  }
);

Then(
  "the retirement income summary should not include Alpha pension",
  function (this: ProductAcceptanceWorld) {
    assertEqual(
      getBridgePlan(this).summary.retirementIncome.sources.some(
        (source) => source.key === "alpha"
      ),
      false
    );
  }
);

Then(
  "the retirement income summary should include configured ISA withdrawals",
  function (this: ProductAcceptanceWorld) {
    assertCondition(
      [
        ...getBridgePlan(this).summary.retirementIncome.sources,
        ...getBridgePlan(this).summary.retirementIncome.bridgeWithdrawals,
      ].some((source) => source.key === "isa"),
      "Expected the retirement income summary to include ISA withdrawals"
    );
  }
);

Then(
  "the retirement income summary should include State Pension",
  function (this: ProductAcceptanceWorld) {
    assertCondition(
      getBridgePlan(this).summary.retirementIncome.sources.some(
        (source) => source.key === "statePension"
      ),
      "Expected the retirement income summary to include State Pension"
    );
  }
);

Then(
  "the retirement income summary should include classic pension",
  function (this: ProductAcceptanceWorld) {
    assertCondition(
      getBridgePlan(this).summary.retirementIncome.sources.some(
        (source) => source.key === "classic"
      ),
      "Expected the retirement income summary to include classic pension"
    );
  }
);

Then(
  "the secure income position at modelling end should be {float}",
  function (this: ProductAcceptanceWorld, expected: number) {
    expectMoney(
      getBridgePlan(this).assessment.planningHorizonSecureAnnualSurplus,
      expected,
      this.precision
    );
  }
);

Then(
  "the lifetime shortfall should be lower with the guaranteed income",
  function (this: ProductAcceptanceWorld) {
    assertCondition(
      this.bridgeShortfallBeforeGuaranteedIncome !== undefined,
      "Initial lifetime shortfall was not recorded"
    );
    const nextShortfall = getBridgePlan(this).assessment.totalLifetimeShortfall;

    assertCondition(
      nextShortfall < this.bridgeShortfallBeforeGuaranteedIncome,
      `Expected ${nextShortfall} to be lower than ${this.bridgeShortfallBeforeGuaranteedIncome}`
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
  "a default two-person retirement scenario named {string}",
  function (this: ProductAcceptanceWorld, name: string) {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1970-06-01",
        showStatePension: false,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
      },
    });
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

Given(
  "a retirement scenario named {string} uses Go-Go, Slow-Go, No-Go spending",
  function (this: ProductAcceptanceWorld, name: string) {
    const currentSettings = createDefaultSettings();
    const settings = {
      ...createDefaultSettings(),
      desiredRetirementIncome: 30_000,
      spendingStrategyType: "SPENDING_SMILE" as const,
      spendingSmile: {
        goGoPercentage: 110,
        slowGoStartAge: 74,
        slowGoPercentage: 80,
        noGoStartAge: 84,
        noGoPercentage: 65,
      },
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
  "comparison table rows are built without flexible assets",
  function (this: ProductAcceptanceWorld) {
    this.comparisonRows = buildComparisonTableRows(
      this.comparisonResults ?? [],
      {
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

Then(
  "the {string} comparison value for {string} should include {string}",
  function (
    this: ProductAcceptanceWorld,
    metric: string,
    scenarioName: string,
    expected: string
  ) {
    const scenarioIndex = (this.comparisonResults ?? []).findIndex(
      (result) => result.scenario.name === scenarioName
    );
    assertCondition(
      scenarioIndex >= 0,
      `Comparison scenario "${scenarioName}" not found`
    );
    assertCondition(
      nodeText(getComparisonRow(this, metric).values[scenarioIndex]).includes(
        expected
      ),
      `Expected ${metric} for ${scenarioName} to include ${expected}`
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
  "the first journey step should be titled {string}",
  function (this: ProductAcceptanceWorld, title: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    assertEqual(this.selectedJourney.steps[0]?.title, title);
  }
);

Then(
  "the journey should not include a step titled {string}",
  function (this: ProductAcceptanceWorld, title: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    assertCondition(
      !this.selectedJourney.steps.some((step) => step.title === title),
      `Did not expect journey step "${title}"`
    );
  }
);

Then(
  "the {string} journey step should link to the Retirement Living Standards",
  function (this: ProductAcceptanceWorld, stepTitle: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );

    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      step.kind === "fields" &&
        step.supportLink?.href === knowledgeLinks.retirementLivingStandards,
      `Expected journey step "${stepTitle}" to link to the Retirement Living Standards`
    );
  }
);

Then(
  "the {string} journey step should place its support link beside the field",
  function (this: ProductAcceptanceWorld, stepTitle: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );

    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      step.kind === "fields" && step.supportLinkLayout === "inline",
      `Expected journey step "${stepTitle}" to use an inline support link`
    );
  }
);

Then(
  "the default visible journey steps should be:",
  function (this: ProductAcceptanceWorld, table: DataTable) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const settings = this.settings ?? createDefaultSettings();
    const actualTitles = this.selectedJourney.steps
      .filter((step) => !step.visible || step.visible(settings))
      .map((step) => step.title);
    const expectedTitles = table.hashes().map((row) => row.title);

    assertEqual(JSON.stringify(actualTitles), JSON.stringify(expectedTitles));
  }
);

Then(
  "the default visible journey steps should start with:",
  function (this: ProductAcceptanceWorld, table: DataTable) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const settings = this.settings ?? createDefaultSettings();
    const actualTitles = this.selectedJourney.steps
      .filter((step) => !step.visible || step.visible(settings))
      .slice(0, table.hashes().length)
      .map((step) => step.title);
    const expectedTitles = table.hashes().map((row) => row.title);

    assertEqual(JSON.stringify(actualTitles), JSON.stringify(expectedTitles));
  }
);

Then(
  "the {string} journey step should contain these fields:",
  function (this: ProductAcceptanceWorld, stepTitle: string, table: DataTable) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );
    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      step.kind === "fields",
      `Journey step "${stepTitle}" does not contain fields`
    );
    const fieldDefinitions = fieldGroups.flatMap((group) => group.fields);
    const actualFields = step.fieldIds.map(
      (fieldId) =>
        step.fieldLabels?.[fieldId] ??
        fieldDefinitions.find((field) => field.id === fieldId)?.label ??
        fieldId
    );
    const expectedFields = table.hashes().map((row) => row.field);

    assertEqual(JSON.stringify(actualFields), JSON.stringify(expectedFields));
  }
);

Then(
  "the {string} journey step should use a yes or no question",
  function (this: ProductAcceptanceWorld, stepTitle: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );

    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      step.kind === "fields" && step.optionalQuestion,
      `Expected journey step "${stepTitle}" to use a yes or no question`
    );
  }
);

Then(
  "the {string} journey step should link to Annual Benefit Statement help",
  function (this: ProductAcceptanceWorld, stepTitle: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );

    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      step.kind === "fields" &&
        step.supportLink?.href === knowledgeLinks.annualBenefitStatement,
      `Expected journey step "${stepTitle}" to link to Annual Benefit Statement help`
    );
  }
);

Then(
  "the {string} journey step should link to the personalised State Pension forecast",
  function (this: ProductAcceptanceWorld, stepTitle: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );

    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      step.kind === "fields" &&
        step.supportLink?.href === knowledgeLinks.statePensionForecast,
      `Expected journey step "${stepTitle}" to link to the personalised State Pension forecast`
    );
  }
);

Then(
  "the {string} journey step should appear before the {string} journey step",
  function (
    this: ProductAcceptanceWorld,
    earlierStepTitle: string,
    laterStepTitle: string
  ) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const stepTitles = this.selectedJourney.steps.map((step) => step.title);
    const earlierStepIndex = stepTitles.indexOf(earlierStepTitle);
    const laterStepIndex = stepTitles.indexOf(laterStepTitle);

    assertCondition(
      earlierStepIndex >= 0,
      `Journey step "${earlierStepTitle}" not found`
    );
    assertCondition(
      laterStepIndex >= 0,
      `Journey step "${laterStepTitle}" not found`
    );
    assertCondition(
      earlierStepIndex < laterStepIndex,
      `Expected journey step "${earlierStepTitle}" to appear before "${laterStepTitle}"`
    );
  }
);

Then(
  "the {string} journey step should include the field {string}",
  function (
    this: ProductAcceptanceWorld,
    stepTitle: string,
    fieldLabel: string
  ) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );
    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      step.kind === "fields",
      `Journey step "${stepTitle}" does not contain fields`
    );
    const matchingField = fieldGroups
      .flatMap((group) => group.fields)
      .find((field) => field.label === fieldLabel);

    assertCondition(matchingField, `Field "${fieldLabel}" not found`);
    assertCondition(
      step.fieldIds.includes(matchingField.id),
      `Expected journey step "${stepTitle}" to include "${fieldLabel}"`
    );
  }
);

Then(
  "the {string} journey step should not include the field {string}",
  function (
    this: ProductAcceptanceWorld,
    stepTitle: string,
    fieldLabel: string
  ) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );
    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      step.kind === "fields",
      `Journey step "${stepTitle}" does not contain fields`
    );
    const matchingField = fieldGroups
      .flatMap((group) => group.fields)
      .find((field) => field.label === fieldLabel);

    assertCondition(matchingField, `Field "${fieldLabel}" not found`);
    assertCondition(
      !step.fieldIds.includes(matchingField.id),
      `Expected journey step "${stepTitle}" not to include "${fieldLabel}"`
    );
  }
);

Then(
  "the expert retirement income target should be an after-tax spending target",
  function (this: ProductAcceptanceWorld) {
    const targetGroup = fieldGroups.find(
      (group) => group.id === "retirement-target"
    );
    const targetField = targetGroup?.fields.find(
      (field) => field.id === "desiredRetirementIncome"
    );

    assertCondition(targetGroup, "Expected the retirement target field group");
    assertCondition(targetField, "Expected the retirement income target field");
    assertEqual(
      targetField.description,
      "How much would you like to have available to spend each year in retirement, after tax?"
    );
    assertCondition(
      !targetGroup.fields.some(
        (field) => field.id === "retirementIncomeTargetBasis"
      ),
      "Expected the Expert journey not to ask for a target basis"
    );
  }
);

Then(
  "the expert retirement income target should offer these quick-select amounts:",
  function (this: ProductAcceptanceWorld, table: DataTable) {
    const targetField = fieldGroups
      .find((group) => group.id === "retirement-target")
      ?.fields.find((field) => field.id === "desiredRetirementIncome");

    assertCondition(
      targetField?.type === "currency-input",
      "Expected the retirement income target to be a currency input"
    );
    assertEqual(
      JSON.stringify(targetField.presets?.map((preset) => preset.value)),
      JSON.stringify(table.hashes().map((row) => Number(row.amount)))
    );
  }
);

Then(
  "the two-person Retirement Living Standards quick-selects should be:",
  function (this: ProductAcceptanceWorld, table: DataTable) {
    assertEqual(
      JSON.stringify(
        TWO_PERSON_RETIREMENT_LIVING_STANDARDS.annualExpenditure.map(
          (preset) => preset.value
        )
      ),
      JSON.stringify(table.hashes().map((row) => Number(row.amount)))
    );
  }
);

Given(
  "two people retire in the same calendar month",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);
    const partner = {
      ...createDefaultPartnerSettings(),
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 95,
    };

    this.settings = {
      ...settings,
      dateOfBirth: "1970-06-15",
      requirementAge: 60,
      lifeExpectancy: 95,
      partner,
      jointRetirement: {
        ...settings.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 0,
      },
    };
  }
);

Given(
  "a staggered two-person household",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);
    const partner = {
      ...createDefaultPartnerSettings(),
      dateOfBirth: "1972-06-01",
      requirementAge: 63,
      lifeExpectancy: 95,
    };

    this.settings = {
      ...settings,
      dateOfBirth: "1970-06-15",
      requirementAge: 60,
      lifeExpectancy: 95,
      partner,
      jointRetirement: {
        ...settings.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 30_000,
        fullyRetiredDesiredRetirementIncome: 45_400,
      },
    };
  }
);

Given(
  "Your SIPP and ISA fund Your personal target",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);
    this.settings = {
      ...settings,
      desiredRetirementIncome: 31_350,
      retirementIncomeTargetBasis: "after_tax",
      showSipp: true,
      sippCurrentPot: 45_000,
      sippMonthlyContribution: 1_100,
      sippDrawAge: settings.requirementAge + 2,
      sippWithdrawalStrategy: "meet_income_target",
      showIsa: true,
      isaCurrentPot: 45_000,
      isaMonthlyContribution: 150,
      isaDrawAge: settings.requirementAge,
      isaWithdrawalStrategy: "meet_income_target",
      flexibleWithdrawalPriority: ["sipp", "isa"],
    };
  }
);

Given(
  "a two-person household with more SIPP contributions than the shared target uses",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);
    this.settings = {
      ...settings,
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 75,
      desiredRetirementIncome: 12_000,
      taxationEnabled: false,
      showAlpha: false,
      showStatePension: false,
      showIsa: false,
      showSipp: true,
      sippCurrentPot: 500_000,
      sippMonthlyContribution: 1_000,
      sippDrawAge: 60,
      sippWithdrawalStrategy: "meet_income_target",
      flexibleWithdrawalPriority: ["sipp"],
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1970-06-01",
        requirementAge: 60,
        lifeExpectancy: 75,
        taxationEnabled: false,
        showStatePension: false,
        showIsa: false,
        showSipp: true,
        sippCurrentPot: 20_000,
        sippMonthlyContribution: 200,
        sippDrawAge: 60,
        sippWithdrawalStrategy: "meet_income_target",
        flexibleWithdrawalPriority: ["sipp"],
      },
      jointRetirement: {
        ...settings.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 12_000,
        fullyRetiredDesiredRetirementIncome: 12_000,
        flexibleWithdrawalPriority: ["you:sipp", "partner:sipp"],
      },
    };
  }
);

When(
  "the joint household projection is calculated",
  function (this: ProductAcceptanceWorld) {
    this.jointProjection = calculateJointRetirementProjection(
      getSettings(this)
    );
  }
);

Then(
  "the joint result should retain separate You and Partner projections",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.jointProjection, "Expected a joint projection");
    assertCondition(
      this.jointProjection.people.you.rows.length > 0,
      "Expected Your projection rows"
    );
    assertCondition(
      this.jointProjection.people.partner.rows.length > 0,
      "Expected Partner projection rows"
    );
    assertCondition(
      this.jointProjection.rows.some(
        (row) => row.people.you !== null && row.people.partner !== null
      ),
      "Expected calendar-aligned household rows for both people"
    );
  }
);

Then(
  "the joint result should use one canonical household target",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.jointProjection, "Expected a joint projection");
    const targets = this.jointProjection.rows
      .map((row) => row.target)
      .filter((target): target is number => target !== null && target > 0);
    assertCondition(targets.length > 0, "Expected household target rows");
    assertCondition(
      targets.includes(
        getSettings(this).jointRetirement.fullyRetiredDesiredRetirementIncome
      ),
      "Expected the canonical fully-retired household target"
    );
  }
);

Then(
  "the joint result should contain one row per calendar month",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.jointProjection, "Expected a joint projection");
    const months = this.jointProjection.rows.map((row) => row.date.slice(0, 7));
    assertEqual(new Set(months).size, months.length);
  }
);

Then(
  "the stand-alone Your projection should contain ISA and SIPP withdrawals",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.jointProjection, "Expected a joint projection");
    const rows = this.jointProjection.individuals.you.rows;
    assertCondition(
      rows.some((row) => row.monthlyIsaPension > 0),
      "Expected stand-alone ISA withdrawals"
    );
    assertCondition(
      rows.some((row) => row.monthlySippPension > 0),
      "Expected stand-alone SIPP withdrawals"
    );
  }
);

Then(
  "the coordinated household projection may allocate Your withdrawals differently",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.jointProjection, "Expected a joint projection");
    const individualIsaMonths =
      this.jointProjection.individuals.you.rows.filter(
        (row) => row.monthlyIsaPension > 0
      ).length;
    const coordinatedIsaMonths = this.jointProjection.people.you.rows.filter(
      (row) => row.monthlyIsaPension > 0
    ).length;
    assertCondition(
      individualIsaMonths !== coordinatedIsaMonths,
      "Expected household coordination to remain separate from the stand-alone view"
    );
  }
);

Then(
  /^the joint result should report potential over-saving for (Your|Partner's) coordinated SIPP$/,
  function (this: ProductAcceptanceWorld, personLabel: "Your" | "Partner's") {
    assertCondition(this.jointProjection, "Expected a joint projection");
    const owner = personLabel === "Your" ? "you" : "partner";
    const settings = getSettings(this);
    const personSettings =
      owner === "you"
        ? {
            ...settings,
            partner: undefined,
            jointRetirement: {
              ...settings.jointRetirement,
              enabled: false,
            },
          }
        : {
            ...settings,
            ...settings.partner!,
            partner: undefined,
            jointRetirement: {
              ...settings.jointRetirement,
              enabled: false,
            },
          };
    const summary = summarizeFlexibleWithdrawalInsights(
      this.jointProjection.people[owner].rows,
      personSettings
    );

    assertCondition(
      summary.residualAccounts.some((account) => account.accountId === "sipp"),
      `Expected ${personLabel} coordinated SIPP residual insight`
    );
  }
);

Then(
  "the joint result should have one household retirement month",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.jointProjection, "Expected a joint projection");
    assertEqual(
      this.jointProjection.firstRetirementMonth,
      this.jointProjection.bothRetiredMonth
    );
  }
);

When(
  "the editable household chart presentation is prepared",
  function (this: ProductAcceptanceWorld) {
    this.jointChartPresentation =
      getRetirementIncomeChartPresentation("editable-household");
  }
);

Then(
  "inline household milestone annotations should be disabled",
  function (this: ProductAcceptanceWorld) {
    assertEqual(this.jointChartPresentation?.showInlineMilestones, false);
    assertEqual(this.jointChartPresentation?.readOnly, false);
  }
);

Then(
  "key household retirement markers should use the shared chart marker style",
  function (this: ProductAcceptanceWorld) {
    this.jointChartMilestones = createHouseholdChartMilestones(
      getSettings(this)
    );
    assertEqual(this.jointChartMilestones.length, 2);
    assertCondition(
      this.jointChartMilestones.every((marker) => marker.timelineValue > 0),
      "Expected both retirement markers to have a timeline position"
    );
  }
);

Then(
  "household period inspection should remain enabled",
  function (this: ProductAcceptanceWorld) {
    assertEqual(this.jointChartPresentation?.showPeriodInspection, true);
  }
);

When(
  "household chart events are projected",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);
    this.settings = {
      ...settings,
      showAlpha: true,
      alphaPensionDrawAge: settings.requirementAge,
      partner: settings.partner
        ? { ...settings.partner, showStatePension: true }
        : settings.partner,
    };
    this.jointChartEvents = createHouseholdChartEvents(getSettings(this));
  }
);

Then(
  "household chart events should retain You and Partner ownership",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.jointChartEvents, "Expected household chart events");
    assertCondition(
      this.jointChartEvents.some((event) => event.owner === "you"),
      "Expected Your event ownership"
    );
    assertCondition(
      this.jointChartEvents.some((event) => event.owner === "partner"),
      "Expected Partner event ownership"
    );
  }
);

Then(
  "simultaneous household events should be grouped by calendar month",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.jointChartEvents, "Expected household chart events");
    const retirementEvent = this.jointChartEvents.find(
      (event) => event.key === "you-retirement"
    );
    assertCondition(retirementEvent, "Expected Your retirement event");
    const grouped = getRetirementIncomeEventsForDate(
      this.jointChartEvents,
      retirementEvent.date
    );
    assertCondition(
      grouped.some((event) => event.key === "you-alpha-start"),
      "Expected simultaneous retirement and Alpha events in one month"
    );
  }
);

Then(
  "the household should not require a transition target",
  function (this: ProductAcceptanceWorld) {
    const issues = validateSettings(getSettings(this));
    assertCondition(
      !issues.some(
        (issue) =>
          issue.field === "jointRetirement" &&
          issue.message.includes("period when one person is retired")
      ),
      "Expected no transition-target validation issue for one calendar month"
    );
  }
);

Then(
  "the household target should start when both people retire",
  function (this: ProductAcceptanceWorld) {
    const plan = calculateRetirementPlan(getSettings(this));
    assertCondition(plan.jointProjection, "Expected a household projection");
    assertEqual(
      plan.jointProjection.firstRetirementMonth,
      plan.jointProjection.bothRetiredMonth
    );
  }
);

Then(
  "the simplified pension choices should not offer Alpha as an optional pension",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const pensionChoicesStep = this.selectedJourney.steps.find(
      (step) => step.id === "include"
    );

    assertCondition(
      pensionChoicesStep?.kind === "optional-sections",
      "Expected a simplified pension choices step"
    );
    assertCondition(
      !pensionChoicesStep.toggleKeys?.includes("showAlpha"),
      "Expected Alpha not to be an optional simplified pension choice"
    );
    assertCondition(
      applySimpleJourneyDefaults({
        ...createDefaultSettings(),
        showAlpha: false,
      }).showAlpha,
      "Expected the simplified journey to include Alpha"
    );
  }
);

Then(
  "the simplified pension choices should explain:",
  function (this: ProductAcceptanceWorld, table: DataTable) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const pensionChoicesStep = this.selectedJourney.steps.find(
      (step) => step.id === "include"
    );

    assertCondition(
      pensionChoicesStep?.kind === "optional-sections",
      "Expected a simplified pension choices step"
    );
    const actualChoices = pensionChoicesStep.toggleKeys?.map((key) => {
      const copy = pensionChoicesStep.toggleCopy?.[key];

      assertCondition(copy, `Expected simple copy for ${key}`);
      assertCondition(
        copy.description.length > 30,
        `Expected a useful plain-English explanation for ${copy.label}`
      );

      return copy.label;
    });
    const expectedChoices = table.hashes().map((row) => row.choice);

    assertEqual(JSON.stringify(actualChoices), JSON.stringify(expectedChoices));
  }
);

Then(
  "the bridge pot choices should explain:",
  function (this: ProductAcceptanceWorld, table: DataTable) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const potChoicesStep = this.selectedJourney.steps.find(
      (step) => step.id === "pots"
    );

    assertCondition(
      potChoicesStep?.kind === "optional-sections",
      "Expected a bridge pot choices step"
    );
    const actualChoices = potChoicesStep.toggleKeys?.map((key) => {
      const copy = potChoicesStep.toggleCopy?.[key];

      assertCondition(copy, `Expected bridge copy for ${key}`);
      assertCondition(
        copy.description.length > 30,
        `Expected a useful plain-English explanation for ${copy.label}`
      );

      return copy.label;
    });
    const expectedChoices = table.hashes().map((row) => row.choice);

    assertEqual(JSON.stringify(actualChoices), JSON.stringify(expectedChoices));
  }
);

Then(
  "the {string} journey step should use the simple target-income presentation",
  function (this: ProductAcceptanceWorld, stepTitle: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const bridgeStep = this.selectedJourney.steps.find(
      (step) => step.title === stepTitle
    );
    const simpleStep = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "simple-early-retirement"
    )?.steps.find((step) => step.id === "target");

    assertCondition(
      bridgeStep?.kind === "fields" && simpleStep?.kind === "fields",
      "Expected target field steps"
    );
    assertEqual(
      JSON.stringify({
        title: bridgeStep.title,
        description: bridgeStep.description,
        fieldIds: bridgeStep.fieldIds,
        fieldLabels: bridgeStep.fieldLabels,
        fieldDescriptions: bridgeStep.fieldDescriptions,
        currencyFieldPresentation: bridgeStep.currencyFieldPresentation,
        supportLink: bridgeStep.supportLink,
      }),
      JSON.stringify({
        title: simpleStep.title,
        description: simpleStep.description,
        fieldIds: simpleStep.fieldIds,
        fieldLabels: simpleStep.fieldLabels,
        fieldDescriptions: simpleStep.fieldDescriptions,
        currencyFieldPresentation: simpleStep.currencyFieldPresentation,
        supportLink: simpleStep.supportLink,
      })
    );
  }
);

Then(
  "the bridge withdrawal-plan step should expose spending and pot-withdrawal strategies",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const targetStep = this.selectedJourney.steps.find(
      (step) => step.id === "bridge-strategy"
    );

    assertCondition(
      targetStep?.kind === "fields" &&
        targetStep.showSpendingSmileEditor === true &&
        targetStep.showFlexibleWithdrawalPriority === true,
      "Expected bridge withdrawal-plan spending and pot-withdrawal controls"
    );
  }
);

Then(
  "the expert optional sections should allow Alpha pension to be disabled",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const optionalSectionsStep = this.selectedJourney.steps.find(
      (step) => step.id === "optional-sections"
    );

    assertCondition(
      optionalSectionsStep?.kind === "optional-sections",
      "Expected an optional sections step"
    );
    const toggleKeys =
      optionalSectionsStep.toggleKeys ??
      OPTIONAL_SECTION_TOGGLES.map((toggle) => toggle.key);

    assertCondition(
      toggleKeys.includes("showAlpha"),
      "Expected expert optional sections to include Alpha pension"
    );
  }
);

When("Alpha pension is disabled", function (this: ProductAcceptanceWorld) {
  updateSettings(this, { showAlpha: false });
});

When(
  "ISA is excluded from the bridge plan",
  function (this: ProductAcceptanceWorld) {
    updateSettings(this, { showIsa: false });
  }
);

When(
  "other guaranteed income is included in the bridge plan",
  function (this: ProductAcceptanceWorld) {
    updateSettings(this, { showAdditionalGuaranteedIncome: true });
  }
);

Then(
  "the {string} journey step should be visible",
  function (this: ProductAcceptanceWorld, stepTitle: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const settings = getSettings(this);
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );

    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      !step.visible || step.visible(settings),
      `Expected journey step "${stepTitle}" to be visible`
    );
  }
);

Then(
  "the {string} journey step should not be visible",
  function (this: ProductAcceptanceWorld, stepTitle: string) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const settings = getSettings(this);
    const step = this.selectedJourney.steps.find(
      (candidate) => candidate.title === stepTitle
    );

    assertCondition(step, `Journey step "${stepTitle}" not found`);
    assertCondition(
      step.visible && !step.visible(settings),
      `Expected journey step "${stepTitle}" to be hidden`
    );
  }
);

Then(
  "the journey result should use shared results components",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertEqual(answerStep.kind, "results");
  }
);

Then(
  "the journey result should use the simple results presentation",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertCondition(
      answerStep.sections.some(
        (section) =>
          section.id === "summary" && section.presentation === "simple"
      )
    );
  }
);

Then(
  "the journey should hide bridge funding details by default",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertCondition(!hasResultSection(answerStep, "comparison"));
  }
);

Then(
  "the journey should show bridge funding details by default",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertCondition(hasResultSection(answerStep, "comparison"));
  }
);

Then(
  "the journey result should show the projection table",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertCondition(hasResultSection(answerStep, "projection-table"));
  }
);

Then(
  "the journey should hide the comparison section",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertCondition(!hasResultSection(answerStep, "comparison"));
  }
);

Then(
  "the journey should show the comparison section",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.selectedJourney, "No journey has been selected");
    const answerStep = getJourneyAnswerStep(this.selectedJourney);

    assertCondition(hasResultSection(answerStep, "comparison"));
  }
);

Given("default modeller settings", function (this: ProductAcceptanceWorld) {
  this.settings = createDefaultSettings();
});

Given(
  "each journey has a different retirement age",
  function (this: ProductAcceptanceWorld) {
    const defaults = createDefaultSettings();
    this.journeySettings = {
      simple: { ...defaults, requirementAge: 61 },
      bridge: { ...defaults, requirementAge: 62 },
      expert: { ...defaults, requirementAge: 63 },
    };
  }
);

When(
  "the journey settings are exported and parsed",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.journeySettings, "Expected journey settings");
    this.journeySettings = parseStoredSettingsByJourney(
      getStoredSettingsEnvelope(this.journeySettings)
    )?.settings;
  }
);

Then(
  "each journey should retain its own retirement age",
  function (this: ProductAcceptanceWorld) {
    assertCondition(this.journeySettings, "Expected parsed journey settings");
    assertEqual(this.journeySettings.simple.requirementAge, 61);
    assertEqual(this.journeySettings.bridge.requirementAge, 62);
    assertEqual(this.journeySettings.expert.requirementAge, 63);
  }
);

When(
  "a legacy flat parameter file with retirement age {int} is parsed",
  function (this: ProductAcceptanceWorld, requirementAge: number) {
    this.journeySettings = parseStoredSettingsByJourney({
      requirementAge,
    })?.settings;
  }
);

Then(
  "all three journeys should use the legacy retirement age {int}",
  function (this: ProductAcceptanceWorld, requirementAge: number) {
    assertCondition(this.journeySettings, "Expected migrated journey settings");
    assertEqual(this.journeySettings.simple.requirementAge, requirementAge);
    assertEqual(this.journeySettings.bridge.requirementAge, requirementAge);
    assertEqual(this.journeySettings.expert.requirementAge, requirementAge);
  }
);

Given(
  "a retirement spending target of {float} per month after estimated tax",
  function (this: ProductAcceptanceWorld, monthlyTarget: number) {
    this.settings = {
      ...createDefaultSettings(),
      startDate: "2026-06-01",
      dateOfBirth: "1987-06-01",
      requirementAge: 68,
      lifeExpectancy: 80,
      desiredRetirementIncome: monthlyTarget * 12,
      retirementIncomeTargetBasis: "after_tax",
      taxationEnabled: true,
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
      showAdditionalGuaranteedIncome: true,
      additionalGuaranteedIncomes: [],
    };
  }
);

Given(
  "projected taxable pension income of {float} per year before tax",
  function (this: ProductAcceptanceWorld, annualIncome: number) {
    this.settings = {
      ...getSettings(this),
      additionalGuaranteedIncomes: [
        {
          id: "bdd-taxable-pension",
          name: "Taxable pension",
          annualAmount: annualIncome,
          startAge: 68,
          endAge: null,
          indexation: "none",
          taxable: true,
        },
      ],
    };
  }
);

Given(
  "an unconfirmed full State Pension assumption",
  function (this: ProductAcceptanceWorld) {
    this.settings = {
      ...createDefaultSettings(),
      startDate: "2026-06-01",
      dateOfBirth: "1987-06-01",
      requirementAge: 68,
      lifeExpectancy: 80,
      showAlpha: false,
      showClassic: false,
      showClassicPlus: false,
      showNuvos: false,
      showPremium: false,
      showStatePension: true,
      showSipp: false,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
      statePensionForecastConfirmed: false,
      taxationEnabled: false,
    };
  }
);

Given(
  "the assumed State Pension is enough to meet the retirement target",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);
    this.settings = {
      ...settings,
      desiredRetirementIncome: settings.currentStatePension - 100,
    };
  }
);

Given(
  "other retirement income is enough to meet the target without State Pension",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);
    this.settings = {
      ...settings,
      desiredRetirementIncome: settings.currentStatePension - 100,
      showAdditionalGuaranteedIncome: true,
      additionalGuaranteedIncomes: [
        {
          id: "bdd-other-pension",
          name: "Other pension",
          annualAmount: settings.currentStatePension + 100,
          startAge: settings.requirementAge,
          endAge: null,
          indexation: "none",
          taxable: true,
        },
      ],
    };
  }
);

When(
  "the retirement outcome is assessed",
  function (this: ProductAcceptanceWorld) {
    const settings = getSettings(this);
    const scenario = {
      id: "bdd-after-tax-target",
      name: "After-tax target",
      settings,
      createdAt: "",
      updatedAt: "",
    };

    this.comparisonResults = [
      createComparisonResult(scenario, JSON.stringify(settings)),
    ];
  }
);

Given(
  "a retirement plan with sufficient ISA savings but zero configured withdrawals",
  function (this: ProductAcceptanceWorld) {
    this.settings = {
      ...createDefaultSettings(),
      startDate: "2026-01-01",
      dateOfBirth: "1970-01-01",
      requirementAge: 57,
      lifeExpectancy: 58,
      desiredRetirementIncome: 6000,
      retirementIncomeTargetBasis: "gross",
      projectionBasis: "real",
      taxationEnabled: false,
      assumedCpiPercent: 0,
      showAlpha: false,
      showClassic: false,
      showClassicPlus: false,
      showNuvos: false,
      showPremium: false,
      showStatePension: false,
      showSipp: false,
      showCsAvc: false,
      showLisa: false,
      showIsa: true,
      isaCurrentPot: 100_000,
      isaMonthlyContribution: 0,
      isaDrawAge: 57,
      isaRealInterestPercent: 0,
      isaWithdrawalStrategy: "percentage",
      isaWithdrawalPercent: 0,
    };
  }
);

Then(
  "the gross pension income should exceed the spending target",
  function (this: ProductAcceptanceWorld) {
    const range =
      this.comparisonResults?.[0]?.summary.retirementIncome.ageRanges[0];
    assertCondition(range, "Expected a retirement income age range");
    assertCondition(range.annualIncomeBeforeTax > range.annualTargetIncome);
  }
);

Then(
  "the estimated take-home pension income should be below the spending target",
  function (this: ProductAcceptanceWorld) {
    const range =
      this.comparisonResults?.[0]?.summary.retirementIncome.ageRanges[0];
    assertCondition(range, "Expected a retirement income age range");
    assertCondition(range.annualIncomeAfterTax < range.annualTargetIncome);
  }
);

Then(
  "the scenario should report a shortfall against the spending target",
  function (this: ProductAcceptanceWorld) {
    const result = this.comparisonResults?.[0];
    assertCondition(result, "Expected a comparison result");
    assertCondition(result.assessment.targetMissMonths > 0);
  }
);

Then(
  "the retirement outcome should be labelled {string}",
  function (this: ProductAcceptanceWorld, expectedLabel: string) {
    const result = this.comparisonResults?.[0];
    assertCondition(result, "Expected a comparison result");
    assertEqual(buildRetirementOutcomeBanner(result).label, expectedLabel);
  }
);

Then(
  "the plan status should be {string}",
  function (this: ProductAcceptanceWorld, expectedStatus: string) {
    const result = this.comparisonResults?.[0];
    assertCondition(result, "Expected a comparison result");
    const status = buildComparisonStatusItems(result).find(
      (item) => item.label === "Overall status"
    );
    assertEqual(status?.value, expectedStatus);
  }
);

Then(
  "the first projected annual shortfall should be {float}",
  function (this: ProductAcceptanceWorld, expectedShortfall: number) {
    const result = this.comparisonResults?.[0];
    assertCondition(result, "Expected a comparison result");
    assertEqual(
      result.assessment.firstShortfallAnnualAmount,
      expectedShortfall
    );
  }
);

Then(
  "the retirement outcome should explain that the State Pension is unconfirmed",
  function (this: ProductAcceptanceWorld) {
    const result = this.comparisonResults?.[0];
    assertCondition(result, "Expected a comparison result");
    const warning = buildRetirementOutcomeBanner(result).warning;
    assertCondition(
      warning?.heading === "State Pension amount not confirmed" &&
        warning.message.includes("assumed State Pension")
    );
  }
);

Then(
  "the retirement outcome should explain that the target remains met without State Pension",
  function (this: ProductAcceptanceWorld) {
    const result = this.comparisonResults?.[0];
    assertCondition(result, "Expected a comparison result");
    assertCondition(
      buildRetirementOutcomeBanner(result).warning?.message.includes(
        "target is still met if this income is excluded"
      )
    );
  }
);

Then(
  "the retirement outcome should not mention unused bridge withdrawals",
  function (this: ProductAcceptanceWorld) {
    const result = this.comparisonResults?.[0];
    assertCondition(result, "Expected a comparison result");
    const banner = buildRetirementOutcomeBanner(result);
    assertCondition(
      !banner.message.toLowerCase().includes("bridge withdrawal"),
      `Expected the outcome to omit unused bridge withdrawals, received: ${banner.message}`
    );
  }
);

Then(
  "pensionable earnings should not have a pre-filled amount",
  function (this: ProductAcceptanceWorld) {
    assertEqual(getSettings(this).pensionableEarnings, 0);
  }
);

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
  "Income Tax modelling should be on",
  function (this: ProductAcceptanceWorld) {
    assertEqual(getSettings(this).taxationEnabled, true);
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

Given(
  "the results chart has these income sources:",
  function (this: ProductAcceptanceWorld, table: DataTable) {
    this.chartLegendSources = table.hashes().map((row) => ({
      key: row.source ?? "",
      enabled: row.enabled === "yes",
      active: row.active === "yes",
    }));
  }
);

When(
  "the chart key is prepared without hiding inactive enabled sources",
  function (this: ProductAcceptanceWorld) {
    assertCondition(
      this.chartLegendSources,
      "No results chart income sources have been provided"
    );
    this.chartLegendKeys = selectRetirementChartLegendKeys(
      this.chartLegendSources,
      false
    );
  }
);

Then(
  "the chart key should include {string}",
  function (this: ProductAcceptanceWorld, source: string) {
    assertCondition(
      this.chartLegendKeys?.includes(source),
      `Expected the chart key to include ${source}`
    );
  }
);

Then(
  "the chart key should not include {string}",
  function (this: ProductAcceptanceWorld, source: string) {
    assertCondition(
      !this.chartLegendKeys?.includes(source),
      `Expected the chart key not to include ${source}`
    );
  }
);

When(
  "retirement income chart titles are prepared",
  function (this: ProductAcceptanceWorld) {
    this.standardChartTitle = getRetirementIncomeChartTitle(false);
    this.simpleChartTitle = getRetirementIncomeChartTitle(true);
  }
);

Then(
  "the standard results chart title should be {string}",
  function (this: ProductAcceptanceWorld, expectedTitle: string) {
    assertEqual(this.standardChartTitle, expectedTitle);
  }
);

Then(
  "the simple results chart title should be {string}",
  function (this: ProductAcceptanceWorld, expectedTitle: string) {
    assertEqual(this.simpleChartTitle, expectedTitle);
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
    (step): step is JourneyAnswerStep => step.kind === "results"
  );

  assertCondition(answerStep, "Journey answer step was not found");

  return answerStep;
}

function hasResultSection(
  step: JourneyAnswerStep,
  sectionId: JourneyAnswerStep["sections"][number]["id"]
) {
  return step.sections.some((section) => section.id === sectionId);
}
