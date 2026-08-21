import {
  calculateRetirementIncomeTargetAtDate,
  deriveInflationAssumptions,
  type ProjectionRow,
  type RetirementIncomeDisplay,
} from "../projection";
import {
  type FlexibleWithdrawalStrategy,
  type PensionSettings,
} from "../settings";
import type { ComparisonResult } from "../result-projection/comparison-result";
import {
  calculateSmilePhaseTarget,
  type SmilePercentageField,
} from "../spending-smile";
import {
  formatAge,
  formatCurrencyDetailed,
  formatDate,
  formatDecimalAge,
  formatPercent,
} from "../result-projection/formatting";

export type ComparisonCellValue =
  | string
  | number
  | {
      value: string | number;
      tone: "good" | "caution" | "problem";
    };

export type ComparisonTableRow = {
  key: string;
  section: string;
  metric: string;
  values: ComparisonCellValue[];
  sectionStart: boolean;
  isSectionDivider?: boolean;
};

export type ComparisonInsights = {
  earliestRetirementResult: ComparisonResult | null;
  bestTargetResult: ComparisonResult | null;
  lowestShortfallRiskResult: ComparisonResult | null;
  longestCapitalResult: ComparisonResult | null;
  highestLaterIncomeResult: ComparisonResult | null;
};

type SummaryItemLike = {
  label: string;
  value: string;
};

export function calculateComparisonInsights(
  results: ComparisonResult[]
): ComparisonInsights {
  const earliestRetirementResult = results.reduce<ComparisonResult | null>(
    (best, result) =>
      !best ||
      result.scenario.settings.requirementAge <
        best.scenario.settings.requirementAge
        ? result
        : best,
    null
  );
  const bestTargetResult = results.reduce<ComparisonResult | null>(
    (best, result) =>
      !best ||
      result.assessment.targetMissMonths < best.assessment.targetMissMonths
        ? result
        : best,
    null
  );
  const lowestShortfallRiskResult = results.reduce<ComparisonResult | null>(
    (best, result) => {
      if (!best) {
        return result;
      }

      const bestShortfall = best.assessment.largestAnnualShortfall;
      const resultShortfall = result.assessment.largestAnnualShortfall;

      return resultShortfall < bestShortfall ? result : best;
    },
    null
  );
  const longestCapitalResult = results.reduce<ComparisonResult | null>(
    (best, result) => {
      if (!best) {
        return result;
      }

      return getCapitalPreservationScore(result) >
        getCapitalPreservationScore(best)
        ? result
        : best;
    },
    null
  );
  const highestLaterIncomeResult = results.reduce<ComparisonResult | null>(
    (best, result) =>
      !best ||
      result.lifeExpectancyAnnualIncome > best.lifeExpectancyAnnualIncome
        ? result
        : best,
    null
  );

  return {
    earliestRetirementResult,
    bestTargetResult,
    lowestShortfallRiskResult,
    longestCapitalResult,
    highestLaterIncomeResult,
  };
}

export function buildComparisonTableRows(
  results: ComparisonResult[],
  options: {
    retirementIncomeDisplay?: RetirementIncomeDisplay;
    hideBridgeFundingSection?: boolean;
    hideFlexibleAssetsSection?: boolean;
  } = {}
): ComparisonTableRow[] {
  const {
    retirementIncomeDisplay = "annual",
    hideBridgeFundingSection = false,
    hideFlexibleAssetsSection = false,
  } = options;
  const anyScenarioUsesNuvos = results.some(
    (result) => result.scenario.settings.showNuvos
  );
  const anyScenarioUsesPremium = results.some(
    (result) => result.scenario.settings.showPremium
  );
  const nuvosTimingRows: Array<
    [
      metric: string,
      getValue: (result: ComparisonResult) => ComparisonCellValue,
    ]
  > = anyScenarioUsesNuvos
    ? [
        [
          "nuvos start",
          (result) =>
            result.scenario.settings.showNuvos
              ? formatDecimalAge(result.scenario.settings.nuvosPensionDrawAge)
              : "n/a",
        ],
      ]
    : [];
  const nuvosIncomeRows: Array<
    [
      metric: string,
      getValue: (result: ComparisonResult) => ComparisonCellValue,
    ]
  > = anyScenarioUsesNuvos
    ? [
        [
          "nuvos income",
          (result) =>
            result.scenario.settings.showNuvos
              ? formatRecurringAnnualCurrency(
                  result.summary.nuvosPension.annualAtDraw,
                  retirementIncomeDisplay
                )
              : "n/a",
        ],
      ]
    : [];
  const premiumTimingRows: Array<
    [
      metric: string,
      getValue: (result: ComparisonResult) => ComparisonCellValue,
    ]
  > = anyScenarioUsesPremium
    ? [
        [
          "Premium start",
          (result) =>
            result.scenario.settings.showPremium
              ? formatDecimalAge(result.scenario.settings.premiumDrawAge)
              : "n/a",
        ],
      ]
    : [];
  const premiumIncomeRows: Array<
    [
      metric: string,
      getValue: (result: ComparisonResult) => ComparisonCellValue,
    ]
  > = anyScenarioUsesPremium
    ? [
        [
          "Premium income",
          (result) =>
            result.scenario.settings.showPremium
              ? formatRecurringAnnualCurrency(
                  result.summary.premiumPension.annualAtDraw,
                  retirementIncomeDisplay
                )
              : "n/a",
        ],
      ]
    : [];

  return [
    createComparisonSection("Headline outcome", results, [
      ["Status", (result) => renderComparisonStatusCell(result)],
      [
        "Pathway",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? "Partial retirement"
            : "Full retirement",
      ],
      [
        "Target income",
        (result) =>
          formatRecurringAnnualCurrency(
            result.annualTarget,
            retirementIncomeDisplay
          ),
      ],
      [
        "Lowest income",
        (result) =>
          formatRecurringAnnualCurrency(
            result.assessment.lowestAnnualIncome,
            retirementIncomeDisplay
          ),
      ],
      [
        "Years below target",
        (result) =>
          renderComparisonToneCell(
            formatYearsBelowTarget(result.assessment.targetMissMonths),
            result.assessment.targetMissMonths > 0 ? "caution" : "good"
          ),
      ],
      [
        "Largest shortfall",
        (result) =>
          renderComparisonToneCell(
            formatRecurringAnnualCurrency(
              result.assessment.largestAnnualShortfall,
              retirementIncomeDisplay
            ),
            result.assessment.largestAnnualShortfall > 0 ? "caution" : "good"
          ),
      ],
      [
        "Lifetime shortfall",
        (result) =>
          renderComparisonToneCell(
            formatCurrencyDetailed(result.assessment.totalLifetimeShortfall),
            result.assessment.totalLifetimeShortfall > 0 ? "caution" : "good"
          ),
      ],
    ]),
    ...createSpendingTargetComparisonRows(results, retirementIncomeDisplay),
    createComparisonSection("Retirement timing", results, [
      [
        "Target retirement age",
        (result) => formatDecimalAge(result.scenario.settings.requirementAge),
      ],
      [
        "Alpha age",
        (result) =>
          formatDecimalAge(result.scenario.settings.alphaPensionDrawAge),
      ],
      ...nuvosTimingRows,
      ...premiumTimingRows,
      [
        "ISA start",
        (result) =>
          result.scenario.settings.showIsa
            ? formatDecimalAge(result.scenario.settings.isaDrawAge)
            : "n/a",
      ],
      [
        "LISA start",
        (result) =>
          result.scenario.settings.showLisa
            ? formatDecimalAge(result.scenario.settings.lisaDrawAge)
            : "n/a",
      ],
      [
        "SIPP start",
        (result) =>
          result.scenario.settings.showSipp
            ? formatDecimalAge(result.scenario.settings.sippDrawAge)
            : "n/a",
      ],
      [
        "State Pension age",
        (result) =>
          result.scenario.settings.showStatePension
            ? formatDecimalAge(result.summary.calculated.statePensionAge)
            : "n/a",
      ],
    ]),
    createComparisonSection("Secure pension income", results, [
      [
        "Alpha income",
        (result) =>
          formatRecurringAnnualCurrency(
            result.summary.alphaPension.annualAtDraw,
            retirementIncomeDisplay
          ),
      ],
      ...nuvosIncomeRows,
      ...premiumIncomeRows,
      [
        "State Pension income",
        (result) =>
          result.scenario.settings.showStatePension
            ? formatRecurringAnnualCurrency(
                result.summary.incomeOverTime.monthlyStatePension * 12,
                retirementIncomeDisplay
              )
            : "n/a",
      ],
      [
        "Total secure income",
        (result) =>
          result.scenario.settings.showStatePension
            ? formatRecurringAnnualCurrency(
                getCombinedSecurePensionAtStateAge(result),
                retirementIncomeDisplay
              )
            : formatRecurringAnnualCurrency(
                result.summary.alphaPension.annualAtDraw +
                  (result.scenario.settings.showNuvos
                    ? result.summary.nuvosPension.annualAtDraw
                    : 0) +
                  (result.scenario.settings.showPremium
                    ? result.summary.premiumPension.annualAtDraw
                    : 0),
                retirementIncomeDisplay
              ),
      ],
      [
        "Secure income coverage",
        (result) =>
          result.scenario.settings.showStatePension
            ? formatWholePercent(
                getCombinedSecurePensionAtStateAge(result) /
                  calculateRetirementIncomeTargetAtDate(
                    result.scenario.settings,
                    result.scenario.settings.statePensionDrawDate
                  )
              )
            : "n/a",
      ],
    ]),
    ...(!hideBridgeFundingSection
      ? [
          createComparisonSection("Bridge funding", results, [
            [
              "Plan status",
              (result) =>
                result.assessment.meetsTargetThroughout
                  ? "Meets target with configured withdrawals"
                  : "Shortfall with configured withdrawals",
            ],
            [
              "ISA-only gap before SIPP access",
              (result) =>
                formatCurrencyDetailed(
                  result.bridgeFundingEstimate.requiredIsaAtRetirement
                ),
            ],
            [
              "Later top-up gap after SIPP access",
              (result) =>
                formatCurrencyDetailed(
                  result.bridgeFundingEstimate.requiredSippAtAccess
                ),
            ],
            [
              "Projected lifetime shortfall",
              (result) =>
                renderComparisonToneCell(
                  formatCurrencyDetailed(
                    result.assessment.totalLifetimeShortfall
                  ),
                  result.assessment.totalLifetimeShortfall > 0
                    ? "caution"
                    : "good"
                ),
            ],
            [
              "Illustrative extra saving for bridge",
              (result) =>
                formatRecurringMonthlyCurrency(
                  result.bridgeFundingEstimate
                    .additionalMonthlyContributionRequired,
                  retirementIncomeDisplay
                ),
            ],
          ]),
        ]
      : []),
    ...(!hideFlexibleAssetsSection
      ? [
          createComparisonSection("Flexible assets", results, [
            [
              "Assets exhausted",
              (result) => renderFlexibleAssetsExhaustedCell(result),
            ],
          ]),
        ]
      : []),
    createComparisonSection("Assumptions", results, [
      [
        "Projection basis",
        (result) =>
          result.scenario.settings.projectionBasis === "real"
            ? "Real terms"
            : "Nominal",
      ],
      [
        "Tax basis",
        (result) =>
          result.scenario.settings.retirementIncomeTargetBasis === "after_tax"
            ? "Target spending after estimated tax"
            : "Target income before tax",
      ],
    ]),
  ]
    .flat()
    .filter((row) => !areAllValuesNa(row.values));
}

function createSpendingTargetComparisonRows(
  results: ComparisonResult[],
  retirementIncomeDisplay: RetirementIncomeDisplay
): ComparisonTableRow[] {
  if (
    !results.some(
      (result) =>
        result.scenario.settings.spendingStrategyType === "SPENDING_SMILE"
    )
  ) {
    return [];
  }

  return createComparisonSection("Spending target", results, [
    [
      "Spending strategy",
      (result) =>
        result.scenario.settings.spendingStrategyType === "SPENDING_SMILE"
          ? "Go-Go, Slow-Go, No-Go"
          : "Flat spending",
    ],
    [
      "Underlying target",
      (result) =>
        formatRecurringAnnualCurrency(
          result.scenario.settings.desiredRetirementIncome,
          retirementIncomeDisplay
        ),
    ],
    [
      "Go-go target",
      (result) =>
        formatSmilePhaseComparisonTarget(
          result,
          "goGoPercentage",
          retirementIncomeDisplay
        ),
    ],
    [
      "Slow-go starts",
      (result) => formatSmilePhaseStartAge(result, "slowGoStartAge"),
    ],
    [
      "Slow-go target",
      (result) =>
        formatSmilePhaseComparisonTarget(
          result,
          "slowGoPercentage",
          retirementIncomeDisplay
        ),
    ],
    [
      "No-go starts",
      (result) => formatSmilePhaseStartAge(result, "noGoStartAge"),
    ],
    [
      "No-go target",
      (result) =>
        formatSmilePhaseComparisonTarget(
          result,
          "noGoPercentage",
          retirementIncomeDisplay
        ),
    ],
  ]);
}

function formatSmilePhaseComparisonTarget(
  result: ComparisonResult,
  percentageField: SmilePercentageField,
  retirementIncomeDisplay: RetirementIncomeDisplay
) {
  const settings = result.scenario.settings;

  if (settings.spendingStrategyType !== "SPENDING_SMILE") {
    return "n/a";
  }

  const percentage = settings.spendingSmile[percentageField];
  const annualTarget = calculateSmilePhaseTarget(
    settings.desiredRetirementIncome,
    percentage
  );

  return `${formatRecurringAnnualCurrency(
    annualTarget,
    retirementIncomeDisplay
  )} (${percentage}%)`;
}

function formatSmilePhaseStartAge(
  result: ComparisonResult,
  startAgeField: "slowGoStartAge" | "noGoStartAge"
) {
  return result.scenario.settings.spendingStrategyType === "SPENDING_SMILE"
    ? formatDecimalAge(result.scenario.settings.spendingSmile[startAgeField])
    : "n/a";
}

export function buildComparisonDetailedRows(
  results: ComparisonResult[]
): ComparisonTableRow[] {
  const anyScenarioUsesIsa = results.some(
    (result) => result.scenario.settings.showIsa
  );
  const anyScenarioUsesLisa = results.some(
    (result) => result.scenario.settings.showLisa
  );
  const anyScenarioUsesSipp = results.some(
    (result) => result.scenario.settings.showSipp
  );
  const anyScenarioUsesCsAvc = results.some(
    (result) => result.scenario.settings.showCsAvc
  );
  const anyScenarioUsesNuvos = results.some(
    (result) => result.scenario.settings.showNuvos
  );
  const anyScenarioUsesPremium = results.some(
    (result) => result.scenario.settings.showPremium
  );
  const nuvosSecurePensionRows: Array<
    [
      metric: string,
      getValue: (result: ComparisonResult) => ComparisonCellValue,
    ]
  > = anyScenarioUsesNuvos
    ? [
        [
          "nuvos income at draw age",
          (result) =>
            result.scenario.settings.showNuvos
              ? formatAnnualCurrency(result.summary.nuvosPension.annualAtDraw)
              : "n/a",
        ],
      ]
    : [];
  const premiumSecurePensionRows: Array<
    [
      metric: string,
      getValue: (result: ComparisonResult) => ComparisonCellValue,
    ]
  > = anyScenarioUsesPremium
    ? [
        [
          "Premium income at draw age",
          (result) =>
            result.scenario.settings.showPremium
              ? formatAnnualCurrency(result.summary.premiumPension.annualAtDraw)
              : "n/a",
        ],
      ]
    : [];

  return [
    createComparisonSection("Retirement timing details", results, [
      [
        "Partial retirement start age",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? formatDecimalAge(
                result.scenario.settings.partialRetirementStartAge
              )
            : "n/a",
      ],
      [
        "Pro-rata work level",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? formatWholePercent(
                result.scenario.settings.partialRetirementWorkPercent / 100
              )
            : "n/a",
      ],
      [
        "Age leaving Alpha scheme",
        (result) =>
          formatDecimalAge(result.scenario.settings.alphaPensionLeaveAge),
      ],
    ]),
    createComparisonSection("Secure pension details", results, [
      [
        "Alpha Normal Pension Age",
        (result) =>
          formatDecimalAge(result.summary.calculated.normalPensionAge),
      ],
      [
        "Alpha early reduction applied",
        (result) =>
          formatYesNo(
            result.summary.calculated.earlyRetirementReductionPercent > 0
          ),
      ],
      ...nuvosSecurePensionRows,
      ...premiumSecurePensionRows,
      [
        "Combined secure pension at State Pension age",
        (result) =>
          result.scenario.settings.showStatePension
            ? formatAnnualCurrency(getCombinedSecurePensionAtStateAge(result))
            : "n/a",
      ],
    ]),
    createComparisonSection("Bridge mechanics", results, [
      [
        "Bridge spending to cover",
        (result) =>
          formatCurrencyDetailed(
            result.bridgeFundingEstimate.totalBridgeRequired
          ),
      ],
      [
        "All secure pensions active from",
        (result) =>
          result.assessment.allSecureIncomeStartDate === null ||
          result.assessment.allSecureIncomeStartAge === null ||
          result.assessment.allSecureIncomeStartAgeMonths === null
            ? "Not reached within this model"
            : `${formatDate(result.assessment.allSecureIncomeStartDate)} (${formatAge(
                result.assessment.allSecureIncomeStartAge,
                result.assessment.allSecureIncomeStartAgeMonths
              )})`,
      ],
      [
        "Position by modelling end",
        (result) =>
          renderComparisonToneCell(
            formatAnnualPosition(
              result.assessment.planningHorizonSecureAnnualSurplus
            ),
            result.assessment.planningHorizonSecureAnnualSurplus >= 0
              ? "good"
              : "caution"
          ),
      ],
      [
        "First configured flexible fund exhausted",
        (result) =>
          result.assessment.firstFlexibleFundExhaustionAccount &&
          result.assessment.firstFlexibleFundExhaustionDate
            ? `${result.assessment.firstFlexibleFundExhaustionAccount} (${formatDate(
                result.assessment.firstFlexibleFundExhaustionDate
              )})`
            : "None",
      ],
    ]),
    ...(anyScenarioUsesIsa
      ? [
          createComparisonSection("ISA bridge details", results, [
            [
              "Current ISA balance",
              (result) =>
                result.scenario.settings.showIsa
                  ? formatCurrencyDetailed(
                      result.scenario.settings.isaCurrentPot
                    )
                  : "n/a",
            ],
            [
              "ISA use-by age",
              (result) => formatUseByAge(result.scenario.settings, "isa"),
            ],
            [
              "Total ISA withdrawals",
              (result) =>
                result.scenario.settings.showIsa
                  ? formatCurrencyDetailed(
                      getTotalWithdrawals(result.rows, "monthlyIsaPension")
                    )
                  : "n/a",
            ],
            [
              "ISA depleted age",
              (result) =>
                result.scenario.settings.showIsa
                  ? renderComparisonToneCell(
                      formatDepletionAgeOrNa(result.isaDepletedAge),
                      getPotDepletionTone(
                        result.isaDepletedAge,
                        result.scenario.settings
                      )
                    )
                  : "n/a",
            ],
            [
              "Final ISA balance",
              (result) =>
                result.scenario.settings.showIsa
                  ? formatCurrencyDetailed(
                      getFinalPotBalance(result.rows, "isaPot")
                    )
                  : "n/a",
            ],
          ]),
        ]
      : []),
    ...(anyScenarioUsesSipp
      ? [
          createComparisonSection("SIPP bridge details", results, [
            [
              "Current SIPP balance",
              (result) =>
                result.scenario.settings.showSipp
                  ? formatCurrencyDetailed(
                      result.scenario.settings.sippCurrentPot
                    )
                  : "n/a",
            ],
            [
              "SIPP use-by age",
              (result) => formatUseByAge(result.scenario.settings, "sipp"),
            ],
            [
              "SIPP protected pension age",
              (result) =>
                result.scenario.settings.showSipp
                  ? formatSippProtectedPensionAge(result.scenario.settings)
                  : "n/a",
            ],
            [
              "SIPP withdrawal strategy",
              (result) =>
                formatSippWithdrawalStrategy(result.scenario.settings),
            ],
            [
              "Total SIPP withdrawals",
              (result) =>
                result.scenario.settings.showSipp
                  ? formatCurrencyDetailed(
                      getTotalWithdrawals(result.rows, "monthlySippPension")
                    )
                  : "n/a",
            ],
            [
              "SIPP depleted age",
              (result) =>
                result.scenario.settings.showSipp
                  ? renderComparisonToneCell(
                      formatDepletionAgeOrNa(result.sippDepletedAge),
                      getPotDepletionTone(
                        result.sippDepletedAge,
                        result.scenario.settings
                      )
                    )
                  : "n/a",
            ],
            [
              "Final SIPP balance",
              (result) =>
                result.scenario.settings.showSipp
                  ? formatCurrencyDetailed(
                      getFinalPotBalance(result.rows, "sippPot")
                    )
                  : "n/a",
            ],
          ]),
        ]
      : []),
    ...(anyScenarioUsesLisa
      ? [
          createComparisonSection("LISA bridge details", results, [
            [
              "Current LISA balance",
              (result) =>
                result.scenario.settings.showLisa
                  ? formatCurrencyDetailed(
                      result.scenario.settings.lisaCurrentPot
                    )
                  : "n/a",
            ],
            [
              "LISA use-by age",
              (result) => formatUseByAge(result.scenario.settings, "lisa"),
            ],
            [
              "Total LISA withdrawals",
              (result) =>
                result.scenario.settings.showLisa
                  ? formatCurrencyDetailed(
                      getTotalWithdrawals(result.rows, "monthlyLisaPension")
                    )
                  : "n/a",
            ],
            [
              "LISA depleted age",
              (result) =>
                result.scenario.settings.showLisa
                  ? renderComparisonToneCell(
                      formatDepletionAgeOrNa(result.lisaDepletedAge),
                      getPotDepletionTone(
                        result.lisaDepletedAge,
                        result.scenario.settings
                      )
                    )
                  : "n/a",
            ],
            [
              "Final LISA balance",
              (result) =>
                result.scenario.settings.showLisa
                  ? formatCurrencyDetailed(
                      getFinalPotBalance(result.rows, "lisaPot")
                    )
                  : "n/a",
            ],
          ]),
        ]
      : []),
    ...(anyScenarioUsesCsAvc
      ? [
          createComparisonSection("CS AVC bridge details", results, [
            [
              "Current CS AVC balance",
              (result) =>
                result.scenario.settings.showCsAvc
                  ? formatCurrencyDetailed(
                      result.scenario.settings.csAvcCurrentPot
                    )
                  : "n/a",
            ],
            [
              "CS AVC use-by age",
              (result) => formatUseByAge(result.scenario.settings, "csAvc"),
            ],
            [
              "CS AVC protected pension age",
              (result) =>
                result.scenario.settings.showCsAvc
                  ? formatCsAvcProtectedPensionAge(result.scenario.settings)
                  : "n/a",
            ],
            [
              "Total CS AVC withdrawals",
              (result) =>
                result.scenario.settings.showCsAvc
                  ? formatCurrencyDetailed(
                      getTotalWithdrawals(result.rows, "monthlyCsAvcPension")
                    )
                  : "n/a",
            ],
            [
              "CS AVC depleted age",
              (result) =>
                result.scenario.settings.showCsAvc
                  ? renderComparisonToneCell(
                      formatDepletionAgeOrNa(result.csAvcDepletedAge),
                      getPotDepletionTone(
                        result.csAvcDepletedAge,
                        result.scenario.settings
                      )
                    )
                  : "n/a",
            ],
            [
              "Final CS AVC balance",
              (result) =>
                result.scenario.settings.showCsAvc
                  ? formatCurrencyDetailed(
                      getFinalPotBalance(result.rows, "csAvcPot")
                    )
                  : "n/a",
            ],
          ]),
        ]
      : []),
    createComparisonSection("Flexible assets details", results, [
      [
        "Total ISA + LISA + SIPP + CS AVC withdrawals",
        (result) =>
          formatCurrencyDetailed(
            getTotalWithdrawals(result.rows, "monthlyIsaPension") +
              getTotalWithdrawals(result.rows, "monthlyLisaPension") +
              getTotalWithdrawals(result.rows, "monthlySippPension") +
              getTotalWithdrawals(result.rows, "monthlyCsAvcPension")
          ),
      ],
      [
        "Final ISA + LISA + SIPP + CS AVC balance",
        (result) =>
          formatCurrencyDetailed(
            getFinalPotBalance(result.rows, "isaPot") +
              getFinalPotBalance(result.rows, "lisaPot") +
              getFinalPotBalance(result.rows, "sippPot") +
              getFinalPotBalance(result.rows, "csAvcPot")
          ),
      ],
    ]),
    createComparisonSection("Assumptions details", results, [
      [
        "Inflation assumption",
        (result) =>
          formatPercent(result.scenario.settings.inflationRateAnnual / 100),
      ],
      [
        "ISA nominal return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings)
              .isaNominalReturnAnnual
          ),
      ],
      [
        "LISA nominal return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings)
              .lisaNominalReturnAnnual
          ),
      ],
      [
        "LISA modelled real return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings)
              .lisaModelledReturnAnnual
          ),
      ],
      [
        "ISA modelled real return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings)
              .isaModelledReturnAnnual
          ),
      ],
      [
        "SIPP nominal return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings)
              .sippNominalReturnAnnual
          ),
      ],
      [
        "SIPP modelled real return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings)
              .sippModelledReturnAnnual
          ),
      ],
      [
        "CS AVC nominal return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings)
              .csAvcNominalReturnAnnual
          ),
      ],
      [
        "CS AVC modelled real return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings)
              .csAvcModelledReturnAnnual
          ),
      ],
      [
        "State Pension growth projected",
        (result) =>
          formatYesNo(result.scenario.settings.statePensionApplyFutureGrowth),
      ],
      [
        "Taxation enabled",
        (result) => formatYesNo(result.scenario.settings.taxationEnabled),
      ],
      [
        "Income Tax regime",
        (result) =>
          result.scenario.settings.taxationEnabled
            ? result.scenario.settings.taxRegime === "scotland"
              ? "Scotland (2026/27)"
              : "England, Wales or Northern Ireland (2026/27)"
            : "N/A",
      ],
      [
        "Tax calculation basis",
        (result) =>
          result.scenario.settings.taxationEnabled
            ? "Modelled tax-year liability"
            : "N/A",
      ],
      [
        "Pre-retirement employment tax context",
        (result) =>
          result.scenario.settings.taxationEnabled
            ? `${formatCurrencyDetailed(
                result.scenario.settings.fullSalary
              )} annual entered full salary`
            : "N/A",
      ],
      [
        "Projection-end tax context",
        (result) =>
          result.scenario.settings.taxationEnabled
            ? "Final taxable monthly income continued to the following 5 April"
            : "N/A",
      ],
      [
        "Personal Allowance",
        (result) =>
          result.scenario.settings.taxationEnabled
            ? formatCurrencyDetailed(
                result.scenario.settings.taxPersonalAllowance
              )
            : "N/A",
      ],
      [
        "Personal Allowance taper threshold",
        (result) =>
          result.scenario.settings.taxationEnabled
            ? formatCurrencyDetailed(
                result.scenario.settings.taxPersonalAllowanceTaperThreshold
              )
            : "N/A",
      ],
      [
        "SIPP withdrawal tax treatment",
        (result) =>
          result.scenario.settings.taxationEnabled &&
          result.scenario.settings.showSipp
            ? formatWithdrawalTaxTreatment(
                result.scenario.settings.taxSippWithdrawalTreatment,
                result.scenario.settings.taxSippTaxFreeWithdrawalPercent
              )
            : "N/A",
      ],
      [
        "CS AVC withdrawal tax treatment",
        (result) =>
          result.scenario.settings.taxationEnabled &&
          result.scenario.settings.showCsAvc
            ? formatWithdrawalTaxTreatment(
                result.scenario.settings.taxCsAvcWithdrawalTreatment,
                result.scenario.settings.taxCsAvcTaxFreeWithdrawalPercent
              )
            : "N/A",
      ],
      [
        "Shared lump-sum allowance tracking",
        (result) =>
          result.scenario.settings.taxationEnabled
            ? formatYesNo(result.scenario.settings.taxTrackLumpSumAllowance)
            : "N/A",
      ],
      [
        "Pension lump-sum allowance",
        (result) =>
          result.scenario.settings.taxationEnabled &&
          result.scenario.settings.taxTrackLumpSumAllowance
            ? formatCurrencyDetailed(
                result.scenario.settings.taxLumpSumAllowance
              )
            : "N/A",
      ],
      [
        "Pension lump-sum allowance already used",
        (result) =>
          result.scenario.settings.taxationEnabled &&
          result.scenario.settings.taxTrackLumpSumAllowance
            ? formatCurrencyDetailed(
                result.scenario.settings.taxLumpSumAllowanceUsed
              )
            : "N/A",
      ],
    ]),
  ]
    .flat()
    .filter((row) => !areAllValuesNa(row.values));
}

function formatWithdrawalTaxTreatment(
  treatment: PensionSettings["taxSippWithdrawalTreatment"],
  customPercent: number
) {
  if (treatment === "ufpls") {
    return "25% tax-free on each withdrawal";
  }
  if (treatment === "custom") {
    return `${formatPercent(customPercent / 100)} tax-free custom share`;
  }
  if (treatment === "fully_taxable") {
    return "Fully taxable drawdown";
  }
  return "Not confirmed — fully taxable assumption";
}

function formatSippProtectedPensionAge(settings: PensionSettings) {
  return settings.sippHasProtectedPensionAge
    ? "Provider-confirmed age 50"
    : "Not confirmed";
}

function formatCsAvcProtectedPensionAge(settings: PensionSettings) {
  return settings.csAvcHasProtectedPensionAge
    ? "Provider-confirmed age 50"
    : "Not confirmed";
}

function buildTargetShortfallStatus(
  result: ComparisonResult,
  statePensionAssumptionAffectsTarget: boolean
) {
  if (result.assessment.targetMissMonths > 0) {
    return `Below target for ${formatTargetMissDuration(
      result.assessment.targetMissMonths
    )}`;
  }

  return statePensionAssumptionAffectsTarget
    ? "No calculated shortfall using the unconfirmed State Pension amount"
    : "No shortfall against the target";
}

function buildMainComparisonIssue(
  result: ComparisonResult,
  usesUnconfirmedStatePensionAssumption: boolean
) {
  if (!result.assessment.meetsTargetThroughout) {
    return `Projected income falls below target for ${formatTargetMissDuration(
      result.assessment.targetMissMonths
    )}; the largest annual shortfall is ${formatAnnualCurrency(
      result.assessment.largestAnnualShortfall
    )}`;
  }

  if (usesUnconfirmedStatePensionAssumption) {
    return result.statePensionAssumptionAffectsTarget
      ? `The target depends on an assumed State Pension of ${formatCurrencyWholePerYear(
          result.scenario.settings.currentStatePension
        )}`
      : "State Pension is an unconfirmed assumption, but the target remains met without it";
  }

  return "No shortfall identified from the current assumptions.";
}

function buildWithdrawalTaxStatusItems(
  settings: PensionSettings
): SummaryItemLike[] {
  if (!settings.taxationEnabled) {
    return [];
  }

  const hasUnknownWithdrawalTreatment =
    (settings.showSipp && settings.taxSippWithdrawalTreatment === "unknown") ||
    (settings.showCsAvc && settings.taxCsAvcWithdrawalTreatment === "unknown");

  return [
    {
      label: "Pension tax-free cash",
      value: settings.taxTrackLumpSumAllowance
        ? `Shared allowance tracked from ${formatCurrencyDetailed(
            Math.max(
              0,
              settings.taxLumpSumAllowance - settings.taxLumpSumAllowanceUsed
            )
          )} remaining at projection start`
        : "Legacy untracked percentage assumption — review before relying on results",
    },
    ...(hasUnknownWithdrawalTreatment
      ? [
          {
            label: "Withdrawal tax basis",
            value:
              "At least one pension withdrawal treatment is not confirmed and is treated as fully taxable",
          },
        ]
      : []),
  ];
}

export function buildComparisonStatusItems(
  result: ComparisonResult
): SummaryItemLike[] {
  const usesUnconfirmedStatePensionAssumption = usesUnconfirmedStatePension(
    result.scenario.settings
  );
  const statePensionNeedsChecking =
    usesUnconfirmedStatePensionAssumption &&
    result.statePensionAssumptionAffectsTarget;
  const calculationWorks = result.assessment.meetsTargetThroughout;

  const targetShortfall = buildTargetShortfallStatus(
    result,
    statePensionNeedsChecking
  );
  const mainIssue = buildMainComparisonIssue(
    result,
    usesUnconfirmedStatePensionAssumption
  );

  return [
    {
      label: "Overall status",
      value:
        calculationWorks && statePensionNeedsChecking
          ? "Needs checking"
          : calculationWorks
            ? "Looks workable"
            : "Needs attention",
    },
    {
      label: "Target shortfall",
      value: targetShortfall,
    },
    {
      label: "Main issue",
      value: mainIssue,
    },
    {
      label: "Income basis",
      value:
        result.scenario.settings.retirementIncomeTargetBasis === "after_tax"
          ? "After estimated Income Tax liability by modelled tax year; PAYE timing and National Insurance are excluded"
          : "Before Income Tax",
    },
    ...buildWithdrawalTaxStatusItems(result.scenario.settings),
  ];
}

export type RetirementOutcomeStatus = "onTrack" | "shortfall" | "atRisk";

export type RetirementOutcomeBanner = {
  status: RetirementOutcomeStatus;
  label: "Looks workable" | "Shortfall" | "At risk" | "Needs checking";
  message: string;
  warning?: {
    heading: string;
    message: string;
  };
};

export function buildRetirementOutcomeBanner(
  result: ComparisonResult
): RetirementOutcomeBanner {
  if (!result.assessment.meetsTargetThroughout) {
    return {
      status: "shortfall",
      label: "Shortfall",
      message: buildShortfallOutcomeMessage(result),
      warning: buildUnconfirmedStatePensionWarning(result),
    };
  }

  if (
    usesUnconfirmedStatePension(result.scenario.settings) &&
    result.statePensionAssumptionAffectsTarget
  ) {
    return {
      status: "atRisk",
      label: "Needs checking",
      message: buildOnTrackOutcomeMessage(result),
      warning: buildUnconfirmedStatePensionWarning(result),
    };
  }

  return {
    status: "onTrack",
    label: "Looks workable",
    message: buildOnTrackOutcomeMessage(result),
    warning: buildUnconfirmedStatePensionWarning(result),
  };
}

function usesUnconfirmedStatePension(settings: PensionSettings) {
  return settings.showStatePension && !settings.statePensionForecastConfirmed;
}

function buildUnconfirmedStatePensionWarning(
  result: ComparisonResult
): RetirementOutcomeBanner["warning"] {
  const settings = result.scenario.settings;

  if (!usesUnconfirmedStatePension(settings)) {
    return undefined;
  }

  const assumedAmount = `${formatCurrencyWhole(
    settings.currentStatePension
  )} a year`;
  const hasExistingShortfall = !result.assessment.meetsTargetThroughout;
  const materialitySentence = hasExistingShortfall
    ? `This projection includes an assumed State Pension of ${assumedAmount}. Your actual shortfall may differ once you enter your personalised forecast.`
    : result.statePensionAssumptionAffectsTarget
      ? `This projection meets your target only when the assumed State Pension of ${assumedAmount} is included.`
      : `This projection includes an assumed State Pension of ${assumedAmount}. Your target is still met if this income is excluded, but figures that include it should be treated with caution until you check your personalised forecast.`;

  return {
    heading: "State Pension amount not confirmed",
    message: `${materialitySentence} Review the State Pension section and enter your personalised forecast when available.`,
  };
}

function buildOnTrackOutcomeMessage(result: ComparisonResult) {
  const settings = result.scenario.settings;
  const targetDescription =
    settings.retirementIncomeTargetBasis === "after_tax"
      ? "target spending after estimated tax"
      : "target income before tax";
  const sentences = [
    `Based on the information entered, this scenario appears to provide your ${targetDescription} of ${formatCurrencyWholePerYear(
      result.assessment.retirementAnnualTarget
    )} ${formatProjectionBasisPhrase(settings)} from age ${formatDecimalAge(
      settings.requirementAge
    )} until age ${formatDecimalAge(settings.lifeExpectancy)}.`,
    formatBridgeFundingSentence(result),
    formatCivilServicePensionStartSentence(result),
    formatStatePensionStartSentence(result),
  ];

  return sentences.filter(Boolean).join(" ");
}

function buildShortfallOutcomeMessage(result: ComparisonResult) {
  const settings = result.scenario.settings;
  const firstShortfallAge =
    result.assessment.firstShortfallAge ?? settings.requirementAge;
  const firstShortfallSentence = ` The first shortfall is ${formatCurrencyWholePerYear(
    result.assessment.firstShortfallAnnualAmount
  )} ${formatProjectionBasisPhrase(settings)}.`;

  const targetDescription =
    settings.retirementIncomeTargetBasis === "after_tax"
      ? "target spending after estimated tax"
      : "target income before tax";

  return `Shortfall from age ${formatDecimalAge(
    firstShortfallAge
  )}. Based on the information entered, this scenario does not provide your ${targetDescription} of ${formatCurrencyWholePerYear(
    result.assessment.firstShortfallAnnualTarget
  )} through to age ${formatDecimalAge(
    settings.lifeExpectancy
  )}.${firstShortfallSentence}`;
}

function formatBridgeFundingSentence(result: ComparisonResult) {
  const bridgeWithdrawals = result.summary.retirementIncome.bridgeWithdrawals;

  if (bridgeWithdrawals.length === 0) {
    return "";
  }

  const startAge = Math.min(
    ...bridgeWithdrawals.map((withdrawal) => withdrawal.startAge)
  );
  const endAges = bridgeWithdrawals
    .map((withdrawal) => withdrawal.endAge)
    .filter((age): age is number => age !== null);
  const endAge = endAges.length > 0 ? Math.max(...endAges) : null;
  const labels = bridgeWithdrawals.map((withdrawal) => withdrawal.label);

  return `Bridge pots (${formatList(labels)}) cover ages ${formatDecimalAge(
    startAge
  )}${endAge === null ? " onwards" : `-${formatDecimalAge(endAge)}`}.`;
}

function formatCivilServicePensionStartSentence(result: ComparisonResult) {
  const settings = result.scenario.settings;
  const civilServiceStartAges = [
    ...(settings.showAlpha ? [settings.alphaPensionDrawAge] : []),
    ...(settings.showNuvos ? [settings.nuvosPensionDrawAge] : []),
  ];

  if (civilServiceStartAges.length === 0) {
    return "";
  }

  return `Civil Service pension income starts at age ${formatDecimalAge(
    Math.min(...civilServiceStartAges)
  )}.`;
}

function formatStatePensionStartSentence(result: ComparisonResult) {
  const settings = result.scenario.settings;

  if (!settings.showStatePension) {
    return "";
  }

  return `State Pension starts at age ${formatDecimalAge(
    result.summary.calculated.statePensionAge
  )}.`;
}

function formatCurrencyWholePerYear(value: number) {
  return `${formatCurrencyWhole(value)}/year`;
}

function formatCurrencyWhole(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatProjectionBasisPhrase(settings: PensionSettings) {
  return settings.projectionBasis === "real"
    ? "in today's money"
    : "in nominal terms";
}

function formatList(values: string[]) {
  const uniqueValues = Array.from(new Set(values));

  if (uniqueValues.length <= 1) {
    return uniqueValues[0] ?? "selected pots";
  }

  return `${uniqueValues.slice(0, -1).join(", ")} and ${uniqueValues.at(-1)}`;
}

function createComparisonSection(
  section: string,
  results: ComparisonResult[],
  rows: Array<
    [
      metric: string,
      getValue: (result: ComparisonResult) => ComparisonCellValue,
    ]
  >
) {
  const sectionDividerRow: ComparisonTableRow = {
    key: `${section}-divider`,
    section,
    metric: "",
    values: results.map(() => ""),
    sectionStart: true,
    isSectionDivider: true,
  };

  const metricRows = rows.map(([metric, getValue]) => ({
    key: `${section}-${metric}`,
    section,
    metric,
    values: results.map(getValue),
    sectionStart: false,
  }));

  return [sectionDividerRow, ...metricRows];
}

function areAllValuesNa(values: ComparisonCellValue[]) {
  return values.every((value) => {
    if (typeof value === "string") {
      return value.trim().toLowerCase() === "n/a";
    }

    return false;
  });
}

function findRowAtAge(rows: ProjectionRow[], targetAge: number) {
  return (
    rows.find(
      (candidate) => candidate.age + candidate.ageMonths / 12 >= targetAge
    ) ?? rows.at(-1)
  );
}

function getFinalPotBalance(
  rows: ProjectionRow[],
  key: "isaPot" | "lisaPot" | "sippPot" | "csAvcPot"
) {
  return rows.at(-1)?.[key] ?? 0;
}

function getTotalWithdrawals(
  rows: ProjectionRow[],
  key:
    | "monthlyIsaPension"
    | "monthlyLisaPension"
    | "monthlySippPension"
    | "monthlyCsAvcPension"
) {
  return rows.reduce((total, row) => total + row[key], 0);
}

function getCombinedSecurePensionAtStateAge(result: ComparisonResult) {
  const stateAgeRow = findRowAtAge(
    result.rows,
    result.summary.calculated.statePensionAge
  );

  return (
    ((stateAgeRow?.monthlyAlphaPensionGross ?? 0) +
      (stateAgeRow?.monthlyNuvosPensionGross ?? 0) +
      (stateAgeRow?.monthlyPremiumPensionGross ?? 0) +
      (stateAgeRow?.monthlyStatePension ?? 0)) *
    12
  );
}

function findFlexibleAssetsExhaustedAge(result: ComparisonResult) {
  const startAge = Math.min(
    result.scenario.settings.showIsa
      ? result.scenario.settings.isaDrawAge
      : Number.POSITIVE_INFINITY,
    result.scenario.settings.showLisa
      ? result.scenario.settings.lisaDrawAge
      : Number.POSITIVE_INFINITY,
    result.scenario.settings.showSipp
      ? result.scenario.settings.sippDrawAge
      : Number.POSITIVE_INFINITY,
    result.scenario.settings.showCsAvc
      ? result.scenario.settings.csAvcDrawAge
      : Number.POSITIVE_INFINITY
  );

  if (!Number.isFinite(startAge)) {
    return null;
  }

  const depletionRow = result.rows.find((row) => {
    const rowAge = row.age + row.ageMonths / 12;
    return (
      rowAge >= startAge &&
      row.isaPot + row.lisaPot + row.sippPot + row.csAvcPot <= 0
    );
  });

  return depletionRow ? depletionRow.age + depletionRow.ageMonths / 12 : null;
}

function getComparisonStatusLabel(result: ComparisonResult) {
  if (!result.assessment.meetsTargetThroughout) {
    return "Needs attention";
  }

  return result.statePensionAssumptionAffectsTarget
    ? "Needs checking"
    : "Looks workable";
}

function renderComparisonStatusCell(result: ComparisonResult) {
  const status = getComparisonStatusLabel(result);
  const tone = status === "Looks workable" ? "good" : "caution";

  return renderComparisonToneCell(status, tone);
}

function formatTargetMissDuration(months: number) {
  if (months <= 0) {
    return "Target met throughout";
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths}m`;
  }

  return remainingMonths === 0 ? `${years}y` : `${years}y ${remainingMonths}m`;
}

export { formatTargetMissDuration };

function formatDepletionAgeOrNa(age: number | null) {
  return age === null ? "Not depleted" : formatDecimalAge(age);
}

function formatAnnualCurrency(value: number) {
  return `${formatCurrencyDetailed(value)}/year`;
}

function formatMonthlyCurrency(value: number) {
  return `${formatCurrencyDetailed(value)}/month`;
}

function formatRecurringAnnualCurrency(
  annualValue: number,
  display: RetirementIncomeDisplay
) {
  return display === "monthly"
    ? formatMonthlyCurrency(annualValue / 12)
    : formatAnnualCurrency(annualValue);
}

function formatRecurringMonthlyCurrency(
  monthlyValue: number,
  display: RetirementIncomeDisplay
) {
  return display === "monthly"
    ? formatMonthlyCurrency(monthlyValue)
    : formatAnnualCurrency(monthlyValue * 12);
}

function formatAnnualPosition(value: number) {
  return value >= 0
    ? `${formatCurrencyDetailed(value)} surplus per year`
    : `${formatCurrencyDetailed(Math.abs(value))} shortfall per year`;
}

function formatWholePercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function formatYesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function formatYearsBelowTarget(months: number) {
  if (months <= 0) {
    return "0 years";
  }

  const years = months / 12;
  const formattedYears =
    years % 1 === 0 ? years.toFixed(0) : years.toFixed(1).replace(/\.0$/, "");

  return `${formattedYears} years`;
}

function formatUseByAge(
  settings: PensionSettings,
  pot: "isa" | "lisa" | "sipp" | "csAvc"
) {
  if (pot === "isa") {
    if (!settings.showIsa) {
      return "n/a";
    }

    return settings.isaWithdrawalStrategy === "use_by_age"
      ? formatDecimalAge(settings.isaWithdrawalTargetAge)
      : "n/a";
  }

  if (pot === "lisa") {
    if (!settings.showLisa) {
      return "n/a";
    }

    return settings.lisaWithdrawalStrategy === "use_by_age"
      ? formatDecimalAge(settings.lisaWithdrawalTargetAge)
      : "n/a";
  }

  if (pot === "csAvc") {
    if (!settings.showCsAvc) {
      return "n/a";
    }

    return settings.csAvcWithdrawalStrategy === "use_by_age"
      ? formatDecimalAge(settings.csAvcWithdrawalTargetAge)
      : "n/a";
  }

  if (!settings.showSipp) {
    return "n/a";
  }

  return settings.sippWithdrawalStrategy === "use_by_age"
    ? formatDecimalAge(settings.sippWithdrawalTargetAge)
    : "n/a";
}

function formatSippWithdrawalStrategy(settings: PensionSettings) {
  if (!settings.showSipp) {
    return "n/a";
  }

  if (settings.sippWithdrawalStrategy === "use_by_age") {
    return `Use by ${formatDecimalAge(settings.sippWithdrawalTargetAge)}`;
  }

  if (settings.sippWithdrawalStrategy === "percentage") {
    return formatWholePercent(settings.sippWithdrawalPercent / 100);
  }

  if (settings.sippWithdrawalStrategy === "meet_income_target") {
    return "Use to meet income target";
  }

  return "Life expectancy";
}

function renderFlexibleAssetsExhaustedCell(result: ComparisonResult) {
  const exhaustedAge = findFlexibleAssetsExhaustedAge(result);

  if (exhaustedAge === null) {
    return renderComparisonToneCell("No", "good");
  }

  const tone = getFlexibleAssetsExhaustionTone(
    exhaustedAge,
    result.scenario.settings
  );

  return renderComparisonToneCell(
    `Yes at age ${formatDecimalAge(exhaustedAge)}`,
    tone
  );
}

function getFlexibleAssetsExhaustionTone(
  exhaustedAge: number,
  settings: PensionSettings
): "caution" | "problem" {
  const scheduledMonthTolerance = 1 / 12;
  const expectedExhaustionAge =
    getExpectedFlexibleAssetsExhaustionAge(settings);

  return exhaustedAge + scheduledMonthTolerance < expectedExhaustionAge
    ? "problem"
    : "caution";
}

function getExpectedFlexibleAssetsExhaustionAge(settings: PensionSettings) {
  const expectedAges = [
    settings.showIsa
      ? getExpectedPotExhaustionAge(
          settings.isaWithdrawalStrategy,
          settings.isaWithdrawalTargetAge,
          settings.lifeExpectancy
        )
      : null,
    settings.showSipp
      ? getExpectedPotExhaustionAge(
          settings.sippWithdrawalStrategy,
          settings.sippWithdrawalTargetAge,
          settings.lifeExpectancy
        )
      : null,
  ].filter((age): age is number => age !== null);

  return expectedAges.length
    ? Math.max(...expectedAges)
    : settings.lifeExpectancy;
}

function getExpectedPotExhaustionAge(
  strategy: FlexibleWithdrawalStrategy,
  targetAge: number,
  lifeExpectancy: number
) {
  return strategy === "use_by_age" ? targetAge : lifeExpectancy;
}

function getPotDepletionTone(
  age: number | null,
  settings: PensionSettings
): "good" | "caution" | "problem" {
  if (age === null) {
    return "good";
  }

  return age < settings.lifeExpectancy ? "problem" : "caution";
}

function renderComparisonToneCell(
  value: string | number,
  tone: "good" | "caution" | "problem"
): ComparisonCellValue {
  return { value, tone };
}

function getCapitalPreservationScore(result: ComparisonResult) {
  const isaAge =
    result.isaDepletedAge ?? result.scenario.settings.lifeExpectancy + 1;
  const sippAge =
    result.sippDepletedAge ?? result.scenario.settings.lifeExpectancy + 1;

  return Math.min(isaAge, sippAge);
}

export function formatCapitalPreservation(result: ComparisonResult) {
  const score = getCapitalPreservationScore(result);

  return score > result.scenario.settings.lifeExpectancy
    ? "Pots last through model"
    : `First depletion at ${formatDecimalAge(score)}`;
}
