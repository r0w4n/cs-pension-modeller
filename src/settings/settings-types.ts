export const SETTINGS_STORAGE_KEY = "cs-pension-modeller.settings";
export const LOCAL_STORAGE_ENABLED_KEY =
  "cs-pension-modeller.localStorageEnabled";
export const FIRST_UNSUPPORTED_ADDED_PENSION_PURCHASE_AGE = 68;
export const MAX_ADDED_PENSION_PURCHASE_INPUT_AGE = 67.9;
export const NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE = "2028-04-06";
export const STATE_PENSION_AGE_STEP = 0.25;

export const DEFAULT_DATE_OF_BIRTH = "1987-06-01";
export const DEFAULT_STATE_PENSION_DRAW_DATE = "2055-06-01";
export const DEFAULT_ALPHA_ABS_YEAR = "2025";
export const DEFAULT_NUVOS_ABS_YEAR = "2025";

export type AddedPensionLumpSumCadence = "once" | "yearly";
export type AddedPensionFactorType = "self" | "self_plus_beneficiaries";

export type AddedPensionLumpSum = {
  id: string;
  amount: number;
  startDate: string;
  cadence: AddedPensionLumpSumCadence;
  endDate: string;
  factorType?: AddedPensionFactorType;
};

export type SippWithdrawalStrategy =
  | "zero_at_death"
  | "percentage"
  | "use_by_age";
export type IsaWithdrawalStrategy =
  | "zero_at_death"
  | "percentage"
  | "use_by_age";
export type SippTaxReliefRate = "none" | "20" | "40";
export type ProjectionBasis = "real" | "nominal";

export type PensionSettings = {
  startDate: string;
  dateOfBirth: string;
  lifeExpectancy: number;
  requirementAge: number;
  normalPensionAge: number;
  showAlpha: boolean;
  projectionBasis: ProjectionBasis;
  inflationRateAnnual: number;
  showNuvos: boolean;
  showStatePension: boolean;
  showSipp: boolean;
  showIsa: boolean;
  taxationEnabled: boolean;
  partialRetirementEnabled: boolean;
  partialRetirementStartAge: number;
  partialRetirementWorkPercent: number;
  fullSalary: number;
  currentStatePension: number;
  desiredRetirementIncome: number;
  statePensionDrawDate: string;
  statePensionApplyFutureGrowth: boolean;
  statePensionCpiPercent: number;
  statePensionWageGrowthPercent: number;
  applyPensionIncreases: boolean;
  assumedCpiPercent: number;
  alphaPensionAbsDate: string;
  alphaAddedPensionMonthly: number;
  alphaAddedPensionFactorType: AddedPensionFactorType;
  alphaPensionLeaveAge: number;
  accruedPensionAtLastAbs: number;
  pensionableEarnings: number;
  alphaPayRisePercent: number;
  alphaPensionDrawAge: number;
  alphaEpaEnabled: boolean;
  alphaEpaYearsBeforeNpa: number;
  alphaEpaStartDate: string;
  alphaEpaEndDate: string;
  alphaAddedPensionLumpSums: AddedPensionLumpSum[];
  nuvosPensionAbsDate: string;
  nuvosAccruedPensionAtLastAbs: number;
  nuvosPensionableEarnings: number;
  nuvosPensionLeaveAge: number;
  nuvosPensionDrawAge: number;
  nuvosApplyPensionIncreases: boolean;
  nuvosAssumedCpiPercent: number;
  sippCurrentPot: number;
  sippMonthlyContribution: number;
  sippDrawAge: number;
  sippLumpSums: AddedPensionLumpSum[];
  sippRealInterestPercent: number;
  sippTaxReliefRate: SippTaxReliefRate;
  sippWithdrawalStrategy: SippWithdrawalStrategy;
  sippWithdrawalPercent: number;
  sippWithdrawalTargetAge: number;
  isaCurrentPot: number;
  isaMonthlyContribution: number;
  isaDrawAge: number;
  isaLumpSums: AddedPensionLumpSum[];
  isaRealInterestPercent: number;
  isaWithdrawalStrategy: IsaWithdrawalStrategy;
  isaWithdrawalPercent: number;
  isaWithdrawalTargetAge: number;
  taxPersonalAllowance: number;
  taxPersonalAllowanceTaperThreshold: number;
  taxBasicRateLimit: number;
  taxAdditionalRateThreshold: number;
  taxBasicRatePercent: number;
  taxHigherRatePercent: number;
  taxAdditionalRatePercent: number;
  taxSippTaxFreeWithdrawalPercent: number;
};

export type PensionValidationIssue = {
  field: keyof PensionSettings;
  message: string;
  itemId?: string;
};

export type StoredPensionSettings = Omit<
  PensionSettings,
  "startDate" | "normalPensionAge"
>;
