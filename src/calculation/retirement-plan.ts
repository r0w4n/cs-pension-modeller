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
import {
  assessHouseholdRetirementPlan,
  type HouseholdRetirementAssessment,
} from "./household-retirement-assessment";

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
  /** Present only when the active plan has a valid two-person projection. */
  householdAssessment?: HouseholdRetirementAssessment;
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
  const householdAssessment = jointProjection
    ? assessHouseholdRetirementPlan(jointProjection, settings)
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
      calculateStatePensionAssumptionAffectsTarget(
        settings,
        assessment,
        householdAssessment
      ),
    inflationAssumptions: deriveInflationAssumptions(settings),
    jointProjection,
    householdAssessment,
  };
}

function calculateStatePensionAssumptionAffectsTarget(
  settings: PensionSettings,
  assessment: RetirementPlanAssessment,
  householdAssessment: HouseholdRetirementAssessment | undefined
) {
  if (settings.jointRetirement.enabled) {
    return calculateHouseholdStatePensionAssumptionAffectsTarget(
      settings,
      householdAssessment
    );
  }

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

function calculateHouseholdStatePensionAssumptionAffectsTarget(
  settings: PensionSettings,
  householdAssessment: HouseholdRetirementAssessment | undefined
) {
  const partner = settings.partner;
  const removeYourStatePension =
    settings.showStatePension && !settings.statePensionForecastConfirmed;
  const removePartnerStatePension = Boolean(
    partner?.showStatePension && !partner.statePensionForecastConfirmed
  );

  if (
    !partner ||
    !householdAssessment?.meetsTargetThroughout ||
    (!removeYourStatePension && !removePartnerStatePension)
  ) {
    return false;
  }

  const settingsWithoutUnconfirmedStatePension: PensionSettings = {
    ...settings,
    showStatePension: removeYourStatePension
      ? false
      : settings.showStatePension,
    partner: {
      ...partner,
      showStatePension: removePartnerStatePension
        ? false
        : partner.showStatePension,
    },
  };
  const projectionWithoutUnconfirmedStatePension =
    calculateJointRetirementProjection(settingsWithoutUnconfirmedStatePension);

  return !assessHouseholdRetirementPlan(
    projectionWithoutUnconfirmedStatePension,
    settingsWithoutUnconfirmedStatePension
  ).meetsTargetThroughout;
}
