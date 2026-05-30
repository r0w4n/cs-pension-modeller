import { describe, expect, it } from "vitest";
import {
  calculateMonthlySippPension,
  calculateSippPotAtDate,
} from "./sipp";
import { defaultSettings, type PensionSettings } from "../settings";

describe("projection sipp domain", () => {
  it("projects SIPP pot with tax relief and growth", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-01-01",
      dateOfBirth: "1986-01-01",
      alphaPensionDrawAge: 40,
      lifeExpectancy: 75,
      sippCurrentPot: 10000,
      sippMonthlyContribution: 100,
      sippLumpSums: [
        {
          id: "sipp-lump",
          amount: 1000,
          startDate: "2026-01-01",
          cadence: "once",
          endDate: "2026-01-01",
        },
      ],
      sippTaxReliefRate: "20",
    };

    expect(
      calculateSippPotAtDate({
        settings,
        rowDate: "2026-03-01",
        drawDate: "2026-04-01",
      }),
    ).toBeCloseTo(11671.028074, 6);
  });

  it("can calculate SIPP income by zero-at-death or annual percentage strategy", () => {
    expect(
      calculateMonthlySippPension({
        potAtDraw: 120000,
        drawDate: "2046-01-01",
        endDate: "2056-01-01",
        strategy: "zero_at_death",
        withdrawalPercent: 4,
      }),
    ).toBeCloseTo(1000, 6);
    expect(
      calculateMonthlySippPension({
        potAtDraw: 120000,
        drawDate: "2046-01-01",
        endDate: "2056-01-01",
        strategy: "percentage",
        withdrawalPercent: 4,
      }),
    ).toBeCloseTo(400, 6);
  });
});
