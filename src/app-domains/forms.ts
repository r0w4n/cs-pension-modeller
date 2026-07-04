import type {
  DateField,
  FieldDefinition,
  RangeField,
} from "../fieldDefinitions";
import type { PensionSettings } from "../settings";
import {
  getAlphaDateYearRange,
  getAlphaEffectiveRangeField,
  isAlphaEpaField,
} from "./alpha";
import {
  getIsaEffectiveRangeField,
  isIsaFieldDisabled,
  shouldRenderIsaField,
} from "./isa";
import {
  getLisaEffectiveRangeField,
  isLisaFieldDisabled,
  shouldRenderLisaField,
} from "./lisa";
import { isNuvosPensionIncreaseField } from "./nuvos";
import { isPartialRetirementField } from "./partial-retirement";
import { calculateCurrentPlanningAge } from "./retirement-income";
import {
  getSippEffectiveRangeField,
  isSippFieldDisabled,
  shouldRenderSippField,
} from "./sipp";
import {
  getStatePensionDateYearRange,
  isStatePensionGrowthField,
} from "./state-pension";
import { isTaxAssumptionField } from "./tax";

export function shouldRenderField(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  return (
    shouldRenderSippField(fieldId, settings) &&
    shouldRenderIsaField(fieldId, settings) &&
    shouldRenderLisaField(fieldId, settings)
  );
}

export function isFieldDisabled(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  return (
    (isTaxAssumptionField(fieldId) && !settings.taxationEnabled) ||
    (isPartialRetirementField(fieldId) && !settings.partialRetirementEnabled) ||
    (isNuvosPensionIncreaseField(fieldId) &&
      !settings.nuvosApplyPensionIncreases) ||
    (isStatePensionGrowthField(fieldId) &&
      !settings.statePensionApplyFutureGrowth) ||
    isSippFieldDisabled(fieldId, settings) ||
    isIsaFieldDisabled(fieldId, settings) ||
    isLisaFieldDisabled(fieldId, settings) ||
    (isAlphaEpaField(fieldId) && !settings.alphaEpaEnabled)
  );
}

export function isFieldHiddenOnMobile(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  return isFieldDisabled(fieldId, settings);
}

export function getEffectiveRangeField(
  field: RangeField,
  settings: PensionSettings
): RangeField {
  let effectiveField = field;

  effectiveField = getAlphaEffectiveRangeField(effectiveField, settings);
  effectiveField = getSippEffectiveRangeField(effectiveField, settings);
  effectiveField = getIsaEffectiveRangeField(effectiveField, settings);
  effectiveField = getLisaEffectiveRangeField(effectiveField, settings);

  if (field.id === "requirementAge") {
    effectiveField = {
      ...effectiveField,
      min: Math.min(effectiveField.max, calculateCurrentPlanningAge(settings)),
    };
  }

  return effectiveField;
}

export function getPrimaryDateYearRange(
  fieldId: DateField["id"],
  settings?: PensionSettings
) {
  const alphaRange = getAlphaDateYearRange(fieldId);

  if (alphaRange) {
    return alphaRange;
  }

  const statePensionRange = getStatePensionDateYearRange(fieldId, settings);

  if (statePensionRange) {
    return statePensionRange;
  }

  const currentYear = new Date().getUTCFullYear();

  switch (fieldId) {
    case "dateOfBirth":
      return { min: currentYear - 100, max: currentYear };
    case "startDate":
      return { min: currentYear - 5, max: currentYear + 5 };
    default:
      return { min: currentYear - 25, max: currentYear + 25 };
  }
}

export function getLumpSumDateYearRange(kind: "start" | "end") {
  const currentYear = new Date().getUTCFullYear();

  if (kind === "start") {
    return { min: currentYear - 5, max: currentYear + 40 };
  }

  return { min: currentYear - 5, max: currentYear + 50 };
}
