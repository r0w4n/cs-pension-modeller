import { describe, expect, it } from "vitest";
import { defaultSettings } from "../settings";
import {
  calculateTaxYearIncomeTaxAllocation,
  calculateTaxYearEffectiveRatesForEntries,
  getProjectionTaxYearKey,
  getRemainingMonthsInTaxYear,
} from "./tax-year";

describe("projection tax-year domain", () => {
  it("assigns monthly rows to an April-to-March modeling year", () => {
    expect(getProjectionTaxYearKey("2027-03-31")).toBe("2026-2027");
    expect(getProjectionTaxYearKey("2027-04-01")).toBe("2027-2028");
  });

  it("applies one Personal Allowance to the modeled income in a tax year", () => {
    const settings = {
      ...defaultSettings,
      projectionBasis: "nominal" as const,
      taxationEnabled: true,
    };
    const entries = Array.from({ length: 12 }, (_, index) => ({
      date:
        index < 9
          ? `2026-${String(index + 4).padStart(2, "0")}-15`
          : `2027-${String(index - 8).padStart(2, "0")}-15`,
      taxableIncome: 2_500,
    }));
    const allocation = calculateTaxYearIncomeTaxAllocation(entries, settings);

    expect([...allocation.values()].reduce((sum, tax) => sum + tax, 0)).toBe(
      3_486
    );
  });

  it("does not annualise a three-month modeled income period", () => {
    const allocation = calculateTaxYearIncomeTaxAllocation(
      [
        { date: "2027-01-15", taxableIncome: 4_000 },
        { date: "2027-02-15", taxableIncome: 4_000 },
        { date: "2027-03-15", taxableIncome: 4_000 },
      ],
      {
        ...defaultSettings,
        projectionBasis: "nominal" as const,
        taxationEnabled: true,
      }
    );

    expect([...allocation.values()].reduce((sum, tax) => sum + tax, 0)).toBe(0);
  });

  it("allocates a tax-year liability in proportion to each row's taxable income", () => {
    const allocation = calculateTaxYearIncomeTaxAllocation(
      [
        { date: "2027-02-15", taxableIncome: 10_000 },
        { date: "2027-03-15", taxableIncome: 20_000 },
      ],
      {
        ...defaultSettings,
        projectionBasis: "nominal" as const,
        taxationEnabled: true,
        taxPersonalAllowance: 0,
      }
    );

    expect(allocation.get("2027-02-15")).toBe(2_000);
    expect(allocation.get("2027-03-15")).toBe(4_000);
  });

  it("uses unshown employment income as tax-rate context without allocating its tax to retirement income", () => {
    const entries = [
      { date: "2026-04-15", taxableIncome: 0, taxableIncomeContext: 3_500 },
      { date: "2026-05-15", taxableIncome: 0, taxableIncomeContext: 3_500 },
      ...Array.from({ length: 10 }, (_, index) => ({
        date:
          index < 7
            ? `2026-${String(index + 6).padStart(2, "0")}-15`
            : `2027-${String(index - 6).padStart(2, "0")}-15`,
        taxableIncome: 3_500,
      })),
    ];
    const allocation = calculateTaxYearIncomeTaxAllocation(entries, {
      ...defaultSettings,
      projectionBasis: "nominal" as const,
      taxationEnabled: true,
    });

    expect(allocation.get("2026-04-15")).toBe(0);
    expect(allocation.get("2026-06-15")).toBeCloseTo(490.5, 6);
    expect(
      [...allocation.values()].reduce((sum, tax) => sum + tax, 0)
    ).toBeCloseTo(4_905, 6);
  });

  it("continues the final taxable income to 5 April as tax-rate context", () => {
    const allocation = calculateTaxYearIncomeTaxAllocation(
      [
        { date: "2026-04-15", taxableIncome: 4_000 },
        { date: "2026-05-15", taxableIncome: 4_000 },
        { date: "2026-06-15", taxableIncome: 4_000 },
      ],
      {
        ...defaultSettings,
        projectionBasis: "nominal" as const,
        taxationEnabled: true,
      }
    );

    expect(getRemainingMonthsInTaxYear("2026-06-15")).toBe(9);
    expect(getRemainingMonthsInTaxYear("2027-03-15")).toBe(0);
    expect(allocation.get("2026-06-15")).toBeCloseTo(590.5, 6);
    expect(
      [...allocation.values()].reduce((sum, tax) => sum + tax, 0)
    ).toBeCloseTo(1_771.5, 6);
  });

  it("applies fixed nominal tax thresholds consistently in real and nominal projection bases", () => {
    const realSettings = {
      ...defaultSettings,
      startDate: "2026-04-01",
      projectionBasis: "real" as const,
      inflationRateAnnual: 2.5,
      taxationEnabled: true,
    };
    const nominalSettings = {
      ...realSettings,
      projectionBasis: "nominal" as const,
    };
    const realEntries = createTaxYearEntries("2046", 2_500);
    const nominalEntries = realEntries.map((entry) => ({
      ...entry,
      taxableIncome:
        entry.taxableIncome * getInflationFactor(realSettings, entry.date),
    }));
    const realAllocation = calculateTaxYearIncomeTaxAllocation(
      realEntries,
      realSettings
    );
    const nominalAllocation = calculateTaxYearIncomeTaxAllocation(
      nominalEntries,
      nominalSettings
    );

    for (const entry of realEntries) {
      expect(realAllocation.get(entry.date)).toBeCloseTo(
        (nominalAllocation.get(entry.date) ?? 0) /
          getInflationFactor(realSettings, entry.date),
        6
      );
    }
  });

  it("uses nominal-equivalent employment context and terminal continuation for real projections", () => {
    const settings = {
      ...defaultSettings,
      startDate: "2026-04-01",
      projectionBasis: "real" as const,
      inflationRateAnnual: 2.5,
      taxationEnabled: true,
    };
    const entries = [
      {
        date: "2046-04-15",
        taxableIncome: 1_000,
        taxableIncomeContext: 3_000,
      },
      { date: "2046-05-15", taxableIncome: 1_000 },
    ];
    const nominalEntries = entries.map((entry) => ({
      ...entry,
      taxableIncome:
        entry.taxableIncome * getInflationFactor(settings, entry.date),
      taxableIncomeContext:
        (entry.taxableIncomeContext ?? 0) *
        getInflationFactor(settings, entry.date),
    }));
    const realRates = calculateTaxYearEffectiveRatesForEntries(
      entries,
      settings
    );
    const nominalRates = calculateTaxYearEffectiveRatesForEntries(
      nominalEntries,
      { ...settings, projectionBasis: "nominal" as const }
    );

    expect(realRates.get("2046-2047")).toBeCloseTo(
      nominalRates.get("2046-2047") ?? 0,
      12
    );
  });
});

function createTaxYearEntries(year: string, monthlyTaxableIncome: number) {
  return [
    ...Array.from({ length: 9 }, (_, index) => ({
      date: `${year}-${String(index + 4).padStart(2, "0")}-15`,
      taxableIncome: monthlyTaxableIncome,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      date: `${Number(year) + 1}-${String(index + 1).padStart(2, "0")}-15`,
      taxableIncome: monthlyTaxableIncome,
    })),
  ];
}

function getInflationFactor(settings: typeof defaultSettings, rowDate: string) {
  const start = new Date(`${settings.startDate}T00:00:00Z`);
  const row = new Date(`${rowDate}T00:00:00Z`);
  const months =
    (row.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (row.getUTCMonth() - start.getUTCMonth());

  return (1 + settings.inflationRateAnnual / 100) ** (months / 12);
}
