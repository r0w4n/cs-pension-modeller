import {
  calculateDateAge,
  calculateMinimumPensionAccessAge,
  calculateMinimumStatePensionDrawAge,
  calculateMinimumSippAccessAge,
  SETTINGS_STORAGE_KEY,
  calculateNormalPensionAge,
  calculateStatePensionDrawAge,
  calculateStatePensionDrawDate,
  calculateStatePensionDrawDateFromAge,
  createAlphaAbsDateFromYear,
  createDefaultSettings,
  defaultSettings,
  formatLocalIsoDate,
  getTodayIsoDate,
  ALPHA_ADDED_PENSION_MONTHLY_MAX,
  LISA_MONTHLY_CONTRIBUTION_MAX,
  getPartialRetirementContributionMultiplier,
  getLatestAlphaAddedPensionPurchaseDate,
  isValidIsoDate,
  loadStoredSettings,
  normalizeSetting,
  normalizeAlphaPensionDrawAge,
  normalizeSippDrawAge,
  normalizeStatePensionDrawDate,
  resolveAlphaAbsDate,
  saveSettings,
  validateSettings,
  type PensionSettings,
} from "./settings";

function expectedStoredSettings(overrides: Record<string, unknown> = {}) {
  return {
    dateOfBirth: defaultSettings.dateOfBirth,
    lifeExpectancy: defaultSettings.lifeExpectancy,
    requirementAge: defaultSettings.requirementAge,
    showAlpha: defaultSettings.showAlpha,
    projectionBasis: defaultSettings.projectionBasis,
    inflationRateAnnual: defaultSettings.inflationRateAnnual,
    showNuvos: defaultSettings.showNuvos,
    showStatePension: defaultSettings.showStatePension,
    showSipp: defaultSettings.showSipp,
    showIsa: defaultSettings.showIsa,
    showLisa: defaultSettings.showLisa,
    taxationEnabled: defaultSettings.taxationEnabled,
    partialRetirementEnabled: defaultSettings.partialRetirementEnabled,
    partialRetirementStartAge: defaultSettings.partialRetirementStartAge,
    partialRetirementWorkPercent: defaultSettings.partialRetirementWorkPercent,
    fullSalary: defaultSettings.fullSalary,
    currentStatePension: defaultSettings.currentStatePension,
    desiredRetirementIncome: defaultSettings.desiredRetirementIncome,
    statePensionDrawDate: defaultSettings.statePensionDrawDate,
    statePensionApplyFutureGrowth:
      defaultSettings.statePensionApplyFutureGrowth,
    statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
    statePensionWageGrowthPercent:
      defaultSettings.statePensionWageGrowthPercent,
    applyPensionIncreases: defaultSettings.applyPensionIncreases,
    assumedCpiPercent: defaultSettings.assumedCpiPercent,
    alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
    alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
    alphaAddedPensionFactorType: defaultSettings.alphaAddedPensionFactorType,
    alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
    accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
    pensionableEarnings: defaultSettings.pensionableEarnings,
    alphaPayRisePercent: defaultSettings.alphaPayRisePercent,
    alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
    alphaEpaEnabled: defaultSettings.alphaEpaEnabled,
    alphaEpaYearsBeforeNpa: defaultSettings.alphaEpaYearsBeforeNpa,
    alphaEpaStartDate: defaultSettings.alphaEpaStartDate,
    alphaEpaEndDate: defaultSettings.alphaEpaEndDate,
    alphaAddedPensionLumpSums: [],
    nuvosPensionAbsDate: defaultSettings.nuvosPensionAbsDate,
    nuvosAccruedPensionAtLastAbs: defaultSettings.nuvosAccruedPensionAtLastAbs,
    nuvosPensionableEarnings: defaultSettings.nuvosPensionableEarnings,
    nuvosPensionLeaveAge: defaultSettings.nuvosPensionLeaveAge,
    nuvosPensionDrawAge: defaultSettings.nuvosPensionDrawAge,
    nuvosApplyPensionIncreases: defaultSettings.nuvosApplyPensionIncreases,
    nuvosAssumedCpiPercent: defaultSettings.nuvosAssumedCpiPercent,
    sippCurrentPot: defaultSettings.sippCurrentPot,
    sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
    sippDrawAge: defaultSettings.sippDrawAge,
    sippLumpSums: defaultSettings.sippLumpSums,
    sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
    sippTaxReliefRate: defaultSettings.sippTaxReliefRate,
    sippWithdrawalStrategy: defaultSettings.sippWithdrawalStrategy,
    sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
    sippWithdrawalTargetAge: defaultSettings.sippWithdrawalTargetAge,
    isaCurrentPot: defaultSettings.isaCurrentPot,
    isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
    isaDrawAge: defaultSettings.isaDrawAge,
    isaLumpSums: defaultSettings.isaLumpSums,
    isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
    isaWithdrawalStrategy: defaultSettings.isaWithdrawalStrategy,
    isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
    isaWithdrawalTargetAge: defaultSettings.isaWithdrawalTargetAge,
    lisaCurrentPot: defaultSettings.lisaCurrentPot,
    lisaMonthlyContribution: defaultSettings.lisaMonthlyContribution,
    lisaDrawAge: defaultSettings.lisaDrawAge,
    lisaLumpSums: defaultSettings.lisaLumpSums,
    lisaRealInterestPercent: defaultSettings.lisaRealInterestPercent,
    lisaWithdrawalStrategy: defaultSettings.lisaWithdrawalStrategy,
    lisaWithdrawalPercent: defaultSettings.lisaWithdrawalPercent,
    lisaWithdrawalTargetAge: defaultSettings.lisaWithdrawalTargetAge,
    taxPersonalAllowance: defaultSettings.taxPersonalAllowance,
    taxPersonalAllowanceTaperThreshold:
      defaultSettings.taxPersonalAllowanceTaperThreshold,
    taxBasicRateLimit: defaultSettings.taxBasicRateLimit,
    taxAdditionalRateThreshold: defaultSettings.taxAdditionalRateThreshold,
    taxBasicRatePercent: defaultSettings.taxBasicRatePercent,
    taxHigherRatePercent: defaultSettings.taxHigherRatePercent,
    taxAdditionalRatePercent: defaultSettings.taxAdditionalRatePercent,
    taxSippTaxFreeWithdrawalPercent:
      defaultSettings.taxSippTaxFreeWithdrawalPercent,
    ...overrides,
  };
}

function readStoredSettingsPayload() {
  const stored = JSON.parse(
    window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}"
  ) as { data?: Record<string, unknown> };

  if (
    typeof stored === "object" &&
    stored !== null &&
    "data" in stored &&
    typeof stored.data === "object" &&
    stored.data !== null
  ) {
    return stored.data;
  }

  return stored as Record<string, unknown>;
}

describe("settings unit tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00Z"));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("uses today for the default calculation start date", () => {
    expect(getTodayIsoDate()).toBe("2026-04-25");
    expect(createDefaultSettings().startDate).toBe("2026-04-25");
  });

  it("formats today from local calendar parts instead of the UTC ISO date", () => {
    const localDateParts = {
      getFullYear: () => 2026,
      getMonth: () => 3,
      getDate: () => 25,
      toISOString: () => "2026-04-24T23:30:00.000Z",
    };

    expect(formatLocalIsoDate(localDateParts)).toBe("2026-04-25");
  });

  it("normalizes numeric settings to allowed ranges and whole-number steps", () => {
    expect(normalizeSetting("lifeExpectancy", 120)).toBe(100);
    expect(normalizeSetting("projectionBasis", "nominal")).toBe("nominal");
    expect(normalizeSetting("projectionBasis", "bad-value" as never)).toBe(
      "real"
    );
    expect(normalizeSetting("inflationRateAnnual", 2.34)).toBe(2.34);
    expect(normalizeSetting("inflationRateAnnual", 11)).toBe(10);
    expect(normalizeSetting("currentStatePension", -10)).toBe(0);
    expect(normalizeSetting("currentStatePension", 12547.6)).toBe(12547.6);
    expect(normalizeSetting("desiredRetirementIncome", 250000)).toBe(200000);
    expect(normalizeSetting("desiredRetirementIncome", 43899.6)).toBe(43900);
    expect(normalizeSetting("requirementAge", 60.25)).toBe(60.25);
    expect(
      normalizeSetting("alphaAddedPensionFactorType", "self_plus_beneficiaries")
    ).toBe("self_plus_beneficiaries");
    expect(
      normalizeSetting("alphaAddedPensionFactorType", "bad-value" as never)
    ).toBe("self");
    expect(normalizeSetting("statePensionCpiPercent", 2.34)).toBe(2.34);
    expect(normalizeSetting("statePensionWageGrowthPercent", 11)).toBe(10);
    expect(normalizeSetting("partialRetirementStartAge", 75)).toBe(70);
    expect(normalizeSetting("partialRetirementStartAge", 55.5)).toBe(55.5);
    expect(normalizeSetting("partialRetirementWorkPercent", 37.6)).toBe(38);
    expect(normalizeSetting("fullSalary", 56321.4)).toBe(56321);
    expect(normalizeSetting("assumedCpiPercent", 2.34)).toBe(2.34);
    expect(normalizeSetting("assumedCpiPercent", 11)).toBe(10);
    expect(normalizeSetting("alphaAddedPensionMonthly", 233)).toBe(233);
    expect(normalizeSetting("alphaAddedPensionMonthly", 2500)).toBe(
      ALPHA_ADDED_PENSION_MONTHLY_MAX
    );
    expect(normalizeSetting("lisaMonthlyContribution", 5000)).toBe(
      LISA_MONTHLY_CONTRIBUTION_MAX
    );
    expect(normalizeSetting("pensionableEarnings", 56321)).toBe(56321);
    expect(normalizeSetting("accruedPensionAtLastAbs", 12444.4)).toBe(12444);
    expect(normalizeSetting("alphaPensionLeaveAge", 20)).toBe(20);
    expect(normalizeSetting("alphaPensionDrawAge", 60.5)).toBe(60.5);
    expect(normalizeSetting("alphaPensionDrawAge", 200)).toBe(70);
    expect(normalizeSippDrawAge(55, "1987-06-15")).toBe(57);
    expect(normalizeSippDrawAge(55, "1970-04-05")).toBe(55);
  });

  it("normalizes invalid dates back to defaults", () => {
    expect(normalizeSetting("startDate", "not-a-date")).toBe("2026-04-25");
    expect(normalizeSetting("dateOfBirth", "2026-02")).toBe("2026-02-01");
    expect(normalizeSetting("dateOfBirth", "2026-99-99")).toBe(
      defaultSettings.dateOfBirth
    );
    expect(normalizeSetting("dateOfBirth", "2026-02-31")).toBe(
      defaultSettings.dateOfBirth
    );
  });

  it("rejects impossible calendar dates during strict validation", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-31")).toBe(false);
    expect(isValidIsoDate("2025-02-29")).toBe(false);
  });

  it("resolves Alpha ABS years to 1 April", () => {
    expect(createAlphaAbsDateFromYear(2024)).toBe("2024-04-01");
    expect(resolveAlphaAbsDate("2024")).toBe("2024-04-01");
  });

  it("does not persist the calculation start date", () => {
    const settings: PensionSettings = {
      ...createDefaultSettings(),
      startDate: "2026-05-01",
      alphaAddedPensionMonthly: 233,
      alphaAddedPensionFactorType: "self_plus_beneficiaries",
      desiredRetirementIncome: 60600,
    };

    saveSettings(settings);

    expect(readStoredSettingsPayload()).toEqual(
      expectedStoredSettings({
        alphaAddedPensionMonthly: 233,
        alphaAddedPensionFactorType: "self_plus_beneficiaries",
        desiredRetirementIncome: 60600,
      })
    );
  });

  it("normalizes unexpected stored settings when loading", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        dateOfBirth: "bad-date",
        lifeExpectancy: 120,
        currentStatePension: -10,
        desiredRetirementIncome: 43899.6,
        applyPensionIncreases: true,
        assumedCpiPercent: 2.34,
        statePensionDrawDate: "bad-date",
        alphaPensionAbsDate: "bad-date",
        alphaAddedPensionMonthly: 233,
        alphaAddedPensionFactorType: "bad-value",
        alphaPensionLeaveAge: 10,
        accruedPensionAtLastAbs: 12444,
        pensionableEarnings: 56321,
        alphaPensionDrawAge: 200,
        alphaAddedPensionLumpSums: [
          {
            id: "legacy",
            amount: -50,
            startDate: "bad-date",
            cadence: "yearly",
            endDate: "2020-01-01",
          },
        ],
      })
    );

    expect(loadStoredSettings()).toEqual({
      startDate: "2026-04-25",
      dateOfBirth: defaultSettings.dateOfBirth,
      lifeExpectancy: 100,
      requirementAge: defaultSettings.requirementAge,
      normalPensionAge: calculateNormalPensionAge(defaultSettings.dateOfBirth),
      showAlpha: defaultSettings.showAlpha,
      projectionBasis: defaultSettings.projectionBasis,
      inflationRateAnnual: defaultSettings.inflationRateAnnual,
      showNuvos: defaultSettings.showNuvos,
      showStatePension: defaultSettings.showStatePension,
      showSipp: defaultSettings.showSipp,
      showIsa: defaultSettings.showIsa,
      showLisa: defaultSettings.showLisa,
      taxationEnabled: defaultSettings.taxationEnabled,
      partialRetirementEnabled: defaultSettings.partialRetirementEnabled,
      partialRetirementStartAge: defaultSettings.partialRetirementStartAge,
      partialRetirementWorkPercent:
        defaultSettings.partialRetirementWorkPercent,
      fullSalary: defaultSettings.fullSalary,
      currentStatePension: 0,
      desiredRetirementIncome: 43900,
      statePensionDrawDate: defaultSettings.statePensionDrawDate,
      statePensionApplyFutureGrowth:
        defaultSettings.statePensionApplyFutureGrowth,
      statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
      statePensionWageGrowthPercent:
        defaultSettings.statePensionWageGrowthPercent,
      applyPensionIncreases: true,
      assumedCpiPercent: 2.34,
      alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
      alphaAddedPensionMonthly: 233,
      alphaAddedPensionFactorType: defaultSettings.alphaAddedPensionFactorType,
      alphaPensionLeaveAge: 10,
      accruedPensionAtLastAbs: 12444,
      pensionableEarnings: 56321,
      alphaPayRisePercent: defaultSettings.alphaPayRisePercent,
      alphaPensionDrawAge: 70,
      alphaEpaEnabled: defaultSettings.alphaEpaEnabled,
      alphaEpaYearsBeforeNpa: defaultSettings.alphaEpaYearsBeforeNpa,
      alphaEpaStartDate: defaultSettings.alphaEpaStartDate,
      alphaEpaEndDate: defaultSettings.alphaEpaEndDate,
      alphaAddedPensionLumpSums: [
        {
          id: "legacy",
          amount: 0,
          startDate: getTodayIsoDate(),
          cadence: "yearly",
          endDate: "2020-01-01",
          factorType: "self",
        },
      ],
      nuvosPensionAbsDate: defaultSettings.nuvosPensionAbsDate,
      nuvosAccruedPensionAtLastAbs:
        defaultSettings.nuvosAccruedPensionAtLastAbs,
      nuvosPensionableEarnings: defaultSettings.nuvosPensionableEarnings,
      nuvosPensionLeaveAge: defaultSettings.nuvosPensionLeaveAge,
      nuvosPensionDrawAge: defaultSettings.nuvosPensionDrawAge,
      nuvosApplyPensionIncreases: defaultSettings.nuvosApplyPensionIncreases,
      nuvosAssumedCpiPercent: defaultSettings.nuvosAssumedCpiPercent,
      sippCurrentPot: defaultSettings.sippCurrentPot,
      sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
      sippDrawAge: defaultSettings.sippDrawAge,
      sippLumpSums: defaultSettings.sippLumpSums,
      sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
      sippTaxReliefRate: defaultSettings.sippTaxReliefRate,
      sippWithdrawalStrategy: defaultSettings.sippWithdrawalStrategy,
      sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
      sippWithdrawalTargetAge: defaultSettings.sippWithdrawalTargetAge,
      isaCurrentPot: defaultSettings.isaCurrentPot,
      isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
      isaDrawAge: defaultSettings.isaDrawAge,
      isaLumpSums: defaultSettings.isaLumpSums,
      isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
      isaWithdrawalStrategy: defaultSettings.isaWithdrawalStrategy,
      isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
      isaWithdrawalTargetAge: defaultSettings.isaWithdrawalTargetAge,
      lisaCurrentPot: defaultSettings.lisaCurrentPot,
      lisaMonthlyContribution: defaultSettings.lisaMonthlyContribution,
      lisaDrawAge: defaultSettings.lisaDrawAge,
      lisaLumpSums: defaultSettings.lisaLumpSums,
      lisaRealInterestPercent: defaultSettings.lisaRealInterestPercent,
      lisaWithdrawalStrategy: defaultSettings.lisaWithdrawalStrategy,
      lisaWithdrawalPercent: defaultSettings.lisaWithdrawalPercent,
      lisaWithdrawalTargetAge: defaultSettings.lisaWithdrawalTargetAge,
      taxPersonalAllowance: defaultSettings.taxPersonalAllowance,
      taxPersonalAllowanceTaperThreshold:
        defaultSettings.taxPersonalAllowanceTaperThreshold,
      taxBasicRateLimit: defaultSettings.taxBasicRateLimit,
      taxAdditionalRateThreshold: defaultSettings.taxAdditionalRateThreshold,
      taxBasicRatePercent: defaultSettings.taxBasicRatePercent,
      taxHigherRatePercent: defaultSettings.taxHigherRatePercent,
      taxAdditionalRatePercent: defaultSettings.taxAdditionalRatePercent,
      taxSippTaxFreeWithdrawalPercent:
        defaultSettings.taxSippTaxFreeWithdrawalPercent,
    });
  });

  it("falls back to defaults when stored JSON is invalid", () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, "{not-json");

    expect(loadStoredSettings()).toEqual(createDefaultSettings());
  });

  it("falls back to defaults when local storage cannot be read", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("Storage is unavailable.");
    });

    expect(loadStoredSettings()).toEqual(createDefaultSettings());
  });

  it("does not throw when local storage cannot be written", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage quota exceeded.");
    });

    expect(() => saveSettings(createDefaultSettings())).not.toThrow();
  });

  it("migrates legacy SIPP tax relief booleans to the new rate setting", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        sippApplyTaxRelief: true,
      })
    );

    expect(loadStoredSettings().sippTaxReliefRate).toBe("20");

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        sippApplyTaxRelief: false,
      })
    );

    expect(loadStoredSettings().sippTaxReliefRate).toBe("none");
  });

  it("persists a deferred State Pension draw date", () => {
    const settings: PensionSettings = {
      ...createDefaultSettings(),
      statePensionDrawDate: "2056-06-01",
    };

    saveSettings(settings);

    expect(readStoredSettingsPayload()).toEqual(
      expect.objectContaining({
        statePensionDrawDate: "2056-06-01",
      })
    );
    expect(loadStoredSettings().statePensionDrawDate).toBe("2056-06-01");
  });

  it("derives partial retirement contribution multipliers from the start age", () => {
    const ageBasedSettings: PensionSettings = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-15",
      partialRetirementEnabled: true,
      partialRetirementStartAge: 55,
      partialRetirementWorkPercent: 60,
    };

    expect(
      getPartialRetirementContributionMultiplier(ageBasedSettings, "2042-06-14")
    ).toBe(1);
    expect(
      getPartialRetirementContributionMultiplier(ageBasedSettings, "2042-06-15")
    ).toBe(0.6);
  });

  it("requires partial retirement to start before retirement", () => {
    const issues = validateSettings({
      ...defaultSettings,
      partialRetirementEnabled: true,
      partialRetirementStartAge: 60,
      requirementAge: 60,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "partialRetirementStartAge",
          message:
            "Partial retirement start age must be before the retirement start age.",
        }),
      ])
    );
  });

  it("requires retirement age to be on or before the Alpha draw age", () => {
    const issues = validateSettings({
      ...defaultSettings,
      requirementAge: 61,
      alphaPensionDrawAge: 60,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "requirementAge",
          message:
            "Retirement age must be on or before the Alpha pension draw age.",
        }),
      ])
    );
  });

  it("limits Alpha added pension purchases to supported factor ages", () => {
    expect(getLatestAlphaAddedPensionPurchaseDate("1987-06-15")).toBe(
      "2055-06-14"
    );
    expect(getLatestAlphaAddedPensionPurchaseDate("1987-06-01")).toBe(
      "2055-06-30"
    );

    const issues = validateSettings({
      ...defaultSettings,
      startDate: "2026-04-25",
      dateOfBirth: "1987-06-15",
      alphaAddedPensionMonthly: 150,
      alphaPensionDrawAge: 70,
      alphaPensionLeaveAge: 70,
      alphaAddedPensionLumpSums: [
        {
          id: "unsupported-age",
          amount: 5000,
          startDate: "2055-06-15",
          cadence: "once",
          endDate: "2055-06-15",
          factorType: "self",
        },
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "alphaAddedPensionMonthly",
          message:
            "Monthly added pension purchases must stop before age 68 because the factor table does not include age 68 or later.",
        }),
        expect.objectContaining({
          field: "alphaAddedPensionLumpSums",
          message:
            "Alpha lump sums must fall between the last Annual Benefits Statement and the supported added pension factor ages.",
        }),
      ])
    );
  });

  it("does not reject monthly added pension at age 68 when only birth month is known", () => {
    const issues = validateSettings({
      ...defaultSettings,
      dateOfBirth: "1987-06-01",
      alphaAddedPensionMonthly: 150,
      alphaPensionDrawAge: 68,
      alphaPensionLeaveAge: 68,
    });

    expect(issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "alphaAddedPensionMonthly",
        }),
      ])
    );
  });

  it("reports relational validation issues for inconsistent pension settings", () => {
    const issues = validateSettings({
      ...defaultSettings,
      startDate: "2076-01-01",
      statePensionDrawDate: "2050-01-01",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "startDate" }),
        expect.objectContaining({
          field: "statePensionDrawDate",
          message:
            "State Pension start date cannot be before State Pension age.",
        }),
      ])
    );
  });

  it("reports when date of birth is not before the calculation start date", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      startDate: "2026-05-01",
      dateOfBirth: "2026-05-01",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "dateOfBirth",
          message: "Date of birth must be before the calculation start date.",
        }),
      ])
    );
  });

  it("reports active draw dates that fall outside life expectancy", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-15",
      lifeExpectancy: 60,
      alphaPensionDrawAge: 70,
      sippDrawAge: 70,
      isaDrawAge: 70,
      showStatePension: true,
      showSipp: true,
      showIsa: true,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "alphaPensionDrawAge" }),
        expect.objectContaining({ field: "lifeExpectancy" }),
        expect.objectContaining({ field: "sippDrawAge" }),
        expect.objectContaining({ field: "isaDrawAge" }),
      ])
    );
  });

  it("reports future Annual Benefit Statement years", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      startDate: "2026-03-31",
      alphaPensionAbsDate: "2026",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "alphaPensionAbsDate",
          message:
            "Last Annual Benefits Statement must be on or before the calculation start date.",
        }),
      ])
    );
  });

  it("reports EPA dates that do not overlap the Alpha accrual period", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      alphaEpaEnabled: true,
      alphaPensionLeaveAge: 60,
      alphaPensionDrawAge: 60,
      alphaEpaStartDate: "2050-04-01",
      alphaEpaEndDate: "2051-03-31",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "alphaEpaStartDate",
          message: "EPA dates must overlap the Alpha accrual period.",
        }),
      ])
    );
  });

  it("reports SIPP and ISA draw dates that have already passed", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      dateOfBirth: "1960-01-01",
      startDate: "2026-05-01",
      sippDrawAge: 55,
      isaDrawAge: 55,
      showSipp: true,
      showIsa: true,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "sippDrawAge",
          message:
            "SIPP draw start age must be after the calculation start date.",
        }),
        expect.objectContaining({
          field: "isaDrawAge",
          message:
            "ISA draw start age must be after the calculation start date.",
        }),
      ])
    );
  });

  it("reports SIPP draw ages that would only be reachable before the 2028 rule change", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      dateOfBirth: "1977-11-23",
      sippDrawAge: 56,
      showSipp: true,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "sippDrawAge",
          message:
            "SIPP draw start age must be at least 57 for access dates on or after 6 April 2028.",
        }),
      ])
    );
  });

  it("reports lump sum schedules outside their valid contribution windows", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      requirementAge: 60,
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 60,
      alphaAddedPensionLumpSums: [
        {
          id: "alpha-lump",
          amount: 5000,
          startDate: "2048-01-01",
          cadence: "once",
          endDate: "2048-01-01",
        },
      ],
      sippLumpSums: [
        {
          id: "sipp-lump",
          amount: 5000,
          startDate: "2030-01-01",
          cadence: "yearly",
          endDate: "2029-01-01",
        },
      ],
      isaLumpSums: [
        {
          id: "isa-lump",
          amount: 5000,
          startDate: "2050-01-01",
          cadence: "once",
          endDate: "2050-01-01",
        },
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "alphaAddedPensionLumpSums",
          itemId: "alpha-lump",
          message:
            "Alpha lump sums must be scheduled on or before Alpha pensionable service stops.",
        }),
        expect.objectContaining({
          field: "sippLumpSums",
          itemId: "sipp-lump",
          message:
            "SIPP lump sum repeat-until date must be on or after its start date.",
        }),
        expect.objectContaining({
          field: "isaLumpSums",
          itemId: "isa-lump",
          message:
            "ISA lump sums must fall between the calculation start date and the earlier of retirement age and ISA draw start.",
        }),
      ])
    );
  });

  it("reports SIPP and ISA lump sums scheduled after retirement age", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      startDate: "2026-01-01",
      dateOfBirth: "1986-01-01",
      requirementAge: 41,
      sippDrawAge: 57,
      sippLumpSums: [
        {
          id: "sipp-after-retirement",
          amount: 5000,
          startDate: "2027-06-01",
          cadence: "once",
          endDate: "2027-06-01",
        },
      ],
      isaDrawAge: 45,
      isaLumpSums: [
        {
          id: "isa-after-retirement",
          amount: 5000,
          startDate: "2027-06-01",
          cadence: "once",
          endDate: "2027-06-01",
        },
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "sippLumpSums",
          itemId: "sipp-after-retirement",
          message:
            "SIPP lump sums must fall between the calculation start date and the earlier of retirement age and SIPP draw start.",
        }),
        expect.objectContaining({
          field: "isaLumpSums",
          itemId: "isa-after-retirement",
          message:
            "ISA lump sums must fall between the calculation start date and the earlier of retirement age and ISA draw start.",
        }),
      ])
    );
  });

  it("reports recurring Alpha added pension lump sums that continue after Alpha service stops", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-15",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 55,
      alphaAddedPensionLumpSums: [
        {
          id: "alpha-recurring-after-leave",
          amount: 5000,
          startDate: "2040-01-01",
          cadence: "yearly",
          endDate: "2043-01-01",
        },
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "alphaAddedPensionLumpSums",
          itemId: "alpha-recurring-after-leave",
          message:
            "Alpha lump sums must be scheduled on or before Alpha pensionable service stops.",
        }),
      ])
    );
  });

  it("normalizes legacy Alpha ABS dates to just the year", () => {
    expect(normalizeSetting("alphaPensionAbsDate", "2024-04-01")).toBe("2024");
  });

  it("derives State Pension age from date of birth under the current UK timetable", () => {
    expect(calculateNormalPensionAge("1954-09-06")).toBe(66);
    expect(calculateNormalPensionAge("1960-04-06")).toBeCloseTo(66 + 1 / 12, 6);
    expect(calculateNormalPensionAge("1960-12-31")).toBeCloseTo(66 + 9 / 12, 6);
    expect(calculateNormalPensionAge("1977-04-06")).toBeCloseTo(67 + 1 / 12, 6);
    expect(calculateNormalPensionAge("1977-11-23")).toBeCloseTo(67 + 8 / 12, 6);
    expect(calculateNormalPensionAge("1978-04-06")).toBe(68);
    expect(calculateNormalPensionAge("1987-06-15")).toBe(68);
    expect(calculateStatePensionDrawDate("1954-09-06")).toBe("2020-09-06");
    expect(calculateStatePensionDrawDate("1954-10-06")).toBe("2020-10-06");
    expect(calculateStatePensionDrawDate("1960-04-06")).toBe("2026-05-06");
    expect(calculateStatePensionDrawDate("1960-12-31")).toBe("2027-09-30");
    expect(calculateStatePensionDrawDate("1961-03-06")).toBe("2028-03-06");
    expect(calculateStatePensionDrawDate("1977-04-06")).toBe("2044-05-06");
    expect(calculateStatePensionDrawDate("1977-11-23")).toBe("2045-07-06");
    expect(calculateStatePensionDrawDate("1978-03-06")).toBe("2046-03-06");
    expect(calculateStatePensionDrawDate("1978-04-06")).toBe("2046-04-06");
    expect(calculateStatePensionDrawDate("1987-06-15")).toBe("2055-06-15");
    expect(calculateDateAge("1977-11-23", "2045-07-06")).toBeCloseTo(67.62, 2);
    expect(calculateMinimumStatePensionDrawAge("1977-11-23")).toBe(67.75);
    expect(calculateStatePensionDrawAge("1977-11-23", "2045-07-06")).toBe(
      67.75
    );
    expect(calculateStatePensionDrawDateFromAge("1977-11-23", 67.75)).toBe(
      "2045-08-23"
    );
  });

  it("derives the earliest Alpha and SIPP access ages from the 2028 minimum pension age change", () => {
    expect(calculateMinimumPensionAccessAge("1971-04-05")).toBe(55);
    expect(calculateMinimumPensionAccessAge("1973-04-05")).toBe(55);
    expect(calculateMinimumPensionAccessAge("1973-04-06")).toBe(57);
    expect(calculateMinimumPensionAccessAge("1977-11-23")).toBe(57);
    expect(calculateMinimumSippAccessAge("1971-04-05")).toBe(55);
    expect(calculateMinimumSippAccessAge("1973-04-05")).toBe(55);
    expect(calculateMinimumSippAccessAge("1973-04-06")).toBe(57);
    expect(calculateMinimumSippAccessAge("1977-11-23")).toBe(57);
  });

  it("normalizes Alpha draw ages that would fall after the 2028 rule change but before age 57", () => {
    expect(normalizeAlphaPensionDrawAge(55, "1977-11-23")).toBe(57);
    expect(normalizeAlphaPensionDrawAge(56, "1972-08-01")).toBe(57);
    expect(normalizeAlphaPensionDrawAge(55, "1972-08-01")).toBe(55);
  });

  it("normalizes SIPP draw ages that would fall after the 2028 rule change but before age 57", () => {
    expect(normalizeSippDrawAge(55, "1977-11-23")).toBe(57);
    expect(normalizeSippDrawAge(56, "1972-08-01")).toBe(57);
    expect(normalizeSippDrawAge(55, "1972-08-01")).toBe(55);
  });

  it("derives SIPP access age from date of birth and Normal Pension Age", () => {
    expect(calculateMinimumSippAccessAge("1970-04-05")).toBe(55);
    expect(calculateMinimumSippAccessAge("1973-04-06")).toBe(57);
    expect(calculateMinimumSippAccessAge("1987-06-15")).toBe(57);
  });

  it("allows State Pension deferral dates but clamps them to State Pension age", () => {
    expect(normalizeStatePensionDrawDate("2056-06-15", "1987-06-15")).toBe(
      "2056-06-15"
    );
    expect(normalizeStatePensionDrawDate("2050-06-15", "1987-06-15")).toBe(
      "2055-06-15"
    );
    expect(normalizeStatePensionDrawDate("bad-date", "1987-06-15")).toBe(
      "2055-06-15"
    );
    expect(normalizeStatePensionDrawDate("2045-07-06", "1977-11-23")).toBe(
      "2045-08-23"
    );
  });

  it("normalizes lump sum added pension schedules", () => {
    expect(
      normalizeSetting("alphaAddedPensionLumpSums", [
        {
          id: "one-off",
          amount: 1234.56,
          startDate: "bad-date",
          cadence: "once",
          endDate: "2030-06-15",
          factorType: "self_plus_beneficiaries",
        },
      ])
    ).toEqual([
      {
        id: "one-off",
        amount: 1235,
        startDate: getTodayIsoDate(),
        cadence: "once",
        endDate: getTodayIsoDate(),
        factorType: "self_plus_beneficiaries",
      },
    ]);
  });
});
