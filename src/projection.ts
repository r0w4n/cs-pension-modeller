import addedPensionFactors from "./data/alpha_pension_added_pension_factors.json";
import reductionFactors from "./data/alpha_pension_reduction_factors.json";
import {
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
  monthlyAddedPension: number;
  lumpSumAddedPension: number;
  annualAccruedAlphaPension: number;
  annualAlphaPensionIncludingReduction: number;
  monthlyAlphaPensionTakeHome: number;
  monthlyStatePension: number;
  totalMonthlyPensionTakeHomePay: number;
};

export type PensionSummary = {
  keyDates: {
    stopsAlphaAccrual: string;
    startsAlphaPension: string;
    startsStatePension: string;
  };
  alphaPension: {
    annualAtDraw: number;
    monthlyAtDraw: number;
    maximumAnnualAccrued: number;
    totalAddedAfterToday: number;
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
};

const MONTHLY_ALPHA_ACCRUAL_RATE = 0.0232 / 12;
const CALCULATION_START_LABEL = "Calculation start";
const LAST_ABS_STATEMENT_LABEL = "Last ABS";
const STOPS_ALPHA_ACCRUAL_LABEL = "Leave Alpha Pension Scheme";
const STARTS_ALPHA_PENSION_LABEL = "Starts Drawing Alpha Pension";
const STARTS_STATE_PENSION_LABEL = "Starts Drawing State Pension";
const LIFE_EXPECTANCY_LABEL = "Life expectancy";
const LUMP_SUM_ADDED_PENSION_LABEL = "Lump Sum Added Pension";
const DEFAULT_ALPHA_ACCRUAL_RATE = 0.0232;

type MilestoneDefinition = {
  date: string;
  label: string;
};

type ProjectionRowWithoutMilestones = Omit<ProjectionRow, "milestones">;

export type DerivedProjectionInputs = {
  endDate: string;
  drawDate: string;
  alphaStopDate: string;
  accrualStopDate: string;
  addedPensionStopDate: string;
  npaDate: string;
  reductionFactor: number;
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
  const reductionFactor =
    drawDate > npaDate
      ? 1
      : getEarlyRetirementReductionFactor(
          settings.normalPensionAge,
          settings.alphaPensionDrawAge,
        );

  return {
    endDate,
    drawDate,
    alphaStopDate,
    accrualStopDate,
    addedPensionStopDate,
    npaDate,
    reductionFactor,
  };
}

export function createProjectionTable(settings: PensionSettings): ProjectionRow[] {
  const derivedInputs = deriveProjectionInputs(settings);

  if (!derivedInputs) {
    return [];
  }

  const {
    endDate,
    drawDate,
    accrualStopDate,
    addedPensionStopDate,
    npaDate,
    reductionFactor,
  } = derivedInputs;
  const alphaAbsDate = resolveAlphaAbsDate(settings.alphaPensionAbsDate);

  const startingAlphaPensionAtStartDate = calculateStartingAlphaPensionAtStartDate({
    alphaPensionAccruedAtLastStatement: settings.accruedPensionAtLastAbs,
    alphaPensionAbsDate: alphaAbsDate,
    startDate: settings.startDate,
    pensionableEarnings: settings.pensionableEarnings,
    alphaAccrualRate: DEFAULT_ALPHA_ACCRUAL_RATE,
  });
  let cumulativeMonthlyAccrual = 0;
  const historicalRows = createHistoricalProjectionRows({
    settings,
    alphaAbsDate,
    drawDate,
    accrualStopDate,
    addedPensionStopDate,
    npaDate,
    reductionFactor,
  });
  let cumulativeLumpSumAddedPension = historicalRows.reduce(
    (total, row) => total + row.lumpSumAddedPension,
    0,
  );
  let previousRowDate: string | undefined;

  const projectionRows = generateMonthlyDateRange(settings.startDate, endDate).map((rowDate) => {
    const age = calculateAge(settings.dateOfBirth, rowDate);
    const ageMonths = calculateAgeMonths(settings.dateOfBirth, rowDate);
    const monthlyAlphaAccrual =
      rowDate <= accrualStopDate
        ? calculateMonthlyAlphaAccrual(settings.pensionableEarnings)
        : 0;

    cumulativeMonthlyAccrual += monthlyAlphaAccrual;

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
    cumulativeLumpSumAddedPension += lumpSumAddedPensionPurchasedThisRow;
    const annualAccruedAlphaPension = calculateAccruedAlphaPension(
      startingAlphaPensionAtStartDate,
      cumulativeMonthlyAccrual + cumulativeLumpSumAddedPension,
    );
    const annualAlphaPensionIncludingReduction =
      calculateAnnualAlphaPensionIncludingReduction(
        annualAccruedAlphaPension,
        drawDate,
        npaDate,
        reductionFactor,
      );
    const monthlyAlphaPensionTakeHome = calculateMonthlyAlphaPensionTakeHome(
      rowDate,
      drawDate,
      annualAlphaPensionIncludingReduction,
    );
    const monthlyStatePension = calculateMonthlyStatePension(
      rowDate,
      settings.statePensionDrawDate,
      settings.currentStatePension,
    );
    const totalMonthlyPensionTakeHomePay = calculateTotalGrossMonthlyPension(
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
    );

    const projectionRow = {
      date: rowDate,
      age,
      ageMonths,
      monthlyAddedPension,
      lumpSumAddedPension: lumpSumAddedPensionPurchasedThisRow,
      annualAccruedAlphaPension,
      annualAlphaPensionIncludingReduction,
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
      totalMonthlyPensionTakeHomePay,
    };

    previousRowDate = rowDate;

    return projectionRow;
  });

  const allRows = [...historicalRows, ...projectionRows];
  const milestoneRows = buildMilestoneMapForRowDates(
    generateMilestoneDefinitions(
      settings.startDate,
      accrualStopDate,
      drawDate,
      settings.statePensionDrawDate,
      endDate,
      settings.alphaAddedPensionLumpSums,
      alphaAbsDate,
    ),
    allRows.map((row) => row.date),
  );

  return allRows.map((row) => ({
    ...row,
    milestones: milestoneRows.get(row.date) ?? [],
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
    const alphaAccrualStopDate = minIsoDate(
      alphaPensionDrawDate,
      addYears(settings.dateOfBirth, settings.alphaPensionLeaveAge),
    );

    return {
      keyDates: {
        stopsAlphaAccrual: alphaAccrualStopDate,
        startsAlphaPension: alphaPensionDrawDate,
        startsStatePension: settings.statePensionDrawDate,
      },
      alphaPension: {
        annualAtDraw: 0,
        monthlyAtDraw: 0,
        maximumAnnualAccrued: 0,
        totalAddedAfterToday: 0,
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
    };
  }

  const alphaPensionDrawDate = addYears(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge,
  );
  const alphaAccrualStopDate = minIsoDate(
    alphaPensionDrawDate,
    addYears(settings.dateOfBirth, settings.alphaPensionLeaveAge),
  );
  const statePensionStartDate = settings.statePensionDrawDate;
  const alphaDrawRow =
    findFirstRowAtOrAfterDate(tableData, alphaPensionDrawDate) ?? tableData.at(-1);
  const statePensionRow =
    findFirstRowAtOrAfterDate(tableData, statePensionStartDate) ?? tableData.at(-1);
  const maximumAnnualAccrued = Math.max(...tableData.map((row) => row.annualAccruedAlphaPension));
  const totalAddedAfterToday = maximumAnnualAccrued - startingAlphaPensionAtStartDate;

  return {
    keyDates: {
      stopsAlphaAccrual: alphaAccrualStopDate,
      startsAlphaPension: alphaPensionDrawDate,
      startsStatePension: statePensionStartDate,
    },
    alphaPension: {
      annualAtDraw: alphaDrawRow?.annualAlphaPensionIncludingReduction ?? 0,
      monthlyAtDraw: alphaDrawRow?.monthlyAlphaPensionTakeHome ?? 0,
      maximumAnnualAccrued,
      totalAddedAfterToday,
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
  currentFullStatePension: number,
) {
  return rowDate >= statePensionStartDate ? currentFullStatePension / 12 : 0;
}

export function calculateTotalGrossMonthlyPension(
  monthlyAlphaPensionIncludingReduction: number,
  monthlyStatePension: number,
) {
  return monthlyAlphaPensionIncludingReduction + monthlyStatePension;
}

export function generateMilestoneDefinitions(
  startDate: string,
  alphaPensionStopDate: string,
  alphaPensionDrawDate: string,
  statePensionStartDate: string,
  lifeExpectancyDate: string,
  lumpSums: AddedPensionLumpSum[] = [],
  alphaAbsDate?: string,
): MilestoneDefinition[] {
  return [
    ...(alphaAbsDate ? [{ date: alphaAbsDate, label: LAST_ABS_STATEMENT_LABEL }] : []),
    { date: startDate, label: CALCULATION_START_LABEL },
    { date: alphaPensionStopDate, label: STOPS_ALPHA_ACCRUAL_LABEL },
    { date: alphaPensionDrawDate, label: STARTS_ALPHA_PENSION_LABEL },
    { date: statePensionStartDate, label: STARTS_STATE_PENSION_LABEL },
    { date: lifeExpectancyDate, label: LIFE_EXPECTANCY_LABEL },
    ...generateLumpSumMilestoneDefinitions(lumpSums),
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

function formatLumpSumMilestoneLabel(amount: number) {
  return `${LUMP_SUM_ADDED_PENSION_LABEL} (${formatWholeCurrency(amount)})`;
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
  reductionFactor: number;
}) {
  const {
    settings,
    alphaAbsDate,
    drawDate,
    accrualStopDate,
    addedPensionStopDate,
    npaDate,
    reductionFactor,
  } = input;

  if (alphaAbsDate >= settings.startDate) {
    return [];
  }

  const rows: ProjectionRowWithoutMilestones[] = [];
  let rowDate = alphaAbsDate;
  let previousRowDate: string | undefined;
  let cumulativeLumpSumAddedPension = 0;

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
    const annualAccruedAlphaPension = calculateStartingAlphaPensionAtStartDate({
      alphaPensionAccruedAtLastStatement: settings.accruedPensionAtLastAbs,
      alphaPensionAbsDate: alphaAbsDate,
      startDate: rowDate <= accrualStopDate ? rowDate : accrualStopDate,
      pensionableEarnings: settings.pensionableEarnings,
      alphaAccrualRate: DEFAULT_ALPHA_ACCRUAL_RATE,
    });
    const annualAccruedAlphaPensionIncludingLumpSums =
      annualAccruedAlphaPension + cumulativeLumpSumAddedPension;
    const annualAlphaPensionIncludingReduction =
      calculateAnnualAlphaPensionIncludingReduction(
        annualAccruedAlphaPensionIncludingLumpSums,
        drawDate,
        npaDate,
        reductionFactor,
      );
    const monthlyAlphaPensionTakeHome = calculateMonthlyAlphaPensionTakeHome(
      rowDate,
      drawDate,
      annualAlphaPensionIncludingReduction,
    );
    const monthlyStatePension = calculateMonthlyStatePension(
      rowDate,
      settings.statePensionDrawDate,
      settings.currentStatePension,
    );

    rows.push({
      date: rowDate,
      age,
      ageMonths,
      monthlyAddedPension,
      lumpSumAddedPension,
      annualAccruedAlphaPension: annualAccruedAlphaPensionIncludingLumpSums,
      annualAlphaPensionIncludingReduction,
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
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
