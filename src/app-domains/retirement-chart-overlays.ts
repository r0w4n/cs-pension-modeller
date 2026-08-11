export const RETIREMENT_CHART_OVERLAY_META = {
  estimatedIncomeTax: {
    label: "Estimated Income Tax",
  },
  shortfall: {
    label: "Shortfall",
  },
} as const;

export function calculateRetirementChartOverlays(input: {
  grossIncomeAnnual: number;
  takeHomeIncomeAnnual: number;
  assessedIncomeAnnual: number;
  targetIncomeAnnual: number;
}) {
  return {
    estimatedIncomeTaxAnnual: Math.max(
      0,
      input.grossIncomeAnnual - input.takeHomeIncomeAnnual
    ),
    shortfallAnnual: Math.max(
      0,
      input.targetIncomeAnnual - input.assessedIncomeAnnual
    ),
  };
}
