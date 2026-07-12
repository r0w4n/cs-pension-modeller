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
    additionalGuaranteedIncomes: [],
    ...patch,
  };
}

describe("additional guaranteed income calculations", () => {
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
