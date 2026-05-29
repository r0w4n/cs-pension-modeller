import type { FieldDefinition, RangeField } from "../fieldDefinitions";
import type { PensionSettings } from "../settings";
import { calculateCurrentPlanningAge } from "./retirement-income";

export function shouldRenderIsaField(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings,
) {
  return (
    (fieldId !== "isaWithdrawalPercent" ||
      (settings.showIsa && settings.isaWithdrawalStrategy === "percentage")) &&
    (fieldId !== "isaWithdrawalTargetAge" ||
      (settings.showIsa && settings.isaWithdrawalStrategy === "use_by_age"))
  );
}

export function isIsaFieldDisabled(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings,
) {
  return (
    (fieldId === "isaRealInterestPercent" && !settings.isaApplyRealInterest) ||
    (fieldId === "isaWithdrawalPercent" &&
      settings.isaWithdrawalStrategy !== "percentage") ||
    (fieldId === "isaWithdrawalTargetAge" &&
      settings.isaWithdrawalStrategy !== "use_by_age")
  );
}

export function getIsaEffectiveRangeField(
  field: RangeField,
  settings: PensionSettings,
): RangeField {
  if (field.id === "isaWithdrawalTargetAge") {
    return {
      ...field,
      min: settings.isaDrawAge + 0.25,
      max: Math.max(
        settings.isaDrawAge + 0.25,
        Math.min(field.max, settings.lifeExpectancy),
      ),
    };
  }

  if (field.id === "isaDrawAge") {
    return {
      ...field,
      min: Math.min(field.max, calculateCurrentPlanningAge(settings)),
    };
  }

  return field;
}
