import type { PensionSettings } from "../../settings";

export type WithdrawalOrder = "isa-first" | "sipp-first" | "blended";
export type OptimiserWithdrawalStrategy =
  PensionSettings["isaWithdrawalStrategy"];

export type OptimisationTarget = {
  targetAnnualIncome: number;
  targetRetirementAge: number;
  incomeStartAge: number;
  incomeEndAge: number;
  incomeBasis: "gross" | "net";
};

export type NumericSearchRange = {
  min: number;
  max: number;
  step: number;
};

export type OptimisationSearchSpace = {
  maxTotalMonthlyContribution?: number;
  monthlySippContribution: NumericSearchRange;
  monthlyIsaContribution: NumericSearchRange;
  monthlyAddedPensionContribution?: NumericSearchRange;
  retirementAge: NumericSearchRange;
  alphaDrawAge: NumericSearchRange;
  partialRetirementStartAge?: NumericSearchRange;
  partialRetirementWorkPercent?: NumericSearchRange;
  withdrawalOrders: WithdrawalOrder[];
  withdrawalStrategies: OptimiserWithdrawalStrategy[];
};

export type CandidateStrategy = {
  id: string;
  monthlySippContribution: number;
  monthlyIsaContribution: number;
  monthlyAddedPensionContribution: number;
  retirementAge: number;
  alphaDrawAge: number;
  nuvosDrawAge: number | null;
  statePensionAge: number | null;
  withdrawalOrder: WithdrawalOrder;
  withdrawalStrategy: OptimiserWithdrawalStrategy;
  partialRetirementEnabled: boolean;
  partialRetirementStartAge: number | null;
  partialRetirementWorkPercent: number | null;
};

export type StrategyRankingMode =
  | "lowest-contribution"
  | "earliest-retirement"
  | "lowest-complexity";

export type StrategyScoreBreakdown = {
  contributionScore: number;
  retirementAgeScore: number;
  complexityScore: number;
  surplusScore: number;
};

export type EvaluatedStrategy = CandidateStrategy & {
  viable: boolean;
  totalMonthlyContribution: number;
  alphaTakenEarly: boolean;
  annualAlphaPensionAfterReduction: number;
  bridgeYearsBeforeAlphaStarts: number;
  lowestProjectedBridgeBalance: number;
  firstFailureAge: number | null;
  firstFailureDate: string | null;
  failureReason: string | null;
  projectedSurplusOrShortfall: number;
  rankingScore: number;
  scoreBreakdown: StrategyScoreBreakdown;
  explanation: string;
};

export type OptimisationResult = {
  target: OptimisationTarget;
  rankingMode: StrategyRankingMode;
  strategies: EvaluatedStrategy[];
  nearMisses: EvaluatedStrategy[];
  evaluatedCandidateCount: number;
  generatedCandidateCount: number;
  searchSpaceWarning: string | null;
  caps: {
    maxCandidatesEvaluated: number;
    maxReturnedStrategies: number;
  };
};

export type OptimiserInput = {
  settings: PensionSettings;
  target: OptimisationTarget;
  searchSpace: OptimisationSearchSpace;
  rankingMode: StrategyRankingMode;
  maxCandidatesEvaluated?: number;
  maxReturnedStrategies?: number;
};
