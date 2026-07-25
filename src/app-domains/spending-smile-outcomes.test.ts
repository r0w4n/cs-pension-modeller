import { describe, expect, it } from "vitest";
import type { RetirementIncomePoint } from "../RetirementIncomeBridgeChart";
import { createDefaultSpendingSmile } from "../spending-smile";
import { createDefaultSettings } from "../settings";
import {
  aggregateSpendingPhaseOutcomes,
  createAnnualSpendingOutcomes,
  createBridgeSpendingPhaseOutcomes,
} from "./spending-smile-outcomes";

describe("Spending Smile phase outcomes", () => {
  it("calculates funding ratio and first shortfall age", () => {
    const settings = createSettings();
    const series = [
      point(60, "2050-01-01", 40_000),
      point(61, "2051-01-01", 40_000),
      point(62, "2052-01-01", 20_000),
      point(63, "2053-01-01", 0),
    ];
    settings.lifeExpectancy = 63;
    settings.spendingSmile.slowGoStartAge = 62;
    settings.spendingSmile.noGoStartAge = 70;

    const outcomes = aggregateSpendingPhaseOutcomes(
      createAnnualSpendingOutcomes(series, settings),
      settings
    );

    expect(outcomes[0]).toMatchObject({
      phase: "GO_GO",
      yearsInProjection: 2,
      yearsTargetMet: 2,
      fullyFunded: true,
      status: "FULLY_FUNDED",
    });
    expect(outcomes[1]).toMatchObject({
      phase: "SLOW_GO",
      firstShortfallAge: 62,
      fullyFunded: false,
      status: "PARTIALLY_FUNDED",
    });
    expect(outcomes[1]?.fundingRatio).toBeCloseTo(20_000 / 68_000);
  });

  it("marks a phase beyond life expectancy as not reached", () => {
    const settings = createSettings();
    settings.lifeExpectancy = 82;

    const series = Array.from({ length: 23 }, (_, index) =>
      point(60 + index, `${2050 + index}-01-01`, 50_000)
    );
    const outcomes = aggregateSpendingPhaseOutcomes(
      createAnnualSpendingOutcomes(series, settings),
      settings
    );

    expect(outcomes[2]).toMatchObject({
      phase: "NO_GO",
      yearsInProjection: 0,
      totalTargetReal: 0,
      status: "NOT_REACHED",
    });
  });

  it("uses the bridge engine's residual shortfall as achievable spending", () => {
    const settings = createSettings();
    settings.lifeExpectancy = 61;
    settings.spendingSmile.slowGoStartAge = 61;
    settings.spendingSmile.noGoStartAge = 70;
    const outcomes = createBridgeSpendingPhaseOutcomes(
      {
        potProjection: [
          bridgeRow(60, "2050-01-01", 0),
          bridgeRow(61, "2051-01-01", 17_000 / 12),
        ],
      },
      settings
    );

    expect(outcomes[0]).toMatchObject({
      status: "FULLY_FUNDED",
      fundingRatio: 1,
    });
    expect(outcomes[1]).toMatchObject({
      status: "PARTIALLY_FUNDED",
      firstShortfallAge: 61,
    });
    expect(outcomes[1]?.fundingRatio).toBeCloseTo(0.5);
  });
});

function createSettings() {
  return {
    ...createDefaultSettings(),
    dateOfBirth: "1990-01-01",
    startDate: "2050-01-01",
    requirementAge: 60,
    lifeExpectancy: 95,
    projectionBasis: "real" as const,
    spendingStrategyType: "SPENDING_SMILE" as const,
    spendingSmile: {
      ...createDefaultSpendingSmile(40_000),
      initialized: true,
    },
  };
}

function point(
  age: number,
  date: string,
  assessedIncomeAnnual: number
): RetirementIncomePoint {
  return {
    date,
    age,
    targetIncomeAnnual: 0,
    isaIncomeAnnual: 0,
    lisaIncomeAnnual: 0,
    sippIncomeAnnual: 0,
    csAvcIncomeAnnual: 0,
    alphaIncomeAnnual: 0,
    classicIncomeAnnual: 0,
    classicPlusIncomeAnnual: 0,
    nuvosIncomeAnnual: 0,
    premiumIncomeAnnual: 0,
    additionalGuaranteedIncomeAnnual: 0,
    partialRetirementIncomeAnnual: 0,
    statePensionIncomeAnnual: 0,
    totalIncomeAnnual: assessedIncomeAnnual,
    assessedIncomeAnnual,
    shortfallAnnual: 0,
    phase: "alpha-state",
  };
}

function bridgeRow(age: number, date: string, unfundedShortfall: number) {
  return {
    date,
    age,
    ageMonths: 0,
    monthlyAlphaPension: 0,
    monthlyNuvosPension: 0,
    monthlyPremiumPension: 0,
    monthlyAdditionalGuaranteedIncomeGross: 0,
    monthlyAdditionalGuaranteedIncomeTaxable: 0,
    monthlyStatePension: 0,
    monthlyTargetIncome: 0,
    isaBalance: 0,
    lisaBalance: 0,
    sippBalance: 0,
    csAvcBalance: 0,
    isaDrawdown: 0,
    lisaDrawdown: 0,
    sippDrawdown: 0,
    csAvcDrawdown: 0,
    unfundedShortfall,
    growth: 0,
    milestones: [],
    milestoneDates: [],
  };
}
