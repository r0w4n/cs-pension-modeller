import type { FieldDefinition } from "../fieldDefinitions";

const TAX_ASSUMPTION_FIELD_IDS = new Set<FieldDefinition["id"]>([
  "taxPersonalAllowance",
  "taxPersonalAllowanceTaperThreshold",
  "taxBasicRateLimit",
  "taxAdditionalRateThreshold",
  "taxBasicRatePercent",
  "taxHigherRatePercent",
  "taxAdditionalRatePercent",
  "taxSippTaxFreeWithdrawalPercent",
]);

export function isTaxAssumptionField(fieldId: FieldDefinition["id"]) {
  return TAX_ASSUMPTION_FIELD_IDS.has(fieldId);
}
