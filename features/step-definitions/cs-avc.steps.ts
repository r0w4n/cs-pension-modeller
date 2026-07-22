import { Given, Then, When } from "@cucumber/cucumber";
import { fieldGroups } from "../../src/fieldDefinitions";
import {
  createProjectionTable,
  generatePensionSummary,
  generateRetirementBridgeAnalysis,
  prepareBridgeProjectionSettings,
  type ProjectionRow,
  type RetirementBridgeAnalysis,
  type PensionSummary,
} from "../../src/projection";
import {
  calculateCsAvcPotAtDate,
  calculateTotalCsAvcContributions,
} from "../../src/projection-domains/cs-avc";
import { calculateMonthlyIncomeTax } from "../../src/projection-domains/tax";
import {
  calculateNormalPensionAge,
  calculateStatePensionDrawDate,
  createDefaultSettings,
  loadStoredSettings,
  saveLocalStoragePreference,
  saveSettings,
  validateSettings,
  type PensionSettings,
} from "../../src/settings";

type CsAvcWorld = {
  settings?: PensionSettings;
  loadedSettings?: PensionSettings;
  rows?: ProjectionRow[];
  baselineRows?: ProjectionRow[];
  projectedBalance?: number;
  projectedContributions?: number;
  employerContributionAdded?: number;
  monthlyAlphaIncome?: number;
  monthlyStatePensionIncome?: number;
  monthlyCsAvcIncome?: number;
  monthlyTax?: number;
  monthlyTaxWithoutCsAvc?: number;
  taxableCsAvcIncome?: number;
  bridgeAnalysis?: RetirementBridgeAnalysis;
  bridgeAnalysisWithoutCsAvc?: RetirementBridgeAnalysis;
  summary?: PensionSummary;
  copy?: string;
};

type MemoryStorage = Storage & {
  snapshot: () => Record<string, string>;
};

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

function createCsAvcScenarioSettings(
  dateOfBirth = "1980-01-01"
): PensionSettings {
  const normalPensionAge = calculateNormalPensionAge(dateOfBirth);

  return {
    ...createDefaultSettings(),
    startDate: "2026-01-01",
    dateOfBirth,
    normalPensionAge,
    lifeExpectancy: 90,
    requirementAge: 57,
    projectionBasis: "nominal",
    inflationRateAnnual: 0,
    showAlpha: false,
    showClassic: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: false,
    showStatePension: false,
    showSipp: false,
    showCsAvc: true,
    showIsa: false,
    showLisa: false,
    showAdditionalGuaranteedIncome: false,
    taxationEnabled: false,
    desiredRetirementIncome: 0,
    csAvcCurrentPot: 0,
    csAvcMonthlyContribution: 0,
    csAvcDrawAge: 75,
    csAvcRealInterestPercent: 0,
    csAvcWithdrawalStrategy: "percentage",
    csAvcWithdrawalPercent: 4,
    csAvcWithdrawalTargetAge: 85,
    alphaAddedPensionMonthly: 0,
    alphaPensionAbsDate: "2025",
    pensionableEarnings: 0,
  };
}

function getSettings(world: CsAvcWorld) {
  if (!world.settings) {
    world.settings = createCsAvcScenarioSettings();
  }

  return world.settings;
}

function updateSettings(world: CsAvcWorld, updates: Partial<PensionSettings>) {
  world.settings = {
    ...getSettings(world),
    ...updates,
  };
}

function addMonths(date: string, monthCount: number) {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1 + monthCount, day));

  return nextDate.toISOString().slice(0, 10);
}

function addYears(date: string, years: number) {
  return addMonths(date, Math.round(years * 12));
}

function getCsAvcDrawAgeIssue(settings: PensionSettings) {
  return validateSettings(settings).find(
    (issue) => issue.field === "csAvcDrawAge"
  );
}

function getFirstCsAvcWithdrawalRow(rows: ProjectionRow[]) {
  return rows.find((row) => row.monthlyCsAvcPension > 0);
}

function getFirstAlphaIncomeRow(rows: ProjectionRow[]) {
  return rows.find((row) => row.monthlyAlphaPensionGross > 0);
}

function projectCsAvcForMonths(world: CsAvcWorld, monthCount: number) {
  const settings = getSettings(world);
  const rowDate = addMonths(settings.startDate, monthCount - 1);
  const contributionEndDate = addMonths(settings.startDate, monthCount);
  const drawDate = addYears(settings.dateOfBirth, settings.csAvcDrawAge);

  world.projectedBalance = calculateCsAvcPotAtDate({
    settings,
    rowDate,
    drawDate,
  });
  world.projectedContributions = calculateTotalCsAvcContributions(
    settings,
    contributionEndDate
  );
  world.employerContributionAdded = 0;
}

function createCsAvcBridgeSettings(world: CsAvcWorld): PensionSettings {
  return {
    ...getSettings(world),
    startDate: "2026-01-01",
    dateOfBirth: "1971-01-01",
    normalPensionAge: 67,
    lifeExpectancy: 68,
    requirementAge: 57,
    showAlpha: true,
    alphaPensionAbsDate: "2026",
    alphaPensionDrawAge: 67,
    alphaPensionLeaveAge: 57,
    accruedPensionAtLastAbs: 18_000,
    pensionableEarnings: 0,
    showStatePension: true,
    currentStatePension: 12_000,
    statePensionDrawDate: "2038-01-01",
    showCsAvc: true,
    csAvcCurrentPot: 50_000,
    csAvcMonthlyContribution: 0,
    csAvcDrawAge: 57,
    csAvcWithdrawalStrategy: "use_by_age",
    csAvcWithdrawalTargetAge: 67,
    showSipp: false,
    showIsa: false,
    showLisa: false,
    desiredRetirementIncome: 24_000,
  };
}

function getFieldText(groupId: string, fieldId: string) {
  const field = fieldGroups
    .find((group) => group.id === groupId)
    ?.fields.find((candidate) => candidate.id === fieldId);

  assertCondition(field, `Expected ${groupId}.${fieldId} to exist`);

  return `${field.label} ${field.description}`;
}

Given("a default CS AVC modelling scenario", function (this: CsAvcWorld) {
  this.settings = createCsAvcScenarioSettings();
});

Given(
  "a CS AVC modelling scenario for someone born on {string}",
  function (this: CsAvcWorld, dateOfBirth: string) {
    this.settings = createCsAvcScenarioSettings(dateOfBirth);
  }
);

Given(
  "provider-confirmed CS AVC protected pension age is off",
  function (this: CsAvcWorld) {
    updateSettings(this, {
      csAvcHasProtectedPensionAge: false,
    });
  }
);

Given(
  "provider-confirmed CS AVC protected access is on",
  function (this: CsAvcWorld) {
    updateSettings(this, {
      csAvcHasProtectedPensionAge: true,
      csAvcProtectedPensionAge: 50,
      csAvcCurrentPot: getSettings(this).csAvcCurrentPot || 120_000,
      csAvcWithdrawalStrategy: "percentage",
      csAvcWithdrawalPercent: 12,
    });
  }
);

Given(
  "the CS AVC member has alpha pension of {float} per year",
  function (this: CsAvcWorld, annualAlphaPension: number) {
    updateSettings(this, {
      showAlpha: true,
      alphaPensionAbsDate: "2025",
      alphaPensionDrawAge: 67,
      alphaPensionLeaveAge: getSettings(this).requirementAge,
      accruedPensionAtLastAbs: annualAlphaPension,
      pensionableEarnings: 0,
    });
  }
);

Given(
  "the CS AVC member has State Pension of {float} per year",
  function (this: CsAvcWorld, annualStatePension: number) {
    updateSettings(this, {
      showStatePension: true,
      currentStatePension: annualStatePension,
      statePensionDrawDate: calculateStatePensionDrawDate(
        getSettings(this).dateOfBirth
      ),
    });
  }
);

Given(
  "the member has a CS AVC balance of {float}",
  function (this: CsAvcWorld, csAvcCurrentPot: number) {
    updateSettings(this, {
      showCsAvc: true,
      csAvcCurrentPot,
    });
  }
);

Given(
  "the member pays CS AVC contributions of {float} per month",
  function (this: CsAvcWorld, csAvcMonthlyContribution: number) {
    updateSettings(this, {
      showCsAvc: true,
      csAvcMonthlyContribution,
    });
  }
);

Given(
  "the annual CS AVC net investment return assumption is {float}%",
  function (this: CsAvcWorld, csAvcRealInterestPercent: number) {
    updateSettings(this, {
      csAvcRealInterestPercent,
      inflationRateAnnual: 0,
      projectionBasis: "nominal",
    });
  }
);

Given(
  "the employer Civil Service pension contribution rate is {float}%",
  function (this: CsAvcWorld, _employerContributionRate: number) {
    this.employerContributionAdded = 0;
  }
);

Given(
  "the CS AVC member has alpha normal pension age {int}",
  function (this: CsAvcWorld, normalPensionAge: number) {
    updateSettings(this, { normalPensionAge });
  }
);

Given(
  "the member draws CS AVC from age {int}",
  function (this: CsAvcWorld, csAvcDrawAge: number) {
    updateSettings(this, {
      showCsAvc: true,
      csAvcDrawAge,
      csAvcWithdrawalStrategy: "percentage",
      csAvcWithdrawalPercent: 10,
    });
  }
);

Given(
  "the CS AVC member draws alpha pension from age {int}",
  function (this: CsAvcWorld, alphaPensionDrawAge: number) {
    updateSettings(this, {
      showAlpha: true,
      alphaPensionDrawAge,
      alphaPensionLeaveAge: getSettings(this).requirementAge,
      accruedPensionAtLastAbs:
        getSettings(this).accruedPensionAtLastAbs || 12_000,
      pensionableEarnings: 0,
    });
  }
);

Given("CS AVC Income Tax modelling is on", function (this: CsAvcWorld) {
  updateSettings(this, { taxationEnabled: true });
});

Given(
  "the CS AVC tax-free withdrawal share is {float}%",
  function (this: CsAvcWorld, taxCsAvcTaxFreeWithdrawalPercent: number) {
    updateSettings(this, { taxCsAvcTaxFreeWithdrawalPercent });
  }
);

Given(
  "CS AVC monthly Alpha pension income is {float}",
  function (this: CsAvcWorld, monthlyAlphaIncome: number) {
    this.monthlyAlphaIncome = monthlyAlphaIncome;
  }
);

Given(
  "CS AVC monthly State Pension income is {float}",
  function (this: CsAvcWorld, monthlyStatePensionIncome: number) {
    this.monthlyStatePensionIncome = monthlyStatePensionIncome;
  }
);

Given(
  "monthly CS AVC withdrawal income is {float}",
  function (this: CsAvcWorld, monthlyCsAvcIncome: number) {
    this.monthlyCsAvcIncome = monthlyCsAvcIncome;
  }
);

Given(
  "the CS AVC bridge plan has Alpha pension of {float} per year from age {int}",
  function (
    this: CsAvcWorld,
    annualAlphaPension: number,
    alphaPensionDrawAge: number
  ) {
    this.settings = createCsAvcBridgeSettings(this);
    updateSettings(this, {
      accruedPensionAtLastAbs: annualAlphaPension,
      alphaPensionDrawAge,
      alphaPensionLeaveAge: getSettings(this).requirementAge,
    });
  }
);

Given(
  "the CS AVC bridge plan has State Pension of {float} per year from age {int}",
  function (
    this: CsAvcWorld,
    annualStatePension: number,
    statePensionAge: number
  ) {
    updateSettings(this, {
      showStatePension: true,
      currentStatePension: annualStatePension,
      statePensionDrawDate: addYears(
        getSettings(this).dateOfBirth,
        statePensionAge
      ),
    });
  }
);

Given(
  "the CS AVC bridge plan has a CS AVC balance of {float}",
  function (this: CsAvcWorld, csAvcCurrentPot: number) {
    updateSettings(this, {
      showCsAvc: true,
      csAvcCurrentPot,
      csAvcMonthlyContribution: 0,
      csAvcDrawAge: getSettings(this).requirementAge,
      csAvcWithdrawalStrategy: "use_by_age",
      csAvcWithdrawalTargetAge: getSettings(this).alphaPensionDrawAge,
    });
  }
);

Given(
  "the CS AVC bridge retirement age is {int}",
  function (this: CsAvcWorld, requirementAge: number) {
    updateSettings(this, {
      requirementAge,
      csAvcDrawAge: requirementAge,
      alphaPensionLeaveAge: requirementAge,
    });
  }
);

Given(
  "the CS AVC bridge life expectancy age is {int}",
  function (this: CsAvcWorld, lifeExpectancy: number) {
    updateSettings(this, { lifeExpectancy });
  }
);

Given(
  "the CS AVC bridge target income is {float} per year",
  function (this: CsAvcWorld, desiredRetirementIncome: number) {
    updateSettings(this, { desiredRetirementIncome });
  }
);

Given(
  "the member has planned CS AVC withdrawals of {float} per year",
  function (this: CsAvcWorld, annualCsAvcWithdrawal: number) {
    updateSettings(this, {
      showCsAvc: true,
      csAvcCurrentPot: 60_000,
      csAvcDrawAge: 67,
      csAvcWithdrawalStrategy: "percentage",
      csAvcWithdrawalPercent: (annualCsAvcWithdrawal / 60_000) * 100,
    });
  }
);

Given("local storage is enabled for CS AVC", function () {
  installLocalStorage();
  saveLocalStoragePreference(true);
});

When("the CS AVC settings group is inspected", function (this: CsAvcWorld) {
  const group = fieldGroups.find((candidate) => candidate.id === "cs-avc");
  assertCondition(group, "Expected CS AVC settings group");
});

When(
  "the Civil Service pension projection is calculated for CS AVC",
  function (this: CsAvcWorld) {
    const settings = getSettings(this);

    this.rows = createProjectionTable(settings);
    this.baselineRows = createProjectionTable({
      ...settings,
      showCsAvc: false,
      csAvcCurrentPot: 0,
      csAvcMonthlyContribution: 0,
    });
  }
);

When(
  "the CS AVC pot is projected for {int} months",
  function (this: CsAvcWorld, monthCount: number) {
    projectCsAvcForMonths(this, monthCount);
  }
);

When(
  "the CS AVC pot is projected for {int} years",
  function (this: CsAvcWorld, yearCount: number) {
    projectCsAvcForMonths(this, yearCount * 12);
  }
);

When(
  "the CS AVC draw start age is {int}",
  function (this: CsAvcWorld, csAvcDrawAge: number) {
    updateSettings(this, { csAvcDrawAge });
  }
);

When(
  "the retirement income projection is calculated for CS AVC",
  function (this: CsAvcWorld) {
    this.rows = createProjectionTable(getSettings(this));
  }
);

When(
  "monthly Income Tax is calculated for CS AVC",
  function (this: CsAvcWorld) {
    const settings = getSettings(this);
    const monthlyAlphaPension = this.monthlyAlphaIncome ?? 0;
    const monthlyStatePension = this.monthlyStatePensionIncome ?? 0;
    const monthlyCsAvcPension = this.monthlyCsAvcIncome ?? 0;

    this.taxableCsAvcIncome =
      monthlyCsAvcPension *
      (1 - settings.taxCsAvcTaxFreeWithdrawalPercent / 100);
    this.monthlyTax = calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension,
      monthlyStatePension,
      monthlySippPension: 0,
      monthlyCsAvcPension,
    });
    this.monthlyTaxWithoutCsAvc = calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension,
      monthlyStatePension,
      monthlySippPension: 0,
      monthlyCsAvcPension: 0,
    });
  }
);

When("the CS AVC bridge plan is analysed", function (this: CsAvcWorld) {
  const bridgeSettings = prepareBridgeProjectionSettings(getSettings(this));
  const pensionRows = createProjectionTable(bridgeSettings);
  const settingsWithoutCsAvc = {
    ...bridgeSettings,
    showCsAvc: false,
    csAvcCurrentPot: 0,
  };

  this.settings = bridgeSettings;
  this.bridgeAnalysis = generateRetirementBridgeAnalysis(
    pensionRows,
    bridgeSettings
  );
  this.bridgeAnalysisWithoutCsAvc = generateRetirementBridgeAnalysis(
    createProjectionTable(settingsWithoutCsAvc),
    settingsWithoutCsAvc
  );
});

When(
  "the retirement income summary is generated for CS AVC",
  function (this: CsAvcWorld) {
    const rows = createProjectionTable(getSettings(this));

    this.rows = rows;
    this.summary = generatePensionSummary(rows, getSettings(this));
  }
);

When("the CS AVC settings are saved and loaded", function (this: CsAvcWorld) {
  saveSettings(getSettings(this));
  this.loadedSettings = loadStoredSettings();
});

When("the CS AVC user-facing copy is inspected", function (this: CsAvcWorld) {
  const csAvcGroup = fieldGroups.find((group) => group.id === "cs-avc");

  assertCondition(csAvcGroup, "Expected CS AVC field group");
  this.copy = [
    csAvcGroup.title,
    csAvcGroup.description,
    ...csAvcGroup.fields.map((field) => `${field.label} ${field.description}`),
  ].join(" ");
});

Then(
  "the CS AVC group should be titled {string}",
  function (expectedTitle: string) {
    const group = fieldGroups.find((candidate) => candidate.id === "cs-avc");

    assertEqual(group?.title, expectedTitle);
  }
);

Then(
  "the CS AVC current pot field should explain it is a separate invested defined contribution pot",
  function () {
    const text = getFieldText("cs-avc", "csAvcCurrentPot").toLowerCase();

    assertCondition(
      text.includes("separate invested defined contribution pot")
    );
  }
);

Then(
  "the CS AVC current pot field should not describe alpha, classic, premium or nuvos accrual",
  function () {
    const text = getFieldText("cs-avc", "csAvcCurrentPot").toLowerCase();

    assertCondition(!text.includes("increase alpha"));
    assertCondition(
      text.includes("not as alpha, classic, premium or nuvos pension accrual")
    );
  }
);

Then(
  "the alpha pension projection should match the same scenario without CS AVC",
  function (this: CsAvcWorld) {
    assertCondition(this.rows, "Expected CS AVC projection rows");
    assertCondition(this.baselineRows, "Expected baseline projection rows");

    const csAvcAlphaRow = getFirstAlphaIncomeRow(this.rows);
    const baselineAlphaRow = getFirstAlphaIncomeRow(this.baselineRows);

    assertCondition(csAvcAlphaRow, "Expected alpha income with CS AVC");
    assertCondition(baselineAlphaRow, "Expected alpha income without CS AVC");
    assertClose(
      csAvcAlphaRow.annualAlphaPensionIncludingReduction,
      baselineAlphaRow.annualAlphaPensionIncludingReduction,
      6
    );
  }
);

Then(
  "the CS AVC balance should be shown separately from Civil Service pension payable",
  function (this: CsAvcWorld) {
    const row = this.rows?.find((candidate) => candidate.csAvcPot > 0);

    assertCondition(row, "Expected a row with CS AVC balance");
    assertCondition(row.csAvcPot > 0);
  }
);

Then(
  "the projected CS AVC balance should be {float}",
  function (this: CsAvcWorld, expectedBalance: number) {
    assertCondition(this.projectedBalance !== undefined, "Expected projection");
    assertClose(this.projectedBalance, expectedBalance);
  }
);

Then(
  "the total CS AVC contributions paid should be {float}",
  function (this: CsAvcWorld, expectedContributions: number) {
    assertCondition(
      this.projectedContributions !== undefined,
      "Expected projected contributions"
    );
    assertClose(this.projectedContributions, expectedContributions);
  }
);

Then(
  "the projected CS AVC balance should include member CS AVC contributions only",
  function (this: CsAvcWorld) {
    const settings = getSettings(this);
    assertCondition(this.projectedBalance !== undefined, "Expected projection");
    assertCondition(
      this.projectedContributions !== undefined,
      "Expected projected contributions"
    );
    assertClose(
      this.projectedBalance,
      settings.csAvcCurrentPot + this.projectedContributions
    );
  }
);

Then(
  "the employer contribution added to the CS AVC pot should be {float}",
  function (this: CsAvcWorld, expectedEmployerContribution: number) {
    assertClose(
      this.employerContributionAdded ?? 0,
      expectedEmployerContribution
    );
  }
);

Then(
  "CS AVC draw start age validation should pass",
  function (this: CsAvcWorld) {
    assertEqual(getCsAvcDrawAgeIssue(getSettings(this)), undefined);
  }
);

Then(
  "the CS AVC draw start age validation message should be {string}",
  function (this: CsAvcWorld, expectedMessage: string) {
    const issue = getCsAvcDrawAgeIssue(getSettings(this));

    assertCondition(issue, "Expected a CS AVC draw age validation issue");
    assertEqual(issue.message, expectedMessage);
  }
);

Then(
  "the CS AVC projection should start withdrawals at age {int}",
  function (this: CsAvcWorld, expectedAge: number) {
    const firstWithdrawalRow = getFirstCsAvcWithdrawalRow(
      createProjectionTable(getSettings(this))
    );

    assertCondition(firstWithdrawalRow, "Expected CS AVC withdrawals to start");
    assertEqual(firstWithdrawalRow.age, expectedAge);
  }
);

Then(
  "CS AVC income should be available from age {int}",
  function (this: CsAvcWorld, expectedAge: number) {
    const firstWithdrawalRow = getFirstCsAvcWithdrawalRow(this.rows ?? []);

    assertCondition(firstWithdrawalRow, "Expected CS AVC income");
    assertEqual(firstWithdrawalRow.age, expectedAge);
  }
);

Then(
  "CS AVC scenario alpha pension income should start at age {int}",
  function (this: CsAvcWorld, expectedAge: number) {
    const firstAlphaRow = getFirstAlphaIncomeRow(this.rows ?? []);

    assertCondition(firstAlphaRow, "Expected alpha income");
    assertEqual(firstAlphaRow.age, expectedAge);
  }
);

Then(
  "only {float} of monthly CS AVC withdrawal income should be taxable",
  function (this: CsAvcWorld, expectedTaxableIncome: number) {
    assertCondition(
      this.taxableCsAvcIncome !== undefined,
      "Expected tax input"
    );
    assertClose(this.taxableCsAvcIncome, expectedTaxableIncome);
  }
);

Then(
  "the monthly Income Tax estimate should include taxable CS AVC income",
  function (this: CsAvcWorld) {
    assertCondition(this.monthlyTax !== undefined, "Expected tax result");
    assertCondition(
      this.monthlyTaxWithoutCsAvc !== undefined,
      "Expected tax baseline result"
    );
    assertCondition(this.monthlyTax > this.monthlyTaxWithoutCsAvc);
  }
);

Then(
  "at least one CS AVC bridge phase should include {string}",
  function (this: CsAvcWorld, expectedSource: string) {
    assertCondition(this.bridgeAnalysis, "Expected bridge analysis");
    assertCondition(
      this.bridgeAnalysis.phases.some((phase) =>
        phase.potUsed.includes(expectedSource)
      ),
      `Expected a bridge phase to include ${expectedSource}`
    );
  }
);

Then(
  "the unfunded bridge shortfall should be lower than the same plan without CS AVC",
  function (this: CsAvcWorld) {
    assertCondition(this.bridgeAnalysis, "Expected bridge analysis");
    assertCondition(
      this.bridgeAnalysisWithoutCsAvc,
      "Expected baseline bridge analysis"
    );
    assertCondition(
      this.bridgeAnalysis.totalUnfundedShortfall <
        this.bridgeAnalysisWithoutCsAvc.totalUnfundedShortfall
    );
  }
);

Then(
  "stable annual secure income should include alpha pension and State Pension",
  function (this: CsAvcWorld) {
    const sources = this.summary?.retirementIncome.sources ?? [];

    assertCondition(sources.some((source) => source.key === "alpha"));
    assertCondition(sources.some((source) => source.key === "statePension"));
  }
);

Then(
  "flexible pension income should include CS AVC withdrawals",
  function (this: CsAvcWorld) {
    const source = this.summary?.retirementIncome.sources.find(
      (candidate) => candidate.key === "csAvc"
    );

    assertCondition(source, "Expected CS AVC retirement income source");
    assertCondition(source.annualIncome > 0);
  }
);

Then(
  "stable annual secure income should not include CS AVC withdrawals",
  function (this: CsAvcWorld) {
    const sources = this.summary?.retirementIncome.sources ?? [];
    const secureAnnualIncome = sources
      .filter(
        (source) => source.key === "alpha" || source.key === "statePension"
      )
      .reduce((total, source) => total + source.annualIncome, 0);
    const allAnnualIncome = sources.reduce(
      (total, source) => total + source.annualIncome,
      0
    );

    assertCondition(allAnnualIncome > secureAnnualIncome);
  }
);

Then(
  "the loaded CS AVC settings should include a balance of {float}",
  function (this: CsAvcWorld, expectedBalance: number) {
    assertCondition(this.loadedSettings, "Expected loaded settings");
    assertClose(this.loadedSettings.csAvcCurrentPot, expectedBalance);
  }
);

Then(
  "the loaded CS AVC settings should include monthly contributions of {float}",
  function (this: CsAvcWorld, expectedContribution: number) {
    assertCondition(this.loadedSettings, "Expected loaded settings");
    assertClose(
      this.loadedSettings.csAvcMonthlyContribution,
      expectedContribution
    );
  }
);

Then(
  "no CS AVC financial information should be transmitted externally",
  function () {
    const testGlobal = globalThis as typeof globalThis & {
      window?: { localStorage?: MemoryStorage };
    };
    const storage = testGlobal.window?.localStorage;

    assertCondition(storage && "snapshot" in storage, "Expected local storage");
    assertCondition(Object.keys(storage.snapshot()).length > 0);
  }
);

Then(
  "the CS AVC copy should include {string}",
  function (this: CsAvcWorld, expectedText: string) {
    assertCondition(this.copy, "Expected CS AVC copy");
    assertCondition(
      this.copy.includes(expectedText),
      `Expected copy to include ${expectedText}`
    );
  }
);

Then(
  "the CS AVC copy should not include {string}",
  function (this: CsAvcWorld, unexpectedText: string) {
    assertCondition(this.copy, "Expected CS AVC copy");
    assertCondition(
      !this.copy.includes(unexpectedText),
      `Expected copy not to include ${unexpectedText}`
    );
  }
);

Then(
  "the CS AVC copy should not imply the modeller is an official Civil Service Pension Scheme calculator",
  function (this: CsAvcWorld) {
    assertCondition(this.copy, "Expected CS AVC copy");
    assertCondition(
      !this.copy.toLowerCase().includes("official civil service")
    );
  }
);
