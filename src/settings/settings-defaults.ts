import { DEFAULT_ALPHA_ABS_YEAR, type PensionSettings } from "./settings-types";
import { inflationDefaults } from "./settings-domains/inflation";
import { personalDetailsDefaults } from "./settings-domains/personal-details";
import { nuvosDefaults } from "./settings-domains/nuvos";
import { premiumDefaults } from "./settings-domains/premium";
import { statePensionDefaults } from "./settings-domains/state-pension";
import { taxDefaults } from "./settings-domains/tax";
import {
  formatLocalIsoDate,
  getTodayIsoDate,
  isValidIsoDate,
} from "./settings-shared/date";
import {
  calculateMinimumStatePensionDrawAge,
  calculateNormalPensionAge,
  calculateStatePensionDrawDateFromAge,
  normalizeSippDrawAge,
} from "./settings-shared/state";

export const defaultSettings: PensionSettings = {
  startDate: personalDetailsDefaults.startDate,
  dateOfBirth: personalDetailsDefaults.dateOfBirth,
  lifeExpectancy: personalDetailsDefaults.lifeExpectancy,
  requirementAge: personalDetailsDefaults.requirementAge,
  normalPensionAge: 68,
  showAlpha: true,
  projectionBasis: inflationDefaults.projectionBasis,
  inflationRateAnnual: inflationDefaults.inflationRateAnnual,
  showNuvos: nuvosDefaults.showNuvos,
  showPremium: premiumDefaults.showPremium,
  showStatePension: statePensionDefaults.showStatePension,
  showSipp: true,
  showIsa: true,
  showLisa: false,
  taxationEnabled: taxDefaults.taxationEnabled,
  partialRetirementEnabled: false,
  partialRetirementStartAge: 55,
  partialRetirementWorkPercent: 60,
  fullSalary: 42000,
  currentStatePension: statePensionDefaults.currentStatePension,
  desiredRetirementIncome: personalDetailsDefaults.desiredRetirementIncome,
  statePensionDrawDate: statePensionDefaults.statePensionDrawDate,
  statePensionApplyFutureGrowth:
    statePensionDefaults.statePensionApplyFutureGrowth,
  statePensionCpiPercent: statePensionDefaults.statePensionCpiPercent,
  statePensionWageGrowthPercent:
    statePensionDefaults.statePensionWageGrowthPercent,
  applyPensionIncreases: true,
  assumedCpiPercent: 0,
  alphaPensionAbsDate: DEFAULT_ALPHA_ABS_YEAR,
  alphaAddedPensionMonthly: 0,
  alphaAddedPensionFactorType: "self",
  alphaPensionLeaveAge: personalDetailsDefaults.requirementAge,
  accruedPensionAtLastAbs: 0,
  pensionableEarnings: 42000,
  alphaPayRisePercent: 0,
  alphaPensionDrawAge: personalDetailsDefaults.requirementAge,
  alphaEpaEnabled: false,
  alphaEpaYearsBeforeNpa: 3,
  alphaEpaStartDate: "2026-04-01",
  alphaEpaEndDate: "2047-03-31",
  alphaAddedPensionLumpSums: [],
  nuvosPensionAbsDate: nuvosDefaults.nuvosPensionAbsDate,
  nuvosAccruedPensionAtLastAbs: nuvosDefaults.nuvosAccruedPensionAtLastAbs,
  nuvosPensionableEarnings: nuvosDefaults.nuvosPensionableEarnings,
  nuvosPensionLeaveAge: nuvosDefaults.nuvosPensionLeaveAge,
  nuvosPensionDrawAge: nuvosDefaults.nuvosPensionDrawAge,
  nuvosApplyPensionIncreases: nuvosDefaults.nuvosApplyPensionIncreases,
  nuvosAssumedCpiPercent: nuvosDefaults.nuvosAssumedCpiPercent,
  premiumAnnualPensionAtValuationDate:
    premiumDefaults.premiumAnnualPensionAtValuationDate,
  premiumValuationDate: premiumDefaults.premiumValuationDate,
  premiumNormalPensionAge: premiumDefaults.premiumNormalPensionAge,
  premiumDrawAge: premiumDefaults.premiumDrawAge,
  premiumEarliestAccessAge: premiumDefaults.premiumEarliestAccessAge,
  premiumHasNpa65: premiumDefaults.premiumHasNpa65,
  sippCurrentPot: 0,
  sippMonthlyContribution: 0,
  sippDrawAge: personalDetailsDefaults.requirementAge,
  sippLumpSums: [],
  sippRealInterestPercent: 5,
  sippTaxReliefRate: "20",
  sippWithdrawalStrategy: "use_by_age",
  sippWithdrawalPercent: 4,
  sippWithdrawalTargetAge: 75,
  isaCurrentPot: 0,
  isaMonthlyContribution: 0,
  isaDrawAge: personalDetailsDefaults.requirementAge,
  isaLumpSums: [],
  isaRealInterestPercent: 5,
  isaWithdrawalStrategy: "use_by_age",
  isaWithdrawalPercent: 4,
  isaWithdrawalTargetAge: 75,
  lisaCurrentPot: 0,
  lisaMonthlyContribution: 0,
  lisaDrawAge: personalDetailsDefaults.requirementAge,
  lisaLumpSums: [],
  lisaRealInterestPercent: 5,
  lisaWithdrawalStrategy: "use_by_age",
  lisaWithdrawalPercent: 4,
  lisaWithdrawalTargetAge: 75,
  taxPersonalAllowance: taxDefaults.taxPersonalAllowance,
  taxPersonalAllowanceTaperThreshold:
    taxDefaults.taxPersonalAllowanceTaperThreshold,
  taxBasicRateLimit: taxDefaults.taxBasicRateLimit,
  taxAdditionalRateThreshold: taxDefaults.taxAdditionalRateThreshold,
  taxBasicRatePercent: taxDefaults.taxBasicRatePercent,
  taxHigherRatePercent: taxDefaults.taxHigherRatePercent,
  taxAdditionalRatePercent: taxDefaults.taxAdditionalRatePercent,
  taxSippTaxFreeWithdrawalPercent: taxDefaults.taxSippTaxFreeWithdrawalPercent,
};

export function createDefaultSettings(): PensionSettings {
  const normalPensionAge = calculateNormalPensionAge(
    defaultSettings.dateOfBirth
  );
  const statePensionDrawAge = calculateMinimumStatePensionDrawAge(
    defaultSettings.dateOfBirth
  );

  return {
    ...defaultSettings,
    normalPensionAge,
    startDate: getTodayIsoDate(),
    nuvosPensionDrawAge: nuvosDefaults.nuvosPensionDrawAge,
    premiumDrawAge: premiumDefaults.premiumNormalPensionAge,
    sippDrawAge: normalizeSippDrawAge(
      normalPensionAge,
      defaultSettings.dateOfBirth
    ),
    lisaDrawAge: Math.max(60, normalPensionAge),
    statePensionDrawDate: calculateStatePensionDrawDateFromAge(
      defaultSettings.dateOfBirth,
      statePensionDrawAge
    ),
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export { getTodayIsoDate, formatLocalIsoDate, isValidIsoDate };
