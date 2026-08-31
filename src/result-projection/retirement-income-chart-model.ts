export type RetirementIncomePoint = {
  date: string;
  age: number;
  /** Optional presentation coordinate for non-age timelines such as households. */
  timelineValue?: number;
  targetIncomeAnnual: number;
  isaIncomeAnnual: number;
  lisaIncomeAnnual: number;
  sippIncomeAnnual: number;
  csAvcIncomeAnnual: number;
  alphaIncomeAnnual: number;
  classicIncomeAnnual: number;
  classicPlusIncomeAnnual: number;
  nuvosIncomeAnnual: number;
  premiumIncomeAnnual: number;
  additionalGuaranteedIncomeAnnual: number;
  additionalGuaranteedIncomeStreams?: RetirementIncomeAdditionalIncomePoint[];
  partialRetirementIncomeAnnual: number;
  statePensionIncomeAnnual: number;
  totalIncomeAnnual: number;
  takeHomeIncomeAnnual?: number;
  /** Canonical estimated Income Tax for derived household points. */
  estimatedIncomeTaxAnnual?: number;
  assessedIncomeAnnual: number;
  shortfallAnnual: number;
  guaranteedNetIncomeAnnual: number;
  unavoidableSurplusAnnual: number;
  avoidableFlexibleSurplusAnnual: number;
  flexibleWithdrawalInsights: RetirementIncomeFlexibleWithdrawalInsight[];
  isaBalance?: number;
  lisaBalance?: number;
  sippBalance?: number;
  csAvcBalance?: number;
  /** Owner-attributed sources used by the household chart projection. */
  incomeSeries?: RetirementIncomeChartSeriesValue[];
};

export type RetirementIncomeChartSeriesValue = {
  key: string;
  annualAmount: number;
};

export type RetirementIncomeChartSeriesDefinition = {
  key: string;
  label: string;
  colour: string;
  owner?: "you" | "partner";
  sourceType?: string;
};

export type RetirementIncomeChartEvent = {
  key: string;
  label: string;
  date: string;
  timelineValue: number;
  owner?: "you" | "partner";
};

/** Read-only milestone marker supplied by a derived chart such as Combined. */
export type RetirementIncomeChartStaticMilestone = {
  key: string;
  label: string;
  shortLabel: string;
  timelineValue: number;
  colour: string;
};

/**
 * An owner-aware strategy control projected onto a derived chart timeline.
 * The limit is expressed in the same timeline units as `timelineValue` so the
 * shared chart can reuse its existing marker drag behaviour.
 */
export type RetirementIncomeChartEditableMilestone =
  RetirementIncomeChartStaticMilestone & {
    limit: ChartNumberLimit;
    owner: "you" | "partner";
    sourceType: string;
  };

export type RetirementIncomeFlexibleWithdrawalInsight = {
  accountId: string;
  label: string;
  reducibleGrossAnnual: number;
  avoidableNetAnnual: number;
};

export type RetirementIncomeAdditionalIncomePoint = {
  id: string;
  label: string;
  annualAmount: number;
};

export type RetirementIncomeChartParameters = {
  targetIncomeAnnual: number;
  spendingSmileEnabled: boolean;
  goGoPercentage: number;
  slowGoStartAge: number;
  slowGoPercentage: number;
  noGoStartAge: number;
  noGoPercentage: number;
  alphaMonthlyAddedPension: number;
  isaMonthlyContribution: number;
  lisaMonthlyContribution: number;
  sippMonthlyContribution: number;
  retirementAge: number;
  alphaLeaveAge: number;
  sippAccessAge: number;
  sippUseByAge: number;
  isaAccessAge: number;
  lisaAccessAge: number;
  alphaStartAge: number;
  nuvosStartAge: number;
  premiumStartAge: number;
  isaUseByAge: number;
  lisaUseByAge: number;
  partialRetirementStartAge: number;
  partialRetirementWorkPercent: number;
  partialRetirementEnabled: boolean;
  statePensionAge: number;
  showAlpha: boolean;
  showClassic: boolean;
  showClassicPlus: boolean;
  showCsAvc: boolean;
  showIsa: boolean;
  showLisa: boolean;
  showSipp: boolean;
  sippUseByAgeEnabled: boolean;
  showNuvos: boolean;
  showPremium: boolean;
  isaUseByAgeEnabled: boolean;
  lisaUseByAgeEnabled: boolean;
  showStatePension: boolean;
};

export type ChartNumberLimit = {
  min: number;
  max: number;
  step: number;
};

export type RetirementIncomeChartLimits = {
  targetIncomeAnnual: ChartNumberLimit;
  alphaMonthlyAddedPension: ChartNumberLimit;
  isaMonthlyContribution: ChartNumberLimit;
  lisaMonthlyContribution: ChartNumberLimit;
  sippMonthlyContribution: ChartNumberLimit;
  retirementAge: ChartNumberLimit;
  slowGoStartAge: ChartNumberLimit;
  noGoStartAge: ChartNumberLimit;
  alphaLeaveAge: ChartNumberLimit;
  sippAccessAge: ChartNumberLimit;
  sippUseByAge: ChartNumberLimit;
  isaAccessAge: ChartNumberLimit;
  lisaAccessAge: ChartNumberLimit;
  alphaStartAge: ChartNumberLimit;
  nuvosStartAge: ChartNumberLimit;
  premiumStartAge: ChartNumberLimit;
  isaUseByAge: ChartNumberLimit;
  lisaUseByAge: ChartNumberLimit;
  partialRetirementStartAge: ChartNumberLimit;
  partialRetirementWorkPercent: ChartNumberLimit;
  statePensionAge: ChartNumberLimit;
};

export type RetirementIncomeMilestoneKey =
  | "retirementAge"
  | "slowGoStartAge"
  | "noGoStartAge"
  | "alphaLeaveAge"
  | "sippAccessAge"
  | "sippUseByAge"
  | "isaAccessAge"
  | "lisaAccessAge"
  | "alphaStartAge"
  | "nuvosStartAge"
  | "premiumStartAge"
  | "isaUseByAge"
  | "lisaUseByAge"
  | "partialRetirementStartAge"
  | "statePensionAge";

export type RetirementIncomeMilestone = {
  key: RetirementIncomeMilestoneKey;
  label: string;
  shortLabel: string;
  age: number;
  colour: string;
  editable: boolean;
};

export type VisibleRetirementIncomeMilestone = RetirementIncomeMilestone & {
  plotAge: number;
  layoutAge: number;
};
