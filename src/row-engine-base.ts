import type { PensionSettings } from "./settings";
import {
  calculateAccruedAlphaPension,
  calculateMonthlyEpaAlphaAccrual,
  calculateMonthlyStandardAlphaAccrual,
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
  calculateInvestmentProjectionValues,
  calculateClassicAnnualPension,
  calculateClassicAutomaticLumpSum,
  calculateClassicPlusAnnualPension,
  calculateClassicPlusAutomaticLumpSum,
  calculateNuvosAnnualPension,
  calculatePremiumAnnualPension,
  calculateStartingAlphaPortionsAtStartDate,
  createHistoricalProjectionRows,
} from "./row-assembly";

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
  let cumulativeStandardAddedPension = historicalRows.reduce(
    (total, row) => total + row.monthlyAddedPension + row.lumpSumAddedPension,
    0
  );
  let previousRowDate: string | undefined;

  const projectionRows = generateMonthlyDateRange(
    settings.startDate,
    endDate
  ).map((rowDate) => {
    const { sippProjection, csAvcProjection, isaProjection, lisaProjection } =
      calculateInvestmentProjectionValues({
        settings,
        rowDate,
        endDate,
        sippDrawDate,
        csAvcDrawDate,
        isaDrawDate,
        lisaDrawDate,
        active: true,
      });
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
