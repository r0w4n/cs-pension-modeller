import {
  createProjectionTable,
  deriveInflationAssumptions,
  generatePensionSummary,
  type PensionSummary,
  type ProjectionRow,
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
import {
  calculateJointRetirementProjection,
  type JointRetirementProjection,
} from "./joint-retirement-plan";

export type RetirementPlanResult = {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  rows: ProjectionRow[];
  summary: PensionSummary;
  assessment: RetirementPlanAssessment;
  targetBasedWithdrawalPreviews: TargetBasedWithdrawalPreview[];
  statePensionAssumptionAffectsTarget: boolean;
  inflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
  /** Present only for active two-person Expert plans. */
  jointProjection?: JointRetirementProjection;
};

export function calculateRetirementPlan(
  settings: PensionSettings
): RetirementPlanResult {
  const validationIssues = validateSettings(settings);
  const rows = createProjectionTable(settings);
  const assessment = assessRetirementPlan(rows, settings);
  const jointProjection =
    settings.jointRetirement.enabled &&
    settings.partner &&
    validationIssues.length === 0
      ? calculateJointRetirementProjection(settings)
      : undefined;

  return {
    settings,
    validationIssues,
    rows,
    summary: generatePensionSummary(rows, settings),
    assessment,
    targetBasedWithdrawalPreviews: calculateTargetBasedWithdrawalPreviews(
      rows,
      settings
    ),
    statePensionAssumptionAffectsTarget:
      calculateStatePensionAssumptionAffectsTarget(settings, assessment),
    inflationAssumptions: deriveInflationAssumptions(settings),
    jointProjection,
  };
}

function calculateStatePensionAssumptionAffectsTarget(
  settings: PensionSettings,
  assessment: RetirementPlanAssessment
) {
  if (
    settings.jointRetirement.enabled ||
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
