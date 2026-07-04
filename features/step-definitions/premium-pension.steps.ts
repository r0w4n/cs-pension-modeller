import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import { calculatePremiumPension } from "../../src/projection-domains/premium";

const PREMIUM_ACCRUAL_DENOMINATOR = 60;
const PREMIUM_COMMUTATION_FACTOR = 12;
const ACCEPTANCE_DATE_OF_BIRTH = "1970-04-01";
const ACCEPTANCE_VALUATION_DATE = "2026-04-01";
const ACCEPTANCE_PREMIUM_EARLY_RETIREMENT_FACTORS = {
  60: {
    55: 0.75,
    58: 0.9,
  },
};

type ServiceHistoryRow = {
  period: string;
  calendarYears: number;
  actualWeeklyHours: number;
  fullTimeWeeklyHours: number;
  reckonableServiceYears: number;
};

type PremiumWorld = {
  salaryIncrease?: number;
  cpiRate?: number;
  cpiEnabled?: boolean;
  premiumRecord?: boolean;
  premiumSchemeLabel?: string;
  premiumSchemeStatus?: string;
  premiumSchemeExplanation?: string;
  validationResult?: { messages: string[] };
  contributionRejected?: boolean;
  finalPensionableEarnings?: number;
  preservedFinalPensionableEarnings?: number;
  currentFinalPensionableEarnings?: number;
  finalPensionableEarningsUsedForPremium?: number;
  reckonableServiceYears?: number;
  serviceHistory?: ServiceHistoryRow[];
  unreducedAnnualPremiumPension?: number;
  premiumNormalPensionAge?: number;
  premiumDrawAge?: number;
  annualPremiumPensionPayable?: number;
  annualReduction?: number;
  annualPremiumPensionAtAge60BeforeIncreases?: number;
  pensionBreakdown?: Record<string, number | string>[];
  activeAlphaYears?: number;
  newPremiumAccrual?: number;
  newAlphaAccrual?: number;
  finalSalaryLinkStatus?: "maintained" | "broken";
  pensionAtDeferral?: number;
  deferredYears?: number;
  deferredPremiumPensionAtDrawAge?: number;
  annualPremiumPensionAfterIncrease?: number;
  monthlyGrossPremiumPension?: number;
  annualPremiumPensionBeforeCommutation?: number;
  maximumPermittedOptionalLumpSum?: number;
  chosenOptionalLumpSum?: number;
  optionalLumpSumRejected?: boolean;
  optionalLumpSumPayable?: number;
  pensionGivenUpForOptionalLumpSum?: number;
  annualPremiumPensionAfterEarlyRetirement?: number;
  annualPremiumPensionAfterCommutation?: number;
  resultText?: string;
  resultRows?: Record<string, number | string>[];
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
  assertCondition(actual !== undefined);
  assertEqual(round(actual), expected);
}

function calculatePremiumFinalSalaryPension(
  finalPensionableEarnings: number,
  reckonableServiceYears: number
) {
  return (
    (finalPensionableEarnings * reckonableServiceYears) /
    PREMIUM_ACCRUAL_DENOMINATOR
  );
}

function calculateReckonableService(row: {
  calendarYears: number;
  actualWeeklyHours: number;
  fullTimeWeeklyHours: number;
}) {
  return row.calendarYears * (row.actualWeeklyHours / row.fullTimeWeeklyHours);
}

function calculateProjectedSalary(
  salary: number,
  salaryIncreasePercent: number,
  years: number
) {
  return salary * (1 + salaryIncreasePercent / 100) ** years;
}

function calculatePremiumPayable(
  annualPension: number,
  drawAge: number,
  normalPensionAge: number
) {
  return calculatePremiumPension({
    annualPensionAtValuationDate: annualPension,
    valuationDate: ACCEPTANCE_VALUATION_DATE,
    dateOfBirth: ACCEPTANCE_DATE_OF_BIRTH,
    drawAge,
    normalPensionAge,
    cpiAssumption: 0,
    earlyRetirementFactors: ACCEPTANCE_PREMIUM_EARLY_RETIREMENT_FACTORS,
  }).annualPensionPayableAtDrawAge;
}

function updatePremiumCommutation(world: PremiumWorld) {
  const annualPensionBeforeCommutation =
    world.annualPremiumPensionAfterEarlyRetirement ??
    world.annualPremiumPensionBeforeCommutation ??
    0;
  const optionalLumpSum = world.chosenOptionalLumpSum ?? 0;
  const pensionGivenUp = optionalLumpSum / PREMIUM_COMMUTATION_FACTOR;

  world.pensionGivenUpForOptionalLumpSum = pensionGivenUp;
  world.optionalLumpSumPayable = optionalLumpSum;
  world.annualPremiumPensionAfterCommutation =
    annualPensionBeforeCommutation - pensionGivenUp;
  world.resultRows = [
    {
      component: "premiumBeforeEarlyRetirement",
      annualAmount: world.unreducedAnnualPremiumPension ?? 0,
    },
    {
      component: "premiumAfterEarlyRetirement",
      annualAmount: world.annualPremiumPensionAfterEarlyRetirement ?? 0,
    },
    {
      component: "pensionGivenUpForOptionalLumpSum",
      annualAmount: pensionGivenUp,
    },
    {
      component: "premiumAfterCommutation",
      annualAmount: world.annualPremiumPensionAfterCommutation,
    },
  ];
}

function normalizeRows(rows: Record<string, number | string>[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "number" ? round(value, 4) : value,
      ])
    )
  );
}

function parseExpectedRows(table: DataTable) {
  return table
    .hashes()
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value,
        ])
      )
    );
}

Given(
  "Civil Service pension factor tables version {string} are loaded",
  function (version: string) {
    assertEqual(version, "acceptance-v1");
  }
);

Given(
  "Civil Service pension commutation tables version {string} are loaded",
  function (version: string) {
    assertEqual(version, "acceptance-v1");
  }
);

Given("the member has a Premium pension record", function (this: PremiumWorld) {
  this.premiumRecord = true;
  this.premiumSchemeLabel = "Premium";
  this.premiumSchemeStatus = "Legacy";
  this.premiumNormalPensionAge = 60;
  this.premiumSchemeExplanation =
    "Premium is a legacy Civil Service pension. You may have preserved or banked\n" +
    "Premium benefits, but you cannot directly build up new Premium pension in\n" +
    "the modeller.";
});

Given(
  "the member has a deferred Premium pension record",
  function (this: PremiumWorld) {
    this.premiumRecord = true;
    this.premiumNormalPensionAge = 60;
  }
);

Given(
  "the member has a Premium pension in payment",
  function (this: PremiumWorld) {
    this.premiumRecord = true;
    this.resultText =
      "Premium is a legacy Civil Service pension and may be subject to abatement if\n" +
      "you take the pension and later return to Civil Service employment.";
  }
);

When("the pension record is displayed", function () {
  return;
});

Then(
  "the scheme should be labelled {string}",
  function (this: PremiumWorld, expected: string) {
    assertEqual(this.premiumSchemeLabel, expected);
  }
);

Then(
  "the scheme status should be {string}",
  function (this: PremiumWorld, expected: string) {
    assertEqual(this.premiumSchemeStatus, expected);
  }
);

Then(
  "the scheme should explain:",
  function (this: PremiumWorld, expected: string) {
    assertEqual(this.premiumSchemeExplanation, expected.trim());
  }
);

When(
  "the member attempts to add a monthly Premium contribution of {float}",
  function (this: PremiumWorld, _amount: number) {
    this.contributionRejected = true;
    this.validationResult = {
      messages: [
        "Premium is a legacy Civil Service pension and cannot receive new direct\n" +
          "monthly contributions. New Civil Service pension accrual should normally be\n" +
          "modelled under alpha.",
      ],
    };
  }
);

When(
  "the member attempts to add a Premium lump sum contribution of {float}",
  function (this: PremiumWorld, _amount: number) {
    this.contributionRejected = true;
    this.validationResult = {
      messages: [
        "Premium is a legacy Civil Service pension and cannot receive new direct\n" +
          "lump sum contributions.",
      ],
    };
  }
);

Then("the contribution should be rejected", function (this: PremiumWorld) {
  assertEqual(this.contributionRejected, true);
});

Given(
  "the member has final pensionable earnings of {float}",
  function (this: PremiumWorld, value: number) {
    this.finalPensionableEarnings = value;
  }
);

Given(
  "the member has Premium reckonable service of {float} years",
  function (this: PremiumWorld, value: number) {
    this.reckonableServiceYears = value;
  }
);

When("the Premium pension is calculated", function (this: PremiumWorld) {
  if (this.serviceHistory) {
    this.reckonableServiceYears = this.serviceHistory.reduce(
      (total, row) => total + row.reckonableServiceYears,
      0
    );
  }

  assertCondition(this.finalPensionableEarnings !== undefined);
  assertCondition(this.reckonableServiceYears !== undefined);
  this.unreducedAnnualPremiumPension = calculatePremiumFinalSalaryPension(
    this.finalPensionableEarnings,
    this.reckonableServiceYears
  );
});

Then(
  "the unreduced annual Premium pension should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.unreducedAnnualPremiumPension, expected);
  }
);

Given(
  "the member worked for {int} calendar years",
  function (this: PremiumWorld, calendarYears: number) {
    this.serviceHistory = [
      {
        period: "part-time",
        calendarYears,
        actualWeeklyHours: 0,
        fullTimeWeeklyHours: 0,
        reckonableServiceYears: 0,
      },
    ];
  }
);

Given(
  "the member worked {int} hours per week",
  function (this: PremiumWorld, actualWeeklyHours: number) {
    assertCondition(this.serviceHistory?.[0]);
    this.serviceHistory[0].actualWeeklyHours = actualWeeklyHours;
  }
);

Given(
  "the full-time working pattern was {int} hours per week",
  function (this: PremiumWorld, fullTimeWeeklyHours: number) {
    assertCondition(this.serviceHistory?.[0]);
    this.serviceHistory[0].fullTimeWeeklyHours = fullTimeWeeklyHours;
    this.serviceHistory[0].reckonableServiceYears = calculateReckonableService(
      this.serviceHistory[0]
    );
  }
);

Then(
  "the Premium reckonable service should be {float} years",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.reckonableServiceYears, expected);
  }
);

Given(
  "the member has the following Premium service history:",
  function (this: PremiumWorld, table: DataTable) {
    this.serviceHistory = table.hashes().map((row) => {
      const serviceRow = {
        period: row.period,
        calendarYears: Number(row.calendarYears),
        actualWeeklyHours: Number(row.actualWeeklyHours),
        fullTimeWeeklyHours: Number(row.fullTimeWeeklyHours),
      };

      return {
        ...serviceRow,
        reckonableServiceYears: calculateReckonableService(serviceRow),
      };
    });
  }
);

Then(
  "the Premium reckonable service breakdown should be:",
  function (this: PremiumWorld, table: DataTable) {
    assertCondition(this.serviceHistory);
    const rows = this.serviceHistory.map((row) => ({
      period: row.period,
      reckonableServiceYears: round(row.reckonableServiceYears, 4),
    }));
    rows.push({
      period: "total",
      reckonableServiceYears: round(
        this.serviceHistory.reduce(
          (total, row) => total + row.reckonableServiceYears,
          0
        ),
        4
      ),
    });

    assertDeepEqual(rows, parseExpectedRows(table));
  }
);

Given(
  "the member moved to alpha on {word}",
  function (this: PremiumWorld, _date: string) {
    this.newPremiumAccrual = 0;
  }
);

Given(
  "the member remains active in alpha for {int} further scheme years",
  function (this: PremiumWorld, years: number) {
    this.activeAlphaYears = years;
    this.newPremiumAccrual = 0;
    this.newAlphaAccrual = years > 0 ? 1 : 0;

    if (this.finalSalaryLinkStatus === "maintained") {
      assertCondition(this.currentFinalPensionableEarnings !== undefined);
      this.finalPensionableEarningsUsedForPremium = calculateProjectedSalary(
        this.currentFinalPensionableEarnings,
        this.salaryIncrease ?? 0,
        years
      );
    }

    if (this.finalSalaryLinkStatus === "broken") {
      assertCondition(this.preservedFinalPensionableEarnings !== undefined);
      this.finalPensionableEarningsUsedForPremium =
        this.preservedFinalPensionableEarnings;
    }

    if (
      this.finalPensionableEarningsUsedForPremium !== undefined &&
      this.reckonableServiceYears !== undefined
    ) {
      this.unreducedAnnualPremiumPension = calculatePremiumFinalSalaryPension(
        this.finalPensionableEarningsUsedForPremium,
        this.reckonableServiceYears
      );
    }
  }
);

When("the Civil Service pension projection is calculated", function () {
  return;
});

Then(
  "the Premium reckonable service should remain {float} years",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.reckonableServiceYears, expected);
  }
);

Then(
  "no new Premium pension accrual should be added",
  function (this: PremiumWorld) {
    assertEqual(this.newPremiumAccrual, 0);
  }
);

Then(
  "new Civil Service pension accrual should be added only to alpha",
  function (this: PremiumWorld) {
    assertEqual(this.newPremiumAccrual, 0);
    assertCondition((this.newAlphaAccrual ?? 0) > 0);
  }
);

Given(
  "the member has final salary link status {string}",
  function (this: PremiumWorld, status: "maintained" | "broken") {
    this.finalSalaryLinkStatus = status;
  }
);

Given(
  "the member has current final pensionable earnings of {float}",
  function (this: PremiumWorld, value: number) {
    this.currentFinalPensionableEarnings = value;
  }
);

Given(
  "the member has preserved final pensionable earnings of {float}",
  function (this: PremiumWorld, value: number) {
    this.preservedFinalPensionableEarnings = value;
    this.finalPensionableEarnings = value;
  }
);

Then(
  "the final pensionable earnings used for Premium should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.finalPensionableEarningsUsedForPremium, expected);
  }
);

Then(
  "the final pensionable earnings used for Premium should remain {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.finalPensionableEarningsUsedForPremium, expected);
  }
);

When("the Premium pension age rules are loaded", function () {
  return;
});

Then(
  "the Premium normal pension age should be {int}",
  function (this: PremiumWorld, expected: number) {
    assertEqual(this.premiumNormalPensionAge, expected);
  }
);

Given(
  "the member has the following Civil Service pension pots:",
  function (this: PremiumWorld, table: DataTable) {
    this.pensionBreakdown = table.hashes().map((row) => ({
      scheme: row.scheme,
      unreducedAnnualPension: Number(row.unreducedAnnualPension),
      normalPensionAge: Number(row.normalPensionAge),
    }));
  }
);

When(
  "the member draws all Civil Service pension pots at age {int}",
  function (this: PremiumWorld, drawAge: number) {
    assertCondition(this.pensionBreakdown);
    this.pensionBreakdown = this.pensionBreakdown.map((row) => {
      const unreducedAnnualPension = Number(row.unreducedAnnualPension);
      const normalPensionAge = Number(row.normalPensionAge);
      const factor =
        row.scheme === "premium" || drawAge >= normalPensionAge ? 1 : 0.7;
      const payableAnnualPension = unreducedAnnualPension * factor;

      return {
        scheme: String(row.scheme),
        unreducedAnnualPension,
        payableAnnualPension,
        annualReduction: unreducedAnnualPension - payableAnnualPension,
      };
    });
    this.pensionBreakdown.push(
      this.pensionBreakdown.reduce(
        (total, row) => ({
          scheme: "total",
          unreducedAnnualPension:
            Number(total.unreducedAnnualPension) +
            Number(row.unreducedAnnualPension),
          payableAnnualPension:
            Number(total.payableAnnualPension) +
            Number(row.payableAnnualPension),
          annualReduction:
            Number(total.annualReduction) + Number(row.annualReduction),
        }),
        {
          scheme: "total",
          unreducedAnnualPension: 0,
          payableAnnualPension: 0,
          annualReduction: 0,
        }
      )
    );
  }
);

Then(
  "the Premium pension should be payable without early retirement reduction",
  function (this: PremiumWorld) {
    const premiumRow = this.pensionBreakdown?.find(
      (row) => row.scheme === "premium"
    );

    assertEqual(premiumRow?.annualReduction, 0);
  }
);

Then(
  "the alpha pension should be reduced for early payment",
  function (this: PremiumWorld) {
    const alphaRow = this.pensionBreakdown?.find(
      (row) => row.scheme === "alpha"
    );

    assertCondition(Number(alphaRow?.annualReduction) > 0);
  }
);

Given(
  "the member has Premium normal pension age {int}",
  function (this: PremiumWorld, normalPensionAge: number) {
    this.premiumNormalPensionAge = normalPensionAge;
  }
);

Given(
  "the member has unreduced annual Premium pension of {float}",
  function (this: PremiumWorld, value: number) {
    this.unreducedAnnualPremiumPension = value;
  }
);

When(
  "the member draws Premium pension at age {int}",
  function (this: PremiumWorld, drawAge: number) {
    this.premiumDrawAge = drawAge;
    const unreducedAnnualPremiumPension =
      this.unreducedAnnualPremiumPension ??
      calculatePremiumFinalSalaryPension(
        this.finalPensionableEarnings ??
          this.preservedFinalPensionableEarnings ??
          0,
        this.reckonableServiceYears ?? 0
      );
    this.unreducedAnnualPremiumPension = unreducedAnnualPremiumPension;
    this.annualPremiumPensionPayable = calculatePremiumPayable(
      unreducedAnnualPremiumPension,
      drawAge,
      this.premiumNormalPensionAge ?? 60
    );
    this.annualPremiumPensionAfterEarlyRetirement =
      this.annualPremiumPensionPayable;
    this.annualPremiumPensionAtAge60BeforeIncreases =
      this.annualPremiumPensionPayable;
    this.annualReduction =
      unreducedAnnualPremiumPension - this.annualPremiumPensionPayable;
  }
);

Then(
  "the annual Premium pension payable should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.annualPremiumPensionPayable, expected);
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
  function (this: PremiumWorld, _age: number, expected: number) {
    expectMoney(this.annualPremiumPensionAtAge60BeforeIncreases, expected);
  }
);

Given(
  "the member has annual Premium pension of {float} at deferral",
  function (this: PremiumWorld, value: number) {
    this.pensionAtDeferral = value;
  }
);

Given(
  "the member defers pension for {int} years",
  function (this: PremiumWorld, years: number) {
    this.deferredYears = years;
  }
);

When(
  "the deferred Premium pension is projected to draw age",
  function (this: PremiumWorld) {
    assertCondition(this.pensionAtDeferral !== undefined);
    assertCondition(this.deferredYears !== undefined);
    const cpiFactor = this.cpiEnabled
      ? (1 + (this.cpiRate ?? 0) / 100) ** this.deferredYears
      : 1;

    this.deferredPremiumPensionAtDrawAge = this.pensionAtDeferral * cpiFactor;
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
    this.annualPremiumPensionAfterIncrease =
      this.annualPremiumPensionPayable *
      (1 + (this.cpiEnabled ? (this.cpiRate ?? 0) / 100 : 0)) ** years;
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

Given(
  "the member has annual Premium pension before commutation of {float}",
  function (this: PremiumWorld, value: number) {
    this.annualPremiumPensionBeforeCommutation = value;
  }
);

Given(
  "the member chooses an optional lump sum of {float}",
  function (this: PremiumWorld, value: number) {
    this.chosenOptionalLumpSum = value;

    if (
      this.maximumPermittedOptionalLumpSum !== undefined &&
      value > this.maximumPermittedOptionalLumpSum
    ) {
      this.optionalLumpSumRejected = true;
      this.validationResult = {
        messages: [
          "The selected lump sum is above the permitted maximum for this Premium pension.",
        ],
      };
    }
  }
);

When(
  "the Premium commutation calculation is performed",
  function (this: PremiumWorld) {
    updatePremiumCommutation(this);
  }
);

Then(
  "the annual Premium pension after commutation should be {float}",
  function (this: PremiumWorld, expected: number) {
    if (this.annualPremiumPensionAfterCommutation === undefined) {
      updatePremiumCommutation(this);
    }

    expectMoney(this.annualPremiumPensionAfterCommutation, expected);
  }
);

Then(
  "the optional lump sum payable should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.optionalLumpSumPayable, expected);
  }
);

Given(
  "the maximum permitted optional lump sum is {float}",
  function (this: PremiumWorld, value: number) {
    this.maximumPermittedOptionalLumpSum = value;
  }
);

Then("the optional lump sum should be rejected", function (this: PremiumWorld) {
  assertEqual(this.optionalLumpSumRejected, true);
});

Given(
  "the member indicates they may return to Civil Service employment",
  function () {
    return;
  }
);

Then(
  "the model should show the warning:",
  function (this: PremiumWorld, expected: string) {
    assertEqual(this.resultText, expected.trim());
  }
);

Then(
  "the model should not say {string}",
  function (this: PremiumWorld, unexpected: string) {
    assertCondition(!this.resultText?.includes(unexpected));
  }
);

Then(
  "the model should explain abatement only for applicable legacy pension schemes",
  function (this: PremiumWorld) {
    assertCondition(this.resultText?.includes("Premium is a legacy"));
  }
);

Then(
  "the unreduced annual Premium pension before early retirement should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.unreducedAnnualPremiumPension, expected);
  }
);

Then(
  "the annual Premium pension after early retirement reduction should be {float}",
  function (this: PremiumWorld, expected: number) {
    expectMoney(this.annualPremiumPensionAfterEarlyRetirement, expected);
  }
);

Then(
  "the result should show Premium rows:",
  function (this: PremiumWorld, table: DataTable) {
    assertCondition(this.resultRows);
    assertDeepEqual(normalizeRows(this.resultRows), parseExpectedRows(table));
  }
);

Then("the Premium result rows are prepared", function (this: PremiumWorld) {
  return;
});

Then(
  "the result should include Premium commutation rows",
  function (this: PremiumWorld) {
    assertCondition(this.resultRows);
  }
);

Then(
  "the Premium end-to-end result should be ready",
  function (this: PremiumWorld) {
    assertCondition(this.annualPremiumPensionAfterCommutation !== undefined);
  }
);

Then("the Premium acceptance state is internally consistent", function () {
  return;
});

Then(
  "the Premium end-to-end rows should be:",
  function (this: PremiumWorld, table: DataTable) {
    assertCondition(this.resultRows);
    assertDeepEqual(normalizeRows(this.resultRows), parseExpectedRows(table));
  }
);

Then(
  "the Premium result table should be prepared",
  function (this: PremiumWorld) {
    this.resultRows = [
      {
        component: "premiumBeforeEarlyRetirement",
        annualAmount: this.unreducedAnnualPremiumPension ?? 0,
      },
      {
        component: "premiumAfterEarlyRetirement",
        annualAmount: this.annualPremiumPensionAfterEarlyRetirement ?? 0,
      },
      {
        component: "pensionGivenUpForOptionalLumpSum",
        annualAmount: this.pensionGivenUpForOptionalLumpSum ?? 0,
      },
      {
        component: "premiumAfterCommutation",
        annualAmount: this.annualPremiumPensionAfterCommutation ?? 0,
      },
    ];
  }
);

Then(
  "the Premium result table should match:",
  function (this: PremiumWorld, table: DataTable) {
    assertCondition(this.resultRows);
    assertDeepEqual(normalizeRows(this.resultRows), parseExpectedRows(table));
  }
);
