import { calculateNormalPensionAge, type PensionSettings } from "./settings";
import { calculateTotalIsaContributions } from "./projection-domains/isa";
import { NUVOS_FINAL_PENSIONABLE_SERVICE_DATE } from "./projection-domains/nuvos";
import { calculateTotalSippContributionsAfterTaxRelief } from "./projection-domains/sipp";
import { calculateMonthlyIncomeTax } from "./projection-domains/tax";
import {
  addYears,
  calculateAge,
  calculateYearDifference,
  createProjectionRuntimeDates,
  deriveProjectionInputs,
} from "./derive-inputs";
import { calculateStartingAlphaPortionsAtStartDate } from "./row-assembly";
import type {
  PensionSummary,
  ProjectionRow,
  RetirementIncomeSource,
  RetirementIncomeSummary,
} from "./projection-core";

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
    reductionFactor,
  } = derivedInputs;
  const summaryDates = buildSummaryDates(settings, {
    alphaPensionDrawDate,
    alphaAccrualStopDate,
    nuvosPensionDrawDate,
    nuvosAccrualStopDate,
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
      sippPotAtDraw: 0,
      sippMonthlyAtDraw: 0,
      isaPotAtDraw: 0,
      isaMonthlyAtDraw: 0,
      monthlyAtAlphaStart: 0,
      monthlyAtStateStart: 0,
      monthlyStatePension: 0,
      retirementIncome: buildRetirementIncomeSummary({
        alphaMonthlyIncome: 0,
        nuvosMonthlyIncome: 0,
        sippMonthlyIncome: 0,
        isaMonthlyIncome: 0,
        statePensionMonthlyIncome: 0,
        monthlyIncomeTax: 0,
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
  }
) {
  return {
    ...dates,
    sippDrawDate: addYears(settings.dateOfBirth, settings.sippDrawAge),
    isaDrawDate: addYears(settings.dateOfBirth, settings.isaDrawAge),
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
    sippDrawDate: string;
    isaDrawDate: string;
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
    statePensionRow: findFirstRowAtOrAfterDate(
      tableData,
      input.statePensionStartDate
    ),
    sippDrawRow: findFirstRowAtOrAfterDate(tableData, input.sippDrawDate),
    isaDrawRow: findFirstRowAtOrAfterDate(tableData, input.isaDrawDate),
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
  };
  const maximumAnnualAccrued = Math.max(
    ...tableData.map((row) => row.annualAccruedAlphaPension)
  );
  const maximumAnnualNuvosAccrued = settings.showNuvos
    ? Math.max(...tableData.map((row) => row.annualNuvosPension))
    : 0;
  const retirementIncome = buildRowRetirementIncomeSummary(settings, {
    ...drawRows,
    ...flexibleIncomeRows,
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
    sippPotAtDraw: drawRows.sippDrawRow?.sippPot ?? 0,
    sippMonthlyAtDraw:
      flexibleIncomeRows.sippIncomeRow?.monthlySippPension ?? 0,
    isaPotAtDraw: drawRows.isaDrawRow?.isaPot ?? 0,
    isaMonthlyAtDraw: flexibleIncomeRows.isaIncomeRow?.monthlyIsaPension ?? 0,
    monthlyAtAlphaStart: drawRows.alphaDrawRow?.totalMonthlyNetIncome ?? 0,
    monthlyAtStateStart: drawRows.statePensionRow?.totalMonthlyNetIncome ?? 0,
    monthlyStatePension: drawRows.statePensionRow?.monthlyStatePension ?? 0,
    retirementIncome,
  };
}

function findFirstDrawdownRowAtOrAfterDate(
  tableData: ProjectionRow[],
  date: string,
  incomeKey: "monthlySippPension" | "monthlyIsaPension"
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
    statePensionRow: ProjectionRow | undefined;
    sippDrawRow: ProjectionRow | undefined;
    isaDrawRow: ProjectionRow | undefined;
    sippIncomeRow: ProjectionRow | undefined;
    isaIncomeRow: ProjectionRow | undefined;
  }
) {
  const alphaMonthlyIncome =
    drawRows.alphaDrawRow?.monthlyAlphaPensionGross ?? 0;
  const nuvosMonthlyIncome =
    drawRows.nuvosDrawRow?.monthlyNuvosPensionGross ?? 0;
  const statePensionMonthlyIncome =
    drawRows.statePensionRow?.monthlyStatePension ?? 0;
  const sippMonthlyIncome = drawRows.sippIncomeRow?.monthlySippPension ?? 0;
  const isaMonthlyIncome = drawRows.isaIncomeRow?.monthlyIsaPension ?? 0;

  return buildRetirementIncomeSummary({
    alphaMonthlyIncome,
    nuvosMonthlyIncome,
    sippMonthlyIncome,
    isaMonthlyIncome,
    statePensionMonthlyIncome,
    monthlyIncomeTax: calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension: alphaMonthlyIncome,
      monthlyNuvosPension: nuvosMonthlyIncome,
      monthlyStatePension: statePensionMonthlyIncome,
      monthlySippPension: sippMonthlyIncome,
    }),
    settings,
  });
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
    sippDrawDate: addYears(settings.dateOfBirth, settings.sippDrawAge),
    isaDrawDate: addYears(settings.dateOfBirth, settings.isaDrawAge),
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
    sippPotAtDraw: 0,
    sippMonthlyAtDraw: 0,
    isaPotAtDraw: 0,
    isaMonthlyAtDraw: 0,
    monthlyAtAlphaStart: 0,
    monthlyAtStateStart: 0,
    monthlyStatePension: 0,
    retirementIncome: buildRetirementIncomeSummary({
      alphaMonthlyIncome: 0,
      nuvosMonthlyIncome: 0,
      sippMonthlyIncome: 0,
      isaMonthlyIncome: 0,
      statePensionMonthlyIncome: 0,
      monthlyIncomeTax: 0,
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
  sippDrawDate: string;
  isaDrawDate: string;
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
  sippPotAtDraw: number;
  sippMonthlyAtDraw: number;
  isaPotAtDraw: number;
  isaMonthlyAtDraw: number;
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
    sippDrawDate,
    isaDrawDate,
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
    sippPotAtDraw,
    sippMonthlyAtDraw,
    isaPotAtDraw,
    isaMonthlyAtDraw,
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
      startsSippDraw: sippDrawDate,
      startsIsaDraw: isaDrawDate,
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
  alphaMonthlyIncome,
  nuvosMonthlyIncome,
  sippMonthlyIncome,
  isaMonthlyIncome,
  statePensionMonthlyIncome,
  monthlyIncomeTax,
  settings,
}: {
  alphaMonthlyIncome: number;
  nuvosMonthlyIncome: number;
  sippMonthlyIncome: number;
  isaMonthlyIncome: number;
  statePensionMonthlyIncome: number;
  monthlyIncomeTax: number;
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
    ...(settings.showSipp
      ? [createRetirementIncomeSource("sipp", "SIPP", sippMonthlyIncome)]
      : []),
    ...(settings.showIsa
      ? [createRetirementIncomeSource("isa", "ISA", isaMonthlyIncome)]
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
    sources,
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
