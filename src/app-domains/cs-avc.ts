import type { FieldDefinition, RangeField } from "../fieldDefinitions";
import {
  calculateMinimumCsAvcAccessAge,
  type PensionSettings,
} from "../settings";

const CS_AVC_FIELD_IDS = new Set<FieldDefinition["id"]>([
  "csAvcCurrentPot",
  "csAvcMonthlyContribution",
  "csAvcDrawAge",
  "csAvcHasProtectedPensionAge",
  "csAvcRealInterestPercent",
  "csAvcWithdrawalStrategy",
  "csAvcWithdrawalPercent",
  "csAvcWithdrawalTargetAge",
]);

export function shouldRenderCsAvcField(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  if (CS_AVC_FIELD_IDS.has(fieldId) && !settings.showCsAvc) {
    return false;
  }

  if (fieldId === "csAvcHasProtectedPensionAge") {
    return false;
  }

  return (
    (fieldId !== "csAvcWithdrawalPercent" ||
      (settings.showCsAvc &&
        settings.csAvcWithdrawalStrategy === "percentage")) &&
    (fieldId !== "csAvcWithdrawalTargetAge" ||
      (settings.showCsAvc && settings.csAvcWithdrawalStrategy === "use_by_age"))
  );
}

export function isCsAvcFieldDisabled(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  return (
    (fieldId === "csAvcWithdrawalPercent" &&
      settings.csAvcWithdrawalStrategy !== "percentage") ||
    (fieldId === "csAvcWithdrawalTargetAge" &&
      settings.csAvcWithdrawalStrategy !== "use_by_age")
  );
}

export function getCsAvcEffectiveRangeField(
  field: RangeField,
  settings: PensionSettings
): RangeField {
  if (field.id === "csAvcDrawAge") {
    const minimumCsAvcAccessAge = calculateMinimumCsAvcAccessAge(
      settings.dateOfBirth,
      settings
    );

    return {
      ...field,
      min: minimumCsAvcAccessAge,
      max: Math.max(minimumCsAvcAccessAge, settings.lifeExpectancy),
    };
  }

  if (field.id === "csAvcWithdrawalTargetAge") {
    return {
      ...field,
      min: settings.csAvcDrawAge + 0.25,
      max: Math.max(
        settings.csAvcDrawAge + 0.25,
        Math.min(field.max, settings.lifeExpectancy)
      ),
    };
  }

  return field;
}
