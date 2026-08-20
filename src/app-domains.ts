export {
  getAlphaDateYearRange,
  getAlphaEffectiveRangeField,
  isAlphaEpaField,
} from "./app-domains/alpha";

export {
  calculateAddedPensionMonthlyIncome,
  createAddedPensionGoalBasis,
  estimateAddedPensionMonthlyContribution,
  type AddedPensionGoalBasis,
} from "./app-domains/added-pension-goal";

export {
  JOURNEY_DEFINITIONS,
  OPTIONAL_SECTION_TOGGLES,
  applyBridgeJourneyDefaults,
  applySimpleJourneyAssumptions,
  applySimpleJourneyDefaults,
  isSpendingSmileEditorStep,
  isExpertRetirementIncomeTargetStep,
  isOptionalSectionToggleKey,
  SPENDING_SMILE_EDITOR_STEP_ID,
  type JourneyDefinition,
  type JourneyCurrencyFieldPresentation,
  type JourneyFieldDescriptions,
  type JourneyFieldLabels,
  type JourneyOptionalQuestion,
  type JourneyOptionalSectionCopy,
  type JourneyStepDefinition,
  type OptionalSectionToggleKey,
} from "./app-domains/journeys";

export {
  getEarliestSippChartStartAge,
  getPartialRetirementStartAgeBounds,
  getPensionStartAgeBounds,
  getSippChartAccessAgeBounds,
  getStatePensionAgeBounds,
  getStandalonePensionStartAgeBounds,
  getUseByAgeBounds,
  type ChartAgeBounds,
} from "./app-domains/retirement-income-chart-bounds";

export {
  buildComparisonStatusItems,
  buildComparisonTableRows,
  buildIncomeAgeRangeItems,
  buildRetirementOutcomeBanner,
  calculateComparisonInsights,
  clearStoredComparisonScenarios,
  clonePensionSettings,
  createBridgeAnswerResult,
  createComparisonResult,
  createComparisonScenarioId,
  formatCapitalPreservation,
  formatTargetMissDuration,
  getSettingsSignature,
  loadStoredComparisonScenarios,
  saveStoredComparisonScenarios,
  type BridgeAnswerResult,
  type BridgeAnswerResultCache,
  type ComparisonInsights,
  type IncomeAgeRangeItem,
  type ComparisonResult,
  type ComparisonResultCache,
  type ComparisonScenario,
  type ComparisonTableRow,
  type RetirementOutcomeBanner,
  type RetirementOutcomeStatus,
} from "./app-domains/comparison";

export {
  getEffectiveRangeField,
  getLumpSumDateYearRange,
  getPrimaryDateYearRange,
  isFieldDisabled,
  isFieldHiddenOnMobile,
  shouldRenderField,
} from "./app-domains/forms";

export {
  getIsaEffectiveRangeField,
  isIsaFieldDisabled,
  shouldRenderIsaField,
} from "./app-domains/isa";

export {
  getLisaEffectiveRangeField,
  isLisaFieldDisabled,
  shouldRenderLisaField,
} from "./app-domains/lisa";

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
  createRetirementIncomeChartLimits,
  createRetirementIncomeChartParameters,
  createRetirementIncomeSeries,
} from "./app-domains/retirement-income";

export {
  assessRetirementPlan,
  type FlexibleFundAssessmentAccount,
  type RetirementPlanAssessment,
} from "./app-domains/retirement-plan-assessment";

export {
  createTargetBasedWithdrawalPreview,
  getBalanceForAccount,
  getFlexibleFundAccountIdForStrategyField,
  getFlexibleFundAccountLabel,
  getFlexibleWithdrawalNonPriorityAccounts,
  getFlexibleWithdrawalPriorityAccounts,
  getWithdrawalForAccount,
  getWithdrawalStrategyFieldId,
  reorderFlexibleWithdrawalAccounts,
  shouldShowFlexibleWithdrawalPriority,
  summarizeFlexibleWithdrawalInsights,
  type FlexibleWithdrawalAccountInsight,
  type FlexibleWithdrawalSummary,
  type ResidualFlexibleFundInsight,
  type TargetBasedWithdrawalPreview,
} from "./app-domains/flexible-withdrawals";

export {
  getSippEffectiveRangeField,
  isSippFieldDisabled,
  shouldRenderSippField,
} from "./app-domains/sipp";

export {
  getCsAvcEffectiveRangeField,
  isCsAvcFieldDisabled,
  shouldRenderCsAvcField,
} from "./app-domains/cs-avc";

export {
  getStatePensionDateYearRange,
  getStatePensionDefaultDrawDate,
  isStatePensionGrowthField,
} from "./app-domains/state-pension";

export { isTaxAssumptionField } from "./app-domains/tax";
