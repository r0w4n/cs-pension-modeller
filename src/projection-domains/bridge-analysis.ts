import {
  getPartialRetirementStartDate,
  type PensionSettings,
} from "../settings";
import { calculateMonthlyIncomeTax } from "./tax";
import { calculateIsaPotAtDate } from "./isa";
import { calculateSippPotAtDate } from "./sipp";

export type ProjectionRowLike = {
  date: string;
  age: number;
  ageMonths: number;
  monthlyAlphaPensionTakeHome: number;
  monthlyNuvosPensionTakeHome: number;
  monthlyStatePension: number;
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

export function prepareBridgeProjectionSettings(settings: PensionSettings): PensionSettings {
  return {
    ...settings,
    alphaPensionLeaveAge: settings.requirementAge,
    nuvosPensionLeaveAge: settings.requirementAge,
    isaDrawAge: settings.requirementAge,
  };
}

export function generateRetirementBridgeAnalysis(
  pensionRows: ProjectionRowLike[],
  settings: PensionSettings,
  options: { calculateSafeDrawAge?: boolean } = {},
): RetirementBridgeAnalysis {
  const retirementDate = addYears(settings.dateOfBirth, settings.requirementAge);
  const endDate = addYears(settings.dateOfBirth, settings.lifeExpectancy);
  const sippAccessDate = addYears(settings.dateOfBirth, settings.sippDrawAge);
  const monthlyTargetIncome = settings.desiredRetirementIncome / 12;
  const bridgeRows = generateMonthlyDateRange(retirementDate, endDate);
  const isaMonthlyGrowthRate = (1 + settings.isaRealInterestPercent / 100) ** (1 / 12) - 1;
  const sippMonthlyGrowthRate = (1 + settings.sippRealInterestPercent / 100) ** (1 / 12) - 1;
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
  const fullSecureIncomeStartDate = getFullSecureIncomeStartDate(settings, retirementDate, endDate);
  const fullSecureIncomeStartRow = fullSecureIncomeStartDate
    ? monthlyRows.find((row) => row.date >= fullSecureIncomeStartDate)
    : undefined;
  const fullSecureAnnualGuaranteedIncome = (fullSecureIncomeStartRow?.guaranteedIncome ?? 0) * 12;
  const monthsUntilRetirement = Math.max(1, calculateWholeMonthDifference(settings.startDate, retirementDate));

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
    fullSecureIncomeStartDate: fullSecureIncomeStartRow ? fullSecureIncomeStartDate : null,
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
    earliestSustainablePensionDrawAge: calculateEarliestSustainablePensionDrawAge(settings),
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
    ...(input.settings.showAlpha && input.monthlyAlphaPension > 0 ? ["Alpha"] : []),
    ...(input.settings.showNuvos && input.monthlyNuvosPension > 0 ? ["nuvos"] : []),
    ...(input.settings.showStatePension && input.monthlyStatePension > 0 ? ["State Pension"] : []),
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
    const boundaryEndAgeMonths = calculateAgeMonths(settings.dateOfBirth, nextPhaseStart);
    const totalDrawdown = rows.reduce((total, row) => total + row.isaDrawdown + row.sippDrawdown, 0);
    const totalIsaBridge = rows.reduce((total, row) => total + row.isaDrawdown, 0);
    const totalSippBridge = rows.reduce((total, row) => total + row.sippDrawdown, 0);
    const totalUnfunded = rows.reduce((total, row) => total + row.unfundedShortfall, 0);
    const annualiseAverage = (monthlyValues: number[]) =>
      (monthlyValues.reduce((total, value) => total + value, 0) / rows.length) * 12;
    const averageAnnualTarget = annualiseAverage(rows.map((row) => row.monthlyTargetIncome));
    const averageAnnualAlphaPension = annualiseAverage(rows.map((row) => row.monthlyAlphaPension));
    const averageAnnualNuvosPension = annualiseAverage(rows.map((row) => row.monthlyNuvosPension));
    const averageAnnualStatePension = annualiseAverage(rows.map((row) => row.monthlyStatePension));
    const averageAnnualIsaBridge = annualiseAverage(rows.map((row) => row.isaDrawdown));
    const averageAnnualSippBridge = annualiseAverage(rows.map((row) => row.sippDrawdown));
    const averageAnnualShortfall = (rows.reduce((total, row) => total + row.shortfall, 0) / rows.length) * 12;
    const averageAnnualSurplus = (rows.reduce((total, row) => total + row.surplus, 0) / rows.length) * 12;
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
        label: formatBridgePhaseLabel(phaseStart, nextPhaseStart, settings, retirementDate, endDate),
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
  const nextLabel = formatBridgeBoundaryLabel(nextPhaseStart, settings, retirementDate, endDate);

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
    settings.showStatePension && date === settings.statePensionDrawDate ? "State Pension" : "",
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
  const incomeStartMilestonesByRowDate = new Map<string, Array<{ label: string; date: string }>>();
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

  addIncomeStartMilestone(addYears(settings.dateOfBirth, settings.requirementAge), "Retirement starts");

  if (settings.showAlpha) {
    addIncomeStartMilestone(addYears(settings.dateOfBirth, settings.alphaPensionDrawAge), "Alpha starts");
  }

  if (settings.showNuvos) {
    addIncomeStartMilestone(addYears(settings.dateOfBirth, settings.nuvosPensionDrawAge), "nuvos starts");
  }

  if (settings.showStatePension) {
    addIncomeStartMilestone(settings.statePensionDrawDate, "State Pension starts");
  }

  if (settings.partialRetirementEnabled) {
    addIncomeStartMilestone(getPartialRetirementStartDate(settings), "Partial retirement starts");
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
    settings.showNuvos ? 65 : 70,
  );

  for (let age = earliestAge; age <= latestAge; age += 1) {
    const candidateSettings = prepareBridgeProjectionSettings({
      ...settings,
      alphaPensionDrawAge: settings.showAlpha ? age : settings.alphaPensionDrawAge,
      nuvosPensionDrawAge: settings.showNuvos ? age : settings.nuvosPensionDrawAge,
      showSipp: false,
      showIsa: false,
    });

    const rows = generateMonthlyDateRange(settings.startDate, addYears(settings.dateOfBirth, settings.lifeExpectancy)).map((date) => ({
      date,
      age: calculateAge(settings.dateOfBirth, date),
      ageMonths: calculateAgeMonths(settings.dateOfBirth, date),
      monthlyAlphaPensionTakeHome: 0,
      monthlyNuvosPensionTakeHome: 0,
      monthlyStatePension: 0,
    }));

    const analysis = generateRetirementBridgeAnalysis(rows, {
      ...candidateSettings,
      showSipp: settings.showSipp,
      showIsa: settings.showIsa,
    });

    if (analysis.planWorks && analysis.stableAnnualGuaranteedIncome >= settings.desiredRetirementIncome) {
      return age;
    }
  }

  return null;
}

function findFirstRowAtOrAfterDate(tableData: ProjectionRowLike[], milestoneDate: string) {
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
    (row.getUTCMonth() === birth.getUTCMonth() && row.getUTCDate() >= birth.getUTCDate());

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
