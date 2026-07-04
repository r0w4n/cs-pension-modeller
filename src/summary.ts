import { calculateNormalPensionAge, type PensionSettings } from "./settings";
import { calculateTotalIsaContributions } from "./projection-domains/isa";
import { calculateTotalLisaContributionsWithBonus } from "./projection-domains/lisa";
import { NUVOS_FINAL_PENSIONABLE_SERVICE_DATE } from "./projection-domains/nuvos";
import { calculatePremiumPension } from "./projection-domains/premium";
import { calculateTotalSippContributionsAfterTaxRelief } from "./projection-domains/sipp";
import { calculateMonthlyIncomeTax } from "./projection-domains/tax";
import { calculateRetirementIncomeTargetAtDate } from "./projection-domains/inflation";
import {
  addYears,
  calculateAge,
  calculateYearDifference,
  createProjectionRuntimeDates,
  deriveProjectionInputs,
} from "./derive-inputs";
import { calculateStartingAlphaPortionsAtStartDate } from "./row-assembly";
import type {
  BridgeWithdrawalSource,
  PensionSummary,
  ProjectionRow,
  RetirementIncomeAgeRange,
  RetirementIncomeSource,
  RetirementIncomeSummary,
} from "./projection-core";

const ACTIVE_INCOME_EPSILON = 0.005;

export function generatePensionSummary(
  tableData: ProjectionRow[],
  settings: PensionSettings
): PensionSummary {
  const derivedInputs = deriveProjectionInputs(settings);

  if (!derivedInputs) {
    return createEmptySummary(settings);
  }

  const { alphaAbsDate } = createProjectionRuntimeDates(settings);
  const {
    drawDate: alphaPensionDrawDate,
    accrualStopDate: alphaAccrualStopDate,
    nuvosDrawDate: nuvosPensionDrawDate,
    nuvosAccrualStopDate,
    premiumDrawDate,
    reductionFactor,
  } = derivedInputs;
  const summaryDates = buildSummaryDates(settings, {
    alphaPensionDrawDate,
    alphaAccrualStopDate,
    nuvosPensionDrawDate,
    nuvosAccrualStopDate,
    premiumDrawDate,
  });
  const baseSummaryContext = buildSummaryBaseContext(settings, {
    alphaAbsDate,
    alphaAccrualStopDate,
    reductionFactor,
  });

  if (tableData.length === 0) {
    return createSummaryResponse({
      settings,
      ...summaryDates,
      ...baseSummaryContext,
      alphaAtDraw: 0,
      alphaMonthlyAtDraw: 0,
      maximumAnnualAccrued: 0,
      totalAddedAfterToday: 0,
      nuvosAtDraw: 0,
      nuvosMonthlyAtDraw: 0,
      maximumAnnualNuvosAccrued: 0,
      premiumAtDraw: 0,
      premiumMonthlyAtDraw: 0,
      premiumCpiRevaluedAnnualAtDraw: 0,
      premiumEarlyRetirementFactor: null,
      premiumIsReducedForEarlyPayment: false,
      premiumFactorUnavailable: false,
      sippPotAtDraw: 0,
      sippMonthlyAtDraw: 0,
      isaPotAtDraw: 0,
      isaMonthlyAtDraw: 0,
      lisaPotAtDraw: 0,
      lisaMonthlyAtDraw: 0,
      monthlyAtAlphaStart: 0,
      monthlyAtStateStart: 0,
      monthlyStatePension: 0,
      retirementIncome: buildRetirementIncomeSummary({
        summaryDate: settings.startDate,
        alphaMonthlyIncome: 0,
        nuvosMonthlyIncome: 0,
        premiumMonthlyIncome: 0,
        sippMonthlyIncome: 0,
        isaMonthlyIncome: 0,
        lisaMonthlyIncome: 0,
        statePensionMonthlyIncome: 0,
        monthlyIncomeTax: 0,
        bridgeWithdrawals: [],
        ageRanges: [],
        settings,
      }),
    });
  }

  const rowSummaryContext = buildRowSummaryContext(tableData, settings, {
    ...summaryDates,
    startingAlphaPensionAtStartDate:
      baseSummaryContext.startingAlphaPensionAtStartDate,
  });

  return createSummaryResponse({
    settings,
    ...summaryDates,
    ...baseSummaryContext,
    ...rowSummaryContext,
  });
}

function buildSummaryDates(
  settings: PensionSettings,
  dates: {
    alphaPensionDrawDate: string;
    alphaAccrualStopDate: string;
    nuvosPensionDrawDate: string;
    nuvosAccrualStopDate: string;
    premiumDrawDate: string;
  }
) {
  return {
    ...dates,
    sippDrawDate: addYears(settings.dateOfBirth, settings.sippDrawAge),
    isaDrawDate: addYears(settings.dateOfBirth, settings.isaDrawAge),
    lisaDrawDate: addYears(settings.dateOfBirth, settings.lisaDrawAge),
    premiumDrawDate: dates.premiumDrawDate,
    statePensionStartDate: settings.statePensionDrawDate,
  };
}

function buildSummaryBaseContext(
  settings: PensionSettings,
  input: {
    alphaAbsDate: string;
    alphaAccrualStopDate: string;
    reductionFactor: number;
  }
) {
  const startingAlphaPortionsAtStartDate =
    calculateStartingAlphaPortionsAtStartDate({
      settings,
      alphaAbsDate: input.alphaAbsDate,
      accrualStopDate: input.alphaAccrualStopDate,
    });

  return {
    normalPensionAge: calculateNormalPensionAge(settings.dateOfBirth),
    reductionFactor: input.reductionFactor,
    startingAlphaPensionAtStartDate:
      startingAlphaPortionsAtStartDate.standardAlphaPension +
      startingAlphaPortionsAtStartDate.epaAlphaPension,
  };
}

function buildRowSummaryContext(
  tableData: ProjectionRow[],
  settings: PensionSettings,
  input: {
    alphaPensionDrawDate: string;
    nuvosPensionDrawDate: string;
    premiumDrawDate: string;
    sippDrawDate: string;
    isaDrawDate: string;
    lisaDrawDate: string;
    statePensionStartDate: string;
    startingAlphaPensionAtStartDate: number;
  }
) {
  const drawRows = {
    alphaDrawRow: findFirstRowAtOrAfterDate(
      tableData,
      input.alphaPensionDrawDate
    ),
    nuvosDrawRow: findFirstRowAtOrAfterDate(
      tableData,
      input.nuvosPensionDrawDate
    ),
    premiumDrawRow: findFirstRowAtOrAfterDate(tableData, input.premiumDrawDate),
    statePensionRow: findFirstRowAtOrAfterDate(
      tableData,
      input.statePensionStartDate
    ),
    sippDrawRow: findFirstRowAtOrAfterDate(tableData, input.sippDrawDate),
    isaDrawRow: findFirstRowAtOrAfterDate(tableData, input.isaDrawDate),
    lisaDrawRow: findFirstRowAtOrAfterDate(tableData, input.lisaDrawDate),
  };
  const flexibleIncomeRows = {
    sippIncomeRow: findFirstDrawdownRowAtOrAfterDate(
      tableData,
      input.sippDrawDate,
      "monthlySippPension"
    ),
    isaIncomeRow: findFirstDrawdownRowAtOrAfterDate(
      tableData,
      input.isaDrawDate,
      "monthlyIsaPension"
    ),
    lisaIncomeRow: findFirstDrawdownRowAtOrAfterDate(
      tableData,
      input.lisaDrawDate,
      "monthlyLisaPension"
    ),
  };
  const summaryRow = findRetirementIncomeSummaryRow(tableData, settings, {
    alphaPensionDrawDate: input.alphaPensionDrawDate,
    nuvosPensionDrawDate: input.nuvosPensionDrawDate,
    premiumPensionDrawDate: input.premiumDrawDate,
    statePensionStartDate: input.statePensionStartDate,
    sippIncomeRow: flexibleIncomeRows.sippIncomeRow,
    isaIncomeRow: flexibleIncomeRows.isaIncomeRow,
    lisaIncomeRow: flexibleIncomeRows.lisaIncomeRow,
  });
  const maximumAnnualAccrued = Math.max(
    ...tableData.map((row) => row.annualAccruedAlphaPension)
  );
  const maximumAnnualNuvosAccrued = settings.showNuvos
    ? Math.max(...tableData.map((row) => row.annualNuvosPension))
    : 0;
  const retirementIncome = buildRowRetirementIncomeSummary(settings, {
    ...drawRows,
    ...flexibleIncomeRows,
    summaryRow,
    ageRanges: buildRetirementIncomeAgeRanges(tableData, settings),
  });
  const premiumCalculation = calculatePremiumPension({
    annualPensionAtValuationDate: settings.premiumAnnualPensionAtValuationDate,
    valuationDate: settings.premiumValuationDate,
    dateOfBirth: settings.dateOfBirth,
    drawAge: settings.premiumDrawAge,
    normalPensionAge: settings.premiumNormalPensionAge,
    cpiAssumption:
      settings.projectionBasis === "real"
        ? 0
        : settings.inflationRateAnnual / 100,
  });

  return {
    alphaAtDraw:
      drawRows.alphaDrawRow?.annualAlphaPensionIncludingReduction ?? 0,
    alphaMonthlyAtDraw: drawRows.alphaDrawRow?.monthlyAlphaPensionGross ?? 0,
    maximumAnnualAccrued,
    totalAddedAfterToday:
      maximumAnnualAccrued - input.startingAlphaPensionAtStartDate,
    nuvosAtDraw:
      drawRows.nuvosDrawRow?.annualNuvosPensionIncludingReduction ?? 0,
    nuvosMonthlyAtDraw: drawRows.nuvosDrawRow?.monthlyNuvosPensionGross ?? 0,
    maximumAnnualNuvosAccrued,
    premiumAtDraw:
      drawRows.premiumDrawRow?.annualPremiumPensionIncludingReduction ?? 0,
    premiumMonthlyAtDraw:
      drawRows.premiumDrawRow?.monthlyPremiumPensionGross ?? 0,
    premiumCpiRevaluedAnnualAtDraw:
      premiumCalculation.cpiRevaluedPensionAtDrawAge,
    premiumEarlyRetirementFactor: premiumCalculation.earlyRetirementFactor,
    premiumIsReducedForEarlyPayment:
      premiumCalculation.isReducedForEarlyPayment,
    premiumFactorUnavailable: premiumCalculation.factorUnavailable,
    sippPotAtDraw: drawRows.sippDrawRow?.sippPot ?? 0,
    sippMonthlyAtDraw:
      flexibleIncomeRows.sippIncomeRow?.monthlySippPension ?? 0,
    isaPotAtDraw: drawRows.isaDrawRow?.isaPot ?? 0,
    isaMonthlyAtDraw: flexibleIncomeRows.isaIncomeRow?.monthlyIsaPension ?? 0,
    lisaPotAtDraw: drawRows.lisaDrawRow?.lisaPot ?? 0,
    lisaMonthlyAtDraw:
      flexibleIncomeRows.lisaIncomeRow?.monthlyLisaPension ?? 0,
    monthlyAtAlphaStart: drawRows.alphaDrawRow?.totalMonthlyNetIncome ?? 0,
    monthlyAtStateStart: drawRows.statePensionRow?.totalMonthlyNetIncome ?? 0,
    monthlyStatePension: drawRows.statePensionRow?.monthlyStatePension ?? 0,
    retirementIncome,
  };
}

function findFirstDrawdownRowAtOrAfterDate(
  tableData: ProjectionRow[],
  date: string,
  incomeKey: "monthlySippPension" | "monthlyIsaPension" | "monthlyLisaPension"
) {
  return (
    tableData.find((row) => row.date >= date && row[incomeKey] > 0) ??
    findFirstRowAtOrAfterDate(tableData, date)
  );
}

function buildRowRetirementIncomeSummary(
  settings: PensionSettings,
  drawRows: {
    alphaDrawRow: ProjectionRow | undefined;
    nuvosDrawRow: ProjectionRow | undefined;
    premiumDrawRow: ProjectionRow | undefined;
    statePensionRow: ProjectionRow | undefined;
    sippDrawRow: ProjectionRow | undefined;
    isaDrawRow: ProjectionRow | undefined;
    lisaDrawRow: ProjectionRow | undefined;
    sippIncomeRow: ProjectionRow | undefined;
    isaIncomeRow: ProjectionRow | undefined;
    lisaIncomeRow: ProjectionRow | undefined;
    summaryRow: ProjectionRow | undefined;
    ageRanges: RetirementIncomeAgeRange[];
  }
) {
  const summaryRow = drawRows.summaryRow;
  const alphaMonthlyIncome = summaryRow?.monthlyAlphaPensionGross ?? 0;
  const nuvosMonthlyIncome = summaryRow?.monthlyNuvosPensionGross ?? 0;
  const premiumMonthlyIncome = summaryRow?.monthlyPremiumPensionGross ?? 0;
  const statePensionMonthlyIncome = summaryRow?.monthlyStatePension ?? 0;
  const sippMonthlyIncome = summaryRow?.monthlySippPension ?? 0;
  const isaMonthlyIncome = summaryRow?.monthlyIsaPension ?? 0;
  const lisaMonthlyIncome = summaryRow?.monthlyLisaPension ?? 0;
  const bridgeWithdrawals = buildBridgeWithdrawalSources(settings, {
    summaryRow,
    sippIncomeRow: drawRows.sippIncomeRow,
    isaIncomeRow: drawRows.isaIncomeRow,
    lisaIncomeRow: drawRows.lisaIncomeRow,
  });

  return buildRetirementIncomeSummary({
    summaryDate: summaryRow?.date ?? settings.startDate,
    alphaMonthlyIncome,
    nuvosMonthlyIncome,
    premiumMonthlyIncome,
    sippMonthlyIncome,
    isaMonthlyIncome,
    lisaMonthlyIncome,
    statePensionMonthlyIncome,
    monthlyIncomeTax: calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension: alphaMonthlyIncome,
      monthlyNuvosPension: nuvosMonthlyIncome,
      monthlyPremiumPension: premiumMonthlyIncome,
      monthlyStatePension: statePensionMonthlyIncome,
      monthlySippPension: sippMonthlyIncome,
    }),
    bridgeWithdrawals,
    ageRanges: drawRows.ageRanges,
    settings,
  });
}

function buildRetirementIncomeAgeRanges(
  tableData: ProjectionRow[],
  settings: PensionSettings
): RetirementIncomeAgeRange[] {
  const retirementDate = addYears(
    settings.dateOfBirth,
    settings.requirementAge
  );
  const endDate = addYears(settings.dateOfBirth, settings.lifeExpectancy);
  const rows = tableData.filter(
    (row) => row.date >= retirementDate && row.date <= endDate
  );

  if (rows.length === 0) {
    return [];
  }

  const ranges: RetirementIncomeAgeRange[] = [];
  let currentRangeStart = createAgeRangeSnapshot(rows[0], settings);

  rows.slice(1).forEach((row) => {
    const nextSnapshot = createAgeRangeSnapshot(row, settings);

    if (
      getAgeRangeSourceSignature(nextSnapshot) ===
      getAgeRangeSourceSignature(currentRangeStart)
    ) {
      return;
    }

    if (nextSnapshot.startAge > currentRangeStart.startAge) {
      ranges.push({
        ...currentRangeStart,
        endAge: nextSnapshot.startAge,
      });
    }

    currentRangeStart = nextSnapshot;
  });

  if (settings.lifeExpectancy > currentRangeStart.startAge) {
    ranges.push({
      ...currentRangeStart,
      endAge: settings.lifeExpectancy,
    });
  }

  return ranges;
}

function createAgeRangeSnapshot(
  row: ProjectionRow,
  settings: PensionSettings
): RetirementIncomeAgeRange {
  const annualTargetIncome = calculateRetirementIncomeTargetAtDate(
    settings,
    row.date
  );
  const annualIncomeBeforeTax = row.totalMonthlyIncomeBeforeTax * 12;
  const annualIncomeAfterTax = row.totalMonthlyNetIncome * 12;
  const annualAssessedIncome = settings.taxationEnabled
    ? annualIncomeAfterTax
    : annualIncomeBeforeTax;

  return {
    startAge: row.age + row.ageMonths / 12,
    endAge: row.age + row.ageMonths / 12,
    sourceLabels: getActiveIncomeSourceLabels(row, settings),
    monthlyIncomeBeforeTax: row.totalMonthlyIncomeBeforeTax,
    monthlyIncomeAfterTax: row.totalMonthlyNetIncome,
    annualIncomeBeforeTax,
    annualIncomeAfterTax,
    annualTargetIncome,
    annualShortfall: Math.max(0, annualTargetIncome - annualAssessedIncome),
    annualSurplus: Math.max(0, annualAssessedIncome - annualTargetIncome),
  };
}

function getActiveIncomeSourceLabels(
  row: ProjectionRow,
  settings: PensionSettings
) {
  const labels = [
    settings.showAlpha && row.monthlyAlphaPensionGross > ACTIVE_INCOME_EPSILON
      ? "Alpha pension"
      : null,
    settings.showNuvos && row.monthlyNuvosPensionGross > ACTIVE_INCOME_EPSILON
      ? "nuvos pension"
      : null,
    settings.showPremium &&
    row.monthlyPremiumPensionGross > ACTIVE_INCOME_EPSILON
      ? "Premium pension"
      : null,
    settings.showSipp && row.monthlySippPension > ACTIVE_INCOME_EPSILON
      ? "SIPP withdrawal"
      : null,
    settings.showIsa && row.monthlyIsaPension > ACTIVE_INCOME_EPSILON
      ? "ISA withdrawal"
      : null,
    settings.showLisa && row.monthlyLisaPension > ACTIVE_INCOME_EPSILON
      ? "LISA withdrawal"
      : null,
    settings.showStatePension && row.monthlyStatePension > ACTIVE_INCOME_EPSILON
      ? "State Pension"
      : null,
  ].filter((label): label is string => Boolean(label));

  return labels.length > 0 ? labels : ["No income modelled"];
}

function getAgeRangeSourceSignature(range: RetirementIncomeAgeRange) {
  return range.sourceLabels.join("|");
}

function findRetirementIncomeSummaryRow(
  tableData: ProjectionRow[],
  settings: PensionSettings,
  input: {
    alphaPensionDrawDate: string;
    nuvosPensionDrawDate: string;
    premiumPensionDrawDate: string;
    statePensionStartDate: string;
    sippIncomeRow: ProjectionRow | undefined;
    isaIncomeRow: ProjectionRow | undefined;
    lisaIncomeRow: ProjectionRow | undefined;
  }
) {
  const secureIncomeStartDates = [
    ...(settings.showAlpha ? [input.alphaPensionDrawDate] : []),
    ...(settings.showNuvos ? [input.nuvosPensionDrawDate] : []),
    ...(settings.showPremium ? [input.premiumPensionDrawDate] : []),
    ...(settings.showStatePension ? [input.statePensionStartDate] : []),
  ];
  const flexibleIncomeDates = [
    input.sippIncomeRow,
    input.isaIncomeRow,
    input.lisaIncomeRow,
  ]
    .filter((row): row is ProjectionRow => Boolean(row))
    .map((row) => row.date);
  const summaryDate =
    secureIncomeStartDates.sort().at(-1) ??
    flexibleIncomeDates.sort()[0] ??
    addYears(settings.dateOfBirth, settings.requirementAge);

  return findFirstRowAtOrAfterDate(tableData, summaryDate);
}

function buildBridgeWithdrawalSources(
  settings: PensionSettings,
  rows: {
    summaryRow: ProjectionRow | undefined;
    sippIncomeRow: ProjectionRow | undefined;
    isaIncomeRow: ProjectionRow | undefined;
    lisaIncomeRow: ProjectionRow | undefined;
  }
): BridgeWithdrawalSource[] {
  return [
    settings.showSipp
      ? createBridgeWithdrawalSource({
          key: "sipp",
          label: "SIPP",
          monthlyIncome: rows.sippIncomeRow?.monthlySippPension ?? 0,
          summaryMonthlyIncome: rows.summaryRow?.monthlySippPension ?? 0,
          incomeRow: rows.sippIncomeRow,
          summaryRow: rows.summaryRow,
          startAge: settings.sippDrawAge,
          endAge:
            settings.sippWithdrawalStrategy === "use_by_age"
              ? settings.sippWithdrawalTargetAge
              : null,
          startDate: addYears(settings.dateOfBirth, settings.sippDrawAge),
          endDate:
            settings.sippWithdrawalStrategy === "use_by_age"
              ? addYears(settings.dateOfBirth, settings.sippWithdrawalTargetAge)
              : null,
        })
      : null,
    settings.showIsa
      ? createBridgeWithdrawalSource({
          key: "isa",
          label: "ISA",
          monthlyIncome: rows.isaIncomeRow?.monthlyIsaPension ?? 0,
          summaryMonthlyIncome: rows.summaryRow?.monthlyIsaPension ?? 0,
          incomeRow: rows.isaIncomeRow,
          summaryRow: rows.summaryRow,
          startAge: settings.isaDrawAge,
          endAge:
            settings.isaWithdrawalStrategy === "use_by_age"
              ? settings.isaWithdrawalTargetAge
              : null,
          startDate: addYears(settings.dateOfBirth, settings.isaDrawAge),
          endDate:
            settings.isaWithdrawalStrategy === "use_by_age"
              ? addYears(settings.dateOfBirth, settings.isaWithdrawalTargetAge)
              : null,
        })
      : null,
    settings.showLisa
      ? createBridgeWithdrawalSource({
          key: "lisa",
          label: "LISA",
          monthlyIncome: rows.lisaIncomeRow?.monthlyLisaPension ?? 0,
          summaryMonthlyIncome: rows.summaryRow?.monthlyLisaPension ?? 0,
          incomeRow: rows.lisaIncomeRow,
          summaryRow: rows.summaryRow,
          startAge: settings.lisaDrawAge,
          endAge:
            settings.lisaWithdrawalStrategy === "use_by_age"
              ? settings.lisaWithdrawalTargetAge
              : null,
          startDate: addYears(settings.dateOfBirth, settings.lisaDrawAge),
          endDate:
            settings.lisaWithdrawalStrategy === "use_by_age"
              ? addYears(settings.dateOfBirth, settings.lisaWithdrawalTargetAge)
              : null,
        })
      : null,
  ].filter((source): source is BridgeWithdrawalSource => Boolean(source));
}

function createBridgeWithdrawalSource(input: {
  key: BridgeWithdrawalSource["key"];
  label: string;
  monthlyIncome: number;
  summaryMonthlyIncome: number;
  incomeRow: ProjectionRow | undefined;
  summaryRow: ProjectionRow | undefined;
  startAge: number;
  endAge: number | null;
  startDate: string;
  endDate: string | null;
}): BridgeWithdrawalSource | null {
  if (
    input.monthlyIncome <= 0 ||
    input.summaryMonthlyIncome > 0 ||
    !input.incomeRow ||
    input.incomeRow.date === input.summaryRow?.date
  ) {
    return null;
  }

  return {
    key: input.key,
    label: input.label,
    monthlyIncome: input.monthlyIncome,
    annualIncome: input.monthlyIncome * 12,
    startDate: input.startDate,
    endDate: input.endDate,
    startAge: input.startAge,
    endAge: input.endAge,
  };
}

function createEmptySummary(settings: PensionSettings): PensionSummary {
  const normalPensionAge = calculateNormalPensionAge(settings.dateOfBirth);
  const alphaPensionDrawDate = addYears(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge
  );
  const alphaAccrualStopDate = addYears(
    settings.dateOfBirth,
    settings.alphaPensionLeaveAge
  );

  return createSummaryResponse({
    settings,
    alphaAccrualStopDate,
    alphaPensionDrawDate,
    nuvosAccrualStopDate: NUVOS_FINAL_PENSIONABLE_SERVICE_DATE,
    nuvosPensionDrawDate: addYears(
      settings.dateOfBirth,
      settings.nuvosPensionDrawAge
    ),
    premiumDrawDate: addYears(settings.dateOfBirth, settings.premiumDrawAge),
    sippDrawDate: addYears(settings.dateOfBirth, settings.sippDrawAge),
    isaDrawDate: addYears(settings.dateOfBirth, settings.isaDrawAge),
    lisaDrawDate: addYears(settings.dateOfBirth, settings.lisaDrawAge),
    statePensionStartDate: settings.statePensionDrawDate,
    normalPensionAge,
    reductionFactor: 1,
    alphaAtDraw: 0,
    alphaMonthlyAtDraw: 0,
    maximumAnnualAccrued: 0,
    totalAddedAfterToday: 0,
    nuvosAtDraw: 0,
    nuvosMonthlyAtDraw: 0,
    maximumAnnualNuvosAccrued: 0,
    premiumAtDraw: 0,
    premiumMonthlyAtDraw: 0,
    premiumCpiRevaluedAnnualAtDraw: 0,
    premiumEarlyRetirementFactor: null,
    premiumIsReducedForEarlyPayment: false,
    premiumFactorUnavailable: false,
    sippPotAtDraw: 0,
    sippMonthlyAtDraw: 0,
    isaPotAtDraw: 0,
    isaMonthlyAtDraw: 0,
    lisaPotAtDraw: 0,
    lisaMonthlyAtDraw: 0,
    monthlyAtAlphaStart: 0,
    monthlyAtStateStart: 0,
    monthlyStatePension: 0,
    retirementIncome: buildRetirementIncomeSummary({
      summaryDate: settings.startDate,
      alphaMonthlyIncome: 0,
      nuvosMonthlyIncome: 0,
      premiumMonthlyIncome: 0,
      sippMonthlyIncome: 0,
      isaMonthlyIncome: 0,
      lisaMonthlyIncome: 0,
      statePensionMonthlyIncome: 0,
      monthlyIncomeTax: 0,
      bridgeWithdrawals: [],
      ageRanges: [],
      settings,
    }),
  });
}

function createSummaryResponse(input: {
  settings: PensionSettings;
  alphaAccrualStopDate: string;
  alphaPensionDrawDate: string;
  nuvosAccrualStopDate: string;
  nuvosPensionDrawDate: string;
  premiumDrawDate: string;
  sippDrawDate: string;
  isaDrawDate: string;
  lisaDrawDate: string;
  statePensionStartDate: string;
  normalPensionAge: number;
  reductionFactor: number;
  alphaAtDraw: number;
  alphaMonthlyAtDraw: number;
  maximumAnnualAccrued: number;
  totalAddedAfterToday: number;
  nuvosAtDraw: number;
  nuvosMonthlyAtDraw: number;
  maximumAnnualNuvosAccrued: number;
  premiumAtDraw: number;
  premiumMonthlyAtDraw: number;
  premiumCpiRevaluedAnnualAtDraw: number;
  premiumEarlyRetirementFactor: number | null;
  premiumIsReducedForEarlyPayment: boolean;
  premiumFactorUnavailable: boolean;
  sippPotAtDraw: number;
  sippMonthlyAtDraw: number;
  isaPotAtDraw: number;
  isaMonthlyAtDraw: number;
  lisaPotAtDraw: number;
  lisaMonthlyAtDraw: number;
  monthlyAtAlphaStart: number;
  monthlyAtStateStart: number;
  monthlyStatePension: number;
  retirementIncome: RetirementIncomeSummary;
}): PensionSummary {
  const {
    settings,
    alphaAccrualStopDate,
    alphaPensionDrawDate,
    nuvosAccrualStopDate,
    nuvosPensionDrawDate,
    premiumDrawDate,
    sippDrawDate,
    isaDrawDate,
    lisaDrawDate,
    statePensionStartDate,
    normalPensionAge,
    reductionFactor,
    alphaAtDraw,
    alphaMonthlyAtDraw,
    maximumAnnualAccrued,
    totalAddedAfterToday,
    nuvosAtDraw,
    nuvosMonthlyAtDraw,
    maximumAnnualNuvosAccrued,
    premiumAtDraw,
    premiumMonthlyAtDraw,
    premiumCpiRevaluedAnnualAtDraw,
    premiumEarlyRetirementFactor,
    premiumIsReducedForEarlyPayment,
    premiumFactorUnavailable,
    sippPotAtDraw,
    sippMonthlyAtDraw,
    isaPotAtDraw,
    isaMonthlyAtDraw,
    lisaPotAtDraw,
    lisaMonthlyAtDraw,
    monthlyAtAlphaStart,
    monthlyAtStateStart,
    monthlyStatePension,
    retirementIncome,
  } = input;

  return {
    keyDates: {
      stopsAlphaAccrual: alphaAccrualStopDate,
      startsAlphaPension: alphaPensionDrawDate,
      stopsNuvosAccrual: nuvosAccrualStopDate,
      startsNuvosPension: nuvosPensionDrawDate,
      startsPremiumPension: premiumDrawDate,
      startsSippDraw: sippDrawDate,
      startsIsaDraw: isaDrawDate,
      startsLisaDraw: lisaDrawDate,
      startsStatePension: statePensionStartDate,
    },
    alphaPension: {
      annualAtDraw: alphaAtDraw,
      monthlyAtDraw: alphaMonthlyAtDraw,
      maximumAnnualAccrued,
      totalAddedAfterToday,
    },
    nuvosPension: {
      annualAtDraw: nuvosAtDraw,
      monthlyAtDraw: nuvosMonthlyAtDraw,
      maximumAnnualAccrued: maximumAnnualNuvosAccrued,
    },
    premiumPension: {
      annualAtDraw: premiumAtDraw,
      monthlyAtDraw: premiumMonthlyAtDraw,
      cpiRevaluedAnnualAtDraw: premiumCpiRevaluedAnnualAtDraw,
      earlyRetirementFactor: premiumEarlyRetirementFactor,
      isReducedForEarlyPayment: premiumIsReducedForEarlyPayment,
      factorUnavailable: premiumFactorUnavailable,
    },
    sippPension: {
      potAtDraw: sippPotAtDraw,
      monthlyAtDraw: sippMonthlyAtDraw,
      totalContributionsAfterTaxRelief:
        calculateTotalSippContributionsAfterTaxRelief(settings, sippDrawDate),
    },
    isaPension: {
      potAtDraw: isaPotAtDraw,
      monthlyAtDraw: isaMonthlyAtDraw,
      totalContributions: calculateTotalIsaContributions(settings, isaDrawDate),
    },
    lisaPension: {
      potAtDraw: lisaPotAtDraw,
      monthlyAtDraw: lisaMonthlyAtDraw,
      totalContributionsWithBonus: calculateTotalLisaContributionsWithBonus(
        settings,
        lisaDrawDate
      ),
    },
    incomeOverTime: {
      monthlyAtAlphaStart,
      monthlyAtStateStart,
      monthlyAfterStatePension: monthlyAtStateStart,
      monthlyStatePension,
    },
    transitions: {
      yearsBetweenStoppingAccrualAndDrawingPension: calculateYearDifference(
        alphaAccrualStopDate,
        alphaPensionDrawDate
      ),
      yearsBetweenAlphaPensionAndStatePension: calculateYearDifference(
        alphaPensionDrawDate,
        statePensionStartDate
      ),
    },
    calculated: {
      normalPensionAge,
      statePensionAge: calculateAge(
        settings.dateOfBirth,
        statePensionStartDate
      ),
      earlyRetirementReductionPercent: Math.max(0, (1 - reductionFactor) * 100),
    },
    retirementIncome,
  };
}

function buildRetirementIncomeSummary({
  summaryDate,
  alphaMonthlyIncome,
  nuvosMonthlyIncome,
  premiumMonthlyIncome,
  sippMonthlyIncome,
  isaMonthlyIncome,
  lisaMonthlyIncome,
  statePensionMonthlyIncome,
  monthlyIncomeTax,
  bridgeWithdrawals,
  ageRanges,
  settings,
}: {
  summaryDate: string;
  alphaMonthlyIncome: number;
  nuvosMonthlyIncome: number;
  premiumMonthlyIncome: number;
  sippMonthlyIncome: number;
  isaMonthlyIncome: number;
  lisaMonthlyIncome: number;
  statePensionMonthlyIncome: number;
  monthlyIncomeTax: number;
  bridgeWithdrawals: BridgeWithdrawalSource[];
  ageRanges: RetirementIncomeAgeRange[];
  settings: PensionSettings;
}): RetirementIncomeSummary {
  const sources: RetirementIncomeSource[] = [
    ...(settings.showAlpha
      ? [
          createRetirementIncomeSource(
            "alpha",
            "Alpha pension",
            alphaMonthlyIncome
          ),
        ]
      : []),
    ...(settings.showNuvos
      ? [
          createRetirementIncomeSource(
            "nuvos",
            "nuvos pension",
            nuvosMonthlyIncome
          ),
        ]
      : []),
    ...(settings.showPremium
      ? [
          createRetirementIncomeSource(
            "premium",
            "Premium pension",
            premiumMonthlyIncome
          ),
        ]
      : []),
    ...(settings.showSipp
      ? [createRetirementIncomeSource("sipp", "SIPP", sippMonthlyIncome)]
      : []),
    ...(settings.showIsa
      ? [createRetirementIncomeSource("isa", "ISA", isaMonthlyIncome)]
      : []),
    ...(settings.showLisa
      ? [createRetirementIncomeSource("lisa", "LISA", lisaMonthlyIncome)]
      : []),
    ...(settings.showStatePension
      ? [
          createRetirementIncomeSource(
            "statePension",
            "State Pension",
            statePensionMonthlyIncome
          ),
        ]
      : []),
    ...(settings.taxationEnabled
      ? [
          createRetirementIncomeSource(
            "incomeTax",
            "Estimated Income Tax",
            -monthlyIncomeTax
          ),
        ]
      : []),
  ];

  const totalMonthlyIncome = sources.reduce(
    (total, source) => total + source.monthlyIncome,
    0
  );

  return {
    summaryDate,
    sources,
    bridgeWithdrawals,
    ageRanges,
    totalMonthlyIncome,
    totalAnnualIncome: totalMonthlyIncome * 12,
  };
}

function createRetirementIncomeSource(
  key: RetirementIncomeSource["key"],
  label: string,
  monthlyIncome: number
): RetirementIncomeSource {
  return {
    key,
    label,
    monthlyIncome,
    annualIncome: monthlyIncome * 12,
  };
}

function findFirstRowAtOrAfterDate(
  tableData: ProjectionRow[],
  milestoneDate: string
) {
  return tableData.find((row) => row.date >= milestoneDate) ?? tableData.at(-1);
}
