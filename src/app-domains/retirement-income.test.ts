import {
  createDefaultSettings,
  LISA_MONTHLY_CONTRIBUTION_MAX,
} from "../settings";
import {
  createProjectionTable,
  generatePensionSummary,
  type ProjectionRow,
} from "../projection";
import {
  createBridgeChartLimits,
  createRetirementIncomeSeries,
} from "./retirement-income";

const baseRow: ProjectionRow = {
  date: "2026-06-01",
  age: 39,
  ageMonths: 0,
  milestones: [],
  milestoneDates: [],
  monthlyAddedPension: 0,
  lumpSumAddedPension: 0,
  annualStandardAlphaPension: 0,
  annualEpaAlphaPension: 0,
  annualAccruedAlphaPension: 0,
  annualAlphaPensionIncludingReduction: 0,
  monthlyAlphaPensionGross: 0,
  annualClassicPension: 0,
  classicAutomaticLumpSum: 0,
  annualClassicPensionIncludingReduction: 0,
  classicAutomaticLumpSumIncludingReduction: 0,
  monthlyClassicPensionGross: 0,
  annualClassicPlusPension: 0,
  classicPlusAutomaticLumpSum: 0,
  annualClassicPlusPensionIncludingReduction: 0,
  classicPlusAutomaticLumpSumIncludingReduction: 0,
  monthlyClassicPlusPensionGross: 0,
  annualNuvosPension: 0,
  annualNuvosPensionIncludingReduction: 0,
  monthlyNuvosPensionGross: 0,
  annualPremiumPension: 0,
  annualPremiumPensionIncludingReduction: 0,
  monthlyPremiumPensionGross: 0,
  monthlyStatePension: 0,
  monthlyAdditionalGuaranteedIncomeGross: 0,
  monthlyAdditionalGuaranteedIncomeTaxable: 0,
  sippPot: 0,
  monthlySippPension: 0,
  csAvcPot: 0,
  monthlyCsAvcPension: 0,
  isaPot: 0,
  monthlyIsaPension: 0,
  lisaPot: 0,
  monthlyLisaPension: 0,
  totalMonthlyIncomeBeforeTax: 0,
  monthlyIncomeTax: 0,
  totalMonthlyNetIncome: 0,
};

describe("retirement-income transition points", () => {
  it("removes Alpha income from the chart series when Alpha is hidden", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      showAlpha: false,
      alphaPensionDrawAge: 68,
    };

    const series = createRetirementIncomeSeries(
      [
        {
          ...baseRow,
          date: "2055-06-01",
          age: 68,
          ageMonths: 0,
          monthlyAlphaPensionGross: 1200,
        },
        {
          ...baseRow,
          date: "2056-06-01",
          age: 69,
          ageMonths: 0,
          monthlyAlphaPensionGross: 1200,
        },
      ],
      settings
    );

    expect(series.every((point) => point.alphaIncomeAnnual === 0)).toBe(true);
    expect(series.some((point) => point.date === "2055-06-01")).toBe(true);
  });

  it("preserves exact ISA draw and use-by ages in the chart series", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      showIsa: true,
      isaDrawAge: 59.25,
      isaWithdrawalStrategy: "use_by_age" as const,
      isaWithdrawalTargetAge: 65.75,
    };

    const series = createRetirementIncomeSeries(
      [
        {
          ...baseRow,
          date: "2046-06-01",
          age: 59,
          ageMonths: 0,
        },
        {
          ...baseRow,
          date: "2046-10-01",
          age: 59,
          ageMonths: 4,
          monthlyIsaPension: 1000,
        },
        {
          ...baseRow,
          date: "2052-03-01",
          age: 64,
          ageMonths: 9,
          monthlyIsaPension: 1000,
        },
        {
          ...baseRow,
          date: "2052-07-01",
          age: 65,
          ageMonths: 1,
          monthlyIsaPension: 0,
        },
        {
          ...baseRow,
          date: "2053-07-01",
          age: 66,
          ageMonths: 1,
          monthlyIsaPension: 0,
        },
      ],
      settings
    );

    expect(series.find((point) => point.date === "2046-09-01")?.age).toBe(
      59.25
    );
    expect(series.find((point) => point.date === "2053-03-01")?.age).toBe(
      65.75
    );
  });

  it("preserves exact SIPP draw and use-by ages in the chart series", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      showSipp: true,
      sippDrawAge: 58.25,
      sippWithdrawalStrategy: "use_by_age" as const,
      sippWithdrawalTargetAge: 66.75,
    };

    const series = createRetirementIncomeSeries(
      [
        {
          ...baseRow,
          date: "2045-06-01",
          age: 58,
          ageMonths: 0,
        },
        {
          ...baseRow,
          date: "2045-10-01",
          age: 58,
          ageMonths: 4,
          monthlySippPension: 1200,
        },
        {
          ...baseRow,
          date: "2053-03-01",
          age: 65,
          ageMonths: 9,
          monthlySippPension: 1200,
        },
        {
          ...baseRow,
          date: "2054-07-01",
          age: 67,
          ageMonths: 1,
          monthlySippPension: 0,
        },
      ],
      settings
    );

    expect(series.find((point) => point.date === "2045-09-01")?.age).toBe(
      58.25
    );
    expect(series.find((point) => point.date === "2054-03-01")?.age).toBe(
      66.75
    );
  });

  it("preserves exact additional guaranteed income start and stop ages in the chart series", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      additionalGuaranteedIncomes: [
        {
          id: "previous-employer-db",
          name: "Previous employer DB pension",
          annualAmount: 12000,
          startAge: 60.25,
          endAge: 61.75,
          indexation: "none" as const,
          fixedIncreasePercent: null,
          taxable: true,
        },
      ],
    };

    const series = createRetirementIncomeSeries(
      [
        {
          ...baseRow,
          date: "2047-06-01",
          age: 60,
          ageMonths: 0,
        },
        {
          ...baseRow,
          date: "2047-10-01",
          age: 60,
          ageMonths: 4,
          monthlyAdditionalGuaranteedIncomeGross: 1000,
          monthlyAdditionalGuaranteedIncomeTaxable: 1000,
        },
        {
          ...baseRow,
          date: "2050-02-01",
          age: 62,
          ageMonths: 8,
          monthlyAdditionalGuaranteedIncomeGross: 1000,
          monthlyAdditionalGuaranteedIncomeTaxable: 1000,
        },
        {
          ...baseRow,
          date: "2050-04-01",
          age: 62,
          ageMonths: 10,
        },
      ],
      settings
    );

    expect(series.find((point) => point.date === "2047-09-01")).toEqual(
      expect.objectContaining({
        age: 60.25,
        additionalGuaranteedIncomeAnnual: 12000,
      })
    );
    expect(series.find((point) => point.date === "2050-03-01")).toEqual(
      expect.objectContaining({
        age: 62.75,
        additionalGuaranteedIncomeAnnual: 0,
      })
    );
  });

  it("adds named additional guaranteed income streams to chart points", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      additionalGuaranteedIncomes: [
        {
          id: "previous-employer-db",
          name: "Previous employer DB pension",
          annualAmount: 12000,
          startAge: 60,
          endAge: null,
          indexation: "none" as const,
          fixedIncreasePercent: null,
          taxable: true,
        },
        {
          id: "annuity",
          name: "Purchased annuity",
          annualAmount: 3000,
          startAge: 60,
          endAge: null,
          indexation: "none" as const,
          fixedIncreasePercent: null,
          taxable: true,
        },
      ],
    };

    const series = createRetirementIncomeSeries(
      [
        {
          ...baseRow,
          date: "2047-06-01",
          age: 60,
          ageMonths: 0,
          monthlyAdditionalGuaranteedIncomeGross: 1250,
          monthlyAdditionalGuaranteedIncomeTaxable: 1250,
        },
      ],
      settings
    );

    expect(series[0]).toEqual(
      expect.objectContaining({
        additionalGuaranteedIncomeAnnual: 15000,
        additionalGuaranteedIncomeStreams: [
          {
            id: "previous-employer-db",
            label: "Previous employer DB pension",
            annualAmount: 12000,
          },
          {
            id: "annuity",
            label: "Purchased annuity",
            annualAmount: 3000,
          },
        ],
      })
    );
  });

  it("hides additional guaranteed income chart values when the section is disabled", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      showAdditionalGuaranteedIncome: false,
      additionalGuaranteedIncomes: [
        {
          id: "previous-employer-db",
          name: "Previous employer DB pension",
          annualAmount: 12000,
          startAge: 60,
          endAge: null,
          indexation: "none" as const,
          fixedIncreasePercent: null,
          taxable: true,
        },
      ],
    };

    const series = createRetirementIncomeSeries(
      [
        {
          ...baseRow,
          date: "2047-06-01",
          age: 60,
          ageMonths: 0,
          monthlyAdditionalGuaranteedIncomeGross: 1000,
          monthlyAdditionalGuaranteedIncomeTaxable: 1000,
        },
      ],
      settings
    );

    expect(series[0]).toEqual(
      expect.objectContaining({
        additionalGuaranteedIncomeAnnual: 0,
        additionalGuaranteedIncomeStreams: [],
      })
    );
  });

  it("does not carry an ISA withdrawal into the retirement age range when ISA use-by age equals retirement age", () => {
    const settings = {
      ...createDefaultSettings(),
      startDate: "2026-03-01",
      dateOfBirth: "1977-03-01",
      lifeExpectancy: 62,
      requirementAge: 60,
      desiredRetirementIncome: 24000,
      showAlpha: false,
      showNuvos: false,
      showStatePension: false,
      showSipp: false,
      showIsa: true,
      showLisa: false,
      taxationEnabled: false,
      projectionBasis: "real" as const,
      isaCurrentPot: 0,
      isaMonthlyContribution: 200,
      isaDrawAge: 55,
      isaRealInterestPercent: 3,
      isaWithdrawalStrategy: "use_by_age" as const,
      isaWithdrawalTargetAge: 60,
    };

    const rows = createProjectionTable(settings);
    const summary = generatePensionSummary(rows, settings);

    expect(summary.retirementIncome.ageRanges[0]).toEqual(
      expect.objectContaining({
        startAge: 60,
        sourceLabels: ["No income modelled"],
      })
    );
    expect(summary.retirementIncome.ageRanges[0]?.endAge).toBe(62);
  });
});

describe("retirement-income chart limits", () => {
  it("requires SIPP draw age to stay at or after retirement age", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      requirementAge: 60,
      sippDrawAge: 65,
    };

    const limits = createBridgeChartLimits(settings);

    expect(limits.alphaMonthlyAddedPension.max).toBe(2000);
    expect(limits.lisaMonthlyContribution.max).toBe(
      LISA_MONTHLY_CONTRIBUTION_MAX
    );
    expect(limits.sippAccessAge.min).toBe(60);
  });

  it("uses age 55 as the SIPP chart minimum when age 55 is reached before 6 April 2028", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1973-04-05",
      startDate: "2026-06-01",
      requirementAge: 55,
      sippDrawAge: 55,
    };

    const limits = createBridgeChartLimits(settings);

    expect(limits.sippAccessAge.min).toBe(55);
  });

  it("uses age 57 as the SIPP chart minimum when age 55 is reached on 6 April 2028 without protection", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1973-04-06",
      startDate: "2026-06-01",
      requirementAge: 55,
      sippDrawAge: 55,
    };

    const limits = createBridgeChartLimits(settings);

    expect(limits.sippAccessAge.min).toBe(57);
  });

  it("does not require nuvos draw age to stay at or after retirement age", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      requirementAge: 68,
      nuvosPensionLeaveAge: 60,
      showNuvos: true,
    };

    const limits = createBridgeChartLimits(settings);

    expect(limits.nuvosStartAge.min).toBe(57);
  });

  it("does not constrain nuvos draw age by a future nuvos leave age", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      requirementAge: 55,
      nuvosPensionLeaveAge: 65,
      showNuvos: true,
    };

    const limits = createBridgeChartLimits(settings);

    expect(limits.nuvosStartAge.min).toBe(57);
  });

  it("does not cap ISA or SIPP draw age at State Pension age", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      lifeExpectancy: 85,
      statePensionDrawDate: "2055-06-01",
    };

    const limits = createBridgeChartLimits(settings);

    expect(limits.statePensionAge.max).toBe(85);
    expect(limits.sippAccessAge.max).toBe(85);
    expect(limits.isaAccessAge.max).toBe(85);
  });
});
