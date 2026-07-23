import type { FieldDefinition } from "../fieldDefinitions";
import type { PensionSettings } from "../settings";

const TAX_ASSUMPTION_FIELD_IDS = new Set<FieldDefinition["id"]>([
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

export function isTaxAssumptionField(fieldId: FieldDefinition["id"]) {
  return TAX_ASSUMPTION_FIELD_IDS.has(fieldId);
}

export function shouldRenderTaxAssumptionField(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  return (
    (fieldId !== "taxSippTaxFreeWithdrawalPercent" || settings.showSipp) &&
    (fieldId !== "taxCsAvcTaxFreeWithdrawalPercent" || settings.showCsAvc)
  );
}
