import type { PensionSettings } from "./settings";
import {
  calculateAccruedAlphaPension,
  calculateMonthlyEpaAlphaAccrual,
  calculateMonthlyEpaAlphaAccrualByOption,
  calculateMonthlyStandardAlphaAccrual,
  createEmptyAlphaEpaPensionPortions,
} from "./projection-domains/alpha";
import type {
  DerivedProjectionInputs,
  ProjectionRuntimeDates,
} from "./derive-inputs";
import { generateMonthlyDateRange } from "./derive-inputs";
import {
  attachMilestonesToRows,
  buildProjectionRow,
  calculateAddedPensionValues,
  calculateClassicAnnualPension,
  calculateClassicAutomaticLumpSum,
  calculateClassicPlusAnnualPension,
  calculateClassicPlusAutomaticLumpSum,
  calculateNuvosAnnualPension,
  calculatePremiumAnnualPension,
  calculateStartingAlphaPortionsAtStartDate,
  createHistoricalProjectionRows,
} from "./row-assembly";
import { calculateSippProjectionRows } from "./projection-domains/sipp";
import { calculateCsAvcProjectionRows } from "./projection-domains/cs-avc";
import { calculateIsaProjectionRows } from "./projection-domains/isa";
import { calculateLisaProjectionRows } from "./projection-domains/lisa";

export function createProjectionTableBase(
  settings: PensionSettings,
  derivedInputs: DerivedProjectionInputs,
  runtimeDates: ProjectionRuntimeDates
) {
  const {
    endDate,
    drawDate,
    accrualStopDate,
    nuvosDrawDate,
    nuvosAccrualStopDate,
    nuvosNpaDate,
    nuvosReductionFactor,
    classicDrawDate,
    classicNpaDate,
    classicReductionFactor,
    classicPlusDrawDate,
    classicPlusNpaDate,
    classicPlusReductionFactor,
    premiumDrawDate,
    premiumReductionFactor,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
    epaReductionFactors,
  } = derivedInputs;
  const {
    sippDrawDate,
    csAvcDrawDate,
    isaDrawDate,
    lisaDrawDate,
    alphaAbsDate,
    nuvosAbsDate,
  } = runtimeDates;

  const startingAlphaPortionsAtStartDate =
    calculateStartingAlphaPortionsAtStartDate({
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
    epaReductionFactors,
    nuvosDrawDate,
    nuvosNpaDate,
    nuvosReductionFactor,
    classicDrawDate,
    classicNpaDate,
    classicReductionFactor,
    classicPlusDrawDate,
    classicPlusNpaDate,
    classicPlusReductionFactor,
    premiumDrawDate,
    premiumReductionFactor,
  });
  let cumulativeStandardAccrual = 0;
  let cumulativeEpaAccrual = 0;
  const cumulativeEpaAccruals = createEmptyAlphaEpaPensionPortions();
  let cumulativeStandardAddedPension = historicalRows.reduce(
    (total, row) => total + row.monthlyAddedPension + row.lumpSumAddedPension,
    0
  );
  let previousRowDate: string | undefined;

  const projectionRowDates = generateMonthlyDateRange(
    settings.startDate,
    endDate
  );
  const sippProjections = calculateSippProjectionRows({
    settings,
    rowDates: projectionRowDates,
    drawDate: sippDrawDate,
    endDate,
  });
  const csAvcProjections = calculateCsAvcProjectionRows({
    settings,
    rowDates: projectionRowDates,
    drawDate: csAvcDrawDate,
    endDate,
  });
  const isaProjections = calculateIsaProjectionRows({
    settings,
    rowDates: projectionRowDates,
    drawDate: isaDrawDate,
    endDate,
  });
  const lisaProjections = calculateLisaProjectionRows({
    settings,
    rowDates: projectionRowDates,
    drawDate: lisaDrawDate,
    endDate,
  });
  const projectionRows = projectionRowDates.map((rowDate) => {
    const sippProjection = sippProjections.get(rowDate) ?? {
      sippPot: 0,
      monthlySippPension: 0,
    };
    const csAvcProjection = csAvcProjections.get(rowDate) ?? {
      csAvcPot: 0,
      monthlyCsAvcPension: 0,
    };
    const isaProjection = isaProjections.get(rowDate) ?? {
      isaPot: 0,
      monthlyIsaPension: 0,
    };
    const lisaProjection = lisaProjections.get(rowDate) ?? {
      lisaPot: 0,
      monthlyLisaPension: 0,
    };
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
    const monthlyEpaAlphaAccruals =
      rowDate <= accrualStopDate
        ? calculateMonthlyEpaAlphaAccrualByOption(settings, rowDate)
        : createEmptyAlphaEpaPensionPortions();
    for (const yearsBeforeNpa of [1, 2, 3] as const) {
      cumulativeEpaAccruals[yearsBeforeNpa] +=
        monthlyEpaAlphaAccruals[yearsBeforeNpa];
    }

    const { monthlyAddedPension, lumpSumAddedPension } =
      calculateAddedPensionValues({
        settings,
        rowDate,
        previousRowDate,
        addedPensionStopDate,
      });

    cumulativeStandardAddedPension += monthlyAddedPension + lumpSumAddedPension;

    const row = buildProjectionRow({
      settings,
      rowDate,
      drawDate,
      npaDate,
      epaDate,
      reductionFactor,
      epaReductionFactor,
      epaReductionFactors,
      nuvosDrawDate,
      nuvosNpaDate,
      nuvosReductionFactor,
      classicDrawDate,
      classicNpaDate,
      classicReductionFactor,
      classicPlusDrawDate,
      classicPlusNpaDate,
      classicPlusReductionFactor,
      premiumDrawDate,
      premiumReductionFactor,
      annualStandardAlphaPension: calculateAccruedAlphaPension(
        startingAlphaPortionsAtStartDate.standardAlphaPension,
        cumulativeStandardAccrual + cumulativeStandardAddedPension
      ),
      annualEpaAlphaPension:
        startingAlphaPortionsAtStartDate.epaAlphaPension + cumulativeEpaAccrual,
      annualEpaAlphaPensions: Object.fromEntries(
        ([1, 2, 3] as const).map((yearsBeforeNpa) => [
          yearsBeforeNpa,
          startingAlphaPortionsAtStartDate.epaAlphaPensions[yearsBeforeNpa] +
            cumulativeEpaAccruals[yearsBeforeNpa],
        ])
      ) as Record<1 | 2 | 3, number>,
      annualNuvosPension: calculateNuvosAnnualPension({
        settings,
        rowDate,
        nuvosAbsDate,
        nuvosAccrualStopDate,
      }),
      annualClassicPension: calculateClassicAnnualPension({
        settings,
        rowDate,
      }),
      classicAutomaticLumpSum: calculateClassicAutomaticLumpSum({
        settings,
        rowDate,
      }),
      annualClassicPlusPension: calculateClassicPlusAnnualPension({
        settings,
        rowDate,
      }),
      classicPlusAutomaticLumpSum: calculateClassicPlusAutomaticLumpSum({
        settings,
        rowDate,
      }),
      annualPremiumPension: calculatePremiumAnnualPension({
        settings,
        rowDate,
        premiumDrawDate,
      }),
      monthlyAddedPension,
      lumpSumAddedPension,
      sippProjection,
      csAvcProjection,
      isaProjection,
      lisaProjection,
    });

    previousRowDate = rowDate;

    return row;
  });

  const allRows = [...historicalRows, ...projectionRows];

  return attachMilestonesToRows({
    rows: allRows,
    rowDates: allRows.map((row) => row.date),
    settings,
    endDate,
    accrualStopDate,
    drawDate,
    sippDrawDate,
    csAvcDrawDate,
    isaDrawDate,
    lisaDrawDate,
    alphaAbsDate,
    nuvosAccrualStopDate,
    nuvosDrawDate,
    nuvosAbsDate,
    premiumDrawDate,
  });
}
