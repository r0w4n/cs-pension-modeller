import type { FieldDefinition, RangeField } from "../fieldDefinitions";
import type { PensionSettings } from "../settings";
import { LISA_ACCESS_AGE } from "../settings/settings-domains/lisa";

export const LISA_ALLOWANCE_GUIDANCE =
  "Regular LISA saving and scheduled lump sums are included until the earliest of the LISA draw date, target retirement age, or age 50. Eligible additions are capped at £4,000 per UK tax year and receive a 25% government bonus in the model. LISA payments count towards the overall annual ISA subscription allowance. The regular monthly contribution control is capped at one twelfth of the annual LISA allowance as a modeller convention for regular saving, rather than a separate statutory monthly payment limit.";

export const LISA_LIMITATIONS_GUIDANCE =
  "Known simplification: the retirement LISA projection does not model first-home withdrawals, terminal-illness withdrawals, or the 25% charge for other withdrawals before age 60. It does not determine legal contribution eligibility from UK residence or Crown-service status, and provider-specific payment, bonus-claim and transfer mechanics are outside the projection. The model does not validate combined ISA and LISA subscriptions against the overall annual ISA allowance; it treats the LISA as a separate tax-free retirement balance.";

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
