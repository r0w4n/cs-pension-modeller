import type { QuickCalculatorBatchResult } from "../calculation/quick-calculator-scenarios";
import { formatDate } from "./formatting";

export type QuickCalculatorResultCard = {
  id: string;
  basis: "normal" | "selected";
  label: string;
  retirementAge: number;
  status: "available" | "unavailable";
  alphaAnnual: number | null;
  alphaDrawDate: string;
  combinedAnnual: number | null;
  combinedStartDate: string | null;
  statePensionIncluded: boolean;
  statePensionConfirmed: boolean;
  notes: string[];
  issues: string[];
};

export type QuickCalculatorProjectedResults = {
  calculationDate: string;
  settingsSignature: string;
  normalAge: number;
  selectedAge: number;
  cards: QuickCalculatorResultCard[];
};

export const QUICK_CALCULATOR_RESULT_BASIS = {
  period: "annual",
  tax: "before tax",
  value: "today's money",
  label: "Estimated annual income before tax, in today's money.",
} as const;

export function projectQuickCalculatorResults(
  batch: QuickCalculatorBatchResult
): QuickCalculatorProjectedResults {
  const cards = batch.scenarios.map((scenario): QuickCalculatorResultCard => {
    const result = scenario.result;
    const alphaDrawDate = result?.summary.keyDates.startsAlphaPension ?? "";

    if (!result) {
      return {
        id: scenario.id,
        basis: scenario.basis,
        label: scenario.label,
        retirementAge: scenario.retirementAge,
        status: "unavailable",
        alphaAnnual: null,
        alphaDrawDate,
        combinedAnnual: null,
        combinedStartDate: null,
        statePensionIncluded: scenario.settings.showStatePension,
        statePensionConfirmed: scenario.settings.statePensionForecastConfirmed,
        notes: scenario.notes,
        issues: scenario.validationIssues.map((issue) => issue.message),
      };
    }

    const statePensionIncluded = result.settings.showStatePension;
    const combinedStartDate = statePensionIncluded
      ? latestDate(
          result.summary.keyDates.startsAlphaPension,
          result.settings.statePensionDrawDate
        )
      : null;
    const combinedRow = combinedStartDate
      ? result.rows.find((row) => row.date >= combinedStartDate)
      : undefined;
    const notes = [...scenario.notes];

    if (
      statePensionIncluded &&
      result.summary.keyDates.startsAlphaPension <
        result.settings.statePensionDrawDate
    ) {
      notes.push(
        `State Pension is not included before ${formatDate(result.settings.statePensionDrawDate)}.`
      );
    }
    if (!statePensionIncluded) {
      notes.push("State Pension is excluded from this comparison.");
    }
    if (combinedStartDate && !combinedRow) {
      notes.push(
        "A combined Alpha and State Pension rate is unavailable within the supported planning horizon."
      );
    }

    return {
      id: scenario.id,
      basis: scenario.basis,
      label: scenario.label,
      retirementAge: scenario.retirementAge,
      status: "available",
      alphaAnnual: result.summary.alphaPension.annualAtDraw,
      alphaDrawDate: result.summary.keyDates.startsAlphaPension,
      combinedAnnual: combinedRow
        ? (combinedRow.monthlyAlphaPensionGross +
            combinedRow.monthlyStatePension) *
          12
        : null,
      combinedStartDate,
      statePensionIncluded,
      statePensionConfirmed: result.settings.statePensionForecastConfirmed,
      notes,
      issues: [],
    };
  });

  return {
    calculationDate: batch.calculationDate,
    settingsSignature: batch.settingsSignature,
    normalAge:
      cards.find((card) => card.basis === "normal")?.retirementAge ?? 0,
    selectedAge:
      cards.find((card) => card.basis === "selected")?.retirementAge ?? 0,
    cards,
  };
}

function latestDate(first: string, second: string) {
  return first >= second ? first : second;
}
