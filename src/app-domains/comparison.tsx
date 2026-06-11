import type { ReactNode } from "react";
import {
  calculateRetirementIncomeTargetAtDate,
  createProjectionTable,
  deriveInflationAssumptions,
  generatePensionSummary,
  generateRetirementBridgeAnalysis,
  prepareBridgeProjectionSettings,
  type PensionSummary,
  type ProjectionRow,
  type RetirementBridgeAnalysis,
  type RetirementIncomeDisplay,
} from "../projection";
import type {
  RetirementIncomeBridgeLimits,
  RetirementIncomeBridgeParameters,
  RetirementIncomePoint,
} from "../RetirementIncomeBridgeChart";
import {
  calculateStatePensionDrawAge,
  isLocalStorageEnabled,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
  type PensionSettings,
} from "../settings";
import {
  addYearsToIsoDate,
  createBridgeChartLimits,
  createBridgeChartParameters,
  createRetirementIncomeSeries,
} from "./retirement-income";
import {
  formatAge,
  formatCurrencyDetailed,
  formatDate,
  formatDecimalAge,
  formatPercent,
} from "./shared";

const COMPARISON_SCENARIOS_STORAGE_KEY =
  "cs-pension-modeller.comparisonScenarios";
const MAX_COMPARISON_SCENARIOS = 5;

export type ComparisonScenario = {
  id: string;
  name: string;
  settings: PensionSettings;
  createdAt: string;
  updatedAt: string;
};

export type ComparisonResult = {
  scenario: ComparisonScenario;
  rows: ProjectionRow[];
  summary: PensionSummary;
  bridgeAnalysis: RetirementBridgeAnalysis;
  annualIncome: number;
  annualTarget: number;
  annualGap: number;
  isaDepletedAge: number | null;
  sippDepletedAge: number | null;
  retirementAnnualIncome: number;
  statePensionAnnualIncome: number;
  lifeExpectancyAnnualIncome: number;
  targetMissMonths: number;
  currentMatchesSaved: boolean;
};

type CachedComparisonResult = Omit<
  ComparisonResult,
  "scenario" | "currentMatchesSaved"
>;

export type ComparisonResultCache = Map<string, CachedComparisonResult>;

export type BridgeAnswerResult = {
  bridgeSettings: PensionSettings;
  bridgeChartRows: ProjectionRow[];
  bridgeChartData: RetirementIncomePoint[];
  bridgeChartParameters: RetirementIncomeBridgeParameters;
  bridgeChartLimits: RetirementIncomeBridgeLimits;
  derivedInflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
};

export type BridgeAnswerResultCache = Map<string, BridgeAnswerResult>;

export type ComparisonTableRow = {
  key: string;
  section: string;
  metric: string;
  values: ReactNode[];
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

export function loadStoredComparisonScenarios(): ComparisonScenario[] {
  if (!isLocalStorageEnabled()) {
    return [];
  }

  const storedScenarios = readStorageItem(COMPARISON_SCENARIOS_STORAGE_KEY);

  if (!storedScenarios) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedScenarios) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((scenario, index) =>
        normalizeStoredComparisonScenario(scenario, index)
      )
      .filter((scenario): scenario is ComparisonScenario => Boolean(scenario))
      .slice(0, MAX_COMPARISON_SCENARIOS);
  } catch {
    return [];
  }
}

export function saveStoredComparisonScenarios(scenarios: ComparisonScenario[]) {
  if (!isLocalStorageEnabled()) {
    return;
  }

  writeStorageItem(
    COMPARISON_SCENARIOS_STORAGE_KEY,
    JSON.stringify(scenarios.slice(0, MAX_COMPARISON_SCENARIOS))
  );
}

export function clearStoredComparisonScenarios() {
  removeStorageItem(COMPARISON_SCENARIOS_STORAGE_KEY);
}

export function createComparisonScenarioId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function clonePensionSettings(
  settings: PensionSettings
): PensionSettings {
  return JSON.parse(JSON.stringify(settings)) as PensionSettings;
}

export function getSettingsSignature(settings: PensionSettings) {
  return JSON.stringify(settings);
}

export function createBridgeAnswerResult(
  settings: PensionSettings,
  cache: BridgeAnswerResultCache
): BridgeAnswerResult {
  const settingsSignature = getSettingsSignature(settings);
  const cachedResult = cache.get(settingsSignature);

  if (cachedResult) {
    return cachedResult;
  }

  const bridgeSettings = prepareBridgeProjectionSettings(settings);
  const bridgeChartRows = createProjectionTable(bridgeSettings);
  const result = {
    bridgeSettings,
    bridgeChartRows,
    bridgeChartData: createRetirementIncomeSeries(
      bridgeChartRows,
      bridgeSettings
    ),
    bridgeChartParameters: createBridgeChartParameters(bridgeSettings),
    bridgeChartLimits: createBridgeChartLimits(bridgeSettings),
    derivedInflationAssumptions: deriveInflationAssumptions(settings),
  };

  cache.set(settingsSignature, result);

  return result;
}

export function createComparisonResult(
  scenario: ComparisonScenario,
  currentSettingsSignature: string,
  cache?: ComparisonResultCache
): ComparisonResult {
  const settingsSignature = getSettingsSignature(scenario.settings);
  const cachedResult = cache?.get(settingsSignature);

  if (cachedResult) {
    return {
      ...cachedResult,
      scenario,
      currentMatchesSaved: settingsSignature === currentSettingsSignature,
    };
  }

  const rows = createProjectionTable(scenario.settings);
  const summary = generatePensionSummary(rows, scenario.settings);
  const bridgeSettings = prepareBridgeProjectionSettings(scenario.settings);
  const bridgePensionRows = createProjectionTable({
    ...bridgeSettings,
    showSipp: false,
    showIsa: false,
  });
  const bridgeAnalysis = generateRetirementBridgeAnalysis(
    bridgePensionRows,
    bridgeSettings,
    {
      calculateSafeDrawAge: true,
    }
  );
  const retirementDate = addYearsToIsoDate(
    scenario.settings.dateOfBirth,
    scenario.settings.requirementAge
  );
  const annualTarget = calculateRetirementIncomeTargetAtDate(
    scenario.settings,
    retirementDate
  );
  const annualIncome = summary.retirementIncome.totalAnnualIncome;
  const statePensionAge = calculateStatePensionDrawAge(
    scenario.settings.dateOfBirth,
    scenario.settings.statePensionDrawDate
  );
  const result = {
    rows,
    summary,
    bridgeAnalysis,
    annualIncome,
    annualTarget,
    annualGap: annualIncome - annualTarget,
    isaDepletedAge: findPotDepletedAge(
      rows,
      "isaPot",
      scenario.settings.isaDrawAge,
      scenario.settings.showIsa &&
        scenario.settings.isaWithdrawalStrategy === "use_by_age"
        ? scenario.settings.isaWithdrawalTargetAge
        : null
    ),
    sippDepletedAge: findPotDepletedAge(
      rows,
      "sippPot",
      scenario.settings.sippDrawAge,
      scenario.settings.showSipp &&
        scenario.settings.sippWithdrawalStrategy === "use_by_age"
        ? scenario.settings.sippWithdrawalTargetAge
        : null
    ),
    retirementAnnualIncome: findAnnualIncomeAtAge(
      rows,
      scenario.settings.requirementAge
    ),
    statePensionAnnualIncome: findAnnualIncomeAtAge(rows, statePensionAge),
    lifeExpectancyAnnualIncome: findAnnualIncomeAtAge(
      rows,
      scenario.settings.lifeExpectancy
    ),
    targetMissMonths: countTargetMissMonths(rows, scenario.settings),
  };

  cache?.set(settingsSignature, result);

  return {
    ...result,
    scenario,
    currentMatchesSaved: settingsSignature === currentSettingsSignature,
  };
}

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
      !best || result.targetMissMonths < best.targetMissMonths ? result : best,
    null
  );
  const lowestShortfallRiskResult = results.reduce<ComparisonResult | null>(
    (best, result) => {
      if (!best) {
        return result;
      }

      const bestShortfall = Math.max(0, -best.annualGap);
      const resultShortfall = Math.max(0, -result.annualGap);

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
  const nuvosTimingRows: Array<
    [metric: string, getValue: (result: ComparisonResult) => ReactNode]
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
    [metric: string, getValue: (result: ComparisonResult) => ReactNode]
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
            getLowestAnnualIncome(result.rows, result.scenario.settings),
            retirementIncomeDisplay
          ),
      ],
      [
        "Years below target",
        (result) =>
          renderComparisonToneCell(
            formatYearsBelowTarget(result.targetMissMonths),
            result.targetMissMonths > 0 ? "caution" : "good"
          ),
      ],
      [
        "Largest shortfall",
        (result) =>
          renderComparisonToneCell(
            formatRecurringAnnualCurrency(
              getLargestAnnualShortfall(result.rows, result.scenario.settings),
              retirementIncomeDisplay
            ),
            getLargestAnnualShortfall(result.rows, result.scenario.settings) > 0
              ? "caution"
              : "good"
          ),
      ],
      [
        "Lifetime shortfall",
        (result) =>
          renderComparisonToneCell(
            formatCurrencyDetailed(
              getTotalLifetimeShortfall(result.rows, result.scenario.settings)
            ),
            getTotalLifetimeShortfall(result.rows, result.scenario.settings) > 0
              ? "caution"
              : "good"
          ),
      ],
    ]),
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
      [
        "ISA start",
        (result) =>
          result.scenario.settings.showIsa
            ? formatDecimalAge(result.scenario.settings.isaDrawAge)
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
                result.bridgeAnalysis.planWorks
                  ? "Works on these assumptions"
                  : "Shortfall remains",
            ],
            [
              "ISA-only gap before SIPP access",
              (result) =>
                formatCurrencyDetailed(
                  result.bridgeAnalysis.requiredIsaAtRetirement
                ),
            ],
            [
              "Later top-up gap after SIPP access",
              (result) =>
                formatCurrencyDetailed(
                  result.bridgeAnalysis.requiredSippAtAccess
                ),
            ],
            [
              "Bridge still unfunded",
              (result) =>
                renderComparisonToneCell(
                  formatCurrencyDetailed(
                    result.bridgeAnalysis.totalUnfundedShortfall
                  ),
                  result.bridgeAnalysis.totalUnfundedShortfall > 0
                    ? "caution"
                    : "good"
                ),
            ],
            [
              "Extra saving",
              (result) =>
                formatRecurringMonthlyCurrency(
                  result.bridgeAnalysis.additionalMonthlyContributionRequired,
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
          result.scenario.settings.taxationEnabled ? "After tax" : "Before tax",
      ],
    ]),
  ]
    .flat()
    .filter((row) => !areAllValuesNa(row.values));
}

export function buildComparisonDetailedRows(
  results: ComparisonResult[]
): ComparisonTableRow[] {
  const anyScenarioUsesIsa = results.some(
    (result) => result.scenario.settings.showIsa
  );
  const anyScenarioUsesSipp = results.some(
    (result) => result.scenario.settings.showSipp
  );
  const anyScenarioUsesNuvos = results.some(
    (result) => result.scenario.settings.showNuvos
  );
  const nuvosSecurePensionRows: Array<
    [metric: string, getValue: (result: ComparisonResult) => ReactNode]
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
          formatCurrencyDetailed(result.bridgeAnalysis.totalBridgeRequired),
      ],
      [
        "Earliest sustainable pension draw age",
        (result) =>
          result.bridgeAnalysis.earliestSustainablePensionDrawAge === null
            ? "Not found"
            : formatDecimalAge(
                result.bridgeAnalysis.earliestSustainablePensionDrawAge
              ),
      ],
      [
        "All secure pensions active from",
        (result) =>
          result.bridgeAnalysis.fullSecureIncomeStartDate === null ||
          result.bridgeAnalysis.fullSecureIncomeStartAge === null ||
          result.bridgeAnalysis.fullSecureIncomeStartAgeMonths === null
            ? "Not reached within this model"
            : `${formatDate(result.bridgeAnalysis.fullSecureIncomeStartDate)} (${formatAge(
                result.bridgeAnalysis.fullSecureIncomeStartAge,
                result.bridgeAnalysis.fullSecureIncomeStartAgeMonths
              )})`,
      ],
      [
        "Position by modelling end",
        (result) =>
          renderComparisonToneCell(
            formatAnnualPosition(
              result.bridgeAnalysis.stableAnnualGuaranteedSurplus
            ),
            result.bridgeAnalysis.stableAnnualGuaranteedSurplus >= 0
              ? "good"
              : "caution"
          ),
      ],
      [
        "First pot to fail",
        (result) =>
          result.bridgeAnalysis.firstPotToFail
            ? `${result.bridgeAnalysis.firstPotToFail} (${formatDate(
                result.bridgeAnalysis.firstFailureDate ?? ""
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
    createComparisonSection("Flexible assets details", results, [
      [
        "Total ISA + SIPP withdrawals",
        (result) =>
          formatCurrencyDetailed(
            getTotalWithdrawals(result.rows, "monthlyIsaPension") +
              getTotalWithdrawals(result.rows, "monthlySippPension")
          ),
      ],
      [
        "Final ISA + SIPP balance",
        (result) =>
          formatCurrencyDetailed(
            getFinalPotBalance(result.rows, "isaPot") +
              getFinalPotBalance(result.rows, "sippPot")
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
        "State Pension growth projected",
        (result) =>
          formatYesNo(result.scenario.settings.statePensionApplyFutureGrowth),
      ],
      [
        "Taxation enabled",
        (result) => formatYesNo(result.scenario.settings.taxationEnabled),
      ],
    ]),
  ]
    .flat()
    .filter((row) => !areAllValuesNa(row.values));
}

export function buildComparisonStatusItems(
  result: ComparisonResult,
  options: { hideBridgeFundingSection?: boolean } = {}
): SummaryItemLike[] {
  const { hideBridgeFundingSection = false } = options;
  const overallWorks =
    result.targetMissMonths === 0 &&
    (hideBridgeFundingSection || result.bridgeAnalysis.planWorks) &&
    result.bridgeAnalysis.fullSecureAnnualGuaranteedSurplus >= 0;

  const targetShortfall =
    result.targetMissMonths > 0
      ? `Below target for ${formatTargetMissDuration(result.targetMissMonths)}`
      : "No shortfall against the target";

  let mainIssue = "No shortfall identified from the current assumptions.";

  if (!hideBridgeFundingSection && !result.bridgeAnalysis.planWorks) {
    mainIssue =
      result.bridgeAnalysis.additionalMonthlyContributionRequired > 0
        ? `Bridge still unfunded; estimated extra monthly saving ${formatMonthlyCurrency(
            result.bridgeAnalysis.additionalMonthlyContributionRequired
          )}`
        : "Bridge still unfunded";
  } else if (result.bridgeAnalysis.fullSecureAnnualGuaranteedSurplus < 0) {
    mainIssue = hideBridgeFundingSection
      ? `Secure pension income is ${formatAnnualCurrency(
          Math.abs(result.bridgeAnalysis.fullSecureAnnualGuaranteedSurplus)
        )} below target once all selected secure pension income is in payment`
      : `Secure pension income is ${formatAnnualCurrency(
          Math.abs(result.bridgeAnalysis.fullSecureAnnualGuaranteedSurplus)
        )} below target once the bridge ends`;
  } else if (result.targetMissMonths > 0) {
    mainIssue = hideBridgeFundingSection
      ? "Income drops below target before all selected secure pension income is in place"
      : "Income drops below target before secure pension income is fully in place";
  }

  return [
    {
      label: "Overall status",
      value: overallWorks ? "Looks workable" : "Needs attention",
    },
    {
      label: "Target shortfall",
      value: targetShortfall,
    },
    {
      label: "Main issue",
      value: mainIssue,
    },
  ];
}

export function buildRetirementIncomeItems(
  summary: PensionSummary,
  display: RetirementIncomeDisplay
): SummaryItemLike[] {
  return summary.retirementIncome.sources.map((source) => ({
    label:
      display === "monthly"
        ? `Monthly ${source.label}`
        : `Annual ${source.label}`,
    value: formatCurrencyDetailed(
      display === "monthly" ? source.monthlyIncome : source.annualIncome
    ),
  }));
}

export function getRetirementIncomeTitle(
  taxationEnabled: boolean,
  display: RetirementIncomeDisplay
) {
  if (display === "monthly") {
    return taxationEnabled
      ? "Monthly take-home retirement income"
      : "Monthly retirement income before tax";
  }

  return taxationEnabled
    ? "Annual take-home retirement income"
    : "Annual retirement income before tax";
}

export function getRetirementIncomeTargetTitle(
  display: RetirementIncomeDisplay
) {
  return display === "monthly"
    ? "Monthly target retirement income"
    : "Annual target retirement income";
}

function normalizeStoredComparisonScenario(
  scenario: unknown,
  index: number
): ComparisonScenario | null {
  if (!scenario || typeof scenario !== "object") {
    return null;
  }

  const candidate = scenario as Partial<ComparisonScenario>;
  const settings = candidate.settings;

  if (!settings || typeof settings !== "object") {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id:
      typeof candidate.id === "string" && candidate.id
        ? candidate.id
        : createComparisonScenarioId(),
    name:
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name
        : `Scenario ${index + 1}`,
    settings: clonePensionSettings(settings),
    createdAt:
      typeof candidate.createdAt === "string" && candidate.createdAt
        ? candidate.createdAt
        : now,
    updatedAt:
      typeof candidate.updatedAt === "string" && candidate.updatedAt
        ? candidate.updatedAt
        : now,
  };
}

function createComparisonSection(
  section: string,
  results: ComparisonResult[],
  rows: Array<
    [metric: string, getValue: (result: ComparisonResult) => ReactNode]
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

function areAllValuesNa(values: ReactNode[]) {
  return values.every((value) => {
    if (typeof value === "string") {
      return value.trim().toLowerCase() === "n/a";
    }

    return false;
  });
}

function findPotDepletedAge(
  rows: ProjectionRow[],
  potKey: "isaPot" | "sippPot",
  drawAge: number,
  targetAge: number | null = null
) {
  const depletionRow = rows.find(
    (row) => row.age + row.ageMonths / 12 >= drawAge && row[potKey] <= 0
  );

  if (!depletionRow) {
    return null;
  }

  const depletionAge = depletionRow.age + depletionRow.ageMonths / 12;

  if (targetAge !== null && depletionAge < targetAge) {
    return targetAge;
  }

  return depletionAge;
}

function findAnnualIncomeAtAge(rows: ProjectionRow[], targetAge: number) {
  const row = findRowAtAge(rows, targetAge);

  return (row?.totalMonthlyNetIncome ?? 0) * 12;
}

function findRowAtAge(rows: ProjectionRow[], targetAge: number) {
  return (
    rows.find(
      (candidate) => candidate.age + candidate.ageMonths / 12 >= targetAge
    ) ?? rows.at(-1)
  );
}

function getLowestAnnualIncome(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  const incomes = createRetirementIncomeSeries(rows, settings)
    .filter(
      (point) =>
        point.age >= settings.requirementAge &&
        point.age <= settings.lifeExpectancy
    )
    .map((point) => point.assessedIncomeAnnual);

  return incomes.length ? Math.min(...incomes) : 0;
}

function getLargestAnnualShortfall(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  return createRetirementIncomeSeries(rows, settings).reduce(
    (largest, point) => {
      if (
        point.age < settings.requirementAge ||
        point.age > settings.lifeExpectancy
      ) {
        return largest;
      }

      return Math.max(largest, point.shortfallAnnual);
    },
    0
  );
}

function getTotalLifetimeShortfall(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  return createRetirementIncomeSeries(rows, settings).reduce((total, point) => {
    if (
      point.age < settings.requirementAge ||
      point.age > settings.lifeExpectancy
    ) {
      return total;
    }

    return total + point.shortfallAnnual / 12;
  }, 0);
}

function getFinalPotBalance(rows: ProjectionRow[], key: "isaPot" | "sippPot") {
  return rows.at(-1)?.[key] ?? 0;
}

function getTotalWithdrawals(
  rows: ProjectionRow[],
  key: "monthlyIsaPension" | "monthlySippPension"
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
      (stateAgeRow?.monthlyStatePension ?? 0)) *
    12
  );
}

function findFlexibleAssetsExhaustedAge(result: ComparisonResult) {
  const startAge = Math.min(
    result.scenario.settings.showIsa
      ? result.scenario.settings.isaDrawAge
      : Number.POSITIVE_INFINITY,
    result.scenario.settings.showSipp
      ? result.scenario.settings.sippDrawAge
      : Number.POSITIVE_INFINITY
  );

  if (!Number.isFinite(startAge)) {
    return null;
  }

  const depletionRow = result.rows.find((row) => {
    const rowAge = row.age + row.ageMonths / 12;
    return rowAge >= startAge && row.isaPot + row.sippPot <= 0;
  });

  return depletionRow ? depletionRow.age + depletionRow.ageMonths / 12 : null;
}

function getComparisonStatusLabel(result: ComparisonResult) {
  return result.targetMissMonths === 0 ? "Looks workable" : "Needs attention";
}

function renderComparisonStatusCell(result: ComparisonResult) {
  const status = getComparisonStatusLabel(result);
  const tone = status === "Needs attention" ? "caution" : "good";

  return renderComparisonToneCell(status, tone);
}

function countTargetMissMonths(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  return createRetirementIncomeSeries(rows, settings).filter(
    (point) =>
      point.age >= settings.requirementAge &&
      point.age <= settings.lifeExpectancy &&
      point.shortfallAnnual > 0
  ).length;
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

function formatUseByAge(settings: PensionSettings, pot: "isa" | "sipp") {
  if (pot === "isa") {
    if (!settings.showIsa) {
      return "n/a";
    }

    return settings.isaWithdrawalStrategy === "use_by_age"
      ? formatDecimalAge(settings.isaWithdrawalTargetAge)
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

  return "Life expectancy";
}

function renderFlexibleAssetsExhaustedCell(result: ComparisonResult) {
  const exhaustedAge = findFlexibleAssetsExhaustedAge(result);

  if (exhaustedAge === null) {
    return renderComparisonToneCell("No", "good");
  }

  const tone =
    exhaustedAge < result.scenario.settings.lifeExpectancy
      ? "problem"
      : "caution";

  return renderComparisonToneCell(
    `Yes at age ${formatDecimalAge(exhaustedAge)}`,
    tone
  );
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
  value: ReactNode,
  tone: "good" | "caution" | "problem"
) {
  return (
    <span className={`comparison-cell comparison-cell--${tone}`}>{value}</span>
  );
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
