import type { CurrencyInputField } from "../fieldDefinitions";

export type CurrencyDraftState =
  | { status: "valid-draft"; value: number }
  | { status: "invalid"; message: string }
  | { status: "committed"; value: number };

export function validateCurrencyDraft(
  value: string,
  field: CurrencyInputField
): CurrencyDraftState {
  if (value.trim() === "") {
    return {
      status: "invalid",
      message:
        field.id === "desiredRetirementIncome"
          ? "Enter the amount you would like to spend."
          : `Enter ${field.label.toLowerCase()}.`,
    };
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return { status: "invalid", message: "Enter a valid number." };
  }
  const displayDivisor = field.displayDivisor ?? 1;
  const displayMinimum = field.min / displayDivisor;
  const displayMaximum = field.max / displayDivisor;
  if (parsedValue < displayMinimum) {
    return {
      status: "invalid",
      message: `Enter ${displayMinimum} or more.`,
    };
  }
  if (parsedValue > displayMaximum) {
    return {
      status: "invalid",
      message: `Enter ${displayMaximum} or less.`,
    };
  }

  return { status: "valid-draft", value: parsedValue };
}
