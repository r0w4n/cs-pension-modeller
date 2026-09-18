import { describe, expect, it } from "vitest";
import {
  calculateMonthlySippPension,
  calculateSippPotAtDate,
  calculateSippProjectionRows,
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
      })
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
      })
    ).toBeCloseTo(120000 / 121, 6);
    expect(
      calculateMonthlySippPension({
        potAtDraw: 120000,
        drawDate: "2046-01-01",
        endDate: "2056-01-01",
        strategy: "percentage",
        withdrawalPercent: 4,
      })
    ).toBeCloseTo(400, 6);
  });

  it("uses the last scheduled month for a final partial-month row and single-date query", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-05-14",
      dateOfBirth: "1986-06-01",
      showSipp: true,
      sippCurrentPot: 12000,
      sippMonthlyContribution: 0,
      sippDrawAge: 60,
      sippWithdrawalStrategy: "percentage",
      sippWithdrawalPercent: 12,
      sippRealInterestPercent: 12,
    };
    const rows = calculateSippProjectionRows({
      settings,
      rowDates: ["2046-05-14", "2046-06-01", "2046-06-14"],
      drawDate: "2046-06-01",
      endDate: "2046-06-01",
    });

    expect(rows.get("2046-06-01")).toEqual(rows.get("2046-05-14"));
    expect(rows.get("2046-06-14")?.sippPot).toBeLessThan(
      rows.get("2046-06-01")?.sippPot ?? 0
    );
    expect(
      calculateSippPotAtDate({
        settings,
        rowDate: "2046-06-01",
        drawDate: "2046-06-01",
        endDate: "2046-06-01",
      })
    ).toBeCloseTo(rows.get("2046-05-14")?.sippPot ?? 0, 6);
  });
});
