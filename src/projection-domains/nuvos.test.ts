import { describe, expect, it } from "vitest";
import {
  calculateAnnualNuvosPensionAtDate,
  calculateNuvosEarlyRetirementFactor,
  calculateNuvosPensionRevaluationFactor,
} from "./nuvos";
import { defaultSettings, type PensionSettings } from "../settings";

describe("projection nuvos domain", () => {
  it("does not add earnings-based nuvos accrual after 31 March 2015", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      showNuvos: true,
      startDate: "2025-04-01",
      dateOfBirth: "1960-04-01",
      lifeExpectancy: 90,
      nuvosPensionAbsDate: "2025",
      nuvosAccruedPensionAtLastAbs: 1000,
      nuvosPensionableEarnings: 12000,
      nuvosPensionLeaveAge: 65,
      nuvosPensionDrawAge: 65,
    };

    expect(
      calculateAnnualNuvosPensionAtDate({
        settings,
        rowDate: "2026-04-01",
        nuvosAbsDate: "2025-04-01",
        accrualStopDate: "2026-04-01",
      })
    ).toBe(1000);
  });

  it("only adds historical nuvos accrual up to the 31 March 2015 closure date", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      showNuvos: true,
      startDate: "2015-04-01",
      dateOfBirth: "1960-04-01",
      lifeExpectancy: 90,
      nuvosPensionAbsDate: "2014",
      nuvosAccruedPensionAtLastAbs: 1000,
      nuvosPensionableEarnings: 12000,
      nuvosPensionLeaveAge: 65,
      nuvosPensionDrawAge: 65,
    };

    expect(
      calculateAnnualNuvosPensionAtDate({
        settings,
        rowDate: "2015-04-01",
        nuvosAbsDate: "2014-04-01",
        accrualStopDate: "2026-04-01",
      })
    ).toBeCloseTo(1253, 6);
  });

  it("applies nuvos CPI revaluation independently of Alpha revaluation", () => {
    expect(
      calculateNuvosPensionRevaluationFactor({
        fromDate: "2025-04-01",
        rowDate: "2027-04-01",
        cpiPercent: 2,
      })
    ).toBeCloseTo(1.0404, 6);
  });

  it("does not reduce nuvos pension when it is not taken early", () => {
    expect(calculateNuvosEarlyRetirementFactor(0, 0)).toBe(1);
    expect(calculateNuvosEarlyRetirementFactor(-1, 0)).toBe(1);
  });

  it("uses the nuvos formula rather than the Alpha factor table", () => {
    expect(calculateNuvosEarlyRetirementFactor(5, 0)).toBeCloseTo(0.77, 6);
  });

  it("calculates a nuvos factor for 4 years and 10 months early", () => {
    expect(calculateNuvosEarlyRetirementFactor(4, 10)).toBeCloseTo(0.7767, 4);
  });

  it("calculates a nuvos factor for 6 years and 1 month early", () => {
    expect(calculateNuvosEarlyRetirementFactor(6, 1)).toBeCloseTo(0.7275, 6);
  });

  it("handles nuvos formula month boundaries", () => {
    expect(calculateNuvosEarlyRetirementFactor(2, 11)).toBeCloseTo(
      1 - (35 * 0.05) / 12,
      6
    );
    expect(calculateNuvosEarlyRetirementFactor(3, 0)).toBeCloseTo(0.85, 6);
    expect(calculateNuvosEarlyRetirementFactor(3, 1)).toBeCloseTo(
      0.85 - 0.04 / 12,
      6
    );
    expect(calculateNuvosEarlyRetirementFactor(6, 0)).toBeCloseTo(0.73, 6);
    expect(calculateNuvosEarlyRetirementFactor(6, 1)).toBeCloseTo(0.7275, 6);
  });
});
