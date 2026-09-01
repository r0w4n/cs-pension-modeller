import { describe, expect, it } from "vitest";
import {
  calculateLisaPotAtDate,
  calculateTotalLisaContributionsWithBonus,
} from "./lisa";
import { defaultSettings, type PensionSettings } from "../settings";

describe("projection lisa domain", () => {
  it("caps eligible LISA additions at the annual allowance and applies the government bonus", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-04-06",
      dateOfBirth: "1986-04-06",
      projectionBasis: "nominal",
      showLisa: true,
      lisaCurrentPot: 0,
      lisaMonthlyContribution: 1000,
      lisaRealInterestPercent: 0,
    };

    expect(
      calculateLisaPotAtDate({
        settings,
        rowDate: "2026-08-06",
        drawDate: "2046-04-06",
      })
    ).toBe(5000);
  });

  it("stops new LISA additions at age 50", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2029-04-06",
      dateOfBirth: "1980-04-06",
      projectionBasis: "nominal",
      showLisa: true,
      lisaCurrentPot: 0,
      lisaMonthlyContribution: 1000,
      lisaRealInterestPercent: 0,
    };

    expect(
      calculateTotalLisaContributionsWithBonus(settings, "2040-04-06")
    ).toBe(5000);
    expect(
      calculateLisaPotAtDate({
        settings,
        rowDate: "2030-06-06",
        drawDate: "2040-04-06",
      })
    ).toBe(5000);
  });

  it("shares the tax-year allowance between regular and lump-sum additions", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-04-06",
      dateOfBirth: "1986-04-06",
      projectionBasis: "nominal",
      showLisa: true,
      lisaCurrentPot: 0,
      lisaMonthlyContribution: 300,
      lisaLumpSums: [
        {
          id: "lisa-october-lump-sum",
          amount: 1000,
          startDate: "2026-10-06",
          endDate: "2026-10-06",
          cadence: "once",
        },
      ],
      lisaRealInterestPercent: 0,
    };

    expect(
      calculateLisaPotAtDate({
        settings,
        rowDate: "2027-03-06",
        drawDate: "2046-04-06",
      })
    ).toBe(5000);
  });

  it("resets the shared LISA allowance on 6 April", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-04-06",
      dateOfBirth: "1986-04-06",
      projectionBasis: "nominal",
      showLisa: true,
      lisaCurrentPot: 0,
      lisaMonthlyContribution: 0,
      lisaLumpSums: [
        {
          id: "lisa-2026-contribution",
          amount: 4000,
          startDate: "2026-04-06",
          endDate: "2026-04-06",
          cadence: "once",
        },
        {
          id: "lisa-2027-contribution",
          amount: 4000,
          startDate: "2027-04-06",
          endDate: "2027-04-06",
          cadence: "once",
        },
      ],
      lisaRealInterestPercent: 0,
    };

    expect(
      calculateLisaPotAtDate({
        settings,
        rowDate: "2027-04-06",
        drawDate: "2046-04-06",
      })
    ).toBe(10_000);
  });
});
