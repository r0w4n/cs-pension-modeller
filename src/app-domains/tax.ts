import type { FieldDefinition } from "../fieldDefinitions";
import type { PensionSettings } from "../settings";

const TAX_ASSUMPTION_FIELD_IDS = new Set<FieldDefinition["id"]>([
  "taxRegime",
  "taxPersonalAllowance",
  "taxPersonalAllowanceTaperThreshold",
  "taxBasicRateLimit",
  "taxAdditionalRateThreshold",
  "taxBasicRatePercent",
  "taxHigherRatePercent",
  "taxAdditionalRatePercent",
  "taxSippTaxFreeWithdrawalPercent",
  "taxCsAvcTaxFreeWithdrawalPercent",
]);

const REST_OF_UK_TAX_FIELD_IDS = new Set<FieldDefinition["id"]>([
  "taxBasicRateLimit",
  "taxAdditionalRateThreshold",
  "taxBasicRatePercent",
  "taxHigherRatePercent",
  "taxAdditionalRatePercent",
]);

export function isTaxAssumptionField(fieldId: FieldDefinition["id"]) {
  return TAX_ASSUMPTION_FIELD_IDS.has(fieldId);
}

export function shouldRenderTaxAssumptionField(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  return (
    (!REST_OF_UK_TAX_FIELD_IDS.has(fieldId) ||
      settings.taxRegime === "rest_of_uk") &&
    (fieldId !== "taxSippTaxFreeWithdrawalPercent" || settings.showSipp) &&
    (fieldId !== "taxCsAvcTaxFreeWithdrawalPercent" || settings.showCsAvc)
  );
}
