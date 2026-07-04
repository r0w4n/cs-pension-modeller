import type {
  DateField,
  FieldDefinition,
  RangeField,
} from "../fieldDefinitions";
import {
  MAX_ADDED_PENSION_PURCHASE_INPUT_AGE,
  calculateMinimumPensionAccessAge,
  type PensionSettings,
} from "../settings";
import { calculateCurrentPlanningAge } from "./retirement-income";

const ALPHA_EPA_FIELD_IDS = new Set<FieldDefinition["id"]>([
  "alphaEpaYearsBeforeNpa",
  "alphaEpaStartDate",
  "alphaEpaEndDate",
]);

export function isAlphaEpaField(fieldId: FieldDefinition["id"]) {
  return ALPHA_EPA_FIELD_IDS.has(fieldId);
}

export function getAlphaEffectiveRangeField(
  field: RangeField,
  settings: PensionSettings
): RangeField {
  let effectiveField = field;

  if (field.id === "alphaPensionDrawAge") {
    effectiveField = {
      ...effectiveField,
      min: calculateMinimumPensionAccessAge(settings.dateOfBirth),
    };
  }

  if (field.id === "alphaPensionLeaveAge") {
    effectiveField = {
      ...effectiveField,
      min: Math.min(effectiveField.max, calculateCurrentPlanningAge(settings)),
    };
  }

  if (
    settings.alphaAddedPensionMonthly <= 0 ||
    (field.id !== "alphaPensionDrawAge" && field.id !== "alphaPensionLeaveAge")
  ) {
    return effectiveField;
  }

  const pairedStopAge =
    field.id === "alphaPensionDrawAge"
      ? settings.alphaPensionLeaveAge
      : settings.alphaPensionDrawAge;

  if (pairedStopAge <= MAX_ADDED_PENSION_PURCHASE_INPUT_AGE) {
    return effectiveField;
  }

  const cappedMax = Math.min(
    effectiveField.max,
    MAX_ADDED_PENSION_PURCHASE_INPUT_AGE
  );

  return {
    ...effectiveField,
    min: Math.min(effectiveField.min, cappedMax),
    max: cappedMax,
  };
}

export function getAlphaDateYearRange(fieldId: DateField["id"]) {
  if (fieldId !== "alphaPensionAbsDate") {
    return null;
  }

  const currentYear = new Date().getUTCFullYear();
  return { min: 2015, max: currentYear };
}
