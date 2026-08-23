import {
  addMonths,
  calculateAdditionalGuaranteedIncomeStreamForDate,
  calculateRetirementIncomeTargetAtDate,
  type ProjectionRow,
} from "../projection";
import {
  FLEXIBLE_FUND_ACCOUNT_CONFIG,
  FLEXIBLE_FUND_ACCOUNT_IDS,
  getAdditionalGuaranteedIncomeDisplayName,
  type PensionSettings,
} from "../settings";
import { addYearsToIsoDate } from "../model-date";
import { calculateMoneyShortfall } from "../money";

export function createRetirementIncomeAssessmentSeries(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  const requirementDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.requirementAge
  );
  const alphaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge
  );
  const classicDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.classicPensionDrawAge
  );
  const classicPlusDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.classicPlusPensionDrawAge
  );
  const nuvosDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.nuvosPensionDrawAge
  );
  const premiumDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.premiumDrawAge
  );
  const sippDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.sippDrawAge
  );
  const csAvcDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.csAvcDrawAge
  );
  const isaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.isaDrawAge
  );
  const lisaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.lisaDrawAge
  );
  const sippUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.sippWithdrawalTargetAge
  );
  const csAvcUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.csAvcWithdrawalTargetAge
  );
  const isaUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.isaWithdrawalTargetAge
  );
  const lisaUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.lisaWithdrawalTargetAge
  );

  const displayedRows = rows.filter((row) => row.date >= settings.startDate);
  const baseSeries = displayedRows.map((row, index) => {
    const age = row.age + row.ageMonths / 12;
    const previousRow = displayedRows[index - 1];
    const nextRow = displayedRows[index + 1];
    const currentFlexibleMonthlyIncome =
      row.monthlyIsaPension +
      row.monthlyLisaPension +
      row.monthlySippPension +
      row.monthlyCsAvcPension;
    const isaIncomeAnnual = settings.showIsa
      ? getFlexibleWithdrawalIncomeAnnual({
          rowDate: row.date,
          drawDate: isaDrawDate,
          stopDate:
            settings.isaWithdrawalStrategy === "use_by_age"
              ? isaUseByDate
              : null,
          monthlyIncome: row.monthlyIsaPension,
          currentFlexibleMonthlyIncome,
          previousMonthlyIncome: previousRow?.monthlyIsaPension ?? 0,
          nextMonthlyIncome: nextRow?.monthlyIsaPension ?? 0,
        })
      : 0;
    const sippIncomeAnnual = settings.showSipp
      ? getFlexibleWithdrawalIncomeAnnual({
          rowDate: row.date,
          drawDate: sippDrawDate,
          stopDate:
            settings.sippWithdrawalStrategy === "use_by_age"
              ? sippUseByDate
              : null,
          monthlyIncome: row.monthlySippPension,
          currentFlexibleMonthlyIncome,
          previousMonthlyIncome: previousRow?.monthlySippPension ?? 0,
          nextMonthlyIncome: nextRow?.monthlySippPension ?? 0,
        })
      : 0;
    const csAvcIncomeAnnual = settings.showCsAvc
      ? getFlexibleWithdrawalIncomeAnnual({
          rowDate: row.date,
          drawDate: csAvcDrawDate,
          stopDate:
            settings.csAvcWithdrawalStrategy === "use_by_age"
              ? csAvcUseByDate
              : null,
          monthlyIncome: row.monthlyCsAvcPension,
          currentFlexibleMonthlyIncome,
          previousMonthlyIncome: previousRow?.monthlyCsAvcPension ?? 0,
          nextMonthlyIncome: nextRow?.monthlyCsAvcPension ?? 0,
        })
      : 0;
    const lisaIncomeAnnual = settings.showLisa
      ? getFlexibleWithdrawalIncomeAnnual({
          rowDate: row.date,
          drawDate: lisaDrawDate,
          stopDate:
            settings.lisaWithdrawalStrategy === "use_by_age"
              ? lisaUseByDate
              : null,
          monthlyIncome: row.monthlyLisaPension,
          currentFlexibleMonthlyIncome,
          previousMonthlyIncome: previousRow?.monthlyLisaPension ?? 0,
          nextMonthlyIncome: nextRow?.monthlyLisaPension ?? 0,
        })
      : 0;
    const {
      alphaIncomeAnnual,
      classicIncomeAnnual,
      classicPlusIncomeAnnual,
      nuvosIncomeAnnual,
      premiumIncomeAnnual,
      statePensionIncomeAnnual,
    } = getSecureIncomeAnnual({
      settings,
      row,
      alphaDrawDate,
      classicDrawDate,
      classicPlusDrawDate,
      nuvosDrawDate,
      premiumDrawDate,
    });
    const partialRetirementIncomeAnnual =
      row.monthlyEmploymentIncome === undefined
        ? calculatePartialRetirementIncomeAnnual(
            settings,
            row.date,
            requirementDate
          )
        : row.monthlyEmploymentIncome * 12;
    const additionalGuaranteedIncomeStreams =
      calculateAdditionalGuaranteedIncomeStreams(settings, row.date);
    const additionalGuaranteedIncomeAnnual =
      settings.showAdditionalGuaranteedIncome
        ? row.monthlyAdditionalGuaranteedIncomeGross * 12
        : 0;
    const targetIncomeAnnual = calculateRetirementIncomeTargetAtDate(
      settings,
      row.date
    );
    const totalIncomeAnnual =
      isaIncomeAnnual +
      lisaIncomeAnnual +
      sippIncomeAnnual +
      csAvcIncomeAnnual +
      partialRetirementIncomeAnnual +
      alphaIncomeAnnual +
      classicIncomeAnnual +
      classicPlusIncomeAnnual +
      nuvosIncomeAnnual +
      premiumIncomeAnnual +
      additionalGuaranteedIncomeAnnual +
      statePensionIncomeAnnual;
    const monthlyIncomeTax = row.monthlyIncomeTax;
    const takeHomeIncomeAnnual = totalIncomeAnnual - monthlyIncomeTax * 12;
    const assessedIncomeAnnual = getTargetBasisIncomeAnnual(
      totalIncomeAnnual,
      monthlyIncomeTax,
      settings
    );

    return {
      date: row.date,
      age,
      targetIncomeAnnual,
      isaIncomeAnnual,
      lisaIncomeAnnual,
      sippIncomeAnnual,
      csAvcIncomeAnnual,
      partialRetirementIncomeAnnual,
      alphaIncomeAnnual,
      classicIncomeAnnual,
      classicPlusIncomeAnnual,
      nuvosIncomeAnnual,
      premiumIncomeAnnual,
      additionalGuaranteedIncomeAnnual,
      additionalGuaranteedIncomeStreams,
      statePensionIncomeAnnual,
      totalIncomeAnnual,
      takeHomeIncomeAnnual,
      assessedIncomeAnnual,
      shortfallAnnual:
        row.date >= requirementDate
          ? calculateMoneyShortfall(targetIncomeAnnual, assessedIncomeAnnual)
          : 0,
      ...createFlexibleWithdrawalDiagnostics(row),
      flexibleWithdrawalInsights: createFlexibleWithdrawalInsights(row),
      isaBalance: row.isaPot,
      lisaBalance: row.lisaPot,
      sippBalance: row.sippPot,
      csAvcBalance: row.csAvcPot,
    };
  });

  return baseSeries;
}

function getTargetBasisIncomeAnnual(
  totalIncomeAnnual: number,
  monthlyIncomeTax: number,
  settings: PensionSettings
) {
  return settings.retirementIncomeTargetBasis === "after_tax"
    ? totalIncomeAnnual - monthlyIncomeTax * 12
    : totalIncomeAnnual;
}

function createFlexibleWithdrawalDiagnostics(row: ProjectionRow) {
  return {
    guaranteedNetIncomeAnnual: (row.monthlyGuaranteedNetIncome ?? 0) * 12,
    unavoidableSurplusAnnual: (row.monthlyUnavoidableSurplus ?? 0) * 12,
    avoidableFlexibleSurplusAnnual:
      (row.monthlyAvoidableFlexibleSurplus ?? 0) * 12,
  };
}

function createFlexibleWithdrawalInsights(row: ProjectionRow) {
  return FLEXIBLE_FUND_ACCOUNT_IDS.flatMap((accountId) => {
    const insight = row.monthlyReducibleFlexibleWithdrawals?.[accountId];

    return insight && insight.gross > 0
      ? [
          {
            accountId,
            label: FLEXIBLE_FUND_ACCOUNT_CONFIG[accountId].label,
            reducibleGrossAnnual: insight.gross * 12,
            avoidableNetAnnual: insight.net * 12,
          },
        ]
      : [];
  });
}

function getSecureIncomeAnnual(input: {
  settings: PensionSettings;
  row: ProjectionRow;
  alphaDrawDate: string;
  classicDrawDate: string;
  classicPlusDrawDate: string;
  nuvosDrawDate: string;
  premiumDrawDate: string;
}) {
  const {
    settings,
    row,
    alphaDrawDate,
    classicDrawDate,
    classicPlusDrawDate,
    nuvosDrawDate,
    premiumDrawDate,
  } = input;

  return {
    alphaIncomeAnnual:
      settings.showAlpha && row.date >= alphaDrawDate
        ? row.monthlyAlphaPensionGross * 12
        : 0,
    classicIncomeAnnual:
      settings.showClassic && row.date >= classicDrawDate
        ? row.monthlyClassicPensionGross * 12
        : 0,
    classicPlusIncomeAnnual:
      settings.showClassicPlus && row.date >= classicPlusDrawDate
        ? row.monthlyClassicPlusPensionGross * 12
        : 0,
    nuvosIncomeAnnual:
      settings.showNuvos && row.date >= nuvosDrawDate
        ? row.monthlyNuvosPensionGross * 12
        : 0,
    premiumIncomeAnnual:
      settings.showPremium && row.date >= premiumDrawDate
        ? row.monthlyPremiumPensionGross * 12
        : 0,
    statePensionIncomeAnnual:
      settings.showStatePension && row.date >= settings.statePensionDrawDate
        ? row.monthlyStatePension * 12
        : 0,
  };
}

function calculateAdditionalGuaranteedIncomeStreams(
  settings: PensionSettings,
  rowDate: string
) {
  if (!settings.showAdditionalGuaranteedIncome) {
    return [];
  }

  const labelCounts = new Map<string, number>();

  return settings.additionalGuaranteedIncomes.map((income) => {
    const baseLabel = getAdditionalGuaranteedIncomeDisplayName(income);
    const currentCount = labelCounts.get(baseLabel) ?? 0;
    const nextCount = currentCount + 1;
    labelCounts.set(baseLabel, nextCount);

    return {
      id: income.id,
      label: currentCount === 0 ? baseLabel : `${baseLabel} #${nextCount}`,
      annualAmount: calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate,
      }),
    };
  });
}

function getFlexibleWithdrawalIncomeAnnual(input: {
  rowDate: string;
  drawDate: string;
  stopDate: string | null;
  monthlyIncome: number;
  currentFlexibleMonthlyIncome: number;
  previousMonthlyIncome: number;
  nextMonthlyIncome: number;
}) {
  const {
    rowDate,
    drawDate,
    stopDate,
    monthlyIncome,
    currentFlexibleMonthlyIncome,
    previousMonthlyIncome,
    nextMonthlyIncome,
  } = input;

  if (rowDate < drawDate) {
    return 0;
  }

  if (
    rowDate >= drawDate &&
    rowDate <= addMonths(drawDate, 1) &&
    (!stopDate || rowDate < stopDate) &&
    monthlyIncome <= 0 &&
    currentFlexibleMonthlyIncome <= 0 &&
    nextMonthlyIncome > 0
  ) {
    return nextMonthlyIncome * 12;
  }

  if (
    stopDate &&
    rowDate >= addMonths(stopDate, -1) &&
    rowDate < stopDate &&
    monthlyIncome <= 0 &&
    currentFlexibleMonthlyIncome <= 0 &&
    previousMonthlyIncome > 0
  ) {
    return previousMonthlyIncome * 12;
  }

  return monthlyIncome * 12;
}

function calculatePartialRetirementIncomeAnnual(
  settings: PensionSettings,
  rowDate: string,
  requirementDate: string
) {
  const partialRetirementStartDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.partialRetirementStartAge
  );

  if (
    !settings.partialRetirementEnabled ||
    rowDate < partialRetirementStartDate ||
    rowDate >= requirementDate
  ) {
    return 0;
  }

  return settings.fullSalary * (settings.partialRetirementWorkPercent / 100);
}
