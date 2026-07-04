import type { FieldDefinition } from "../fieldDefinitions";
import type { PensionSettings } from "../settings";

const classicEstimateFields = new Set<FieldDefinition["id"]>([
  "classicFinalSalaryLink",
  "classicCurrentFinalPensionableEarnings",
  "classicPreservedFinalPensionableEarnings",
  "classicReckonableServiceYears",
]);

const classicManualFields = new Set<FieldDefinition["id"]>([
  "classicAnnualPension",
  "classicAutomaticLumpSum",
]);

const classicPlusEstimateFields = new Set<FieldDefinition["id"]>([
  "classicPlusFinalSalaryLink",
  "classicPlusCurrentFinalPensionableEarnings",
  "classicPlusPreservedFinalPensionableEarnings",
  "classicPlusPre2002ServiceYears",
  "classicPlusPost2002ServiceYears",
]);

const classicPlusManualFields = new Set<FieldDefinition["id"]>([
  "classicPlusAnnualPension",
  "classicPlusAutomaticLumpSum",
]);

export function shouldRenderClassicField(
  fieldId: FieldDefinition["id"],
  settings: PensionSettings
) {
  if (
    classicEstimateFields.has(fieldId) &&
    settings.classicCalculationMode !== "estimate"
  ) {
    return false;
  }

  if (
    classicManualFields.has(fieldId) &&
    settings.classicCalculationMode !== "manual"
  ) {
    return false;
  }

  if (
    fieldId === "classicCurrentFinalPensionableEarnings" &&
    settings.classicFinalSalaryLink !== "maintained"
  ) {
    return false;
  }

  if (
    fieldId === "classicPreservedFinalPensionableEarnings" &&
    settings.classicFinalSalaryLink !== "broken"
  ) {
    return false;
  }

  if (
    classicPlusEstimateFields.has(fieldId) &&
    settings.classicPlusCalculationMode !== "estimate"
  ) {
    return false;
  }

  if (
    classicPlusManualFields.has(fieldId) &&
    settings.classicPlusCalculationMode !== "manual"
  ) {
    return false;
  }

  if (
    fieldId === "classicPlusCurrentFinalPensionableEarnings" &&
    settings.classicPlusFinalSalaryLink !== "maintained"
  ) {
    return false;
  }

  if (
    fieldId === "classicPlusPreservedFinalPensionableEarnings" &&
    settings.classicPlusFinalSalaryLink !== "broken"
  ) {
    return false;
  }

  return true;
}
