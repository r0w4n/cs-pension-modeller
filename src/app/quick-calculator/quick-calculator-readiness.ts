import { isValidIsoDate, type PensionSettings } from "../../settings";
import type { QuickCalculatorCompletion } from "./quick-calculator-storage";

export type QuickCalculatorDraftField =
  | "accruedPensionAtLastAbs"
  | "pensionableEarnings"
  | "alphaPensionDrawAge"
  | "alphaAddedPensionMonthly"
  | "partialRetirementStartAge"
  | "partialRetirementWorkPercent"
  | "currentStatePension";

export type QuickCalculatorDraftErrors = Partial<
  Record<QuickCalculatorDraftField | "dateOfBirth", string>
>;
export type QuickCalculatorDirtyDrafts = Partial<
  Record<QuickCalculatorDraftField, boolean>
>;

export function getQuickCalculatorReadiness({
  inputs,
  completion,
  draftErrors,
  dirtyDrafts,
}: {
  inputs: Pick<PensionSettings, "showStatePension">;
  completion: QuickCalculatorCompletion;
  draftErrors: QuickCalculatorDraftErrors;
  dirtyDrafts: QuickCalculatorDirtyDrafts;
}) {
  const requiredInputsComplete =
    completion.dateOfBirth &&
    completion.accruedPensionAtLastAbs &&
    completion.pensionableEarnings &&
    completion.retirementAgeInitialised &&
    completion.partialRetirementAgeInitialised;
  const activeDraftFields = (
    Object.keys({ ...draftErrors, ...dirtyDrafts }) as Array<
      keyof QuickCalculatorDraftErrors
    >
  ).filter(
    (field) => field !== "currentStatePension" || inputs.showStatePension
  );
  const hasDraftProblems = activeDraftFields.some(
    (field) =>
      Boolean(draftErrors[field]) ||
      (field !== "dateOfBirth" && Boolean(dirtyDrafts[field]))
  );

  return {
    requiredInputsComplete,
    hasDraftProblems,
    calculationEnabled: requiredInputsComplete && !hasDraftProblems,
  };
}

export function hasQuickCalculatorDraftToPreserve({
  inputs,
  draftErrors,
  dirtyDrafts,
}: {
  inputs: Pick<PensionSettings, "alphaEpaPeriods">;
  draftErrors: QuickCalculatorDraftErrors;
  dirtyDrafts: QuickCalculatorDirtyDrafts;
}) {
  return (
    Object.values(draftErrors).some(Boolean) ||
    Object.values(dirtyDrafts).some(Boolean) ||
    inputs.alphaEpaPeriods.some(
      (period) =>
        !isValidIsoDate(period.startDate) || !isValidIsoDate(period.endDate)
    )
  );
}
