import type { FieldDefinition } from "../fieldDefinitions";

const PARTIAL_RETIREMENT_FIELD_IDS = new Set<FieldDefinition["id"]>([
  "partialRetirementStartAge",
  "partialRetirementWorkPercent",
  "fullSalary",
]);

export function isPartialRetirementField(fieldId: FieldDefinition["id"]) {
  return PARTIAL_RETIREMENT_FIELD_IDS.has(fieldId);
}
