import {
  calculateAdditionalGuaranteedIncomeForDate,
  calculateAdditionalGuaranteedIncomeStreamForDate,
} from "./additional-guaranteed-income";
import { createDefaultSettings, type PensionSettings } from "../settings";

function createBaseSettings(
  patch: Partial<PensionSettings> = {}
): PensionSettings {
  return {
    ...createDefaultSettings(),
    startDate: "2029-01-01",
    dateOfBirth: "1970-01-01",
    lifeExpectancy: 70,
    projectionBasis: "real",
    inflationRateAnnual: 2.5,
    showAdditionalGuaranteedIncome: true,
    additionalGuaranteedIncomes: [],
    ...patch,
  };
}

describe("additional guaranteed income calculations", () => {
  function createIncome(
    patch: Partial<
      Parameters<
        typeof calculateAdditionalGuaranteedIncomeStreamForDate
      >[0]["income"]
    > = {}
  ) {
    return {
      id: "income",
      name: "Additional income",
      annualAmount: 30_000,
      startAge: 59,
      endAge: null,
      indexation: "none" as const,
      fixedIncreasePercent: null,
      taxable: true,
      ...patch,
    };
  }

  it("treats no increase and fixed 0% equivalently in real terms", () => {
    const settings = createBaseSettings({
      startDate: "2026-04-01",
      dateOfBirth: "1967-04-01",
      inflationRateAnnual: 2.5,
      projectionBasis: "real",
    });
    const fixedZeroIncome = createIncome({
      id: "fixed-zero",
      indexation: "fixed",
      fixedIncreasePercent: 0,
    });

    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income: createIncome(),
        rowDate: "2046-04-01",
      })
    ).toBeCloseTo(30_000 / 1.025 ** 20, 6);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income: createIncome(),
        rowDate: "2046-04-01",
      })
    ).toBeCloseTo(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income: fixedZeroIncome,
        rowDate: "2046-04-01",
      }),
      6
    );
  });

  it("keeps no increase and fixed 0% flat in nominal terms", () => {
    const settings = createBaseSettings({
      startDate: "2026-04-01",
      dateOfBirth: "1967-04-01",
      projectionBasis: "nominal",
      inflationRateAnnual: 2.5,
    });

    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income: createIncome(),
        rowDate: "2046-04-01",
      })
    ).toBe(30_000);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income: createIncome({
          indexation: "fixed",
          fixedIncreasePercent: 0,
        }),
        rowDate: "2046-04-01",
      })
    ).toBe(30_000);
  });

  it("applies no-increase deflation only after a future income start date", () => {
    const settings = createBaseSettings({
      startDate: "2026-04-01",
      dateOfBirth: "1976-04-01",
      projectionBasis: "real",
      inflationRateAnnual: 2.5,
    });
    const income = createIncome({
      startAge: 60,
    });

    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2036-03-01",
      })
    ).toBe(0);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2036-04-01",
      })
    ).toBe(30_000);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2056-04-01",
      })
    ).toBeCloseTo(30_000 / 1.025 ** 20, 6);
  });

  it("stops no-increase income after the configured end age", () => {
    const settings = createBaseSettings({
      startDate: "2026-04-01",
      dateOfBirth: "1966-04-01",
      projectionBasis: "real",
      inflationRateAnnual: 2.5,
    });
    const income = createIncome({
      startAge: 60,
      endAge: 60,
    });

    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2027-03-01",
      })
    ).toBeCloseTo(30_000, 6);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2027-04-01",
      })
    ).toBe(0);
  });

  it("keeps CPI-linked income flat in real terms from the start age", () => {
    const settings = createBaseSettings();
    const income = {
      id: "db",
      name: "Previous employer DB pension",
      annualAmount: 4500,
      startAge: 60,
      endAge: null,
      indexation: "cpi" as const,
      fixedIncreasePercent: null,
      taxable: true,
    };

    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2029-12-01",
      })
    ).toBe(0);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2030-01-01",
      })
    ).toBe(4500);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2040-01-01",
      })
    ).toBe(4500);
  });

  it("includes temporary income through the configured end age", () => {
    const settings = createBaseSettings({
      dateOfBirth: "1975-01-01",
      startDate: "2029-01-01",
      projectionBasis: "nominal",
    });
    const income = {
      id: "temporary",
      name: "Temporary income",
      annualAmount: 3000,
      startAge: 55,
      endAge: 60,
      indexation: "none" as const,
      fixedIncreasePercent: null,
      taxable: true,
    };

    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2029-12-01",
      })
    ).toBe(0);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2030-01-01",
      })
    ).toBe(3000);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2035-12-01",
      })
    ).toBe(3000);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2036-01-01",
      })
    ).toBe(0);
  });

  it("sums gross and taxable income separately", () => {
    const settings = createBaseSettings({
      additionalGuaranteedIncomes: [
        {
          id: "taxable",
          name: "Taxable income",
          annualAmount: 5000,
          startAge: 60,
          endAge: null,
          indexation: "none",
          fixedIncreasePercent: null,
          taxable: true,
        },
        {
          id: "non-taxable",
          name: "Non-taxable income",
          annualAmount: 2000,
          startAge: 60,
          endAge: null,
          indexation: "none",
          fixedIncreasePercent: null,
          taxable: false,
        },
      ],
    });

    expect(
      calculateAdditionalGuaranteedIncomeForDate({
        settings,
        rowDate: "2030-01-01",
      })
    ).toEqual({ annualGross: 7000, annualTaxable: 5000 });
  });

  it("applies fixed increases after the income starts", () => {
    const settings = createBaseSettings();
    const income = {
      id: "annuity",
      name: "Annuity",
      annualAmount: 6000,
      startAge: 60,
      endAge: null,
      indexation: "fixed" as const,
      fixedIncreasePercent: 3,
      taxable: true,
    };

    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2030-01-01",
      })
    ).toBe(6000);
    expect(
      calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate: "2031-01-01",
      })
    ).toBeCloseTo(6000 * (1.03 / 1.025), 6);
  });
});
