import { createDefaultSettings } from "../settings";
import type { ProjectionRow } from "../projection";
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
  annualNuvosPension: 0,
  annualNuvosPensionIncludingReduction: 0,
  monthlyNuvosPensionGross: 0,
  monthlyStatePension: 0,
  sippPot: 0,
  monthlySippPension: 0,
  isaPot: 0,
  monthlyIsaPension: 0,
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

  it("uses age 57 as the SIPP chart minimum when age 55 is reached on 6 April 2028", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1973-04-06",
      startDate: "2026-06-01",
      requirementAge: 55,
      sippDrawAge: 57,
    };

    const limits = createBridgeChartLimits(settings);

    expect(limits.sippAccessAge.min).toBe(57);
  });

  it("requires nuvos draw age to stay at or after retirement age", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      requirementAge: 68,
      nuvosPensionLeaveAge: 60,
      showNuvos: true,
    };

    const limits = createBridgeChartLimits(settings);

    expect(limits.nuvosStartAge.min).toBe(68);
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
