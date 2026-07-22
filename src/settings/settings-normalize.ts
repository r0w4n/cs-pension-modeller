import {
  ALPHA_ADDED_PENSION_MONTHLY_MAX,
  type AddedPensionLumpSum,
  type PensionSettings,
} from "./settings-types";
import { normalizeAdditionalGuaranteedIncomes } from "./settings-domains/additional-guaranteed-income";
import { defaultSettings } from "./settings-defaults";
import {
  inflationNumericSettingRules,
  normalizeInflationSetting,
} from "./settings-domains/inflation";
import {
  normalizeAddedPensionFactorType,
  normalizeAddedPensionLumpSums,
  normalizeAlphaAbsYearValue,
  normalizeAlphaPensionBooleanSetting,
} from "./settings-domains/alpha-pension";
import {
  classicNumericSettingRules,
  normalizeClassicBooleanSetting,
  normalizeClassicCalculationMode,
  normalizeClassicFinalSalaryLink,
} from "./settings-domains/classic";
import {
  normalizeIsaBooleanSetting,
  normalizeIsaWithdrawalStrategy,
} from "./settings-domains/isa";
import {
  LISA_ACCESS_AGE,
  LISA_MONTHLY_CONTRIBUTION_MAX,
  normalizeLisaBooleanSetting,
  normalizeLisaWithdrawalStrategy,
} from "./settings-domains/lisa";
import {
  normalizeNuvosBooleanSetting,
  nuvosNumericSettingRules,
} from "./settings-domains/nuvos";
import {
  normalizePremiumBooleanSetting,
  normalizePremiumEarliestAccessAge,
  premiumNumericSettingRules,
} from "./settings-domains/premium";
import {
  normalizePersonalDateSetting,
  personalDetailsNumericSettingRules,
} from "./settings-domains/personal-details";
import { normalizePartialRetirementBooleanSetting } from "./settings-domains/partial-retirement";
import { normalizeIsoDate } from "./settings-shared/date";
import {
  normalizeStatePensionBooleanSetting,
  normalizeStatePensionDrawDate,
  statePensionNumericSettingRules,
} from "./settings-domains/state-pension";
import {
  normalizeSippBooleanSetting,
  normalizeSippTaxReliefRate,
  normalizeSippWithdrawalStrategy,
} from "./settings-domains/sipp";
import {
  normalizeCsAvcBooleanSetting,
  normalizeCsAvcWithdrawalStrategy,
} from "./settings-domains/cs-avc";
import {
  normalizeTaxationBooleanSetting,
  taxNumericSettingRules,
} from "./settings-domains/tax";
import {
  calculateNormalPensionAge,
  normalizeAlphaPensionDrawAge,
  normalizeSippDrawAge,
  normalizeStatePensionDrawAge,
} from "./settings-shared/state";

const numericSettingRules = {
  ...personalDetailsNumericSettingRules,
  ...inflationNumericSettingRules,
  ...statePensionNumericSettingRules,
  partialRetirementStartAge: { min: 40, max: 70, step: 1 },
  partialRetirementWorkPercent: { min: 0, max: 100, step: 1 },
  fullSalary: { min: 0, max: 300000, step: 1 },
  assumedCpiPercent: { min: 0, max: 10, step: 0.1 },
  alphaAddedPensionMonthly: {
    min: 0,
    max: ALPHA_ADDED_PENSION_MONTHLY_MAX,
    step: 25,
  },
  alphaPensionLeaveAge: { min: 0, max: 70, step: 1 },
  accruedPensionAtLastAbs: { min: 0, max: 50000, step: 1 },
  pensionableEarnings: { min: 10000, max: 150000, step: 500 },
  alphaPayRisePercent: { min: 0, max: 15, step: 0.1 },
  alphaPensionDrawAge: { min: 55, max: 70, step: 1 },
  alphaEpaYearsBeforeNpa: { min: 1, max: 3, step: 1 },
  ...classicNumericSettingRules,
  ...nuvosNumericSettingRules,
  ...premiumNumericSettingRules,
  sippCurrentPot: { min: 0, max: 2_000_000, step: 1 },
  sippMonthlyContribution: { min: 0, max: 5000, step: 25 },
  sippProtectedPensionAge: { min: 0, max: 56, step: 1 },
  sippDrawAge: { min: 0, max: 100, step: 1 },
  sippRealInterestPercent: { min: -10, max: 10, step: 0.1 },
  sippWithdrawalPercent: { min: 0, max: 15, step: 0.1 },
  sippWithdrawalTargetAge: { min: 55, max: 100, step: 1 },
  csAvcCurrentPot: { min: 0, max: 2_000_000, step: 1 },
  csAvcMonthlyContribution: { min: 0, max: 5000, step: 25 },
  csAvcProtectedPensionAge: { min: 0, max: 56, step: 1 },
  csAvcDrawAge: { min: 0, max: 100, step: 1 },
  csAvcRealInterestPercent: { min: -10, max: 10, step: 0.1 },
  csAvcWithdrawalPercent: { min: 0, max: 15, step: 0.1 },
  csAvcWithdrawalTargetAge: { min: 55, max: 100, step: 1 },
  isaCurrentPot: { min: 0, max: 2_000_000, step: 1 },
  isaMonthlyContribution: { min: 0, max: 5000, step: 25 },
  isaDrawAge: { min: 0, max: 100, step: 1 },
  isaRealInterestPercent: { min: -10, max: 10, step: 0.1 },
  isaWithdrawalPercent: { min: 0, max: 15, step: 0.1 },
  isaWithdrawalTargetAge: { min: 0, max: 100, step: 1 },
  lisaCurrentPot: { min: 0, max: 2_000_000, step: 1 },
  lisaMonthlyContribution: {
    min: 0,
    max: LISA_MONTHLY_CONTRIBUTION_MAX,
    step: 25,
  },
  lisaDrawAge: { min: LISA_ACCESS_AGE, max: 100, step: 1 },
  lisaRealInterestPercent: { min: -10, max: 10, step: 0.1 },
  lisaWithdrawalPercent: { min: 0, max: 15, step: 0.1 },
  lisaWithdrawalTargetAge: { min: LISA_ACCESS_AGE, max: 100, step: 1 },
  ...taxNumericSettingRules,
} as const;

type NumericSettingKey = keyof typeof numericSettingRules;

const numericSettingDefaults: Record<NumericSettingKey, number> = {
  lifeExpectancy: defaultSettings.lifeExpectancy,
  requirementAge: defaultSettings.requirementAge,
  inflationRateAnnual: defaultSettings.inflationRateAnnual,
  currentStatePension: defaultSettings.currentStatePension,
  desiredRetirementIncome: defaultSettings.desiredRetirementIncome,
  statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
  statePensionWageGrowthPercent: defaultSettings.statePensionWageGrowthPercent,
  partialRetirementStartAge: defaultSettings.partialRetirementStartAge,
  partialRetirementWorkPercent: defaultSettings.partialRetirementWorkPercent,
  fullSalary: defaultSettings.fullSalary,
  assumedCpiPercent: defaultSettings.assumedCpiPercent,
  alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
  alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
  accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
  pensionableEarnings: defaultSettings.pensionableEarnings,
  alphaPayRisePercent: defaultSettings.alphaPayRisePercent,
  alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
  alphaEpaYearsBeforeNpa: defaultSettings.alphaEpaYearsBeforeNpa,
  classicCurrentFinalPensionableEarnings:
    defaultSettings.classicCurrentFinalPensionableEarnings,
  classicPreservedFinalPensionableEarnings:
    defaultSettings.classicPreservedFinalPensionableEarnings,
  classicReckonableServiceYears: defaultSettings.classicReckonableServiceYears,
  classicAnnualPension: defaultSettings.classicAnnualPension,
  classicAutomaticLumpSum: defaultSettings.classicAutomaticLumpSum,
  classicPensionDrawAge: defaultSettings.classicPensionDrawAge,
  classicPlusCurrentFinalPensionableEarnings:
    defaultSettings.classicPlusCurrentFinalPensionableEarnings,
  classicPlusPreservedFinalPensionableEarnings:
    defaultSettings.classicPlusPreservedFinalPensionableEarnings,
  classicPlusPre2002ServiceYears:
    defaultSettings.classicPlusPre2002ServiceYears,
  classicPlusPost2002ServiceYears:
    defaultSettings.classicPlusPost2002ServiceYears,
  classicPlusAnnualPension: defaultSettings.classicPlusAnnualPension,
  classicPlusAutomaticLumpSum: defaultSettings.classicPlusAutomaticLumpSum,
  classicPlusPensionDrawAge: defaultSettings.classicPlusPensionDrawAge,
  nuvosAccruedPensionAtLastAbs: defaultSettings.nuvosAccruedPensionAtLastAbs,
  nuvosPensionableEarnings: defaultSettings.nuvosPensionableEarnings,
  nuvosPensionLeaveAge: defaultSettings.nuvosPensionLeaveAge,
  nuvosPensionDrawAge: defaultSettings.nuvosPensionDrawAge,
  nuvosAssumedCpiPercent: defaultSettings.nuvosAssumedCpiPercent,
  premiumAnnualPensionAtValuationDate:
    defaultSettings.premiumAnnualPensionAtValuationDate,
  premiumNormalPensionAge: defaultSettings.premiumNormalPensionAge,
  premiumDrawAge: defaultSettings.premiumDrawAge,
  sippCurrentPot: defaultSettings.sippCurrentPot,
  sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
  sippProtectedPensionAge: defaultSettings.sippProtectedPensionAge,
  sippDrawAge: defaultSettings.sippDrawAge,
  sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
  sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
  sippWithdrawalTargetAge: defaultSettings.sippWithdrawalTargetAge,
  csAvcCurrentPot: defaultSettings.csAvcCurrentPot,
  csAvcMonthlyContribution: defaultSettings.csAvcMonthlyContribution,
  csAvcProtectedPensionAge: defaultSettings.csAvcProtectedPensionAge,
  csAvcDrawAge: defaultSettings.csAvcDrawAge,
  csAvcRealInterestPercent: defaultSettings.csAvcRealInterestPercent,
  csAvcWithdrawalPercent: defaultSettings.csAvcWithdrawalPercent,
  csAvcWithdrawalTargetAge: defaultSettings.csAvcWithdrawalTargetAge,
  isaCurrentPot: defaultSettings.isaCurrentPot,
  isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
  isaDrawAge: defaultSettings.isaDrawAge,
  isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
  isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
  isaWithdrawalTargetAge: defaultSettings.isaWithdrawalTargetAge,
  lisaCurrentPot: defaultSettings.lisaCurrentPot,
  lisaMonthlyContribution: defaultSettings.lisaMonthlyContribution,
  lisaDrawAge: defaultSettings.lisaDrawAge,
  lisaRealInterestPercent: defaultSettings.lisaRealInterestPercent,
  lisaWithdrawalPercent: defaultSettings.lisaWithdrawalPercent,
  lisaWithdrawalTargetAge: defaultSettings.lisaWithdrawalTargetAge,
  taxPersonalAllowance: defaultSettings.taxPersonalAllowance,
  taxPersonalAllowanceTaperThreshold:
    defaultSettings.taxPersonalAllowanceTaperThreshold,
  taxBasicRateLimit: defaultSettings.taxBasicRateLimit,
  taxAdditionalRateThreshold: defaultSettings.taxAdditionalRateThreshold,
  taxBasicRatePercent: defaultSettings.taxBasicRatePercent,
  taxHigherRatePercent: defaultSettings.taxHigherRatePercent,
  taxAdditionalRatePercent: defaultSettings.taxAdditionalRatePercent,
  taxSippTaxFreeWithdrawalPercent:
    defaultSettings.taxSippTaxFreeWithdrawalPercent,
  taxCsAvcTaxFreeWithdrawalPercent:
    defaultSettings.taxCsAvcTaxFreeWithdrawalPercent,
};

const decimalAgeSettingKeys: readonly NumericSettingKey[] = [
  "lifeExpectancy",
  "requirementAge",
  "partialRetirementStartAge",
  "alphaPensionLeaveAge",
  "alphaPensionDrawAge",
  "classicPensionDrawAge",
  "classicPlusPensionDrawAge",
  "nuvosPensionLeaveAge",
  "nuvosPensionDrawAge",
  "premiumDrawAge",
  "sippDrawAge",
  "sippWithdrawalTargetAge",
  "csAvcDrawAge",
  "csAvcWithdrawalTargetAge",
  "isaDrawAge",
  "isaWithdrawalTargetAge",
  "lisaDrawAge",
  "lisaWithdrawalTargetAge",
];

function normalizeNumericSetting(key: NumericSettingKey, value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return numericSettingDefaults[key];
  }

  const { min, max, step } = numericSettingRules[key];
  const clamped = Math.min(max, Math.max(min, parsed));

  if (step !== 1 || decimalAgeSettingKeys.includes(key)) {
    return clamped;
  }

  const snapped = Math.round((clamped - min) / step) * step + min;

  return Math.min(max, Math.max(min, snapped));
}

// eslint-disable-next-line sonarjs/cyclomatic-complexity
export function normalizeSetting<K extends keyof PensionSettings>(
  key: K,
  value: PensionSettings[K]
): PensionSettings[K] {
  switch (key) {
    case "startDate":
    case "dateOfBirth":
      return normalizePersonalDateSetting(
        key,
        value as string,
        normalizeIsoDate
      ) as PensionSettings[K];
    case "statePensionDrawDate":
      return normalizeIsoDate(
        value as string,
        defaultSettings.statePensionDrawDate
      ) as PensionSettings[K];
    case "applyPensionIncreases":
    case "showAlpha":
    case "alphaEpaEnabled":
      return normalizeAlphaPensionBooleanSetting(value) as PensionSettings[K];
    case "showClassic":
    case "showClassicPlus":
    case "classicApplyPensionIncreases":
    case "classicPlusApplyPensionIncreases":
      return normalizeClassicBooleanSetting(value) as PensionSettings[K];
    case "showNuvos":
      return normalizeNuvosBooleanSetting(value) as PensionSettings[K];
    case "showPremium":
    case "premiumHasNpa65":
      return normalizePremiumBooleanSetting(value) as PensionSettings[K];
    case "showStatePension":
      return normalizeStatePensionBooleanSetting(value) as PensionSettings[K];
    case "taxationEnabled":
      return normalizeTaxationBooleanSetting(value) as PensionSettings[K];
    case "partialRetirementEnabled":
      return normalizePartialRetirementBooleanSetting(
        value
      ) as PensionSettings[K];
    case "showSipp":
    case "sippHasProtectedPensionAge":
      return normalizeSippBooleanSetting(value) as PensionSettings[K];
    case "showCsAvc":
    case "csAvcHasProtectedPensionAge":
      return normalizeCsAvcBooleanSetting(value) as PensionSettings[K];
    case "showIsa":
      return normalizeIsaBooleanSetting(value) as PensionSettings[K];
    case "showLisa":
      return normalizeLisaBooleanSetting(value) as PensionSettings[K];
    case "statePensionApplyFutureGrowth":
      return normalizeStatePensionBooleanSetting(value) as PensionSettings[K];
    case "nuvosApplyPensionIncreases":
      return normalizeNuvosBooleanSetting(value) as PensionSettings[K];
    case "projectionBasis":
      return normalizeInflationSetting(
        "projectionBasis",
        value as PensionSettings["projectionBasis"],
        normalizeNumericSetting
      ) as PensionSettings[K];
    case "inflationRateAnnual":
      return normalizeInflationSetting(
        "inflationRateAnnual",
        value as PensionSettings["inflationRateAnnual"],
        normalizeNumericSetting
      ) as PensionSettings[K];
    case "sippTaxReliefRate":
      return normalizeSippTaxReliefRate(value) as PensionSettings[K];
    case "alphaAddedPensionFactorType":
      return normalizeAddedPensionFactorType(value) as PensionSettings[K];
    case "classicCalculationMode":
    case "classicPlusCalculationMode":
      return normalizeClassicCalculationMode(value) as PensionSettings[K];
    case "classicFinalSalaryLink":
    case "classicPlusFinalSalaryLink":
      return normalizeClassicFinalSalaryLink(value) as PensionSettings[K];
    case "sippWithdrawalStrategy":
      return normalizeSippWithdrawalStrategy(value) as PensionSettings[K];
    case "csAvcWithdrawalStrategy":
      return normalizeCsAvcWithdrawalStrategy(value) as PensionSettings[K];
    case "isaWithdrawalStrategy":
      return normalizeIsaWithdrawalStrategy(value) as PensionSettings[K];
    case "lisaWithdrawalStrategy":
      return normalizeLisaWithdrawalStrategy(value) as PensionSettings[K];
    case "alphaEpaStartDate":
    case "alphaEpaEndDate":
    case "premiumValuationDate":
      return normalizeIsoDate(
        value as string,
        defaultSettings[key] as string
      ) as PensionSettings[K];
    case "premiumEarliestAccessAge":
      return normalizePremiumEarliestAccessAge(value) as PensionSettings[K];
    case "alphaPensionAbsDate":
    case "nuvosPensionAbsDate":
      return normalizeAlphaAbsYearValue(
        value as string,
        defaultSettings[key] as string
      ) as PensionSettings[K];
    case "alphaAddedPensionLumpSums":
      return normalizeAddedPensionLumpSums(value as AddedPensionLumpSum[], {
        includeFactorType: true,
      }) as PensionSettings[K];
    case "isaLumpSums":
    case "sippLumpSums":
    case "csAvcLumpSums":
    case "lisaLumpSums":
      return normalizeAddedPensionLumpSums(
        value as AddedPensionLumpSum[]
      ) as PensionSettings[K];
    case "additionalGuaranteedIncomes":
      return normalizeAdditionalGuaranteedIncomes(value) as PensionSettings[K];
    default:
      return normalizeNumericSetting(
        key as NumericSettingKey,
        value
      ) as PensionSettings[K];
  }
}

export function normalizeSettings(settings: PensionSettings): PensionSettings {
  const dateOfBirth = normalizeSetting("dateOfBirth", settings.dateOfBirth);
  const requirementAge = normalizeSetting(
    "requirementAge",
    settings.requirementAge
  );

  return {
    startDate: normalizeSetting("startDate", settings.startDate),
    dateOfBirth,
    lifeExpectancy: normalizeSetting("lifeExpectancy", settings.lifeExpectancy),
    requirementAge,
    normalPensionAge: calculateNormalPensionAge(dateOfBirth),
    showAlpha: settings.showAlpha !== false,
    projectionBasis: normalizeSetting(
      "projectionBasis",
      settings.projectionBasis
    ),
    inflationRateAnnual: normalizeSetting(
      "inflationRateAnnual",
      settings.inflationRateAnnual
    ),
    showClassic: normalizeClassicBooleanSetting(settings.showClassic),
    showClassicPlus: normalizeClassicBooleanSetting(settings.showClassicPlus),
    showNuvos: normalizeNuvosBooleanSetting(settings.showNuvos),
    showPremium: normalizePremiumBooleanSetting(settings.showPremium),
    showStatePension: normalizeStatePensionBooleanSetting(
      settings.showStatePension
    ),
    showSipp: Boolean(settings.showSipp),
    showCsAvc: Boolean(settings.showCsAvc),
    showIsa: Boolean(settings.showIsa),
    showLisa: Boolean(settings.showLisa),
    showAdditionalGuaranteedIncome:
      settings.showAdditionalGuaranteedIncome !== false,
    additionalGuaranteedIncomes: normalizeSetting(
      "additionalGuaranteedIncomes",
      settings.additionalGuaranteedIncomes
    ),
    taxationEnabled: normalizeTaxationBooleanSetting(settings.taxationEnabled),
    partialRetirementEnabled: Boolean(settings.partialRetirementEnabled),
    partialRetirementStartAge: normalizeSetting(
      "partialRetirementStartAge",
      settings.partialRetirementStartAge
    ),
    partialRetirementWorkPercent: normalizeSetting(
      "partialRetirementWorkPercent",
      settings.partialRetirementWorkPercent
    ),
    fullSalary: normalizeSetting("fullSalary", settings.fullSalary),
    currentStatePension: normalizeSetting(
      "currentStatePension",
      settings.currentStatePension
    ),
    desiredRetirementIncome: normalizeSetting(
      "desiredRetirementIncome",
      settings.desiredRetirementIncome
    ),
    statePensionDrawDate: normalizeStatePensionDrawDate(
      settings.statePensionDrawDate,
      dateOfBirth
    ),
    statePensionApplyFutureGrowth: normalizeStatePensionBooleanSetting(
      settings.statePensionApplyFutureGrowth
    ),
    statePensionCpiPercent: normalizeSetting(
      "statePensionCpiPercent",
      settings.statePensionCpiPercent
    ),
    statePensionWageGrowthPercent: normalizeSetting(
      "statePensionWageGrowthPercent",
      settings.statePensionWageGrowthPercent
    ),
    applyPensionIncreases: true,
    assumedCpiPercent: normalizeSetting(
      "assumedCpiPercent",
      settings.assumedCpiPercent
    ),
    alphaPensionAbsDate: normalizeSetting(
      "alphaPensionAbsDate",
      settings.alphaPensionAbsDate
    ),
    alphaAddedPensionMonthly: normalizeSetting(
      "alphaAddedPensionMonthly",
      settings.alphaAddedPensionMonthly
    ),
    alphaAddedPensionFactorType: normalizeSetting(
      "alphaAddedPensionFactorType",
      settings.alphaAddedPensionFactorType
    ),
    alphaPensionLeaveAge: normalizeSetting(
      "alphaPensionLeaveAge",
      settings.alphaPensionLeaveAge
    ),
    accruedPensionAtLastAbs: normalizeSetting(
      "accruedPensionAtLastAbs",
      settings.accruedPensionAtLastAbs
    ),
    pensionableEarnings: normalizeSetting(
      "pensionableEarnings",
      settings.pensionableEarnings
    ),
    alphaPayRisePercent: normalizeSetting(
      "alphaPayRisePercent",
      settings.alphaPayRisePercent
    ),
    alphaPensionDrawAge: normalizeAlphaPensionDrawAge(
      settings.alphaPensionDrawAge,
      dateOfBirth
    ),
    alphaEpaEnabled: Boolean(settings.alphaEpaEnabled),
    alphaEpaYearsBeforeNpa: normalizeSetting(
      "alphaEpaYearsBeforeNpa",
      settings.alphaEpaYearsBeforeNpa
    ),
    alphaEpaStartDate: normalizeSetting(
      "alphaEpaStartDate",
      settings.alphaEpaStartDate
    ),
    alphaEpaEndDate: normalizeSetting(
      "alphaEpaEndDate",
      settings.alphaEpaEndDate
    ),
    alphaAddedPensionLumpSums: normalizeSetting(
      "alphaAddedPensionLumpSums",
      settings.alphaAddedPensionLumpSums
    ),
    classicCalculationMode: normalizeSetting(
      "classicCalculationMode",
      settings.classicCalculationMode
    ),
    classicFinalSalaryLink: normalizeSetting(
      "classicFinalSalaryLink",
      settings.classicFinalSalaryLink
    ),
    classicCurrentFinalPensionableEarnings: normalizeSetting(
      "classicCurrentFinalPensionableEarnings",
      settings.classicCurrentFinalPensionableEarnings
    ),
    classicPreservedFinalPensionableEarnings: normalizeSetting(
      "classicPreservedFinalPensionableEarnings",
      settings.classicPreservedFinalPensionableEarnings
    ),
    classicReckonableServiceYears: normalizeSetting(
      "classicReckonableServiceYears",
      settings.classicReckonableServiceYears
    ),
    classicAnnualPension: normalizeSetting(
      "classicAnnualPension",
      settings.classicAnnualPension
    ),
    classicAutomaticLumpSum: normalizeSetting(
      "classicAutomaticLumpSum",
      settings.classicAutomaticLumpSum
    ),
    classicPensionDrawAge: normalizeSetting(
      "classicPensionDrawAge",
      settings.classicPensionDrawAge
    ),
    classicApplyPensionIncreases: normalizeClassicBooleanSetting(
      settings.classicApplyPensionIncreases
    ),
    classicPlusCalculationMode: normalizeSetting(
      "classicPlusCalculationMode",
      settings.classicPlusCalculationMode
    ),
    classicPlusFinalSalaryLink: normalizeSetting(
      "classicPlusFinalSalaryLink",
      settings.classicPlusFinalSalaryLink
    ),
    classicPlusCurrentFinalPensionableEarnings: normalizeSetting(
      "classicPlusCurrentFinalPensionableEarnings",
      settings.classicPlusCurrentFinalPensionableEarnings
    ),
    classicPlusPreservedFinalPensionableEarnings: normalizeSetting(
      "classicPlusPreservedFinalPensionableEarnings",
      settings.classicPlusPreservedFinalPensionableEarnings
    ),
    classicPlusPre2002ServiceYears: normalizeSetting(
      "classicPlusPre2002ServiceYears",
      settings.classicPlusPre2002ServiceYears
    ),
    classicPlusPost2002ServiceYears: normalizeSetting(
      "classicPlusPost2002ServiceYears",
      settings.classicPlusPost2002ServiceYears
    ),
    classicPlusAnnualPension: normalizeSetting(
      "classicPlusAnnualPension",
      settings.classicPlusAnnualPension
    ),
    classicPlusAutomaticLumpSum: normalizeSetting(
      "classicPlusAutomaticLumpSum",
      settings.classicPlusAutomaticLumpSum
    ),
    classicPlusPensionDrawAge: normalizeSetting(
      "classicPlusPensionDrawAge",
      settings.classicPlusPensionDrawAge
    ),
    classicPlusApplyPensionIncreases: normalizeClassicBooleanSetting(
      settings.classicPlusApplyPensionIncreases
    ),
    nuvosPensionAbsDate: normalizeSetting(
      "nuvosPensionAbsDate",
      settings.nuvosPensionAbsDate
    ),
    nuvosAccruedPensionAtLastAbs: normalizeSetting(
      "nuvosAccruedPensionAtLastAbs",
      settings.nuvosAccruedPensionAtLastAbs
    ),
    nuvosPensionableEarnings: normalizeSetting(
      "nuvosPensionableEarnings",
      settings.nuvosPensionableEarnings
    ),
    nuvosPensionLeaveAge: normalizeSetting(
      "nuvosPensionLeaveAge",
      settings.nuvosPensionLeaveAge
    ),
    nuvosPensionDrawAge: normalizeSetting(
      "nuvosPensionDrawAge",
      settings.nuvosPensionDrawAge
    ),
    nuvosApplyPensionIncreases: normalizeNuvosBooleanSetting(
      settings.nuvosApplyPensionIncreases
    ),
    nuvosAssumedCpiPercent: normalizeSetting(
      "nuvosAssumedCpiPercent",
      settings.nuvosAssumedCpiPercent
    ),
    premiumAnnualPensionAtValuationDate: normalizeSetting(
      "premiumAnnualPensionAtValuationDate",
      settings.premiumAnnualPensionAtValuationDate
    ),
    premiumValuationDate: normalizeSetting(
      "premiumValuationDate",
      settings.premiumValuationDate
    ),
    premiumNormalPensionAge: normalizeSetting(
      "premiumNormalPensionAge",
      settings.premiumHasNpa65 ? settings.premiumNormalPensionAge : 60
    ),
    premiumDrawAge: normalizeSetting("premiumDrawAge", settings.premiumDrawAge),
    premiumEarliestAccessAge: normalizePremiumEarliestAccessAge(
      settings.premiumEarliestAccessAge
    ),
    premiumHasNpa65: normalizePremiumBooleanSetting(settings.premiumHasNpa65),
    sippCurrentPot: normalizeSetting("sippCurrentPot", settings.sippCurrentPot),
    sippMonthlyContribution: normalizeSetting(
      "sippMonthlyContribution",
      settings.sippMonthlyContribution
    ),
    sippHasProtectedPensionAge: normalizeSippBooleanSetting(
      settings.sippHasProtectedPensionAge
    ),
    sippProtectedPensionAge: normalizeSetting(
      "sippProtectedPensionAge",
      settings.sippProtectedPensionAge
    ),
    sippDrawAge: normalizeSippDrawAge(settings.sippDrawAge, dateOfBirth),
    sippLumpSums: normalizeSetting("sippLumpSums", settings.sippLumpSums),
    sippRealInterestPercent: normalizeSetting(
      "sippRealInterestPercent",
      settings.sippRealInterestPercent
    ),
    sippTaxReliefRate: normalizeSetting(
      "sippTaxReliefRate",
      settings.sippTaxReliefRate
    ),
    sippWithdrawalStrategy: normalizeSetting(
      "sippWithdrawalStrategy",
      settings.sippWithdrawalStrategy
    ),
    sippWithdrawalPercent: normalizeSetting(
      "sippWithdrawalPercent",
      settings.sippWithdrawalPercent
    ),
    sippWithdrawalTargetAge: normalizeSetting(
      "sippWithdrawalTargetAge",
      settings.sippWithdrawalTargetAge
    ),
    csAvcCurrentPot: normalizeSetting(
      "csAvcCurrentPot",
      settings.csAvcCurrentPot
    ),
    csAvcMonthlyContribution: normalizeSetting(
      "csAvcMonthlyContribution",
      settings.csAvcMonthlyContribution
    ),
    csAvcHasProtectedPensionAge: normalizeCsAvcBooleanSetting(
      settings.csAvcHasProtectedPensionAge
    ),
    csAvcProtectedPensionAge: normalizeSetting(
      "csAvcProtectedPensionAge",
      settings.csAvcProtectedPensionAge
    ),
    csAvcDrawAge: normalizeSippDrawAge(settings.csAvcDrawAge, dateOfBirth),
    csAvcLumpSums: normalizeSetting("csAvcLumpSums", settings.csAvcLumpSums),
    csAvcRealInterestPercent: normalizeSetting(
      "csAvcRealInterestPercent",
      settings.csAvcRealInterestPercent
    ),
    csAvcWithdrawalStrategy: normalizeSetting(
      "csAvcWithdrawalStrategy",
      settings.csAvcWithdrawalStrategy
    ),
    csAvcWithdrawalPercent: normalizeSetting(
      "csAvcWithdrawalPercent",
      settings.csAvcWithdrawalPercent
    ),
    csAvcWithdrawalTargetAge: normalizeSetting(
      "csAvcWithdrawalTargetAge",
      settings.csAvcWithdrawalTargetAge
    ),
    isaCurrentPot: normalizeSetting("isaCurrentPot", settings.isaCurrentPot),
    isaMonthlyContribution: normalizeSetting(
      "isaMonthlyContribution",
      settings.isaMonthlyContribution
    ),
    isaDrawAge: normalizeSetting("isaDrawAge", settings.isaDrawAge),
    isaLumpSums: normalizeSetting("isaLumpSums", settings.isaLumpSums),
    isaRealInterestPercent: normalizeSetting(
      "isaRealInterestPercent",
      settings.isaRealInterestPercent
    ),
    isaWithdrawalStrategy: normalizeSetting(
      "isaWithdrawalStrategy",
      settings.isaWithdrawalStrategy
    ),
    isaWithdrawalPercent: normalizeSetting(
      "isaWithdrawalPercent",
      settings.isaWithdrawalPercent
    ),
    isaWithdrawalTargetAge: normalizeSetting(
      "isaWithdrawalTargetAge",
      settings.isaWithdrawalTargetAge
    ),
    lisaCurrentPot: normalizeSetting("lisaCurrentPot", settings.lisaCurrentPot),
    lisaMonthlyContribution: normalizeSetting(
      "lisaMonthlyContribution",
      settings.lisaMonthlyContribution
    ),
    lisaDrawAge: normalizeSetting("lisaDrawAge", settings.lisaDrawAge),
    lisaLumpSums: normalizeSetting("lisaLumpSums", settings.lisaLumpSums),
    lisaRealInterestPercent: normalizeSetting(
      "lisaRealInterestPercent",
      settings.lisaRealInterestPercent
    ),
    lisaWithdrawalStrategy: normalizeSetting(
      "lisaWithdrawalStrategy",
      settings.lisaWithdrawalStrategy
    ),
    lisaWithdrawalPercent: normalizeSetting(
      "lisaWithdrawalPercent",
      settings.lisaWithdrawalPercent
    ),
    lisaWithdrawalTargetAge: normalizeSetting(
      "lisaWithdrawalTargetAge",
      settings.lisaWithdrawalTargetAge
    ),
    taxPersonalAllowance: normalizeSetting(
      "taxPersonalAllowance",
      settings.taxPersonalAllowance
    ),
    taxPersonalAllowanceTaperThreshold: normalizeSetting(
      "taxPersonalAllowanceTaperThreshold",
      settings.taxPersonalAllowanceTaperThreshold
    ),
    taxBasicRateLimit: normalizeSetting(
      "taxBasicRateLimit",
      settings.taxBasicRateLimit
    ),
    taxAdditionalRateThreshold: normalizeSetting(
      "taxAdditionalRateThreshold",
      settings.taxAdditionalRateThreshold
    ),
    taxBasicRatePercent: normalizeSetting(
      "taxBasicRatePercent",
      settings.taxBasicRatePercent
    ),
    taxHigherRatePercent: normalizeSetting(
      "taxHigherRatePercent",
      settings.taxHigherRatePercent
    ),
    taxAdditionalRatePercent: normalizeSetting(
      "taxAdditionalRatePercent",
      settings.taxAdditionalRatePercent
    ),
    taxSippTaxFreeWithdrawalPercent: normalizeSetting(
      "taxSippTaxFreeWithdrawalPercent",
      settings.taxSippTaxFreeWithdrawalPercent
    ),
    taxCsAvcTaxFreeWithdrawalPercent: normalizeSetting(
      "taxCsAvcTaxFreeWithdrawalPercent",
      settings.taxCsAvcTaxFreeWithdrawalPercent
    ),
  };
}

export {
  normalizeAlphaPensionDrawAge,
  normalizeSippDrawAge,
  normalizeStatePensionDrawDate,
  normalizeStatePensionDrawAge,
  normalizeSippTaxReliefRate,
  normalizeSippWithdrawalStrategy,
  normalizeIsaWithdrawalStrategy,
};
