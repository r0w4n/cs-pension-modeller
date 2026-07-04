import { describe, expect, it } from "vitest";
import { defaultSettings, type PensionSettings } from "../settings";
import { createProjectionTable } from "../projection-core";
import {
  calculateClassicAnnualPensionAtDate,
  calculateClassicAutomaticLumpSumAtDate,
  calculateClassicBenefits,
  calculateClassicEarlyRetirementFactor,
  calculateClassicPensionRevaluationFactor,
  calculateClassicPlusBenefits,
} from "./classic";

describe("projection classic domain", () => {
  it("calculates classic pension and automatic lump sum from final salary and service", () => {
    expect(
      calculateClassicBenefits({
        finalPensionableEarnings: 60000,
        reckonableServiceYears: 10,
      })
    ).toMatchObject({
      annualPension: 7500,
      automaticLumpSum: 22500,
    });

    expect(
      calculateClassicBenefits({
        finalPensionableEarnings: 54000,
        reckonableServiceYears: 14.3333,
      }).annualPension
    ).toBeCloseTo(9674.98, 2);
  });

  it("calculates classic plus pre-2002 and post-2002 benefits separately", () => {
    expect(
      calculateClassicPlusBenefits({
        finalPensionableEarnings: 60000,
        pre2002ServiceYears: 10,
        post2002ServiceYears: 10,
      })
    ).toMatchObject({
      pre2002AnnualPension: 7500,
      post2002AnnualPension: 10000,
      annualPension: 17500,
      automaticLumpSum: 22500,
    });
  });

  it("applies a permanent age-60 early retirement factor", () => {
    expect(calculateClassicEarlyRetirementFactor(0, 0)).toBe(1);
    expect(calculateClassicEarlyRetirementFactor(2, 0)).toBeCloseTo(0.9, 6);
    expect(calculateClassicEarlyRetirementFactor(5, 0)).toBeCloseTo(0.75, 6);
  });

  it("revalues deferred benefits by whole CPI years", () => {
    expect(
      calculateClassicPensionRevaluationFactor({
        fromDate: "2026-04-01",
        rowDate: "2031-04-01",
        cpiPercent: 3,
      })
    ).toBeCloseTo(1.159274, 6);
  });

  it("uses projected salary when the final salary link is maintained", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-04-01",
      showClassic: true,
      classicCalculationMode: "estimate",
      classicFinalSalaryLink: "maintained",
      classicCurrentFinalPensionableEarnings: 70000,
      classicReckonableServiceYears: 10,
      alphaPayRisePercent: 3,
    };

    expect(
      calculateClassicAnnualPensionAtDate({
        settings,
        rowDate: "2031-04-01",
      })
    ).toBeCloseTo(10143.65, 2);
    expect(
      calculateClassicAutomaticLumpSumAtDate({
        settings,
        rowDate: "2031-04-01",
      })
    ).toBeCloseTo(30430.94, 2);
  });

  it("keeps preserved salary fixed when the final salary link is broken", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2024-04-01",
      showClassic: true,
      classicCalculationMode: "estimate",
      classicFinalSalaryLink: "broken",
      classicPreservedFinalPensionableEarnings: 70000,
      classicReckonableServiceYears: 10,
      alphaPayRisePercent: 3,
    };

    expect(
      calculateClassicAnnualPensionAtDate({
        settings,
        rowDate: "2031-04-01",
      })
    ).toBe(8750);
  });

  it("adds classic and classic plus income to projection rows at their draw ages", () => {
    const rows = createProjectionTable({
      ...defaultSettings,
      startDate: "2024-04-01",
      dateOfBirth: "1970-04-01",
      lifeExpectancy: 61,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      showLisa: false,
      showClassic: true,
      classicCalculationMode: "manual",
      classicAnnualPension: 12000,
      classicAutomaticLumpSum: 36000,
      classicPensionDrawAge: 55,
      showClassicPlus: true,
      classicPlusCalculationMode: "manual",
      classicPlusAnnualPension: 17500,
      classicPlusAutomaticLumpSum: 22500,
      classicPlusPensionDrawAge: 60,
    });

    const age55Row = rows.find((row) => row.date === "2025-04-01");
    const age60Row = rows.find((row) => row.date === "2030-04-01");

    expect(age55Row?.annualClassicPensionIncludingReduction).toBe(9000);
    expect(age55Row?.monthlyClassicPensionGross).toBe(750);
    expect(age60Row?.annualClassicPlusPensionIncludingReduction).toBe(17500);
    expect(age60Row?.classicPlusAutomaticLumpSumIncludingReduction).toBe(22500);
  });
});
