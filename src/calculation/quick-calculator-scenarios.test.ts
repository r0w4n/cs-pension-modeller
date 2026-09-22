import { describe, expect, it } from "vitest";
import { addYearsToIsoDate } from "../model-date";
import {
  calculateNormalPensionAge,
  calculateStatePensionDrawDate,
  createDefaultSettings,
  normalizeSettings,
  type PensionSettings,
} from "../settings";
import { calculateRetirementPlan } from "./retirement-plan";
import {
  createQuickCalculatorBaseSettings,
  QUICK_CALCULATOR_SCENARIOS,
  runQuickCalculatorScenarios,
  type QuickCalculatorVariant,
} from "./quick-calculator-scenarios";

const CALCULATION_DATE = "2026-09-22";

function validInputs(): PensionSettings {
  return {
    ...createDefaultSettings(),
    dateOfBirth: "1987-06-01",
    alphaPensionAbsDate: "2025",
    accruedPensionAtLastAbs: 5_000,
    pensionableEarnings: 42_000,
    alphaPensionDrawAge: 60,
    alphaAddedPensionMonthly: 200,
    alphaAddedPensionFactorType: "self_plus_beneficiaries",
    partialRetirementStartAge: 55,
    partialRetirementWorkPercent: 50,
  };
}

function readyBase(
  inputs: PensionSettings,
  calculationDate = CALCULATION_DATE
) {
  const built = createQuickCalculatorBaseSettings({
    defaults: createDefaultSettings(),
    inputs,
    calculationDate,
  });
  if (built.status !== "ready") {
    throw new Error(
      built.validationIssues.map((issue) => issue.message).join(" ")
    );
  }
  return built.settings;
}

function independentlyExpectedScenario(
  inputs: PensionSettings,
  basis: "normal" | "selected",
  variant: QuickCalculatorVariant
) {
  const defaults = createDefaultSettings();
  const normalPensionAge = calculateNormalPensionAge(inputs.dateOfBirth);
  const retirementAge =
    basis === "normal" ? normalPensionAge : inputs.alphaPensionDrawAge;
  const usesAdded = variant === "added" || variant === "reduced-added";
  const requestsReduced = variant === "reduced" || variant === "reduced-added";
  const usesReduced =
    requestsReduced && inputs.partialRetirementStartAge < retirementAge;

  return normalizeSettings(
    {
      ...defaults,
      startDate: CALCULATION_DATE,
      dateOfBirth: inputs.dateOfBirth,
      lifeExpectancy: Math.max(defaults.lifeExpectancy, 80),
      requirementAge: retirementAge,
      normalPensionAge,
      showAlpha: true,
      showClassic: false,
      showClassicPlus: false,
      showNuvos: false,
      showPremium: false,
      showStatePension: inputs.showStatePension,
      showSipp: false,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
      showAdditionalGuaranteedIncome: false,
      additionalGuaranteedIncomes: [],
      taxationEnabled: false,
      retirementIncomeTargetBasis: "gross",
      desiredRetirementIncome: 0,
      spendingStrategyType: "FLAT",
      flexibleWithdrawalPriority: [],
      projectionBasis: "real",
      applyPensionIncreases: true,
      alphaPayRisePercent: 0,
      alphaPensionAbsDate: inputs.alphaPensionAbsDate,
      accruedPensionAtLastAbs: inputs.accruedPensionAtLastAbs,
      pensionableEarnings: inputs.pensionableEarnings,
      fullSalary: inputs.pensionableEarnings,
      alphaPensionLeaveAge: retirementAge,
      alphaPensionDrawAge: retirementAge,
      alphaAddedPensionMonthly: usesAdded ? inputs.alphaAddedPensionMonthly : 0,
      alphaAddedPensionFactorType: inputs.alphaAddedPensionFactorType,
      alphaAddedPensionLumpSums: [],
      partialRetirementEnabled: usesReduced,
      partialRetirementStartAge: inputs.partialRetirementStartAge,
      partialRetirementWorkPercent: inputs.partialRetirementWorkPercent,
      currentStatePension: inputs.currentStatePension,
      statePensionForecastConfirmed: inputs.statePensionForecastConfirmed,
      statePensionDrawDate: calculateStatePensionDrawDate(inputs.dateOfBirth),
      statePensionApplyFutureGrowth: false,
      alphaEpaEnabled: inputs.alphaEpaEnabled,
      alphaEpaPeriods: inputs.alphaEpaPeriods.map((period) => ({ ...period })),
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: false,
        flexibleWithdrawalPriority: [],
        spendingSmile: { ...defaults.jointRetirement.spendingSmile },
      },
      partner: undefined,
    },
    { fallbackStartDate: CALCULATION_DATE }
  );
}

describe("quick calculator scenarios", () => {
  it("matches independently specified canonical settings and calculations for all eight variants", () => {
    const inputs = validInputs();
    const inputsBefore = structuredClone(inputs);
    const defaults = createDefaultSettings();
    const defaultsBefore = structuredClone(defaults);
    const built = createQuickCalculatorBaseSettings({
      defaults,
      inputs,
      calculationDate: CALCULATION_DATE,
    });
    expect(built.status).toBe("ready");
    if (built.status !== "ready") return;
    const baseBefore = structuredClone(built.settings);
    const batch = runQuickCalculatorScenarios({
      baseSettings: built.settings,
      calculationDate: CALCULATION_DATE,
    });

    expect(batch.scenarios.map((scenario) => scenario.id)).toEqual(
      QUICK_CALCULATOR_SCENARIOS.map(([id]) => id)
    );
    for (const [id, basis, variant] of QUICK_CALCULATOR_SCENARIOS) {
      const actual = batch.scenarios.find((scenario) => scenario.id === id);
      const expectedSettings = independentlyExpectedScenario(
        inputs,
        basis,
        variant
      );
      const expectedResult = calculateRetirementPlan(expectedSettings, {
        includeTargetBasedWithdrawalPreviews: false,
      });

      expect(actual?.settings).toMatchObject({
        startDate: CALCULATION_DATE,
        requirementAge: expectedSettings.requirementAge,
        alphaPensionLeaveAge: expectedSettings.alphaPensionLeaveAge,
        alphaPensionDrawAge: expectedSettings.alphaPensionDrawAge,
        alphaAddedPensionMonthly: expectedSettings.alphaAddedPensionMonthly,
        partialRetirementEnabled: expectedSettings.partialRetirementEnabled,
        partialRetirementStartAge: expectedSettings.partialRetirementStartAge,
        partialRetirementWorkPercent:
          expectedSettings.partialRetirementWorkPercent,
      });
      expect(actual?.result?.summary.alphaPension.annualAtDraw).toBeCloseTo(
        expectedResult.summary.alphaPension.annualAtDraw,
        8
      );
    }

    expect(
      batch.scenarios.find((scenario) => scenario.id === "selected-standard")
        ?.result?.summary.alphaPension.annualAtDraw
    ).toBeCloseTo(17_582.0712, 6);

    expect(defaults).toEqual(defaultsBefore);
    expect(inputs).toEqual(inputsBefore);
    expect(built.settings).toEqual(baseBefore);
  });

  it("rejects raw enabled EPA dates before normalisation can repair them", () => {
    const inputs = {
      ...validInputs(),
      alphaEpaEnabled: true,
      alphaEpaPeriods: [
        {
          id: "raw-epa",
          yearsBeforeNpa: 1 as const,
          startDate: "",
          endDate: "2026-02-30",
        },
      ],
    };
    const before = structuredClone(inputs);
    const built = createQuickCalculatorBaseSettings({
      defaults: createDefaultSettings(),
      inputs,
      calculationDate: CALCULATION_DATE,
    });

    expect(built).toMatchObject({
      status: "invalid",
      settings: null,
      validationIssues: [
        { itemId: "raw-epa", message: "Enter a valid EPA start date." },
        { itemId: "raw-epa", message: "Enter a valid EPA end date." },
      ],
    });
    expect(inputs).toEqual(before);

    inputs.alphaEpaEnabled = false;
    expect(
      createQuickCalculatorBaseSettings({
        defaults: createDefaultSettings(),
        inputs,
        calculationDate: CALCULATION_DATE,
      }).status
    ).toBe("ready");
    inputs.alphaEpaEnabled = true;
    expect(
      createQuickCalculatorBaseSettings({
        defaults: createDefaultSettings(),
        inputs,
        calculationDate: CALCULATION_DATE,
      }).status
    ).toBe("invalid");
  });

  it("keeps overlap and scenario-specific EPA accrual checks canonical", () => {
    const overlap = validInputs();
    overlap.alphaEpaEnabled = true;
    overlap.alphaEpaPeriods = [
      {
        id: "first",
        yearsBeforeNpa: 1,
        startDate: "2030-04-01",
        endDate: "2031-03-31",
      },
      {
        id: "second",
        yearsBeforeNpa: 1,
        startDate: "2031-03-01",
        endDate: "2032-03-31",
      },
    ];
    const overlapBatch = runQuickCalculatorScenarios({
      baseSettings: readyBase(overlap),
      calculationDate: CALCULATION_DATE,
    });
    expect(
      overlapBatch.scenarios.every((scenario) =>
        scenario.validationIssues.some((issue) =>
          issue.message.includes("cannot overlap")
        )
      )
    ).toBe(true);

    const ageSpecific = validInputs();
    ageSpecific.alphaEpaEnabled = true;
    ageSpecific.alphaEpaPeriods = [
      {
        id: "after-selected-retirement",
        yearsBeforeNpa: 1,
        startDate: "2050-04-01",
        endDate: "2051-03-31",
      },
    ];
    const ageSpecificBatch = runQuickCalculatorScenarios({
      baseSettings: readyBase(ageSpecific),
      calculationDate: CALCULATION_DATE,
    });
    expect(
      ageSpecificBatch.scenarios
        .filter((scenario) => scenario.basis === "normal")
        .every((scenario) => scenario.result)
    ).toBe(true);
    expect(
      ageSpecificBatch.scenarios
        .filter((scenario) => scenario.basis === "selected")
        .every((scenario) =>
          scenario.validationIssues.some((issue) =>
            issue.message.includes("overlap the Alpha accrual period")
          )
        )
    ).toBe(true);
  });

  it("applies reduced hours to canonical regular Added Pension accrual rows", () => {
    const batch = runQuickCalculatorScenarios({
      baseSettings: readyBase(validInputs()),
      calculationDate: CALCULATION_DATE,
    });
    const fullHours = batch.scenarios.find(
      (scenario) => scenario.id === "selected-added"
    )?.result;
    const reducedHours = batch.scenarios.find(
      (scenario) => scenario.id === "selected-reduced-added"
    )?.result;
    const firstReducedDate = addYearsToIsoDate("1987-06-01", 55);
    const reducedRow = reducedHours?.rows.find(
      (row) => row.date >= firstReducedDate && row.monthlyAddedPension > 0
    );
    const fullRow = fullHours?.rows.find(
      (row) => row.date === reducedRow?.date
    );

    expect(reducedRow?.monthlyAddedPension).toBeGreaterThan(0);
    expect(reducedRow?.monthlyAddedPension).toBeCloseTo(
      (fullRow?.monthlyAddedPension ?? 0) / 2,
      8
    );
  });

  it("marks only past retirement rows unavailable and keeps the calculation date aligned", () => {
    const inputs = {
      ...validInputs(),
      dateOfBirth: "1959-06-01",
      alphaPensionAbsDate: "2026",
      alphaPensionDrawAge: 68,
    };
    const batch = runQuickCalculatorScenarios({
      baseSettings: readyBase(inputs),
      calculationDate: CALCULATION_DATE,
    });

    expect(
      batch.scenarios
        .filter((scenario) => scenario.basis === "normal")
        .every(
          (scenario) =>
            scenario.result === null &&
            scenario.validationIssues.some((issue) =>
              issue.message.includes("cannot reconstruct retirement")
            )
        )
    ).toBe(true);
    expect(
      batch.scenarios
        .filter((scenario) => scenario.basis === "selected")
        .every(
          (scenario) =>
            scenario.result !== null &&
            scenario.settings.startDate === CALCULATION_DATE
        )
    ).toBe(true);
  });

  it("allows same-day retirement, rejects the previous day, and retains equal NPA rows", () => {
    const sameDay = {
      ...validInputs(),
      dateOfBirth: "1960-09-22",
      alphaPensionAbsDate: "2026",
      alphaPensionDrawAge: 66,
    };
    const sameDayBatch = runQuickCalculatorScenarios({
      baseSettings: readyBase(sameDay),
      calculationDate: CALCULATION_DATE,
    });
    expect(
      sameDayBatch.scenarios
        .filter((scenario) => scenario.basis === "selected")
        .every((scenario) => scenario.result)
    ).toBe(true);

    const previousDay = { ...sameDay, dateOfBirth: "1960-09-21" };
    const previousDayBatch = runQuickCalculatorScenarios({
      baseSettings: readyBase(previousDay),
      calculationDate: CALCULATION_DATE,
    });
    expect(
      previousDayBatch.scenarios
        .filter((scenario) => scenario.basis === "selected")
        .every((scenario) => scenario.result === null)
    ).toBe(true);

    const equalNpa = validInputs();
    equalNpa.alphaPensionDrawAge = calculateNormalPensionAge(
      equalNpa.dateOfBirth
    );
    const equalBatch = runQuickCalculatorScenarios({
      baseSettings: readyBase(equalNpa),
      calculationDate: CALCULATION_DATE,
    });
    expect(equalBatch.scenarios).toHaveLength(8);
    expect(equalBatch.scenarios.every((scenario) => scenario.result)).toBe(
      true
    );
    expect(equalBatch.scenarios[0]?.retirementAge).toBe(
      equalBatch.scenarios[4]?.retirementAge
    );
  });
});
