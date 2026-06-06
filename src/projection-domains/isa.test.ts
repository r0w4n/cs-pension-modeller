import { describe, expect, it } from "vitest";
import { calculateIsaPotAtDate, calculateMonthlyIsaPension } from "./isa";
import { defaultSettings, type PensionSettings } from "../settings";

describe("projection isa domain", () => {
  it("projects ISA contributions and lump sums", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-01-01",
      dateOfBirth: "1986-01-01",
      isaCurrentPot: 0,
      isaMonthlyContribution: 100,
      isaLumpSums: [
        {
          id: "isa-lump",
          amount: 1000,
          startDate: "2026-02-01",
          cadence: "once",
          endDate: "2026-02-01",
        },
      ],
      partialRetirementEnabled: true,
      partialRetirementStartAge: 40,
      partialRetirementWorkPercent: 50,
    };

    expect(
      calculateIsaPotAtDate({
        settings,
        rowDate: "2026-03-01",
        drawDate: "2027-01-01",
      })
    ).toBeCloseTo(1152.311871, 6);
  });

  it("calculates monthly ISA pension for percentage and zero-at-death strategies", () => {
    expect(
      calculateMonthlyIsaPension({
        potAtDraw: 60000,
        drawDate: "2046-01-01",
        endDate: "2056-01-01",
        strategy: "zero_at_death",
        withdrawalPercent: 4,
      })
    ).toBeCloseTo(60000 / 121, 6);
    expect(
      calculateMonthlyIsaPension({
        potAtDraw: 60000,
        drawDate: "2046-01-01",
        endDate: "2056-01-01",
        strategy: "percentage",
        withdrawalPercent: 4,
      })
    ).toBeCloseTo(200, 6);
  });
});
