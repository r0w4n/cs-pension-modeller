import type { FieldDefinition, RangeField } from "../fieldDefinitions";
import { calculateMinimumSippAccessAge, type PensionSettings } from "../settings";

export function shouldRenderSippField(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings,
) {
  return (
    (fieldId !== "sippWithdrawalPercent" ||
      (settings.showSipp && settings.sippWithdrawalStrategy === "percentage")) &&
    (fieldId !== "sippWithdrawalTargetAge" ||
      (settings.showSipp && settings.sippWithdrawalStrategy === "use_by_age"))
  );
}

export function isSippFieldDisabled(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings,
) {
  return (
    (fieldId === "sippWithdrawalPercent" &&
      settings.sippWithdrawalStrategy !== "percentage") ||
    (fieldId === "sippWithdrawalTargetAge" &&
      settings.sippWithdrawalStrategy !== "use_by_age")
  );
}

export function getSippEffectiveRangeField(
  field: RangeField,
  settings: PensionSettings,
): RangeField {
  if (field.id === "sippDrawAge") {
    return {
      ...field,
      min: calculateMinimumSippAccessAge(settings.dateOfBirth),
    };
  }

  if (field.id === "sippWithdrawalTargetAge") {
    return {
      ...field,
      min: settings.sippDrawAge + 0.25,
      max: Math.max(
        settings.sippDrawAge + 0.25,
        Math.min(field.max, settings.lifeExpectancy),
      ),
    };
  }

  return field;
}
