import { calculateJointRetirementProjection } from "../calculation/joint-retirement-plan";
import {
  createDefaultPartnerSettings,
  createDefaultSettings,
  normalizeSettings,
} from "../settings";
import { createRetirementIncomeChartParameters } from "./retirement-income";
import { projectJointRetirementResults } from "./joint-retirement-results";

describe("projectJointRetirementResults", () => {
  it("retains owner-attributable SIPP and ISA withdrawals from canonical household rows", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 75,
      showAlpha: false,
      showStatePension: false,
      showSipp: true,
      sippDrawAge: 60,
      showIsa: true,
      isaDrawAge: 57,
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1975-06-01",
        requirementAge: 60,
        lifeExpectancy: 75,
        showAlpha: false,
        showStatePension: false,
        showSipp: true,
        sippDrawAge: 60,
        showIsa: true,
        isaDrawAge: 55,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
      },
    });
    const projection = calculateJointRetirementProjection(settings);
    const householdRow = projection.rows.find(
      (row) =>
        row.date >= projection.bothRetiredMonth &&
        row.people.you &&
        row.people.partner
    );

    expect(householdRow?.people.you).not.toBeNull();
    expect(householdRow?.people.partner).not.toBeNull();
    householdRow!.people.you!.monthlySippPension = 100;
    householdRow!.people.you!.monthlyIsaPension = 200;
    householdRow!.people.partner!.monthlySippPension = 300;
    householdRow!.people.partner!.monthlyIsaPension = 400;

    const result = projectJointRetirementResults(
      projection,
      settings,
      createRetirementIncomeChartParameters(settings)
    );
    const point = result.incomeSeries.find(
      (candidate) => candidate.date === householdRow!.date
    );

    expect(point?.incomeSeries).toEqual(
      expect.arrayContaining([
        { key: "you-sippIncomeAnnual", annualAmount: 1_200 },
        { key: "you-isaIncomeAnnual", annualAmount: 2_400 },
        { key: "partner-sippIncomeAnnual", annualAmount: 3_600 },
        { key: "partner-isaIncomeAnnual", annualAmount: 4_800 },
      ])
    );
  });

  it("projects separate You and Partner ages onto the shared calendar timeline", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1980-06-01",
        requirementAge: 60,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
      },
    });
    const projection = calculateJointRetirementProjection(settings);

    const result = projectJointRetirementResults(
      projection,
      settings,
      createRetirementIncomeChartParameters(settings)
    );
    const point = result.incomeSeries.find(
      (candidate) => candidate.date === projection.firstRetirementMonth
    );

    expect(point?.personAges?.you).toBeCloseTo(60, 6);
    expect(point?.personAges?.partner).toBeCloseTo(50, 6);
  });

  it("groups nominal targets by real household phase rather than monthly inflation", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      startDate: "2026-06-01",
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 90,
      projectionBasis: "nominal",
      taxationEnabled: false,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1980-06-01",
        requirementAge: 60,
        lifeExpectancy: 90,
        taxationEnabled: false,
        showStatePension: false,
        showSipp: false,
        showIsa: false,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 30_000,
        fullyRetiredDesiredRetirementIncome: 40_000,
      },
    });
    const projection = calculateJointRetirementProjection(settings);

    const result = projectJointRetirementResults(
      projection,
      settings,
      createRetirementIncomeChartParameters(settings)
    );

    expect(result.incomePeriodItems).toHaveLength(2);
    expect(
      result.tableRows.filter((row) =>
        row.milestones.includes("Household target changes")
      )
    ).toHaveLength(1);
    expect(result.incomePeriodItems[0].endDate).toBe("2040-05-01");
    expect(result.incomePeriodItems[1].startDate).toBe("2040-06-01");
  });
});
