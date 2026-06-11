export {
  getAlphaDateYearRange,
  getAlphaEffectiveRangeField,
  isAlphaEpaField,
  isAlphaPensionIncreaseField,
} from "./app-domains/alpha";

export {
  JOURNEY_DEFINITIONS,
  OPTIONAL_SECTION_TOGGLES,
  applyBridgeJourneyDefaults,
  applySimpleJourneyDefaults,
  isOptionalSectionToggleKey,
  type JourneyDefinition,
  type JourneyFieldDescriptions,
  type JourneyFieldLabels,
  type JourneyStepDefinition,
  type OptionalSectionToggleKey,
} from "./app-domains/journeys";

export {
  getEarliestSippChartStartAge,
  getPartialRetirementStartAgeBounds,
  getPensionStartAgeBounds,
  getSippChartAccessAgeBounds,
  getStatePensionAgeBounds,
  getUseByAgeBounds,
  type ChartAgeBounds,
} from "./app-domains/bridge-chart-bounds";

export {
  buildComparisonStatusItems,
  buildComparisonTableRows,
  buildRetirementIncomeItems,
  calculateComparisonInsights,
  clearStoredComparisonScenarios,
  clonePensionSettings,
  createBridgeAnswerResult,
  createComparisonResult,
  createComparisonScenarioId,
  formatCapitalPreservation,
  formatTargetMissDuration,
  getRetirementIncomeTargetTitle,
  getRetirementIncomeTitle,
  getSettingsSignature,
  loadStoredComparisonScenarios,
  saveStoredComparisonScenarios,
  type BridgeAnswerResult,
  type BridgeAnswerResultCache,
  type ComparisonInsights,
  type ComparisonResult,
  type ComparisonResultCache,
  type ComparisonScenario,
  type ComparisonTableRow,
} from "./app-domains/comparison";

export {
  getEffectiveRangeField,
  getLumpSumDateYearRange,
  getPrimaryDateYearRange,
  isFieldDisabled,
  isFieldHiddenOnMobile,
  shouldRenderField,
  splitSettingsFields,
} from "./app-domains/forms";

export {
  getIsaEffectiveRangeField,
  isIsaFieldDisabled,
  shouldRenderIsaField,
} from "./app-domains/isa";

export { isNuvosPensionIncreaseField } from "./app-domains/nuvos";

export { isPartialRetirementField } from "./app-domains/partial-retirement";

export {
  addYearsToIsoDate,
  clampNumber,
  formatAge,
  formatAgeValue,
  formatCurrencyDetailed,
  formatDate,
  formatDecimalAge,
  formatModelledReturn,
  formatPercent,
  formatShortfallOrSurplus,
  isSettingsGroupVisible,
} from "./app-domains/shared";

export {
  calculateCurrentPlanningAge,
  createBridgeChartLimits,
  createBridgeChartParameters,
  createRetirementIncomeSeries,
} from "./app-domains/retirement-income";

export {
  getSippEffectiveRangeField,
  isSippFieldDisabled,
  shouldRenderSippField,
} from "./app-domains/sipp";

export {
  getStatePensionDateYearRange,
  getStatePensionDefaultDrawDate,
  isStatePensionGrowthField,
} from "./app-domains/state-pension";

export { isTaxAssumptionField } from "./app-domains/tax";
