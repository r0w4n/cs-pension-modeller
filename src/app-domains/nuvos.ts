import type { FieldDefinition } from "../fieldDefinitions";

export function isNuvosPensionIncreaseField(fieldId: FieldDefinition["id"]) {
  return fieldId === "nuvosAssumedCpiPercent";
}
