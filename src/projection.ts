import addedPensionFactors from "./data/alpha_pension_added_pension_factors.json";
import reductionFactors from "./data/alpha_pension_reduction_factors.json";
import {
  calculateNormalPensionAge,
  calculateStatePensionDrawDate,
  getPartialRetirementContributionMultiplier,
  getPartialRetirementSavingsContributionMultiplier,
  getPartialRetirementStartDate,
  getAlphaEpaDate,
  resolveAlphaAbsDate,
  validateSettings,
  type AddedPensionFactorType,
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
  annualNuvosPension: number;
  annualNuvosPensionIncludingReduction: number;
  monthlyNuvosPensionTakeHome: number;
  monthlyStatePension: number;
  sippPot: number;
  monthlySippPension: number;
  isaPot: number;
  monthlyIsaPension: number;
  totalMonthlyPensionIncomeBeforeTax: number;
  monthlyIncomeTax: number;
  totalMonthlyPensionTakeHomePay: number;
};

export type PensionSummary = {
  keyDates: {
    stopsAlphaAccrual: string;
    startsAlphaPension: string;
    stopsNuvosAccrual: string;
    startsNuvosPension: string;
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
  nuvosPension: {
    annualAtDraw: number;
    monthlyAtDraw: number;
    maximumAnnualAccrued: number;
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
  retirementIncome: RetirementIncomeSummary;
};

export type RetirementIncomeDisplay = "monthly" | "annual";

export type RetirementIncomeSource = {
  key: "alpha" | "nuvos" | "sipp" | "isa" | "statePension" | "incomeTax";
  label: string;
  monthlyIncome: number;
  annualIncome: number;
};

export type RetirementIncomeSummary = {
  sources: RetirementIncomeSource[];
  totalMonthlyIncome: number;
  totalAnnualIncome: number;
};

export type BridgePhase = {
  startDate: string;
  endDate: string;
  startAge: number;
  startAgeMonths: number;
  endAge: number;
  endAgeMonths: number;
  label: string;
  incomeSourcesActive: string[];
  potUsed: string;
  annualTargetIncome: number;
  annualAlphaPension: number;
  annualNuvosPension: number;
  annualStatePension: number;
  annualIsaBridge: number;
  annualSippBridge: number;
  annualShortfall: number;
  annualSurplus: number;
  totalIsaBridge: number;
  totalSippBridge: number;
  totalBridgeRequired: number;
  unfundedShortfall: number;
};

export type BridgePotProjectionRow = {
  date: string;
  age: number;
  ageMonths: number;
  monthlyAlphaPension: number;
  monthlyNuvosPension: number;
  monthlyStatePension: number;
  isaBalance: number;
  sippBalance: number;
  isaDrawdown: number;
  sippDrawdown: number;
  unfundedShortfall: number;
  growth: number;
  milestones: string[];
  milestoneDates: string[];
};

export type RetirementBridgeAnalysis = {
  target: {
    retirementDate: string;
    retirementAge: number;
    annualIncome: number;
    monthlyIncome: number;
    endDate: string;
  };
  planWorks: boolean;
  firstFailureDate: string | null;
  firstPotToFail: string | null;
  totalBridgeRequired: number;
  totalUnfundedShortfall: number;
  requiredIsaAtRetirement: number;
  requiredSippAtAccess: number;
  additionalMonthlyContributionRequired: number;
  earliestSustainablePensionDrawAge: number | null;
  fullSecureIncomeStartDate: string | null;
  fullSecureIncomeStartAge: number | null;
  fullSecureIncomeStartAgeMonths: number | null;
  fullSecureAnnualGuaranteedIncome: number;
  fullSecureAnnualGuaranteedSurplus: number;
  stableAnnualGuaranteedIncome: number;
  stableAnnualGuaranteedSurplus: number;
  phases: BridgePhase[];
  potProjection: BridgePotProjectionRow[];
};

const MONTHLY_ALPHA_ACCRUAL_RATE = 0.0232 / 12;
const NUVOS_NORMAL_PENSION_AGE = 65;
const CALCULATION_START_LABEL = "Calculation start";
const LAST_ABS_STATEMENT_LABEL = "Last ABS";
const STOPS_ALPHA_ACCRUAL_LABEL = "Leave Alpha Pension Scheme";
const STARTS_ALPHA_PENSION_LABEL = "Starts Drawing Alpha Pension";
const STOPS_NUVOS_ACCRUAL_LABEL = "Leave nuvos Pension Scheme";
const STARTS_NUVOS_PENSION_LABEL = "Starts Drawing nuvos Pension";
const STARTS_SIPP_LABEL = "Starts Drawing SIPP";
const STARTS_ISA_LABEL = "Starts Drawing ISA";
const STARTS_STATE_PENSION_LABEL = "Starts Drawing State Pension";
const STARTS_PARTIAL_RETIREMENT_LABEL = "Starts Partial Retirement";
const LIFE_EXPECTANCY_LABEL = "Life expectancy";
const LUMP_SUM_ADDED_PENSION_LABEL = "Lump Sum Added Pension";
const SIPP_LUMP_SUM_LABEL = "SIPP Lump Sum";
const ISA_LUMP_SUM_LABEL = "ISA Lump Sum";
const DEFAULT_ALPHA_ACCRUAL_RATE = 0.0232;
const ALPHA_IN_SERVICE_REVALUATION_UPLIFT_RATE = 0.015;
const DEFAULT_NUVOS_ACCRUAL_RATE = 0.023;
const MONTHLY_NUVOS_ACCRUAL_RATE = DEFAULT_NUVOS_ACCRUAL_RATE / 12;

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
  nuvosDrawDate: string;
  nuvosAccrualStopDate: string;
  nuvosNpaDate: string;
  nuvosReductionFactor: number;
  addedPensionStopDate: string;
  npaDate: string;
  epaDate: string;
  reductionFactor: number;
  epaReductionFactor: number;
};

export type DerivedInflationAssumptions = {
  projectionBasis: PensionSettings["projectionBasis"];
  inflationRateAnnual: number;
  inflationRateMonthly: number;
  sippNominalReturnAnnual: number;
  sippModelledReturnAnnual: number;
  isaNominalReturnAnnual: number;
  isaModelledReturnAnnual: number;
  alphaNominalInServiceRevaluationAnnual: number;
  alphaModelledInServiceRevaluationAnnual: number;
  alphaNominalDeferredIncreaseAnnual: number;
  alphaModelledDeferredIncreaseAnnual: number;
  nuvosNominalDeferredIncreaseAnnual: number;
  nuvosModelledDeferredIncreaseAnnual: number;
  statePensionNominalIncreaseAnnual: number;
  statePensionModelledIncreaseAnnual: number;
};

export function deriveInflationAssumptions(
  settings: PensionSettings,
): DerivedInflationAssumptions {
  const inflationRateAnnual = settings.inflationRateAnnual / 100;
  const inflationRateMonthly = (1 + inflationRateAnnual) ** (1 / 12) - 1;
  const sippNominalReturnAnnual = settings.sippRealInterestPercent / 100;
  const isaNominalReturnAnnual = settings.isaRealInterestPercent / 100;
  const alphaNominalInServiceRevaluationAnnual =
    inflationRateAnnual + ALPHA_IN_SERVICE_REVALUATION_UPLIFT_RATE;
  const statePensionNominalIncreaseAnnual = getStatePensionNominalIncreaseRate(settings);

  return {
    projectionBasis: settings.projectionBasis,
    inflationRateAnnual,
    inflationRateMonthly,
    sippNominalReturnAnnual,
    sippModelledReturnAnnual: getModelledAnnualGrowthRate(
      settings,
      sippNominalReturnAnnual,
    ),
    isaNominalReturnAnnual,
    isaModelledReturnAnnual: getModelledAnnualGrowthRate(
      settings,
      isaNominalReturnAnnual,
    ),
    alphaNominalInServiceRevaluationAnnual,
    alphaModelledInServiceRevaluationAnnual:
      settings.projectionBasis === "real"
        ? ALPHA_IN_SERVICE_REVALUATION_UPLIFT_RATE
        : alphaNominalInServiceRevaluationAnnual,
    alphaNominalDeferredIncreaseAnnual: inflationRateAnnual,
    alphaModelledDeferredIncreaseAnnual:
      settings.projectionBasis === "real" ? 0 : inflationRateAnnual,
    nuvosNominalDeferredIncreaseAnnual: inflationRateAnnual,
    nuvosModelledDeferredIncreaseAnnual:
      settings.projectionBasis === "real" ? 0 : inflationRateAnnual,
    statePensionNominalIncreaseAnnual,
    statePensionModelledIncreaseAnnual: getModelledAnnualGrowthRate(
      settings,
      statePensionNominalIncreaseAnnual,
    ),
  };
}

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
  const nuvosDrawDate = addYears(settings.dateOfBirth, settings.nuvosPensionDrawAge);
  const nuvosAccrualStopDate = minIsoDate(
    nuvosDrawDate,
    addYears(settings.dateOfBirth, settings.nuvosPensionLeaveAge),
  );
  const nuvosNpaDate = addYears(settings.dateOfBirth, NUVOS_NORMAL_PENSION_AGE);
  const nuvosReductionFactor =
    nuvosDrawDate > nuvosNpaDate
      ? 1
      : getEarlyRetirementReductionFactor(
          NUVOS_NORMAL_PENSION_AGE,
          settings.nuvosPensionDrawAge,
        );
  const addedPensionStopDate = accrualStopDate;
  const normalPensionAge = calculateNormalPensionAge(settings.dateOfBirth);
  const npaDate = addYears(settings.dateOfBirth, normalPensionAge);
  const epaDate = getAlphaEpaDate(settings);
  const reductionFactor =
    drawDate > npaDate
      ? 1
      : getEarlyRetirementReductionFactor(
          normalPensionAge,
          settings.alphaPensionDrawAge,
        );
  const epaDrawAge = normalPensionAge - settings.alphaEpaYearsBeforeNpa;
  const epaReductionFactor =
    !settings.alphaEpaEnabled || drawDate >= epaDate
      ? 1
      : getEarlyRetirementReductionFactor(epaDrawAge, settings.alphaPensionDrawAge);

  return {
    endDate,
    drawDate,
    alphaStopDate,
    accrualStopDate,
    nuvosDrawDate,
    nuvosAccrualStopDate,
    nuvosNpaDate,
    nuvosReductionFactor,
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
    nuvosDrawDate,
    nuvosAccrualStopDate,
    nuvosNpaDate,
    nuvosReductionFactor,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  } = derivedInputs;
  const sippDrawDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const isaDrawDate = addYears(settings.dateOfBirth, settings.isaDrawAge);
  const alphaAbsDate = resolveAlphaAbsDate(settings.alphaPensionAbsDate);
  const nuvosAbsDate = resolveAlphaAbsDate(settings.nuvosPensionAbsDate);

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
    (total, row) => total + row.monthlyAddedPension + row.lumpSumAddedPension,
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

    const monthlyAddedPension = settings.showAlpha
      ? calculateMonthlyAddedPension({
          rowDate,
          stopDate: addedPensionStopDate,
          dateOfBirth: settings.dateOfBirth,
          addedPensionMonthlyContribution: settings.alphaAddedPensionMonthly,
          factorType: settings.alphaAddedPensionFactorType,
          contributionMultiplier: getPartialRetirementContributionMultiplier(
            settings,
            rowDate,
          ),
        })
      : 0;
    const lumpSumAddedPensionPurchasedThisRow = settings.showAlpha
      ? calculateLumpSumAddedPension({
          rowDate,
          previousRowDate,
          dateOfBirth: settings.dateOfBirth,
          lumpSums: settings.alphaAddedPensionLumpSums,
        })
      : 0;
    cumulativeStandardAddedPension +=
      monthlyAddedPension + lumpSumAddedPensionPurchasedThisRow;
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
    const annualNuvosPension = calculateAnnualNuvosPensionAtDate({
      settings,
      rowDate,
      nuvosAbsDate,
      accrualStopDate: nuvosAccrualStopDate,
    });
    const annualNuvosPensionIncludingReduction =
      calculateAnnualAlphaPensionIncludingReduction(
        annualNuvosPension,
        nuvosDrawDate,
        nuvosNpaDate,
        nuvosReductionFactor,
      );
    const monthlyNuvosPensionTakeHome = calculateMonthlyAlphaPensionTakeHome(
      rowDate,
      nuvosDrawDate,
      annualNuvosPensionIncludingReduction,
    );
    const monthlyStatePension = calculateMonthlyStatePension(
      rowDate,
      settings.statePensionDrawDate,
      calculateAnnualStatePensionAtDate(settings, rowDate),
    );
    const totalMonthlyPensionIncomeBeforeTax = calculateTotalGrossMonthlyPension(
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
      sippProjection.monthlySippPension,
      isaProjection.monthlyIsaPension,
      monthlyNuvosPensionTakeHome,
    );
    const monthlyIncomeTax = calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension: monthlyAlphaPensionTakeHome,
      monthlyNuvosPension: monthlyNuvosPensionTakeHome,
      monthlyStatePension,
      monthlySippPension: sippProjection.monthlySippPension,
    });
    const totalMonthlyPensionTakeHomePay =
      totalMonthlyPensionIncomeBeforeTax - monthlyIncomeTax;

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
      annualNuvosPension,
      annualNuvosPensionIncludingReduction,
      monthlyNuvosPensionTakeHome,
      monthlyStatePension,
      sippPot: sippProjection.sippPot,
      monthlySippPension: sippProjection.monthlySippPension,
      isaPot: isaProjection.isaPot,
      monthlyIsaPension: isaProjection.monthlyIsaPension,
      totalMonthlyPensionIncomeBeforeTax,
      monthlyIncomeTax,
      totalMonthlyPensionTakeHomePay,
    };

    previousRowDate = rowDate;

    return projectionRow;
  });

  const allRows = [...historicalRows, ...projectionRows];
  const milestoneDefinitions = generateMilestoneDefinitions(
    settings.startDate,
    settings.showAlpha ? accrualStopDate : "",
    settings.showAlpha ? drawDate : "",
    settings.showSipp ? sippDrawDate : "",
    settings.showIsa ? isaDrawDate : "",
    settings.statePensionDrawDate,
    endDate,
    settings.alphaAddedPensionLumpSums,
    alphaAbsDate,
    settings.showSipp ? settings.sippLumpSums : [],
    settings.showIsa ? settings.isaLumpSums : [],
    settings.showStatePension,
    settings.showNuvos ? nuvosAccrualStopDate : "",
    settings.showNuvos ? nuvosDrawDate : "",
    settings.showNuvos ? nuvosAbsDate : "",
    settings.partialRetirementEnabled ? getPartialRetirementStartDate(settings) : "",
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
    nuvosDrawDate,
    nuvosAccrualStopDate,
    nuvosNpaDate,
    nuvosReductionFactor,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  } = derivedInputs;
  const sippDrawDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const isaDrawDate = addYears(settings.dateOfBirth, settings.isaDrawAge);
  const alphaAbsDate = resolveAlphaAbsDate(settings.alphaPensionAbsDate);
  const nuvosAbsDate = resolveAlphaAbsDate(settings.nuvosPensionAbsDate);
  const firstRowDate = minIsoDate(
    minIsoDate(alphaAbsDate, settings.showNuvos ? nuvosAbsDate : settings.startDate),
    settings.startDate,
  );
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

    const monthlyAddedPension = shouldShowAbsStatementOnly || !settings.showAlpha
      ? 0
      : calculateMonthlyAddedPension({
          rowDate,
          stopDate: addedPensionStopDate,
          dateOfBirth: settings.dateOfBirth,
          addedPensionMonthlyContribution: settings.alphaAddedPensionMonthly,
          factorType: settings.alphaAddedPensionFactorType,
          contributionMultiplier: getPartialRetirementContributionMultiplier(
            settings,
            rowDate,
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

    if (monthlyAddedPension > 0) {
      benefitComponents.push({
        amount: monthlyAddedPension,
        startDate: rowDate,
        portion: "standard",
      });
    }

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
      cpiPercent: getModelledPensionInflationPercent(settings),
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
    const annualNuvosPension = calculateAnnualNuvosPensionAtDate({
      settings,
      rowDate,
      nuvosAbsDate,
      accrualStopDate: nuvosAccrualStopDate,
    });
    const annualNuvosPensionIncludingReduction =
      calculateAnnualAlphaPensionIncludingReduction(
        annualNuvosPension,
        nuvosDrawDate,
        nuvosNpaDate,
        nuvosReductionFactor,
      );
    const monthlyNuvosPensionTakeHome = calculateMonthlyAlphaPensionTakeHome(
      rowDate,
      nuvosDrawDate,
      annualNuvosPensionIncludingReduction,
    );
    const monthlyStatePension = calculateMonthlyStatePension(
      rowDate,
      settings.statePensionDrawDate,
      calculateAnnualStatePensionAtDate(settings, rowDate),
    );

    const totalMonthlyPensionIncomeBeforeTax = calculateTotalGrossMonthlyPension(
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
      sippProjection.monthlySippPension,
      isaProjection.monthlyIsaPension,
      monthlyNuvosPensionTakeHome,
    );
    const monthlyIncomeTax = calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension: monthlyAlphaPensionTakeHome,
      monthlyNuvosPension: monthlyNuvosPensionTakeHome,
      monthlyStatePension,
      monthlySippPension: sippProjection.monthlySippPension,
    });

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
      annualNuvosPension,
      annualNuvosPensionIncludingReduction,
      monthlyNuvosPensionTakeHome,
      monthlyStatePension,
      sippPot: sippProjection.sippPot,
      monthlySippPension: sippProjection.monthlySippPension,
      isaPot: isaProjection.isaPot,
      monthlyIsaPension: isaProjection.monthlyIsaPension,
      totalMonthlyPensionIncomeBeforeTax,
      monthlyIncomeTax,
      totalMonthlyPensionTakeHomePay:
        totalMonthlyPensionIncomeBeforeTax - monthlyIncomeTax,
    };
  });

  const milestoneDefinitions = generateMilestoneDefinitions(
    settings.startDate,
    settings.showAlpha ? accrualStopDate : "",
    settings.showAlpha ? drawDate : "",
    settings.showSipp ? sippDrawDate : "",
    settings.showIsa ? isaDrawDate : "",
    settings.statePensionDrawDate,
    endDate,
    settings.alphaAddedPensionLumpSums,
    alphaAbsDate,
    settings.showSipp ? settings.sippLumpSums : [],
    settings.showIsa ? settings.isaLumpSums : [],
    settings.showStatePension,
    settings.showNuvos ? nuvosAccrualStopDate : "",
    settings.showNuvos ? nuvosDrawDate : "",
    settings.showNuvos ? nuvosAbsDate : "",
    settings.partialRetirementEnabled ? getPartialRetirementStartDate(settings) : "",
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
  const alphaAbsDate = resolveAlphaAbsDate(settings.alphaPensionAbsDate);
  const alphaPensionDrawDate = addYears(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge,
  );
  const alphaAccrualStopDate = minIsoDate(
    alphaPensionDrawDate,
    addYears(settings.dateOfBirth, settings.alphaPensionLeaveAge),
  );
  const startingAlphaPortionsAtStartDate = calculateStartingAlphaPortionsAtStartDate({
    settings,
    alphaAbsDate,
    accrualStopDate: alphaAccrualStopDate,
  });
  const startingAlphaPensionAtStartDate =
    startingAlphaPortionsAtStartDate.standardAlphaPension +
    startingAlphaPortionsAtStartDate.epaAlphaPension;

  if (tableData.length === 0) {
    const sippDrawDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
    const isaDrawDate = addYears(settings.dateOfBirth, settings.isaDrawAge);
    const nuvosPensionDrawDate = addYears(
      settings.dateOfBirth,
      settings.nuvosPensionDrawAge,
    );
    const nuvosAccrualStopDate = minIsoDate(
      nuvosPensionDrawDate,
      addYears(settings.dateOfBirth, settings.nuvosPensionLeaveAge),
    );
    const normalPensionAge = calculateNormalPensionAge(settings.dateOfBirth);
    const npaDate = addYears(settings.dateOfBirth, normalPensionAge);
    const reductionFactor =
      alphaPensionDrawDate > npaDate
        ? 1
        : getEarlyRetirementReductionFactor(
            normalPensionAge,
            settings.alphaPensionDrawAge,
          );

    return {
      keyDates: {
        stopsAlphaAccrual: alphaAccrualStopDate,
        startsAlphaPension: alphaPensionDrawDate,
        stopsNuvosAccrual: nuvosAccrualStopDate,
        startsNuvosPension: nuvosPensionDrawDate,
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
      nuvosPension: {
        annualAtDraw: 0,
        monthlyAtDraw: 0,
        maximumAnnualAccrued: 0,
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
        normalPensionAge,
        statePensionAge: calculateAge(settings.dateOfBirth, settings.statePensionDrawDate),
        earlyRetirementReductionPercent: Math.max(0, (1 - reductionFactor) * 100),
      },
      retirementIncome: buildRetirementIncomeSummary({
        alphaMonthlyIncome: 0,
        nuvosMonthlyIncome: 0,
        sippMonthlyIncome: 0,
        isaMonthlyIncome: 0,
        statePensionMonthlyIncome: 0,
        monthlyIncomeTax: 0,
        settings,
      }),
    };
  }

  const sippDrawDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const isaDrawDate = addYears(settings.dateOfBirth, settings.isaDrawAge);
  const nuvosPensionDrawDate = addYears(
    settings.dateOfBirth,
    settings.nuvosPensionDrawAge,
  );
  const nuvosAccrualStopDate = minIsoDate(
    nuvosPensionDrawDate,
    addYears(settings.dateOfBirth, settings.nuvosPensionLeaveAge),
  );
  const statePensionStartDate = settings.statePensionDrawDate;
  const normalPensionAge = calculateNormalPensionAge(settings.dateOfBirth);
  const npaDate = addYears(settings.dateOfBirth, normalPensionAge);
  const reductionFactor =
    alphaPensionDrawDate > npaDate
      ? 1
      : getEarlyRetirementReductionFactor(
          normalPensionAge,
          settings.alphaPensionDrawAge,
        );
  const alphaDrawRow =
    findFirstRowAtOrAfterDate(tableData, alphaPensionDrawDate) ?? tableData.at(-1);
  const nuvosDrawRow =
    findFirstRowAtOrAfterDate(tableData, nuvosPensionDrawDate) ?? tableData.at(-1);
  const statePensionRow =
    findFirstRowAtOrAfterDate(tableData, statePensionStartDate) ?? tableData.at(-1);
  const sippDrawRow =
    findFirstRowAtOrAfterDate(tableData, sippDrawDate) ?? tableData.at(-1);
  const isaDrawRow =
    findFirstRowAtOrAfterDate(tableData, isaDrawDate) ?? tableData.at(-1);
  const maximumAnnualAccrued = Math.max(...tableData.map((row) => row.annualAccruedAlphaPension));
  const maximumAnnualNuvosAccrued = settings.showNuvos
    ? Math.max(...tableData.map((row) => row.annualNuvosPension))
    : 0;
  const totalAddedAfterToday = maximumAnnualAccrued - startingAlphaPensionAtStartDate;

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
      annualAtDraw: alphaDrawRow?.annualAlphaPensionIncludingReduction ?? 0,
      monthlyAtDraw: alphaDrawRow?.monthlyAlphaPensionTakeHome ?? 0,
      maximumAnnualAccrued,
      totalAddedAfterToday,
    },
    nuvosPension: {
      annualAtDraw: nuvosDrawRow?.annualNuvosPensionIncludingReduction ?? 0,
      monthlyAtDraw: nuvosDrawRow?.monthlyNuvosPensionTakeHome ?? 0,
      maximumAnnualAccrued: maximumAnnualNuvosAccrued,
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
      normalPensionAge,
      statePensionAge: calculateAge(settings.dateOfBirth, statePensionStartDate),
      earlyRetirementReductionPercent: Math.max(0, (1 - reductionFactor) * 100),
    },
    retirementIncome: buildRetirementIncomeSummary({
      alphaMonthlyIncome: alphaDrawRow?.monthlyAlphaPensionTakeHome ?? 0,
      nuvosMonthlyIncome: nuvosDrawRow?.monthlyNuvosPensionTakeHome ?? 0,
      sippMonthlyIncome: sippDrawRow?.monthlySippPension ?? 0,
      isaMonthlyIncome: isaDrawRow?.monthlyIsaPension ?? 0,
      statePensionMonthlyIncome: statePensionRow?.monthlyStatePension ?? 0,
      monthlyIncomeTax: calculateMonthlyIncomeTax({
        settings,
        monthlyAlphaPension: alphaDrawRow?.monthlyAlphaPensionTakeHome ?? 0,
        monthlyNuvosPension: nuvosDrawRow?.monthlyNuvosPensionTakeHome ?? 0,
        monthlyStatePension: statePensionRow?.monthlyStatePension ?? 0,
        monthlySippPension: sippDrawRow?.monthlySippPension ?? 0,
      }),
      settings,
    }),
  };
}

export function prepareBridgeProjectionSettings(settings: PensionSettings): PensionSettings {
  return {
    ...settings,
    alphaPensionLeaveAge: settings.requirementAge,
    nuvosPensionLeaveAge: settings.requirementAge,
    isaDrawAge: settings.requirementAge,
  };
}

export function generateRetirementBridgeAnalysis(
  pensionRows: ProjectionRow[],
  settings: PensionSettings,
  options: { calculateSafeDrawAge?: boolean } = {},
): RetirementBridgeAnalysis {
  const retirementDate = addYears(settings.dateOfBirth, settings.requirementAge);
  const endDate = getLifeExpectancyDate(settings.dateOfBirth, settings.lifeExpectancy);
  const sippAccessDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const monthlyTargetIncome = settings.desiredRetirementIncome / 12;
  const bridgeRows = generateMonthlyDateRange(retirementDate, endDate);
  const isaMonthlyGrowthRate = settings.isaApplyRealInterest
    ? (1 + settings.isaRealInterestPercent / 100) ** (1 / 12) - 1
    : 0;
  const sippMonthlyGrowthRate = settings.sippApplyRealInterest
    ? (1 + settings.sippRealInterestPercent / 100) ** (1 / 12) - 1
    : 0;
  let isaBalance = settings.showIsa
    ? calculateIsaPotAtDate({
        settings: { ...settings, showIsa: true },
        rowDate: retirementDate,
        drawDate: retirementDate,
      })
    : 0;
  let sippBalance = settings.showSipp
    ? calculateSippPotAtDate({
        settings: { ...settings, showSipp: true },
        rowDate: retirementDate,
        drawDate: retirementDate,
      })
    : 0;
  let totalBridgeRequired = 0;
  let totalUnfundedShortfall = 0;
  let requiredIsaAtRetirement = 0;
  let requiredSippAtAccess = 0;
  let firstFailureDate: string | null = null;
  let firstPotToFail: string | null = null;

  const monthlyRows = bridgeRows.map((rowDate, index) => {
    const isaGrowth = index === 0 ? 0 : isaBalance * isaMonthlyGrowthRate;
    const sippGrowth = index === 0 ? 0 : sippBalance * sippMonthlyGrowthRate;
    isaBalance += isaGrowth;
    sippBalance += sippGrowth;

    const pensionRow = findFirstRowAtOrAfterDate(pensionRows, rowDate) ?? pensionRows.at(-1);
    const monthlyAlphaPension =
      settings.showAlpha && pensionRow ? pensionRow.monthlyAlphaPensionTakeHome : 0;
    const monthlyNuvosPension =
      settings.showNuvos && pensionRow ? pensionRow.monthlyNuvosPensionTakeHome : 0;
    const monthlyStatePension =
      settings.showStatePension && pensionRow ? pensionRow.monthlyStatePension : 0;
    const monthlyIncomeTax = calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension,
      monthlyNuvosPension,
      monthlyStatePension,
      monthlySippPension: 0,
    });
    const guaranteedIncome = Math.max(
      0,
      monthlyAlphaPension + monthlyNuvosPension + monthlyStatePension - monthlyIncomeTax,
    );
    const shortfall = Math.max(0, monthlyTargetIncome - guaranteedIncome);
    const surplus = Math.max(0, guaranteedIncome - monthlyTargetIncome);
    let remainingShortfall = shortfall;
    let isaDrawdown = 0;
    let sippDrawdown = 0;

    if (rowDate >= sippAccessDate && settings.showSipp) {
      sippDrawdown = Math.min(sippBalance, remainingShortfall);
      sippBalance -= sippDrawdown;
      remainingShortfall -= sippDrawdown;
    }

    if (settings.showIsa) {
      isaDrawdown = Math.min(isaBalance, remainingShortfall);
      isaBalance -= isaDrawdown;
      remainingShortfall -= isaDrawdown;
    }

    if (shortfall > 0 && rowDate < sippAccessDate) {
      requiredIsaAtRetirement += shortfall;
    }

    if (shortfall > 0 && rowDate >= sippAccessDate) {
      requiredSippAtAccess += shortfall;
    }

    totalBridgeRequired += isaDrawdown + sippDrawdown;
    totalUnfundedShortfall += remainingShortfall;

    if (remainingShortfall > 0 && !firstFailureDate) {
      firstFailureDate = rowDate;
      firstPotToFail =
        rowDate < sippAccessDate
          ? "ISA before SIPP access"
          : "SIPP/ISA bridge after SIPP access";
    }

    return {
      date: rowDate,
      age: calculateAge(settings.dateOfBirth, rowDate),
      ageMonths: calculateAgeMonths(settings.dateOfBirth, rowDate),
      monthlyAlphaPension,
      monthlyNuvosPension,
      monthlyStatePension,
      monthlyTargetIncome,
      guaranteedIncome,
      shortfall,
      surplus,
      isaDrawdown,
      sippDrawdown,
      unfundedShortfall: remainingShortfall,
      isaBalance,
      sippBalance,
      growth: isaGrowth + sippGrowth,
      milestones: [],
      milestoneDates: [],
      activeSources: getActiveBridgeIncomeSources({
        settings,
        monthlyAlphaPension,
        monthlyNuvosPension,
        monthlyStatePension,
      }),
    };
  });
  const stableRow = monthlyRows.at(-1);
  const stableAnnualGuaranteedIncome = (stableRow?.guaranteedIncome ?? 0) * 12;
  const fullSecureIncomeStartDate = getFullSecureIncomeStartDate(
    settings,
    retirementDate,
    endDate,
  );
  const fullSecureIncomeStartRow = fullSecureIncomeStartDate
    ? monthlyRows.find((row) => row.date >= fullSecureIncomeStartDate)
    : undefined;
  const fullSecureAnnualGuaranteedIncome =
    (fullSecureIncomeStartRow?.guaranteedIncome ?? 0) * 12;
  const monthsUntilRetirement = Math.max(
    1,
    calculateWholeMonthDifference(settings.startDate, retirementDate),
  );
  const analysisWithoutSafeDrawAge: RetirementBridgeAnalysis = {
    target: {
      retirementDate,
      retirementAge: settings.requirementAge,
      annualIncome: settings.desiredRetirementIncome,
      monthlyIncome: monthlyTargetIncome,
      endDate,
    },
    planWorks: totalUnfundedShortfall <= 0.005,
    firstFailureDate,
    firstPotToFail,
    totalBridgeRequired,
    totalUnfundedShortfall,
    requiredIsaAtRetirement,
    requiredSippAtAccess,
    additionalMonthlyContributionRequired:
      totalUnfundedShortfall > 0 ? totalUnfundedShortfall / monthsUntilRetirement : 0,
    earliestSustainablePensionDrawAge: null,
    fullSecureIncomeStartDate: fullSecureIncomeStartRow
      ? fullSecureIncomeStartDate
      : null,
    fullSecureIncomeStartAge:
      fullSecureIncomeStartRow && fullSecureIncomeStartDate
        ? calculateAge(settings.dateOfBirth, fullSecureIncomeStartDate)
        : null,
    fullSecureIncomeStartAgeMonths:
      fullSecureIncomeStartRow && fullSecureIncomeStartDate
        ? calculateAgeMonths(settings.dateOfBirth, fullSecureIncomeStartDate)
        : null,
    fullSecureAnnualGuaranteedIncome,
    fullSecureAnnualGuaranteedSurplus:
      fullSecureAnnualGuaranteedIncome - settings.desiredRetirementIncome,
    stableAnnualGuaranteedIncome,
    stableAnnualGuaranteedSurplus:
      stableAnnualGuaranteedIncome - settings.desiredRetirementIncome,
    phases: buildBridgePhases(monthlyRows, settings, retirementDate, endDate),
    potProjection: buildBridgePotProjection(monthlyRows, settings),
  };

  if (!options.calculateSafeDrawAge) {
    return analysisWithoutSafeDrawAge;
  }

  return {
    ...analysisWithoutSafeDrawAge,
    earliestSustainablePensionDrawAge: calculateEarliestSustainablePensionDrawAge(
      settings,
    ),
  };
}

function getFullSecureIncomeStartDate(
  settings: PensionSettings,
  retirementDate: string,
  endDate: string,
) {
  const secureStartDates = [
    ...(settings.showAlpha ? [addYears(settings.dateOfBirth, settings.alphaPensionDrawAge)] : []),
    ...(settings.showNuvos ? [addYears(settings.dateOfBirth, settings.nuvosPensionDrawAge)] : []),
    ...(settings.showStatePension ? [settings.statePensionDrawDate] : []),
  ];

  if (secureStartDates.length === 0) {
    return null;
  }

  const latestSecureStartDate = secureStartDates.sort().at(-1);

  if (!latestSecureStartDate || latestSecureStartDate > endDate) {
    return null;
  }

  return latestSecureStartDate < retirementDate ? retirementDate : latestSecureStartDate;
}

function getActiveBridgeIncomeSources(input: {
  settings: PensionSettings;
  monthlyAlphaPension: number;
  monthlyNuvosPension: number;
  monthlyStatePension: number;
}) {
  const sources = [
    ...(input.settings.showAlpha && input.monthlyAlphaPension > 0
      ? ["Alpha"]
      : []),
    ...(input.settings.showNuvos && input.monthlyNuvosPension > 0
      ? ["nuvos"]
      : []),
    ...(input.settings.showStatePension && input.monthlyStatePension > 0
      ? ["State Pension"]
      : []),
  ];

  return sources.length > 0 ? sources : ["None"];
}

function buildBridgePhases(
  monthlyRows: Array<{
    date: string;
    age: number;
    ageMonths: number;
    monthlyTargetIncome: number;
    monthlyAlphaPension: number;
    monthlyNuvosPension: number;
    monthlyStatePension: number;
    shortfall: number;
    surplus: number;
    isaDrawdown: number;
    sippDrawdown: number;
    unfundedShortfall: number;
    activeSources: string[];
  }>,
  settings: PensionSettings,
  retirementDate: string,
  endDate: string,
): BridgePhase[] {
  if (monthlyRows.length === 0) {
    return [];
  }

  const eventDates = [
    retirementDate,
    ...(settings.showSipp ? [addYears(settings.dateOfBirth, settings.sippDrawAge)] : []),
    ...(settings.showAlpha ? [addYears(settings.dateOfBirth, settings.alphaPensionDrawAge)] : []),
    ...(settings.showNuvos ? [addYears(settings.dateOfBirth, settings.nuvosPensionDrawAge)] : []),
    ...(settings.showStatePension ? [settings.statePensionDrawDate] : []),
    endDate,
  ]
    .filter((date) => date >= retirementDate && date <= endDate)
    .sort();
  const uniqueEventDates = [...new Set(eventDates)];

  return uniqueEventDates.slice(0, -1).flatMap((phaseStart, index) => {
    const nextPhaseStart = uniqueEventDates[index + 1];
    const rows = monthlyRows.filter((row) =>
      index === uniqueEventDates.length - 2
        ? row.date >= phaseStart && row.date <= nextPhaseStart
        : row.date >= phaseStart && row.date < nextPhaseStart,
    );

    if (rows.length === 0) {
      return [];
    }

    const firstRow = rows[0];
    const boundaryEndAge = calculateAge(settings.dateOfBirth, nextPhaseStart);
    const boundaryEndAgeMonths = calculateAgeMonths(
      settings.dateOfBirth,
      nextPhaseStart,
    );
    const totalDrawdown = rows.reduce(
      (total, row) => total + row.isaDrawdown + row.sippDrawdown,
      0,
    );
    const totalIsaBridge = rows.reduce((total, row) => total + row.isaDrawdown, 0);
    const totalSippBridge = rows.reduce((total, row) => total + row.sippDrawdown, 0);
    const totalUnfunded = rows.reduce(
      (total, row) => total + row.unfundedShortfall,
      0,
    );
    const annualiseAverage = (monthlyValues: number[]) =>
      (monthlyValues.reduce((total, value) => total + value, 0) / rows.length) * 12;
    const averageAnnualTarget = annualiseAverage(
      rows.map((row) => row.monthlyTargetIncome),
    );
    const averageAnnualAlphaPension = annualiseAverage(
      rows.map((row) => row.monthlyAlphaPension),
    );
    const averageAnnualNuvosPension = annualiseAverage(
      rows.map((row) => row.monthlyNuvosPension),
    );
    const averageAnnualStatePension = annualiseAverage(
      rows.map((row) => row.monthlyStatePension),
    );
    const averageAnnualIsaBridge = annualiseAverage(rows.map((row) => row.isaDrawdown));
    const averageAnnualSippBridge = annualiseAverage(
      rows.map((row) => row.sippDrawdown),
    );
    const averageAnnualShortfall =
      (rows.reduce((total, row) => total + row.shortfall, 0) / rows.length) * 12;
    const averageAnnualSurplus =
      (rows.reduce((total, row) => total + row.surplus, 0) / rows.length) * 12;
    const potLabels = [
      rows.some((row) => row.isaDrawdown > 0) ? "ISA bridge" : "",
      rows.some((row) => row.sippDrawdown > 0) ? "SIPP bridge" : "",
      rows.some((row) => row.unfundedShortfall > 0) ? "Unfunded shortfall" : "",
    ].filter(Boolean);

    return [
      {
        startDate: firstRow.date,
        endDate: nextPhaseStart,
        startAge: firstRow.age,
        startAgeMonths: firstRow.ageMonths,
        endAge: boundaryEndAge,
        endAgeMonths: boundaryEndAgeMonths,
        label: formatBridgePhaseLabel(
          phaseStart,
          nextPhaseStart,
          settings,
          retirementDate,
          endDate,
        ),
        incomeSourcesActive: firstRow.activeSources,
        potUsed: potLabels.length > 0 ? potLabels.join(" + ") : "None",
        annualTargetIncome: averageAnnualTarget,
        annualAlphaPension: averageAnnualAlphaPension,
        annualNuvosPension: averageAnnualNuvosPension,
        annualStatePension: averageAnnualStatePension,
        annualIsaBridge: averageAnnualIsaBridge,
        annualSippBridge: averageAnnualSippBridge,
        annualShortfall: averageAnnualShortfall,
        annualSurplus: averageAnnualSurplus,
        totalIsaBridge,
        totalSippBridge,
        totalBridgeRequired: totalDrawdown,
        unfundedShortfall: totalUnfunded,
      },
    ];
  });
}

function formatBridgePhaseLabel(
  phaseStart: string,
  nextPhaseStart: string,
  settings: PensionSettings,
  retirementDate: string,
  endDate: string,
) {
  const startLabel = formatBridgeBoundaryLabel(phaseStart, settings, retirementDate, endDate);
  const nextLabel = formatBridgeBoundaryLabel(
    nextPhaseStart,
    settings,
    retirementDate,
    endDate,
  );

  return `${startLabel} to ${nextLabel}`;
}

function formatBridgeBoundaryLabel(
  date: string,
  settings: PensionSettings,
  retirementDate: string,
  endDate: string,
) {
  const sippAccessDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const alphaDrawDate = addYears(settings.dateOfBirth, settings.alphaPensionDrawAge);
  const nuvosDrawDate = addYears(settings.dateOfBirth, settings.nuvosPensionDrawAge);
  const labels = [
    date === retirementDate ? "Retirement" : "",
    settings.showSipp && date === sippAccessDate ? "SIPP access" : "",
    settings.showAlpha && date === alphaDrawDate ? "Alpha" : "",
    settings.showNuvos && date === nuvosDrawDate ? "nuvos" : "",
    settings.showStatePension && date === settings.statePensionDrawDate
      ? "State Pension"
      : "",
    date === endDate ? "modelling end" : "",
  ].filter(Boolean);

  return labels.length > 0 ? formatList(labels) : "bridge phase";
}

function formatList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function buildBridgePotProjection(
  monthlyRows: BridgePotProjectionRow[],
  settings: PensionSettings,
) {
  const incomeStartMilestonesByRowDate = new Map<
    string,
    Array<{ label: string; date: string }>
  >();
  const firstRowDate = monthlyRows[0]?.date;
  const lastRowDate = monthlyRows.at(-1)?.date;
  const addIncomeStartMilestone = (date: string, label: string) => {
    if (!firstRowDate || !lastRowDate || date < firstRowDate || date > lastRowDate) {
      return;
    }

    const rowDate = monthlyRows.find((row) => row.date >= date)?.date;

    if (!rowDate) {
      return;
    }

    incomeStartMilestonesByRowDate.set(rowDate, [
      ...(incomeStartMilestonesByRowDate.get(rowDate) ?? []),
      { label, date },
    ]);
  };

  addIncomeStartMilestone(
    addYears(settings.dateOfBirth, settings.requirementAge),
    "Retirement starts",
  );

  if (settings.showAlpha) {
    addIncomeStartMilestone(
      addYears(settings.dateOfBirth, settings.alphaPensionDrawAge),
      "Alpha starts",
    );
  }

  if (settings.showNuvos) {
    addIncomeStartMilestone(
      addYears(settings.dateOfBirth, settings.nuvosPensionDrawAge),
      "nuvos starts",
    );
  }

  if (settings.showStatePension) {
    addIncomeStartMilestone(settings.statePensionDrawDate, "State Pension starts");
  }

  if (settings.partialRetirementEnabled) {
    addIncomeStartMilestone(
      getPartialRetirementStartDate(settings),
      "Partial retirement starts",
    );
  }

  let hasStartedIsaDrawdown = false;
  let hasStartedSippDrawdown = false;
  let hasIncludedIsaDepletion = false;
  let hasIncludedSippDepletion = false;

  return monthlyRows.map((row, index) => {
    const milestones: string[] = [];
    const milestoneDates: string[] = [];
    const previousRow = index > 0 ? monthlyRows[index - 1] : undefined;
    const isFirstIsaDrawdown = row.isaDrawdown > 0 && !hasStartedIsaDrawdown;
    const isFirstSippDrawdown = row.sippDrawdown > 0 && !hasStartedSippDrawdown;
    const isIsaDepleted =
      settings.showIsa &&
      !hasIncludedIsaDepletion &&
      row.isaBalance <= 0.005 &&
      ((previousRow?.isaBalance ?? 0) > 0.005 || row.isaDrawdown > 0);
    const isSippDepleted =
      settings.showSipp &&
      !hasIncludedSippDepletion &&
      row.sippBalance <= 0.005 &&
      ((previousRow?.sippBalance ?? 0) > 0.005 || row.sippDrawdown > 0);

    if (isFirstIsaDrawdown) {
      hasStartedIsaDrawdown = true;
      milestones.push("ISA drawdown starts");
      milestoneDates.push(row.date);
    }

    if (isFirstSippDrawdown) {
      hasStartedSippDrawdown = true;
      milestones.push("SIPP drawdown starts");
      milestoneDates.push(row.date);
    }

    if (isIsaDepleted) {
      hasIncludedIsaDepletion = true;
      milestones.push("ISA pot exhausted");
      milestoneDates.push(row.date);
    }

    if (isSippDepleted) {
      hasIncludedSippDepletion = true;
      milestones.push("SIPP pot exhausted");
      milestoneDates.push(row.date);
    }

    for (const milestone of incomeStartMilestonesByRowDate.get(row.date) ?? []) {
      milestones.push(milestone.label);
      milestoneDates.push(milestone.date);
    }

    return {
      ...row,
      milestones,
      milestoneDates,
    };
  });
}

function calculateEarliestSustainablePensionDrawAge(settings: PensionSettings) {
  if (!settings.showAlpha && !settings.showNuvos) {
    return null;
  }

  const earliestAge = Math.max(55, Math.ceil(settings.requirementAge));
  const latestAge = Math.min(
    settings.showAlpha ? settings.normalPensionAge : 70,
    settings.showNuvos ? NUVOS_NORMAL_PENSION_AGE : 70,
  );

  for (let age = earliestAge; age <= latestAge; age += 1) {
    const candidateSettings = prepareBridgeProjectionSettings({
      ...settings,
      alphaPensionDrawAge: settings.showAlpha ? age : settings.alphaPensionDrawAge,
      nuvosPensionDrawAge: settings.showNuvos ? age : settings.nuvosPensionDrawAge,
      showSipp: false,
      showIsa: false,
    });
    const rows = createProjectionTable(candidateSettings);
    const analysis = generateRetirementBridgeAnalysis(rows, {
      ...candidateSettings,
      showSipp: settings.showSipp,
      showIsa: settings.showIsa,
    });

    if (
      analysis.planWorks &&
      analysis.stableAnnualGuaranteedIncome >= settings.desiredRetirementIncome
    ) {
      return age;
    }
  }

  return null;
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
      ? [createRetirementIncomeSource("alpha", "Alpha pension", alphaMonthlyIncome)]
      : []),
    ...(settings.showNuvos
      ? [createRetirementIncomeSource("nuvos", "nuvos pension", nuvosMonthlyIncome)]
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
            statePensionMonthlyIncome,
          ),
        ]
      : []),
    ...(settings.taxationEnabled
      ? [createRetirementIncomeSource("incomeTax", "Estimated Income Tax", -monthlyIncomeTax)]
      : []),
  ];

  const totalMonthlyIncome = sources.reduce((total, source) => total + source.monthlyIncome, 0);

  return {
    sources,
    totalMonthlyIncome,
    totalAnnualIncome: totalMonthlyIncome * 12,
  };
}

function createRetirementIncomeSource(
  key: RetirementIncomeSource["key"],
  label: string,
  monthlyIncome: number,
): RetirementIncomeSource {
  return {
    key,
    label,
    monthlyIncome,
    annualIncome: monthlyIncome * 12,
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
  if (!settings.showAlpha) {
    return 0;
  }

  return isEpaAccrualDate(settings, rowDate)
    ? 0
    : calculateMonthlyAlphaAccrual(settings.pensionableEarnings) *
        getPartialRetirementContributionMultiplier(settings, rowDate);
}

export function calculateMonthlyEpaAlphaAccrual(
  settings: PensionSettings,
  rowDate: string,
) {
  if (!settings.showAlpha) {
    return 0;
  }

  return isEpaAccrualDate(settings, rowDate)
    ? calculateMonthlyAlphaAccrual(settings.pensionableEarnings) *
        getPartialRetirementContributionMultiplier(settings, rowDate)
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

export function calculateAnnualNuvosPensionAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  nuvosAbsDate: string;
  accrualStopDate: string;
}) {
  const { settings, rowDate, nuvosAbsDate, accrualStopDate } = input;

  if (!settings.showNuvos || rowDate < nuvosAbsDate) {
    return 0;
  }

  const benefitComponents: { amount: number; startDate: string }[] = [
    {
      amount: settings.nuvosAccruedPensionAtLastAbs,
      startDate: nuvosAbsDate,
    },
  ];
  let accrualDate = addMonths(nuvosAbsDate, 1);

  while (accrualDate <= rowDate && accrualDate <= accrualStopDate) {
    benefitComponents.push({
      amount: calculateMonthlyNuvosAccrual(settings, accrualDate),
      startDate: accrualDate,
    });
    accrualDate = addMonths(accrualDate, 1);
  }

  return benefitComponents.reduce((total, component) => {
    const revaluationFactor = settings.nuvosApplyPensionIncreases
      ? calculateNuvosPensionRevaluationFactor({
          fromDate: component.startDate,
          rowDate,
          cpiPercent: getModelledPensionInflationPercent(settings),
        })
      : 1;

    return total + component.amount * revaluationFactor;
  }, 0);
}

function calculateMonthlyNuvosAccrual(settings: PensionSettings, rowDate: string) {
  if (!settings.showNuvos) {
    return 0;
  }

  return (
    settings.nuvosPensionableEarnings *
    MONTHLY_NUVOS_ACCRUAL_RATE *
    getPartialRetirementContributionMultiplier(settings, rowDate)
  );
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
  const activeRate = cpiRate + ALPHA_IN_SERVICE_REVALUATION_UPLIFT_RATE;
  const totalYears = calculateWholeYearDifference(fromDate, rowDate);
  const activeYears = Math.min(
    totalYears,
    calculateWholeYearDifference(fromDate, activeUntilDate),
  );
  const deferredYears = totalYears - activeYears;

  return (1 + activeRate) ** activeYears * (1 + cpiRate) ** deferredYears;
}

export function calculateNuvosPensionRevaluationFactor(input: {
  fromDate: string;
  rowDate: string;
  cpiPercent: number;
}) {
  const { fromDate, rowDate, cpiPercent } = input;
  const cpiRate = cpiPercent / 100;
  const totalYears = calculateWholeYearDifference(fromDate, rowDate);

  return (1 + cpiRate) ** totalYears;
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
  contributionMultiplier?: number;
  factorType?: AddedPensionFactorType;
}) {
  const {
    rowDate,
    stopDate,
    dateOfBirth,
    addedPensionMonthlyContribution,
    contributionMultiplier = 1,
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

  return (addedPensionMonthlyContribution * contributionMultiplier) / (factor * revaluationFactor);
}

export function calculateLumpSumAddedPension(input: {
  rowDate: string;
  previousRowDate?: string;
  dateOfBirth: string;
  lumpSums: AddedPensionLumpSum[];
  factorType?: AddedPensionFactorType;
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
      const factor = getAddedPensionFactorForAge(age, lumpSum.factorType ?? factorType);

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
  factorType: AddedPensionFactorType = "self",
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
  if (retirementAge >= normalPensionAge) {
    return 1;
  }

  const records = reductionFactors as ReductionFactorRecord[];
  const normalPensionAges = Array.from(
    new Set(records.map((record) => record.normal_pension_age)),
  ).sort((first, second) => first - second);
  const exactNormalPensionAge = normalPensionAges.find(
    (age) => age === normalPensionAge,
  );

  if (exactNormalPensionAge !== undefined) {
    return getReductionFactorForNormalPensionAge(
      records,
      exactNormalPensionAge,
      retirementAge,
    );
  }

  const lowerNormalPensionAge = [...normalPensionAges]
    .reverse()
    .find((age) => age < normalPensionAge);
  const upperNormalPensionAge = normalPensionAges.find(
    (age) => age > normalPensionAge,
  );

  if (lowerNormalPensionAge === undefined || upperNormalPensionAge === undefined) {
    return 1;
  }

  const lowerReductionFactor = getReductionFactorForNormalPensionAge(
    records,
    lowerNormalPensionAge,
    retirementAge,
  );
  const upperReductionFactor = getReductionFactorForNormalPensionAge(
    records,
    upperNormalPensionAge,
    retirementAge,
  );
  const normalPensionAgeProgress =
    (normalPensionAge - lowerNormalPensionAge) /
    (upperNormalPensionAge - lowerNormalPensionAge);

  return (
    lowerReductionFactor +
    (upperReductionFactor - lowerReductionFactor) * normalPensionAgeProgress
  );
}

function getReductionFactorForNormalPensionAge(
  records: ReductionFactorRecord[],
  normalPensionAge: number,
  retirementAge: number,
) {
  const recordsForNormalPensionAge = records
    .filter((record) => record.normal_pension_age === normalPensionAge)
    .sort((first, second) => first.retirement_age - second.retirement_age);
  const match = recordsForNormalPensionAge.find(
    (record) => record.retirement_age === retirementAge,
  );

  if (match) {
    return match.reduction_factor;
  }

  const lowerRecord = [...recordsForNormalPensionAge]
    .reverse()
    .find((record) => record.retirement_age < retirementAge);
  const upperRecord = recordsForNormalPensionAge.find(
    (record) => record.retirement_age > retirementAge,
  );

  if (!lowerRecord || !upperRecord) {
    return 1;
  }

  const ageProgress =
    (retirementAge - lowerRecord.retirement_age) /
    (upperRecord.retirement_age - lowerRecord.retirement_age);

  return (
    lowerRecord.reduction_factor +
    (upperRecord.reduction_factor - lowerRecord.reduction_factor) * ageProgress
  );
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
  return calculateAnnualStatePensionAtDate(settings, settings.statePensionDrawDate);
}

export function calculateAnnualStatePensionAtDate(
  settings: PensionSettings,
  rowDate: string,
) {
  if (!settings.showStatePension) {
    return 0;
  }

  const baseAnnualStatePensionAtDraw = calculateBaseAnnualStatePensionAtDate(
    settings,
    settings.statePensionDrawDate,
  );
  const deferralIncreasePercent = calculateStatePensionDeferralIncreasePercent(
    settings.dateOfBirth,
    settings.statePensionDrawDate,
  );
  const annualDeferredExtraAtDraw =
    baseAnnualStatePensionAtDraw * (deferralIncreasePercent / 100);

  if (rowDate <= settings.statePensionDrawDate) {
    return baseAnnualStatePensionAtDraw + annualDeferredExtraAtDraw;
  }

  const baseAnnualStatePensionAtRow = calculateBaseAnnualStatePensionAtDate(
    settings,
    rowDate,
  );
  const annualDeferredExtraAtRow =
    annualDeferredExtraAtDraw *
    (1 + getStatePensionDeferredExtraGrowthRate(settings)) **
      calculateWholeYearDifference(settings.statePensionDrawDate, rowDate);

  return baseAnnualStatePensionAtRow + annualDeferredExtraAtRow;
}

function calculateBaseAnnualStatePensionAtDate(
  settings: PensionSettings,
  rowDate: string,
) {
  if (!settings.statePensionApplyFutureGrowth) {
    return settings.currentStatePension;
  }

  const annualGrowthRate = getStatePensionModelledIncreaseRate(settings);
  const growthYears = calculateWholeYearDifference(
    settings.startDate,
    rowDate,
  );

  return settings.currentStatePension * (1 + annualGrowthRate) ** growthYears;
}

function getStatePensionNominalIncreaseRate(settings: PensionSettings) {
  return (
    Math.max(
      settings.inflationRateAnnual,
      settings.statePensionWageGrowthPercent,
      2.5,
    ) / 100
  );
}

function getStatePensionModelledIncreaseRate(settings: PensionSettings) {
  return getModelledAnnualGrowthRate(
    settings,
    getStatePensionNominalIncreaseRate(settings),
  );
}

function getStatePensionDeferredExtraGrowthRate(settings: PensionSettings) {
  if (!settings.statePensionApplyFutureGrowth) {
    return 0;
  }

  return settings.projectionBasis === "real" ? 0 : settings.inflationRateAnnual / 100;
}

function getModelledPensionInflationPercent(settings: PensionSettings) {
  return settings.projectionBasis === "real" ? 0 : settings.inflationRateAnnual;
}

export function calculateRealAnnualRate(
  nominalRateAnnual: number,
  inflationRateAnnual: number,
) {
  return (1 + nominalRateAnnual) / (1 + inflationRateAnnual) - 1;
}

function getModelledAnnualGrowthRate(
  settings: PensionSettings,
  nominalRateAnnual: number,
) {
  if (settings.projectionBasis === "nominal") {
    return nominalRateAnnual;
  }

  return calculateRealAnnualRate(nominalRateAnnual, settings.inflationRateAnnual / 100);
}

export function calculateRetirementIncomeTargetAtDate(
  settings: PensionSettings,
  rowDate: string,
) {
  if (settings.projectionBasis === "real") {
    return settings.desiredRetirementIncome;
  }

  const monthlyInflationRate =
    (1 + settings.inflationRateAnnual / 100) ** (1 / 12) - 1;
  const monthsUntilRow = Math.max(
    0,
    calculateWholeMonthDifference(settings.startDate, rowDate),
  );

  return settings.desiredRetirementIncome * (1 + monthlyInflationRate) ** monthsUntilRow;
}

export function calculateStatePensionDeferralIncreasePercent(
  dateOfBirth: string,
  statePensionDrawDate: string,
) {
  const defaultStatePensionDrawDate = calculateStatePensionDrawDate(dateOfBirth);

  if (statePensionDrawDate <= defaultStatePensionDrawDate) {
    return 0;
  }

  const deferredWeeks = calculateWholeWeekDifference(
    defaultStatePensionDrawDate,
    statePensionDrawDate,
  );

  if (deferredWeeks < 9) {
    return 0;
  }

  return deferredWeeks / 9;
}

export function calculateTotalGrossMonthlyPension(
  monthlyAlphaPensionIncludingReduction: number,
  monthlyStatePension: number,
  monthlySippPension = 0,
  monthlyIsaPension = 0,
  monthlyNuvosPensionIncludingReduction = 0,
) {
  return (
    monthlyAlphaPensionIncludingReduction +
    monthlyNuvosPensionIncludingReduction +
    monthlyStatePension +
    monthlySippPension +
    monthlyIsaPension
  );
}

export function calculateMonthlyIncomeTax(input: {
  settings: PensionSettings;
  monthlyAlphaPension: number;
  monthlyNuvosPension?: number;
  monthlyStatePension: number;
  monthlySippPension: number;
}) {
  const {
    settings,
    monthlyAlphaPension,
    monthlyNuvosPension = 0,
    monthlyStatePension,
    monthlySippPension,
  } = input;

  if (!settings.taxationEnabled) {
    return 0;
  }

  const taxableSippShare = 1 - settings.taxSippTaxFreeWithdrawalPercent / 100;
  const annualTaxableIncome =
    (monthlyAlphaPension +
      monthlyNuvosPension +
      monthlyStatePension +
      monthlySippPension * taxableSippShare) *
    12;

  return calculateAnnualIncomeTax(settings, annualTaxableIncome) / 12;
}

export function calculateAnnualIncomeTax(
  settings: PensionSettings,
  annualTaxableIncome: number,
) {
  if (!settings.taxationEnabled || annualTaxableIncome <= 0) {
    return 0;
  }

  const personalAllowance = calculateTaxPersonalAllowance(
    settings,
    annualTaxableIncome,
  );
  const taxableAfterAllowance = Math.max(0, annualTaxableIncome - personalAllowance);
  const basicBand = Math.max(0, settings.taxBasicRateLimit);
  const additionalThreshold = Math.max(
    settings.taxAdditionalRateThreshold,
    settings.taxPersonalAllowance,
  );
  const higherBand = Math.max(
    0,
    additionalThreshold - personalAllowance - basicBand,
  );
  const basicTaxable = Math.min(taxableAfterAllowance, basicBand);
  const higherTaxable = Math.min(
    Math.max(0, taxableAfterAllowance - basicBand),
    higherBand,
  );
  const additionalTaxable = Math.max(
    0,
    taxableAfterAllowance - basicBand - higherBand,
  );

  return (
    basicTaxable * (settings.taxBasicRatePercent / 100) +
    higherTaxable * (settings.taxHigherRatePercent / 100) +
    additionalTaxable * (settings.taxAdditionalRatePercent / 100)
  );
}

function calculateTaxPersonalAllowance(
  settings: PensionSettings,
  annualTaxableIncome: number,
) {
  const taper = Math.max(
    0,
    annualTaxableIncome - settings.taxPersonalAllowanceTaperThreshold,
  );

  return Math.max(0, settings.taxPersonalAllowance - taper / 2);
}

export function calculateSippPotAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showSipp) {
    return 0;
  }

  return calculateSippProjectionRow({
    settings,
    rowDate,
    drawDate,
    endDate: input.endDate ?? getLifeExpectancyDate(settings.dateOfBirth, settings.lifeExpectancy),
  }).sippPot;
}

function calculateSippProjectionRow(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate: string;
}) {
  const { settings, rowDate, drawDate, endDate } = input;
  const projection = calculatePotProjectionAtDate({
    settings,
    rowDate,
    drawDate,
    endDate,
    showPot: settings.showSipp,
    currentPot: settings.sippCurrentPot,
    monthlyContribution: settings.sippMonthlyContribution,
    lumpSums: settings.sippLumpSums,
    applyRealInterest: settings.sippApplyRealInterest,
    realInterestPercent: settings.sippRealInterestPercent,
    withdrawalStrategy: settings.sippWithdrawalStrategy,
    withdrawalPercent: settings.sippWithdrawalPercent,
    withdrawalTargetAge: settings.sippWithdrawalTargetAge,
    contributionMultiplier: getSippContributionMultiplier(settings.sippTaxReliefRate),
  });

  return {
    sippPot: projection.pot,
    monthlySippPension: projection.monthlyWithdrawal,
  };
}

export function calculateIsaPotAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate?: string;
}) {
  const { settings, rowDate, drawDate } = input;

  if (!settings.showIsa) {
    return 0;
  }

  return calculateIsaProjectionRow({
    settings,
    rowDate,
    drawDate,
    endDate: input.endDate ?? getLifeExpectancyDate(settings.dateOfBirth, settings.lifeExpectancy),
  }).isaPot;
}

function calculateIsaProjectionRow(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate: string;
}) {
  const { settings, rowDate, drawDate, endDate } = input;
  const projection = calculatePotProjectionAtDate({
    settings,
    rowDate,
    drawDate,
    endDate,
    showPot: settings.showIsa,
    currentPot: settings.isaCurrentPot,
    monthlyContribution: settings.isaMonthlyContribution,
    lumpSums: settings.isaLumpSums,
    applyRealInterest: settings.isaApplyRealInterest,
    realInterestPercent: settings.isaRealInterestPercent,
    withdrawalStrategy: settings.isaWithdrawalStrategy,
    withdrawalPercent: settings.isaWithdrawalPercent,
    withdrawalTargetAge: settings.isaWithdrawalTargetAge,
    contributionMultiplier: 1,
  });

  return {
    isaPot: projection.pot,
    monthlyIsaPension: projection.monthlyWithdrawal,
  };
}

function calculatePotProjectionAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  drawDate: string;
  endDate: string;
  showPot: boolean;
  currentPot: number;
  monthlyContribution: number;
  lumpSums: AddedPensionLumpSum[];
  applyRealInterest: boolean;
  realInterestPercent: number;
  withdrawalStrategy: PensionSettings["sippWithdrawalStrategy"];
  withdrawalPercent: number;
  withdrawalTargetAge: number;
  contributionMultiplier: number;
}) {
  const {
    settings,
    rowDate,
    drawDate,
    endDate,
    showPot,
    currentPot,
    monthlyContribution,
    lumpSums,
    applyRealInterest,
    realInterestPercent,
    withdrawalStrategy,
    withdrawalPercent,
    withdrawalTargetAge,
    contributionMultiplier,
  } = input;

  if (!showPot || rowDate < settings.startDate) {
    return {
      pot: 0,
      monthlyWithdrawal: 0,
    };
  }

  const monthlyInterestRate = applyRealInterest
    ? (1 + getModelledAnnualGrowthRate(settings, realInterestPercent / 100)) ** (1 / 12) -
      1
    : 0;
  const projectionMonthCount = calculateWholeMonthDifference(
    settings.startDate,
    rowDate,
  );
  const withdrawalEndDate =
    withdrawalStrategy === "use_by_age"
      ? addYears(settings.dateOfBirth, withdrawalTargetAge)
      : endDate;
  const contributionStopDate = getPotContributionStopDate(settings, drawDate);
  let pot = currentPot;
  let monthlyWithdrawal = 0;
  let levelUseByAgeMonthlyWithdrawal: number | undefined;
  let previousProjectionMonthDate: string | undefined;

  for (let monthIndex = 0; monthIndex <= projectionMonthCount; monthIndex += 1) {
    const projectionMonthDate = addMonths(settings.startDate, monthIndex);

    if (monthIndex > 0) {
      pot *= 1 + monthlyInterestRate;
    }

    if (projectionMonthDate < contributionStopDate) {
      pot +=
        monthlyContribution *
        contributionMultiplier *
        getPartialRetirementSavingsContributionMultiplier(
          settings,
          projectionMonthDate,
        );
    }
    pot += calculateScheduledPotLumpSums({
      lumpSums,
      previousRowDate: previousProjectionMonthDate,
      rowDate: projectionMonthDate,
      contributionMultiplier,
      latestPaymentDateExclusive: contributionStopDate,
    });

    if (projectionMonthDate >= drawDate) {
      if (withdrawalStrategy === "use_by_age") {
        levelUseByAgeMonthlyWithdrawal ??= calculateLevelMonthlyWithdrawalFromPot({
          pot,
          rowDate: projectionMonthDate,
          endDate: withdrawalEndDate,
          monthlyInterestRate,
        });
        monthlyWithdrawal = Math.min(pot, levelUseByAgeMonthlyWithdrawal);
      } else {
        monthlyWithdrawal = calculateMonthlyWithdrawalFromPot({
          pot,
          rowDate: projectionMonthDate,
          drawDate,
          endDate: withdrawalEndDate,
          strategy: withdrawalStrategy,
          withdrawalPercent,
        });
      }
    } else {
      monthlyWithdrawal = 0;
    }
    pot = Math.max(0, pot - monthlyWithdrawal);

    previousProjectionMonthDate = projectionMonthDate;
  }

  return {
    pot,
    monthlyWithdrawal,
  };
}

export function calculateMonthlyIsaPension(input: {
  potAtDraw: number;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["isaWithdrawalStrategy"];
  withdrawalPercent: number;
  targetDate?: string;
}) {
  const { potAtDraw, drawDate, endDate, strategy, withdrawalPercent, targetDate } = input;

  if (strategy === "percentage") {
    return (potAtDraw * (withdrawalPercent / 100)) / 12;
  }

  const drawdownMonths = Math.max(
    1,
    calculateWholeMonthDifference(
      drawDate,
      strategy === "use_by_age" ? targetDate ?? endDate : endDate,
    ),
  );
  return potAtDraw / drawdownMonths;
}

export function calculateMonthlySippPension(input: {
  potAtDraw: number;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["sippWithdrawalStrategy"];
  withdrawalPercent: number;
  targetDate?: string;
}) {
  const { potAtDraw, drawDate, endDate, strategy, withdrawalPercent, targetDate } = input;

  if (strategy === "percentage") {
    return (potAtDraw * (withdrawalPercent / 100)) / 12;
  }

  const drawdownMonths = Math.max(
    1,
    calculateWholeMonthDifference(
      drawDate,
      strategy === "use_by_age" ? targetDate ?? endDate : endDate,
    ),
  );
  return potAtDraw / drawdownMonths;
}

function calculateMonthlyWithdrawalFromPot(input: {
  pot: number;
  rowDate: string;
  drawDate: string;
  endDate: string;
  strategy: PensionSettings["sippWithdrawalStrategy"];
  withdrawalPercent: number;
}) {
  const { pot, rowDate, drawDate, endDate, strategy, withdrawalPercent } = input;

  if (pot <= 0 || rowDate < drawDate) {
    return 0;
  }

  if (strategy === "percentage") {
    return Math.min(pot, (pot * (withdrawalPercent / 100)) / 12);
  }

  const drawdownMonthsRemaining = Math.max(
    1,
    calculateWholeMonthDifference(rowDate, endDate),
  );

  return Math.min(pot, pot / drawdownMonthsRemaining);
}

function calculateLevelMonthlyWithdrawalFromPot(input: {
  pot: number;
  rowDate: string;
  endDate: string;
  monthlyInterestRate: number;
}) {
  const { pot, rowDate, endDate, monthlyInterestRate } = input;
  const drawdownMonthsRemaining = Math.max(
    1,
    calculateWholeMonthDifference(rowDate, endDate),
  );

  if (pot <= 0) {
    return 0;
  }

  if (Math.abs(monthlyInterestRate) < 0.0000000001) {
    return pot / drawdownMonthsRemaining;
  }

  const discountFactor = 1 / (1 + monthlyInterestRate);
  const annuityDueFactor =
    (1 - discountFactor ** drawdownMonthsRemaining) / (1 - discountFactor);

  return annuityDueFactor > 0 ? pot / annuityDueFactor : pot / drawdownMonthsRemaining;
}

function calculateTotalSippContributionsAfterTaxRelief(
  settings: PensionSettings,
  drawDate: string,
) {
  if (!settings.showSipp) {
    return 0;
  }

  const contributionStopDate = getPotContributionStopDate(settings, drawDate);

  if (contributionStopDate <= settings.startDate) {
    return 0;
  }

  const contributionMultiplier = getSippContributionMultiplier(settings.sippTaxReliefRate);

  let regularContributions = 0;

  for (
    let monthIndex = 0;
    addMonths(settings.startDate, monthIndex) < contributionStopDate;
    monthIndex += 1
  ) {
    const contributionDate = addMonths(settings.startDate, monthIndex);
    regularContributions +=
      settings.sippMonthlyContribution *
      contributionMultiplier *
      getPartialRetirementSavingsContributionMultiplier(settings, contributionDate);
  }

  return (
    calculateSippLumpSumsBeforeDate(settings.sippLumpSums, contributionStopDate) *
      contributionMultiplier +
    regularContributions
  );
}

function calculateTotalIsaContributions(settings: PensionSettings, drawDate: string) {
  if (!settings.showIsa) {
    return 0;
  }

  const contributionStopDate = getPotContributionStopDate(settings, drawDate);

  if (contributionStopDate <= settings.startDate) {
    return 0;
  }

  let regularContributions = 0;

  for (
    let monthIndex = 0;
    addMonths(settings.startDate, monthIndex) < contributionStopDate;
    monthIndex += 1
  ) {
    const contributionDate = addMonths(settings.startDate, monthIndex);
    regularContributions +=
      settings.isaMonthlyContribution *
      getPartialRetirementSavingsContributionMultiplier(settings, contributionDate);
  }

  return (
    calculateIsaLumpSumsBeforeDate(settings.isaLumpSums, contributionStopDate) +
    regularContributions
  );
}

function getPotContributionStopDate(settings: PensionSettings, drawDate: string) {
  return minIsoDate(drawDate, addYears(settings.dateOfBirth, settings.requirementAge));
}

function getSippContributionMultiplier(
  taxReliefRate: PensionSettings["sippTaxReliefRate"],
) {
  if (taxReliefRate === "20") {
    return 1 / 0.8;
  }

  if (taxReliefRate === "40") {
    return 1 / 0.6;
  }

  return 1;
}

function calculateScheduledPotLumpSums(input: {
  lumpSums: AddedPensionLumpSum[];
  previousRowDate?: string;
  rowDate: string;
  contributionMultiplier: number;
  latestPaymentDateExclusive: string;
}) {
  const {
    lumpSums,
    previousRowDate,
    rowDate,
    contributionMultiplier,
    latestPaymentDateExclusive,
  } = input;

  return lumpSums.reduce((total, lumpSum) => {
    const matchingPaymentDates = getScheduledPaymentDatesThroughRow(
      lumpSum,
      previousRowDate,
      rowDate,
    ).filter((paymentDate) => paymentDate < latestPaymentDateExclusive);

    return total + matchingPaymentDates.length * lumpSum.amount * contributionMultiplier;
  }, 0);
}

function calculateSippLumpSumsBeforeDate(
  lumpSums: AddedPensionLumpSum[],
  rowDate: string,
) {
  return lumpSums.reduce(
    (total, lumpSum) =>
      total +
      getScheduledPaymentDates(lumpSum).filter((paymentDate) => paymentDate < rowDate)
        .length *
        lumpSum.amount,
    0,
  );
}

function calculateIsaLumpSumsBeforeDate(
  lumpSums: AddedPensionLumpSum[],
  rowDate: string,
) {
  return lumpSums.reduce(
    (total, lumpSum) =>
      total +
      getScheduledPaymentDates(lumpSum).filter((paymentDate) => paymentDate < rowDate)
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
  nuvosPensionStopDate = "",
  nuvosPensionDrawDate = "",
  nuvosAbsDate = "",
  partialRetirementStartDate = "",
): MilestoneDefinition[] {
  return [
    ...(alphaAbsDate ? [{ date: alphaAbsDate, label: LAST_ABS_STATEMENT_LABEL }] : []),
    ...(nuvosAbsDate ? [{ date: nuvosAbsDate, label: "Last nuvos ABS" }] : []),
    { date: startDate, label: CALCULATION_START_LABEL },
    ...(alphaPensionStopDate
      ? [{ date: alphaPensionStopDate, label: STOPS_ALPHA_ACCRUAL_LABEL }]
      : []),
    ...(alphaPensionDrawDate
      ? [{ date: alphaPensionDrawDate, label: STARTS_ALPHA_PENSION_LABEL }]
      : []),
    ...(nuvosPensionStopDate
      ? [{ date: nuvosPensionStopDate, label: STOPS_NUVOS_ACCRUAL_LABEL }]
      : []),
    ...(nuvosPensionDrawDate
      ? [{ date: nuvosPensionDrawDate, label: STARTS_NUVOS_PENSION_LABEL }]
      : []),
    ...(sippDrawDate ? [{ date: sippDrawDate, label: STARTS_SIPP_LABEL }] : []),
    ...(isaDrawDate ? [{ date: isaDrawDate, label: STARTS_ISA_LABEL }] : []),
    ...(includeStatePension
      ? [{ date: statePensionStartDate, label: STARTS_STATE_PENSION_LABEL }]
      : []),
    ...(partialRetirementStartDate
      ? [{ date: partialRetirementStartDate, label: STARTS_PARTIAL_RETIREMENT_LABEL }]
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
  return addMonths(date, Math.round(years * 12));
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
    const monthlyAddedPension =
      rowDate === alphaAbsDate || !settings.showAlpha
        ? 0
        : calculateMonthlyAddedPension({
            rowDate,
            stopDate: addedPensionStopDate,
            dateOfBirth: settings.dateOfBirth,
            addedPensionMonthlyContribution: settings.alphaAddedPensionMonthly,
            factorType: settings.alphaAddedPensionFactorType,
            contributionMultiplier: getPartialRetirementContributionMultiplier(
              settings,
              rowDate,
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
    cumulativeLumpSumAddedPension += monthlyAddedPension + lumpSumAddedPension;
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
      calculateAnnualStatePensionAtDate(settings, rowDate),
    );
    const totalMonthlyPensionIncomeBeforeTax = calculateTotalGrossMonthlyPension(
      monthlyAlphaPensionTakeHome,
      monthlyStatePension,
    );
    const monthlyIncomeTax = calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension: monthlyAlphaPensionTakeHome,
      monthlyNuvosPension: 0,
      monthlyStatePension,
      monthlySippPension: 0,
    });

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
      annualNuvosPension: 0,
      annualNuvosPensionIncludingReduction: 0,
      monthlyNuvosPensionTakeHome: 0,
      monthlyStatePension,
      sippPot: 0,
      monthlySippPension: 0,
      isaPot: 0,
      monthlyIsaPension: 0,
      totalMonthlyPensionIncomeBeforeTax,
      monthlyIncomeTax,
      totalMonthlyPensionTakeHomePay:
        totalMonthlyPensionIncomeBeforeTax - monthlyIncomeTax,
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

function calculateWholeWeekDifference(startDate: string, endDate: string) {
  if (endDate < startDate) {
    return 0;
  }

  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;

  return Math.floor(
    (parseIsoDate(endDate).getTime() - parseIsoDate(startDate).getTime()) /
      millisecondsPerWeek,
  );
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
