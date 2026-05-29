import type { DateField, FieldDefinition } from "../fieldDefinitions";
import {
  calculateStatePensionDrawDate,
  defaultSettings,
  type PensionSettings,
} from "../settings";

const STATE_PENSION_GROWTH_FIELD_IDS = new Set<FieldDefinition["id"]>([
  "statePensionCpiPercent",
  "statePensionWageGrowthPercent",
]);

export function isStatePensionGrowthField(fieldId: FieldDefinition["id"]) {
  return STATE_PENSION_GROWTH_FIELD_IDS.has(fieldId);
}

export function getStatePensionDefaultDrawDate(settings?: PensionSettings) {
  return calculateStatePensionDrawDate(
    settings?.dateOfBirth ?? defaultSettings.dateOfBirth,
  );
}

export function getStatePensionDateYearRange(
  fieldId: DateField["id"],
  settings?: PensionSettings,
) {
  if (fieldId !== "statePensionDrawDate") {
    return null;
  }

  const defaultDrawYear = Number(
    getStatePensionDefaultDrawDate(settings).slice(0, 4),
  );

  return { min: defaultDrawYear, max: defaultDrawYear + 30 };
}
