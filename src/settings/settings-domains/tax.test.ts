import {
  coerceTaxSettings,
  normalizePensionWithdrawalTaxTreatment,
  normalizeTaxRegime,
  normalizeTaxationBooleanSetting,
} from "./tax";
import type { StoredPensionSettings } from "../settings-types";

describe("tax domain", () => {
  it("normalizes taxation flag", () => {
    expect(normalizeTaxationBooleanSetting(0)).toBe(false);
    expect(normalizeTaxationBooleanSetting("enabled")).toBe(true);
  });

  it("normalizes the tax regime without accepting unknown stored values", () => {
    expect(normalizeTaxRegime("scotland")).toBe("scotland");
    expect(normalizeTaxRegime("unexpected")).toBe("rest_of_uk");
  });

  it("uses a conservative fully taxable assumption for unknown withdrawal treatment values", () => {
    expect(normalizePensionWithdrawalTaxTreatment("ufpls")).toBe("ufpls");
    expect(normalizePensionWithdrawalTaxTreatment("unexpected")).toBe(
      "unknown"
    );
  });

  it("coerces stored values", () => {
    const storedSettings = {
      taxationEnabled: true,
      taxRegime: "scotland",
      taxPersonalAllowance: "12570",
      taxPersonalAllowanceTaperThreshold: "100000",
      taxBasicRateLimit: "37700",
      taxAdditionalRateThreshold: "125140",
      taxBasicRatePercent: "20",
      taxHigherRatePercent: "40",
      taxAdditionalRatePercent: "45",
      taxSippWithdrawalTreatment: "ufpls",
      taxSippTaxFreeWithdrawalPercent: "25",
      taxCsAvcWithdrawalTreatment: "fully_taxable",
      taxCsAvcTaxFreeWithdrawalPercent: "0",
      taxTrackLumpSumAllowance: true,
      taxLumpSumAllowance: "268275",
      taxLumpSumAllowanceUsed: "10000",
    } as unknown as Partial<StoredPensionSettings>;

    expect(coerceTaxSettings(storedSettings)).toEqual({
      taxationEnabled: true,
      taxRegime: "scotland",
      taxPersonalAllowance: 12570,
      taxPersonalAllowanceTaperThreshold: 100000,
      taxBasicRateLimit: 37700,
      taxAdditionalRateThreshold: 125140,
      taxBasicRatePercent: 20,
      taxHigherRatePercent: 40,
      taxAdditionalRatePercent: 45,
      taxSippWithdrawalTreatment: "ufpls",
      taxSippTaxFreeWithdrawalPercent: 25,
      taxCsAvcWithdrawalTreatment: "fully_taxable",
      taxCsAvcTaxFreeWithdrawalPercent: 0,
      taxTrackLumpSumAllowance: true,
      taxLumpSumAllowance: 268275,
      taxLumpSumAllowanceUsed: 10000,
    });
  });
});
