import {
  migrateFromV1ToV2,
  migrateFromV2ToV3,
  migrateFromV3ToV4,
  migrateFromV4ToV5,
  migrateFromV5ToV6,
  migrateFromV6ToV7,
  migrateFromV7ToV8,
  migrateFromV8ToV9,
  migrateFromV9ToV10,
  migrateFromV10ToV11,
  migrateFromV11ToV12,
  migrateFromV12ToV13,
  migrateFromV13ToV14,
  migrateSettingsToLatest,
} from "./settings-migrations";
import { SETTINGS_SCHEMA_VERSION } from "./settings-versions";

describe("settings-migrations", () => {
  it("renames targetRetirementAge to requirementAge", () => {
    expect(
      migrateFromV1ToV2({
        dateOfBirth: "1987-06-01",
        targetRetirementAge: 65,
      })
    ).toEqual({
      dateOfBirth: "1987-06-01",
      requirementAge: 65,
    });
  });

  it("preserves an existing requirementAge during migration", () => {
    expect(
      migrateFromV1ToV2({
        requirementAge: 64,
        targetRetirementAge: 65,
      })
    ).toEqual({
      requirementAge: 64,
    });
  });

  it("keeps legacy isaDrawAge fallback behaviour during migration", () => {
    expect(
      migrateFromV1ToV2({
        isaDrawAge: 60,
      })
    ).toEqual({
      isaDrawAge: 60,
      requirementAge: 60,
    });
  });

  it("defaults additional guaranteed income during v2 migration", () => {
    expect(
      migrateFromV2ToV3({
        requirementAge: 60,
      })
    ).toEqual({
      requirementAge: 60,
      additionalGuaranteedIncomes: [],
    });
  });

  it("defaults SIPP protected pension age settings during v3 migration", () => {
    expect(
      migrateFromV3ToV4({
        dateOfBirth: "1972-08-01",
        sippDrawAge: 55,
      })
    ).toEqual({
      dateOfBirth: "1972-08-01",
      sippDrawAge: 55,
      sippHasProtectedPensionAge: false,
      sippProtectedPensionAge: 55,
    });
  });

  it("defaults CS AVC settings during v4 migration", () => {
    expect(
      migrateFromV4ToV5({
        dateOfBirth: "1972-08-01",
        requirementAge: 60,
      })
    ).toEqual({
      dateOfBirth: "1972-08-01",
      requirementAge: 60,
      showCsAvc: false,
      csAvcCurrentPot: 0,
      csAvcMonthlyContribution: 0,
      csAvcHasProtectedPensionAge: false,
      csAvcProtectedPensionAge: 55,
      csAvcDrawAge: 60,
      csAvcLumpSums: [],
      csAvcRealInterestPercent: 5,
      csAvcWithdrawalStrategy: "use_by_age",
      csAvcWithdrawalPercent: 4,
      csAvcWithdrawalTargetAge: 75,
      taxCsAvcTaxFreeWithdrawalPercent: 25,
    });
  });

  it("keeps existing plans on flat spending during v5 migration", () => {
    expect(
      migrateFromV5ToV6({
        desiredRetirementIncome: 35_000,
      })
    ).toEqual({
      desiredRetirementIncome: 35_000,
      spendingStrategyType: "FLAT",
    });
  });

  it("converts legacy phase amounts to percentages of the selected target", () => {
    expect(
      migrateFromV6ToV7({
        desiredRetirementIncome: 30_000,
        spendingStrategyType: "SPENDING_SMILE",
        spendingSmile: {
          slowGoStartAge: 72,
          noGoStartAge: 84,
          goGo: { annualAmountReal: 33_000, percentageOfGoGo: 100 },
          slowGo: { annualAmountReal: 24_000, percentageOfGoGo: 80 },
          noGo: { annualAmountReal: 18_000, percentageOfGoGo: 60 },
        },
      })
    ).toEqual({
      desiredRetirementIncome: 30_000,
      spendingStrategyType: "SPENDING_SMILE",
      spendingSmile: {
        goGoPercentage: 110,
        slowGoStartAge: 72,
        slowGoPercentage: 80,
        noGoStartAge: 84,
        noGoPercentage: 60,
      },
    });
  });

  it("adds a stable flexible-account priority during v7 migration", () => {
    expect(migrateFromV7ToV8({ requirementAge: 60 })).toEqual({
      requirementAge: 60,
      flexibleWithdrawalPriority: ["sipp", "csAvc", "lisa", "isa"],
    });
  });

  it("keeps existing plans on the rest-of-UK tax regime during v8 migration", () => {
    expect(migrateFromV8ToV9({ requirementAge: 60 })).toEqual({
      requirementAge: 60,
      taxRegime: "rest_of_uk",
    });
  });

  it("preserves existing tax choices and keeps missing legacy choices off during v9 migration", () => {
    expect(migrateFromV9ToV10({ taxationEnabled: true })).toEqual({
      taxationEnabled: true,
    });
    expect(migrateFromV9ToV10({ taxationEnabled: false })).toEqual({
      taxationEnabled: false,
    });
    expect(migrateFromV9ToV10({ requirementAge: 60 })).toEqual({
      requirementAge: 60,
      taxationEnabled: false,
    });
  });

  it("preserves legacy withdrawal outputs when adding explicit treatment and allowance settings", () => {
    expect(
      migrateFromV10ToV11({
        taxSippTaxFreeWithdrawalPercent: 20,
        taxCsAvcTaxFreeWithdrawalPercent: 10,
      })
    ).toEqual({
      taxSippTaxFreeWithdrawalPercent: 20,
      taxCsAvcTaxFreeWithdrawalPercent: 10,
      taxSippWithdrawalTreatment: "custom",
      taxCsAvcWithdrawalTreatment: "custom",
      taxTrackLumpSumAllowance: false,
      taxLumpSumAllowance: 268_275,
      taxLumpSumAllowanceUsed: 0,
    });
  });

  it("adds target meaning and State Pension confirmation without changing existing semantics", () => {
    expect(
      migrateFromV11ToV12({
        taxationEnabled: true,
        currentStatePension: 12_000,
      })
    ).toEqual({
      taxationEnabled: true,
      currentStatePension: 12_000,
      taxRegime: "rest_of_uk",
      retirementIncomeTargetBasis: "after_tax",
      statePensionForecastConfirmed: false,
    });
    expect(
      migrateFromV11ToV12({
        taxationEnabled: true,
        taxRegime: "scotland",
        retirementIncomeTargetBasis: "gross",
        statePensionForecastConfirmed: true,
      })
    ).toEqual({
      taxationEnabled: true,
      taxRegime: "scotland",
      retirementIncomeTargetBasis: "gross",
      statePensionForecastConfirmed: true,
    });
  });

  it("migrates the former single EPA window to one dated EPA period", () => {
    expect(
      migrateFromV12ToV13({
        alphaEpaEnabled: true,
        alphaEpaYearsBeforeNpa: 2,
        alphaEpaStartDate: "2026-04-01",
        alphaEpaEndDate: "2028-03-31",
      })
    ).toEqual({
      alphaEpaEnabled: true,
      alphaEpaYearsBeforeNpa: 2,
      alphaEpaStartDate: "2026-04-01",
      alphaEpaEndDate: "2028-03-31",
      taxRegime: "rest_of_uk",
      retirementIncomeTargetBasis: "gross",
      statePensionForecastConfirmed: false,
      alphaEpaPeriods: [
        {
          id: "migrated-epa-period",
          yearsBeforeNpa: 2,
          startDate: "2026-04-01",
          endDate: "2028-03-31",
        },
      ],
    });

    expect(
      migrateFromV12ToV13({
        taxationEnabled: true,
        taxRegime: "scotland",
        retirementIncomeTargetBasis: "after_tax",
        statePensionForecastConfirmed: true,
        alphaEpaPeriods: [
          {
            id: "existing-period",
            yearsBeforeNpa: 1,
            startDate: "2029-04-01",
            endDate: "2030-03-31",
          },
        ],
      })
    ).toEqual({
      taxationEnabled: true,
      taxRegime: "scotland",
      retirementIncomeTargetBasis: "after_tax",
      statePensionForecastConfirmed: true,
      alphaEpaPeriods: [
        {
          id: "existing-period",
          yearsBeforeNpa: 1,
          startDate: "2029-04-01",
          endDate: "2030-03-31",
        },
      ],
    });
  });

  it("migrates legacy data to the latest schema", () => {
    const migratedLegacySettings = {
      dateOfBirth: "1987-06-01",
      requirementAge: 60,
      additionalGuaranteedIncomes: [],
      sippHasProtectedPensionAge: false,
      sippProtectedPensionAge: 55,
      showCsAvc: false,
      csAvcCurrentPot: 0,
      csAvcMonthlyContribution: 0,
      csAvcHasProtectedPensionAge: false,
      csAvcProtectedPensionAge: 55,
      csAvcDrawAge: 60,
      csAvcLumpSums: [],
      csAvcRealInterestPercent: 5,
      csAvcWithdrawalStrategy: "use_by_age",
      csAvcWithdrawalPercent: 4,
      csAvcWithdrawalTargetAge: 75,
      taxCsAvcTaxFreeWithdrawalPercent: 25,
      spendingStrategyType: "FLAT",
      retirementIncomeTargetBasis: "gross",
      spendingSmile: {
        goGoPercentage: 100,
        slowGoStartAge: 75,
        slowGoPercentage: 85,
        noGoStartAge: 85,
        noGoPercentage: 70,
      },
      flexibleWithdrawalPriority: ["sipp", "csAvc", "lisa", "isa"],
      taxRegime: "rest_of_uk",
      taxationEnabled: false,
      taxSippWithdrawalTreatment: "custom",
      taxCsAvcWithdrawalTreatment: "custom",
      taxTrackLumpSumAllowance: false,
      taxLumpSumAllowance: 268_275,
      taxLumpSumAllowanceUsed: 0,
      statePensionForecastConfirmed: false,
      alphaEpaPeriods: [],
    };

    expect(
      migrateSettingsToLatest({
        version: 1,
        data: {
          dateOfBirth: "1987-06-01",
          targetRetirementAge: 60,
        },
      })
    ).toEqual({
      journeys: {
        simple: migratedLegacySettings,
        bridge: migratedLegacySettings,
        expert: migratedLegacySettings,
      },
    });
  });

  it("copies the final flat settings schema into every journey", () => {
    const settings = { requirementAge: 64 };

    expect(migrateFromV13ToV14(settings)).toEqual({
      journeys: {
        simple: settings,
        bridge: settings,
        expert: settings,
      },
    });
  });

  it("returns current-version data unchanged", () => {
    const data = { requirementAge: 66 };

    expect(
      migrateSettingsToLatest({
        version: SETTINGS_SCHEMA_VERSION,
        data,
      })
    ).toBe(data);
  });

  it("falls back to empty data for a newer schema version", () => {
    expect(
      migrateSettingsToLatest({
        version: SETTINGS_SCHEMA_VERSION + 1,
        data: { requirementAge: 66 },
      })
    ).toEqual({});
  });
});
