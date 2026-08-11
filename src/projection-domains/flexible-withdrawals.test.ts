import { createProjectionTable } from "../projection-core";
import {
  createDefaultAdditionalGuaranteedIncome,
  createDefaultSettings,
  type PensionSettings,
} from "../settings";

describe("flexible withdrawal coordination", () => {
  it("uses an ISA to meet the remaining flat income target", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 24_000,
        showIsa: true,
        isaCurrentPot: 50_000,
        isaWithdrawalStrategy: "meet_income_target",
      })
    );

    const row = getRetirementRow(rows);

    expect(row.monthlyIsaPension).toBeCloseTo(2_000, 6);
    expect(row.totalMonthlyNetIncome).toBeCloseTo(2_000, 6);
    expect(row.monthlyAvoidableFlexibleSurplus).toBeCloseTo(0, 6);
  });

  it("uses the active SMILE target without calculating phases in account code", () => {
    const rows = createProjectionTable(
      createSettings({
        lifeExpectancy: 63,
        desiredRetirementIncome: 24_000,
        spendingStrategyType: "SPENDING_SMILE",
        spendingSmile: {
          goGoPercentage: 100,
          slowGoStartAge: 62,
          slowGoPercentage: 50,
          noGoStartAge: 63,
          noGoPercentage: 40,
        },
        showIsa: true,
        isaCurrentPot: 50_000,
        isaWithdrawalStrategy: "meet_income_target",
      })
    );
    const age61 = rows.find((row) => row.date === "2027-01-01");
    const age62 = rows.find((row) => row.date === "2028-01-01");

    expect(age61?.monthlyIsaPension).toBeCloseTo(2_000, 6);
    expect(age62?.monthlyIsaPension).toBeCloseTo(1_000, 6);
  });

  it("processes target-based accounts in the configured priority order", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 12_000,
        showSipp: true,
        sippCurrentPot: 20_000,
        sippWithdrawalStrategy: "meet_income_target",
        showIsa: true,
        isaCurrentPot: 20_000,
        isaWithdrawalStrategy: "meet_income_target",
        flexibleWithdrawalPriority: ["isa", "sipp", "csAvc", "lisa"],
      })
    );

    const row = getRetirementRow(rows);

    expect(row.monthlyIsaPension).toBeCloseTo(1_000, 6);
    expect(row.monthlySippPension).toBe(0);
  });

  it("skips an inaccessible target account without changing priority", () => {
    const settings = createSettings({
      desiredRetirementIncome: 12_000,
      showLisa: true,
      lisaCurrentPot: 20_000,
      lisaDrawAge: 62,
      lisaWithdrawalStrategy: "meet_income_target",
      showIsa: true,
      isaCurrentPot: 20_000,
      isaWithdrawalStrategy: "meet_income_target",
      flexibleWithdrawalPriority: ["lisa", "isa", "sipp", "csAvc"],
    });
    const rows = createProjectionTable(settings);

    const row = getRetirementRow(rows);

    expect(row.monthlyLisaPension).toBe(0);
    expect(row.monthlyIsaPension).toBeCloseTo(1_000, 6);
    expect(settings.flexibleWithdrawalPriority).toEqual([
      "lisa",
      "isa",
      "sipp",
      "csAvc",
    ]);
  });

  it("grosses up a taxable SIPP withdrawal to close a net target gap", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 12_000,
        taxationEnabled: true,
        taxPersonalAllowance: 0,
        taxPersonalAllowanceTaperThreshold: 200_000,
        taxBasicRateLimit: 100_000,
        taxAdditionalRateThreshold: 200_000,
        taxBasicRatePercent: 20,
        taxHigherRatePercent: 40,
        taxAdditionalRatePercent: 45,
        taxSippTaxFreeWithdrawalPercent: 25,
        showSipp: true,
        sippCurrentPot: 50_000,
        sippWithdrawalStrategy: "meet_income_target",
      })
    );

    const row = getRetirementRow(rows);

    expect(row.monthlySippPension).toBeCloseTo(1_176.47, 1);
    expect(row.totalMonthlyNetIncome).toBeCloseTo(1_000, 6);
  });

  it("grosses up a taxable Civil Service AVC withdrawal", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 12_000,
        taxationEnabled: true,
        taxPersonalAllowance: 0,
        taxPersonalAllowanceTaperThreshold: 200_000,
        taxBasicRateLimit: 100_000,
        taxAdditionalRateThreshold: 200_000,
        taxBasicRatePercent: 20,
        taxHigherRatePercent: 40,
        taxAdditionalRatePercent: 45,
        taxCsAvcTaxFreeWithdrawalPercent: 25,
        showCsAvc: true,
        csAvcCurrentPot: 50_000,
        csAvcWithdrawalStrategy: "meet_income_target",
      })
    );
    const row = getRetirementRow(rows);

    expect(row.monthlyCsAvcPension).toBeCloseTo(1_176.47, 1);
    expect(row.totalMonthlyNetIncome).toBeCloseTo(1_000, 6);
  });

  it("applies explicit withdrawals before target-based withdrawals", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 30_000,
        showIsa: true,
        isaCurrentPot: 120_000,
        isaWithdrawalStrategy: "percentage",
        isaWithdrawalPercent: 10,
        showSipp: true,
        sippCurrentPot: 50_000,
        sippWithdrawalStrategy: "meet_income_target",
      })
    );

    const row = getRetirementRow(rows);

    expect(row.monthlyIsaPension).toBeCloseTo(1_000, 6);
    expect(row.monthlySippPension).toBeCloseTo(1_500, 6);
    expect(row.totalMonthlyNetIncome).toBeCloseTo(2_500, 6);
  });

  it("exhausts one shared lump-sum allowance chronologically across withdrawals", () => {
    const rows = createProjectionTable(
      createSettings({
        taxationEnabled: true,
        taxTrackLumpSumAllowance: true,
        taxLumpSumAllowance: 300,
        taxLumpSumAllowanceUsed: 0,
        taxSippWithdrawalTreatment: "ufpls",
        showSipp: true,
        sippCurrentPot: 120_000,
        sippWithdrawalStrategy: "percentage",
        sippWithdrawalPercent: 10,
      })
    );
    const january = rows.find((row) => row.date === "2027-01-01");
    const february = rows.find((row) => row.date === "2027-02-01");
    const march = rows.find((row) => row.date === "2027-03-01");

    expect(january?.monthlyTaxFreePensionCash).toBeCloseTo(250, 6);
    expect(january?.pensionLumpSumAllowanceRemaining).toBeCloseTo(50, 6);
    expect(february?.monthlyTaxFreePensionCash).toBeCloseTo(50, 6);
    expect(february?.pensionLumpSumAllowanceRemaining).toBe(0);
    expect(march?.monthlyTaxFreePensionCash).toBe(0);
    expect(march?.monthlySippTaxableIncome).toBeCloseTo(
      march?.monthlySippPension ?? 0,
      6
    );
  });
});

describe("flexible withdrawal surplus analysis", () => {
  it("attributes avoidable surplus to an explicit ISA withdrawal", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 24_000,
        showAdditionalGuaranteedIncome: true,
        additionalGuaranteedIncomes: [
          createGuaranteedIncome(20_000, "guaranteed-income"),
        ],
        showIsa: true,
        isaCurrentPot: 120_000,
        isaWithdrawalStrategy: "percentage",
        isaWithdrawalPercent: 10,
      })
    );
    const row = getRetirementRow(rows);

    expect(row.totalMonthlyNetIncome).toBeCloseTo(2_666.67, 1);
    expect(row.monthlyUnavoidableSurplus).toBeCloseTo(0, 6);
    expect(row.monthlyAvoidableFlexibleSurplus).toBeCloseTo(666.67, 1);
    expect(row.monthlyReducibleFlexibleWithdrawals?.isa.gross).toBeCloseTo(
      666.67,
      1
    );
  });

  it("separates unavoidable guaranteed-income surplus", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 24_000,
        showAdditionalGuaranteedIncome: true,
        additionalGuaranteedIncomes: [
          createGuaranteedIncome(27_000, "guaranteed-income"),
        ],
      })
    );
    const row = getRetirementRow(rows);

    expect(row.monthlyUnavoidableSurplus).toBeCloseTo(250, 6);
    expect(row.monthlyAvoidableFlexibleSurplus).toBe(0);
    expect(row.monthlyReducibleFlexibleWithdrawals?.isa.gross).toBe(0);
  });

  it("does not flag a required withdrawal while a shortfall remains", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 30_000,
        showAdditionalGuaranteedIncome: true,
        additionalGuaranteedIncomes: [
          createGuaranteedIncome(20_000, "guaranteed-income"),
        ],
        showIsa: true,
        isaCurrentPot: 12_000,
        isaWithdrawalStrategy: "percentage",
        isaWithdrawalPercent: 10,
      })
    );
    const row = getRetirementRow(rows);

    expect(row.totalMonthlyNetIncome).toBeLessThan(2_500);
    expect(row.monthlyAvoidableFlexibleSurplus).toBe(0);
    expect(row.monthlyReducibleFlexibleWithdrawals?.isa.gross).toBe(0);
  });

  it("attributes multiple explicit accounts in reverse configured order", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 12_000,
        showAdditionalGuaranteedIncome: true,
        additionalGuaranteedIncomes: [
          createGuaranteedIncome(12_000, "guaranteed-income"),
        ],
        showSipp: true,
        sippCurrentPot: 120_000,
        sippWithdrawalStrategy: "percentage",
        sippWithdrawalPercent: 10,
        showIsa: true,
        isaCurrentPot: 120_000,
        isaWithdrawalStrategy: "percentage",
        isaWithdrawalPercent: 10,
      })
    );
    const row = getRetirementRow(rows);
    const insights = row.monthlyReducibleFlexibleWithdrawals;

    expect(insights?.isa.gross).toBeCloseTo(1_000, 6);
    expect(insights?.sipp.gross).toBeCloseTo(1_000, 6);
    expect((insights?.isa.net ?? 0) + (insights?.sipp.net ?? 0)).toBeCloseTo(
      row.monthlyAvoidableFlexibleSurplus ?? 0,
      6
    );
  });

  it("distinguishes gross taxable reduction from net overfunding", () => {
    const rows = createProjectionTable(
      createSettings({
        desiredRetirementIncome: 12_000,
        showAdditionalGuaranteedIncome: true,
        additionalGuaranteedIncomes: [
          createGuaranteedIncome(12_000, "guaranteed-income"),
        ],
        taxationEnabled: true,
        taxPersonalAllowance: 0,
        taxPersonalAllowanceTaperThreshold: 200_000,
        taxBasicRateLimit: 100_000,
        taxAdditionalRateThreshold: 200_000,
        taxBasicRatePercent: 20,
        taxHigherRatePercent: 40,
        taxAdditionalRatePercent: 45,
        taxSippTaxFreeWithdrawalPercent: 25,
        showSipp: true,
        sippCurrentPot: 120_000,
        sippWithdrawalStrategy: "percentage",
        sippWithdrawalPercent: 10,
      })
    );
    const insight =
      getRetirementRow(rows).monthlyReducibleFlexibleWithdrawals?.sipp;

    expect(insight?.gross).toBeCloseTo(1_000, 6);
    expect(insight?.net).toBeCloseTo(850, 6);
  });
});

function createSettings(overrides: Partial<PensionSettings>): PensionSettings {
  return {
    ...createDefaultSettings(),
    startDate: "2026-01-01",
    dateOfBirth: "1966-01-01",
    requirementAge: 61,
    lifeExpectancy: 62,
    projectionBasis: "real",
    inflationRateAnnual: 0,
    showAlpha: false,
    showClassic: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: false,
    showStatePension: false,
    showSipp: false,
    showCsAvc: false,
    showIsa: false,
    showLisa: false,
    showAdditionalGuaranteedIncome: false,
    additionalGuaranteedIncomes: [],
    taxationEnabled: false,
    sippDrawAge: 61,
    sippRealInterestPercent: 0,
    csAvcDrawAge: 61,
    csAvcRealInterestPercent: 0,
    isaDrawAge: 61,
    isaRealInterestPercent: 0,
    lisaDrawAge: 61,
    lisaRealInterestPercent: 0,
    ...overrides,
  };
}

function createGuaranteedIncome(amount: number, id: string) {
  return {
    ...createDefaultAdditionalGuaranteedIncome(61),
    id,
    annualAmount: amount,
    startAge: 61,
    taxable: false,
  };
}

function getRetirementRow(rows: ReturnType<typeof createProjectionTable>) {
  const row = rows.find((candidate) => candidate.date === "2027-01-01");

  if (!row) {
    throw new Error("Expected a projection row at retirement");
  }

  return row;
}
