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
});
