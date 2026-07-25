import { calculateNormalPensionAge, type PensionSettings } from "./settings";
import { calculateTotalIsaContributions } from "./projection-domains/isa";
import { calculateTotalLisaContributionsWithBonus } from "./projection-domains/lisa";
import { NUVOS_FINAL_PENSIONABLE_SERVICE_DATE } from "./projection-domains/nuvos";
import { calculatePremiumPension } from "./projection-domains/premium";
import { calculateTotalSippContributionsAfterTaxRelief } from "./projection-domains/sipp";
import {
  calculateCsAvcPotBeforeWithdrawalAtDate,
  calculateTotalCsAvcContributions,
} from "./projection-domains/cs-avc";
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
    classicDrawDate: classicPensionDrawDate,
    classicPlusDrawDate: classicPlusPensionDrawDate,
    nuvosDrawDate: nuvosPensionDrawDate,
    nuvosAccrualStopDate,
    premiumDrawDate,
    reductionFactor,
  } = derivedInputs;
  const summaryDates = buildSummaryDates(settings, {
    alphaPensionDrawDate,
    alphaAccrualStopDate,
    classicPensionDrawDate,
    classicPlusPensionDrawDate,
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
      classicAtDraw: 0,
      classicMonthlyAtDraw: 0,
      classicAutomaticLumpSumAtDraw: 0,
      maximumAnnualClassicAccrued: 0,
      classicPlusAtDraw: 0,
      classicPlusMonthlyAtDraw: 0,
      classicPlusAutomaticLumpSumAtDraw: 0,
      maximumAnnualClassicPlusAccrued: 0,
      premiumAtDraw: 0,
      premiumMonthlyAtDraw: 0,
      premiumCpiRevaluedAnnualAtDraw: 0,
      premiumEarlyRetirementFactor: null,
      premiumIsReducedForEarlyPayment: false,
      premiumFactorUnavailable: false,
      sippPotAtDraw: 0,
      sippMonthlyAtDraw: 0,
      csAvcPotAtDraw: 0,
      csAvcMonthlyAtDraw: 0,
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
        classicMonthlyIncome: 0,
        classicPlusMonthlyIncome: 0,
        nuvosMonthlyIncome: 0,
        premiumMonthlyIncome: 0,
        sippMonthlyIncome: 0,
        csAvcMonthlyIncome: 0,
        isaMonthlyIncome: 0,
        lisaMonthlyIncome: 0,
        additionalGuaranteedIncomeMonthlyIncome: 0,
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
    classicPensionDrawDate: string;
    classicPlusPensionDrawDate: string;
    nuvosPensionDrawDate: string;
    nuvosAccrualStopDate: string;
    premiumDrawDate: string;
  }
) {
  return {
    ...dates,
    sippDrawDate: addYears(settings.dateOfBirth, settings.sippDrawAge),
    csAvcDrawDate: addYears(settings.dateOfBirth, settings.csAvcDrawAge),
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
    classicPensionDrawDate: string;
    classicPlusPensionDrawDate: string;
    nuvosPensionDrawDate: string;
    premiumDrawDate: string;
    sippDrawDate: string;
    csAvcDrawDate: string;
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
    classicDrawRow: findFirstRowAtOrAfterDate(
      tableData,
      input.classicPensionDrawDate
    ),
    classicPlusDrawRow: findFirstRowAtOrAfterDate(
      tableData,
      input.classicPlusPensionDrawDate
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
    csAvcIncomeRow: findFirstDrawdownRowAtOrAfterDate(
      tableData,
      input.csAvcDrawDate,
      "monthlyCsAvcPension"
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
    classicPensionDrawDate: input.classicPensionDrawDate,
    classicPlusPensionDrawDate: input.classicPlusPensionDrawDate,
    nuvosPensionDrawDate: input.nuvosPensionDrawDate,
    premiumPensionDrawDate: input.premiumDrawDate,
    statePensionStartDate: input.statePensionStartDate,
    sippIncomeRow: flexibleIncomeRows.sippIncomeRow,
    csAvcIncomeRow: flexibleIncomeRows.csAvcIncomeRow,
    isaIncomeRow: flexibleIncomeRows.isaIncomeRow,
    lisaIncomeRow: flexibleIncomeRows.lisaIncomeRow,
  });
  const maximumAnnualAccrued = Math.max(
    ...tableData.map((row) => row.annualAccruedAlphaPension)
  );
  const maximumAnnualNuvosAccrued = settings.showNuvos
    ? Math.max(...tableData.map((row) => row.annualNuvosPension))
    : 0;
  const maximumAnnualClassicAccrued = settings.showClassic
    ? Math.max(...tableData.map((row) => row.annualClassicPension))
    : 0;
  const maximumAnnualClassicPlusAccrued = settings.showClassicPlus
    ? Math.max(...tableData.map((row) => row.annualClassicPlusPension))
    : 0;
  const retirementIncome = buildRowRetirementIncomeSummary(settings, {
    ...drawRows,
    ...flexibleIncomeRows,
    summaryRow,
    ageRanges: buildRetirementIncomeAgeRanges(tableData, settings),
  });
  const alphaAtDraw = getProjectionRowValue(
    drawRows.alphaDrawRow,
    "annualAlphaPensionIncludingReduction"
  );
  const alphaMonthlyAtDraw = getProjectionRowValue(
    drawRows.alphaDrawRow,
    "monthlyAlphaPensionGross"
  );
  const nuvosAtDraw = getProjectionRowValue(
    drawRows.nuvosDrawRow,
    "annualNuvosPensionIncludingReduction"
  );
  const nuvosMonthlyAtDraw = getProjectionRowValue(
    drawRows.nuvosDrawRow,
    "monthlyNuvosPensionGross"
  );
  const classicAtDraw = getProjectionRowValue(
    drawRows.classicDrawRow,
    "annualClassicPensionIncludingReduction"
  );
  const classicMonthlyAtDraw = getProjectionRowValue(
    drawRows.classicDrawRow,
    "monthlyClassicPensionGross"
  );
  const classicAutomaticLumpSumAtDraw = getProjectionRowValue(
    drawRows.classicDrawRow,
    "classicAutomaticLumpSumIncludingReduction"
  );
  const classicPlusAtDraw = getProjectionRowValue(
    drawRows.classicPlusDrawRow,
    "annualClassicPlusPensionIncludingReduction"
  );
  const classicPlusMonthlyAtDraw = getProjectionRowValue(
    drawRows.classicPlusDrawRow,
    "monthlyClassicPlusPensionGross"
  );
  const classicPlusAutomaticLumpSumAtDraw = getProjectionRowValue(
    drawRows.classicPlusDrawRow,
    "classicPlusAutomaticLumpSumIncludingReduction"
  );
  const sippPotAtDraw = getProjectionRowValue(drawRows.sippDrawRow, "sippPot");
  const sippMonthlyAtDraw = getProjectionRowValue(
    flexibleIncomeRows.sippIncomeRow,
    "monthlySippPension"
  );
  const csAvcPotAtDraw = settings.showCsAvc
    ? calculateCsAvcPotBeforeWithdrawalAtDate({
        settings,
        rowDate: input.csAvcDrawDate,
        drawDate: input.csAvcDrawDate,
      })
    : 0;
  const csAvcMonthlyAtDraw = getProjectionRowValue(
    flexibleIncomeRows.csAvcIncomeRow,
    "monthlyCsAvcPension"
  );
  const isaPotAtDraw = getProjectionRowValue(drawRows.isaDrawRow, "isaPot");
  const isaMonthlyAtDraw = getProjectionRowValue(
    flexibleIncomeRows.isaIncomeRow,
    "monthlyIsaPension"
  );
  const lisaPotAtDraw = getProjectionRowValue(drawRows.lisaDrawRow, "lisaPot");
  const lisaMonthlyAtDraw = getProjectionRowValue(
    flexibleIncomeRows.lisaIncomeRow,
    "monthlyLisaPension"
  );
  const monthlyAtAlphaStart = getProjectionRowValue(
    drawRows.alphaDrawRow,
    "totalMonthlyNetIncome"
  );
  const monthlyAtStateStart = getProjectionRowValue(
    drawRows.statePensionRow,
    "totalMonthlyNetIncome"
  );
  const monthlyStatePension = getProjectionRowValue(
    drawRows.statePensionRow,
    "monthlyStatePension"
  );
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
    alphaAtDraw,
    alphaMonthlyAtDraw,
    maximumAnnualAccrued,
    totalAddedAfterToday:
      maximumAnnualAccrued - input.startingAlphaPensionAtStartDate,
    nuvosAtDraw,
    nuvosMonthlyAtDraw,
    maximumAnnualNuvosAccrued,
    classicAtDraw,
    classicMonthlyAtDraw,
    classicAutomaticLumpSumAtDraw,
    maximumAnnualClassicAccrued,
    classicPlusAtDraw,
    classicPlusMonthlyAtDraw,
    classicPlusAutomaticLumpSumAtDraw,
    maximumAnnualClassicPlusAccrued,
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
    sippPotAtDraw,
    sippMonthlyAtDraw,
    csAvcPotAtDraw,
    csAvcMonthlyAtDraw,
    isaPotAtDraw,
    isaMonthlyAtDraw,
    lisaPotAtDraw,
    lisaMonthlyAtDraw,
    monthlyAtAlphaStart,
    monthlyAtStateStart,
    monthlyStatePension,
    retirementIncome,
  };
}

function getProjectionRowValue<K extends keyof ProjectionRow>(
  row: ProjectionRow | undefined,
  key: K
) {
  const value = row?.[key];

  return typeof value === "number" ? value : 0;
}

function findFirstDrawdownRowAtOrAfterDate(
  tableData: ProjectionRow[],
  date: string,
  incomeKey:
    | "monthlySippPension"
    | "monthlyCsAvcPension"
    | "monthlyIsaPension"
    | "monthlyLisaPension"
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
    classicDrawRow: ProjectionRow | undefined;
    classicPlusDrawRow: ProjectionRow | undefined;
    nuvosDrawRow: ProjectionRow | undefined;
    premiumDrawRow: ProjectionRow | undefined;
    statePensionRow: ProjectionRow | undefined;
    sippDrawRow: ProjectionRow | undefined;
    isaDrawRow: ProjectionRow | undefined;
    lisaDrawRow: ProjectionRow | undefined;
    sippIncomeRow: ProjectionRow | undefined;
    csAvcIncomeRow: ProjectionRow | undefined;
    isaIncomeRow: ProjectionRow | undefined;
    lisaIncomeRow: ProjectionRow | undefined;
    summaryRow: ProjectionRow | undefined;
    ageRanges: RetirementIncomeAgeRange[];
  }
) {
  const summaryRow = drawRows.summaryRow;
  const alphaMonthlyIncome = summaryRow?.monthlyAlphaPensionGross ?? 0;
  const classicMonthlyIncome = summaryRow?.monthlyClassicPensionGross ?? 0;
  const classicPlusMonthlyIncome =
    summaryRow?.monthlyClassicPlusPensionGross ?? 0;
  const nuvosMonthlyIncome = summaryRow?.monthlyNuvosPensionGross ?? 0;
  const premiumMonthlyIncome = summaryRow?.monthlyPremiumPensionGross ?? 0;
  const statePensionMonthlyIncome = summaryRow?.monthlyStatePension ?? 0;
  const additionalGuaranteedIncomeMonthlyIncome =
    summaryRow?.monthlyAdditionalGuaranteedIncomeGross ?? 0;
  const additionalGuaranteedIncomeTaxableMonthlyIncome =
    summaryRow?.monthlyAdditionalGuaranteedIncomeTaxable ?? 0;
  const sippMonthlyIncome = summaryRow?.monthlySippPension ?? 0;
  const csAvcMonthlyIncome = summaryRow?.monthlyCsAvcPension ?? 0;
  const isaMonthlyIncome = summaryRow?.monthlyIsaPension ?? 0;
  const lisaMonthlyIncome = summaryRow?.monthlyLisaPension ?? 0;
  const bridgeWithdrawals = buildBridgeWithdrawalSources(settings, {
    summaryRow,
    sippIncomeRow: drawRows.sippIncomeRow,
    csAvcIncomeRow: drawRows.csAvcIncomeRow,
    isaIncomeRow: drawRows.isaIncomeRow,
    lisaIncomeRow: drawRows.lisaIncomeRow,
  });

  return buildRetirementIncomeSummary({
    summaryDate: summaryRow?.date ?? settings.startDate,
    alphaMonthlyIncome,
    classicMonthlyIncome,
    classicPlusMonthlyIncome,
    nuvosMonthlyIncome,
    premiumMonthlyIncome,
    sippMonthlyIncome,
    csAvcMonthlyIncome,
    isaMonthlyIncome,
    lisaMonthlyIncome,
    additionalGuaranteedIncomeMonthlyIncome,
    statePensionMonthlyIncome,
    monthlyIncomeTax: calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension: alphaMonthlyIncome,
      monthlyClassicPension: classicMonthlyIncome,
      monthlyClassicPlusPension: classicPlusMonthlyIncome,
      monthlyNuvosPension: nuvosMonthlyIncome,
      monthlyPremiumPension: premiumMonthlyIncome,
      monthlyStatePension: statePensionMonthlyIncome,
      monthlySippPension: sippMonthlyIncome,
      monthlyCsAvcPension: csAvcMonthlyIncome,
      monthlyAdditionalGuaranteedIncomeTaxable:
        additionalGuaranteedIncomeTaxableMonthlyIncome,
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
    createActiveIncomeSourceLabel(
      settings.showAlpha,
      row.monthlyAlphaPensionGross,
      "Alpha pension"
    ),
    createActiveIncomeSourceLabel(
      settings.showClassic,
      row.monthlyClassicPensionGross,
      "classic pension"
    ),
    createActiveIncomeSourceLabel(
      settings.showClassicPlus,
      row.monthlyClassicPlusPensionGross,
      "classic plus pension"
    ),
    createActiveIncomeSourceLabel(
      settings.showNuvos,
      row.monthlyNuvosPensionGross,
      "nuvos pension"
    ),
    createActiveIncomeSourceLabel(
      settings.showPremium,
      row.monthlyPremiumPensionGross,
      "Premium pension"
    ),
    createActiveIncomeSourceLabel(
      settings.showSipp,
      row.monthlySippPension,
      "SIPP withdrawal"
    ),
    createActiveIncomeSourceLabel(
      settings.showCsAvc,
      row.monthlyCsAvcPension,
      "Civil Service AVC withdrawal"
    ),
    createActiveIncomeSourceLabel(
      settings.showIsa,
      row.monthlyIsaPension,
      "ISA withdrawal"
    ),
    createActiveIncomeSourceLabel(
      settings.showLisa,
      row.monthlyLisaPension,
      "LISA withdrawal"
    ),
    createActiveIncomeSourceLabel(
      settings.showStatePension,
      row.monthlyStatePension,
      "State Pension"
    ),
    createActiveIncomeSourceLabel(
      true,
      row.monthlyAdditionalGuaranteedIncomeGross,
      "Additional income"
    ),
  ].filter((label): label is string => Boolean(label));

  return labels.length > 0 ? labels : ["No income modelled"];
}

function createActiveIncomeSourceLabel(
  enabled: boolean,
  monthlyIncome: number,
  label: string
) {
  return enabled && monthlyIncome > ACTIVE_INCOME_EPSILON ? label : null;
}

function getAgeRangeSourceSignature(range: RetirementIncomeAgeRange) {
  return range.sourceLabels.join("|");
}

function findRetirementIncomeSummaryRow(
  tableData: ProjectionRow[],
  settings: PensionSettings,
  input: {
    alphaPensionDrawDate: string;
    classicPensionDrawDate: string;
    classicPlusPensionDrawDate: string;
    nuvosPensionDrawDate: string;
    premiumPensionDrawDate: string;
    statePensionStartDate: string;
    sippIncomeRow: ProjectionRow | undefined;
    csAvcIncomeRow: ProjectionRow | undefined;
    isaIncomeRow: ProjectionRow | undefined;
    lisaIncomeRow: ProjectionRow | undefined;
  }
) {
  const secureIncomeStartDates = [
    ...(settings.showAlpha ? [input.alphaPensionDrawDate] : []),
    ...(settings.showClassic ? [input.classicPensionDrawDate] : []),
    ...(settings.showClassicPlus ? [input.classicPlusPensionDrawDate] : []),
    ...(settings.showNuvos ? [input.nuvosPensionDrawDate] : []),
    ...(settings.showPremium ? [input.premiumPensionDrawDate] : []),
    ...(settings.showStatePension ? [input.statePensionStartDate] : []),
  ];
  const flexibleIncomeDates = [
    input.sippIncomeRow,
    input.csAvcIncomeRow,
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
    csAvcIncomeRow: ProjectionRow | undefined;
    isaIncomeRow: ProjectionRow | undefined;
    lisaIncomeRow: ProjectionRow | undefined;
  }
): BridgeWithdrawalSource[] {
  return [
    createFlexibleBridgeWithdrawalSource(settings, rows, {
      show: settings.showSipp,
      key: "sipp",
      label: "SIPP",
      monthlyIncome: rows.sippIncomeRow?.monthlySippPension ?? 0,
      summaryMonthlyIncome: rows.summaryRow?.monthlySippPension ?? 0,
      incomeRow: rows.sippIncomeRow,
      startAge: settings.sippDrawAge,
      withdrawalStrategy: settings.sippWithdrawalStrategy,
      withdrawalTargetAge: settings.sippWithdrawalTargetAge,
    }),
    createFlexibleBridgeWithdrawalSource(settings, rows, {
      show: settings.showCsAvc,
      key: "csAvc",
      label: "Civil Service AVC",
      monthlyIncome: rows.csAvcIncomeRow?.monthlyCsAvcPension ?? 0,
      summaryMonthlyIncome: rows.summaryRow?.monthlyCsAvcPension ?? 0,
      incomeRow: rows.csAvcIncomeRow,
      startAge: settings.csAvcDrawAge,
      withdrawalStrategy: settings.csAvcWithdrawalStrategy,
      withdrawalTargetAge: settings.csAvcWithdrawalTargetAge,
    }),
    createFlexibleBridgeWithdrawalSource(settings, rows, {
      show: settings.showIsa,
      key: "isa",
      label: "ISA",
      monthlyIncome: rows.isaIncomeRow?.monthlyIsaPension ?? 0,
      summaryMonthlyIncome: rows.summaryRow?.monthlyIsaPension ?? 0,
      incomeRow: rows.isaIncomeRow,
      startAge: settings.isaDrawAge,
      withdrawalStrategy: settings.isaWithdrawalStrategy,
      withdrawalTargetAge: settings.isaWithdrawalTargetAge,
    }),
    createFlexibleBridgeWithdrawalSource(settings, rows, {
      show: settings.showLisa,
      key: "lisa",
      label: "LISA",
      monthlyIncome: rows.lisaIncomeRow?.monthlyLisaPension ?? 0,
      summaryMonthlyIncome: rows.summaryRow?.monthlyLisaPension ?? 0,
      incomeRow: rows.lisaIncomeRow,
      startAge: settings.lisaDrawAge,
      withdrawalStrategy: settings.lisaWithdrawalStrategy,
      withdrawalTargetAge: settings.lisaWithdrawalTargetAge,
    }),
  ].filter((source): source is BridgeWithdrawalSource => Boolean(source));
}

function createFlexibleBridgeWithdrawalSource(
  settings: PensionSettings,
  rows: { summaryRow: ProjectionRow | undefined },
  input: {
    show: boolean;
    key: BridgeWithdrawalSource["key"];
    label: string;
    monthlyIncome: number;
    summaryMonthlyIncome: number;
    incomeRow: ProjectionRow | undefined;
    startAge: number;
    withdrawalStrategy: PensionSettings["sippWithdrawalStrategy"];
    withdrawalTargetAge: number;
  }
) {
  if (!input.show) {
    return null;
  }

  const endAge =
    input.withdrawalStrategy === "use_by_age"
      ? input.withdrawalTargetAge
      : null;

  return createBridgeWithdrawalSource({
    key: input.key,
    label: input.label,
    monthlyIncome: input.monthlyIncome,
    summaryMonthlyIncome: input.summaryMonthlyIncome,
    incomeRow: input.incomeRow,
    summaryRow: rows.summaryRow,
    startAge: input.startAge,
    endAge,
    startDate: addYears(settings.dateOfBirth, input.startAge),
    endDate: endAge === null ? null : addYears(settings.dateOfBirth, endAge),
  });
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
    classicPensionDrawDate: addYears(
      settings.dateOfBirth,
      settings.classicPensionDrawAge
    ),
    classicPlusPensionDrawDate: addYears(
      settings.dateOfBirth,
      settings.classicPlusPensionDrawAge
    ),
    nuvosAccrualStopDate: NUVOS_FINAL_PENSIONABLE_SERVICE_DATE,
    nuvosPensionDrawDate: addYears(
      settings.dateOfBirth,
      settings.nuvosPensionDrawAge
    ),
    premiumDrawDate: addYears(settings.dateOfBirth, settings.premiumDrawAge),
    sippDrawDate: addYears(settings.dateOfBirth, settings.sippDrawAge),
    csAvcDrawDate: addYears(settings.dateOfBirth, settings.csAvcDrawAge),
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
    classicAtDraw: 0,
    classicMonthlyAtDraw: 0,
    classicAutomaticLumpSumAtDraw: 0,
    maximumAnnualClassicAccrued: 0,
    classicPlusAtDraw: 0,
    classicPlusMonthlyAtDraw: 0,
    classicPlusAutomaticLumpSumAtDraw: 0,
    maximumAnnualClassicPlusAccrued: 0,
    premiumAtDraw: 0,
    premiumMonthlyAtDraw: 0,
    premiumCpiRevaluedAnnualAtDraw: 0,
    premiumEarlyRetirementFactor: null,
    premiumIsReducedForEarlyPayment: false,
    premiumFactorUnavailable: false,
    sippPotAtDraw: 0,
    sippMonthlyAtDraw: 0,
    csAvcPotAtDraw: 0,
    csAvcMonthlyAtDraw: 0,
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
      classicMonthlyIncome: 0,
      classicPlusMonthlyIncome: 0,
      nuvosMonthlyIncome: 0,
      premiumMonthlyIncome: 0,
      sippMonthlyIncome: 0,
      csAvcMonthlyIncome: 0,
      isaMonthlyIncome: 0,
      lisaMonthlyIncome: 0,
      statePensionMonthlyIncome: 0,
      additionalGuaranteedIncomeMonthlyIncome: 0,
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
  classicPensionDrawDate: string;
  classicPlusPensionDrawDate: string;
  nuvosAccrualStopDate: string;
  nuvosPensionDrawDate: string;
  premiumDrawDate: string;
  sippDrawDate: string;
  csAvcDrawDate: string;
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
  classicAtDraw: number;
  classicMonthlyAtDraw: number;
  classicAutomaticLumpSumAtDraw: number;
  maximumAnnualClassicAccrued: number;
  classicPlusAtDraw: number;
  classicPlusMonthlyAtDraw: number;
  classicPlusAutomaticLumpSumAtDraw: number;
  maximumAnnualClassicPlusAccrued: number;
  premiumAtDraw: number;
  premiumMonthlyAtDraw: number;
  premiumCpiRevaluedAnnualAtDraw: number;
  premiumEarlyRetirementFactor: number | null;
  premiumIsReducedForEarlyPayment: boolean;
  premiumFactorUnavailable: boolean;
  sippPotAtDraw: number;
  sippMonthlyAtDraw: number;
  csAvcPotAtDraw: number;
  csAvcMonthlyAtDraw: number;
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
    classicPensionDrawDate,
    classicPlusPensionDrawDate,
    nuvosAccrualStopDate,
    nuvosPensionDrawDate,
    premiumDrawDate,
    sippDrawDate,
    csAvcDrawDate,
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
    classicAtDraw,
    classicMonthlyAtDraw,
    classicAutomaticLumpSumAtDraw,
    maximumAnnualClassicAccrued,
    classicPlusAtDraw,
    classicPlusMonthlyAtDraw,
    classicPlusAutomaticLumpSumAtDraw,
    maximumAnnualClassicPlusAccrued,
    premiumAtDraw,
    premiumMonthlyAtDraw,
    premiumCpiRevaluedAnnualAtDraw,
    premiumEarlyRetirementFactor,
    premiumIsReducedForEarlyPayment,
    premiumFactorUnavailable,
    sippPotAtDraw,
    sippMonthlyAtDraw,
    csAvcPotAtDraw,
    csAvcMonthlyAtDraw,
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
      startsClassicPension: classicPensionDrawDate,
      startsClassicPlusPension: classicPlusPensionDrawDate,
      stopsNuvosAccrual: nuvosAccrualStopDate,
      startsNuvosPension: nuvosPensionDrawDate,
      startsPremiumPension: premiumDrawDate,
      startsSippDraw: sippDrawDate,
      startsCsAvcDraw: csAvcDrawDate,
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
    classicPension: {
      annualAtDraw: classicAtDraw,
      monthlyAtDraw: classicMonthlyAtDraw,
      automaticLumpSumAtDraw: classicAutomaticLumpSumAtDraw,
      maximumAnnualAccrued: maximumAnnualClassicAccrued,
    },
    classicPlusPension: {
      annualAtDraw: classicPlusAtDraw,
      monthlyAtDraw: classicPlusMonthlyAtDraw,
      automaticLumpSumAtDraw: classicPlusAutomaticLumpSumAtDraw,
      maximumAnnualAccrued: maximumAnnualClassicPlusAccrued,
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
    csAvcPension: {
      potAtDraw: csAvcPotAtDraw,
      monthlyAtDraw: csAvcMonthlyAtDraw,
      totalContributions: calculateTotalCsAvcContributions(
        settings,
        csAvcDrawDate
      ),
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
  classicMonthlyIncome,
  classicPlusMonthlyIncome,
  nuvosMonthlyIncome,
  premiumMonthlyIncome,
  sippMonthlyIncome,
  csAvcMonthlyIncome,
  isaMonthlyIncome,
  lisaMonthlyIncome,
  additionalGuaranteedIncomeMonthlyIncome,
  statePensionMonthlyIncome,
  monthlyIncomeTax,
  bridgeWithdrawals,
  ageRanges,
  settings,
}: {
  summaryDate: string;
  alphaMonthlyIncome: number;
  classicMonthlyIncome: number;
  classicPlusMonthlyIncome: number;
  nuvosMonthlyIncome: number;
  premiumMonthlyIncome: number;
  sippMonthlyIncome: number;
  csAvcMonthlyIncome: number;
  isaMonthlyIncome: number;
  lisaMonthlyIncome: number;
  additionalGuaranteedIncomeMonthlyIncome: number;
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
    ...(settings.showClassic
      ? [
          createRetirementIncomeSource(
            "classic",
            "classic pension",
            classicMonthlyIncome
          ),
        ]
      : []),
    ...(settings.showClassicPlus
      ? [
          createRetirementIncomeSource(
            "classicPlus",
            "classic plus pension",
            classicPlusMonthlyIncome
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
    ...(settings.showCsAvc
      ? [
          createRetirementIncomeSource(
            "csAvc",
            "Civil Service AVC",
            csAvcMonthlyIncome
          ),
        ]
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
    ...(additionalGuaranteedIncomeMonthlyIncome > ACTIVE_INCOME_EPSILON
      ? [
          createRetirementIncomeSource(
            "additionalGuaranteedIncome",
            "Additional income",
            additionalGuaranteedIncomeMonthlyIncome
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
