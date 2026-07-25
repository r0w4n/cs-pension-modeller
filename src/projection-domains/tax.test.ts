import { describe, expect, it } from "vitest";
import { calculateAnnualIncomeTax, calculateMonthlyIncomeTax } from "./tax";
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
