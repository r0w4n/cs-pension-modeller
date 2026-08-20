import type { PensionSettings } from "../settings";

export function isSettingsGroupVisible(
  groupId: string,
  settings: PensionSettings
) {
  const visibilityFields: Partial<Record<string, keyof PensionSettings>> = {
    alpha: "showAlpha",
    nuvos: "showNuvos",
    classic: "showClassic",
    "classic-plus": "showClassicPlus",
    premium: "showPremium",
    state: "showStatePension",
    sipp: "showSipp",
    "cs-avc": "showCsAvc",
    isa: "showIsa",
    lisa: "showLisa",
    "additional-income": "showAdditionalGuaranteedIncome",
    tax: "taxationEnabled",
    "partial-retirement": "partialRetirementEnabled",
  };
  const visibilityField = visibilityFields[groupId];

  return visibilityField ? Boolean(settings[visibilityField]) : true;
}
