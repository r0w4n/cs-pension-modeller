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

export type RetirementPlanResult = {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  rows: ProjectionRow[];
  summary: PensionSummary;
  assessment: RetirementPlanAssessment;
  inflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
};

export function calculateRetirementPlan(
  settings: PensionSettings
): RetirementPlanResult {
  const validationIssues = validateSettings(settings);
  const rows = createProjectionTable(settings);

  return {
    settings,
    validationIssues,
    rows,
    summary: generatePensionSummary(rows, settings),
    assessment: assessRetirementPlan(rows, settings),
    inflationAssumptions: deriveInflationAssumptions(settings),
  };
}
