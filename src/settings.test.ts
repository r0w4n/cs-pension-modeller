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
    sippApplyTaxRelief: defaultSettings.sippApplyTaxRelief,
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
    };

    saveSettings(settings);

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expectedStoredSettings({
        alphaAddedPensionMonthly: 233,
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
          endDate: getTodayIsoDate(),
        },
      ],
      sippCurrentPot: defaultSettings.sippCurrentPot,
      sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
      sippDrawAge: defaultSettings.sippDrawAge,
      sippLumpSums: defaultSettings.sippLumpSums,
      sippApplyRealInterest: defaultSettings.sippApplyRealInterest,
      sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
      sippApplyTaxRelief: defaultSettings.sippApplyTaxRelief,
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

  it("reports relational validation issues for inconsistent pension settings", () => {
    const issues = validateSettings({
      ...defaultSettings,
      startDate: "2076-01-01",
      alphaPensionDrawAge: 70,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "startDate" }),
        expect.objectContaining({ field: "statePensionDrawDate" }),
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
