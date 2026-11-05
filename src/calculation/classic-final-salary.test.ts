import { describe, expect, it } from "vitest";
import {
  defaultSettings,
  normalizeSettings,
  type PensionSettings,
} from "../settings";
import { calculateRetirementPlan } from "./retirement-plan";

const schemes = [
  {
    scheme: "classic",
    drawAnnualPension: 9848.2020875,
    deferredAnnualPension: 9282.875,
    startingAnnualPension: 8750,
  },
  {
    scheme: "classic plus",
    drawAnnualPension: 16413.6701458333,
    deferredAnnualPension: 15471.4583333333,
    startingAnnualPension: 14583.3333333333,
  },
] as const;

describe.each(schemes)(
  "$scheme final salary in the canonical plan",
  ({
    scheme,
    drawAnnualPension,
    deferredAnnualPension,
    startingAnnualPension,
  }) => {
    function calculate(overrides: Partial<PensionSettings> = {}) {
      return calculateRetirementPlan(
        normalizeSettings({
          ...defaultSettings,
          startDate: "2026-06-01",
          dateOfBirth: "1970-06-01",
          requirementAge: 60,
          lifeExpectancy: 75,
          showAlpha: true,
          accruedPensionAtLastAbs: 0,
          pensionableEarnings: 0,
          alphaPensionLeaveAge: 60,
          alphaPensionDrawAge: 60,
          alphaPayRisePercent: 3,
          showStatePension: false,
          showSipp: false,
          showIsa: false,
          showClassic: scheme === "classic",
          classicCalculationMode: "estimate",
          classicFinalSalaryLink: "maintained",
          classicCurrentFinalPensionableEarnings: 70000,
          classicPreservedFinalPensionableEarnings: 70000,
          classicReckonableServiceYears: 10,
          classicPensionDrawAge: 60,
          classicApplyPensionIncreases: false,
          showClassicPlus: scheme === "classic plus",
          classicPlusCalculationMode: "estimate",
          classicPlusFinalSalaryLink: "maintained",
          classicPlusCurrentFinalPensionableEarnings: 70000,
          classicPlusPreservedFinalPensionableEarnings: 70000,
          classicPlusPre2002ServiceYears: 10,
          classicPlusPost2002ServiceYears: 5,
          classicPlusPensionDrawAge: 60,
          classicPlusApplyPensionIncreases: false,
          projectionBasis: "nominal",
          inflationRateAnnual: 0,
          ...overrides,
        }),
        { includeTargetBasedWithdrawalPreviews: false }
      );
    }

    function annualIncome(plan: ReturnType<typeof calculate>, date: string) {
      expect(plan.validationIssues).toEqual([]);
      const row = plan.rows.find((row) => row.date === date);
      expect(row).toBeDefined();
      return (
        (scheme === "classic"
          ? row!.monthlyClassicPensionGross
          : row!.monthlyClassicPlusPensionGross) * 12
      );
    }

    it.each(["real", "nominal"] as const)(
      "stops salary growth after leaving and drawing in %s terms",
      (projectionBasis) => {
        const plan = calculate({ projectionBasis });
        expect(annualIncome(plan, "2030-06-01")).toBeCloseTo(
          drawAnnualPension,
          6
        );
        expect(annualIncome(plan, "2031-06-01")).toBeCloseTo(
          drawAnnualPension,
          6
        );
        expect(annualIncome(plan, "2040-06-01")).toBeCloseTo(
          drawAnnualPension,
          6
        );
        expect(annualIncome(plan, "2029-06-01")).toBe(0);
      }
    );

    it("stops salary growth on leaving Alpha before the legacy pension is drawn", () => {
      const plan = calculate({ alphaPensionLeaveAge: 58 });
      expect(annualIncome(plan, "2030-06-01")).toBeCloseTo(
        deferredAnnualPension,
        6
      );
      expect(annualIncome(plan, "2040-06-01")).toBeCloseTo(
        deferredAnnualPension,
        6
      );
    });

    it("stops salary growth when benefits are drawn during partial retirement", () => {
      const plan = calculate({
        requirementAge: 65,
        alphaPensionLeaveAge: 65,
        alphaPensionDrawAge: 65,
        partialRetirementEnabled: true,
        partialRetirementStartAge: 60,
        partialRetirementWorkPercent: 50,
      });
      expect(annualIncome(plan, "2030-06-01")).toBeCloseTo(
        drawAnnualPension,
        6
      );
      expect(annualIncome(plan, "2031-06-01")).toBeCloseTo(
        drawAnnualPension,
        6
      );
      expect(annualIncome(plan, "2040-06-01")).toBeCloseTo(
        drawAnnualPension,
        6
      );
    });

    it("does not project more salary rises for a pension already in payment", () => {
      const plan = calculate({ dateOfBirth: "1960-06-01" });
      expect(annualIncome(plan, "2026-06-01")).toBeCloseTo(
        startingAnnualPension,
        6
      );
      expect(annualIncome(plan, "2030-06-01")).toBeCloseTo(
        startingAnnualPension,
        6
      );
    });

    it("ignores a hidden Alpha leaving age and freezes earnings at the legacy draw date", () => {
      const plan = calculate({ showAlpha: false, alphaPensionLeaveAge: 57 });
      expect(annualIncome(plan, "2030-06-01")).toBeCloseTo(
        drawAnnualPension,
        6
      );
      expect(annualIncome(plan, "2040-06-01")).toBeCloseTo(
        drawAnnualPension,
        6
      );
    });

    it("does not use the income assessment start age to stop salary growth", () => {
      const plan = calculate({ requirementAge: 58 });
      expect(annualIncome(plan, "2030-06-01")).toBeCloseTo(
        drawAnnualPension,
        6
      );
    });

    it("continues configured pension increases after freezing salary", () => {
      const plan = calculate({
        inflationRateAnnual: 2.5,
        classicApplyPensionIncreases: true,
        classicPlusApplyPensionIncreases: true,
      });
      expect(
        annualIncome(plan, "2031-06-01") / annualIncome(plan, "2030-06-01")
      ).toBeCloseTo(1.025, 10);
    });

    it.each([
      {
        overrides: {
          classicFinalSalaryLink: "broken",
          classicPlusFinalSalaryLink: "broken",
        },
        manual: false,
      } as const,
      {
        overrides: {
          classicCalculationMode: "manual",
          classicPlusCalculationMode: "manual",
          classicAnnualPension: 12000,
          classicPlusAnnualPension: 12000,
        },
        manual: true,
      } as const,
    ])(
      "preserves fixed entered benefits without a maintained salary estimate",
      ({ overrides, manual }) => {
        const plan = calculate(overrides);
        expect(annualIncome(plan, "2030-06-01")).toBeCloseTo(
          manual ? 12000 : startingAnnualPension,
          6
        );
        expect(annualIncome(plan, "2040-06-01")).toBeCloseTo(
          manual ? 12000 : startingAnnualPension,
          6
        );
      }
    );
  }
);
