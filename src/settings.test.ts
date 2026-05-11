import {
  SETTINGS_STORAGE_KEY,
  calculateNormalPensionAge,
  calculateStatePensionDrawDate,
  createAlphaAbsDateFromYear,
  createDefaultSettings,
  defaultSettings,
  getTodayIsoDate,
  isValidIsoDate,
  loadStoredSettings,
  normalizeSetting,
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
    showStatePension: defaultSettings.showStatePension,
    showSipp: defaultSettings.showSipp,
    showIsa: defaultSettings.showIsa,
    currentStatePension: defaultSettings.currentStatePension,
    desiredRetirementIncome: defaultSettings.desiredRetirementIncome,
    statePensionDrawDate: defaultSettings.statePensionDrawDate,
    statePensionApplyFutureGrowth: defaultSettings.statePensionApplyFutureGrowth,
    statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
    statePensionWageGrowthPercent: defaultSettings.statePensionWageGrowthPercent,
    applyPensionIncreases: defaultSettings.applyPensionIncreases,
    assumedCpiPercent: defaultSettings.assumedCpiPercent,
    alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
    alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
    alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
    accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
    pensionableEarnings: defaultSettings.pensionableEarnings,
    alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
    alphaEpaEnabled: defaultSettings.alphaEpaEnabled,
    alphaEpaYearsBeforeNpa: defaultSettings.alphaEpaYearsBeforeNpa,
    alphaEpaStartDate: defaultSettings.alphaEpaStartDate,
    alphaEpaEndDate: defaultSettings.alphaEpaEndDate,
    alphaAddedPensionLumpSums: [],
    sippCurrentPot: defaultSettings.sippCurrentPot,
    sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
    sippDrawAge: defaultSettings.sippDrawAge,
    sippLumpSums: defaultSettings.sippLumpSums,
    sippApplyRealInterest: defaultSettings.sippApplyRealInterest,
    sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
    sippTaxReliefRate: defaultSettings.sippTaxReliefRate,
    sippWithdrawalStrategy: defaultSettings.sippWithdrawalStrategy,
    sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
    isaCurrentPot: defaultSettings.isaCurrentPot,
    isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
    isaDrawAge: defaultSettings.isaDrawAge,
    isaLumpSums: defaultSettings.isaLumpSums,
    isaApplyRealInterest: defaultSettings.isaApplyRealInterest,
    isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
    isaWithdrawalStrategy: defaultSettings.isaWithdrawalStrategy,
    isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
    ...overrides,
  };
}

describe("settings unit tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00Z"));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses today for the default calculation start date", () => {
    expect(getTodayIsoDate()).toBe("2026-04-25");
    expect(createDefaultSettings().startDate).toBe("2026-04-25");
  });

  it("normalizes numeric settings to allowed ranges and whole-number steps", () => {
    expect(normalizeSetting("lifeExpectancy", 120)).toBe(100);
    expect(normalizeSetting("currentStatePension", -10)).toBe(0);
    expect(normalizeSetting("currentStatePension", 12547.6)).toBe(12547.6);
    expect(normalizeSetting("desiredRetirementIncome", 250000)).toBe(200000);
    expect(normalizeSetting("desiredRetirementIncome", 43899.6)).toBe(43900);
    expect(normalizeSetting("statePensionCpiPercent", 2.34)).toBe(2.34);
    expect(normalizeSetting("statePensionWageGrowthPercent", 11)).toBe(10);
    expect(normalizeSetting("assumedCpiPercent", 2.34)).toBe(2.34);
    expect(normalizeSetting("assumedCpiPercent", 11)).toBe(10);
    expect(normalizeSetting("alphaAddedPensionMonthly", 233)).toBe(233);
    expect(normalizeSetting("pensionableEarnings", 56321)).toBe(56321);
    expect(normalizeSetting("accruedPensionAtLastAbs", 12444.4)).toBe(12444);
    expect(normalizeSetting("alphaPensionLeaveAge", 20)).toBe(40);
    expect(normalizeSetting("alphaPensionDrawAge", 200)).toBe(70);
  });

  it("normalizes invalid dates back to defaults", () => {
    expect(normalizeSetting("startDate", "not-a-date")).toBe("2026-04-25");
    expect(normalizeSetting("dateOfBirth", "2026-99-99")).toBe(defaultSettings.dateOfBirth);
    expect(normalizeSetting("dateOfBirth", "2026-02-31")).toBe(defaultSettings.dateOfBirth);
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
      desiredRetirementIncome: 60600,
    };

    saveSettings(settings);

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expectedStoredSettings({
        alphaAddedPensionMonthly: 233,
        desiredRetirementIncome: 60600,
      }),
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
      }),
    );

    expect(loadStoredSettings()).toEqual({
      startDate: "2026-04-25",
      dateOfBirth: defaultSettings.dateOfBirth,
      lifeExpectancy: 100,
      normalPensionAge: calculateNormalPensionAge(defaultSettings.dateOfBirth),
      showStatePension: defaultSettings.showStatePension,
      showSipp: defaultSettings.showSipp,
      showIsa: defaultSettings.showIsa,
      currentStatePension: 0,
      desiredRetirementIncome: 43900,
      statePensionDrawDate: defaultSettings.statePensionDrawDate,
      statePensionApplyFutureGrowth: defaultSettings.statePensionApplyFutureGrowth,
      statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
      statePensionWageGrowthPercent: defaultSettings.statePensionWageGrowthPercent,
      applyPensionIncreases: true,
      assumedCpiPercent: 2.34,
      alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
      alphaAddedPensionMonthly: 233,
      alphaPensionLeaveAge: 40,
      accruedPensionAtLastAbs: 12444,
      pensionableEarnings: 56321,
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
        },
      ],
      sippCurrentPot: defaultSettings.sippCurrentPot,
      sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
      sippDrawAge: defaultSettings.sippDrawAge,
      sippLumpSums: defaultSettings.sippLumpSums,
      sippApplyRealInterest: defaultSettings.sippApplyRealInterest,
      sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
      sippTaxReliefRate: defaultSettings.sippTaxReliefRate,
      sippWithdrawalStrategy: defaultSettings.sippWithdrawalStrategy,
      sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
      isaCurrentPot: defaultSettings.isaCurrentPot,
      isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
      isaDrawAge: defaultSettings.isaDrawAge,
      isaLumpSums: defaultSettings.isaLumpSums,
      isaApplyRealInterest: defaultSettings.isaApplyRealInterest,
      isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
      isaWithdrawalStrategy: defaultSettings.isaWithdrawalStrategy,
      isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
    });
  });

  it("falls back to defaults when stored JSON is invalid", () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, "{not-json");

    expect(loadStoredSettings()).toEqual(createDefaultSettings());
  });

  it("migrates legacy SIPP tax relief booleans to the new rate setting", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        sippApplyTaxRelief: true,
      }),
    );

    expect(loadStoredSettings().sippTaxReliefRate).toBe("20");

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        sippApplyTaxRelief: false,
      }),
    );

    expect(loadStoredSettings().sippTaxReliefRate).toBe("none");
  });

  it("persists a deferred State Pension draw date", () => {
    const settings: PensionSettings = {
      ...createDefaultSettings(),
      statePensionDrawDate: "2056-06-15",
    };

    saveSettings(settings);

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        statePensionDrawDate: "2056-06-15",
      }),
    );
    expect(loadStoredSettings().statePensionDrawDate).toBe("2056-06-15");
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
          message: "State Pension start date cannot be before State Pension age.",
        }),
      ]),
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
      ]),
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
      ]),
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
      ]),
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
      ]),
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
          message: "SIPP draw start age must be after the calculation start date.",
        }),
        expect.objectContaining({
          field: "isaDrawAge",
          message: "ISA draw start age must be after the calculation start date.",
        }),
      ]),
    );
  });

  it("reports lump sum schedules outside their valid contribution windows", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
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
            "Alpha lump sums must fall between the last Annual Benefits Statement and the end of Alpha accrual.",
        }),
        expect.objectContaining({
          field: "sippLumpSums",
          itemId: "sipp-lump",
          message: "SIPP lump sum repeat-until date must be on or after its start date.",
        }),
        expect.objectContaining({
          field: "isaLumpSums",
          itemId: "isa-lump",
          message:
            "ISA lump sums must fall between the calculation start date and ISA draw start.",
        }),
      ]),
    );
  });

  it("normalizes legacy Alpha ABS dates to just the year", () => {
    expect(normalizeSetting("alphaPensionAbsDate", "2024-04-01")).toBe("2024");
  });

  it("derives State Pension age from date of birth under the current UK timetable", () => {
    expect(calculateNormalPensionAge("1954-09-06")).toBe(66);
    expect(calculateNormalPensionAge("1960-04-06")).toBe(66);
    expect(calculateNormalPensionAge("1977-04-06")).toBe(67);
    expect(calculateNormalPensionAge("1977-04-10")).toBe(67);
    expect(calculateNormalPensionAge("1978-04-06")).toBe(68);
    expect(calculateNormalPensionAge("1987-06-15")).toBe(68);
    expect(calculateStatePensionDrawDate("1954-09-06")).toBe("2020-09-06");
    expect(calculateStatePensionDrawDate("1954-10-06")).toBe("2020-10-06");
    expect(calculateStatePensionDrawDate("1960-04-06")).toBe("2026-05-06");
    expect(calculateStatePensionDrawDate("1960-12-31")).toBe("2027-09-30");
    expect(calculateStatePensionDrawDate("1961-03-06")).toBe("2028-03-06");
    expect(calculateStatePensionDrawDate("1977-04-06")).toBe("2044-05-06");
    expect(calculateStatePensionDrawDate("1977-04-10")).toBe("2044-05-06");
    expect(calculateStatePensionDrawDate("1978-03-06")).toBe("2046-03-06");
    expect(calculateStatePensionDrawDate("1978-04-06")).toBe("2046-04-06");
    expect(calculateStatePensionDrawDate("1987-06-15")).toBe("2055-06-15");
  });

  it("allows State Pension deferral dates but clamps them to State Pension age", () => {
    expect(normalizeStatePensionDrawDate("2056-06-15", "1987-06-15")).toBe(
      "2056-06-15",
    );
    expect(normalizeStatePensionDrawDate("2050-06-15", "1987-06-15")).toBe(
      "2055-06-15",
    );
    expect(normalizeStatePensionDrawDate("bad-date", "1987-06-15")).toBe(
      "2055-06-15",
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
        },
      ]),
    ).toEqual([
      {
        id: "one-off",
        amount: 1235,
        startDate: getTodayIsoDate(),
        cadence: "once",
        endDate: getTodayIsoDate(),
      },
    ]);
  });
});
