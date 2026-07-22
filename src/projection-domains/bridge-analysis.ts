import {
  getPartialRetirementStartDate,
  type PensionSettings,
} from "../settings";
import { calculateMonthlyIncomeTax } from "./tax";
import { calculateIsaPotBeforeWithdrawalAtDate } from "./isa";
import { calculateSippPotBeforeWithdrawalAtDate } from "./sipp";
import { calculateCsAvcPotBeforeWithdrawalAtDate } from "./cs-avc";
import { calculateLisaPotBeforeWithdrawalAtDate } from "./lisa";
import {
  calculateRetirementIncomeTargetAtDate,
  getModelledMonthlyGrowthRate,
} from "./inflation";

export type ProjectionRowLike = {
  date: string;
  age: number;
  ageMonths: number;
  monthlyAlphaPensionGross: number;
  monthlyClassicPensionGross?: number;
  monthlyClassicPlusPensionGross?: number;
  monthlyNuvosPensionGross: number;
  monthlyPremiumPensionGross: number;
  monthlyStatePension: number;
  monthlyAdditionalGuaranteedIncomeGross?: number;
  monthlyAdditionalGuaranteedIncomeTaxable?: number;
};

type ProjectPensionRows = (settings: PensionSettings) => ProjectionRowLike[];

type RetirementBridgeAnalysisOptions =
  | {
      calculateSafeDrawAge?: false;
      projectPensionRows?: never;
    }
  | {
      calculateSafeDrawAge: true;
      projectPensionRows: ProjectPensionRows;
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
  annualPremiumPension: number;
  annualAdditionalGuaranteedIncome: number;
  annualStatePension: number;
  annualIsaBridge: number;
  annualLisaBridge: number;
  annualSippBridge: number;
  annualCsAvcBridge: number;
  annualShortfall: number;
  annualSurplus: number;
  totalIsaBridge: number;
  totalLisaBridge: number;
  totalSippBridge: number;
  totalCsAvcBridge: number;
  totalBridgeRequired: number;
  unfundedShortfall: number;
};

export type BridgePotProjectionRow = {
  date: string;
  age: number;
  ageMonths: number;
  monthlyAlphaPension: number;
  monthlyNuvosPension: number;
  monthlyPremiumPension: number;
  monthlyAdditionalGuaranteedIncomeGross: number;
  monthlyAdditionalGuaranteedIncomeTaxable: number;
  monthlyStatePension: number;
  monthlyTargetIncome: number;
  isaBalance: number;
  lisaBalance: number;
  sippBalance: number;
  csAvcBalance: number;
  isaDrawdown: number;
  lisaDrawdown: number;
  sippDrawdown: number;
  csAvcDrawdown: number;
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

type BridgePotBalances = {
  isaBalance: number;
  lisaBalance: number;
  sippBalance: number;
  csAvcBalance: number;
};

type BridgePotGrowthRates = {
  isaMonthlyGrowthRate: number;
  lisaMonthlyGrowthRate: number;
  sippMonthlyGrowthRate: number;
  csAvcMonthlyGrowthRate: number;
};

type MonthlySecureIncome = {
  monthlyAlphaPension: number;
  monthlyClassicPension: number;
  monthlyClassicPlusPension: number;
  monthlyNuvosPension: number;
  monthlyPremiumPension: number;
  monthlyAdditionalGuaranteedIncomeGross: number;
  monthlyAdditionalGuaranteedIncomeTaxable: number;
  monthlyStatePension: number;
  guaranteedIncome: number;
};

type BridgePotMilestoneTracker = {
  hasStartedIsaDrawdown: boolean;
  hasStartedLisaDrawdown: boolean;
  hasStartedSippDrawdown: boolean;
  hasStartedCsAvcDrawdown: boolean;
  hasIncludedIsaDepletion: boolean;
  hasIncludedLisaDepletion: boolean;
  hasIncludedSippDepletion: boolean;
  hasIncludedCsAvcDepletion: boolean;
};

export function prepareBridgeProjectionSettings(
  settings: PensionSettings
): PensionSettings {
  return {
    ...settings,
    alphaPensionLeaveAge: settings.requirementAge,
    isaDrawAge: settings.requirementAge,
  };
}

export function generateRetirementBridgeAnalysis(
  pensionRows: ProjectionRowLike[],
  settings: PensionSettings,
  options: RetirementBridgeAnalysisOptions = {}
): RetirementBridgeAnalysis {
  const retirementDate = addYears(
    settings.dateOfBirth,
    settings.requirementAge
  );
  const endDate = addYears(settings.dateOfBirth, settings.lifeExpectancy);
  const sippAccessDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const csAvcAccessDate = addYears(settings.dateOfBirth, settings.csAvcDrawAge);
  const lisaAccessDate = addYears(settings.dateOfBirth, settings.lisaDrawAge);
  const bridgeRows = generateMonthlyDateRange(retirementDate, endDate);
  const monthlyTargetIncomeAtRetirement =
    calculateRetirementIncomeTargetAtDate(settings, retirementDate) / 12;
  const isaMonthlyGrowthRate = getModelledMonthlyGrowthRate(
    settings,
    settings.isaRealInterestPercent / 100
  );
  const sippMonthlyGrowthRate = getModelledMonthlyGrowthRate(
    settings,
    settings.sippRealInterestPercent / 100
  );
  const csAvcMonthlyGrowthRate = getModelledMonthlyGrowthRate(
    settings,
    settings.csAvcRealInterestPercent / 100
  );
  const lisaMonthlyGrowthRate = getModelledMonthlyGrowthRate(
    settings,
    settings.lisaRealInterestPercent / 100
  );
  const potBalances: BridgePotBalances = {
    isaBalance: settings.showIsa
      ? calculateIsaPotBeforeWithdrawalAtDate({
          settings: { ...settings, showIsa: true },
          rowDate: retirementDate,
          drawDate: retirementDate,
        })
      : 0,
    sippBalance: settings.showSipp
      ? calculateSippPotBeforeWithdrawalAtDate({
          settings: { ...settings, showSipp: true },
          rowDate: retirementDate,
          drawDate: retirementDate,
        })
      : 0,
    csAvcBalance: settings.showCsAvc
      ? calculateCsAvcPotBeforeWithdrawalAtDate({
          settings: { ...settings, showCsAvc: true },
          rowDate: retirementDate,
          drawDate: retirementDate,
        })
      : 0,
    lisaBalance: settings.showLisa
      ? calculateLisaPotBeforeWithdrawalAtDate({
          settings: { ...settings, showLisa: true },
          rowDate: retirementDate,
          drawDate: retirementDate,
        })
      : 0,
  };
  let totalBridgeRequired = 0;
  let totalUnfundedShortfall = 0;
  let requiredIsaAtRetirement = 0;
  let requiredSippAtAccess = 0;
  let firstFailureDate: string | null = null;
  let firstPotToFail: string | null = null;

  const monthlyRows = bridgeRows.map((rowDate, index) => {
    const growth = applyBridgePotGrowth({
      balances: potBalances,
      rates: {
        isaMonthlyGrowthRate,
        lisaMonthlyGrowthRate,
        sippMonthlyGrowthRate,
        csAvcMonthlyGrowthRate,
      },
      shouldApplyGrowth: index > 0,
    });
    const secureIncome = calculateMonthlySecureIncome({
      settings,
      pensionRows,
      rowDate,
    });
    const monthlyTargetIncome =
      calculateRetirementIncomeTargetAtDate(settings, rowDate) / 12;
    const shortfall = Math.max(
      0,
      monthlyTargetIncome - secureIncome.guaranteedIncome
    );
    const surplus = Math.max(
      0,
      secureIncome.guaranteedIncome - monthlyTargetIncome
    );
    const drawdown = drawBridgeShortfall({
      balances: potBalances,
      lisaAccessDate,
      csAvcAccessDate,
      remainingShortfall: shortfall,
      rowDate,
      secureIncome,
      settings,
      sippAccessDate,
    });

    if (shortfall > 0 && rowDate < sippAccessDate) {
      requiredIsaAtRetirement += shortfall;
    }

    if (shortfall > 0 && rowDate >= sippAccessDate) {
      requiredSippAtAccess += shortfall;
    }

    totalBridgeRequired +=
      drawdown.isaDrawdown +
      drawdown.lisaDrawdown +
      drawdown.sippDrawdown +
      drawdown.csAvcDrawdown;
    totalUnfundedShortfall += drawdown.remainingShortfall;

    if (drawdown.remainingShortfall > 0 && !firstFailureDate) {
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
      monthlyAlphaPension: secureIncome.monthlyAlphaPension,
      monthlyNuvosPension: secureIncome.monthlyNuvosPension,
      monthlyPremiumPension: secureIncome.monthlyPremiumPension,
      monthlyAdditionalGuaranteedIncomeGross:
        secureIncome.monthlyAdditionalGuaranteedIncomeGross,
      monthlyAdditionalGuaranteedIncomeTaxable:
        secureIncome.monthlyAdditionalGuaranteedIncomeTaxable,
      monthlyStatePension: secureIncome.monthlyStatePension,
      monthlyTargetIncome,
      guaranteedIncome: secureIncome.guaranteedIncome,
      shortfall,
      surplus,
      isaDrawdown: drawdown.isaDrawdown,
      lisaDrawdown: drawdown.lisaDrawdown,
      sippDrawdown: drawdown.sippDrawdown,
      csAvcDrawdown: drawdown.csAvcDrawdown,
      unfundedShortfall: drawdown.remainingShortfall,
      isaBalance: potBalances.isaBalance,
      lisaBalance: potBalances.lisaBalance,
      sippBalance: potBalances.sippBalance,
      csAvcBalance: potBalances.csAvcBalance,
      growth:
        growth.isaGrowth +
        growth.lisaGrowth +
        growth.sippGrowth +
        growth.csAvcGrowth,
      milestones: [],
      milestoneDates: [],
      activeSources: getActiveBridgeIncomeSources({
        settings,
        monthlyAlphaPension: secureIncome.monthlyAlphaPension,
        monthlyNuvosPension: secureIncome.monthlyNuvosPension,
        monthlyPremiumPension: secureIncome.monthlyPremiumPension,
        monthlyAdditionalGuaranteedIncomeGross:
          secureIncome.monthlyAdditionalGuaranteedIncomeGross,
        monthlyStatePension: secureIncome.monthlyStatePension,
      }),
    };
  });

  const stableRow = monthlyRows.at(-1);
  const stableAnnualGuaranteedIncome = (stableRow?.guaranteedIncome ?? 0) * 12;
  const fullSecureIncomeStartDate = getFullSecureIncomeStartDate(
    settings,
    retirementDate,
    endDate
  );
  const fullSecureIncomeStartRow = fullSecureIncomeStartDate
    ? monthlyRows.find((row) => row.date >= fullSecureIncomeStartDate)
    : undefined;
  const fullSecureAnnualGuaranteedIncome =
    (fullSecureIncomeStartRow?.guaranteedIncome ?? 0) * 12;
  const monthsUntilRetirement = Math.max(
    1,
    calculateWholeMonthDifference(settings.startDate, retirementDate)
  );

  const analysisWithoutSafeDrawAge: RetirementBridgeAnalysis = {
    target: {
      retirementDate,
      retirementAge: settings.requirementAge,
      annualIncome: monthlyTargetIncomeAtRetirement * 12,
      monthlyIncome: monthlyTargetIncomeAtRetirement,
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
      totalUnfundedShortfall > 0
        ? totalUnfundedShortfall / monthsUntilRetirement
        : 0,
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
      fullSecureAnnualGuaranteedIncome -
      (fullSecureIncomeStartRow
        ? calculateRetirementIncomeTargetAtDate(
            settings,
            fullSecureIncomeStartRow.date
          )
        : settings.desiredRetirementIncome),
    stableAnnualGuaranteedIncome,
    stableAnnualGuaranteedSurplus:
      stableAnnualGuaranteedIncome -
      (stableRow
        ? calculateRetirementIncomeTargetAtDate(settings, stableRow.date)
        : settings.desiredRetirementIncome),
    phases: buildBridgePhases(monthlyRows, settings, retirementDate, endDate),
    potProjection: buildBridgePotProjection(monthlyRows, settings),
  };

  if (!options.calculateSafeDrawAge) {
    return analysisWithoutSafeDrawAge;
  }

  return {
    ...analysisWithoutSafeDrawAge,
    earliestSustainablePensionDrawAge:
      calculateEarliestSustainablePensionDrawAge(
        settings,
        options.projectPensionRows
      ),
  };
}

function applyBridgePotGrowth(input: {
  balances: BridgePotBalances;
  rates: BridgePotGrowthRates;
  shouldApplyGrowth: boolean;
}) {
  const { balances, rates, shouldApplyGrowth } = input;
  const isaGrowth = shouldApplyGrowth
    ? balances.isaBalance * rates.isaMonthlyGrowthRate
    : 0;
  const lisaGrowth = shouldApplyGrowth
    ? balances.lisaBalance * rates.lisaMonthlyGrowthRate
    : 0;
  const sippGrowth = shouldApplyGrowth
    ? balances.sippBalance * rates.sippMonthlyGrowthRate
    : 0;
  const csAvcGrowth = shouldApplyGrowth
    ? balances.csAvcBalance * rates.csAvcMonthlyGrowthRate
    : 0;

  balances.isaBalance += isaGrowth;
  balances.lisaBalance += lisaGrowth;
  balances.sippBalance += sippGrowth;
  balances.csAvcBalance += csAvcGrowth;

  return { isaGrowth, lisaGrowth, sippGrowth, csAvcGrowth };
}

function calculateMonthlySecureIncome(input: {
  settings: PensionSettings;
  pensionRows: ProjectionRowLike[];
  rowDate: string;
}): MonthlySecureIncome {
  const { settings, pensionRows, rowDate } = input;
  const pensionRow =
    findFirstRowAtOrAfterDate(pensionRows, rowDate) ?? pensionRows.at(-1);
  const monthlyAlphaPension =
    settings.showAlpha && pensionRow ? pensionRow.monthlyAlphaPensionGross : 0;
  const monthlyClassicPension =
    settings.showClassic && pensionRow
      ? (pensionRow.monthlyClassicPensionGross ?? 0)
      : 0;
  const monthlyClassicPlusPension =
    settings.showClassicPlus && pensionRow
      ? (pensionRow.monthlyClassicPlusPensionGross ?? 0)
      : 0;
  const monthlyNuvosPension =
    settings.showNuvos && pensionRow ? pensionRow.monthlyNuvosPensionGross : 0;
  const monthlyPremiumPension =
    settings.showPremium && pensionRow
      ? pensionRow.monthlyPremiumPensionGross
      : 0;
  const monthlyAdditionalGuaranteedIncomeGross =
    pensionRow?.monthlyAdditionalGuaranteedIncomeGross ?? 0;
  const monthlyAdditionalGuaranteedIncomeTaxable =
    pensionRow?.monthlyAdditionalGuaranteedIncomeTaxable ?? 0;
  const monthlyStatePension =
    settings.showStatePension && pensionRow
      ? pensionRow.monthlyStatePension
      : 0;
  const monthlyIncomeTax = calculateMonthlyIncomeTax({
    settings,
    monthlyAlphaPension,
    monthlyClassicPension,
    monthlyClassicPlusPension,
    monthlyNuvosPension,
    monthlyPremiumPension,
    monthlyStatePension,
    monthlySippPension: 0,
    monthlyCsAvcPension: 0,
    monthlyAdditionalGuaranteedIncomeTaxable,
  });

  return {
    monthlyAlphaPension,
    monthlyClassicPension,
    monthlyClassicPlusPension,
    monthlyNuvosPension,
    monthlyPremiumPension,
    monthlyAdditionalGuaranteedIncomeGross,
    monthlyAdditionalGuaranteedIncomeTaxable,
    monthlyStatePension,
    guaranteedIncome: Math.max(
      0,
      monthlyAlphaPension +
        monthlyClassicPension +
        monthlyClassicPlusPension +
        monthlyNuvosPension +
        monthlyPremiumPension +
        monthlyAdditionalGuaranteedIncomeGross +
        monthlyStatePension -
        monthlyIncomeTax
    ),
  };
}

function drawBridgeShortfall(input: {
  balances: BridgePotBalances;
  csAvcAccessDate: string;
  lisaAccessDate: string;
  remainingShortfall: number;
  rowDate: string;
  secureIncome: MonthlySecureIncome;
  settings: PensionSettings;
  sippAccessDate: string;
}) {
  const {
    balances,
    csAvcAccessDate,
    lisaAccessDate,
    rowDate,
    secureIncome,
    settings,
    sippAccessDate,
  } = input;
  let remainingShortfall = input.remainingShortfall;
  const sippDrawdownResult = drawFromTaxableBridgePot({
    balance: balances.sippBalance,
    canDraw: rowDate >= sippAccessDate && settings.showSipp,
    remainingShortfall,
    calculateNetIncome: (grossDrawdown) =>
      calculateNetBridgeWithdrawal({
        settings,
        secureIncome,
        sippDrawdown: grossDrawdown,
        csAvcDrawdown: 0,
      }),
  });
  const sippDrawdown = sippDrawdownResult.grossDrawdown;
  balances.sippBalance -= sippDrawdown;
  remainingShortfall = Math.max(
    0,
    remainingShortfall - sippDrawdownResult.netIncome
  );

  const csAvcDrawdownResult = drawFromTaxableBridgePot({
    balance: balances.csAvcBalance,
    canDraw: rowDate >= csAvcAccessDate && settings.showCsAvc,
    remainingShortfall,
    calculateNetIncome: (grossDrawdown) =>
      calculateNetBridgeWithdrawal({
        settings,
        secureIncome,
        sippDrawdown,
        csAvcDrawdown: grossDrawdown,
      }) -
      calculateNetBridgeWithdrawal({
        settings,
        secureIncome,
        sippDrawdown,
        csAvcDrawdown: 0,
      }),
  });
  const csAvcDrawdown = csAvcDrawdownResult.grossDrawdown;
  balances.csAvcBalance -= csAvcDrawdown;
  remainingShortfall = Math.max(
    0,
    remainingShortfall - csAvcDrawdownResult.netIncome
  );

  const lisaDrawdown = drawFromBridgePot({
    balance: balances.lisaBalance,
    canDraw: rowDate >= lisaAccessDate && settings.showLisa,
    remainingShortfall,
  });
  balances.lisaBalance -= lisaDrawdown;
  remainingShortfall -= lisaDrawdown;

  const isaDrawdown = drawFromBridgePot({
    balance: balances.isaBalance,
    canDraw: settings.showIsa,
    remainingShortfall,
  });
  balances.isaBalance -= isaDrawdown;
  remainingShortfall -= isaDrawdown;

  return {
    isaDrawdown,
    lisaDrawdown,
    remainingShortfall,
    sippDrawdown,
    csAvcDrawdown,
  };
}

function drawFromBridgePot(input: {
  balance: number;
  canDraw: boolean;
  remainingShortfall: number;
}) {
  return input.canDraw ? Math.min(input.balance, input.remainingShortfall) : 0;
}

function drawFromTaxableBridgePot(input: {
  balance: number;
  canDraw: boolean;
  remainingShortfall: number;
  calculateNetIncome: (grossDrawdown: number) => number;
}) {
  if (!input.canDraw || input.balance <= 0 || input.remainingShortfall <= 0) {
    return { grossDrawdown: 0, netIncome: 0 };
  }

  const directDrawdown = Math.min(input.balance, input.remainingShortfall);
  const directNetIncome = input.calculateNetIncome(directDrawdown);

  if (Math.abs(directNetIncome - directDrawdown) <= 0.0000001) {
    return {
      grossDrawdown: directDrawdown,
      netIncome: directNetIncome,
    };
  }

  const maximumNetIncome = input.calculateNetIncome(input.balance);

  if (maximumNetIncome <= input.remainingShortfall) {
    return {
      grossDrawdown: input.balance,
      netIncome: maximumNetIncome,
    };
  }

  let lowerGrossDrawdown = 0;
  let upperGrossDrawdown = input.balance;

  for (let iteration = 0; iteration < 50; iteration += 1) {
    const candidateGrossDrawdown =
      (lowerGrossDrawdown + upperGrossDrawdown) / 2;
    const candidateNetIncome = input.calculateNetIncome(candidateGrossDrawdown);

    if (candidateNetIncome < input.remainingShortfall) {
      lowerGrossDrawdown = candidateGrossDrawdown;
    } else {
      upperGrossDrawdown = candidateGrossDrawdown;
    }
  }

  return {
    grossDrawdown: upperGrossDrawdown,
    netIncome: input.calculateNetIncome(upperGrossDrawdown),
  };
}

function calculateNetBridgeWithdrawal(input: {
  settings: PensionSettings;
  secureIncome: MonthlySecureIncome;
  sippDrawdown: number;
  csAvcDrawdown: number;
}) {
  const { settings, secureIncome, sippDrawdown, csAvcDrawdown } = input;
  const taxBeforeFlexibleWithdrawals = calculateBridgeIncomeTax({
    settings,
    secureIncome,
    sippDrawdown: 0,
    csAvcDrawdown: 0,
  });
  const taxAfterFlexibleWithdrawals = calculateBridgeIncomeTax(input);

  return Math.max(
    0,
    sippDrawdown +
      csAvcDrawdown -
      (taxAfterFlexibleWithdrawals - taxBeforeFlexibleWithdrawals)
  );
}

function calculateBridgeIncomeTax(input: {
  settings: PensionSettings;
  secureIncome: MonthlySecureIncome;
  sippDrawdown: number;
  csAvcDrawdown: number;
}) {
  const { settings, secureIncome, sippDrawdown, csAvcDrawdown } = input;

  return calculateMonthlyIncomeTax({
    settings,
    monthlyAlphaPension: secureIncome.monthlyAlphaPension,
    monthlyClassicPension: secureIncome.monthlyClassicPension,
    monthlyClassicPlusPension: secureIncome.monthlyClassicPlusPension,
    monthlyNuvosPension: secureIncome.monthlyNuvosPension,
    monthlyPremiumPension: secureIncome.monthlyPremiumPension,
    monthlyStatePension: secureIncome.monthlyStatePension,
    monthlySippPension: sippDrawdown,
    monthlyCsAvcPension: csAvcDrawdown,
    monthlyAdditionalGuaranteedIncomeTaxable:
      secureIncome.monthlyAdditionalGuaranteedIncomeTaxable,
  });
}

function getFullSecureIncomeStartDate(
  settings: PensionSettings,
  retirementDate: string,
  endDate: string
) {
  const secureStartDates = [
    ...(settings.showAlpha
      ? [addYears(settings.dateOfBirth, settings.alphaPensionDrawAge)]
      : []),
    ...(settings.showNuvos
      ? [addYears(settings.dateOfBirth, settings.nuvosPensionDrawAge)]
      : []),
    ...(settings.showPremium
      ? [addYears(settings.dateOfBirth, settings.premiumDrawAge)]
      : []),
    ...(settings.showStatePension ? [settings.statePensionDrawDate] : []),
  ];

  if (secureStartDates.length === 0) {
    return null;
  }

  const latestSecureStartDate = secureStartDates.sort().at(-1);

  if (!latestSecureStartDate || latestSecureStartDate > endDate) {
    return null;
  }

  return latestSecureStartDate < retirementDate
    ? retirementDate
    : latestSecureStartDate;
}

function getActiveBridgeIncomeSources(input: {
  settings: PensionSettings;
  monthlyAlphaPension: number;
  monthlyNuvosPension: number;
  monthlyPremiumPension: number;
  monthlyAdditionalGuaranteedIncomeGross: number;
  monthlyStatePension: number;
}) {
  const sources = [
    ...(input.settings.showAlpha && input.monthlyAlphaPension > 0
      ? ["Alpha"]
      : []),
    ...(input.settings.showNuvos && input.monthlyNuvosPension > 0
      ? ["nuvos"]
      : []),
    ...(input.settings.showPremium && input.monthlyPremiumPension > 0
      ? ["Premium"]
      : []),
    ...(input.monthlyAdditionalGuaranteedIncomeGross > 0
      ? ["Additional income"]
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
    monthlyPremiumPension: number;
    monthlyAdditionalGuaranteedIncomeGross: number;
    monthlyStatePension: number;
    shortfall: number;
    surplus: number;
    isaDrawdown: number;
    lisaDrawdown: number;
    sippDrawdown: number;
    csAvcDrawdown: number;
    unfundedShortfall: number;
    activeSources: string[];
  }>,
  settings: PensionSettings,
  retirementDate: string,
  endDate: string
): BridgePhase[] {
  if (monthlyRows.length === 0) {
    return [];
  }

  const eventDates = [
    retirementDate,
    ...(settings.showSipp
      ? [addYears(settings.dateOfBirth, settings.sippDrawAge)]
      : []),
    ...(settings.showCsAvc
      ? [addYears(settings.dateOfBirth, settings.csAvcDrawAge)]
      : []),
    ...(settings.showLisa
      ? [addYears(settings.dateOfBirth, settings.lisaDrawAge)]
      : []),
    ...(settings.showAlpha
      ? [addYears(settings.dateOfBirth, settings.alphaPensionDrawAge)]
      : []),
    ...(settings.showNuvos
      ? [addYears(settings.dateOfBirth, settings.nuvosPensionDrawAge)]
      : []),
    ...(settings.showPremium
      ? [addYears(settings.dateOfBirth, settings.premiumDrawAge)]
      : []),
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
        : row.date >= phaseStart && row.date < nextPhaseStart
    );

    if (rows.length === 0) {
      return [];
    }

    const firstRow = rows[0];
    const boundaryEndAge = calculateAge(settings.dateOfBirth, nextPhaseStart);
    const boundaryEndAgeMonths = calculateAgeMonths(
      settings.dateOfBirth,
      nextPhaseStart
    );
    const totalDrawdown = rows.reduce(
      (total, row) =>
        total +
        row.isaDrawdown +
        row.lisaDrawdown +
        row.sippDrawdown +
        row.csAvcDrawdown,
      0
    );
    const totalIsaBridge = rows.reduce(
      (total, row) => total + row.isaDrawdown,
      0
    );
    const totalSippBridge = rows.reduce(
      (total, row) => total + row.sippDrawdown,
      0
    );
    const totalCsAvcBridge = rows.reduce(
      (total, row) => total + row.csAvcDrawdown,
      0
    );
    const totalLisaBridge = rows.reduce(
      (total, row) => total + row.lisaDrawdown,
      0
    );
    const totalUnfunded = rows.reduce(
      (total, row) => total + row.unfundedShortfall,
      0
    );
    const annualiseAverage = (monthlyValues: number[]) =>
      (monthlyValues.reduce((total, value) => total + value, 0) / rows.length) *
      12;
    const averageAnnualTarget = annualiseAverage(
      rows.map((row) => row.monthlyTargetIncome)
    );
    const averageAnnualAlphaPension = annualiseAverage(
      rows.map((row) => row.monthlyAlphaPension)
    );
    const averageAnnualNuvosPension = annualiseAverage(
      rows.map((row) => row.monthlyNuvosPension)
    );
    const averageAnnualPremiumPension = annualiseAverage(
      rows.map((row) => row.monthlyPremiumPension)
    );
    const averageAnnualAdditionalGuaranteedIncome = annualiseAverage(
      rows.map((row) => row.monthlyAdditionalGuaranteedIncomeGross)
    );
    const averageAnnualStatePension = annualiseAverage(
      rows.map((row) => row.monthlyStatePension)
    );
    const averageAnnualIsaBridge = annualiseAverage(
      rows.map((row) => row.isaDrawdown)
    );
    const averageAnnualLisaBridge = annualiseAverage(
      rows.map((row) => row.lisaDrawdown)
    );
    const averageAnnualSippBridge = annualiseAverage(
      rows.map((row) => row.sippDrawdown)
    );
    const averageAnnualCsAvcBridge = annualiseAverage(
      rows.map((row) => row.csAvcDrawdown)
    );
    const averageAnnualShortfall =
      (rows.reduce((total, row) => total + row.shortfall, 0) / rows.length) *
      12;
    const averageAnnualSurplus =
      (rows.reduce((total, row) => total + row.surplus, 0) / rows.length) * 12;
    const potLabels = [
      rows.some((row) => row.isaDrawdown > 0) ? "ISA bridge" : "",
      rows.some((row) => row.lisaDrawdown > 0) ? "LISA bridge" : "",
      rows.some((row) => row.sippDrawdown > 0) ? "SIPP bridge" : "",
      rows.some((row) => row.csAvcDrawdown > 0)
        ? "Civil Service AVC bridge"
        : "",
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
          endDate
        ),
        incomeSourcesActive: firstRow.activeSources,
        potUsed: potLabels.length > 0 ? potLabels.join(" + ") : "None",
        annualTargetIncome: averageAnnualTarget,
        annualAlphaPension: averageAnnualAlphaPension,
        annualNuvosPension: averageAnnualNuvosPension,
        annualPremiumPension: averageAnnualPremiumPension,
        annualAdditionalGuaranteedIncome:
          averageAnnualAdditionalGuaranteedIncome,
        annualStatePension: averageAnnualStatePension,
        annualIsaBridge: averageAnnualIsaBridge,
        annualLisaBridge: averageAnnualLisaBridge,
        annualSippBridge: averageAnnualSippBridge,
        annualCsAvcBridge: averageAnnualCsAvcBridge,
        annualShortfall: averageAnnualShortfall,
        annualSurplus: averageAnnualSurplus,
        totalIsaBridge,
        totalLisaBridge,
        totalSippBridge,
        totalCsAvcBridge,
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
  endDate: string
) {
  const startLabel = formatBridgeBoundaryLabel(
    phaseStart,
    settings,
    retirementDate,
    endDate
  );
  const nextLabel = formatBridgeBoundaryLabel(
    nextPhaseStart,
    settings,
    retirementDate,
    endDate
  );

  return `${startLabel} to ${nextLabel}`;
}

function formatBridgeBoundaryLabel(
  date: string,
  settings: PensionSettings,
  retirementDate: string,
  endDate: string
) {
  const sippAccessDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const csAvcAccessDate = addYears(settings.dateOfBirth, settings.csAvcDrawAge);
  const lisaAccessDate = addYears(settings.dateOfBirth, settings.lisaDrawAge);
  const alphaDrawDate = addYears(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge
  );
  const nuvosDrawDate = addYears(
    settings.dateOfBirth,
    settings.nuvosPensionDrawAge
  );
  const premiumDrawDate = addYears(
    settings.dateOfBirth,
    settings.premiumDrawAge
  );
  const labels = [
    date === retirementDate ? "Retirement" : "",
    settings.showSipp && date === sippAccessDate ? "SIPP access" : "",
    settings.showCsAvc && date === csAvcAccessDate
      ? "Civil Service AVC access"
      : "",
    settings.showLisa && date === lisaAccessDate ? "LISA access" : "",
    settings.showAlpha && date === alphaDrawDate ? "Alpha" : "",
    settings.showNuvos && date === nuvosDrawDate ? "nuvos" : "",
    settings.showPremium && date === premiumDrawDate ? "Premium" : "",
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
  settings: PensionSettings
) {
  const incomeStartMilestonesByRowDate = new Map<
    string,
    Array<{ label: string; date: string }>
  >();
  const firstRowDate = monthlyRows[0]?.date;
  const lastRowDate = monthlyRows.at(-1)?.date;
  const addIncomeStartMilestone = (date: string, label: string) => {
    if (
      !firstRowDate ||
      !lastRowDate ||
      date < firstRowDate ||
      date > lastRowDate
    ) {
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
    "Retirement starts"
  );

  if (settings.showAlpha) {
    addIncomeStartMilestone(
      addYears(settings.dateOfBirth, settings.alphaPensionDrawAge),
      "Alpha starts"
    );
  }

  if (settings.showNuvos) {
    addIncomeStartMilestone(
      addYears(settings.dateOfBirth, settings.nuvosPensionDrawAge),
      "nuvos starts"
    );
  }

  if (settings.showPremium) {
    addIncomeStartMilestone(
      addYears(settings.dateOfBirth, settings.premiumDrawAge),
      "Premium starts"
    );
  }

  if (settings.showStatePension) {
    addIncomeStartMilestone(
      settings.statePensionDrawDate,
      "State Pension starts"
    );
  }

  if (settings.partialRetirementEnabled) {
    addIncomeStartMilestone(
      getPartialRetirementStartDate(settings),
      "Partial retirement starts"
    );
  }

  const tracker: BridgePotMilestoneTracker = {
    hasStartedIsaDrawdown: false,
    hasStartedLisaDrawdown: false,
    hasStartedSippDrawdown: false,
    hasStartedCsAvcDrawdown: false,
    hasIncludedIsaDepletion: false,
    hasIncludedLisaDepletion: false,
    hasIncludedSippDepletion: false,
    hasIncludedCsAvcDepletion: false,
  };

  return monthlyRows.map((row, index) => {
    const previousRow = index > 0 ? monthlyRows[index - 1] : undefined;
    const { milestones, milestoneDates } = buildBridgePotProjectionMilestones({
      incomeStartMilestones: incomeStartMilestonesByRowDate.get(row.date) ?? [],
      previousRow,
      row,
      settings,
      tracker,
    });

    return {
      ...row,
      milestones,
      milestoneDates,
    };
  });
}

function buildBridgePotProjectionMilestones(input: {
  incomeStartMilestones: Array<{ label: string; date: string }>;
  previousRow: BridgePotProjectionRow | undefined;
  row: BridgePotProjectionRow;
  settings: PensionSettings;
  tracker: BridgePotMilestoneTracker;
}) {
  const milestones: string[] = [];
  const milestoneDates: string[] = [];
  const { previousRow, row, settings, tracker } = input;

  tracker.hasStartedIsaDrawdown = addPotDrawdownStartMilestone({
    drawdown: row.isaDrawdown,
    hasStarted: tracker.hasStartedIsaDrawdown,
    label: "ISA drawdown starts",
    milestoneDates,
    milestones,
    rowDate: row.date,
  });
  tracker.hasStartedSippDrawdown = addPotDrawdownStartMilestone({
    drawdown: row.sippDrawdown,
    hasStarted: tracker.hasStartedSippDrawdown,
    label: "SIPP drawdown starts",
    milestoneDates,
    milestones,
    rowDate: row.date,
  });
  tracker.hasStartedCsAvcDrawdown = addPotDrawdownStartMilestone({
    drawdown: row.csAvcDrawdown,
    hasStarted: tracker.hasStartedCsAvcDrawdown,
    label: "Civil Service AVC drawdown starts",
    milestoneDates,
    milestones,
    rowDate: row.date,
  });
  tracker.hasStartedLisaDrawdown = addPotDrawdownStartMilestone({
    drawdown: row.lisaDrawdown,
    hasStarted: tracker.hasStartedLisaDrawdown,
    label: "LISA drawdown starts",
    milestoneDates,
    milestones,
    rowDate: row.date,
  });
  tracker.hasIncludedIsaDepletion = addPotDepletionMilestone({
    balance: row.isaBalance,
    drawdown: row.isaDrawdown,
    hasIncluded: tracker.hasIncludedIsaDepletion,
    label: "ISA pot exhausted",
    milestoneDates,
    milestones,
    previousBalance: previousRow?.isaBalance ?? 0,
    rowDate: row.date,
    showPot: settings.showIsa,
  });
  tracker.hasIncludedSippDepletion = addPotDepletionMilestone({
    balance: row.sippBalance,
    drawdown: row.sippDrawdown,
    hasIncluded: tracker.hasIncludedSippDepletion,
    label: "SIPP pot exhausted",
    milestoneDates,
    milestones,
    previousBalance: previousRow?.sippBalance ?? 0,
    rowDate: row.date,
    showPot: settings.showSipp,
  });
  tracker.hasIncludedCsAvcDepletion = addPotDepletionMilestone({
    balance: row.csAvcBalance,
    drawdown: row.csAvcDrawdown,
    hasIncluded: tracker.hasIncludedCsAvcDepletion,
    label: "Civil Service AVC pot exhausted",
    milestoneDates,
    milestones,
    previousBalance: previousRow?.csAvcBalance ?? 0,
    rowDate: row.date,
    showPot: settings.showCsAvc,
  });
  tracker.hasIncludedLisaDepletion = addPotDepletionMilestone({
    balance: row.lisaBalance,
    drawdown: row.lisaDrawdown,
    hasIncluded: tracker.hasIncludedLisaDepletion,
    label: "LISA pot exhausted",
    milestoneDates,
    milestones,
    previousBalance: previousRow?.lisaBalance ?? 0,
    rowDate: row.date,
    showPot: settings.showLisa,
  });

  for (const milestone of input.incomeStartMilestones) {
    milestones.push(milestone.label);
    milestoneDates.push(milestone.date);
  }

  return { milestones, milestoneDates };
}

function addPotDrawdownStartMilestone(input: {
  drawdown: number;
  hasStarted: boolean;
  label: string;
  milestoneDates: string[];
  milestones: string[];
  rowDate: string;
}) {
  if (input.hasStarted || input.drawdown <= 0) {
    return input.hasStarted;
  }

  input.milestones.push(input.label);
  input.milestoneDates.push(input.rowDate);

  return true;
}

function addPotDepletionMilestone(input: {
  balance: number;
  drawdown: number;
  hasIncluded: boolean;
  label: string;
  milestoneDates: string[];
  milestones: string[];
  previousBalance: number;
  rowDate: string;
  showPot: boolean;
}) {
  const isDepleted =
    input.showPot &&
    !input.hasIncluded &&
    input.balance <= 0.005 &&
    (input.previousBalance > 0.005 || input.drawdown > 0);

  if (!isDepleted) {
    return input.hasIncluded;
  }

  input.milestones.push(input.label);
  input.milestoneDates.push(input.rowDate);

  return true;
}

function calculateEarliestSustainablePensionDrawAge(
  settings: PensionSettings,
  projectPensionRows: ProjectPensionRows
) {
  if (!settings.showAlpha && !settings.showNuvos) {
    return null;
  }

  const earliestAge = Math.max(55, Math.ceil(settings.requirementAge));
  const latestAge = Math.min(
    settings.showAlpha ? settings.normalPensionAge : 70,
    settings.showNuvos ? 65 : 70
  );

  for (let age = earliestAge; age <= latestAge; age += 1) {
    const candidateSettings = prepareBridgeProjectionSettings({
      ...settings,
      alphaPensionDrawAge: settings.showAlpha
        ? age
        : settings.alphaPensionDrawAge,
      nuvosPensionDrawAge: settings.showNuvos
        ? age
        : settings.nuvosPensionDrawAge,
    });

    const pensionRows = projectPensionRows({
      ...candidateSettings,
      showSipp: false,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
    });
    const analysis = generateRetirementBridgeAnalysis(
      pensionRows,
      candidateSettings
    );

    if (
      analysis.planWorks &&
      analysis.stableAnnualGuaranteedSurplus >= -0.005
    ) {
      return age;
    }
  }

  return null;
}

function findFirstRowAtOrAfterDate(
  tableData: ProjectionRowLike[],
  milestoneDate: string
) {
  return tableData.find((row) => row.date >= milestoneDate);
}

function generateMonthlyDateRange(startDate: string, endDate: string) {
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

function addYears(date: string, years: number) {
  return addMonths(date, Math.round(years * 12));
}

function addMonths(date: string, months: number) {
  const parsed = parseIsoDate(date);
  const monthIndex = parsed.getUTCMonth() + months;
  const year = parsed.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(parsed.getUTCDate(), getDaysInMonth(year, month));

  return formatIsoDate(new Date(Date.UTC(year, month, day)));
}

function calculateAge(dateOfBirth: string, rowDate: string) {
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

function calculateAgeMonths(dateOfBirth: string, rowDate: string) {
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

function calculateWholeMonthDifference(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  let monthDifference = (endYear - startYear) * 12 + (endMonth - startMonth);

  if (endDay < startDay) {
    monthDifference -= 1;
  }

  return monthDifference;
}

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
