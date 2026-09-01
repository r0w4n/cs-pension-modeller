import { describe, expect, it } from "vitest";
import {
  createDefaultPartnerSettings,
  createDefaultSettings,
  createPartnerIndividualSettings,
  normalizeSettings,
} from "../settings";
import { getModelledMonthlyGrowthRate } from "../projection-domains/inflation";
import { calculateAnnualIncomeTax } from "../projection-domains/tax";
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
    const calendarMonths = projection.rows.map((row) => row.date.slice(0, 7));
    expect(new Set(calendarMonths).size).toBe(calendarMonths.length);
    const alignedMonth = findMonth(projection, "2065-06");
    expect(alignedMonth?.people.you?.date.startsWith("2065-06")).toBe(true);
    expect(alignedMonth?.people.partner?.date.startsWith("2065-06")).toBe(true);
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

  it("coordinates household funding across Your SIPP and ISA", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      dateOfBirth: "1977-04-01",
      requirementAge: 55,
      lifeExpectancy: 85,
      desiredRetirementIncome: 31_350,
      retirementIncomeTargetBasis: "after_tax",
      showAlpha: true,
      alphaPensionLeaveAge: 55,
      alphaPensionDrawAge: 57,
      accruedPensionAtLastAbs: 16_000,
      pensionableEarnings: 70_000,
      showSipp: true,
      sippCurrentPot: 45_000,
      sippMonthlyContribution: 1_100,
      sippDrawAge: 57,
      sippWithdrawalStrategy: "meet_income_target",
      showIsa: true,
      isaCurrentPot: 45_000,
      isaMonthlyContribution: 150,
      isaDrawAge: 55,
      isaWithdrawalStrategy: "meet_income_target",
      flexibleWithdrawalPriority: ["sipp", "isa"],
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1986-10-01",
        requirementAge: 65,
        lifeExpectancy: 85,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 45_400,
        fullyRetiredDesiredRetirementIncome: 45_400,
      },
    });

    const projection = calculateJointRetirementProjection(settings);
    const householdRows = projection.people.you.rows;

    expect(householdRows.some((row) => row.monthlyIsaPension > 0)).toBe(true);
    expect(householdRows.some((row) => row.monthlySippPension > 0)).toBe(true);
    expect(householdRows.some((row) => row.monthlyIncomeTax > 0)).toBe(true);
  });

  it("carries coordinated target-account balances forward after each withdrawal", () => {
    const defaults = createDefaultSettings();
    const partner = {
      ...createDefaultPartnerSettings(),
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 75,
      taxationEnabled: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
    };
    const settings = normalizeSettings({
      ...defaults,
      startDate: "2026-06-01",
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 75,
      desiredRetirementIncome: 12_000,
      retirementIncomeTargetBasis: "gross",
      taxationEnabled: false,
      showAlpha: false,
      showStatePension: false,
      showSipp: true,
      sippCurrentPot: 100_000,
      sippMonthlyContribution: 0,
      sippDrawAge: 60,
      sippWithdrawalStrategy: "meet_income_target",
      showIsa: false,
      flexibleWithdrawalPriority: ["sipp"],
      partner,
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 12_000,
        fullyRetiredDesiredRetirementIncome: 12_000,
        flexibleWithdrawalPriority: ["you:sipp"],
      },
    });

    const projection = calculateJointRetirementProjection(settings);
    const coordinatedWithdrawalRows = projection.people.you.rows.filter(
      (row) => row.monthlySippPension > 0
    );
    const monthlyGrowthRate = getModelledMonthlyGrowthRate(
      settings,
      settings.sippRealInterestPercent / 100
    );

    expect(coordinatedWithdrawalRows.length).toBeGreaterThan(1);
    const [firstWithdrawal, secondWithdrawal] = coordinatedWithdrawalRows;
    expect(secondWithdrawal.sippPot).toBeCloseTo(
      firstWithdrawal.sippPot * (1 + monthlyGrowthRate) -
        secondWithdrawal.monthlySippPension,
      2
    );
  });

  it("preserves a later retiree's zero employment income during partial retirement", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 90,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1980-06-01",
        requirementAge: 60,
        lifeExpectancy: 90,
        fullSalary: 48_000,
        partialRetirementEnabled: true,
        partialRetirementStartAge: 55,
        partialRetirementWorkPercent: 0,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 0,
        fullyRetiredDesiredRetirementIncome: 0,
      },
    });

    const projection = calculateJointRetirementProjection(settings);

    expect(
      findMonth(projection, "2035-06")?.people.partner?.monthlyEmploymentIncome
    ).toBe(0);
  });

  it("uses full salary before a later retiree's partial-retirement start", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 90,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1980-06-01",
        requirementAge: 60,
        lifeExpectancy: 90,
        fullSalary: 48_000,
        partialRetirementEnabled: true,
        partialRetirementStartAge: 55,
        partialRetirementWorkPercent: 50,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 0,
        fullyRetiredDesiredRetirementIncome: 0,
      },
    });

    const projection = calculateJointRetirementProjection(settings);

    expect(
      findMonth(projection, "2032-06")?.people.partner?.monthlyEmploymentIncome
    ).toBe(4_000);
    expect(
      findMonth(projection, "2035-06")?.people.partner?.monthlyEmploymentIncome
    ).toBe(2_000);
  });

  it("does not add tax-only salary context to transition salary already shown as cash income", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 90,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1980-06-01",
        requirementAge: 60,
        lifeExpectancy: 90,
        fullSalary: 48_000,
        partialRetirementEnabled: false,
        showAlpha: false,
        showStatePension: false,
        showSipp: false,
        showIsa: false,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 0,
        fullyRetiredDesiredRetirementIncome: 0,
      },
    });

    const projection = calculateJointRetirementProjection(settings);
    const partnerSettings = createPartnerIndividualSettings(settings);
    const fullTransitionTaxYearRow = findMonth(projection, "2031-05")?.people
      .partner;

    expect(fullTransitionTaxYearRow?.monthlyEmploymentIncome).toBe(4_000);
    expect(fullTransitionTaxYearRow?.monthlyIncomeTax).toBeCloseTo(
      calculateAnnualIncomeTax(partnerSettings, 48_000) / 12,
      6
    );
  });

  it("carries the pension lump-sum allowance across household SIPP withdrawals", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      startDate: "2026-06-01",
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 75,
      taxationEnabled: false,
      taxTrackLumpSumAllowance: true,
      taxLumpSumAllowance: 300,
      taxLumpSumAllowanceUsed: 0,
      taxSippWithdrawalTreatment: "ufpls",
      showAlpha: false,
      showStatePension: false,
      showSipp: true,
      sippCurrentPot: 100_000,
      sippMonthlyContribution: 0,
      sippDrawAge: 60,
      sippWithdrawalStrategy: "meet_income_target",
      showIsa: false,
      flexibleWithdrawalPriority: ["sipp"],
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1970-06-01",
        requirementAge: 60,
        lifeExpectancy: 75,
        taxationEnabled: false,
        showStatePension: false,
        showSipp: false,
        showIsa: false,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 12_000,
        fullyRetiredDesiredRetirementIncome: 12_000,
        flexibleWithdrawalPriority: ["you:sipp"],
      },
    });

    const withdrawalRows = calculateJointRetirementProjection(
      settings
    ).people.you.rows.filter((row) => row.monthlySippPension > 0);

    expect(withdrawalRows[0].monthlyTaxFreePensionCash).toBeCloseTo(250, 6);
    expect(withdrawalRows[0].pensionLumpSumAllowanceRemaining).toBeCloseTo(
      50,
      6
    );
    expect(withdrawalRows[1].monthlyTaxFreePensionCash).toBeCloseTo(50, 6);
    expect(withdrawalRows[1].pensionLumpSumAllowanceRemaining).toBe(0);
    expect(withdrawalRows[2].monthlyTaxFreePensionCash).toBe(0);
  });
});
