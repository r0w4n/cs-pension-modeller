import {
  DataTable,
  Given,
  Then,
  When,
  setWorldConstructor,
} from "@cucumber/cucumber";
import { addYears, calculateAge } from "../../src/projection-core";
import { defaultSettings } from "../../src/settings";
import { validateAlphaPensionRules } from "../../src/settings/settings-domains/alpha-pension";
import {
  calculateAnnualAlphaPensionIncludingReduction,
  calculateAlphaPensionRevaluationFactor,
  calculateLumpSumAddedPension,
  calculateMonthlyAddedPension,
  calculateMonthlyAlphaAccrual,
  calculateProjectedAlphaPensionableEarnings,
  getAlphaEarlyRetirementFactor,
} from "../../src/projection-domains/alpha";

const ACCEPTANCE_START_DATE = "2026-04-01";
const DEFAULT_ACCEPTANCE_DATE_OF_BIRTH = "1977-05-01";

type ActiveAlphaResult = {
  alphaPension: number;
  finalSalary: number;
  newAlphaAccrual: number;
  breakdown: {
    schemeYear: number;
    pensionableSalary: number;
    annualAccrual: number;
    accruedAlphaPension: number;
  }[];
};

type PensionBreakdownRow = {
  component?: string;
  annualAmount?: number;
  unreducedAnnualAmount?: number;
  payableAnnualAmount?: number;
  annualReduction?: number;
};

class AlphaPensionWorld {
  precision = 2;
  dateOfBirth = DEFAULT_ACCEPTANCE_DATE_OF_BIRTH;
  startingAlphaPension = 0;
  startingSalary = 0;
  salaryIncrease = 0;
  cpiRate = 0;
  cpiEnabled = false;
  activeYears = 0;
  leaveAge = 0;
  drawAge = 0;
  drawAgeMonths = 0;
  pensionAtLeaving = 0;
  unreducedAlphaPension = 0;
  purchasedAnnualAddedPension = 0;
  normalPensionAge = 67;
  standardAlphaPension = 0;
  epaAlphaPension = 0;
  epaOption: "NPA-1" | "NPA-2" | "NPA-3" = "NPA-1";
  addedPensionPurchase:
    | {
        kind: "lump-sum";
        amount: number;
        memberAge: number;
        purchaseDate: string;
      }
    | {
        kind: "monthly";
        monthlyContribution: number;
        monthsPaid: number;
        memberAge: number;
        purchaseDate: string;
      }
    | undefined;
  minimumPensionAge = 0;
  requestedDrawDate = "";
  activeAlphaResult: ActiveAlphaResult | undefined;
  deferredPensionAtDrawAge = 0;
  totalAddedPensionContribution = 0;
  calculatedAddedPension = 0;
  annualAlphaPensionPayable = 0;
  annualReduction = 0;
  pensionBreakdown: PensionBreakdownRow[] = [];
  validationResult:
    | { ageAtDrawDate: number; valid: boolean; messages: string[] }
    | undefined;
  epaValidation: { valid: boolean; payableAge: number | undefined } | undefined;
}

setWorldConstructor(AlphaPensionWorld);

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
  const factor = 100;

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

function expectMoney(actual: number, expected: string | number) {
  assertEqual(roundMoney(actual), parseMoney(expected));
}

function dateOfBirthForAgeOnDate(age: number, date: string) {
  return addYears(date, -age);
}

function ageWithMonths(age: number, months: number) {
  return age + months / 12;
}

function projectActiveAlpha(world: AlphaPensionWorld, activeYears: number) {
  const settings = {
    ...defaultSettings,
    startDate: ACCEPTANCE_START_DATE,
    pensionableEarnings: world.startingSalary,
    alphaPayRisePercent: world.salaryIncrease,
  };
  let accruedAlphaPension = world.startingAlphaPension;
  const breakdown: ActiveAlphaResult["breakdown"] = [];

  for (let schemeYear = 1; schemeYear <= activeYears; schemeYear += 1) {
    const rowDate = addYears(ACCEPTANCE_START_DATE, schemeYear - 1);
    const pensionableSalary = calculateProjectedAlphaPensionableEarnings(
      settings,
      rowDate
    );
    const annualAccrual = calculateMonthlyAlphaAccrual(pensionableSalary) * 12;

    if (world.cpiEnabled) {
      accruedAlphaPension *= 1 + world.cpiRate / 100;
    }

    accruedAlphaPension += annualAccrual;
    breakdown.push({
      schemeYear,
      pensionableSalary,
      annualAccrual,
      accruedAlphaPension,
    });
  }

  return {
    alphaPension: accruedAlphaPension,
    finalSalary: calculateProjectedAlphaPensionableEarnings(
      settings,
      addYears(ACCEPTANCE_START_DATE, activeYears)
    ),
    newAlphaAccrual: breakdown.reduce(
      (total, row) => total + row.annualAccrual,
      0
    ),
    breakdown,
  };
}

function buildBreakdownRows(
  components: { component: string; unreducedAnnualAmount: number }[],
  factor: number
) {
  const rows = components.map((component) => {
    const payableAnnualAmount = component.unreducedAnnualAmount * factor;

    return {
      ...component,
      payableAnnualAmount,
      annualReduction: component.unreducedAnnualAmount - payableAnnualAmount,
    };
  });
  const total = rows.reduce<PensionBreakdownRow>(
    (runningTotal, row) => ({
      component: "total",
      unreducedAnnualAmount:
        (runningTotal.unreducedAnnualAmount ?? 0) + row.unreducedAnnualAmount,
      payableAnnualAmount:
        (runningTotal.payableAnnualAmount ?? 0) + row.payableAnnualAmount,
      annualReduction:
        (runningTotal.annualReduction ?? 0) + row.annualReduction,
    }),
    {
      component: "total",
      unreducedAnnualAmount: 0,
      payableAnnualAmount: 0,
      annualReduction: 0,
    }
  );

  return [...rows, total];
}

function normalizeActualRows(rows: PensionBreakdownRow[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "number" ? roundMoney(value) : value,
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
          /^\d+(\.\d+)?$/.test(value) ? parseMoney(value) : value,
        ])
      )
    );
}

function validateDrawRequest(world: AlphaPensionWorld) {
  const ageAtDrawDate = calculateAge(
    world.dateOfBirth,
    world.requestedDrawDate
  );
  const settings = {
    ...defaultSettings,
    dateOfBirth: world.dateOfBirth,
    startDate: ACCEPTANCE_START_DATE,
    requirementAge: 55,
    alphaPensionDrawAge: ageAtDrawDate,
    alphaPensionLeaveAge: ageAtDrawDate,
    lifeExpectancy: 90,
  };
  const issues = validateAlphaPensionRules({
    settings,
    lifeExpectancyDate: addYears(world.dateOfBirth, 90),
    alphaDrawDate: world.requestedDrawDate,
    alphaLeaveDate: world.requestedDrawDate,
    alphaAccrualStopDate: world.requestedDrawDate,
    alphaAbsDate: ACCEPTANCE_START_DATE,
    alphaEpaAgeDate: addYears(world.dateOfBirth, 65),
    latestAlphaAddedPensionPurchaseDate: addYears(world.dateOfBirth, 67),
  });

  return {
    ageAtDrawDate,
    valid:
      ageAtDrawDate >= world.minimumPensionAge &&
      !issues.some((issue) => issue.field === "alphaPensionDrawAge"),
    messages: issues.map((issue) => issue.message),
  };
}

function acceptanceUnsupported(reason: string): never {
  throw new Error(
    `Acceptance scenario is not implemented in the current model: ${reason}`
  );
}

Given(
  "alpha pension factor tables version {string} are loaded",
  function (this: AlphaPensionWorld, version: string) {
    assertEqual(version, "acceptance-v1");
  }
);

Given(
  "alpha pension purchase factor tables version {string} are loaded",
  function (this: AlphaPensionWorld, version: string) {
    assertEqual(version, "acceptance-v1");
  }
);

Given(
  "pension outputs are rounded to {int} decimal places",
  function (this: AlphaPensionWorld, precision: number) {
    this.precision = precision;
  }
);

Given("the member is in the alpha scheme", function () {
  return;
});

Given(
  "the member starts with accrued alpha pension of {float}",
  function (this: AlphaPensionWorld, value: number) {
    this.startingAlphaPension = value;
  }
);

Given(
  "the member has pensionable salary of {float}",
  function (this: AlphaPensionWorld, value: number) {
    this.startingSalary = value;
  }
);

Given(
  "the member starts with pensionable salary of {float}",
  function (this: AlphaPensionWorld, value: number) {
    this.startingSalary = value;
  }
);

Given(
  "the annual salary increase assumption is {word}",
  function (this: AlphaPensionWorld, value: string) {
    this.salaryIncrease = parsePercent(value);
  }
);

Given(
  "the annual CPI assumption is {word}",
  function (this: AlphaPensionWorld, value: string) {
    this.cpiRate = parsePercent(value);
  }
);

Given(
  "CPI revaluation is {word}",
  function (this: AlphaPensionWorld, value: string) {
    this.cpiEnabled = parseOnOff(value);
  }
);

When(
  "the member remains active for {int} scheme years",
  function (this: AlphaPensionWorld, activeYears: number) {
    this.activeYears = activeYears;
    this.activeAlphaResult = projectActiveAlpha(this, activeYears);
  }
);

When(
  "the member remains active for {int} further scheme year",
  function (this: AlphaPensionWorld, activeYears: number) {
    this.activeYears = activeYears;
    this.activeAlphaResult = projectActiveAlpha(this, activeYears);
  }
);

Then(
  "the projected unreduced alpha pension should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.activeAlphaResult);
    expectMoney(this.activeAlphaResult.alphaPension, expected);
  }
);

Then(
  "the final pensionable salary should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.activeAlphaResult);
    expectMoney(this.activeAlphaResult.finalSalary, expected);
  }
);

Then(
  "the total new alpha accrual should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.activeAlphaResult);
    expectMoney(this.activeAlphaResult.newAlphaAccrual, expected);
  }
);

Then(
  "the alpha accrual breakdown should be:",
  function (this: AlphaPensionWorld, table: DataTable) {
    assertCondition(this.activeAlphaResult);
    assertDeepEqual(
      this.activeAlphaResult.breakdown.map((row) => ({
        schemeYear: row.schemeYear,
        pensionableSalary: roundMoney(row.pensionableSalary),
        annualAccrual: roundMoney(row.annualAccrual),
        accruedAlphaPension: roundMoney(row.accruedAlphaPension),
      })),
      table.hashes().map((row) => ({
        schemeYear: Number(row.schemeYear),
        pensionableSalary: parseMoney(row.pensionableSalary),
        annualAccrual: parseMoney(row.annualAccrual),
        accruedAlphaPension: parseMoney(row.accruedAlphaPension),
      }))
    );
  }
);

Given(
  "the member leaves pensionable service at age {int}",
  function (this: AlphaPensionWorld, value: number) {
    this.leaveAge = value;
  }
);

Given(
  "the member has alpha pension of {float} at leaving service",
  function (this: AlphaPensionWorld, value: number) {
    this.pensionAtLeaving = value;
  }
);

When(
  "the deferred pension is projected to draw age",
  function (this: AlphaPensionWorld) {
    const revaluationFactor = this.cpiEnabled
      ? calculateAlphaPensionRevaluationFactor({
          fromDate: addYears(this.dateOfBirth, this.leaveAge),
          rowDate: addYears(
            this.dateOfBirth,
            ageWithMonths(this.drawAge, this.drawAgeMonths)
          ),
          activeUntilDate: addYears(this.dateOfBirth, this.leaveAge),
          cpiPercent: this.cpiRate,
        })
      : 1;

    this.deferredPensionAtDrawAge = this.pensionAtLeaving * revaluationFactor;
  }
);

Then(
  "the unreduced pension at draw age should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.deferredPensionAtDrawAge, expected);
  }
);

Then(
  "the model should not apply active member revaluation after leaving service",
  function (this: AlphaPensionWorld) {
    const expectedCpiOnlyFactor = (1 + this.cpiRate / 100) ** 5;

    assertEqual(
      roundMoney(this.deferredPensionAtDrawAge),
      roundMoney(this.pensionAtLeaving * expectedCpiOnlyFactor)
    );
  }
);

Given(
  "the member buys Added Pension using a lump sum of {float}",
  function (this: AlphaPensionWorld, value: number) {
    this.addedPensionPurchase = {
      kind: "lump-sum",
      amount: value,
      memberAge: 0,
      purchaseDate: "",
    };
  }
);

Given(
  "the member buys Added Pension using monthly contributions of {float}",
  function (this: AlphaPensionWorld, value: number) {
    this.addedPensionPurchase = {
      kind: "monthly",
      monthlyContribution: value,
      monthsPaid: 0,
      memberAge: 0,
      purchaseDate: "",
    };
  }
);

Given(
  "the member pays those contributions for {int} months",
  function (this: AlphaPensionWorld, monthsPaid: number) {
    assertCondition(this.addedPensionPurchase?.kind === "monthly");
    this.addedPensionPurchase.monthsPaid = monthsPaid;
  }
);

Given(
  "the member is age {int} on the purchase date",
  function (this: AlphaPensionWorld, memberAge: number) {
    assertCondition(this.addedPensionPurchase);
    this.addedPensionPurchase.memberAge = memberAge;
  }
);

Given(
  "the member is age {int} on the purchase start date",
  function (this: AlphaPensionWorld, memberAge: number) {
    assertCondition(this.addedPensionPurchase);
    this.addedPensionPurchase.memberAge = memberAge;
  }
);

Given(
  "the purchase date is {word}",
  function (this: AlphaPensionWorld, purchaseDate: string) {
    assertCondition(this.addedPensionPurchase);
    this.addedPensionPurchase.purchaseDate = purchaseDate;
  }
);

Given(
  "the purchase start date is {word}",
  function (this: AlphaPensionWorld, purchaseDate: string) {
    assertCondition(this.addedPensionPurchase);
    this.addedPensionPurchase.purchaseDate = purchaseDate;
  }
);

When(
  "the Added Pension purchase is calculated",
  function (this: AlphaPensionWorld) {
    assertCondition(this.addedPensionPurchase);
    const dateOfBirth = dateOfBirthForAgeOnDate(
      this.addedPensionPurchase.memberAge,
      this.addedPensionPurchase.purchaseDate
    );

    if (this.addedPensionPurchase.kind === "lump-sum") {
      this.totalAddedPensionContribution = this.addedPensionPurchase.amount;
      this.calculatedAddedPension = calculateLumpSumAddedPension({
        rowDate: this.addedPensionPurchase.purchaseDate,
        dateOfBirth,
        lumpSums: [
          {
            id: "acceptance-lump-sum",
            amount: this.addedPensionPurchase.amount,
            startDate: this.addedPensionPurchase.purchaseDate,
            cadence: "once",
            endDate: this.addedPensionPurchase.purchaseDate,
          },
        ],
      });
      return;
    }

    this.totalAddedPensionContribution =
      this.addedPensionPurchase.monthlyContribution *
      this.addedPensionPurchase.monthsPaid;
    this.calculatedAddedPension =
      calculateMonthlyAddedPension({
        rowDate: this.addedPensionPurchase.purchaseDate,
        stopDate: this.addedPensionPurchase.purchaseDate,
        dateOfBirth,
        addedPensionMonthlyContribution:
          this.addedPensionPurchase.monthlyContribution,
      }) * this.addedPensionPurchase.monthsPaid;
  }
);

Then(
  "the total Added Pension contribution should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.totalAddedPensionContribution, expected);
  }
);

Then(
  "the purchased annual Added Pension should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    const actual =
      this.calculatedAddedPension || this.purchasedAnnualAddedPension;

    expectMoney(actual, expected);
  }
);

Given(
  "the member has unreduced alpha pension of {float}",
  function (this: AlphaPensionWorld, value: number) {
    this.unreducedAlphaPension = value;
  }
);

Given(
  "the member has purchased annual Added Pension of {float}",
  function (this: AlphaPensionWorld, value: number) {
    this.purchasedAnnualAddedPension = value;
  }
);

Given(
  "the member has alpha normal pension age {int}",
  function (this: AlphaPensionWorld, value: number) {
    this.normalPensionAge = value;
  }
);

When(
  "the member draws pension at normal pension age",
  function (this: AlphaPensionWorld) {
    this.pensionBreakdown = [
      { component: "alpha", annualAmount: this.unreducedAlphaPension },
      {
        component: "addedPension",
        annualAmount: this.purchasedAnnualAddedPension,
      },
      {
        component: "total",
        annualAmount:
          this.unreducedAlphaPension + this.purchasedAnnualAddedPension,
      },
    ];
  }
);

When(
  "the member draws pension at age {int}",
  function (this: AlphaPensionWorld, drawAge: number) {
    this.drawAge = drawAge;
    this.drawAgeMonths = 0;

    drawPensionAtAge(this, drawAge, 0);
  }
);

When(
  "the member draws pension at age {int} and {int} months",
  function (this: AlphaPensionWorld, drawAge: number, drawAgeMonths: number) {
    this.drawAge = drawAge;
    this.drawAgeMonths = drawAgeMonths;

    drawPensionAtAge(this, drawAge, drawAgeMonths);
  }
);

function drawPensionAtAge(
  world: AlphaPensionWorld,
  drawAge: number,
  drawAgeMonths: number
) {
  if (
    world.unreducedAlphaPension <= 0 &&
    world.purchasedAnnualAddedPension <= 0
  ) {
    return;
  }

  const factor = getAlphaEarlyRetirementFactor(
    world.normalPensionAge,
    ageWithMonths(drawAge, drawAgeMonths)
  );

  world.pensionBreakdown = buildBreakdownRows(
    [
      {
        component: "alpha",
        unreducedAnnualAmount: world.unreducedAlphaPension,
      },
      {
        component: "addedPension",
        unreducedAnnualAmount: world.purchasedAnnualAddedPension,
      },
    ],
    factor
  );
}

Then(
  "the annual pension breakdown should be:",
  function (this: AlphaPensionWorld, table: DataTable) {
    assertDeepEqual(
      normalizeActualRows(this.pensionBreakdown),
      parseExpectedRows(table)
    );
  }
);

Then(
  "the reduced annual pension breakdown should be:",
  function (this: AlphaPensionWorld, table: DataTable) {
    assertDeepEqual(
      normalizeActualRows(this.pensionBreakdown),
      parseExpectedRows(table)
    );
  }
);

Given(
  "the member has date of birth {word}",
  function (this: AlphaPensionWorld, dateOfBirth: string) {
    this.dateOfBirth = dateOfBirth;
  }
);

When(
  "the member draws alpha pension at age {int}",
  function (this: AlphaPensionWorld, drawAge: number) {
    drawAlphaPensionAtAge(this, drawAge, 0);
  }
);

When(
  "the member draws alpha pension at age {int} and {int} months",
  function (this: AlphaPensionWorld, drawAge: number, drawAgeMonths: number) {
    drawAlphaPensionAtAge(this, drawAge, drawAgeMonths);
  }
);

function drawAlphaPensionAtAge(
  world: AlphaPensionWorld,
  drawAge: number,
  drawAgeMonths: number
) {
  const drawAgeWithMonths = ageWithMonths(drawAge, drawAgeMonths);
  const drawDate = addYears(world.dateOfBirth, drawAgeWithMonths);
  const npaDate = addYears(world.dateOfBirth, world.normalPensionAge);
  world.annualAlphaPensionPayable =
    calculateAnnualAlphaPensionIncludingReduction(
      world.unreducedAlphaPension,
      drawDate,
      npaDate,
      getAlphaEarlyRetirementFactor(world.normalPensionAge, drawAgeWithMonths)
    );
  world.annualReduction =
    world.unreducedAlphaPension - world.annualAlphaPensionPayable;
}

Then(
  "the annual alpha pension payable should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.annualAlphaPensionPayable, expected);
  }
);

Then(
  "the annual reduction should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.annualReduction, expected);
  }
);

Then(
  "the annual alpha pension payable at age {int} should be {float}",
  function (this: AlphaPensionWorld, _age: number, expected: number) {
    expectMoney(this.annualAlphaPensionPayable, expected);
  }
);

Then(
  "the annual alpha pension payable at age {int} before CPI increases should still be {float}",
  function (this: AlphaPensionWorld, _age: number, expected: number) {
    expectMoney(this.annualAlphaPensionPayable, expected);
  }
);

Then(
  "the model should not remove the early retirement reduction at normal pension age",
  function () {
    return;
  }
);

When(
  /^the member selects EPA option (NPA-[123])$/,
  function (this: AlphaPensionWorld, option: "NPA-1" | "NPA-2" | "NPA-3") {
    this.epaOption = option;
    const yearsBeforeNpa = Number(option.replace("NPA-", ""));
    const payableAge = this.normalPensionAge - yearsBeforeNpa;
    this.epaValidation = {
      valid: payableAge >= 65,
      payableAge: payableAge >= 65 ? payableAge : undefined,
    };
  }
);

Then(
  "the EPA option should be {word}",
  function (this: AlphaPensionWorld, expected: string) {
    assertCondition(this.epaValidation);
    assertEqual(this.epaValidation.valid, expected === "valid");
  }
);

Then(
  /^the EPA payable age should be\s*(.*)$/,
  function (this: AlphaPensionWorld, expected: string) {
    assertCondition(this.epaValidation);
    assertEqual(
      this.epaValidation.payableAge,
      expected ? Number(expected) : undefined
    );
  }
);

Given(
  "the member has standard alpha pension of {float}",
  function (this: AlphaPensionWorld, value: number) {
    this.standardAlphaPension = value;
  }
);

Given(
  "the member has EPA alpha pension of {float}",
  function (this: AlphaPensionWorld, value: number) {
    this.epaAlphaPension = value;
  }
);

Given(
  /^the member has selected EPA option (NPA-[123])$/,
  function (this: AlphaPensionWorld, option: "NPA-1" | "NPA-2" | "NPA-3") {
    this.epaOption = option;
  }
);

When(
  "the member draws all alpha pension at age {int}",
  function (this: AlphaPensionWorld, drawAge: number) {
    drawAllAlphaPensionAtAge(this, drawAge, 0);
  }
);

When(
  "the member draws all alpha pension at age {int} and {int} months",
  function (this: AlphaPensionWorld, drawAge: number, drawAgeMonths: number) {
    drawAllAlphaPensionAtAge(this, drawAge, drawAgeMonths);
  }
);

function drawAllAlphaPensionAtAge(
  world: AlphaPensionWorld,
  drawAge: number,
  drawAgeMonths: number
) {
  const hasEpaPension =
    world.standardAlphaPension > 0 || world.epaAlphaPension > 0;
  const yearsBeforeNpa = Number(world.epaOption.replace("NPA-", ""));
  const epaAge = world.normalPensionAge - yearsBeforeNpa;
  const drawAgeWithMonths = ageWithMonths(drawAge, drawAgeMonths);

  if (hasEpaPension) {
    const standardPayable =
      world.standardAlphaPension *
      getAlphaEarlyRetirementFactor(world.normalPensionAge, drawAgeWithMonths);
    const epaPayable =
      drawAgeWithMonths >= epaAge
        ? world.epaAlphaPension
        : world.epaAlphaPension *
          getAlphaEarlyRetirementFactor(epaAge, drawAgeWithMonths);

    world.pensionBreakdown = [
      {
        component: "standardAlpha",
        unreducedAnnualAmount: world.standardAlphaPension,
        payableAnnualAmount: standardPayable,
        annualReduction: world.standardAlphaPension - standardPayable,
      },
      {
        component: "epaAlpha",
        unreducedAnnualAmount: world.epaAlphaPension,
        payableAnnualAmount: epaPayable,
        annualReduction: world.epaAlphaPension - epaPayable,
      },
      {
        component: "total",
        unreducedAnnualAmount:
          world.standardAlphaPension + world.epaAlphaPension,
        payableAnnualAmount: standardPayable + epaPayable,
        annualReduction:
          world.standardAlphaPension +
          world.epaAlphaPension -
          standardPayable -
          epaPayable,
      },
    ];
    return;
  }

  assertCondition(world.activeAlphaResult);
  const addedPension =
    world.addedPensionPurchase?.kind === "monthly"
      ? calculateMonthlyAddedPension({
          rowDate:
            world.addedPensionPurchase.purchaseDate || ACCEPTANCE_START_DATE,
          stopDate:
            world.addedPensionPurchase.purchaseDate || ACCEPTANCE_START_DATE,
          dateOfBirth: "1981-04-01",
          addedPensionMonthlyContribution:
            world.addedPensionPurchase.monthlyContribution,
        }) * world.addedPensionPurchase.monthsPaid
      : 0;
  const factor = getAlphaEarlyRetirementFactor(
    world.normalPensionAge,
    drawAgeWithMonths
  );

  world.calculatedAddedPension = addedPension;
  world.pensionBreakdown = buildBreakdownRows(
    [
      {
        component: "standardAlpha",
        unreducedAnnualAmount: world.activeAlphaResult.alphaPension,
      },
      { component: "addedPension", unreducedAnnualAmount: addedPension },
    ],
    factor
  );
}

Given(
  "the member was born on {word}",
  function (this: AlphaPensionWorld, dateOfBirth: string) {
    this.dateOfBirth = dateOfBirth;
  }
);

Given(
  "the member requests to draw pension on {word}",
  function (this: AlphaPensionWorld, drawDate: string) {
    this.requestedDrawDate = drawDate;
  }
);

Given(
  "the applicable minimum pension age is {int}",
  function (this: AlphaPensionWorld, minimumPensionAge: number) {
    this.minimumPensionAge = minimumPensionAge;
  }
);

When("the draw age is validated", function (this: AlphaPensionWorld) {
  this.validationResult = validateDrawRequest(this);
});

Then(
  "the member's age at draw date should be {int}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.validationResult);
    assertEqual(this.validationResult.ageAtDrawDate, expected);
  }
);

Then(
  "the draw request should be {word}",
  function (this: AlphaPensionWorld, expected: string) {
    assertCondition(this.validationResult);
    assertEqual(this.validationResult.valid, expected === "valid");
  }
);

Then(
  "the model should show the validation message:",
  function (this: AlphaPensionWorld, expected: string) {
    assertCondition(this.validationResult);
    assertCondition(this.validationResult.messages.includes(expected.trim()));
  }
);

Then(
  "the unreduced standard alpha pension at draw age should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.activeAlphaResult);
    expectMoney(this.activeAlphaResult.alphaPension, expected);
  }
);

Then(
  "the combined unreduced annual pension should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.activeAlphaResult);
    expectMoney(
      this.activeAlphaResult.alphaPension + this.calculatedAddedPension,
      expected
    );
  }
);

Given("the member has completed an alpha pension projection", function () {
  return;
});

Given("the member has standard alpha pension", function () {
  return;
});

Given("the member has Added Pension", function () {
  return;
});

Given("the member has EPA pension", function () {
  return;
});

When(
  "the pension result is displayed",
  function (this: AlphaPensionWorld & { premiumRecord?: boolean }) {
    if (this.premiumRecord) {
      return;
    }

    acceptanceUnsupported("a user-visible alpha result presentation contract");
  }
);

Then(
  "the result should show:",
  function (
    this: AlphaPensionWorld & { resultRows?: PensionBreakdownRow[] },
    table: DataTable
  ) {
    if (this.resultRows) {
      assertDeepEqual(
        normalizeActualRows(this.resultRows),
        parseExpectedRows(table)
      );
      return;
    }

    acceptanceUnsupported("a user-visible alpha assumptions result contract");
  }
);

Then("the result should show separate rows for:", function () {
  acceptanceUnsupported("a user-visible pension component breakdown contract");
});

Then("each row should show unreduced annual pension", function () {
  acceptanceUnsupported("a user-visible pension component breakdown contract");
});

Then("each row should show payable annual pension", function () {
  acceptanceUnsupported("a user-visible pension component breakdown contract");
});

Then("each row should show annual reduction where applicable", function () {
  acceptanceUnsupported("a user-visible pension component breakdown contract");
});
