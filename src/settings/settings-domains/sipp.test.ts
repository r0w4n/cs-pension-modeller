import { createDefaultSettings } from "../settings-defaults";
import {
  coerceSippTaxReliefRate,
  normalizeSippTaxReliefRate,
  normalizeSippWithdrawalStrategy,
  validateSippRules,
} from "./sipp";

describe("sipp settings module", () => {
  it("normalizes sipp enums", () => {
    expect(normalizeSippTaxReliefRate("40")).toBe("40");
    expect(normalizeSippTaxReliefRate("bad")).toBe("20");
    expect(normalizeSippWithdrawalStrategy("percentage")).toBe("percentage");
    expect(normalizeSippWithdrawalStrategy("bad")).toBe("use_by_age");
  });

  it("coerces legacy tax relief setting", () => {
    expect(coerceSippTaxReliefRate(undefined, true)).toBe("20");
    expect(coerceSippTaxReliefRate(undefined, false)).toBe("none");
  });

  it("validates sipp draw rules", () => {
    const settings = {
      ...createDefaultSettings(),
      showSipp: true,
      sippWithdrawalStrategy: "use_by_age" as const,
    };

    const issues = validateSippRules({
      settings,
      lifeExpectancyDate: "2020-01-01",
      sippDrawDate: "2030-01-01",
      sippWithdrawalTargetDate: "2029-01-01",
    });

    expect(issues.length).toBeGreaterThan(0);
  });

  it("validates standard SIPP access against the planned draw date", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1972-08-01",
      showSipp: true,
      sippDrawAge: 56,
    };

    expect(
      validateSippRules({
        settings,
        lifeExpectancyDate: "2060-01-01",
        sippDrawDate: "2028-08-01",
        sippWithdrawalTargetDate: "2035-01-01",
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "sippDrawAge",
          message:
            "SIPP draw start age must be at least 57 for access dates on or after 6 April 2028, unless your provider has confirmed a protected pension age.",
        }),
      ])
    );
  });

  it("validates provider-confirmed protected SIPP access from age 50", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1980-08-01",
      showSipp: true,
      sippHasProtectedPensionAge: true,
      sippProtectedPensionAge: 50,
      sippDrawAge: 49,
    };

    expect(
      validateSippRules({
        settings,
        lifeExpectancyDate: "2060-01-01",
        sippDrawDate: "2029-08-01",
        sippWithdrawalTargetDate: "2035-01-01",
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "sippDrawAge",
          message:
            "SIPP draw start age must not be earlier than the provider-confirmed protected SIPP access age of 50.",
        }),
      ])
    );
  });
});
