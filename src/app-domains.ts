export {
  getAlphaDateYearRange,
  getAlphaEffectiveRangeField,
  isAlphaEpaField,
} from "./app-domains/alpha";

export {
  JOURNEY_DEFINITIONS,
  OPTIONAL_SECTION_TOGGLES,
  DEFAULT_JOURNEY_SETTINGS_PRESENTATION,
  applyBridgeJourneyDefaults,
  applySimpleJourneyDefaults,
  isOptionalSectionToggleKey,
  type JourneyDefinition,
  type JourneyCurrencyFieldPresentation,
  type JourneyFieldDescriptions,
  type JourneyFieldLabels,
  type JourneyOptionalQuestion,
  type JourneyOptionalSectionCopy,
  type JourneyResultsSection,
  type JourneyStepDefinition,
  type JourneySettingsPresentation,
  type OptionalSectionToggleKey,
} from "./app-domains/journeys";

export {
  buildComparisonStatusItems,
  buildComparisonTableRows,
  buildRetirementOutcomeBanner,
  calculateComparisonInsights,
  formatCapitalPreservation,
  formatTargetMissDuration,
  type ComparisonInsights,
  type ComparisonCellValue,
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
  assessRetirementPlan,
  type FlexibleFundAssessmentAccount,
  type RetirementPlanAssessment,
} from "./calculation/retirement-plan-assessment";

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
