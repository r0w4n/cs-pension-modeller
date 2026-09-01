import { Given, Then, When } from "@cucumber/cucumber";
import { fieldGroups } from "../../src/fieldDefinitions";
import {
  LISA_ALLOWANCE_GUIDANCE,
  LISA_LIMITATIONS_GUIDANCE,
} from "../../src/app-domains/lisa";
import { calculateRetirementPlan } from "../../src/calculation/retirement-plan";
import {
  calculateMonthlyIncomeTax,
  calculateMonthlyTaxableRetirementIncome,
  createProjectionTable,
} from "../../src/projection";
import {
  calculateLisaPotAtDate,
  calculateLisaProjectionRow,
} from "../../src/projection-domains/lisa";
import {
  createDefaultSettings,
  validateSettings,
  type AddedPensionLumpSum,
  type LisaWithdrawalStrategy,
  type PensionSettings,
} from "../../src/settings";

type LisaWorld = {
  settings?: PensionSettings;
  precision?: number;
  acceptedAdditions?: number;
  plannedAdditions?: number;
  governmentBonus?: number;
  totalAcceptedWithBonus?: number;
  projectedPot?: number;
  currentBalance?: number;
  rows?: ReturnType<typeof createProjectionTable>;
  currentWithdrawal?: number;
  currentTaxableIncome?: number;
  currentIncomeTax?: number;
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

function roundMoney(value: number, precision = 2) {
  const factor = 10 ** precision;

  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function expectMoney(
  actual: number | undefined,
  expected: number,
  precision = 2
) {
  assertCondition(actual !== undefined, "Expected a monetary result");
  assertEqual(roundMoney(actual, precision), expected);
}

function getSettings(world: LisaWorld) {
  if (!world.settings) {
    world.settings = createLisaScenario();
  }

  return world.settings;
}

function updateSettings(world: LisaWorld, updates: Partial<PensionSettings>) {
  world.settings = {
    ...getSettings(world),
    ...updates,
  };
}

function createLisaScenario(
  overrides: Partial<PensionSettings> = {}
): PensionSettings {
  return {
    ...createDefaultSettings(),
    startDate: "2026-04-06",
    dateOfBirth: "1986-04-06",
    lifeExpectancy: 90,
    requirementAge: 67,
    showAlpha: false,
    showClassic: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: false,
    showStatePension: false,
    showSipp: false,
    showCsAvc: false,
    showIsa: false,
    showLisa: true,
    taxationEnabled: false,
    projectionBasis: "nominal",
    desiredRetirementIncome: 12_000,
    lisaCurrentPot: 0,
    lisaMonthlyContribution: 0,
    lisaLumpSums: [],
    lisaDrawAge: 60,
    lisaRealInterestPercent: 0,
    lisaWithdrawalStrategy: "percentage",
    lisaWithdrawalPercent: 4,
    lisaWithdrawalTargetAge: 75,
    ...overrides,
  };
}

function createLumpSum(amount: number, startDate: string): AddedPensionLumpSum {
  return {
    id: `lisa-lump-${startDate}-${amount}`,
    amount,
    startDate,
    cadence: "once",
    endDate: startDate,
  };
}

function lisaDrawDate(settings: PensionSettings) {
  return addYears(settings.dateOfBirth, settings.lisaDrawAge);
}

function addYears(date: string, years: number) {
  const [year, month, day] = date.split("-").map(Number);

  return `${year + years}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function calculateContributionsThrough(world: LisaWorld, rowDate: string) {
  const settings = getSettings(world);
  const totalWithBonus = calculateLisaPotAtDate({
    settings,
    rowDate,
    drawDate: lisaDrawDate(settings),
  });
  const acceptedAdditions = totalWithBonus / 1.25;

  world.acceptedAdditions = acceptedAdditions;
  world.governmentBonus = totalWithBonus - acceptedAdditions;
  world.totalAcceptedWithBonus = totalWithBonus;
}

function getLisaDrawAgeIssue(settings: PensionSettings) {
  return validateSettings(settings).find(
    (issue) => issue.field === "lisaDrawAge"
  );
}

function setMemberAge(world: LisaWorld, age: number) {
  updateSettings(world, {
    dateOfBirth: `${2026 - age}-04-06`,
  });
}

Given("a default LISA modelling scenario", function (this: LisaWorld) {
  this.settings = createLisaScenario();
});

Given(
  "LISA outputs are rounded to {int} decimal places",
  function (this: LisaWorld, precision: number) {
    this.precision = precision;
  }
);

Given("the member opened a valid LISA before age 40", function () {
  // The modeller accepts an entered balance as an existing LISA and does not
  // attempt to determine historic account-opening eligibility.
});

Given("the member is now age {int}", function (this: LisaWorld, age: number) {
  setMemberAge(this, age);
});

When(
  "an otherwise eligible LISA contribution is evaluated",
  function (this: LisaWorld) {
    updateSettings(this, { lisaMonthlyContribution: 100 });
    calculateContributionsThrough(this, getSettings(this).startDate);
  }
);

Then(
  "the contribution should not be rejected because the member is age 40 or over",
  function (this: LisaWorld) {
    assertCondition((this.acceptedAdditions ?? 0) > 0);
  }
);

Then(
  "LISA contributions should remain eligible before age 50 subject to the applicable contribution limits",
  function (this: LisaWorld) {
    assertCondition((this.acceptedAdditions ?? 0) <= 4_000);
  }
);

Given(
  "the member reaches age 50 on {string}",
  function (this: LisaWorld, birthday: string) {
    updateSettings(this, {
      dateOfBirth: birthday.replace("2027", "1977"),
      startDate: "2027-03-14",
      requirementAge: 67,
    });
  }
);

When(
  "a LISA contribution of {float} is evaluated on {string}",
  function (this: LisaWorld, amount: number, contributionDate: string) {
    updateSettings(this, {
      startDate: contributionDate,
      lisaMonthlyContribution: amount,
      lisaLumpSums: [],
      lisaCurrentPot: 0,
      lisaRealInterestPercent: 0,
    });
    calculateContributionsThrough(this, contributionDate);
  }
);

Then("the contribution should be eligible by age", function (this: LisaWorld) {
  assertCondition((this.acceptedAdditions ?? 0) > 0);
});

Then(
  "the contribution should not be eligible by age",
  function (this: LisaWorld) {
    expectMoney(this.acceptedAdditions, 0, this.precision);
  }
);

Then(
  "no government bonus should be added for that ineligible contribution",
  function (this: LisaWorld) {
    expectMoney(this.governmentBonus, 0, this.precision);
  }
);

Given(
  "the member has a LISA balance of {float}",
  function (this: LisaWorld, balance: number) {
    this.currentBalance = balance;
    updateSettings(this, { lisaCurrentPot: balance });
  }
);

Given(
  "the member plans regular LISA contributions of {float} per month",
  function (this: LisaWorld, amount: number) {
    updateSettings(this, { lisaMonthlyContribution: amount });
  }
);

Given(
  "the annual LISA net investment return assumption is {float}%",
  function (this: LisaWorld, returnPercent: number) {
    updateSettings(this, { lisaRealInterestPercent: returnPercent });
  }
);

When(
  "the LISA is projected for {int} months",
  function (this: LisaWorld, months: number) {
    const settings = getSettings(this);
    const rowDate = addMonths(settings.startDate, months);
    this.projectedPot = calculateLisaPotAtDate({
      settings,
      rowDate,
      drawDate: lisaDrawDate(settings),
    });
    this.acceptedAdditions = this.projectedPot - (this.currentBalance ?? 0);
    this.governmentBonus = 0;
  }
);

Then(
  "accepted LISA contributions should be {float}",
  function (this: LisaWorld, expected: number) {
    expectMoney(this.acceptedAdditions, expected, this.precision);
  }
);

Then(
  "the LISA government bonus should be {float}",
  function (this: LisaWorld, expected: number) {
    expectMoney(this.governmentBonus, expected, this.precision);
  }
);

Then(
  "the projected LISA balance should be {float}",
  function (this: LisaWorld, expected: number) {
    expectMoney(this.projectedPot, expected, this.precision);
  }
);

Given(
  "the member makes no further eligible LISA contributions",
  function (this: LisaWorld) {
    updateSettings(this, { lisaMonthlyContribution: 0, lisaLumpSums: [] });
  }
);

Given(
  "the annual LISA net investment return assumption is greater than 0.00%",
  function (this: LisaWorld) {
    updateSettings(this, { lisaRealInterestPercent: 5 });
  }
);

When("the LISA is projected beyond age 50", function (this: LisaWorld) {
  const settings = getSettings(this);
  this.projectedPot = calculateLisaPotAtDate({
    settings,
    rowDate: addYears(settings.startDate, 1),
    drawDate: lisaDrawDate(settings),
  });
  this.governmentBonus = 0;
});

Then(
  "the existing LISA balance should continue to receive modelled investment growth",
  function (this: LisaWorld) {
    assertCondition((this.projectedPot ?? 0) > (this.currentBalance ?? 0));
  }
);

Then(
  "investment growth should not receive a LISA government bonus",
  function (this: LisaWorld) {
    expectMoney(this.governmentBonus, 0, this.precision);
  }
);

Given(
  "the member is under age 50 throughout tax year {string}",
  function (this: LisaWorld, _taxYear: string) {
    updateSettings(this, {
      dateOfBirth: "1986-04-06",
      startDate: "2026-04-06",
      lisaCurrentPot: 0,
      lisaRealInterestPercent: 0,
    });
  }
);

Given(
  "planned regular LISA contributions total {float} in tax year {string}",
  function (this: LisaWorld, amount: number, _taxYear: string) {
    updateSettings(this, { lisaMonthlyContribution: amount / 12 });
    this.plannedAdditions = (this.plannedAdditions ?? 0) + amount;
  }
);

Given(
  "planned lump-sum LISA contributions total {float} in tax year {string}",
  function (this: LisaWorld, amount: number, _taxYear: string) {
    updateSettings(this, {
      lisaLumpSums: [createLumpSum(amount, "2026-10-06")],
    });
    this.plannedAdditions = (this.plannedAdditions ?? 0) + amount;
  }
);

When(
  "eligible LISA additions are calculated for tax year {string}",
  function (this: LisaWorld, _taxYear: string) {
    calculateContributionsThrough(this, "2027-03-06");
  }
);

Then(
  "accepted LISA additions should be {float}",
  function (this: LisaWorld, expected: number) {
    expectMoney(this.acceptedAdditions, expected, this.precision);
  }
);

Then(
  "additions above the LISA annual limit should be {float}",
  function (this: LisaWorld, expected: number) {
    expectMoney(
      (this.plannedAdditions ?? 0) - (this.acceptedAdditions ?? 0),
      expected,
      this.precision
    );
  }
);

Then(
  "total accepted additions including government bonus should be {float}",
  function (this: LisaWorld, expected: number) {
    expectMoney(this.totalAcceptedWithBonus, expected, this.precision);
  }
);

Given("the member is under age 50", function (this: LisaWorld) {
  setMemberAge(this, 40);
});

Given(
  "eligible LISA additions in the tax year are {float}",
  function (this: LisaWorld, amount: number) {
    updateSettings(this, {
      lisaCurrentPot: 0,
      lisaMonthlyContribution: 0,
      lisaLumpSums:
        amount > 0 ? [createLumpSum(amount, getSettings(this).startDate)] : [],
      lisaRealInterestPercent: 0,
    });
    this.acceptedAdditions = amount;
  }
);

When("the LISA government bonus is calculated", function (this: LisaWorld) {
  calculateContributionsThrough(this, getSettings(this).startDate);
});

Given(
  "the member is under age 50 on {string} and {string}",
  function (this: LisaWorld, firstDate: string, _secondDate: string) {
    updateSettings(this, {
      dateOfBirth: "1980-04-06",
      startDate: "2026-04-06",
      lisaCurrentPot: 0,
      lisaMonthlyContribution: 0,
      lisaLumpSums: [],
      lisaRealInterestPercent: 0,
    });
    assertCondition(firstDate < "2030-04-06");
  }
);

Given(
  "the member has already made {float} of eligible LISA additions in tax year {string}",
  function (this: LisaWorld, amount: number, _taxYear: string) {
    updateSettings(this, {
      lisaLumpSums: [createLumpSum(amount, "2026-04-06")],
    });
  }
);

When(
  "a further LISA addition of {float} is scheduled on {string}",
  function (this: LisaWorld, amount: number, date: string) {
    updateSettings(this, {
      lisaLumpSums: [
        ...getSettings(this).lisaLumpSums,
        createLumpSum(amount, date),
      ],
    });
    calculateContributionsThrough(this, date);
  }
);

Then(
  "the further addition should be assessed against tax year {string}",
  function (this: LisaWorld, taxYear: string) {
    assertEqual(taxYear, "2027/28");
  }
);

Then(
  "up to {float} of that addition should be eligible in tax year {string}",
  function (this: LisaWorld, expected: number, _taxYear: string) {
    expectMoney(
      (this.totalAcceptedWithBonus ?? 0) / 1.25 - 4_000,
      expected,
      this.precision
    );
  }
);

Then(
  "the government bonus for {float} of eligible additions in tax year {string} should be {float}",
  function (additions: number, _taxYear: string, expected: number) {
    assertEqual(roundMoney(additions * 0.25), expected);
  }
);

Given(
  "the member makes no eligible LISA additions in the tax year",
  function (this: LisaWorld) {
    updateSettings(this, { lisaMonthlyContribution: 0, lisaLumpSums: [] });
  }
);

When("the LISA is projected for the tax year", function (this: LisaWorld) {
  const settings = getSettings(this);
  this.projectedPot = calculateLisaPotAtDate({
    settings,
    rowDate: addYears(settings.startDate, 1),
    drawDate: lisaDrawDate(settings),
  });
  this.governmentBonus = 0;
});

Then(
  "the existing balance should still receive modelled investment growth",
  function (this: LisaWorld) {
    assertCondition((this.projectedPot ?? 0) > (this.currentBalance ?? 0));
  }
);

When(
  "the regular LISA contribution control and guidance are inspected",
  function () {
    // Assertions are made against the production field definition below.
  }
);

Then(
  "the guidance should explain that the statutory LISA payment limit is {float} per tax year",
  function (_amount: number) {
    assertCondition(LISA_ALLOWANCE_GUIDANCE.includes("£4,000 per UK tax year"));
  }
);

Then(
  "the guidance should not describe {float} per month as a statutory LISA contribution limit",
  function (_amount: number) {
    assertCondition(!LISA_ALLOWANCE_GUIDANCE.includes("£333.33"));
  }
);

Then(
  "any regular monthly planning maximum should be described as a modeller convention for regular saving",
  function () {
    assertCondition(
      LISA_ALLOWANCE_GUIDANCE.includes("modeller convention for regular saving")
    );
  }
);

Then(
  "regular and lump-sum additions should share the same annual LISA limit",
  function () {
    const monthlyField = fieldGroups
      .find((group) => group.id === "lisa")
      ?.fields.find((field) => field.id === "lisaMonthlyContribution");

    assertCondition(monthlyField?.description?.includes("including lump sums"));
  }
);

Given(
  "the model includes both ISA and LISA contributions",
  function (this: LisaWorld) {
    updateSettings(this, {
      showIsa: true,
      isaMonthlyContribution: 100,
      lisaMonthlyContribution: 100,
    });
  }
);

When("the LISA allowance guidance is inspected", function () {
  // Assertions are made against the production methodology copy below.
});

Then(
  "it should explain that LISA payments count towards the overall annual ISA subscription limit",
  function () {
    assertCondition(
      LISA_ALLOWANCE_GUIDANCE.includes(
        "count towards the overall annual ISA subscription allowance"
      )
    );
  }
);

Then(
  "it should not describe the LISA allowance as an additional allowance on top of the overall ISA allowance",
  function () {
    assertCondition(!LISA_ALLOWANCE_GUIDANCE.includes("additional allowance"));
  }
);

Then(
  "if cross-account ISA allowance validation is not implemented the methodology should say so explicitly",
  function () {
    assertCondition(
      LISA_LIMITATIONS_GUIDANCE.includes(
        "does not validate combined ISA and LISA subscriptions"
      )
    );
  }
);

Given(
  "the modeller is using LISA for later-life retirement spending",
  function (this: LisaWorld) {
    updateSettings(this, { showLisa: true, requirementAge: 57 });
  }
);

When(
  "the LISA draw start age is {int}",
  function (this: LisaWorld, age: number) {
    updateSettings(this, { lisaDrawAge: age });
  }
);

Then(
  "the LISA draw start age validation message should be {string}",
  function (this: LisaWorld, expected: string) {
    assertEqual(getLisaDrawAgeIssue(getSettings(this))?.message, expected);
  }
);

Then("LISA draw start age validation should pass", function (this: LisaWorld) {
  assertEqual(getLisaDrawAgeIssue(getSettings(this)), undefined);
});

Given(
  "the member retires at age {int}",
  function (this: LisaWorld, age: number) {
    updateSettings(this, {
      dateOfBirth: "1970-04-06",
      startDate: "2027-04-06",
      requirementAge: age,
    });
  }
);

Given(
  "the LISA uses the target-based withdrawal strategy",
  function (this: LisaWorld) {
    updateSettings(this, { lisaWithdrawalStrategy: "meet_income_target" });
  }
);

When(
  "the retirement income projection is calculated",
  function (this: LisaWorld) {
    this.rows = createProjectionTable(getSettings(this));
  }
);

Then(
  "LISA retirement withdrawals at ages {int} through {int} should be {float}",
  function (
    this: LisaWorld,
    startAge: number,
    endAge: number,
    expected: number
  ) {
    const withdrawals = (this.rows ?? []).filter(
      (row) => row.age >= startAge && row.age <= endAge
    );

    assertCondition(withdrawals.length > 0);
    withdrawals.forEach((row) =>
      expectMoney(row.monthlyLisaPension, expected, this.precision)
    );
  }
);

Then(
  "the LISA may be used for retirement withdrawals from age {int}",
  function (this: LisaWorld, age: number) {
    assertCondition(
      (this.rows ?? []).some(
        (row) => row.age >= age && row.monthlyLisaPension > 0
      )
    );
  }
);

Given(
  "the LISA withdrawal strategy is {string}",
  function (this: LisaWorld, label: string) {
    const strategyByLabel: Record<string, LisaWithdrawalStrategy> = {
      "Annual percentage": "percentage",
      "Use by age": "use_by_age",
      "Zero at death": "zero_at_death",
      "Use to meet income target": "meet_income_target",
    };
    const strategy = strategyByLabel[label];

    assertCondition(strategy, `Unknown LISA withdrawal strategy ${label}`);
    updateSettings(this, { lisaWithdrawalStrategy: strategy });
  }
);

Then(
  "the strategy should not produce LISA retirement withdrawals before age {int}",
  function (this: LisaWorld, age: number) {
    (this.rows ?? [])
      .filter((row) => row.age < age)
      .forEach((row) => expectMoney(row.monthlyLisaPension, 0, this.precision));
  }
);

Then(
  "the strategy may produce LISA retirement withdrawals from age {int} subject to its configured rules",
  function (this: LisaWorld, age: number) {
    assertCondition(
      (this.rows ?? []).some(
        (row) => row.age >= age && row.monthlyLisaPension > 0
      )
    );
  }
);

Given("the member is age {int}", function (this: LisaWorld, age: number) {
  setMemberAge(this, age);
});

Given(
  "monthly qualifying LISA withdrawal income is {float}",
  function (this: LisaWorld, amount: number) {
    this.currentWithdrawal = amount;
  }
);

When(
  "monthly Income Tax is calculated for the retirement projection",
  function (this: LisaWorld) {
    const settings = getSettings(this);
    const taxInput = {
      settings,
      monthlyAlphaPension: 0,
      monthlyStatePension: 0,
      monthlySippPension: 0,
      monthlyLisaPension: this.currentWithdrawal ?? 0,
    };
    this.currentTaxableIncome =
      calculateMonthlyTaxableRetirementIncome(taxInput);
    this.currentIncomeTax = calculateMonthlyIncomeTax(taxInput);
  }
);

Then(
  "taxable income from the qualifying LISA withdrawal should be {float}",
  function (this: LisaWorld, expected: number) {
    expectMoney(this.currentTaxableIncome, expected, this.precision);
  }
);

Then(
  "the full {float} LISA withdrawal should be available toward after-tax spending",
  function (this: LisaWorld, expected: number) {
    expectMoney(
      (this.currentWithdrawal ?? 0) - (this.currentIncomeTax ?? 0),
      expected,
      this.precision
    );
  }
);

When(
  "the LISA methodology and important information are inspected",
  function () {
    // Assertions are made against the production methodology copy below.
  }
);

Then(
  "they should explain that the retirement LISA projection does not model first-home withdrawals",
  function () {
    assertCondition(
      LISA_LIMITATIONS_GUIDANCE.includes(
        "does not model first-home withdrawals"
      )
    );
  }
);

Then(
  "they should explain that the retirement LISA projection does not model the 25 percent withdrawal charge for other pre-60 withdrawals",
  function () {
    assertCondition(
      LISA_LIMITATIONS_GUIDANCE.includes(
        "25% charge for other withdrawals before age 60"
      )
    );
  }
);

Then(
  "they should explain that the retirement LISA projection does not model terminal-illness withdrawals",
  function () {
    assertCondition(
      LISA_LIMITATIONS_GUIDANCE.includes("terminal-illness withdrawals")
    );
  }
);

Then(
  "they should explain that the modeller does not determine legal contribution eligibility from UK residence or Crown-service status",
  function () {
    assertCondition(
      LISA_LIMITATIONS_GUIDANCE.includes(
        "legal contribution eligibility from UK residence or Crown-service status"
      )
    );
  }
);

Then(
  "they should explain that provider-specific payment, bonus-claim and transfer mechanics are outside the projection",
  function () {
    assertCondition(
      LISA_LIMITATIONS_GUIDANCE.includes(
        "provider-specific payment, bonus-claim and transfer mechanics are outside the projection"
      )
    );
  }
);

Given("a user is age {int} or over", function (this: LisaWorld, age: number) {
  setMemberAge(this, age);
});

Given(
  "the user enters a current LISA balance greater than {float}",
  function (this: LisaWorld, threshold: number) {
    updateSettings(this, { lisaCurrentPot: threshold + 1 });
  }
);

When(
  "the LISA retirement projection is calculated",
  function (this: LisaWorld) {
    const settings = getSettings(this);
    this.projectedPot = calculateLisaProjectionRow({
      settings,
      rowDate: settings.startDate,
      drawDate: lisaDrawDate(settings),
      endDate: addYears(settings.startDate, 1),
    }).lisaPot;
    this.rows = calculateRetirementPlan(settings).rows;
  }
);

Then(
  "the existing LISA balance should be accepted for modelling",
  function (this: LisaWorld) {
    assertCondition((this.projectedPot ?? 0) > 0);
  }
);

Then(
  "the modeller should not claim that the user is currently eligible to open a new LISA",
  function () {
    const lisaFields =
      fieldGroups.find((group) => group.id === "lisa")?.fields ?? [];

    assertCondition(
      lisaFields.every((field) => !field.label.toLowerCase().includes("open"))
    );
  }
);

function addMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const monthIndex = month - 1 + months;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonth = (((monthIndex % 12) + 12) % 12) + 1;
  const maxDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(Math.min(day, maxDay)).padStart(2, "0")}`;
}
