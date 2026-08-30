import { describe, expect, it } from "vitest";
import {
  createDefaultPartnerSettings,
  createDefaultSettings,
  normalizeSettings,
} from "../settings";
import { calculateJointRetirementProjection } from "./joint-retirement-plan";

function findMonth(
  projection: ReturnType<typeof calculateJointRetirementProjection>,
  month: string
) {
  return projection.rows.find((row) => row.date.startsWith(month));
}

describe("calculateJointRetirementProjection", () => {
  it("uses calendar retirement months for the transition and both-retired targets", () => {
    const partner = createDefaultPartnerSettings();
    partner.dateOfBirth = "1980-06-01";
    partner.requirementAge = 60;
    partner.lifeExpectancy = 90;
    partner.fullSalary = 48_000;

    const settings = normalizeSettings({
      ...createDefaultSettings(),
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 90,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      partner,
      jointRetirement: {
        enabled: true,
        transitionDesiredRetirementIncome: 30_000,
        fullyRetiredDesiredRetirementIncome: 40_000,
        spendingStrategyType: "FLAT",
        spendingSmile: {
          goGoPercentage: 100,
          slowGoStartAge: 75,
          slowGoPercentage: 85,
          noGoStartAge: 85,
          noGoPercentage: 70,
        },
        flexibleWithdrawalPriority: [],
      },
    });
    const projection = calculateJointRetirementProjection(settings);

    expect(projection.firstRetirementMonth).toBe("2030-06-01");
    expect(projection.bothRetiredMonth).toBe("2040-06-01");
    expect(findMonth(projection, "2030-05")?.target).toBeNull();
    expect(findMonth(projection, "2030-06")?.target).toBe(30_000);
    expect(findMonth(projection, "2040-06")?.target).toBe(40_000);
  });

  it("does not create a transition period when retirement days differ within one month", () => {
    const partner = createDefaultPartnerSettings();
    partner.dateOfBirth = "1970-06-01";
    partner.requirementAge = 60;
    partner.lifeExpectancy = 95;

    const settings = normalizeSettings({
      ...createDefaultSettings(),
      dateOfBirth: "1970-06-15",
      requirementAge: 60,
      lifeExpectancy: 95,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      partner,
      jointRetirement: {
        enabled: true,
        transitionDesiredRetirementIncome: 0,
        fullyRetiredDesiredRetirementIncome: 40_000,
        spendingStrategyType: "FLAT",
        spendingSmile: {
          goGoPercentage: 100,
          slowGoStartAge: 75,
          slowGoPercentage: 85,
          noGoStartAge: 85,
          noGoPercentage: 70,
        },
        flexibleWithdrawalPriority: [],
      },
    });
    const projection = calculateJointRetirementProjection(settings);

    expect(projection.firstRetirementMonth).toBe("2030-06-01");
    expect(projection.bothRetiredMonth).toBe("2030-06-01");
    expect(
      projection.rows.find((row) => row.date.startsWith("2030-06"))?.target
    ).toBe(40_000);
  });

  it("includes only the later retiree's employment income in the transition period", () => {
    const partner = createDefaultPartnerSettings();
    partner.dateOfBirth = "1980-06-01";
    partner.requirementAge = 60;
    partner.lifeExpectancy = 90;
    partner.fullSalary = 48_000;

    const settings = normalizeSettings({
      ...createDefaultSettings(),
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 90,
      fullSalary: 36_000,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      partner,
      jointRetirement: {
        enabled: true,
        transitionDesiredRetirementIncome: 30_000,
        fullyRetiredDesiredRetirementIncome: 40_000,
        spendingStrategyType: "FLAT",
        spendingSmile: {
          goGoPercentage: 100,
          slowGoStartAge: 75,
          slowGoPercentage: 85,
          noGoStartAge: 85,
          noGoPercentage: 70,
        },
        flexibleWithdrawalPriority: [],
      },
    });
    const projection = calculateJointRetirementProjection(settings);
    const transitionRow = findMonth(projection, "2035-06");
    const beforeFirstRetirementRow = findMonth(projection, "2030-05");

    expect(beforeFirstRetirementRow?.household.grossIncome).toBe(0);
    expect(beforeFirstRetirementRow?.household.estimatedIncomeTax).toBe(0);
    expect(transitionRow?.people.you?.monthlyEmploymentIncome).toBe(0);
    expect(transitionRow?.people.partner?.monthlyEmploymentIncome).toBe(4_000);
    expect(transitionRow?.people.partner?.monthlyIncomeTax).toBeGreaterThan(0);
  });

  it("applies household SMILE spending only after both people retire", () => {
    const partner = createDefaultPartnerSettings();
    partner.dateOfBirth = "1980-06-01";
    partner.requirementAge = 60;
    partner.lifeExpectancy = 95;

    const settings = normalizeSettings({
      ...createDefaultSettings(),
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 95,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      partner,
      jointRetirement: {
        enabled: true,
        transitionDesiredRetirementIncome: 30_000,
        fullyRetiredDesiredRetirementIncome: 40_000,
        spendingStrategyType: "SPENDING_SMILE",
        spendingSmile: {
          goGoPercentage: 100,
          slowGoStartAge: 65,
          slowGoPercentage: 80,
          noGoStartAge: 80,
          noGoPercentage: 70,
        },
        flexibleWithdrawalPriority: [],
      },
    });
    const projection = calculateJointRetirementProjection(settings);

    expect(findMonth(projection, "2035-06")?.target).toBe(30_000);
    expect(findMonth(projection, "2044-06")?.target).toBe(40_000);
    expect(findMonth(projection, "2045-06")?.target).toBe(32_000);
  });
});
