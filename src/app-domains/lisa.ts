import type { FieldDefinition, RangeField } from "../fieldDefinitions";
import type { PensionSettings } from "../settings";
import { LISA_ACCESS_AGE } from "../settings/settings-domains/lisa";

export function shouldRenderLisaField(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  return (
    (fieldId !== "lisaWithdrawalPercent" ||
      (settings.showLisa &&
        settings.lisaWithdrawalStrategy === "percentage")) &&
    (fieldId !== "lisaWithdrawalTargetAge" ||
      (settings.showLisa && settings.lisaWithdrawalStrategy === "use_by_age"))
  );
}

export function isLisaFieldDisabled(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  return (
    (fieldId === "lisaWithdrawalPercent" &&
      settings.lisaWithdrawalStrategy !== "percentage") ||
    (fieldId === "lisaWithdrawalTargetAge" &&
      settings.lisaWithdrawalStrategy !== "use_by_age")
  );
}

export function getLisaEffectiveRangeField(
  field: RangeField,
  settings: PensionSettings
): RangeField {
  if (field.id === "lisaDrawAge") {
    return {
      ...field,
      min: LISA_ACCESS_AGE,
      max: Math.max(LISA_ACCESS_AGE, settings.lifeExpectancy),
    };
  }

  if (field.id === "lisaWithdrawalTargetAge") {
    return {
      ...field,
      min: settings.lisaDrawAge + 0.25,
      max: Math.max(
        settings.lisaDrawAge + 0.25,
        Math.min(field.max, settings.lifeExpectancy)
      ),
    };
  }

  return field;
}
