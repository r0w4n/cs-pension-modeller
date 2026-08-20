import {
  createProjectionTable,
  deriveInflationAssumptions,
  generateRetirementBridgeAnalysis,
  generatePensionSummary,
  prepareBridgeProjectionSettings,
  type PensionSummary,
  type ProjectionRow,
  type RetirementBridgeAnalysis,
} from "../projection";
import {
  validateSettings,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import {
  assessRetirementPlan,
  type RetirementPlanAssessment,
} from "./retirement-plan-assessment";
import {
  calculateTargetBasedWithdrawalPreviews,
  type TargetBasedWithdrawalPreview,
} from "./target-based-withdrawal-previews";

export type RetirementPlanResult = {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  rows: ProjectionRow[];
  summary: PensionSummary;
  assessment: RetirementPlanAssessment;
  bridgeFundingEstimate: RetirementBridgeAnalysis;
  targetBasedWithdrawalPreviews: TargetBasedWithdrawalPreview[];
  statePensionAssumptionAffectsTarget: boolean;
  inflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
};

export function calculateRetirementPlan(
  settings: PensionSettings
): RetirementPlanResult {
  const validationIssues = validateSettings(settings);
  const rows = createProjectionTable(settings);
  const bridgeFundingEstimate = calculateBridgeFundingEstimate(settings);
  const assessment = assessRetirementPlan(rows, settings);

  return {
    settings,
    validationIssues,
    rows,
    summary: generatePensionSummary(rows, settings),
    assessment,
    bridgeFundingEstimate,
    targetBasedWithdrawalPreviews: calculateTargetBasedWithdrawalPreviews(
      rows,
      settings
    ),
    statePensionAssumptionAffectsTarget:
      calculateStatePensionAssumptionAffectsTarget(settings, assessment),
    inflationAssumptions: deriveInflationAssumptions(settings),
  };
}

function calculateStatePensionAssumptionAffectsTarget(
  settings: PensionSettings,
  assessment: RetirementPlanAssessment
) {
  if (
    !settings.showStatePension ||
    settings.statePensionForecastConfirmed ||
    !assessment.meetsTargetThroughout
  ) {
    return false;
  }

  const settingsWithoutStatePension = {
    ...settings,
    showStatePension: false,
  };
  const rowsWithoutStatePension = createProjectionTable(
    settingsWithoutStatePension
  );

  return !assessRetirementPlan(
    rowsWithoutStatePension,
    settingsWithoutStatePension
  ).meetsTargetThroughout;
}

function calculateBridgeFundingEstimate(settings: PensionSettings) {
  const bridgeSettings = prepareBridgeProjectionSettings(settings);
  const pensionRows = createProjectionTable({
    ...bridgeSettings,
    showSipp: false,
    showCsAvc: false,
    showIsa: false,
    showLisa: false,
  });

  return generateRetirementBridgeAnalysis(pensionRows, bridgeSettings, {
    calculateSafeDrawAge: true,
  });
}
