import {
  DataTable,
  Given,
  Then,
  When,
  setWorldConstructor,
} from "@cucumber/cucumber";
import {
  addMonths,
  addYears,
  calculateAge,
  createProjectionTable,
  deriveInflationAssumptions,
} from "../../src/projection-core";
import { getVisibleProjectionTableColumns } from "../../src/app/projection-table";
import { buildInflationRows } from "../../src/app/results-summary";
import {
  calculateMinimumPensionAccessAge,
  defaultSettings,
  getAlphaEpaDate,
} from "../../src/settings";
import { validateAlphaPensionRules } from "../../src/settings/settings-domains/alpha-pension";
import { calculateNormalPensionAge } from "../../src/settings/settings-shared/state";
import {
  calculateAlphaCommutation,
  calculateAlphaLateRetirementMultiplier,
  calculateAlphaPartialRetirement,
  calculateAlphaPensionAfterAnnualIncrease,
  calculateAlphaPensionComponentBreakdown,
  calculateAnnualAlphaPensionIncludingReduction,
  calculateAlphaPensionRevaluationFactor,
  calculateLumpSumAddedPension,
  calculateMonthlyAddedPension,
  calculateMonthlyAlphaPensionGross,
  calculateMonthlyEpaAlphaAccrual,
  calculateMonthlyStandardAlphaAccrual,
  calculateProjectedAlphaPensionableEarnings,
  calculateStartingAlphaPensionAtStartDate,
  getAddedPensionFactorForAge,
  getAlphaEarlyRetirementFactor,
  getAlphaLeavingServiceOutcome,
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
  minimumClaimAge = 0;
  activeAlphaResult: ActiveAlphaResult | undefined;
  deferredPensionAtDrawAge = 0;
  totalAddedPensionContribution = 0;
  calculatedAddedPension = 0;
  annualAlphaPensionPayable = 0;
  annualReduction = 0;
  pensionBreakdown: PensionBreakdownRow[] = [];
  hasCompletedAlphaProjection = false;
  hasAlphaComponentInputs = false;
  displayedAlphaAssumptions: string[] = [];
  displayedAlphaColumns: string[] = [];
  derivedNormalPensionAge = 0;
  annualPensionAfterIncrease = 0;
  lateRetirementStatus: "active" | "deferred" = "active";
  lateRetirementMultiplier: number | null = 1;
  commutationResult:
    | {
        annualPensionAfterCommutation: number;
        retirementLumpSum: number;
      }
    | undefined;
  annualPensionExchanged = 0;
  partialRetirementResult:
    | {
        eligible: boolean;
        annualPensionPayable: number;
        remainingAccruedPension: number;
      }
    | undefined;
  partialRetirementPayReduction = 0;
  partialRetirementPensionTaken = 0;
  partialRetirementEmployerAgreement = false;
  partialRetirementMinimumAgeReached = false;
  partialRetirementWorkPercent = 0;
  qualifyingServiceYears = 0;
  leavingServiceOutcome = "";
  addedPensionFactorType: "self" | "self_plus_beneficiaries" = "self";
  selectedAddedPensionFactor = 0;
  monthlyStandardAccrual = 0;
  monthlyEpaAccrual = 0;
  epaAccrualStartDate = "";
  epaAccrualEndDate = "";
  epaPayableDate = "";
  alphaStatementDate = "";
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
  const normalPensionAge = calculateNormalPensionAge(world.dateOfBirth);
  const settings = {
    ...defaultSettings,
    startDate: ACCEPTANCE_START_DATE,
    dateOfBirth: world.dateOfBirth,
    lifeExpectancy: 90,
    requirementAge: 55,
    normalPensionAge,
    showAlpha: true,
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
    projectionBasis: world.cpiEnabled
      ? ("nominal" as const)
      : ("real" as const),
    inflationRateAnnual: world.cpiRate,
    accruedPensionAtLastAbs: world.startingAlphaPension,
    alphaPensionAbsDate: "2026",
    alphaPensionLeaveAge: normalPensionAge,
    alphaPensionDrawAge: normalPensionAge,
    pensionableEarnings: world.startingSalary,
    alphaPayRisePercent: world.salaryIncrease,
    alphaAddedPensionMonthly: 0,
    alphaAddedPensionLumpSums: [],
  };
  const projectionRows = createProjectionTable(settings);
  const breakdown: ActiveAlphaResult["breakdown"] = [];
  let newAlphaAccrual = 0;

  for (let schemeYear = 1; schemeYear <= activeYears; schemeYear += 1) {
    const rowDate = addMonths(ACCEPTANCE_START_DATE, (schemeYear - 1) * 12);
    const schemeYearEndDate = addMonths(
      ACCEPTANCE_START_DATE,
      schemeYear * 12 - 1
    );
    const pensionableSalary = calculateProjectedAlphaPensionableEarnings(
      settings,
      rowDate
    );
    let annualAccrual = 0;

    for (let month = 0; month < 12; month += 1) {
      annualAccrual += calculateMonthlyStandardAlphaAccrual(
        settings,
        addMonths(rowDate, month)
      );
    }

    newAlphaAccrual += annualAccrual;
    const schemeYearEndRow = projectionRows.find(
      (row) => row.date === schemeYearEndDate
    );

    assertCondition(
      schemeYearEndRow,
      `Expected a production projection row for ${schemeYearEndDate}`
    );
    breakdown.push({
      schemeYear,
      pensionableSalary,
      annualAccrual,
      accruedAlphaPension: schemeYearEndRow.annualAccruedAlphaPension,
    });
  }

  const finalRow = breakdown.at(-1);
  assertCondition(finalRow, "Expected at least one active scheme year");

  return {
    alphaPension: finalRow.accruedAlphaPension,
    finalSalary: calculateProjectedAlphaPensionableEarnings(
      settings,
      addYears(ACCEPTANCE_START_DATE, activeYears)
    ),
    newAlphaAccrual,
    breakdown,
  };
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

Given(
  "pension outputs are rounded to {int} decimal places",
  function (precision: number) {
    assertEqual(precision, 2);
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
  "the model should apply CPI revaluation after leaving service",
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
    this.pensionBreakdown = calculateAlphaPensionComponentBreakdown([
      {
        component: "alpha",
        unreducedAnnualAmount: this.unreducedAlphaPension,
        paymentFactor: 1,
      },
      {
        component: "addedPension",
        unreducedAnnualAmount: this.purchasedAnnualAddedPension,
        paymentFactor: 1,
      },
    ]).map((row) => ({
      component: row.component,
      annualAmount: row.payableAnnualAmount,
    }));
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

  world.pensionBreakdown = calculateAlphaPensionComponentBreakdown([
    {
      component: "alpha",
      unreducedAnnualAmount: world.unreducedAlphaPension,
      paymentFactor: factor,
    },
    {
      component: "addedPension",
      unreducedAnnualAmount: world.purchasedAnnualAddedPension,
      paymentFactor: factor,
    },
  ]);
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
  function (this: AlphaPensionWorld, age: number, expected: number) {
    const annualPensionAtLaterAge =
      calculateMonthlyAlphaPensionGross(
        addYears(this.dateOfBirth, age),
        addYears(
          this.dateOfBirth,
          ageWithMonths(this.drawAge, this.drawAgeMonths)
        ),
        this.annualAlphaPensionPayable
      ) * 12;

    expectMoney(annualPensionAtLaterAge, expected);
  }
);

Then(
  "the model should not remove the early retirement reduction at normal pension age",
  function (
    this: AlphaPensionWorld & {
      unreducedAnnualPremiumPension?: number;
      annualPremiumPensionAtAge60BeforeIncreases?: number;
    }
  ) {
    if (
      this.unreducedAnnualPremiumPension !== undefined &&
      this.annualPremiumPensionAtAge60BeforeIncreases !== undefined
    ) {
      assertCondition(
        this.annualPremiumPensionAtAge60BeforeIncreases <
          this.unreducedAnnualPremiumPension,
        "Expected the Premium early-retirement reduction to remain at NPA"
      );
      return;
    }

    assertCondition(
      this.annualAlphaPensionPayable < this.unreducedAlphaPension,
      "Expected the early-retirement reduction to remain in the payment amount"
    );
  }
);

When(
  /^the member selects EPA option (NPA-[123])$/,
  function (this: AlphaPensionWorld, option: "NPA-1" | "NPA-2" | "NPA-3") {
    this.epaOption = option;
    const yearsBeforeNpa = Number(option.replace("NPA-", ""));
    const payableAge = this.normalPensionAge - yearsBeforeNpa;
    const settings = {
      ...defaultSettings,
      showAlpha: true,
      alphaEpaEnabled: true,
      alphaEpaYearsBeforeNpa: yearsBeforeNpa,
    };
    const issues = validateAlphaPensionRules({
      settings,
      lifeExpectancyDate: addYears(settings.dateOfBirth, 90),
      alphaDrawDate: addYears(settings.dateOfBirth, payableAge),
      alphaLeaveDate: addYears(settings.dateOfBirth, payableAge),
      alphaAccrualStopDate: addYears(settings.dateOfBirth, payableAge),
      alphaAbsDate: ACCEPTANCE_START_DATE,
      alphaEpaAgeDate: addYears(settings.dateOfBirth, payableAge),
      latestAlphaAddedPensionPurchaseDate: addYears(settings.dateOfBirth, 67),
    });
    const hasEpaAgeIssue = issues.some(
      (issue) => issue.field === "alphaEpaYearsBeforeNpa"
    );

    this.epaValidation = {
      valid: !hasEpaAgeIssue,
      payableAge: hasEpaAgeIssue ? undefined : payableAge,
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
    const standardFactor = getAlphaEarlyRetirementFactor(
      world.normalPensionAge,
      drawAgeWithMonths
    );
    const epaFactor =
      drawAgeWithMonths >= epaAge
        ? 1
        : getAlphaEarlyRetirementFactor(epaAge, drawAgeWithMonths);

    world.pensionBreakdown = calculateAlphaPensionComponentBreakdown([
      {
        component: "standardAlpha",
        unreducedAnnualAmount: world.standardAlphaPension,
        paymentFactor: standardFactor,
      },
      {
        component: "epaAlpha",
        unreducedAnnualAmount: world.epaAlphaPension,
        paymentFactor: epaFactor,
      },
    ]);
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
          calculationDate:
            world.addedPensionPurchase.purchaseDate || ACCEPTANCE_START_DATE,
          dateOfBirth: world.dateOfBirth,
          addedPensionMonthlyContribution:
            world.addedPensionPurchase.monthlyContribution,
        }) * world.addedPensionPurchase.monthsPaid
      : 0;
  const factor = getAlphaEarlyRetirementFactor(
    world.normalPensionAge,
    drawAgeWithMonths
  );

  world.calculatedAddedPension = addedPension;
  world.pensionBreakdown = calculateAlphaPensionComponentBreakdown([
    {
      component: "standardAlpha",
      unreducedAnnualAmount: world.activeAlphaResult.alphaPension,
      paymentFactor: factor,
    },
    {
      component: "addedPension",
      unreducedAnnualAmount: addedPension,
      paymentFactor: factor,
    },
  ]);
}

Given(
  "the member was born on {word}",
  function (this: AlphaPensionWorld, dateOfBirth: string) {
    this.dateOfBirth = dateOfBirth;
  }
);

Given(
  "the member's date of birth is {word}",
  function (this: AlphaPensionWorld, dateOfBirth: string) {
    this.dateOfBirth = dateOfBirth;
  }
);

When("the minimum claim age is determined", function (this: AlphaPensionWorld) {
  this.minimumClaimAge = calculateMinimumPensionAccessAge(this.dateOfBirth);
});

Then(
  "the minimum claim age is {int}",
  function (this: AlphaPensionWorld, expected: number) {
    assertEqual(this.minimumClaimAge, expected);
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

Given(
  "the member has completed an alpha pension projection",
  function (this: AlphaPensionWorld) {
    this.hasCompletedAlphaProjection = true;
  }
);

Given(
  "the member has standard alpha pension",
  function (this: AlphaPensionWorld) {
    this.hasAlphaComponentInputs = true;
  }
);

Given("the member has Added Pension", function (this: AlphaPensionWorld) {
  this.hasAlphaComponentInputs = true;
});

Given("the member has EPA pension", function (this: AlphaPensionWorld) {
  this.hasAlphaComponentInputs = true;
});

When(
  "the pension result is displayed",
  function (this: AlphaPensionWorld & { premiumRecord?: boolean }) {
    if (this.premiumRecord) {
      return;
    }

    if (this.hasCompletedAlphaProjection) {
      const settings = {
        ...defaultSettings,
        showAlpha: true,
        showStatePension: false,
        showSipp: false,
        showCsAvc: false,
        showIsa: false,
        showLisa: false,
        projectionBasis: "nominal" as const,
        inflationRateAnnual: 2,
      };
      this.displayedAlphaAssumptions = buildInflationRows(
        settings,
        deriveInflationAssumptions(settings),
        false
      ).map((row) => row.assumption);
    }

    if (this.hasAlphaComponentInputs) {
      this.displayedAlphaColumns = getVisibleProjectionTableColumns({
        ...defaultSettings,
        showAlpha: true,
      })
        .filter((column) =>
          [
            "monthlyAddedPension",
            "lumpSumAddedPension",
            "annualStandardAlphaPension",
            "annualEpaAlphaPension",
            "annualAccruedAlphaPension",
            "annualAlphaPensionIncludingReduction",
          ].includes(column.key)
        )
        .map((column) => column.label);
    }
  }
);

Then(
  "the Alpha revaluation assumptions should include:",
  function (this: AlphaPensionWorld, table: DataTable) {
    assertDeepEqual(
      this.displayedAlphaAssumptions,
      table.hashes().map((row) => row.assumption)
    );
  }
);

Then(
  "the Alpha projection table should include columns:",
  function (this: AlphaPensionWorld, table: DataTable) {
    assertDeepEqual(
      this.displayedAlphaColumns,
      table.hashes().map((row) => row.column)
    );
  }
);

Then(
  "the result should show:",
  function (
    this: AlphaPensionWorld & { resultRows?: PensionBreakdownRow[] },
    table: DataTable
  ) {
    assertCondition(this.resultRows);
    assertDeepEqual(
      normalizeActualRows(this.resultRows),
      parseExpectedRows(table)
    );
  }
);

When(
  "the Alpha Normal Pension Age is determined",
  function (this: AlphaPensionWorld) {
    this.derivedNormalPensionAge = calculateNormalPensionAge(this.dateOfBirth);
  }
);

Then(
  "the Alpha Normal Pension Age should be {int} years and {int} months",
  function (this: AlphaPensionWorld, years: number, months: number) {
    const totalMonths = Math.floor(this.derivedNormalPensionAge * 12 + 1e-8);

    assertEqual(Math.floor(totalMonths / 12), years);
    assertEqual(totalMonths % 12, months);
  }
);

Given(
  "the member has actual pensionable earnings of {float}",
  function (this: AlphaPensionWorld, earnings: number) {
    this.startingSalary = earnings;
  }
);

When(
  "one year of Alpha pension is accrued",
  function (this: AlphaPensionWorld) {
    const settings = {
      ...defaultSettings,
      showAlpha: true,
      pensionableEarnings: this.startingSalary,
      alphaPayRisePercent: 0,
      alphaEpaEnabled: false,
      partialRetirementEnabled: this.partialRetirementWorkPercent > 0,
      partialRetirementStartAge: 0,
      partialRetirementWorkPercent: this.partialRetirementWorkPercent,
    };

    this.monthlyStandardAccrual =
      calculateMonthlyStandardAlphaAccrual(settings, ACCEPTANCE_START_DATE) *
      12;
  }
);

Then(
  "the new annual Alpha pension should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.monthlyStandardAccrual, expected);
  }
);

Given(
  "the last statement recorded Alpha pension of {float} on {word}",
  function (
    this: AlphaPensionWorld,
    annualPension: number,
    statementDate: string
  ) {
    this.startingAlphaPension = annualPension;
    this.alphaStatementDate = statementDate;
  }
);

When(
  "the starting Alpha pension is calculated on {word}",
  function (this: AlphaPensionWorld, calculationDate: string) {
    this.annualAlphaPensionPayable = calculateStartingAlphaPensionAtStartDate({
      alphaPensionAccruedAtLastStatement: this.startingAlphaPension,
      alphaPensionAbsDate: this.alphaStatementDate,
      startDate: calculationDate,
      pensionableEarnings: this.startingSalary,
    });
  }
);

Then(
  "the starting Alpha pension should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.annualAlphaPensionPayable, expected);
  }
);

Given(
  "annual Alpha pension of {float}",
  function (this: AlphaPensionWorld, annualPension: number) {
    this.unreducedAlphaPension = annualPension;
  }
);

Given(
  "annual Alpha pension in payment of {float}",
  function (this: AlphaPensionWorld, annualPension: number) {
    this.unreducedAlphaPension = annualPension;
  }
);

When(
  "an annual price adjustment of {word} is applied",
  function (this: AlphaPensionWorld, adjustment: string) {
    this.annualPensionAfterIncrease = calculateAlphaPensionAfterAnnualIncrease(
      this.unreducedAlphaPension,
      parsePercent(adjustment)
    );
  }
);

Then(
  "the adjusted annual Alpha pension should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.annualPensionAfterIncrease, expected);
  }
);

Given(
  "the member has {float} years of qualifying service",
  function (this: AlphaPensionWorld, years: number) {
    this.qualifyingServiceYears = years;
  }
);

When(
  "the member leaves Alpha pensionable service",
  function (this: AlphaPensionWorld) {
    this.leavingServiceOutcome = getAlphaLeavingServiceOutcome(
      this.qualifyingServiceYears
    );
  }
);

Then(
  "the leaving-service outcome should be {word}",
  function (this: AlphaPensionWorld, expected: string) {
    assertEqual(this.leavingServiceOutcome, expected);
  }
);

Given(
  "the member selects Added Pension benefits for {word}",
  function (this: AlphaPensionWorld, benefits: string) {
    this.addedPensionFactorType =
      benefits === "self_only" ? "self" : "self_plus_beneficiaries";
  }
);

When(
  "the lump-sum Added Pension factor is selected for age {int} and NPA {int}",
  function (this: AlphaPensionWorld, age: number, normalPensionAge: number) {
    this.selectedAddedPensionFactor = getAddedPensionFactorForAge(
      age,
      this.addedPensionFactorType,
      "lump_sum",
      normalPensionAge
    );
  }
);

When(
  "the lump-sum Added Pension factor is selected for age {int} and NPA {int} years {int} months",
  function (
    this: AlphaPensionWorld,
    age: number,
    normalPensionAgeYears: number,
    normalPensionAgeMonths: number
  ) {
    this.selectedAddedPensionFactor = getAddedPensionFactorForAge(
      age,
      this.addedPensionFactorType,
      "lump_sum",
      ageWithMonths(normalPensionAgeYears, normalPensionAgeMonths)
    );
  }
);

Then(
  "the Added Pension purchase factor should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertEqual(this.selectedAddedPensionFactor, expected);
  }
);

When(
  "the contribution is projected on {word} after stopping on {word}",
  function (this: AlphaPensionWorld, rowDate: string, stopDate: string) {
    assertCondition(this.addedPensionPurchase?.kind === "monthly");
    this.calculatedAddedPension = calculateMonthlyAddedPension({
      rowDate,
      stopDate,
      dateOfBirth: this.dateOfBirth,
      addedPensionMonthlyContribution:
        this.addedPensionPurchase.monthlyContribution,
    });
  }
);

Then(
  "the new annual Added Pension should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.calculatedAddedPension, expected);
  }
);

Given(
  "the member has an Alpha opening balance of {float} at NPA {int}",
  function (
    this: AlphaPensionWorld,
    openingBalance: number,
    normalPensionAge: number
  ) {
    this.unreducedAlphaPension = openingBalance;
    this.normalPensionAge = normalPensionAge;
  }
);

Given(
  /^the member retires late from (active|deferred) status$/,
  function (this: AlphaPensionWorld, status: "active" | "deferred") {
    this.lateRetirementStatus = status;
  }
);

When(
  "the member claims Alpha pension at age {int} and {int} months",
  function (this: AlphaPensionWorld, age: number, months: number) {
    this.lateRetirementMultiplier = calculateAlphaLateRetirementMultiplier({
      normalPensionAge: this.normalPensionAge,
      retirementAge: ageWithMonths(age, months),
      status: this.lateRetirementStatus,
    });
    assertCondition(
      this.lateRetirementMultiplier !== null,
      "Expected a published late-retirement factor"
    );
    this.annualAlphaPensionPayable =
      this.unreducedAlphaPension * this.lateRetirementMultiplier;
  }
);

Then(
  "the late-retirement multiplier should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.lateRetirementMultiplier !== null);
    assertCondition(
      Math.abs(this.lateRetirementMultiplier - expected) < 0.000001,
      `Expected ${this.lateRetirementMultiplier} to be within 0.000001 of ${expected}`
    );
  }
);

Then(
  "the annual Alpha opening balance with late increase should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.annualAlphaPensionPayable, expected);
  }
);

Given(
  "EPA accrual is active from {word} to {word}",
  function (this: AlphaPensionWorld, startDate: string, endDate: string) {
    this.epaAccrualStartDate = startDate;
    this.epaAccrualEndDate = endDate;
  }
);

When(
  "Alpha accrual is calculated for {word}",
  function (this: AlphaPensionWorld, rowDate: string) {
    const settings = {
      ...defaultSettings,
      showAlpha: true,
      pensionableEarnings: this.startingSalary,
      alphaPayRisePercent: 0,
      alphaEpaEnabled: true,
      alphaEpaStartDate: this.epaAccrualStartDate,
      alphaEpaEndDate: this.epaAccrualEndDate,
    };

    this.monthlyStandardAccrual = calculateMonthlyStandardAlphaAccrual(
      settings,
      rowDate
    );
    this.monthlyEpaAccrual = calculateMonthlyEpaAlphaAccrual(settings, rowDate);
  }
);

Then(
  "monthly standard Alpha accrual should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.monthlyStandardAccrual, expected);
  }
);

Then(
  "monthly EPA Alpha accrual should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    expectMoney(this.monthlyEpaAccrual, expected);
  }
);

When("the EPA payable date is determined", function (this: AlphaPensionWorld) {
  this.epaPayableDate = getAlphaEpaDate({
    ...defaultSettings,
    dateOfBirth: this.dateOfBirth,
    alphaEpaEnabled: true,
    alphaEpaYearsBeforeNpa: Number(this.epaOption.replace("NPA-", "")),
  });
});

Then(
  "the EPA payable date should be {word}",
  function (this: AlphaPensionWorld, expected: string) {
    assertEqual(this.epaPayableDate, expected);
  }
);

Given(
  "annual Alpha pension before commutation of {float}",
  function (this: AlphaPensionWorld, annualPension: number) {
    this.unreducedAlphaPension = annualPension;
  }
);

Given(
  "annual Alpha pension exchanged of {float}",
  function (this: AlphaPensionWorld, annualPension: number) {
    this.annualPensionExchanged = annualPension;
  }
);

When("Alpha commutation is calculated", function (this: AlphaPensionWorld) {
  this.commutationResult = calculateAlphaCommutation({
    annualPensionBeforeCommutation: this.unreducedAlphaPension,
    annualPensionExchanged: this.annualPensionExchanged,
  });
});

Then(
  "annual Alpha pension after commutation should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.commutationResult);
    expectMoney(this.commutationResult.annualPensionAfterCommutation, expected);
  }
);

Then(
  "the Alpha retirement lump sum should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.commutationResult);
    expectMoney(this.commutationResult.retirementLumpSum, expected);
  }
);

Given(
  "the member has accrued Alpha pension of {float}",
  function (this: AlphaPensionWorld, annualPension: number) {
    this.unreducedAlphaPension = annualPension;
  }
);

Given(
  "the member chooses to take {word} of it",
  function (this: AlphaPensionWorld, percentage: string) {
    this.partialRetirementPensionTaken = parsePercent(percentage);
  }
);

Given(
  "their pensionable earnings reduce by {word}",
  function (this: AlphaPensionWorld, percentage: string) {
    this.partialRetirementPayReduction = parsePercent(percentage);
  }
);

Given(
  "the member works at {word} of their previous hours after partial retirement",
  function (this: AlphaPensionWorld, percentage: string) {
    this.partialRetirementWorkPercent = parsePercent(percentage);
  }
);

Given(
  "they have reached minimum pension age",
  function (this: AlphaPensionWorld) {
    this.partialRetirementMinimumAgeReached = true;
  }
);

Given(
  "their employer agrees to partial retirement",
  function (this: AlphaPensionWorld) {
    this.partialRetirementEmployerAgreement = true;
  }
);

When(
  "Alpha partial retirement is calculated",
  function (this: AlphaPensionWorld) {
    this.partialRetirementResult = calculateAlphaPartialRetirement({
      accruedAlphaPension: this.unreducedAlphaPension,
      pensionTakenPercent: this.partialRetirementPensionTaken,
      payReductionPercent: this.partialRetirementPayReduction,
      hasEmployerAgreement: this.partialRetirementEmployerAgreement,
      hasReachedMinimumPensionAge: this.partialRetirementMinimumAgeReached,
    });
  }
);

Then(
  "partial retirement should be {word}",
  function (this: AlphaPensionWorld, expected: string) {
    assertCondition(this.partialRetirementResult);
    assertEqual(this.partialRetirementResult.eligible, expected === "eligible");
  }
);

Then(
  "annual Alpha pension released should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.partialRetirementResult);
    expectMoney(this.partialRetirementResult.annualPensionPayable, expected);
  }
);

Then(
  "annual Alpha pension remaining should be {float}",
  function (this: AlphaPensionWorld, expected: number) {
    assertCondition(this.partialRetirementResult);
    expectMoney(this.partialRetirementResult.remainingAccruedPension, expected);
  }
);
