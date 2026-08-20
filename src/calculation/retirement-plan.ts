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

export type RetirementPlanResult = {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  rows: ProjectionRow[];
  summary: PensionSummary;
  assessment: RetirementPlanAssessment;
  bridgeFundingEstimate: RetirementBridgeAnalysis;
  inflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
};

export function calculateRetirementPlan(
  settings: PensionSettings
): RetirementPlanResult {
  const validationIssues = validateSettings(settings);
  const rows = createProjectionTable(settings);
  const bridgeFundingEstimate = calculateBridgeFundingEstimate(settings);

  return {
    settings,
    validationIssues,
    rows,
    summary: generatePensionSummary(rows, settings),
    assessment: assessRetirementPlan(rows, settings),
    bridgeFundingEstimate,
    inflationAssumptions: deriveInflationAssumptions(settings),
  };
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
