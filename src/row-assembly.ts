import {
  getPartialRetirementContributionMultiplier,
  type PensionSettings,
} from "./settings";
import { calculateMonthlyIncomeTax } from "./projection-domains/tax";
import {
  calculateClassicAnnualPensionAtDate,
  calculateClassicAutomaticLumpSumAtDate,
  calculateClassicPlusAnnualPensionAtDate,
  calculateClassicPlusAutomaticLumpSumAtDate,
} from "./projection-domains/classic";
import { calculateAnnualNuvosPensionAtDate } from "./projection-domains/nuvos";
import {
  calculateAnnualPremiumPensionAtDate,
  calculateAnnualPremiumPensionIncludingReduction,
} from "./projection-domains/premium";
import { calculateSippProjectionRow } from "./projection-domains/sipp";
import { calculateCsAvcProjectionRow } from "./projection-domains/cs-avc";
import { calculateIsaProjectionRow } from "./projection-domains/isa";
import { calculateLisaProjectionRow } from "./projection-domains/lisa";
import {
  calculateAnnualAlphaPensionIncludingEpaReduction,
  calculateAnnualAlphaPensionIncludingReduction,
  calculateLumpSumAddedPension,
  calculateMonthlyAddedPension,
  calculateMonthlyAlphaPensionGross,
  calculateMonthlyEpaAlphaAccrual,
  calculateMonthlyStandardAlphaAccrual,
  getAddedPensionPeriodCalculationDate,
} from "./projection-domains/alpha";
import {
  calculateAnnualStatePensionAtDate,
  calculateMonthlyStatePension,
} from "./projection-domains/state-pension";
import { calculateAdditionalGuaranteedIncomeForDate } from "./projection-domains/additional-guaranteed-income";
import { addMonths, calculateAge, calculateAgeMonths } from "./derive-inputs";
import {
  buildMilestoneDateMapForRowDates,
  buildMilestoneMapForRowDates,
  buildProjectionMilestoneDefinitions,
} from "./milestones";
import type { ProjectionRow } from "./projection-core";

export type ProjectionRowWithoutMilestones = Omit<
  ProjectionRow,
  "milestones" | "milestoneDates"
>;

export function calculateTotalGrossMonthlyIncome(
  monthlyAlphaPensionIncludingReduction: number,
  monthlyStatePension: number,
  monthlySippPension = 0,
  monthlyCsAvcPension = 0,
  monthlyIsaPension = 0,
  monthlyLisaPension = 0,
  monthlyNuvosPensionIncludingReduction = 0,
  monthlyClassicPensionIncludingReduction = 0,
  monthlyClassicPlusPensionIncludingReduction = 0,
  monthlyPremiumPensionIncludingReduction = 0,
  monthlyAdditionalGuaranteedIncomeGross = 0
) {
  return (
    monthlyAlphaPensionIncludingReduction +
    monthlyClassicPensionIncludingReduction +
    monthlyClassicPlusPensionIncludingReduction +
    monthlyNuvosPensionIncludingReduction +
    monthlyPremiumPensionIncludingReduction +
    monthlyAdditionalGuaranteedIncomeGross +
    monthlyStatePension +
    monthlySippPension +
    monthlyCsAvcPension +
    monthlyIsaPension +
    monthlyLisaPension
  );
}

export function calculateAgeSnapshot(
  settings: PensionSettings,
  rowDate: string
) {
  return {
    age: calculateAge(settings.dateOfBirth, rowDate),
    ageMonths: calculateAgeMonths(settings.dateOfBirth, rowDate),
  };
}

export function calculateInvestmentProjectionValues(input: {
  settings: PensionSettings;
  rowDate: string;
  endDate: string;
  sippDrawDate: string;
  csAvcDrawDate: string;
  isaDrawDate: string;
  lisaDrawDate: string;
  active: boolean;
}) {
  const {
    settings,
    rowDate,
    endDate,
    sippDrawDate,
    csAvcDrawDate,
    isaDrawDate,
    lisaDrawDate,
    active,
  } = input;

  if (!active) {
    return {
      sippProjection: { sippPot: 0, monthlySippPension: 0 },
      csAvcProjection: { csAvcPot: 0, monthlyCsAvcPension: 0 },
      isaProjection: { isaPot: 0, monthlyIsaPension: 0 },
      lisaProjection: { lisaPot: 0, monthlyLisaPension: 0 },
    };
  }

  return {
    sippProjection: calculateSippProjectionRow({
      settings,
      rowDate,
      drawDate: sippDrawDate,
      endDate,
    }),
    csAvcProjection: calculateCsAvcProjectionRow({
      settings,
      rowDate,
      drawDate: csAvcDrawDate,
      endDate,
    }),
    isaProjection: calculateIsaProjectionRow({
      settings,
      rowDate,
      drawDate: isaDrawDate,
      endDate,
    }),
    lisaProjection: calculateLisaProjectionRow({
      settings,
      rowDate,
      drawDate: lisaDrawDate,
      endDate,
    }),
  };
}

export function calculateAddedPensionValues(input: {
  settings: PensionSettings;
  rowDate: string;
  previousRowDate?: string;
  addedPensionStopDate: string;
  suppressAddedPension?: boolean;
}) {
  const {
    settings,
    rowDate,
    previousRowDate,
    addedPensionStopDate,
    suppressAddedPension = false,
  } = input;

  const monthlyAddedPension =
    suppressAddedPension || !settings.showAlpha
      ? 0
      : calculateMonthlyAddedPension({
          rowDate,
          stopDate: addedPensionStopDate,
          dateOfBirth: settings.dateOfBirth,
          addedPensionMonthlyContribution: settings.alphaAddedPensionMonthly,
          calculationDate: getAddedPensionPeriodCalculationDate(
            settings.startDate,
            rowDate
          ),
          factorType: settings.alphaAddedPensionFactorType,
          contributionMultiplier: getPartialRetirementContributionMultiplier(
            settings,
            rowDate
          ),
        });
  const lumpSumAddedPension = settings.showAlpha
    ? calculateLumpSumAddedPension({
        rowDate,
        previousRowDate,
        dateOfBirth: settings.dateOfBirth,
        lumpSums: settings.alphaAddedPensionLumpSums,
      })
    : 0;

  return { monthlyAddedPension, lumpSumAddedPension };
}

export function buildProjectionRow(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  npaDate: string;
  epaDate: string;
  reductionFactor: number;
  epaReductionFactor: number;
  nuvosDrawDate: string;
  nuvosNpaDate: string;
  nuvosReductionFactor: number;
  classicDrawDate: string;
  classicNpaDate: string;
  classicReductionFactor: number;
  classicPlusDrawDate: string;
  classicPlusNpaDate: string;
  classicPlusReductionFactor: number;
  premiumDrawDate: string;
  premiumReductionFactor: number | null;
  annualStandardAlphaPension: number;
  annualEpaAlphaPension: number;
  annualNuvosPension: number;
  annualClassicPension: number;
  classicAutomaticLumpSum: number;
  annualClassicPlusPension: number;
  classicPlusAutomaticLumpSum: number;
  annualPremiumPension: number;
  monthlyAddedPension: number;
  lumpSumAddedPension: number;
  sippProjection: {
    sippPot: number;
    monthlySippPension: number;
  };
  csAvcProjection: {
    csAvcPot: number;
    monthlyCsAvcPension: number;
  };
  isaProjection: {
    isaPot: number;
    monthlyIsaPension: number;
  };
  lisaProjection: {
    lisaPot: number;
    monthlyLisaPension: number;
  };
}) {
  const {
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
    annualStandardAlphaPension,
    annualEpaAlphaPension,
    annualNuvosPension,
    annualClassicPension,
    classicAutomaticLumpSum,
    annualClassicPlusPension,
    classicPlusAutomaticLumpSum,
    annualPremiumPension,
    monthlyAddedPension,
    lumpSumAddedPension,
    sippProjection,
    csAvcProjection,
    isaProjection,
    lisaProjection,
  } = input;
  const { age, ageMonths } = calculateAgeSnapshot(settings, rowDate);
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
  const monthlyAlphaPensionGross = calculateMonthlyAlphaPensionGross(
    rowDate,
    drawDate,
    annualAlphaPensionIncludingReduction
  );
  const annualNuvosPensionIncludingReduction =
    calculateAnnualAlphaPensionIncludingReduction(
      annualNuvosPension,
      nuvosDrawDate,
      nuvosNpaDate,
      nuvosReductionFactor
    );
  const monthlyNuvosPensionGross = calculateMonthlyAlphaPensionGross(
    rowDate,
    nuvosDrawDate,
    annualNuvosPensionIncludingReduction
  );
  const annualClassicPensionIncludingReduction =
    calculateAnnualAlphaPensionIncludingReduction(
      annualClassicPension,
      classicDrawDate,
      classicNpaDate,
      classicReductionFactor
    );
  const classicAutomaticLumpSumIncludingReduction =
    calculateAnnualAlphaPensionIncludingReduction(
      classicAutomaticLumpSum,
      classicDrawDate,
      classicNpaDate,
      classicReductionFactor
    );
  const monthlyClassicPensionGross = calculateMonthlyAlphaPensionGross(
    rowDate,
    classicDrawDate,
    annualClassicPensionIncludingReduction
  );
  const annualClassicPlusPensionIncludingReduction =
    calculateAnnualAlphaPensionIncludingReduction(
      annualClassicPlusPension,
      classicPlusDrawDate,
      classicPlusNpaDate,
      classicPlusReductionFactor
    );
  const classicPlusAutomaticLumpSumIncludingReduction =
    calculateAnnualAlphaPensionIncludingReduction(
      classicPlusAutomaticLumpSum,
      classicPlusDrawDate,
      classicPlusNpaDate,
      classicPlusReductionFactor
    );
  const monthlyClassicPlusPensionGross = calculateMonthlyAlphaPensionGross(
    rowDate,
    classicPlusDrawDate,
    annualClassicPlusPensionIncludingReduction
  );
  const annualPremiumPensionIncludingReduction =
    calculateAnnualPremiumPensionIncludingReduction(
      annualPremiumPension,
      premiumReductionFactor
    );
  const monthlyPremiumPensionGross = calculateMonthlyAlphaPensionGross(
    rowDate,
    premiumDrawDate,
    annualPremiumPensionIncludingReduction
  );
  const monthlyStatePension = calculateMonthlyStatePension(
    rowDate,
    settings.statePensionDrawDate,
    calculateAnnualStatePensionAtDate(settings, rowDate)
  );
  const additionalGuaranteedIncome = calculateAdditionalGuaranteedIncomeForDate(
    {
      settings,
      rowDate,
    }
  );
  const monthlyAdditionalGuaranteedIncomeGross =
    additionalGuaranteedIncome.annualGross / 12;
  const monthlyAdditionalGuaranteedIncomeTaxable =
    additionalGuaranteedIncome.annualTaxable / 12;
  const totalMonthlyIncomeBeforeTax = calculateTotalGrossMonthlyIncome(
    monthlyAlphaPensionGross,
    monthlyStatePension,
    sippProjection.monthlySippPension,
    csAvcProjection.monthlyCsAvcPension,
    isaProjection.monthlyIsaPension,
    lisaProjection.monthlyLisaPension,
    monthlyNuvosPensionGross,
    monthlyClassicPensionGross,
    monthlyClassicPlusPensionGross,
    monthlyPremiumPensionGross,
    monthlyAdditionalGuaranteedIncomeGross
  );
  const monthlyIncomeTax = calculateMonthlyIncomeTax({
    settings,
    monthlyAlphaPension: monthlyAlphaPensionGross,
    monthlyClassicPension: monthlyClassicPensionGross,
    monthlyClassicPlusPension: monthlyClassicPlusPensionGross,
    monthlyNuvosPension: monthlyNuvosPensionGross,
    monthlyPremiumPension: monthlyPremiumPensionGross,
    monthlyStatePension,
    monthlySippPension: sippProjection.monthlySippPension,
    monthlyCsAvcPension: csAvcProjection.monthlyCsAvcPension,
    monthlyAdditionalGuaranteedIncomeTaxable,
  });

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
    monthlyAlphaPensionGross,
    annualClassicPension,
    classicAutomaticLumpSum,
    annualClassicPensionIncludingReduction,
    classicAutomaticLumpSumIncludingReduction,
    monthlyClassicPensionGross,
    annualClassicPlusPension,
    classicPlusAutomaticLumpSum,
    annualClassicPlusPensionIncludingReduction,
    classicPlusAutomaticLumpSumIncludingReduction,
    monthlyClassicPlusPensionGross,
    annualNuvosPension,
    annualNuvosPensionIncludingReduction,
    monthlyNuvosPensionGross,
    annualPremiumPension,
    annualPremiumPensionIncludingReduction,
    monthlyPremiumPensionGross,
    monthlyStatePension,
    monthlyAdditionalGuaranteedIncomeGross,
    monthlyAdditionalGuaranteedIncomeTaxable,
    sippPot: sippProjection.sippPot,
    monthlySippPension: sippProjection.monthlySippPension,
    csAvcPot: csAvcProjection.csAvcPot,
    monthlyCsAvcPension: csAvcProjection.monthlyCsAvcPension,
    isaPot: isaProjection.isaPot,
    monthlyIsaPension: isaProjection.monthlyIsaPension,
    lisaPot: lisaProjection.lisaPot,
    monthlyLisaPension: lisaProjection.monthlyLisaPension,
    totalMonthlyIncomeBeforeTax,
    monthlyIncomeTax,
    totalMonthlyNetIncome: totalMonthlyIncomeBeforeTax - monthlyIncomeTax,
  };
}

export function calculateStartingAlphaPortionsAtStartDate(input: {
  settings: PensionSettings;
  alphaAbsDate: string;
  accrualStopDate: string;
}) {
  const { settings, alphaAbsDate, accrualStopDate } = input;

  if (!settings.showAlpha) {
    return {
      standardAlphaPension: 0,
      epaAlphaPension: 0,
    };
  }

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
    standardAlphaPension += calculateMonthlyStandardAlphaAccrual(
      settings,
      rowDate
    );
    epaAlphaPension += calculateMonthlyEpaAlphaAccrual(settings, rowDate);
    rowDate = addMonths(rowDate, 1);
  }

  return {
    standardAlphaPension,
    epaAlphaPension,
  };
}

export function createHistoricalProjectionRows(input: {
  settings: PensionSettings;
  alphaAbsDate: string;
  drawDate: string;
  accrualStopDate: string;
  addedPensionStopDate: string;
  npaDate: string;
  epaDate: string;
  reductionFactor: number;
  epaReductionFactor: number;
  nuvosDrawDate: string;
  nuvosNpaDate: string;
  nuvosReductionFactor: number;
  classicDrawDate: string;
  classicNpaDate: string;
  classicReductionFactor: number;
  classicPlusDrawDate: string;
  classicPlusNpaDate: string;
  classicPlusReductionFactor: number;
  premiumDrawDate: string;
  premiumReductionFactor: number | null;
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
    const { monthlyAddedPension, lumpSumAddedPension } =
      calculateAddedPensionValues({
        settings,
        rowDate,
        previousRowDate,
        addedPensionStopDate,
        suppressAddedPension: rowDate === alphaAbsDate,
      });
    cumulativeLumpSumAddedPension += monthlyAddedPension + lumpSumAddedPension;
    if (rowDate > alphaAbsDate && rowDate <= accrualStopDate) {
      cumulativeStandardAlphaPension += calculateMonthlyStandardAlphaAccrual(
        settings,
        rowDate
      );
      cumulativeEpaAlphaPension += calculateMonthlyEpaAlphaAccrual(
        settings,
        rowDate
      );
    }

    rows.push(
      buildProjectionRow({
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
        annualStandardAlphaPension:
          cumulativeStandardAlphaPension + cumulativeLumpSumAddedPension,
        annualEpaAlphaPension: cumulativeEpaAlphaPension,
        annualNuvosPension: 0,
        annualClassicPension: 0,
        classicAutomaticLumpSum: 0,
        annualClassicPlusPension: 0,
        classicPlusAutomaticLumpSum: 0,
        annualPremiumPension: calculatePremiumAnnualPension({
          settings,
          rowDate,
          premiumDrawDate,
        }),
        monthlyAddedPension,
        lumpSumAddedPension,
        sippProjection: { sippPot: 0, monthlySippPension: 0 },
        csAvcProjection: { csAvcPot: 0, monthlyCsAvcPension: 0 },
        isaProjection: { isaPot: 0, monthlyIsaPension: 0 },
        lisaProjection: { lisaPot: 0, monthlyLisaPension: 0 },
      })
    );

    previousRowDate = rowDate;
    rowDate = addMonths(rowDate, 1);
  }

  return rows;
}

export function calculateClassicAnnualPension(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  return calculateClassicAnnualPensionAtDate(input);
}

export function calculateClassicAutomaticLumpSum(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  return calculateClassicAutomaticLumpSumAtDate(input);
}

export function calculateClassicPlusAnnualPension(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  return calculateClassicPlusAnnualPensionAtDate(input);
}

export function calculateClassicPlusAutomaticLumpSum(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  return calculateClassicPlusAutomaticLumpSumAtDate(input);
}

export function calculatePremiumAnnualPension(input: {
  settings: PensionSettings;
  rowDate: string;
  premiumDrawDate: string;
}) {
  return calculateAnnualPremiumPensionAtDate(input);
}

export function calculateNuvosAnnualPension(input: {
  settings: PensionSettings;
  rowDate: string;
  nuvosAbsDate: string;
  nuvosAccrualStopDate: string;
}) {
  return calculateAnnualNuvosPensionAtDate({
    settings: input.settings,
    rowDate: input.rowDate,
    nuvosAbsDate: input.nuvosAbsDate,
    accrualStopDate: input.nuvosAccrualStopDate,
  });
}

export function attachMilestonesToRows(input: {
  rows: ProjectionRowWithoutMilestones[];
  rowDates: string[];
  settings: PensionSettings;
  endDate: string;
  accrualStopDate: string;
  drawDate: string;
  sippDrawDate: string;
  csAvcDrawDate: string;
  isaDrawDate: string;
  lisaDrawDate: string;
  alphaAbsDate: string;
  nuvosAccrualStopDate: string;
  nuvosDrawDate: string;
  nuvosAbsDate: string;
  premiumDrawDate: string;
}) {
  const milestoneDefinitions = buildProjectionMilestoneDefinitions(input);
  const milestoneRows = buildMilestoneMapForRowDates(
    milestoneDefinitions,
    input.rowDates
  );
  const milestoneDateRows = buildMilestoneDateMapForRowDates(
    milestoneDefinitions,
    input.rowDates
  );

  return input.rows.map((row) => ({
    ...row,
    milestones: milestoneRows.get(row.date) ?? [],
    milestoneDates: milestoneDateRows.get(row.date) ?? [],
  }));
}
