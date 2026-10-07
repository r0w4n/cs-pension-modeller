import {
  calculateAge,
  deriveProjectionInputs,
  type ProjectionRow,
} from "../projection";
import {
  calculateStatePensionDrawDate,
  getLatestAlphaAddedPensionPurchaseDate,
  getPartialRetirementContributionMultiplier,
  resolveAlphaAbsDate,
  type PensionSettings,
} from "../settings";
import {
  getAddedPensionFactorForAge,
  getAddedPensionPeriodCalculationDate,
  getAddedPensionRevaluationFactor,
} from "../projection-domains/alpha";

export type RegularAddedPensionSupportDiagnostic = {
  extent: "all-excluded" | "some-excluded";
  causes: Array<"purchase-period" | "factor-coverage">;
};

export function assessRegularAddedPensionSupport(
  settings: PensionSettings,
  rows: ProjectionRow[]
): RegularAddedPensionSupportDiagnostic | null {
  if (settings.alphaAddedPensionMonthly <= 0) {
    return null;
  }

  const derived = deriveProjectionInputs(settings);
  if (!derived) {
    return null;
  }

  const statementDate = resolveAlphaAbsDate(settings.alphaPensionAbsDate);
  const latestPurchaseDate = getLatestAlphaAddedPensionPurchaseDate(
    settings.dateOfBirth
  );
  const attemptedRows = rows.filter(
    (row) =>
      row.date > statementDate &&
      row.date <= derived.accrualStopDate &&
      getPartialRetirementContributionMultiplier(settings, row.date) > 0
  );

  if (attemptedRows.length === 0) {
    return null;
  }

  let supportedCount = 0;
  let outsidePurchasePeriod = false;
  let missingFactorCoverage = false;
  for (const row of attemptedRows) {
    if (row.date > latestPurchaseDate) {
      outsidePurchasePeriod = true;
      continue;
    }

    const calculationDate = getAddedPensionPeriodCalculationDate(
      settings.startDate,
      row.date
    );
    const factor = getAddedPensionFactorForAge(
      calculateAge(settings.dateOfBirth, calculationDate),
      settings.alphaAddedPensionFactorType,
      "monthly",
      settings.normalPensionAge
    );
    const revaluationFactor = getAddedPensionRevaluationFactor(
      calculationDate,
      calculateStatePensionDrawDate(settings.dateOfBirth)
    );
    if (factor > 0 && revaluationFactor > 0) {
      supportedCount += 1;
    } else {
      missingFactorCoverage = true;
    }
  }

  if (!outsidePurchasePeriod && !missingFactorCoverage) {
    return null;
  }

  return {
    extent: supportedCount === 0 ? "all-excluded" : "some-excluded",
    causes: [
      ...(outsidePurchasePeriod ? (["purchase-period"] as const) : []),
      ...(missingFactorCoverage ? (["factor-coverage"] as const) : []),
    ],
  };
}

export function formatRegularAddedPensionSupportNote(
  diagnostic: RegularAddedPensionSupportDiagnostic
) {
  const coverage = formatCoverage(diagnostic.causes);
  if (diagnostic.extent === "all-excluded") {
    return `This estimate excludes all regular Added Pension payments because ${coverage}. This is a model limitation.`;
  }
  if (
    diagnostic.causes.length === 1 &&
    diagnostic.causes[0] === "purchase-period"
  ) {
    return `This estimate includes supported earlier regular Added Pension payments but excludes later payments because ${coverage}. This is a model limitation.`;
  }
  return `This estimate includes some regular Added Pension payments but excludes others because ${coverage}. This is a model limitation.`;
}

function formatCoverage(
  causes: RegularAddedPensionSupportDiagnostic["causes"]
) {
  if (causes.length === 2) {
    return "they fall outside the model's supported purchase period or factor coverage";
  }
  return causes[0] === "purchase-period"
    ? "they fall outside the model's supported purchase period"
    : "the model has no matching factor coverage for them";
}
