import {
  addMonths,
  addYears,
  buildMilestoneMap,
  calculateAccruedAlphaPension,
  calculateAge,
  calculateAlphaPensionRevaluationFactor,
  calculateAnnualStatePensionAtDraw,
  calculateAnnualStatePensionAtDate,
  calculateAnnualAlphaPensionIncludingReduction,
  calculateLumpSumAddedPension,
  calculateMonthlyAddedPension,
  calculateMonthlyAlphaAccrual,
  calculateMonthlyAlphaPensionTakeHome,
  calculateMonthlySippPension,
  calculateStartingAlphaPensionAtStartDate,
  calculateWholeMonthDifference,
  calculateMonthlyStatePension,
  calculateSippPotAtDate,
  calculateStatePensionDeferralIncreasePercent,
  calculateTotalGrossMonthlyPension,
  createProjectionTable,
  deriveProjectionInputs,
  generatePensionSummary,
  generateMonthlyDateRange,
  generateMilestoneDefinitions,
  getAddedPensionFactorForAge,
  getEarlyRetirementReductionFactor,
  getLifeExpectancyDate,
} from "./projection";
import {
  defaultSettings,
  resolveAlphaAbsDate,
  type PensionSettings,
} from "./settings";

function findRowByDate(rows: ReturnType<typeof createProjectionTable>, date: string) {
  return rows.find((row) => row.date === date);
}

describe("projection calculations", () => {
  it("ends the table on the birthday at the selected life expectancy age", () => {
    expect(getLifeExpectancyDate("1987-06-15", 88)).toBe("2075-06-15");
  });

  it("generates one row per month including the start and end dates", () => {
    expect(generateMonthlyDateRange("2026-01-15", "2026-04-15")).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
      "2026-04-15",
    ]);
  });

  it("includes the end date even when the monthly cadence would otherwise skip that month", () => {
    expect(generateMonthlyDateRange("2026-01-28", "2026-04-15")).toEqual([
      "2026-01-28",
      "2026-02-28",
      "2026-03-28",
      "2026-04-15",
    ]);
  });

  it("preserves month-end semantics across shorter months and leap years", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
  });

  it("calculates age in whole years before and after the birthday", () => {
    expect(calculateAge("1987-06-15", "2026-06-14")).toBe(38);
    expect(calculateAge("1987-06-15", "2026-06-15")).toBe(39);
  });

  it("calculates monthly alpha accrual at 2.32 percent divided by 12", () => {
    expect(calculateMonthlyAlphaAccrual(42000)).toBeCloseTo(81.2, 6);
  });

  it("uses whole-month differences and ignores days", () => {
    expect(calculateWholeMonthDifference("2025-04-01", "2025-04-30")).toBe(0);
    expect(calculateWholeMonthDifference("2025-04-01", "2025-05-31")).toBe(1);
    expect(calculateWholeMonthDifference("2025-04-01", "2025-12-15")).toBe(8);
  });

  it("calculates accrued alpha pension cumulatively", () => {
    expect(calculateAccruedAlphaPension(8250, 243.6)).toBeCloseTo(8493.6, 6);
  });

  it("revalues Alpha benefits by CPI plus 1.6 percent while active and CPI after leaving", () => {
    expect(
      calculateAlphaPensionRevaluationFactor({
        fromDate: "2025-04-01",
        rowDate: "2028-04-01",
        activeUntilDate: "2026-04-01",
        cpiPercent: 2,
      }),
    ).toBeCloseTo(1.036 * 1.02 * 1.02, 6);
  });

  it("returns no additional accrual when start date matches the ABS date", () => {
    expect(
      calculateStartingAlphaPensionAtStartDate({
        alphaPensionAccruedAtLastStatement: 8250,
        alphaPensionAbsDate: "2025-04-01",
        startDate: "2025-04-01",
        pensionableEarnings: 42000,
      }),
    ).toBeCloseTo(8250, 6);
  });

  it("adds one month of annual accrual when start date is one month after the ABS date", () => {
    expect(
      calculateStartingAlphaPensionAtStartDate({
        alphaPensionAccruedAtLastStatement: 8250,
        alphaPensionAbsDate: "2025-04-01",
        startDate: "2025-05-01",
        pensionableEarnings: 42000,
      }),
    ).toBeCloseTo(8331.2, 6);
  });

  it("adds eight months of annual accrual when start date is eight months after the ABS date", () => {
    expect(
      calculateStartingAlphaPensionAtStartDate({
        alphaPensionAccruedAtLastStatement: 8250,
        alphaPensionAbsDate: "2025-04-01",
        startDate: "2025-12-01",
        pensionableEarnings: 42000,
      }),
    ).toBeCloseTo(8899.6, 6);
  });

  it("adds a full year of accrual when start date is twelve months after the ABS date", () => {
    expect(
      calculateStartingAlphaPensionAtStartDate({
        alphaPensionAccruedAtLastStatement: 8250,
        alphaPensionAbsDate: "2025-04-01",
        startDate: "2026-04-01",
        pensionableEarnings: 42000,
      }),
    ).toBeCloseTo(9224.4, 6);
  });

  it("does not produce negative accrual when start date is before the ABS date", () => {
    expect(
      calculateStartingAlphaPensionAtStartDate({
        alphaPensionAccruedAtLastStatement: 8250,
        alphaPensionAbsDate: "2025-04-01",
        startDate: "2025-03-01",
        pensionableEarnings: 42000,
      }),
    ).toBeCloseTo(8250, 6);
  });

  it("uses the 2.32 percent accrual rate when deriving the starting Alpha pension", () => {
    expect(
      calculateStartingAlphaPensionAtStartDate({
        alphaPensionAccruedAtLastStatement: 0,
        alphaPensionAbsDate: "2025-04-01",
        startDate: "2026-04-01",
        pensionableEarnings: 100000,
      }),
    ).toBeCloseTo(2320, 6);
  });

  it("loads the added pension factor from JSON", () => {
    expect(getAddedPensionFactorForAge(60)).toBe(12.82);
  });

  it("handles blank added pension factors safely", () => {
    expect(getAddedPensionFactorForAge(68)).toBe(0);
    expect(
      calculateMonthlyAddedPension({
        rowDate: "2055-06-15",
        stopDate: "2055-06-15",
        dateOfBirth: "1987-06-15",
        addedPensionMonthlyContribution: 150,
      }),
    ).toBe(0);
  });

  it("calculates monthly added pension while the added pension stop date has not passed", () => {
    expect(
      calculateMonthlyAddedPension({
        rowDate: "2047-06-15",
        stopDate: "2047-06-15",
        dateOfBirth: "1987-06-15",
        addedPensionMonthlyContribution: 150,
      }),
    ).toBeCloseTo(11.7004680187, 6);
  });

  it("carries regular monthly added pension purchases into accrued Alpha pension", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-04-01",
      dateOfBirth: "1987-04-01",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 60,
      lifeExpectancy: 61,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      accruedPensionAtLastAbs: 0,
      alphaPensionAbsDate: "2047",
      pensionableEarnings: 0,
      alphaAddedPensionMonthly: 128.2,
    };

    const rows = createProjectionTable(settings);

    expect(findRowByDate(rows, "2047-04-01")?.monthlyAddedPension).toBeCloseTo(10, 6);
    expect(findRowByDate(rows, "2047-04-01")?.annualAccruedAlphaPension).toBeCloseTo(
      10,
      6,
    );
    expect(findRowByDate(rows, "2047-05-01")?.monthlyAddedPension).toBe(0);
    expect(findRowByDate(rows, "2047-05-01")?.annualAccruedAlphaPension).toBeCloseTo(
      10,
      6,
    );
  });

  it("revalues regular monthly added pension purchases when pension increases are enabled", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      applyPensionIncreases: true,
      assumedCpiPercent: 2,
      startDate: "2047-04-01",
      dateOfBirth: "1987-04-01",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 60,
      lifeExpectancy: 61,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      accruedPensionAtLastAbs: 0,
      alphaPensionAbsDate: "2047",
      pensionableEarnings: 0,
      alphaAddedPensionMonthly: 128.2,
    };

    const rows = createProjectionTable(settings);

    expect(findRowByDate(rows, "2047-04-01")?.annualAccruedAlphaPension).toBeCloseTo(
      10,
      6,
    );
    expect(findRowByDate(rows, "2048-04-01")?.annualAccruedAlphaPension).toBeCloseTo(
      10.2,
      6,
    );
  });

  it("calculates a one-off lump sum added pension purchase on its payment date", () => {
    expect(
      calculateLumpSumAddedPension({
        rowDate: "2047-06-15",
        dateOfBirth: "1987-06-15",
        lumpSums: [
          {
            id: "one-off",
            amount: 12820,
            startDate: "2047-06-15",
            cadence: "once",
            endDate: "2047-06-15",
          },
        ],
      }),
    ).toBeCloseTo(1000, 6);
  });

  it("applies a lump sum on the first projection row after its payment date", () => {
    expect(
      calculateLumpSumAddedPension({
        previousRowDate: "2047-06-15",
        rowDate: "2047-07-15",
        dateOfBirth: "1987-06-15",
        lumpSums: [
          {
            id: "between-rows",
            amount: 12820,
            startDate: "2047-06-20",
            cadence: "once",
            endDate: "2047-06-20",
          },
        ],
      }),
    ).toBeCloseTo(1000, 6);
  });

  it("calculates yearly recurring lump sum added pension purchases", () => {
    expect(
      calculateLumpSumAddedPension({
        previousRowDate: "2048-06-15",
        rowDate: "2049-06-15",
        dateOfBirth: "1987-06-15",
        lumpSums: [
          {
            id: "yearly",
            amount: 12820,
            startDate: "2047-06-15",
            cadence: "yearly",
            endDate: "2049-06-15",
          },
        ],
      }),
    ).toBeCloseTo(12820 / getAddedPensionFactorForAge(62), 6);
  });

  it("loads early retirement reduction factors from JSON", () => {
    expect(getEarlyRetirementReductionFactor(68, 60)).toBe(0.648);
  });

  it("applies early retirement reduction when draw date is on or before NPA", () => {
    expect(
      calculateAnnualAlphaPensionIncludingReduction(
        12000,
        "2047-06-15",
        "2055-06-15",
        0.648,
      ),
    ).toBeCloseTo(7776, 6);
  });

  it("does not reduce alpha pension when draw date is after NPA", () => {
    expect(
      calculateAnnualAlphaPensionIncludingReduction(
        12000,
        "2056-06-15",
        "2055-06-15",
        0.648,
      ),
    ).toBe(12000);
  });

  it("returns zero monthly alpha take-home before draw date and annual divided by 12 afterwards", () => {
    expect(calculateMonthlyAlphaPensionTakeHome("2047-06-14", "2047-06-15", 12000)).toBe(0);
    expect(calculateMonthlyAlphaPensionTakeHome("2047-06-15", "2047-06-15", 12000)).toBe(1000);
  });

  it("starts state pension from the configured state pension date", () => {
    expect(calculateMonthlyStatePension("2055-06-14", "2055-06-15", 11500)).toBe(0);
    expect(calculateMonthlyStatePension("2055-06-15", "2055-06-15", 11500)).toBeCloseTo(
      958.333333,
      6,
    );
  });

  it("projects State Pension future growth using the highest triple-lock input", () => {
    expect(
      calculateAnnualStatePensionAtDraw({
        ...defaultSettings,
        startDate: "2026-01-01",
        statePensionDrawDate: "2028-01-01",
        currentStatePension: 10000,
        statePensionApplyFutureGrowth: true,
        statePensionCpiPercent: 3,
        statePensionWageGrowthPercent: 4,
      }),
    ).toBeCloseTo(10816, 6);
    expect(
      calculateAnnualStatePensionAtDraw({
        ...defaultSettings,
        startDate: "2026-01-01",
        statePensionDrawDate: "2028-01-01",
        currentStatePension: 10000,
        statePensionApplyFutureGrowth: false,
        statePensionCpiPercent: 10,
        statePensionWageGrowthPercent: 10,
      }),
    ).toBe(10000);
  });

  it("adds the new State Pension deferral uplift from the selected draw date", () => {
    expect(
      calculateStatePensionDeferralIncreasePercent("1987-06-15", "2055-08-17"),
    ).toBeCloseTo(1, 6);
    expect(
      calculateStatePensionDeferralIncreasePercent("1987-06-15", "2056-06-14"),
    ).toBeCloseTo(52 / 9, 6);
    expect(
      calculateAnnualStatePensionAtDraw({
        ...defaultSettings,
        dateOfBirth: "1987-06-15",
        statePensionDrawDate: "2056-06-14",
        currentStatePension: 12000,
        statePensionApplyFutureGrowth: false,
      }),
    ).toBeCloseTo(12693.333333, 6);
  });

  it("continues to uprate State Pension after draw while deferred extra grows by CPI", () => {
    const settings = {
      ...defaultSettings,
      startDate: "2026-01-01",
      dateOfBirth: "1987-06-15",
      statePensionDrawDate: "2056-06-14",
      currentStatePension: 10000,
      statePensionApplyFutureGrowth: true,
      statePensionCpiPercent: 3,
      statePensionWageGrowthPercent: 4,
    };

    const baseAtDraw = 10000 * 1.04 ** 30;
    const deferredExtraAtDraw = baseAtDraw * ((52 / 9) / 100);
    const baseAtRow = 10000 * 1.04 ** 32;
    const deferredExtraAtRow = deferredExtraAtDraw * 1.03 ** 2;

    expect(calculateAnnualStatePensionAtDate(settings, "2058-06-14")).toBeCloseTo(
      baseAtRow + deferredExtraAtRow,
      6,
    );
  });

  it("derives projection inputs from valid settings", () => {
    expect(deriveProjectionInputs(defaultSettings)).toMatchObject({
      endDate: "2075-06-15",
      drawDate: "2047-06-15",
      alphaStopDate: "2047-06-15",
      accrualStopDate: "2047-06-15",
      addedPensionStopDate: "2047-06-15",
      npaDate: "2055-06-15",
      reductionFactor: 0.648,
    });
  });

  it("refuses to derive projection inputs when settings fail validation", () => {
    expect(
      deriveProjectionInputs({
        ...defaultSettings,
        startDate: "2076-01-01",
      }),
    ).toBeNull();
  });

  it("adds monthly alpha and state pension into gross monthly pension", () => {
    expect(calculateTotalGrossMonthlyPension(648, 958.33)).toBeCloseTo(1606.33, 6);
  });

  it("adds SIPP monthly pension into gross monthly pension", () => {
    expect(calculateTotalGrossMonthlyPension(648, 958.33, 250)).toBeCloseTo(
      1856.33,
      6,
    );
  });

  it("projects SIPP pot with tax relief and optional real interest", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-01-01",
      dateOfBirth: "1986-01-01",
      alphaPensionDrawAge: 40,
      lifeExpectancy: 75,
      sippCurrentPot: 10000,
      sippMonthlyContribution: 100,
      sippLumpSums: [
        {
          id: "sipp-lump",
          amount: 1000,
          startDate: "2026-01-01",
          cadence: "once",
          endDate: "2026-01-01",
        },
      ],
      sippTaxReliefRate: "20",
      sippApplyRealInterest: false,
    };

    expect(
      calculateSippPotAtDate({
        settings,
        rowDate: "2026-03-01",
        drawDate: "2026-01-01",
      }),
    ).toBe(11375);
  });

  it("projects yearly SIPP lump sums on their scheduled dates", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-01-01",
      dateOfBirth: "1986-01-01",
      alphaPensionDrawAge: 42,
      lifeExpectancy: 75,
      sippCurrentPot: 0,
      sippMonthlyContribution: 0,
      sippLumpSums: [
        {
          id: "yearly-sipp",
          amount: 1000,
          startDate: "2026-06-01",
          cadence: "yearly",
          endDate: "2027-06-01",
        },
      ],
      sippTaxReliefRate: "20",
      sippApplyRealInterest: false,
    };

    expect(
      calculateSippPotAtDate({
        settings,
        rowDate: "2026-05-01",
        drawDate: "2028-01-01",
      }),
    ).toBe(0);
    expect(
      calculateSippPotAtDate({
        settings,
        rowDate: "2027-06-01",
        drawDate: "2028-01-01",
      }),
    ).toBe(2500);
  });

  it("can apply higher-rate SIPP tax relief", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-01-01",
      dateOfBirth: "1986-01-01",
      alphaPensionDrawAge: 40,
      lifeExpectancy: 75,
      sippCurrentPot: 10000,
      sippMonthlyContribution: 100,
      sippLumpSums: [
        {
          id: "sipp-lump",
          amount: 1000,
          startDate: "2026-01-01",
          cadence: "once",
          endDate: "2026-01-01",
        },
      ],
      sippTaxReliefRate: "40",
      sippApplyRealInterest: false,
    };

    expect(
      calculateSippPotAtDate({
        settings,
        rowDate: "2026-03-01",
        drawDate: "2026-01-01",
      }),
    ).toBeCloseTo(11833.333333, 6);
  });

  it("can calculate SIPP income by zero-at-death or annual percentage strategy", () => {
    expect(
      calculateMonthlySippPension({
        potAtDraw: 120000,
        drawDate: "2046-01-01",
        endDate: "2056-01-01",
        strategy: "zero_at_death",
        withdrawalPercent: 4,
      }),
    ).toBeCloseTo(1000, 6);
    expect(
      calculateMonthlySippPension({
        potAtDraw: 120000,
        drawDate: "2046-01-01",
        endDate: "2056-01-01",
        strategy: "percentage",
        withdrawalPercent: 4,
      }),
    ).toBeCloseTo(400, 6);
  });

  it("uses independent SIPP and ISA draw dates for income start", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-05-15",
      dateOfBirth: "1987-06-15",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 60,
      lifeExpectancy: 66,
      showStatePension: false,
      sippCurrentPot: 120000,
      isaCurrentPot: 60000,
      sippDrawAge: 61,
      isaDrawAge: 62,
    };

    const rows = createProjectionTable(settings);

    expect(findRowByDate(rows, "2048-05-15")?.monthlySippPension).toBe(0);
    expect(findRowByDate(rows, "2048-06-15")?.monthlySippPension).toBeGreaterThan(0);
    expect(findRowByDate(rows, "2049-05-15")?.monthlyIsaPension).toBe(0);
    expect(findRowByDate(rows, "2049-06-15")?.monthlyIsaPension).toBeGreaterThan(0);
    expect(findRowByDate(rows, "2048-06-15")?.milestones).toContain("Starts Drawing SIPP");
    expect(findRowByDate(rows, "2049-06-15")?.milestones).toContain("Starts Drawing ISA");
  });

  it("stops monthly alpha accrual after the earlier of draw date and leave date", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-05-15",
      dateOfBirth: "1987-06-15",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 61,
      lifeExpectancy: 61,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      accruedPensionAtLastAbs: 8250,
      alphaPensionAbsDate: "2047",
      pensionableEarnings: 42000,
      alphaAddedPensionMonthly: 0,
    };

    const rows = createProjectionTable(settings);
    expect(findRowByDate(rows, "2047-05-15")?.annualAccruedAlphaPension).toBeCloseTo(
      8412.4,
      6,
    );
    expect(findRowByDate(rows, "2047-06-15")?.annualAccruedAlphaPension).toBeCloseTo(
      8493.6,
      6,
    );
    expect(findRowByDate(rows, "2047-07-15")?.annualAccruedAlphaPension).toBeCloseTo(
      8493.6,
      6,
    );
  });

  it("creates projection rows through the life expectancy birthday", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2074-12-15",
      lifeExpectancy: 88,
      dateOfBirth: "1987-06-15",
      showSipp: false,
      showIsa: false,
    };

    const rows = createProjectionTable(settings);
    expect(rows.at(-1)?.date).toBe(addYears("1987-06-15", 88));
  });

  it("keeps annual alpha entitlement visible before draw date but only pays monthly alpha after draw date", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-05-15",
      dateOfBirth: "1987-06-15",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 61,
      lifeExpectancy: 61,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      accruedPensionAtLastAbs: 8250,
      alphaPensionAbsDate: "2047",
      pensionableEarnings: 42000,
      alphaAddedPensionMonthly: 0,
    };

    const rows = createProjectionTable(settings);
    expect(findRowByDate(rows, "2047-05-15")?.annualAlphaPensionIncludingReduction).toBeCloseTo(
      5451.2352,
      6,
    );
    expect(findRowByDate(rows, "2047-05-15")?.monthlyAlphaPensionTakeHome).toBe(0);
    expect(findRowByDate(rows, "2047-06-15")?.monthlyAlphaPensionTakeHome).toBeCloseTo(
      458.6544,
      6,
    );
    expect(findRowByDate(rows, "2047-06-15")?.totalMonthlyPensionTakeHomePay).toBeCloseTo(
      458.6544,
      6,
    );
  });

  it("applies optional Alpha pension increases in the projection table", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      applyPensionIncreases: true,
      assumedCpiPercent: 2,
      startDate: "2025-04-01",
      dateOfBirth: "1987-04-01",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 39,
      lifeExpectancy: 70,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      accruedPensionAtLastAbs: 10000,
      alphaPensionAbsDate: "2025",
      pensionableEarnings: 0,
      alphaAddedPensionMonthly: 0,
    };

    const rows = createProjectionTable(settings);

    expect(findRowByDate(rows, "2026-04-01")?.annualAccruedAlphaPension).toBeCloseTo(
      10360,
      6,
    );
    expect(findRowByDate(rows, "2027-04-01")?.annualAccruedAlphaPension).toBeCloseTo(
      10567.2,
      6,
    );
  });

  it("splits EPA accrual into an unreduced EPA portion", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-05-15",
      dateOfBirth: "1987-06-15",
      alphaPensionAbsDate: "2047",
      accruedPensionAtLastAbs: 0,
      pensionableEarnings: 42000,
      alphaAddedPensionMonthly: 0,
      alphaPensionDrawAge: 65,
      alphaPensionLeaveAge: 65,
      lifeExpectancy: 66,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      alphaEpaEnabled: true,
      alphaEpaYearsBeforeNpa: 3,
      alphaEpaStartDate: "2047-05-15",
      alphaEpaEndDate: "2047-06-15",
    };

    const rows = createProjectionTable(settings);
    const row = findRowByDate(rows, "2047-06-15");

    expect(row?.annualStandardAlphaPension).toBeCloseTo(81.2, 6);
    expect(row?.annualEpaAlphaPension).toBeCloseTo(162.4, 6);
    expect(row?.annualAccruedAlphaPension).toBeCloseTo(243.6, 6);
    expect(row?.annualAlphaPensionIncludingReduction).toBeCloseTo(230.608, 6);
  });

  it("still projects rows when EPA is enabled before the EPA age", () => {
    const rows = createProjectionTable({
      ...defaultSettings,
      alphaEpaEnabled: true,
      alphaEpaYearsBeforeNpa: 3,
      alphaPensionDrawAge: 60,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.annualEpaAlphaPension > 0)).toBe(true);
  });

  it("projects rows for the shared EPA scenario", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2026-05-02",
      dateOfBirth: "1977-04-10",
      lifeExpectancy: 90,
      currentStatePension: 12547.6,
      applyPensionIncreases: false,
      assumedCpiPercent: 3.2,
      alphaPensionAbsDate: "2021",
      alphaAddedPensionMonthly: 0,
      alphaPensionLeaveAge: 68,
      accruedPensionAtLastAbs: 27750,
      pensionableEarnings: 70000,
      alphaPensionDrawAge: 67,
      normalPensionAge: 68,
      statePensionDrawDate: "2045-04-10",
      alphaEpaEnabled: true,
      alphaEpaYearsBeforeNpa: 2,
      alphaEpaStartDate: "2026-04-01",
      alphaEpaEndDate: "2047-03-31",
      alphaAddedPensionLumpSums: [
        {
          id: "2804c522-7db7-4acf-a6ee-5d428af449bb",
          amount: 500000,
          startDate: "2026-05-02",
          cadence: "once",
          endDate: "2026-05-02",
        },
      ],
    };

    const rows = createProjectionTable(settings);

    expect(rows.length).toBeGreaterThan(0);
  });

  it("shows the lump sum only on the purchase row and carries it into annual accrued pension", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-05-15",
      dateOfBirth: "1987-06-15",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 60,
      lifeExpectancy: 61,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      accruedPensionAtLastAbs: 8250,
      alphaPensionAbsDate: "2047",
      pensionableEarnings: 42000,
      alphaAddedPensionMonthly: 0,
      alphaAddedPensionLumpSums: [
        {
          id: "draw-date-lump-sum",
          amount: 12820,
          startDate: "2047-06-15",
          cadence: "once",
          endDate: "2047-06-15",
        },
      ],
    };

    const rows = createProjectionTable(settings);

    expect(findRowByDate(rows, "2047-05-15")?.lumpSumAddedPension).toBe(0);
    expect(findRowByDate(rows, "2047-06-15")?.lumpSumAddedPension).toBeCloseTo(1000, 6);
    expect(findRowByDate(rows, "2047-07-15")?.lumpSumAddedPension).toBe(0);
    expect(findRowByDate(rows, "2047-05-15")?.annualAccruedAlphaPension).toBeCloseTo(
      8412.4,
      6,
    );
    expect(findRowByDate(rows, "2047-06-15")?.annualAccruedAlphaPension).toBeCloseTo(
      9493.6,
      6,
    );
    expect(findRowByDate(rows, "2047-07-15")?.annualAccruedAlphaPension).toBeCloseTo(
      9493.6,
      6,
    );
    expect(findRowByDate(rows, "2047-06-15")?.monthlyAlphaPensionTakeHome).toBeCloseTo(
      512.6544,
      6,
    );
  });

  it("uses the calculated starting Alpha pension at the projection start instead of the raw ABS value", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2025-12-15",
      alphaPensionAbsDate: "2025",
      accruedPensionAtLastAbs: 8250,
      pensionableEarnings: 42000,
      alphaAddedPensionMonthly: 0,
      alphaPensionLeaveAge: 55,
      alphaPensionDrawAge: 55,
      lifeExpectancy: 70,
    };

    const rows = createProjectionTable(settings);
    expect(findRowByDate(rows, "2025-12-15")?.annualAccruedAlphaPension).toBeCloseTo(
      8980.8,
      6,
    );
  });

  it("prepends rows from the last ABS statement before the calculation start", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2025-12-15",
      alphaPensionAbsDate: "2025",
      accruedPensionAtLastAbs: 8250,
      pensionableEarnings: 42000,
      alphaAddedPensionMonthly: 0,
      alphaPensionLeaveAge: 55,
      alphaPensionDrawAge: 55,
      lifeExpectancy: 70,
    };

    const rows = createProjectionTable(settings);
    const alphaAbsDate = resolveAlphaAbsDate(settings.alphaPensionAbsDate);

    expect(rows[0]?.date).toBe(alphaAbsDate);
    expect(rows[0]?.milestones).toEqual(["Last ABS"]);
    expect(findRowByDate(rows, "2025-12-15")?.milestones).toContain("Calculation start");
    expect(findRowByDate(rows, alphaAbsDate)?.annualAccruedAlphaPension).toBeCloseTo(8250, 6);
  });

  it("flags the correct row for the Alpha Pension Stop Date", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2047-04-15",
        "2047-05-15",
        "2047-06-15",
        "2047-06-15",
        "2047-06-15",
        "2055-06-15",
        "2055-08-15",
      ),
      "2047-04-15",
      "2047-08-15",
    );

    expect(milestoneMap.get("2047-05-15")).toContain("Leave Alpha Pension Scheme");
  });

  it("flags the correct row for the Alpha Pension Draw Date", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2047-04-15",
        "2047-05-15",
        "2047-06-15",
        "2047-06-15",
        "2047-06-15",
        "2055-06-15",
        "2055-08-15",
      ),
      "2047-04-15",
      "2047-08-15",
    );

    expect(milestoneMap.get("2047-06-15")).toContain("Starts Drawing Alpha Pension");
  });

  it("flags the correct row for the State Pension Start Date", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2055-04-15",
        "2047-05-15",
        "2047-06-15",
        "2047-06-15",
        "2047-06-15",
        "2055-06-15",
        "2055-08-15",
      ),
      "2055-04-15",
      "2055-08-15",
    );

    expect(milestoneMap.get("2055-06-15")).toContain("Starts Drawing State Pension");
  });

  it("flags the correct rows for SIPP and ISA draw dates", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2047-04-15",
        "2047-05-15",
        "2047-06-15",
        "2047-07-15",
        "2047-08-15",
        "2055-06-15",
        "2055-08-15",
      ),
      "2047-04-15",
      "2055-08-15",
    );

    expect(milestoneMap.get("2047-07-15")).toContain("Starts Drawing SIPP");
    expect(milestoneMap.get("2047-08-15")).toContain("Starts Drawing ISA");
  });

  it("flags the next row when a milestone falls between generated monthly rows", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2047-04-15",
        "2047-05-20",
        "2047-06-20",
        "2047-06-20",
        "2047-06-20",
        "2055-06-20",
        "2055-08-15",
        [],
      ),
      "2047-04-15",
      "2055-08-15",
    );

    expect(milestoneMap.get("2047-06-15")).toContain("Leave Alpha Pension Scheme");
    expect(milestoneMap.get("2047-07-15")).toContain("Starts Drawing Alpha Pension");
    expect(milestoneMap.get("2055-07-15")).toContain("Starts Drawing State Pension");
  });

  it("preserves multiple milestones when they land on the same row", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2047-04-15",
        "2047-06-15",
        "2047-06-15",
        "2047-06-15",
        "2047-06-15",
        "2047-06-15",
        "2047-08-15",
        [],
      ),
      "2047-04-15",
      "2047-08-15",
    );

    expect(milestoneMap.get("2047-06-15")).toEqual([
      "Leave Alpha Pension Scheme",
      "Starts Drawing Alpha Pension",
      "Starts Drawing SIPP",
      "Starts Drawing ISA",
      "Starts Drawing State Pension",
    ]);
  });

  it("flags the start date row for the calculation start milestone", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2047-04-15",
        "2047-05-15",
        "2047-06-15",
        "2047-06-15",
        "2047-06-15",
        "2055-06-15",
        "2055-08-15",
        [],
      ),
      "2047-04-15",
      "2047-08-15",
    );

    expect(milestoneMap.get("2047-04-15")).toContain("Calculation start");
  });

  it("flags the ABS row for the last ABS statement milestone", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2047-05-15",
        "2047-06-15",
        "2047-07-15",
        "2047-07-15",
        "2047-07-15",
        "2055-06-15",
        "2055-08-15",
        [],
        "2047-04-01",
      ),
      "2047-04-01",
      "2047-08-15",
    );

    expect(milestoneMap.get("2047-04-01")).toContain("Last ABS");
  });

  it("flags the life expectancy row for the life expectancy milestone", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2055-04-15",
        "2047-05-15",
        "2047-06-15",
        "2047-06-15",
        "2047-06-15",
        "2055-06-15",
        "2055-08-15",
        [],
      ),
      "2055-04-15",
      "2055-08-15",
    );

    expect(milestoneMap.get("2055-08-15")).toContain("Life expectancy");
  });

  it("adds milestone labels to projection rows", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-05-15",
      dateOfBirth: "1979-06-15",
      alphaPensionDrawAge: 68,
      alphaPensionLeaveAge: 68,
      sippDrawAge: 68,
      isaDrawAge: 68,
      statePensionDrawDate: "2047-06-15",
      lifeExpectancy: 69,
    };

    const rows = createProjectionTable(settings);
    expect(rows[0]?.milestones).toEqual(["Last ABS"]);
    expect(findRowByDate(rows, "2047-05-15")?.milestones).toEqual(["Calculation start"]);
    expect(findRowByDate(rows, "2047-06-15")?.milestones).toEqual([
      "Leave Alpha Pension Scheme",
      "Starts Drawing Alpha Pension",
      "Starts Drawing SIPP",
      "Starts Drawing ISA",
      "Starts Drawing State Pension",
    ]);
    expect(rows.at(-1)?.date).toBe("2048-06-15");
    expect(rows.at(-1)?.milestones).toEqual(["Life expectancy"]);
  });

  it("adds lump sum purchase dates as milestones", () => {
    const milestoneMap = buildMilestoneMap(
      generateMilestoneDefinitions(
        "2047-04-15",
        "2047-05-15",
        "2047-06-15",
        "2047-06-15",
        "2047-06-15",
        "2055-06-15",
        "2055-08-15",
        [
          {
            id: "one-off",
            amount: 12820,
            startDate: "2047-06-15",
            cadence: "once",
            endDate: "2047-06-15",
          },
          {
            id: "yearly",
            amount: 5000,
            startDate: "2047-05-20",
            cadence: "yearly",
            endDate: "2048-05-20",
          },
        ],
      ),
      "2047-04-15",
      "2048-08-15",
    );

    expect(milestoneMap.get("2047-06-15")).toContain("Lump Sum Added Pension (£12,820)");
    expect(milestoneMap.get("2047-06-15")).toContain("Lump Sum Added Pension (£5,000)");
    expect(milestoneMap.get("2048-06-15")).toContain("Lump Sum Added Pension (£5,000)");
  });

  it("shows lump sum milestones on the first projection row after the payment date", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-04-15",
      dateOfBirth: "1987-06-20",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 60,
      statePensionDrawDate: "2055-06-20",
      lifeExpectancy: 61,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      alphaAddedPensionLumpSums: [
        {
          id: "between-rows",
          amount: 12820,
          startDate: "2047-06-20",
          cadence: "once",
          endDate: "2047-06-20",
        },
      ],
    };

    const rows = createProjectionTable(settings);
    expect(findRowByDate(rows, "2047-06-15")?.milestones).not.toContain(
      "Lump Sum Added Pension (£12,820)",
    );
    expect(findRowByDate(rows, "2047-07-15")?.milestones).toContain(
      "Lump Sum Added Pension (£12,820)",
    );
  });

  it("tracks age with month precision in projection rows", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-04-15",
      dateOfBirth: "1987-06-20",
      lifeExpectancy: 61,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
    };

    const rows = createProjectionTable(settings);
    expect(findRowByDate(rows, "2047-04-15")?.age).toBe(59);
    expect(findRowByDate(rows, "2047-04-15")?.ageMonths).toBe(9);
    expect(findRowByDate(rows, "2047-06-15")?.age).toBe(59);
    expect(findRowByDate(rows, "2047-06-15")?.ageMonths).toBe(11);
    expect(findRowByDate(rows, "2047-07-15")?.age).toBe(60);
    expect(findRowByDate(rows, "2047-07-15")?.ageMonths).toBe(0);
  });

  it("selects the first row on or after the Alpha pension draw date for the summary", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-04-15",
      dateOfBirth: "1987-06-20",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 60,
      lifeExpectancy: 61,
    };

    const rows = createProjectionTable(settings);
    const summary = generatePensionSummary(rows, settings);

    expect(summary.keyDates.startsAlphaPension).toBe("2047-06-20");
    expect(summary.alphaPension.monthlyAtDraw).toBeCloseTo(
      findRowByDate(rows, "2047-07-15")?.monthlyAlphaPensionTakeHome ?? 0,
      6,
    );
  });

  it("selects the first row on or after the state pension start date for the summary", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2055-04-15",
      dateOfBirth: "1987-06-20",
      statePensionDrawDate: "2055-06-20",
      lifeExpectancy: 69,
    };

    const rows = createProjectionTable(settings);
    const summary = generatePensionSummary(rows, settings);

    expect(summary.incomeOverTime.monthlyAtStateStart).toBeCloseTo(
      findRowByDate(rows, "2055-07-15")?.totalMonthlyPensionTakeHomePay ?? 0,
      6,
    );
    expect(summary.incomeOverTime.monthlyAfterStatePension).toBeCloseTo(
      findRowByDate(rows, "2055-07-15")?.totalMonthlyPensionTakeHomePay ?? 0,
      6,
    );
  });

  it("identifies the maximum accrued Alpha pension from the projection table", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2047-05-15",
      dateOfBirth: "1987-06-15",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 61,
      lifeExpectancy: 61,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      accruedPensionAtLastAbs: 8250,
      alphaPensionAbsDate: "2047",
      pensionableEarnings: 42000,
      alphaAddedPensionMonthly: 0,
    };

    const rows = createProjectionTable(settings);
    const summary = generatePensionSummary(rows, settings);

    expect(summary.alphaPension.maximumAnnualAccrued).toBeCloseTo(8493.6, 6);
    expect(summary.alphaPension.totalAddedAfterToday).toBeCloseTo(162.4, 6);
  });

  it("derives monthly totals from the projection rows", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2055-04-15",
      dateOfBirth: "1987-06-15",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 60,
      statePensionDrawDate: "2055-06-15",
      lifeExpectancy: 68,
    };

    const rows = createProjectionTable(settings);
    const summary = generatePensionSummary(rows, settings);
    const stateRow = rows.find((row) => row.date === "2055-06-15");

    expect(summary.incomeOverTime.monthlyAtStateStart).toBeCloseTo(
      (stateRow?.monthlyAlphaPensionTakeHome ?? 0) +
        (stateRow?.monthlyStatePension ?? 0),
      6,
    );
    expect(summary.incomeOverTime.monthlyStatePension).toBeCloseTo(
      stateRow?.monthlyStatePension ?? 0,
      6,
    );
    expect(summary.retirementIncome.sources).toEqual([
      expect.objectContaining({
        key: "alpha",
        label: "Alpha pension",
        monthlyIncome: summary.alphaPension.monthlyAtDraw,
      }),
      expect.objectContaining({
        key: "sipp",
        label: "SIPP",
      }),
      expect.objectContaining({
        key: "isa",
        label: "ISA",
      }),
      expect.objectContaining({
        key: "statePension",
        label: "State Pension",
        monthlyIncome: summary.incomeOverTime.monthlyStatePension,
      }),
    ]);
    expect(summary.retirementIncome.totalMonthlyIncome).toBeCloseTo(
      summary.retirementIncome.sources.reduce((total, source) => total + source.monthlyIncome, 0),
      6,
    );
    expect(summary.retirementIncome.totalAnnualIncome).toBeCloseTo(
      summary.retirementIncome.totalMonthlyIncome * 12,
      6,
    );
  });

  it("updates the summary when pension parameters change", () => {
    const baseRows = createProjectionTable(defaultSettings);
    const baseSummary = generatePensionSummary(baseRows, defaultSettings);
    const updatedSettings: PensionSettings = {
      ...defaultSettings,
      currentStatePension: 12000,
      alphaPensionDrawAge: 61,
      alphaPensionLeaveAge: 61,
    };
    const updatedRows = createProjectionTable(updatedSettings);
    const updatedSummary = generatePensionSummary(updatedRows, updatedSettings);

    expect(updatedSummary.alphaPension.monthlyAtDraw).not.toBe(
      baseSummary.alphaPension.monthlyAtDraw,
    );
    expect(updatedSummary.incomeOverTime.monthlyAtStateStart).not.toBe(
      baseSummary.incomeOverTime.monthlyAtStateStart,
    );
    expect(updatedSummary.keyDates.startsAlphaPension).toBe("2048-06-15");
  });

  it("excludes hidden optional sections from rows, totals, and milestones", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2055-04-15",
      dateOfBirth: "1987-06-15",
      alphaPensionDrawAge: 60,
      alphaPensionLeaveAge: 60,
      statePensionDrawDate: "2055-06-15",
      lifeExpectancy: 68,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      currentStatePension: 12547.6,
      sippCurrentPot: 100000,
      sippMonthlyContribution: 500,
      isaCurrentPot: 25000,
      isaMonthlyContribution: 300,
    };

    const rows = createProjectionTable(settings);
    const stateRow = rows.find((row) => row.date === "2055-06-15");
    const summary = generatePensionSummary(rows, settings);

    expect(stateRow?.monthlyStatePension).toBe(0);
    expect(stateRow?.monthlySippPension).toBe(0);
    expect(stateRow?.monthlyIsaPension).toBe(0);
    expect(stateRow?.totalMonthlyPensionTakeHomePay).toBeCloseTo(
      stateRow?.monthlyAlphaPensionTakeHome ?? 0,
      6,
    );
    expect(rows.some((row) => row.milestones.includes("Starts Drawing State Pension"))).toBe(
      false,
    );
    expect(summary.sippPension.potAtDraw).toBe(0);
    expect(summary.isaPension.potAtDraw).toBe(0);
    expect(summary.incomeOverTime.monthlyStatePension).toBe(0);
    expect(summary.retirementIncome.sources).toEqual([
      expect.objectContaining({
        key: "alpha",
        monthlyIncome: summary.alphaPension.monthlyAtDraw,
      }),
    ]);
    expect(summary.retirementIncome.totalMonthlyIncome).toBeCloseTo(
      summary.alphaPension.monthlyAtDraw,
      6,
    );
  });

  it("returns no rows and a safe zeroed summary when settings are invalid", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2076-01-01",
    };

    const rows = createProjectionTable(settings);
    const summary = generatePensionSummary(rows, settings);

    expect(rows).toEqual([]);
    expect(summary.alphaPension.maximumAnnualAccrued).toBe(0);
    expect(summary.incomeOverTime.monthlyAtStateStart).toBe(0);
    expect(summary.retirementIncome.totalMonthlyIncome).toBe(0);
  });
});
