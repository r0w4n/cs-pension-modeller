import { describe, expect, it } from "vitest";
import {
  calculateCsAvcPotAtDate,
  calculateMonthlyCsAvcPension,
  calculateTotalCsAvcContributions,
} from "./cs-avc";
import { defaultSettings, type PensionSettings } from "../settings";

describe("projection CS AVC domain", () => {
  it("projects CS AVC pot contributions without employer additions or SIPP-style gross-up", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-01-01",
      dateOfBirth: "1986-01-01",
      showCsAvc: true,
      lifeExpectancy: 75,
      requirementAge: 60,
      inflationRateAnnual: 0,
      csAvcCurrentPot: 10000,
      csAvcMonthlyContribution: 100,
      csAvcLumpSums: [
        {
          id: "cs-avc-lump",
          amount: 1000,
          startDate: "2026-01-01",
          cadence: "once",
          endDate: "2026-01-01",
        },
      ],
      csAvcRealInterestPercent: 0,
    };

    expect(
      calculateCsAvcPotAtDate({
        settings,
        rowDate: "2026-03-01",
        drawDate: "2026-04-01",
      })
    ).toBeCloseTo(11300, 6);
  });

  it("totals CS AVC contributions paid before draw or retirement", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-01-01",
      dateOfBirth: "1986-01-01",
      showCsAvc: true,
      requirementAge: 60,
      csAvcMonthlyContribution: 250,
      csAvcLumpSums: [],
    };

    expect(
      calculateTotalCsAvcContributions(settings, "2027-01-01")
    ).toBeCloseTo(3000, 6);
  });

  it("includes a CS AVC lump sum paid on the draw date before withdrawal", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2025-01-01",
      dateOfBirth: "1965-01-01",
      showCsAvc: true,
      requirementAge: 65,
      csAvcCurrentPot: 0,
      csAvcMonthlyContribution: 0,
      csAvcLumpSums: [
        {
          id: "draw-date-lump-sum",
          amount: 10000,
          startDate: "2026-01-01",
          cadence: "once",
          endDate: "2026-01-01",
        },
      ],
      csAvcRealInterestPercent: 0,
      csAvcWithdrawalStrategy: "percentage",
      csAvcWithdrawalPercent: 0,
    };

    expect(
      calculateCsAvcPotAtDate({
        settings,
        rowDate: "2026-01-01",
        drawDate: "2026-01-01",
      })
    ).toBe(10000);
    expect(calculateTotalCsAvcContributions(settings, "2026-01-01")).toBe(
      10000
    );
  });

  it("can calculate CS AVC income by zero-at-death or annual percentage strategy", () => {
    expect(
      calculateMonthlyCsAvcPension({
        potAtDraw: 120000,
        drawDate: "2046-01-01",
        endDate: "2056-01-01",
        strategy: "zero_at_death",
        withdrawalPercent: 4,
      })
    ).toBeCloseTo(120000 / 121, 6);
    expect(
      calculateMonthlyCsAvcPension({
        potAtDraw: 120000,
        drawDate: "2046-01-01",
        endDate: "2056-01-01",
        strategy: "percentage",
        withdrawalPercent: 4,
      })
    ).toBeCloseTo(400, 6);
  });
});
