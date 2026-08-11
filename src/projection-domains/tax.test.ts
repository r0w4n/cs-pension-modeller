import { describe, expect, it } from "vitest";
import {
  calculateAnnualIncomeTax,
  calculateMonthlyIncomeTax,
  calculateMonthlyTaxableRetirementIncome,
  calculatePensionWithdrawalTaxBreakdown,
  createPensionLumpSumAllowanceState,
} from "./tax";
import { defaultSettings, type PensionSettings } from "../settings";

describe("projection tax domain", () => {
  it("keeps income tax at zero when taxation is disabled", () => {
    expect(
      calculateMonthlyIncomeTax({
        settings: {
          ...defaultSettings,
          taxationEnabled: false,
        },
        monthlyAlphaPension: 3000,
        monthlyStatePension: 1000,
        monthlySippPension: 500,
      })
    ).toBe(0);
  });

  it("calculates annual Income Tax using the standard assumptions", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      taxationEnabled: true,
    };

    expect(calculateAnnualIncomeTax(settings, 50000)).toBeCloseTo(7486, 6);
    expect(calculateAnnualIncomeTax(settings, 125140)).toBeCloseTo(42516, 6);
    expect(calculateAnnualIncomeTax(settings, 130000)).toBeCloseTo(44703, 6);
  });

  it.each([
    [12_570, 0],
    [12_571, 0.2],
    [50_270, 7_540],
    [50_271, 7_540.4],
    [100_000, 27_432],
    [100_002, 27_433.2],
    [125_140, 42_516],
    [125_141, 42_516.45],
  ])(
    "calculates 2026/27 rest-of-UK Income Tax for £%i of pension income",
    (annualTaxableIncome, expectedTax) => {
      expect(
        calculateAnnualIncomeTax(
          {
            ...defaultSettings,
            taxationEnabled: true,
            taxRegime: "rest_of_uk",
          },
          annualTaxableIncome
        )
      ).toBeCloseTo(expectedTax, 6);
    }
  );

  it.each([
    [12_570, 0],
    [16_537, 753.73],
    [29_526, 3_351.53],
    [43_662, 6_320.09],
    [75_000, 19_482.05],
    [100_000, 30_732.05],
    [110_000, 37_482.05],
    [125_140, 47_701.55],
    [130_000, 50_034.35],
  ])(
    "calculates 2026/27 Scottish Income Tax for £%i of pension income",
    (annualTaxableIncome, expectedTax) => {
      expect(
        calculateAnnualIncomeTax(
          {
            ...defaultSettings,
            taxationEnabled: true,
            taxRegime: "scotland",
          },
          annualTaxableIncome
        )
      ).toBeCloseTo(expectedTax, 6);
    }
  );

  it("uses the configured Personal Allowance with the Scottish bands", () => {
    expect(
      calculateAnnualIncomeTax(
        {
          ...defaultSettings,
          taxationEnabled: true,
          taxRegime: "scotland",
          taxPersonalAllowance: 0,
        },
        3_967
      )
    ).toBeCloseTo(753.73, 6);
  });

  it("treats the configurable additional-rate threshold as taxable income", () => {
    expect(
      calculateAnnualIncomeTax(
        {
          ...defaultSettings,
          taxationEnabled: true,
          taxRegime: "rest_of_uk",
          taxPersonalAllowance: 20_000,
          taxPersonalAllowanceTaperThreshold: 200_000,
          taxBasicRateLimit: 37_700,
          taxAdditionalRateThreshold: 125_140,
        },
        145_140
      )
    ).toBeCloseTo(42_516, 6);
  });

  it("combines every taxable retirement source before applying tax", () => {
    const input = {
      settings: {
        ...defaultSettings,
        taxationEnabled: true,
      },
      monthlyAlphaPension: 100,
      monthlyClassicPension: 200,
      monthlyClassicPlusPension: 300,
      monthlyNuvosPension: 400,
      monthlyPremiumPension: 500,
      monthlyStatePension: 600,
      monthlySippPension: 800,
      monthlyCsAvcPension: 1_200,
      monthlyAdditionalGuaranteedIncomeTaxable: 700,
      monthlyAdditionalGuaranteedIncomeNonTaxable: 1_000,
      monthlyIsaPension: 2_000,
      monthlyLisaPension: 3_000,
    };

    expect(calculateMonthlyTaxableRetirementIncome(input)).toBeCloseTo(
      100 + 200 + 300 + 400 + 500 + 600 + 700 + 800 * 0.75 + 1_200 * 0.75,
      6
    );
  });

  it("includes reduced-hours employment income with taxable retirement income", () => {
    expect(
      calculateMonthlyTaxableRetirementIncome({
        settings: defaultSettings,
        monthlyAlphaPension: 500,
        monthlyStatePension: 0,
        monthlySippPension: 0,
        monthlyEmploymentIncome: 2_000,
      })
    ).toBe(2_500);
  });

  it.each([
    ["fully_taxable", 0, 1_000],
    ["unknown", 0, 1_000],
    ["ufpls", 250, 750],
    ["custom", 100, 900],
  ] as const)(
    "applies the %s SIPP withdrawal treatment",
    (treatment, expectedTaxFree, expectedTaxable) => {
      const result = calculatePensionWithdrawalTaxBreakdown({
        settings: {
          ...defaultSettings,
          taxSippWithdrawalTreatment: treatment,
          taxSippTaxFreeWithdrawalPercent: 10,
        },
        sippWithdrawal: 1_000,
        csAvcWithdrawal: 0,
      });

      expect(result.sippTaxFree).toBe(expectedTaxFree);
      expect(result.sippTaxable).toBe(expectedTaxable);
    }
  );

  it("shares the remaining lump-sum allowance across SIPP and CS AVC withdrawals in funding order", () => {
    const settings = {
      ...defaultSettings,
      taxTrackLumpSumAllowance: true,
      taxLumpSumAllowance: 300,
      taxLumpSumAllowanceUsed: 0,
      taxSippWithdrawalTreatment: "ufpls" as const,
      taxCsAvcWithdrawalTreatment: "ufpls" as const,
    };
    const result = calculatePensionWithdrawalTaxBreakdown({
      settings,
      sippWithdrawal: 1_000,
      csAvcWithdrawal: 1_000,
      allowanceState: createPensionLumpSumAllowanceState(settings),
      accountOrder: ["sipp", "csAvc", "lisa", "isa"],
    });

    expect(result).toEqual({
      sippTaxFree: 250,
      sippTaxable: 750,
      csAvcTaxFree: 50,
      csAvcTaxable: 950,
      allowanceRemaining: 0,
    });
  });

  it("preserves the legacy untracked tax-free-share behaviour", () => {
    const settings = {
      ...defaultSettings,
      taxTrackLumpSumAllowance: false,
      taxSippWithdrawalTreatment: "custom" as const,
      taxSippTaxFreeWithdrawalPercent: 25,
    };

    expect(
      calculatePensionWithdrawalTaxBreakdown({
        settings,
        sippWithdrawal: 2_000_000,
        csAvcWithdrawal: 0,
      }).sippTaxFree
    ).toBe(500_000);
  });

  it("excludes ISA, qualifying LISA and non-taxable additional income", () => {
    expect(
      calculateMonthlyTaxableRetirementIncome({
        settings: {
          ...defaultSettings,
          taxationEnabled: true,
        },
        monthlyAlphaPension: 0,
        monthlyStatePension: 0,
        monthlySippPension: 0,
        monthlyAdditionalGuaranteedIncomeNonTaxable: 1_000,
        monthlyIsaPension: 2_000,
        monthlyLisaPension: 3_000,
      })
    ).toBe(0);
  });

  it("taxes pension income while keeping the SIPP tax-free share outside taxable income", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      taxationEnabled: true,
      taxSippTaxFreeWithdrawalPercent: 25,
    };

    expect(
      calculateMonthlyIncomeTax({
        settings,
        monthlyAlphaPension: 2000,
        monthlyStatePension: 1000,
        monthlySippPension: 1000,
      })
    ).toBeCloseTo(6486 / 12, 6);
  });

  it("taxes CS AVC withdrawals using the CS AVC tax-free share", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      taxationEnabled: true,
      taxCsAvcTaxFreeWithdrawalPercent: 25,
    };

    expect(
      calculateMonthlyIncomeTax({
        settings,
        monthlyAlphaPension: 2000,
        monthlyStatePension: 1000,
        monthlySippPension: 0,
        monthlyCsAvcPension: 1000,
      })
    ).toBeCloseTo(6486 / 12, 6);
  });

  it("includes nuvos pension in taxable retirement income", () => {
    expect(
      calculateMonthlyIncomeTax({
        settings: {
          ...defaultSettings,
          taxationEnabled: true,
          taxPersonalAllowance: 0,
          taxBasicRateLimit: 50000,
          taxBasicRatePercent: 20,
          taxHigherRatePercent: 40,
          taxAdditionalRatePercent: 45,
        },
        monthlyAlphaPension: 100,
        monthlyNuvosPension: 50,
        monthlyStatePension: 0,
        monthlySippPension: 0,
      })
    ).toBeCloseTo(30, 6);
  });
});
