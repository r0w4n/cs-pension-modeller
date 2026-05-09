import addedPensionFactors from "./data/alpha_pension_added_pension_factors.json";
import reductionFactors from "./data/alpha_pension_reduction_factors.json";
import {
  getAlphaEpaDate,
  resolveAlphaAbsDate,
  validateSettings,
  type AddedPensionLumpSum,
  type PensionSettings,
} from "./settings";

type AddedPensionFactorRecord = {
  age: number;
  self: number | null;
  self_plus_beneficiaries: number | null;
};

type ReductionFactorRecord = {
  normal_pension_age: number;
  retirement_age: number;
  reduction_factor: number;
};

export type ProjectionRow = {
  date: string;
  age: number;
  ageMonths: number;
  milestones: string[];
  milestoneDates: string[];
  monthlyAddedPension: number;
  lumpSumAddedPension: number;
  annualStandardAlphaPension: number;
  annualEpaAlphaPension: number;
  annualAccruedAlphaPension: number;
  annualAlphaPensionIncludingReduction: number;
  monthlyAlphaPensionTakeHome: number;
  monthlyStatePension: number;
  sippPot: number;
  monthlySippPension: number;
  isaPot: number;
  monthlyIsaPension: number;
  totalMonthlyPensionTakeHomePay: number;
};

export type PensionSummary = {
  keyDates: {
    stopsAlphaAccrual: string;
    startsAlphaPension: string;
    startsSippDraw: string;
    startsIsaDraw: string;
    startsStatePension: string;
  };
  alphaPension: {
    annualAtDraw: number;
    monthlyAtDraw: number;
    maximumAnnualAccrued: number;
    totalAddedAfterToday: number;
  };
  sippPension: {
    potAtDraw: number;
    monthlyAtDraw: number;
    totalContributionsAfterTaxRelief: number;
  };
  isaPension: {
    potAtDraw: number;
    monthlyAtDraw: number;
    totalContributions: number;
  };
  incomeOverTime: {
    monthlyAtAlphaStart: number;
    monthlyAtStateStart: number;
    monthlyAfterStatePension: number;
    monthlyStatePension: number;
  };
  transitions: {
    yearsBetweenStoppingAccrualAndDrawingPension: number;
    yearsBetweenAlphaPensionAndStatePension: number;
  };
  calculated: {
    normalPensionAge: number;
    statePensionAge: number;
    earlyRetirementReductionPercent: number;
  };
};

const MONTHLY_ALPHA_ACCRUAL_RATE = 0.0232 / 12;
const CALCULATION_START_LABEL = "Calculation start";
const LAST_ABS_STATEMENT_LABEL = "Last ABS";
const STOPS_ALPHA_ACCRUAL_LABEL = "Leave Alpha Pension Scheme";
const STARTS_ALPHA_PENSION_LABEL = "Starts Drawing Alpha Pension";
const STARTS_SIPP_LABEL = "Starts Drawing SIPP";
const STARTS_ISA_LABEL = "Starts Drawing ISA";
const STARTS_STATE_PENSION_LABEL = "Starts Drawing State Pension";
const LIFE_EXPECTANCY_LABEL = "Life expectancy";
const LUMP_SUM_ADDED_PENSION_LABEL = "Lump Sum Added Pension";
const SIPP_LUMP_SUM_LABEL = "SIPP Lump Sum";
const ISA_LUMP_SUM_LABEL = "ISA Lump Sum";
const DEFAULT_ALPHA_ACCRUAL_RATE = 0.0232;

type MilestoneDefinition = {
  date: string;
  label: string;
};

type ProjectionRowWithoutMilestones = Omit<ProjectionRow, "milestones" | "milestoneDates">;

type AlphaBenefitComponent = {
  amount: number;
  startDate: string;
  portion: "standard" | "epa";
};

export type DerivedProjectionInputs = {
  endDate: string;
  drawDate: string;
  alphaStopDate: string;
  accrualStopDate: string;
  addedPensionStopDate: string;
  npaDate: string;
  epaDate: string;
  reductionFactor: number;
  epaReductionFactor: number;
};

export function deriveProjectionInputs(
  settings: PensionSettings,
): DerivedProjectionInputs | null {
  if (validateSettings(settings).length > 0) {
    return null;
  }

  const endDate = getLifeExpectancyDate(settings.dateOfBirth, settings.lifeExpectancy);
  const drawDate = addYears(settings.dateOfBirth, settings.alphaPensionDrawAge);
  const alphaStopDate = addYears(settings.dateOfBirth, settings.alphaPensionLeaveAge);
  const accrualStopDate = minIsoDate(drawDate, alphaStopDate);
  const addedPensionStopDate = accrualStopDate;
  const npaDate = addYears(settings.dateOfBirth, settings.normalPensionAge);
  const epaDate = getAlphaEpaDate(settings);
  const reductionFactor =
    drawDate > npaDate
      ? 1
      : getEarlyRetirementReductionFactor(
          settings.normalPensionAge,
          settings.alphaPensionDrawAge,
        );
  const epaDrawAge = settings.normalPensionAge - settings.alphaEpaYearsBeforeNpa;
  const epaReductionFactor =
    !settings.alphaEpaEnabled || drawDate >= epaDate
      ? 1
      : getEarlyRetirementReductionFactor(epaDrawAge, settings.alphaPensionDrawAge);

  return {
    endDate,
    drawDate,
    alphaStopDate,
    accrualStopDate,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  };
}

export function createProjectionTable(settings: PensionSettings): ProjectionRow[] {
  const derivedInputs = deriveProjectionInputs(settings);

  if (!derivedInputs) {
    return [];
  }

  if (settings.applyPensionIncreases) {
    return createProjectionTableWithPensionIncreases(settings, derivedInputs);
  }

  const {
    endDate,
    drawDate,
    accrualStopDate,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  } = derivedInputs;
  const sippDrawDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const isaDrawDate = addYears(settings.dateOfBirth, settings.isaDrawAge);
  const alphaAbsDate = resolveAlphaAbsDate(settings.alphaPensionAbsDate);

  const startingAlphaPortionsAtStartDate = calculateStartingAlphaPortionsAtStartDate({
    settings,
    alphaAbsDate,
    accrualStopDate,
  });
  const historicalRows = createHistoricalProjectionRows({
    settings,
    alphaAbsDate,
    drawDate,
    accrualStopDate,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  });
  let cumulativeStandardAccrual = 0;
  let cumulativeEpaAccrual = 0;
  let cumulativeStandardAddedPension = historicalRows.reduce(
    (total, row) => total + row.lumpSumAddedPension,
    0,
  );
  let previousRowDate: string | undefined;

  const projectionRows = generateMonthlyDateRange(settings.startDate, endDate).map((rowDate) => {
    const sippProjection = calculateSippProjectionRow({
      settings,
      rowDate,
      drawDate: sippDrawDate,
      endDate,
    });
    const isaProjection = calculateIsaProjectionRow({
      settings,
      rowDate,
      drawDate: isaDrawDate,
      endDate,
    });
    const age = calculateAge(settings.dateOfBirth, rowDate);
    const ageMonths = calculateAgeMonths(settings.dateOfBirth, rowDate);
    const monthlyStandardAlphaAccrual =
      rowDate <= accrualStopDate
        ? calculateMonthlyStandardAlphaAccrual(settings, rowDate)
        : 0;
    const monthlyEpaAlphaAccrual =
      rowDate <= accrualStopDate
        ? calculateMonthlyEpaAlphaAccrual(settings, rowDate)
        : 0;

    cumulativeStandardAccrual += monthlyStandardAlphaAccrual;
    cumulativeEpaAccrual += monthlyEpaAlphaAccrual;

    const monthlyAddedPension = calculateMonthlyAddedPension({
      rowDate,
      stopDate: addedPensionStopDate,
      dateOfBirth: settings.dateOfBirth,
      addedPensionMonthlyContribution: settings.alphaAddedPensionMonthly,
    });
    const lumpSumAddedPensionPurchasedThisRow = calculateLumpSumAddedPension({
      rowDate,
      previousRowDate,
      dateOfBirth: settings.dateOfBirth,
      lumpSums: settings.alphaAddedPensionLumpSums,
    });
    cumulativeStandardAddedPension += lumpSumAddedPensionPurchasedThisRow;
    const annualStandardAlphaPension = calculateAccruedAlphaPension(
      startingAlphaPortionsAtStartDate.standardAlphaPension,
      cumulativeStandardAccrual + cumulativeStandardAddedPension,
    );
    const annualEpaAlphaPension =
      startingAlphaPortionsAtStartDate.epaAlphaPension + cumulativeEpaAccrual;
    const annualAccruedAlphaPension =
      annualStandardAlphaPension + annualEpaAlphaPension;
    const annualAlphaPensionIncludingReduction =
      calculateAnnualAlphaPensionIncludingEpaReduction({
        standardAlphaPension: annualStandardAlphaPension,
        epaAlphaPension: annualEpaAlphaPension,
        alphaPensionDrawDate: drawDate,
        npaDate,
        epaDate,
        reductionFactor,
        epaReductionFactor,
      });
    const monthlyAlphaPensionTakeHome = calculateMonthlyAlphaPensionTakeHome(
      rowDate,
      drawDate,
      annualAlphaPensionIncludingReduction,
    );
    const monthlyStatePension = calculateMonthlyStatePension(
      rowDate,
      settings.statePensionDrawDate,
      calculateAnnualStatePensionAtDraw(settings),
    );
    const totalMonthlyPensionTakeHomePay = calculateTotalGrossMonthlyPension(
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
      sippProjection.monthlySippPension,
      isaProjection.monthlyIsaPension,
    );

    const projectionRow = {
      date: rowDate,
      age,
      ageMonths,
      monthlyAddedPension,
      lumpSumAddedPension: lumpSumAddedPensionPurchasedThisRow,
      annualStandardAlphaPension,
      annualEpaAlphaPension,
      annualAccruedAlphaPension,
      annualAlphaPensionIncludingReduction,
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
      sippPot: sippProjection.sippPot,
      monthlySippPension: sippProjection.monthlySippPension,
      isaPot: isaProjection.isaPot,
      monthlyIsaPension: isaProjection.monthlyIsaPension,
      totalMonthlyPensionTakeHomePay,
    };

    previousRowDate = rowDate;

    return projectionRow;
  });

  const allRows = [...historicalRows, ...projectionRows];
  const milestoneDefinitions = generateMilestoneDefinitions(
    settings.startDate,
    accrualStopDate,
    drawDate,
    settings.showSipp ? sippDrawDate : "",
    settings.showIsa ? isaDrawDate : "",
    settings.statePensionDrawDate,
    endDate,
    settings.alphaAddedPensionLumpSums,
    alphaAbsDate,
    settings.showSipp ? settings.sippLumpSums : [],
    settings.showIsa ? settings.isaLumpSums : [],
    settings.showStatePension,
  );
  const milestoneRows = buildMilestoneMapForRowDates(
    milestoneDefinitions,
    allRows.map((row) => row.date),
  );
  const milestoneDateRows = buildMilestoneDateMapForRowDates(
    milestoneDefinitions,
    allRows.map((row) => row.date),
  );

  return allRows.map((row) => ({
    ...row,
    milestones: milestoneRows.get(row.date) ?? [],
    milestoneDates: milestoneDateRows.get(row.date) ?? [],
  }));
}

function createProjectionTableWithPensionIncreases(
  settings: PensionSettings,
  derivedInputs: DerivedProjectionInputs,
): ProjectionRow[] {
  const {
    endDate,
    drawDate,
    accrualStopDate,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  } = derivedInputs;
  const sippDrawDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const isaDrawDate = addYears(settings.dateOfBirth, settings.isaDrawAge);
  const alphaAbsDate = resolveAlphaAbsDate(settings.alphaPensionAbsDate);
  const firstRowDate = minIsoDate(alphaAbsDate, settings.startDate);
  const benefitComponents: AlphaBenefitComponent[] = [
    {
      amount: settings.accruedPensionAtLastAbs,
      startDate: alphaAbsDate,
      portion: "standard",
    },
  ];
  let previousRowDate: string | undefined;

  const allRows = generateMonthlyDateRange(firstRowDate, endDate).map((rowDate) => {
    const sippProjection =
      rowDate >= settings.startDate
        ? calculateSippProjectionRow({
            settings,
            rowDate,
            drawDate: sippDrawDate,
            endDate,
          })
        : { sippPot: 0, monthlySippPension: 0 };
    const isaProjection =
      rowDate >= settings.startDate
        ? calculateIsaProjectionRow({
            settings,
            rowDate,
            drawDate: isaDrawDate,
            endDate,
          })
        : { isaPot: 0, monthlyIsaPension: 0 };
    const age = calculateAge(settings.dateOfBirth, rowDate);
    const ageMonths = calculateAgeMonths(settings.dateOfBirth, rowDate);
    const shouldShowAbsStatementOnly = rowDate === alphaAbsDate && rowDate < settings.startDate;
    const monthlyStandardAlphaAccrual =
      rowDate <= accrualStopDate && !shouldShowAbsStatementOnly
        ? calculateMonthlyStandardAlphaAccrual(settings, rowDate)
        : 0;
    const monthlyEpaAlphaAccrual =
      rowDate <= accrualStopDate && !shouldShowAbsStatementOnly
        ? calculateMonthlyEpaAlphaAccrual(settings, rowDate)
        : 0;

    if (monthlyStandardAlphaAccrual > 0) {
      benefitComponents.push({
        amount: monthlyStandardAlphaAccrual,
        startDate: rowDate,
        portion: "standard",
      });
    }

    if (monthlyEpaAlphaAccrual > 0) {
      benefitComponents.push({
        amount: monthlyEpaAlphaAccrual,
        startDate: rowDate,
        portion: "epa",
      });
    }

    const monthlyAddedPension = calculateMonthlyAddedPension({
      rowDate,
      stopDate: addedPensionStopDate,
      dateOfBirth: settings.dateOfBirth,
      addedPensionMonthlyContribution: settings.alphaAddedPensionMonthly,
    });
    const lumpSumAddedPension = calculateLumpSumAddedPension({
      rowDate,
      previousRowDate,
      dateOfBirth: settings.dateOfBirth,
      lumpSums: settings.alphaAddedPensionLumpSums,
    });

    if (lumpSumAddedPension > 0) {
      benefitComponents.push({
        amount: lumpSumAddedPension,
        startDate: rowDate,
        portion: "standard",
      });
    }

    const alphaPortions = calculateRevaluedAlphaPensionPortions({
      benefitComponents,
      rowDate,
      activeUntilDate: accrualStopDate,
      cpiPercent: settings.assumedCpiPercent,
    });
    const annualStandardAlphaPension = alphaPortions.standardAlphaPension;
    const annualEpaAlphaPension = alphaPortions.epaAlphaPension;
    const annualAccruedAlphaPension =
      annualStandardAlphaPension + annualEpaAlphaPension;
    const annualAlphaPensionIncludingReduction =
      calculateAnnualAlphaPensionIncludingEpaReduction({
        standardAlphaPension: annualStandardAlphaPension,
        epaAlphaPension: annualEpaAlphaPension,
        alphaPensionDrawDate: drawDate,
        npaDate,
        epaDate,
        reductionFactor,
        epaReductionFactor,
      });
    const monthlyAlphaPensionTakeHome = calculateMonthlyAlphaPensionTakeHome(
      rowDate,
      drawDate,
      annualAlphaPensionIncludingReduction,
    );
    const monthlyStatePension = calculateMonthlyStatePension(
      rowDate,
      settings.statePensionDrawDate,
      calculateAnnualStatePensionAtDraw(settings),
    );

    previousRowDate = rowDate;

    return {
      date: rowDate,
      age,
      ageMonths,
      monthlyAddedPension,
      lumpSumAddedPension,
      annualStandardAlphaPension,
      annualEpaAlphaPension,
      annualAccruedAlphaPension,
      annualAlphaPensionIncludingReduction,
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
      sippPot: sippProjection.sippPot,
      monthlySippPension: sippProjection.monthlySippPension,
      isaPot: isaProjection.isaPot,
      monthlyIsaPension: isaProjection.monthlyIsaPension,
      totalMonthlyPensionTakeHomePay: calculateTotalGrossMonthlyPension(
        monthlyAlphaPensionTakeHome,
        monthlyStatePension,
        sippProjection.monthlySippPension,
        isaProjection.monthlyIsaPension,
      ),
    };
  });

  const milestoneDefinitions = generateMilestoneDefinitions(
    settings.startDate,
    accrualStopDate,
    drawDate,
    settings.showSipp ? sippDrawDate : "",
    settings.showIsa ? isaDrawDate : "",
    settings.statePensionDrawDate,
    endDate,
    settings.alphaAddedPensionLumpSums,
    alphaAbsDate,
    settings.showSipp ? settings.sippLumpSums : [],
    settings.showIsa ? settings.isaLumpSums : [],
    settings.showStatePension,
  );
  const milestoneRows = buildMilestoneMapForRowDates(
    milestoneDefinitions,
    allRows.map((row) => row.date),
  );
  const milestoneDateRows = buildMilestoneDateMapForRowDates(
    milestoneDefinitions,
    allRows.map((row) => row.date),
  );

  return allRows.map((row) => ({
    ...row,
    milestones: milestoneRows.get(row.date) ?? [],
    milestoneDates: milestoneDateRows.get(row.date) ?? [],
  }));
}

export function generatePensionSummary(
  tableData: ProjectionRow[],
  settings: PensionSettings,
): PensionSummary {
  const startingAlphaPensionAtStartDate = calculateStartingAlphaPensionAtStartDate({
    alphaPensionAccruedAtLastStatement: settings.accruedPensionAtLastAbs,
    alphaPensionAbsDate: resolveAlphaAbsDate(settings.alphaPensionAbsDate),
    startDate: settings.startDate,
    pensionableEarnings: settings.pensionableEarnings,
    alphaAccrualRate: DEFAULT_ALPHA_ACCRUAL_RATE,
  });

  if (tableData.length === 0) {
    const alphaPensionDrawDate = addYears(
      settings.dateOfBirth,
      settings.alphaPensionDrawAge,
    );
    const sippDrawDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
    const isaDrawDate = addYears(settings.dateOfBirth, settings.isaDrawAge);
    const alphaAccrualStopDate = minIsoDate(
      alphaPensionDrawDate,
      addYears(settings.dateOfBirth, settings.alphaPensionLeaveAge),
    );
    const npaDate = addYears(settings.dateOfBirth, settings.normalPensionAge);
    const reductionFactor =
      alphaPensionDrawDate > npaDate
        ? 1
        : getEarlyRetirementReductionFactor(
            settings.normalPensionAge,
            settings.alphaPensionDrawAge,
          );

    return {
      keyDates: {
        stopsAlphaAccrual: alphaAccrualStopDate,
        startsAlphaPension: alphaPensionDrawDate,
        startsSippDraw: sippDrawDate,
        startsIsaDraw: isaDrawDate,
        startsStatePension: settings.statePensionDrawDate,
      },
      alphaPension: {
        annualAtDraw: 0,
        monthlyAtDraw: 0,
        maximumAnnualAccrued: 0,
        totalAddedAfterToday: 0,
      },
      sippPension: {
        potAtDraw: 0,
        monthlyAtDraw: 0,
        totalContributionsAfterTaxRelief: 0,
      },
      isaPension: {
        potAtDraw: 0,
        monthlyAtDraw: 0,
        totalContributions: 0,
      },
      incomeOverTime: {
        monthlyAtAlphaStart: 0,
        monthlyAtStateStart: 0,
        monthlyAfterStatePension: 0,
        monthlyStatePension: 0,
      },
      transitions: {
        yearsBetweenStoppingAccrualAndDrawingPension: calculateYearDifference(
          alphaAccrualStopDate,
          alphaPensionDrawDate,
        ),
        yearsBetweenAlphaPensionAndStatePension: calculateYearDifference(
          alphaPensionDrawDate,
          settings.statePensionDrawDate,
        ),
      },
      calculated: {
        normalPensionAge: settings.normalPensionAge,
        statePensionAge: calculateAge(settings.dateOfBirth, settings.statePensionDrawDate),
        earlyRetirementReductionPercent: Math.max(0, (1 - reductionFactor) * 100),
      },
    };
  }

  const alphaPensionDrawDate = addYears(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge,
  );
  const sippDrawDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const isaDrawDate = addYears(settings.dateOfBirth, settings.isaDrawAge);
  const alphaAccrualStopDate = minIsoDate(
    alphaPensionDrawDate,
    addYears(settings.dateOfBirth, settings.alphaPensionLeaveAge),
  );
  const statePensionStartDate = settings.statePensionDrawDate;
  const npaDate = addYears(settings.dateOfBirth, settings.normalPensionAge);
  const reductionFactor =
    alphaPensionDrawDate > npaDate
      ? 1
      : getEarlyRetirementReductionFactor(
          settings.normalPensionAge,
          settings.alphaPensionDrawAge,
        );
  const alphaDrawRow =
    findFirstRowAtOrAfterDate(tableData, alphaPensionDrawDate) ?? tableData.at(-1);
  const statePensionRow =
    findFirstRowAtOrAfterDate(tableData, statePensionStartDate) ?? tableData.at(-1);
  const sippDrawRow =
    findFirstRowAtOrAfterDate(tableData, sippDrawDate) ?? tableData.at(-1);
  const isaDrawRow =
    findFirstRowAtOrAfterDate(tableData, isaDrawDate) ?? tableData.at(-1);
  const maximumAnnualAccrued = Math.max(...tableData.map((row) => row.annualAccruedAlphaPension));
  const totalAddedAfterToday = maximumAnnualAccrued - startingAlphaPensionAtStartDate;

  return {
    keyDates: {
      stopsAlphaAccrual: alphaAccrualStopDate,
      startsAlphaPension: alphaPensionDrawDate,
      startsSippDraw: sippDrawDate,
      startsIsaDraw: isaDrawDate,
      startsStatePension: statePensionStartDate,
    },
    alphaPension: {
      annualAtDraw: alphaDrawRow?.annualAlphaPensionIncludingReduction ?? 0,
      monthlyAtDraw: alphaDrawRow?.monthlyAlphaPensionTakeHome ?? 0,
      maximumAnnualAccrued,
      totalAddedAfterToday,
    },
    sippPension: {
      potAtDraw: sippDrawRow?.sippPot ?? 0,
      monthlyAtDraw: sippDrawRow?.monthlySippPension ?? 0,
      totalContributionsAfterTaxRelief: calculateTotalSippContributionsAfterTaxRelief(
        settings,
        sippDrawDate,
      ),
    },
    isaPension: {
      potAtDraw: isaDrawRow?.isaPot ?? 0,
      monthlyAtDraw: isaDrawRow?.monthlyIsaPension ?? 0,
      totalContributions: calculateTotalIsaContributions(settings, isaDrawDate),
    },
    incomeOverTime: {
      monthlyAtAlphaStart: alphaDrawRow?.totalMonthlyPensionTakeHomePay ?? 0,
      monthlyAtStateStart: statePensionRow?.totalMonthlyPensionTakeHomePay ?? 0,
      monthlyAfterStatePension: statePensionRow?.totalMonthlyPensionTakeHomePay ?? 0,
      monthlyStatePension: statePensionRow?.monthlyStatePension ?? 0,
    },
    transitions: {
      yearsBetweenStoppingAccrualAndDrawingPension: calculateYearDifference(
        alphaAccrualStopDate,
        alphaPensionDrawDate,
      ),
      yearsBetweenAlphaPensionAndStatePension: calculateYearDifference(
        alphaPensionDrawDate,
        statePensionStartDate,
      ),
    },
    calculated: {
      normalPensionAge: settings.normalPensionAge,
      statePensionAge: calculateAge(settings.dateOfBirth, statePensionStartDate),
      earlyRetirementReductionPercent: Math.max(0, (1 - reductionFactor) * 100),
    },
  };
}

export function generateMonthlyDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addMonths(currentDate, 1);
  }

  if (dates.at(-1) !== endDate) {
    dates.push(endDate);
  }

  return dates;
}

export function getLifeExpectancyDate(dateOfBirth: string, lifeExpectancyAge: number) {
  return addYears(dateOfBirth, lifeExpectancyAge);
}

export function calculateAge(dateOfBirth: string, rowDate: string) {
  const birth = parseIsoDate(dateOfBirth);
  const row = parseIsoDate(rowDate);

  let age = row.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthday =
    row.getUTCMonth() > birth.getUTCMonth() ||
    (row.getUTCMonth() === birth.getUTCMonth() &&
      row.getUTCDate() >= birth.getUTCDate());

  if (!hasHadBirthday) {
    age -= 1;
  }

  return age;
}

export function calculateAgeMonths(dateOfBirth: string, rowDate: string) {
  const birth = parseIsoDate(dateOfBirth);
  const row = parseIsoDate(rowDate);

  let months =
    (row.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    (row.getUTCMonth() - birth.getUTCMonth());

  if (row.getUTCDate() < birth.getUTCDate()) {
    months -= 1;
  }

  return Math.max(0, months % 12);
}

export function calculateMonthlyAlphaAccrual(pensionableEarnings: number) {
  return pensionableEarnings * MONTHLY_ALPHA_ACCRUAL_RATE;
}

export function calculateMonthlyStandardAlphaAccrual(
  settings: PensionSettings,
  rowDate: string,
) {
  return isEpaAccrualDate(settings, rowDate)
    ? 0
    : calculateMonthlyAlphaAccrual(settings.pensionableEarnings);
}

export function calculateMonthlyEpaAlphaAccrual(
  settings: PensionSettings,
  rowDate: string,
) {
  return isEpaAccrualDate(settings, rowDate)
    ? calculateMonthlyAlphaAccrual(settings.pensionableEarnings)
    : 0;
}

function isEpaAccrualDate(settings: PensionSettings, rowDate: string) {
  return (
    settings.alphaEpaEnabled &&
    rowDate >= settings.alphaEpaStartDate &&
    rowDate <= settings.alphaEpaEndDate
  );
}

function calculateStartingAlphaPortionsAtStartDate(input: {
  settings: PensionSettings;
  alphaAbsDate: string;
  accrualStopDate: string;
}) {
  const { settings, alphaAbsDate, accrualStopDate } = input;

  if (alphaAbsDate >= settings.startDate) {
    return {
      standardAlphaPension: settings.accruedPensionAtLastAbs,
      epaAlphaPension: 0,
    };
  }

  let standardAlphaPension = settings.accruedPensionAtLastAbs;
  let epaAlphaPension = 0;
  let rowDate = addMonths(alphaAbsDate, 1);

  while (rowDate <= settings.startDate && rowDate <= accrualStopDate) {
    standardAlphaPension += calculateMonthlyStandardAlphaAccrual(settings, rowDate);
    epaAlphaPension += calculateMonthlyEpaAlphaAccrual(settings, rowDate);
    rowDate = addMonths(rowDate, 1);
  }

  return {
    standardAlphaPension,
    epaAlphaPension,
  };
}

export function calculateStartingAlphaPensionAtStartDate(input: {
  alphaPensionAccruedAtLastStatement: number;
  alphaPensionAbsDate: string;
  startDate: string;
  pensionableEarnings: number;
  alphaAccrualRate?: number;
}) {
  const {
    alphaPensionAccruedAtLastStatement,
    alphaPensionAbsDate,
    startDate,
    pensionableEarnings,
    alphaAccrualRate = DEFAULT_ALPHA_ACCRUAL_RATE,
  } = input;
  const monthsBetween = calculateWholeMonthDifference(alphaPensionAbsDate, startDate);
  const additionalAccruedAlpha =
    pensionableEarnings * alphaAccrualRate * (monthsBetween / 12);

  return alphaPensionAccruedAtLastStatement + additionalAccruedAlpha;
}

export function calculateAccruedAlphaPension(
  startingAccruedAlphaPension: number,
  cumulativeMonthlyAccrual: number,
) {
  return startingAccruedAlphaPension + cumulativeMonthlyAccrual;
}

export function calculateAlphaPensionRevaluationFactor(input: {
  fromDate: string;
  rowDate: string;
  activeUntilDate: string;
  cpiPercent: number;
}) {
  const { fromDate, rowDate, activeUntilDate, cpiPercent } = input;
  const cpiRate = cpiPercent / 100;
  const activeRate = cpiRate + 0.016;
  const totalYears = calculateWholeYearDifference(fromDate, rowDate);
  const activeYears = Math.min(
    totalYears,
    calculateWholeYearDifference(fromDate, activeUntilDate),
  );
  const deferredYears = totalYears - activeYears;

  return (1 + activeRate) ** activeYears * (1 + cpiRate) ** deferredYears;
}

function calculateRevaluedAlphaPensionPortions(input: {
  benefitComponents: AlphaBenefitComponent[];
  rowDate: string;
  activeUntilDate: string;
  cpiPercent: number;
}) {
  const { benefitComponents, rowDate, activeUntilDate, cpiPercent } = input;

  return benefitComponents.reduce(
    (totals, component) => {
    const revaluationFactor = calculateAlphaPensionRevaluationFactor({
      fromDate: component.startDate,
      rowDate,
      activeUntilDate,
      cpiPercent,
    });

      const revaluedAmount = component.amount * revaluationFactor;

      if (component.portion === "epa") {
        return {
          ...totals,
          epaAlphaPension: totals.epaAlphaPension + revaluedAmount,
        };
      }

      return {
        ...totals,
        standardAlphaPension: totals.standardAlphaPension + revaluedAmount,
      };
    },
    {
      standardAlphaPension: 0,
      epaAlphaPension: 0,
    },
  );
}

export function calculateMonthlyAddedPension(input: {
  rowDate: string;
  stopDate: string;
  dateOfBirth: string;
  addedPensionMonthlyContribution: number;
  factorType?: "self" | "self_plus_beneficiaries";
}) {
  const {
    rowDate,
    stopDate,
    dateOfBirth,
    addedPensionMonthlyContribution,
    factorType = "self",
  } = input;

  if (rowDate > stopDate) {
    return 0;
  }

  const age = calculateAge(dateOfBirth, rowDate);
  const factor = getAddedPensionFactorForAge(age, factorType);

  if (!factor) {
    return 0;
  }

  const revaluationFactor = getAddedPensionRevaluationFactor(rowDate, stopDate);

  if (!revaluationFactor) {
    return 0;
  }

  return addedPensionMonthlyContribution / (factor * revaluationFactor);
}

export function calculateLumpSumAddedPension(input: {
  rowDate: string;
  previousRowDate?: string;
  dateOfBirth: string;
  lumpSums: AddedPensionLumpSum[];
  factorType?: "self" | "self_plus_beneficiaries";
}) {
  const { rowDate, previousRowDate, dateOfBirth, lumpSums, factorType = "self" } = input;

  return lumpSums.reduce((total, lumpSum) => {
    const matchingPaymentDates = getScheduledPaymentDatesThroughRow(
      lumpSum,
      previousRowDate,
      rowDate,
    );

    const purchasedPension = matchingPaymentDates.reduce((runningTotal, paymentDate) => {
      const age = calculateAge(dateOfBirth, paymentDate);
      const factor = getAddedPensionFactorForAge(age, factorType);

      if (!factor) {
        return runningTotal;
      }

      const revaluationFactor = getAddedPensionRevaluationFactor(paymentDate, lumpSum.endDate);

      if (!revaluationFactor) {
        return runningTotal;
      }

      return runningTotal + lumpSum.amount / (factor * revaluationFactor);
    }, 0);

    return total + purchasedPension;
  }, 0);
}

export function getAddedPensionFactorForAge(
  age: number,
  factorType: "self" | "self_plus_beneficiaries" = "self",
) {
  const match = (addedPensionFactors as AddedPensionFactorRecord[]).find(
    (record) => record.age === age,
  );

  return match?.[factorType] ?? 0;
}

export function getAddedPensionRevaluationFactor(_rowDate: string, _stopDate: string) {
  return 1;
}

export function getEarlyRetirementReductionFactor(
  normalPensionAge: number,
  retirementAge: number,
) {
  const match = (reductionFactors as ReductionFactorRecord[]).find(
    (record) =>
      record.normal_pension_age === normalPensionAge &&
      record.retirement_age === retirementAge,
  );

  if (!match) {
    return 1;
  }

  return match.reduction_factor;
}

export function calculateAnnualAlphaPensionIncludingReduction(
  accruedAlphaPension: number,
  alphaPensionDrawDate: string,
  npaDate: string,
  reductionFactor: number,
) {
  return alphaPensionDrawDate > npaDate
    ? accruedAlphaPension
    : accruedAlphaPension * reductionFactor;
}

export function calculateAnnualAlphaPensionIncludingEpaReduction(input: {
  standardAlphaPension: number;
  epaAlphaPension: number;
  alphaPensionDrawDate: string;
  npaDate: string;
  epaDate: string;
  reductionFactor: number;
  epaReductionFactor: number;
}) {
  const {
    standardAlphaPension,
    epaAlphaPension,
    alphaPensionDrawDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  } = input;
  const standardPensionAfterReduction =
    alphaPensionDrawDate > npaDate
      ? standardAlphaPension
      : standardAlphaPension * reductionFactor;
  const epaPensionAfterReduction =
    alphaPensionDrawDate >= epaDate
      ? epaAlphaPension
      : epaAlphaPension * epaReductionFactor;

  return standardPensionAfterReduction + epaPensionAfterReduction;
}

export function calculateMonthlyAlphaPensionTakeHome(
  rowDate: string,
  alphaPensionDrawDate: string,
  annualAlphaPensionIncludingReduction: number,
) {
  if (rowDate < alphaPensionDrawDate) {
    return 0;
  }

  return annualAlphaPensionIncludingReduction / 12;
}

export function calculateMonthlyAlphaPensionIncludingReduction(
  accruedAlphaPension: number,
  alphaPensionDrawDate: string,
  npaDate: string,
  reductionFactor: number,
) {
  const annualAlphaPensionIncludingReduction =
    alphaPensionDrawDate > npaDate
      ? accruedAlphaPension
      : accruedAlphaPension * reductionFactor;

  return annualAlphaPensionIncludingReduction / 12;
}

export function calculateMonthlyStatePension(
  rowDate: string,
  statePensionStartDate: string,
  annualStatePensionAtDraw: number,
) {
  return rowDate >= statePensionStartDate ? annualStatePensionAtDraw / 12 : 0;
}

export function calculateAnnualStatePensionAtDraw(settings: PensionSettings) {
  if (!settings.showStatePension) {
    return 0;
  }

  if (!settings.statePensionApplyFutureGrowth) {
    return settings.currentStatePension;
  }

  const annualGrowthRate =
    Math.max(
      settings.statePensionCpiPercent,
      settings.statePensionWageGrowthPercent,
      2.5,
    ) / 100;
  const growthYears = calculateWholeYearDifference(
    settings.startDate,
    settings.statePensionDrawDate,
  );

  return settings.currentStatePension * (1 + annualGrowthRate) ** growthYears;
}

export function calculateTotalGrossMonthlyPension(
  monthlyAlphaPensionIncludingReduction: number,
  monthlyStatePension: number,
  monthlySippPension = 0,
  monthlyIsaPension = 0,
) {
  return (
    monthlyAlphaPensionIncludingReduction +
    monthlyStatePension +
    monthlySippPension +
    monthlyIsaPension
  );
}

export function calculateSippPotAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showSipp) {
    return 0;
  }

  if (rowDate < settings.startDate) {
    return 0;
  }

  const contributionMultiplier = settings.sippApplyTaxRelief ? 1.25 : 1;
  const monthlyInterestRate = settings.sippApplyRealInterest
    ? (1 + settings.sippRealInterestPercent / 100) ** (1 / 12) - 1
    : 0;
  const monthlyContribution = settings.sippMonthlyContribution * contributionMultiplier;
  const contributionStopDate = minIsoDate(drawDate, rowDate);
  const contributionMonthCount = calculateWholeMonthDifference(
    settings.startDate,
    contributionStopDate,
  ) + 1;
  const projectionMonthCount = calculateWholeMonthDifference(
    settings.startDate,
    contributionStopDate,
  );
  let pot = settings.sippCurrentPot;
  let previousProjectionMonthDate: string | undefined;

  for (let monthIndex = 0; monthIndex <= projectionMonthCount; monthIndex += 1) {
    const projectionMonthDate = addMonths(settings.startDate, monthIndex);

    if (monthIndex > 0) {
      pot *= 1 + monthlyInterestRate;
    }

    if (monthIndex < contributionMonthCount) {
      pot += monthlyContribution;
    }

    pot += calculateScheduledSippLumpSums({
      lumpSums: settings.sippLumpSums,
      previousRowDate: previousProjectionMonthDate,
      rowDate: projectionMonthDate,
      contributionMultiplier,
    });

    previousProjectionMonthDate = projectionMonthDate;
  }

  return pot;
}

function calculateSippProjectionRow(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate: string;
}) {
  const { settings, rowDate, drawDate, endDate } = input;
  const sippPot = calculateSippPotAtDate({ settings, rowDate, drawDate });
  const potAtDraw = calculateSippPotAtDate({
    settings,
    rowDate: drawDate,
    drawDate,
  });
  const monthlySippPension =
    rowDate >= drawDate
      ? calculateMonthlySippPension({
          potAtDraw,
          drawDate,
          endDate,
          strategy: settings.sippWithdrawalStrategy,
          withdrawalPercent: settings.sippWithdrawalPercent,
        })
      : 0;

  return {
    sippPot,
    monthlySippPension,
  };
}

export function calculateIsaPotAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showIsa) {
    return 0;
  }

  if (rowDate < settings.startDate) {
    return 0;
  }

  const monthlyInterestRate = settings.isaApplyRealInterest
    ? (1 + settings.isaRealInterestPercent / 100) ** (1 / 12) - 1
    : 0;
  const contributionStopDate = minIsoDate(drawDate, rowDate);
  const contributionMonthCount =
    calculateWholeMonthDifference(settings.startDate, contributionStopDate) + 1;
  const projectionMonthCount = calculateWholeMonthDifference(
    settings.startDate,
    contributionStopDate,
  );
  let pot = settings.isaCurrentPot;
  let previousProjectionMonthDate: string | undefined;

  for (let monthIndex = 0; monthIndex <= projectionMonthCount; monthIndex += 1) {
    const projectionMonthDate = addMonths(settings.startDate, monthIndex);

    if (monthIndex > 0) {
      pot *= 1 + monthlyInterestRate;
    }

    if (monthIndex < contributionMonthCount) {
      pot += settings.isaMonthlyContribution;
    }

    pot += calculateScheduledIsaLumpSums({
      lumpSums: settings.isaLumpSums,
      previousRowDate: previousProjectionMonthDate,
      rowDate: projectionMonthDate,
    });

    previousProjectionMonthDate = projectionMonthDate;
  }

  return pot;
}

function calculateIsaProjectionRow(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate: string;
}) {
  const { settings, rowDate, drawDate, endDate } = input;
  const isaPot = calculateIsaPotAtDate({ settings, rowDate, drawDate });
  const potAtDraw = calculateIsaPotAtDate({ settings, rowDate: drawDate, drawDate });
  const monthlyIsaPension =
    rowDate >= drawDate
      ? calculateMonthlyIsaPension({
          potAtDraw,
          drawDate,
          endDate,
          strategy: settings.isaWithdrawalStrategy,
          withdrawalPercent: settings.isaWithdrawalPercent,
        })
      : 0;

  return {
    isaPot,
    monthlyIsaPension,
  };
}

export function calculateMonthlyIsaPension(input: {
  potAtDraw: number;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["isaWithdrawalStrategy"];
  withdrawalPercent: number;
}) {
  const { potAtDraw, drawDate, endDate, strategy, withdrawalPercent } = input;

  if (strategy === "percentage") {
    return (potAtDraw * (withdrawalPercent / 100)) / 12;
  }

  const drawdownMonths = Math.max(1, calculateWholeMonthDifference(drawDate, endDate));
  return potAtDraw / drawdownMonths;
}

export function calculateMonthlySippPension(input: {
  potAtDraw: number;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["sippWithdrawalStrategy"];
  withdrawalPercent: number;
}) {
  const { potAtDraw, drawDate, endDate, strategy, withdrawalPercent } = input;

  if (strategy === "percentage") {
    return (potAtDraw * (withdrawalPercent / 100)) / 12;
  }

  const drawdownMonths = Math.max(1, calculateWholeMonthDifference(drawDate, endDate));
  return potAtDraw / drawdownMonths;
}

function calculateTotalSippContributionsAfterTaxRelief(
  settings: PensionSettings,
  drawDate: string,
) {
  if (!settings.showSipp) {
    return 0;
  }

  if (drawDate < settings.startDate) {
    return 0;
  }

  const contributionMultiplier = settings.sippApplyTaxRelief ? 1.25 : 1;
  const contributionMonthCount =
    calculateWholeMonthDifference(settings.startDate, drawDate) + 1;

  return (
    calculateSippLumpSumsThroughDate(settings.sippLumpSums, drawDate) *
      contributionMultiplier +
    settings.sippMonthlyContribution * contributionMultiplier * contributionMonthCount
  );
}

function calculateTotalIsaContributions(settings: PensionSettings, drawDate: string) {
  if (!settings.showIsa) {
    return 0;
  }

  if (drawDate < settings.startDate) {
    return 0;
  }

  const contributionMonthCount =
    calculateWholeMonthDifference(settings.startDate, drawDate) + 1;

  return (
    calculateIsaLumpSumsThroughDate(settings.isaLumpSums, drawDate) +
    settings.isaMonthlyContribution * contributionMonthCount
  );
}

function calculateScheduledSippLumpSums(input: {
  lumpSums: AddedPensionLumpSum[];
  previousRowDate?: string;
  rowDate: string;
  contributionMultiplier: number;
}) {
  const { lumpSums, previousRowDate, rowDate, contributionMultiplier } = input;

  return lumpSums.reduce((total, lumpSum) => {
    const matchingPaymentDates = getScheduledPaymentDatesThroughRow(
      lumpSum,
      previousRowDate,
      rowDate,
    );

    return total + matchingPaymentDates.length * lumpSum.amount * contributionMultiplier;
  }, 0);
}

function calculateScheduledIsaLumpSums(input: {
  lumpSums: AddedPensionLumpSum[];
  previousRowDate?: string;
  rowDate: string;
}) {
  const { lumpSums, previousRowDate, rowDate } = input;

  return lumpSums.reduce((total, lumpSum) => {
    const matchingPaymentDates = getScheduledPaymentDatesThroughRow(
      lumpSum,
      previousRowDate,
      rowDate,
    );

    return total + matchingPaymentDates.length * lumpSum.amount;
  }, 0);
}

function calculateSippLumpSumsThroughDate(
  lumpSums: AddedPensionLumpSum[],
  rowDate: string,
) {
  return lumpSums.reduce(
    (total, lumpSum) =>
      total +
      getScheduledPaymentDates(lumpSum).filter((paymentDate) => paymentDate <= rowDate)
        .length *
        lumpSum.amount,
    0,
  );
}

function calculateIsaLumpSumsThroughDate(
  lumpSums: AddedPensionLumpSum[],
  rowDate: string,
) {
  return lumpSums.reduce(
    (total, lumpSum) =>
      total +
      getScheduledPaymentDates(lumpSum).filter((paymentDate) => paymentDate <= rowDate)
        .length *
        lumpSum.amount,
    0,
  );
}

export function generateMilestoneDefinitions(
  startDate: string,
  alphaPensionStopDate: string,
  alphaPensionDrawDate: string,
  sippDrawDate: string,
  isaDrawDate: string,
  statePensionStartDate: string,
  lifeExpectancyDate: string,
  lumpSums: AddedPensionLumpSum[] = [],
  alphaAbsDate?: string,
  sippLumpSums: AddedPensionLumpSum[] = [],
  isaLumpSums: AddedPensionLumpSum[] = [],
  includeStatePension = true,
): MilestoneDefinition[] {
  return [
    ...(alphaAbsDate ? [{ date: alphaAbsDate, label: LAST_ABS_STATEMENT_LABEL }] : []),
    { date: startDate, label: CALCULATION_START_LABEL },
    { date: alphaPensionStopDate, label: STOPS_ALPHA_ACCRUAL_LABEL },
    { date: alphaPensionDrawDate, label: STARTS_ALPHA_PENSION_LABEL },
    ...(sippDrawDate ? [{ date: sippDrawDate, label: STARTS_SIPP_LABEL }] : []),
    ...(isaDrawDate ? [{ date: isaDrawDate, label: STARTS_ISA_LABEL }] : []),
    ...(includeStatePension
      ? [{ date: statePensionStartDate, label: STARTS_STATE_PENSION_LABEL }]
      : []),
    { date: lifeExpectancyDate, label: LIFE_EXPECTANCY_LABEL },
    ...generateLumpSumMilestoneDefinitions(lumpSums),
    ...generateSippLumpSumMilestoneDefinitions(sippLumpSums),
    ...generateIsaLumpSumMilestoneDefinitions(isaLumpSums),
  ];
}

export function buildMilestoneMap(
  milestones: MilestoneDefinition[],
  startDate: string,
  endDate: string,
) {
  return buildMilestoneMapForRowDates(
    milestones,
    generateMonthlyDateRange(startDate, endDate),
  );
}

export function addYears(date: string, years: number) {
  const parsed = parseIsoDate(date);
  const year = parsed.getUTCFullYear() + years;
  const month = parsed.getUTCMonth();
  const day = Math.min(parsed.getUTCDate(), getDaysInMonth(year, month));

  return formatIsoDate(new Date(Date.UTC(year, month, day)));
}

export function addMonths(date: string, months: number) {
  const parsed = parseIsoDate(date);
  const monthIndex = parsed.getUTCMonth() + months;
  const year = parsed.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(parsed.getUTCDate(), getDaysInMonth(year, month));

  return formatIsoDate(new Date(Date.UTC(year, month, day)));
}

function getScheduledPaymentDatesThroughRow(
  lumpSum: AddedPensionLumpSum,
  previousRowDate: string | undefined,
  rowDate: string,
) {
  return getScheduledPaymentDates(lumpSum).filter(
    (scheduledDate) =>
      scheduledDate <= rowDate && (!previousRowDate || scheduledDate > previousRowDate),
  );
}

function getScheduledPaymentDates(lumpSum: AddedPensionLumpSum) {
  const dates: string[] = [];
  let scheduledDate = lumpSum.startDate;

  while (scheduledDate <= lumpSum.endDate) {
    dates.push(scheduledDate);

    if (lumpSum.cadence === "once") {
      break;
    }

    scheduledDate = addYears(scheduledDate, 1);
  }

  return dates;
}

function generateLumpSumMilestoneDefinitions(lumpSums: AddedPensionLumpSum[]) {
  return lumpSums.flatMap((lumpSum) =>
    getScheduledPaymentDates(lumpSum).map((date) => ({
      date,
      label: formatLumpSumMilestoneLabel(lumpSum.amount),
    })),
  );
}

function generateSippLumpSumMilestoneDefinitions(lumpSums: AddedPensionLumpSum[]) {
  return lumpSums.flatMap((lumpSum) =>
    getScheduledPaymentDates(lumpSum).map((date) => ({
      date,
      label: formatSippLumpSumMilestoneLabel(lumpSum.amount),
    })),
  );
}

function generateIsaLumpSumMilestoneDefinitions(lumpSums: AddedPensionLumpSum[]) {
  return lumpSums.flatMap((lumpSum) =>
    getScheduledPaymentDates(lumpSum).map((date) => ({
      date,
      label: formatIsaLumpSumMilestoneLabel(lumpSum.amount),
    })),
  );
}

function formatLumpSumMilestoneLabel(amount: number) {
  return `${LUMP_SUM_ADDED_PENSION_LABEL} (${formatWholeCurrency(amount)})`;
}

function formatSippLumpSumMilestoneLabel(amount: number) {
  return `${SIPP_LUMP_SUM_LABEL} (${formatWholeCurrency(amount)})`;
}

function formatIsaLumpSumMilestoneLabel(amount: number) {
  return `${ISA_LUMP_SUM_LABEL} (${formatWholeCurrency(amount)})`;
}

function formatWholeCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function minIsoDate(firstDate: string, secondDate: string) {
  return firstDate <= secondDate ? firstDate : secondDate;
}

function createHistoricalProjectionRows(input: {
  settings: PensionSettings;
  alphaAbsDate: string;
  drawDate: string;
  accrualStopDate: string;
  addedPensionStopDate: string;
  npaDate: string;
  epaDate: string;
  reductionFactor: number;
  epaReductionFactor: number;
}) {
  const {
    settings,
    alphaAbsDate,
    drawDate,
    accrualStopDate,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  } = input;

  if (alphaAbsDate >= settings.startDate) {
    return [];
  }

  const rows: ProjectionRowWithoutMilestones[] = [];
  let rowDate = alphaAbsDate;
  let previousRowDate: string | undefined;
  let cumulativeLumpSumAddedPension = 0;
  let cumulativeStandardAlphaPension = settings.accruedPensionAtLastAbs;
  let cumulativeEpaAlphaPension = 0;

  while (rowDate < settings.startDate) {
    const age = calculateAge(settings.dateOfBirth, rowDate);
    const ageMonths = calculateAgeMonths(settings.dateOfBirth, rowDate);
    const monthlyAddedPension = calculateMonthlyAddedPension({
      rowDate,
      stopDate: addedPensionStopDate,
      dateOfBirth: settings.dateOfBirth,
      addedPensionMonthlyContribution: settings.alphaAddedPensionMonthly,
    });
    const lumpSumAddedPension = calculateLumpSumAddedPension({
      rowDate,
      previousRowDate,
      dateOfBirth: settings.dateOfBirth,
      lumpSums: settings.alphaAddedPensionLumpSums,
    });
    cumulativeLumpSumAddedPension += lumpSumAddedPension;
    if (rowDate > alphaAbsDate && rowDate <= accrualStopDate) {
      cumulativeStandardAlphaPension += calculateMonthlyStandardAlphaAccrual(
        settings,
        rowDate,
      );
      cumulativeEpaAlphaPension += calculateMonthlyEpaAlphaAccrual(settings, rowDate);
    }
    const annualAccruedAlphaPensionIncludingLumpSums =
      cumulativeStandardAlphaPension +
      cumulativeEpaAlphaPension +
      cumulativeLumpSumAddedPension;
    const annualStandardAlphaPension =
      cumulativeStandardAlphaPension + cumulativeLumpSumAddedPension;
    const annualEpaAlphaPension = cumulativeEpaAlphaPension;
    const annualAlphaPensionIncludingReduction =
      calculateAnnualAlphaPensionIncludingEpaReduction({
        standardAlphaPension: annualStandardAlphaPension,
        epaAlphaPension: annualEpaAlphaPension,
        alphaPensionDrawDate: drawDate,
        npaDate,
        epaDate,
        reductionFactor,
        epaReductionFactor,
      });
    const monthlyAlphaPensionTakeHome = calculateMonthlyAlphaPensionTakeHome(
      rowDate,
      drawDate,
      annualAlphaPensionIncludingReduction,
    );
    const monthlyStatePension = calculateMonthlyStatePension(
      rowDate,
      settings.statePensionDrawDate,
      calculateAnnualStatePensionAtDraw(settings),
    );

    rows.push({
      date: rowDate,
      age,
      ageMonths,
      monthlyAddedPension,
      lumpSumAddedPension,
      annualStandardAlphaPension,
      annualEpaAlphaPension,
      annualAccruedAlphaPension: annualAccruedAlphaPensionIncludingLumpSums,
      annualAlphaPensionIncludingReduction,
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
      sippPot: 0,
      monthlySippPension: 0,
      isaPot: 0,
      monthlyIsaPension: 0,
      totalMonthlyPensionTakeHomePay: calculateTotalGrossMonthlyPension(
        monthlyAlphaPensionTakeHome,
        monthlyStatePension,
      ),
    });

    previousRowDate = rowDate;
    rowDate = addMonths(rowDate, 1);
  }

  return rows;
}

function buildMilestoneMapForRowDates(
  milestones: MilestoneDefinition[],
  rows: string[],
) {
  const milestoneMap = new Map<string, string[]>();

  for (const milestone of milestones) {
    const matchingRowDate = rows.find((rowDate) => rowDate >= milestone.date);

    if (!matchingRowDate) {
      continue;
    }

    const existingMilestones = milestoneMap.get(matchingRowDate) ?? [];
    milestoneMap.set(matchingRowDate, [...existingMilestones, milestone.label]);
  }

  return milestoneMap;
}

function buildMilestoneDateMapForRowDates(
  milestones: MilestoneDefinition[],
  rows: string[],
) {
  const milestoneMap = new Map<string, string[]>();

  for (const milestone of milestones) {
    const matchingRowDate = rows.find((rowDate) => rowDate >= milestone.date);

    if (!matchingRowDate) {
      continue;
    }

    const existingMilestones = milestoneMap.get(matchingRowDate) ?? [];
    milestoneMap.set(matchingRowDate, [...existingMilestones, milestone.date]);
  }

  return milestoneMap;
}

function findFirstRowAtOrAfterDate(tableData: ProjectionRow[], milestoneDate: string) {
  return tableData.find((row) => row.date >= milestoneDate);
}

function calculateYearDifference(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const monthDifference =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());
  const dayAdjustment = (end.getUTCDate() - start.getUTCDate()) / 30;

  return Number(((monthDifference + dayAdjustment) / 12).toFixed(1));
}

export function calculateWholeMonthDifference(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const monthDifference =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());

  return Math.max(0, monthDifference);
}

function calculateWholeYearDifference(startDate: string, endDate: string) {
  if (endDate < startDate) {
    return 0;
  }

  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  const hasReachedAnniversary =
    end.getUTCMonth() > start.getUTCMonth() ||
    (end.getUTCMonth() === start.getUTCMonth() &&
      end.getUTCDate() >= start.getUTCDate());

  if (!hasReachedAnniversary) {
    years -= 1;
  }

  return Math.max(0, years);
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
