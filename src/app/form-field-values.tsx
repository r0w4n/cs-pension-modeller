import { useState } from "react";
import type {
  CurrencyInputField,
  RangeField,
  SelectField,
} from "../fieldDefinitions";
import { getEffectiveRangeField } from "../app-domains";
import { clampNumber } from "../number";
import {
  calculateDefaultSippDrawAge,
  calculateMinimumCsAvcAccessAge,
  calculateMinimumSippAccessAge,
  defaultSettings,
  formatCurrency,
  formatModelAge,
  isModelAge,
  normalizeAlphaPensionDrawAge,
  roundModelAge,
  normalizeSippDrawAge,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import type { SettingsFieldOnChange } from "./form-field-types";
import {
  FieldHelp,
  FieldLabel,
  FieldValidationMessage,
  getFieldCardClassName,
} from "./form-fields-shared";

export function SelectSettingField({
  field,
  value,
  onChange,
  showGuidanceNotes,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
  warning,
  domIdPrefix,
}: {
  field: SelectField;
  value: string;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
  warning?: { id: string; message: string };
  domIdPrefix?: string;
}) {
  const domId = getFieldDomId(field.id, domIdPrefix);
  const validationId = validationIssue ? `${domId}-validation` : undefined;
  const describedBy = [validationId, warning?.id].filter(Boolean).join(" ");

  return (
    <div
      className={`${getFieldCardClassName(
        disabled,
        hideOnMobile,
        Boolean(validationIssue),
        Boolean(warning)
      )}${field.fullWidth ? " field-card--full-width" : ""}`}
    >
      <span className="field-header">
        <FieldLabel field={field} showInfoLinks={showGuidanceNotes} />
      </span>
      <SelectSettingFieldEditor
        field={field}
        value={value}
        inputId={domId}
        disabled={disabled}
        describedBy={describedBy || undefined}
        hasValidationIssue={Boolean(validationIssue)}
        onChange={(nextValue) =>
          onChange(field.id, nextValue as PensionSettings[typeof field.id])
        }
      />
      <FieldHelp field={field} showGuidanceNotes={showGuidanceNotes} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
      {warning ? (
        <p id={warning.id} className="field-warning" role="status">
          {warning.message}
        </p>
      ) : null}
    </div>
  );
}

function SelectSettingFieldEditor({
  field,
  value,
  inputId,
  disabled = false,
  describedBy,
  hasValidationIssue = false,
  onChange,
}: {
  field: SelectField;
  value: string;
  inputId: string;
  disabled?: boolean;
  describedBy?: string;
  hasValidationIssue?: boolean;
  onChange: (nextValue: string) => void;
}) {
  return (
    <select
      id={inputId}
      aria-label={field.label}
      className="select-input"
      value={value}
      disabled={disabled}
      aria-invalid={hasValidationIssue || undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value)}
    >
      {field.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function CurrencySettingField({
  field,
  value,
  onChange,
  showGuidanceNotes,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
  resetValue: resetValueOverride,
  domIdPrefix,
  initialDraftValue,
  strictDraftValidation = false,
  onDraftStateChange,
}: {
  field: CurrencyInputField;
  value: number;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
  /** Lets an adapter preserve an independently owned setting's default. */
  resetValue?: number;
  domIdPrefix?: string;
  /** Optional shell-owned draft used by required fields on isolated screens. */
  initialDraftValue?: string;
  /** Retains invalid text and blocks commits for shells that own draft errors. */
  strictDraftValidation?: boolean;
  onDraftStateChange?: (state: CurrencyDraftState) => void;
}) {
  const domId = getFieldDomId(field.id, domIdPrefix);
  const validationId = validationIssue ? `${domId}-validation` : undefined;
  const resetValue = resetValueOverride ?? defaultSettings[field.id];
  const displayDivisor = field.displayDivisor ?? 1;

  return (
    <div
      className={getFieldCardClassName(
        disabled,
        hideOnMobile,
        Boolean(validationIssue)
      )}
    >
      <span className="field-header">
        <FieldLabel field={field} showInfoLinks={showGuidanceNotes} />
      </span>
      <CurrencySettingFieldEditor
        key={`${field.id}-${value}-${displayDivisor}`}
        field={field}
        initialValue={value / displayDivisor}
        initialDraftValue={initialDraftValue}
        resetValue={resetValue / displayDivisor}
        disabled={disabled}
        describedBy={validationId}
        hasValidationIssue={Boolean(validationIssue)}
        strictDraftValidation={strictDraftValidation}
        onDraftStateChange={onDraftStateChange}
        onCommit={(nextValue) => {
          const normalizedValue = clampNumber(
            nextValue * displayDivisor,
            0,
            Number.MAX_SAFE_INTEGER
          );
          onChange(field.id, normalizedValue);
          return normalizedValue / displayDivisor;
        }}
      />
      <FieldHelp field={field} showGuidanceNotes={showGuidanceNotes} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

export type CurrencyDraftState =
  | { status: "valid-draft"; value: number }
  | { status: "invalid"; message: string }
  | { status: "committed"; value: number };

function CurrencySettingFieldEditor({
  field,
  initialValue,
  initialDraftValue,
  resetValue,
  disabled = false,
  describedBy,
  hasValidationIssue = false,
  strictDraftValidation,
  onCommit,
  onDraftStateChange,
}: {
  field: CurrencyInputField;
  initialValue: number;
  initialDraftValue?: string;
  resetValue: PensionSettings[typeof field.id];
  disabled?: boolean;
  describedBy?: string;
  hasValidationIssue?: boolean;
  strictDraftValidation: boolean;
  onCommit: (nextValue: number) => number;
  onDraftStateChange?: (state: CurrencyDraftState) => void;
}) {
  const [draftValue, setDraftValue] = useState(
    () => initialDraftValue ?? formatCurrencyInputValue(initialValue)
  );
  const displayDivisor = field.displayDivisor ?? 1;
  const showsResetButton =
    field.id !== "desiredRetirementIncome" &&
    field.id !== "accruedPensionAtLastAbs";

  const commitValue = (nextValue: string) => {
    if (strictDraftValidation) {
      const draftState = validateCurrencyDraft(nextValue, field);
      if (draftState.status === "invalid") {
        onDraftStateChange?.(draftState);
        return;
      }
    }

    const parsedValue = Number(nextValue);
    const normalizedValue = Number.isFinite(parsedValue)
      ? parsedValue
      : initialValue;
    const committedValue = onCommit(normalizedValue);
    setDraftValue(committedValue.toString());
    onDraftStateChange?.({ status: "committed", value: committedValue });
  };

  const applyPresetValue = (
    presetValue: NonNullable<CurrencyInputField["presets"]>[number]["value"]
  ) => {
    const displayValue = presetValue / displayDivisor;
    setDraftValue(formatCurrencyInputValue(displayValue));
    const committedValue = onCommit(displayValue);
    onDraftStateChange?.({ status: "committed", value: committedValue });
  };

  return (
    <>
      <input
        aria-label={field.label}
        className="number-input"
        type="number"
        step={field.displayDivisor ? 1 : (field.step ?? 1)}
        min={(field.min ?? 0) / displayDivisor}
        max={field.max === undefined ? undefined : field.max / displayDivisor}
        value={draftValue}
        disabled={disabled}
        aria-invalid={hasValidationIssue || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);
          if (strictDraftValidation) {
            onDraftStateChange?.(validateCurrencyDraft(nextValue, field));
          }
        }}
        onBlur={(event) => {
          commitValue(event.target.value);
        }}
      />
      {field.showAnnualEquivalent ? (
        <p className="field-help" aria-live="polite">
          Yearly equivalent:{" "}
          {formatCurrency(Math.round(getAnnualEquivalent(draftValue)))}
        </p>
      ) : null}
      {field.presets?.length ? (
        <div className="field-preset-row">
          {field.presets.map((preset) => (
            <button
              type="button"
              className="secondary-button field-preset-button"
              key={preset.value}
              aria-label={
                "description" in preset && preset.description
                  ? `${preset.label}: ${preset.description}`
                  : preset.label
              }
              onClick={() => applyPresetValue(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
      {showsResetButton ? (
        <button
          type="button"
          className="secondary-button field-reset-button"
          aria-label={`Reset ${field.label} to default value`}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraftValue(formatCurrencyInputValue(resetValue));
            const committedValue = onCommit(resetValue);
            onDraftStateChange?.({
              status: "committed",
              value: committedValue,
            });
          }}
        >
          {`Reset to default (${formatCurrency(resetValue)})`}
        </button>
      ) : null}
    </>
  );
}

function validateCurrencyDraft(
  value: string,
  field: CurrencyInputField
): CurrencyDraftState {
  if (value.trim() === "") {
    return {
      status: "invalid",
      message: `Enter ${field.label.toLowerCase()}.`,
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

function formatCurrencyInputValue(value: number) {
  return (Math.round(value * 100) / 100).toString();
}

function getAnnualEquivalent(draftValue: string) {
  const parsedValue = Number(draftValue);

  return Number.isFinite(parsedValue) ? parsedValue * 12 : 0;
}

// Required-draft support adds two shell-owned states to the established range control.
// eslint-disable-next-line sonarjs/cyclomatic-complexity
export function RangeSettingField({
  field,
  value,
  settings,
  onChange,
  showGuidanceNotes,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
  useNpaLinkedDefaults = false,
  resetValue: resetValueOverride,
  domIdPrefix,
  isAnswered = true,
  strictDraftValidation = false,
  onDraftStateChange,
}: {
  field: RangeField;
  value: number;
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
  useNpaLinkedDefaults?: boolean;
  /** Lets an adapter preserve an independently owned setting's default. */
  resetValue?: number;
  domIdPrefix?: string;
  /** Keeps a required range distinguishable from an explicit zero. */
  isAnswered?: boolean;
  /** Retains invalid exact text and blocks blur/Enter commits. */
  strictDraftValidation?: boolean;
  onDraftStateChange?: (state: RangeDraftState) => void;
}) {
  const effectiveField = getEffectiveRangeField(field, settings);
  const preservesBelowMinimumValue =
    field.id === "sippDrawAge" || field.id === "csAvcDrawAge";
  const [draftValue, setDraftValue] = useState<number | null>(null);
  const [draftExactValue, setDraftExactValue] = useState<string | null>(null);
  const parsedDraftExactValue =
    draftExactValue === null || draftExactValue.trim() === ""
      ? Number.NaN
      : Number(draftExactValue);
  const { isAgeField, hasInvalidAgeStep } = getRangeAgeDraftState(
    effectiveField,
    draftExactValue,
    parsedDraftExactValue
  );
  const hasValidDraftExactValue =
    Number.isFinite(parsedDraftExactValue) &&
    parsedDraftExactValue >= effectiveField.min &&
    parsedDraftExactValue <= effectiveField.max &&
    !hasInvalidAgeStep;
  const displayedRangeValue = hasValidDraftExactValue
    ? parsedDraftExactValue
    : Math.min(
        effectiveField.max,
        Math.max(effectiveField.min, draftValue ?? value)
      );
  const displayedExactValue =
    !isAnswered && draftExactValue === null
      ? ""
      : getDisplayedRangeExactValue({
          field: effectiveField,
          value,
          draftExactValue,
          displayedRangeValue,
          preservesBelowMinimumValue,
          preserveExplicitZero: strictDraftValidation && isAnswered,
        });
  const domId = getFieldDomId(field.id, domIdPrefix);
  const validationId = validationIssue ? `${domId}-validation` : undefined;
  const ageStepValidationId = hasInvalidAgeStep
    ? `${domId}-age-step-validation`
    : undefined;
  const describedBy = joinIds(validationId, ageStepValidationId);
  const hasAnyValidationIssue = Boolean(validationIssue) || hasInvalidAgeStep;
  const ariaInvalid = getAriaInvalid(hasAnyValidationIssue);
  const resetValue =
    resetValueOverride ??
    getRangeResetValue(field, settings, useNpaLinkedDefaults);
  const resetLabel =
    field.id === "requirementAge"
      ? "Reset retirement age to default value"
      : `Reset ${effectiveField.label} to default value`;

  const commitValue = (nextValue: number) => {
    const clampedValue = clampNumber(
      nextValue,
      preservesBelowMinimumValue ? field.min : effectiveField.min,
      effectiveField.max
    );
    const normalizedValue = normalizeRangeValue(clampedValue, isAgeField);
    onChange(field.id, normalizedValue);
    setDraftValue(null);
    setDraftExactValue(null);
    onDraftStateChange?.({ status: "committed", value: normalizedValue });
  };

  const commitExactDraft = (nextDraftValue: string) => {
    if (strictDraftValidation) {
      const draftState = validateRangeDraft(
        nextDraftValue,
        effectiveField,
        isAgeField
      );
      if (draftState.status === "invalid") {
        onDraftStateChange?.(draftState);
        return false;
      }
    }

    const parsedValue = Number(nextDraftValue);
    if (
      isAgeField &&
      Number.isFinite(parsedValue) &&
      !isModelAge(parsedValue)
    ) {
      return false;
    }
    const nextValue =
      nextDraftValue.trim() === "" || !Number.isFinite(parsedValue)
        ? displayedRangeValue
        : parsedValue;
    commitValue(nextValue);
    return true;
  };

  return (
    <div
      className={getFieldCardClassName(
        disabled,
        hideOnMobile,
        hasAnyValidationIssue
      )}
    >
      <span className="field-header">
        <FieldLabel field={effectiveField} showInfoLinks={showGuidanceNotes} />
      </span>
      <div className="range-control-grid">
        <div className="range-slider-group">
          <input
            aria-label={effectiveField.label}
            className="range-input"
            type="range"
            min={effectiveField.min}
            max={effectiveField.max}
            step={effectiveField.step}
            value={displayedRangeValue}
            aria-valuetext={getAgeValueText(isAgeField, displayedRangeValue)}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-describedby={describedBy || undefined}
            onPointerDown={(event) => {
              event.currentTarget.focus({ preventScroll: true });
            }}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setDraftValue(nextValue);
              setDraftExactValue(null);
              onDraftStateChange?.({ status: "valid-draft", value: nextValue });
            }}
            onMouseUp={(event) =>
              commitValue(Number(event.currentTarget.value))
            }
            onTouchEnd={(event) =>
              commitValue(Number(event.currentTarget.value))
            }
            onBlur={(event) => commitValue(Number(event.currentTarget.value))}
          />
          <div className="range-scale">
            <span>
              {formatFieldValue(effectiveField.min, effectiveField.format)}
            </span>
            <span>
              {formatFieldValue(effectiveField.max, effectiveField.format)}
            </span>
          </div>
        </div>

        <input
          aria-label={`${effectiveField.label} exact value`}
          className="number-input"
          type="number"
          min={effectiveField.min}
          max={effectiveField.max}
          step={effectiveField.inputStep ?? effectiveField.step}
          value={displayedExactValue}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={describedBy || undefined}
          onFocus={(event) => {
            setDraftExactValue(event.currentTarget.value);
          }}
          onChange={(event) => {
            const nextDraftValue = event.target.value;
            setDraftExactValue(nextDraftValue);

            if (strictDraftValidation) {
              onDraftStateChange?.(
                validateRangeDraft(nextDraftValue, effectiveField, isAgeField)
              );
            }

            const parsedValue = Number(nextDraftValue);
            if (
              nextDraftValue.trim() !== "" &&
              Number.isFinite(parsedValue) &&
              parsedValue >= effectiveField.min &&
              parsedValue <= effectiveField.max
            ) {
              setDraftValue(parsedValue);
            }
          }}
          onBlur={(event) => {
            commitExactDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              if (commitExactDraft(event.currentTarget.value)) {
                event.currentTarget.blur();
              }
            }
          }}
        />
      </div>
      <RangeAgeFeedback
        isAgeField={isAgeField}
        hasInvalidAgeStep={hasInvalidAgeStep}
        displayedRangeValue={displayedRangeValue}
        validationId={ageStepValidationId}
      />
      {field.id === "sippDrawAge" ? (
        <SippProtectedAgeInlineControls
          settings={settings}
          onChange={onChange}
          disabled={disabled}
          showGuidanceNotes={showGuidanceNotes}
        />
      ) : null}
      {field.id === "csAvcDrawAge" ? (
        <CsAvcProtectedAgeInlineControls
          settings={settings}
          onChange={onChange}
          disabled={disabled}
          showGuidanceNotes={showGuidanceNotes}
        />
      ) : null}
      {field.emptyWhenZero ? null : (
        <button
          type="button"
          className="secondary-button field-reset-button"
          aria-label={resetLabel}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange(field.id, resetValue);
            setDraftValue(null);
            setDraftExactValue(null);
            onDraftStateChange?.({ status: "committed", value: resetValue });
          }}
        >
          {`Reset to default (${formatFieldValue(resetValue, effectiveField.format)})`}
        </button>
      )}
      <FieldHelp field={effectiveField} showGuidanceNotes={showGuidanceNotes} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

export type RangeDraftState =
  | { status: "valid-draft"; value: number }
  | { status: "invalid"; message: string }
  | { status: "committed"; value: number };

function validateRangeDraft(
  value: string,
  field: RangeField,
  isAgeField: boolean
): RangeDraftState {
  if (value.trim() === "") {
    return {
      status: "invalid",
      message: `Enter ${field.label.toLowerCase()}.`,
    };
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return { status: "invalid", message: "Enter a valid number." };
  }
  if (parsedValue < field.min || parsedValue > field.max) {
    return {
      status: "invalid",
      message: `Enter a value from ${field.min} to ${field.max}.`,
    };
  }
  if (isAgeField && !isModelAge(parsedValue)) {
    return {
      status: "invalid",
      message: "Use whole years or 3, 6 or 9 months.",
    };
  }

  return { status: "valid-draft", value: parsedValue };
}

function getRangeResetValue(
  field: RangeField,
  settings: PensionSettings,
  useNpaLinkedDefaults: boolean
) {
  if (
    useNpaLinkedDefaults &&
    (field.id === "requirementAge" || field.id === "alphaPensionLeaveAge")
  ) {
    return settings.normalPensionAge;
  }

  if (useNpaLinkedDefaults && field.id === "alphaPensionDrawAge") {
    return normalizeAlphaPensionDrawAge(
      settings.normalPensionAge,
      settings.dateOfBirth
    );
  }

  if (useNpaLinkedDefaults && field.id === "sippDrawAge") {
    return normalizeSippDrawAge(
      calculateDefaultSippDrawAge(settings.normalPensionAge),
      settings.dateOfBirth
    );
  }

  return defaultSettings[field.id];
}

function getRangeAgeDraftState(
  field: RangeField,
  draftExactValue: string | null,
  parsedDraftExactValue: number
) {
  const isAgeField = field.format === "age";
  const hasInvalidAgeStep =
    isAgeField &&
    draftExactValue !== null &&
    draftExactValue.trim() !== "" &&
    Number.isFinite(parsedDraftExactValue) &&
    !isModelAge(parsedDraftExactValue);

  return { isAgeField, hasInvalidAgeStep };
}

function normalizeRangeValue(value: number, isAgeField: boolean) {
  return isAgeField ? roundModelAge(value) : value;
}

function getAgeValueText(isAgeField: boolean, value: number) {
  return isAgeField ? formatModelAge(value) : undefined;
}

function getFieldDomId(fieldId: string, domIdPrefix?: string) {
  return domIdPrefix ? `${domIdPrefix}-${fieldId}` : fieldId;
}

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ");
}

function getAriaInvalid(hasValidationIssue: boolean) {
  return hasValidationIssue || undefined;
}

function RangeAgeFeedback({
  isAgeField,
  hasInvalidAgeStep,
  displayedRangeValue,
  validationId,
}: {
  isAgeField: boolean;
  hasInvalidAgeStep: boolean;
  displayedRangeValue: number;
  validationId?: string;
}) {
  if (!isAgeField) {
    return null;
  }

  if (hasInvalidAgeStep) {
    return (
      <p id={validationId} className="field-error">
        Enter a whole year, or add 3, 6 or 9 months (for example 67.25).
      </p>
    );
  }

  return (
    <p className="field-default-note" aria-live="polite">
      {`Selected age: ${formatModelAge(displayedRangeValue)}`}
    </p>
  );
}

function getDisplayedRangeExactValue({
  field,
  value,
  draftExactValue,
  displayedRangeValue,
  preservesBelowMinimumValue,
  preserveExplicitZero,
}: {
  field: RangeField;
  value: number;
  draftExactValue: string | null;
  displayedRangeValue: number;
  preservesBelowMinimumValue: boolean;
  preserveExplicitZero: boolean;
}) {
  if (draftExactValue !== null) {
    return draftExactValue;
  }

  if (field.emptyWhenZero && value === 0 && !preserveExplicitZero) {
    return "";
  }

  if (preservesBelowMinimumValue && value < field.min) {
    return value.toString();
  }

  return displayedRangeValue.toString();
}

function SippProtectedAgeInlineControls({
  settings,
  onChange,
  disabled = false,
  showGuidanceNotes,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  disabled?: boolean;
  showGuidanceNotes: boolean;
}) {
  const checkboxId = "sippHasProtectedPensionAge-inline";
  const descriptionId = "sippHasProtectedPensionAge-inline-description";
  const updateProtectedPensionAge = (hasProtectedPensionAge: boolean) => {
    onChange("sippHasProtectedPensionAge", hasProtectedPensionAge);

    if (!hasProtectedPensionAge) {
      const standardMinimumSippAccessAge = calculateMinimumSippAccessAge(
        settings.dateOfBirth,
        { sippHasProtectedPensionAge: false }
      );

      if (settings.sippDrawAge < standardMinimumSippAccessAge) {
        onChange("sippDrawAge", standardMinimumSippAccessAge);
      }
    }
  };

  return (
    <div className="sipp-protected-age-panel">
      <label className="checkbox-row" htmlFor={checkboxId}>
        <input
          id={checkboxId}
          type="checkbox"
          checked={settings.sippHasProtectedPensionAge}
          disabled={disabled}
          aria-describedby={showGuidanceNotes ? descriptionId : undefined}
          onChange={(event) => updateProtectedPensionAge(event.target.checked)}
        />
        <span>I have a provider-confirmed protected SIPP age</span>
      </label>
      {showGuidanceNotes ? (
        <p id={descriptionId} className="field-help">
          Only use this if your provider or scheme administrator has confirmed
          that these scheme-specific pension rights can be accessed from age 50
          before the standard private pension access age.
        </p>
      ) : null}
    </div>
  );
}

function CsAvcProtectedAgeInlineControls({
  settings,
  onChange,
  disabled = false,
  showGuidanceNotes,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  disabled?: boolean;
  showGuidanceNotes: boolean;
}) {
  const checkboxId = "csAvcHasProtectedPensionAge-inline";
  const descriptionId = "csAvcHasProtectedPensionAge-inline-description";
  const updateProtectedPensionAge = (hasProtectedPensionAge: boolean) => {
    onChange("csAvcHasProtectedPensionAge", hasProtectedPensionAge);

    if (!hasProtectedPensionAge) {
      const standardMinimumCsAvcAccessAge = calculateMinimumCsAvcAccessAge(
        settings.dateOfBirth,
        { csAvcHasProtectedPensionAge: false }
      );

      if (settings.csAvcDrawAge < standardMinimumCsAvcAccessAge) {
        onChange("csAvcDrawAge", standardMinimumCsAvcAccessAge);
      }
    }
  };

  return (
    <div className="sipp-protected-age-panel">
      <label className="checkbox-row" htmlFor={checkboxId}>
        <input
          id={checkboxId}
          type="checkbox"
          checked={settings.csAvcHasProtectedPensionAge}
          disabled={disabled}
          aria-describedby={showGuidanceNotes ? descriptionId : undefined}
          onChange={(event) => updateProtectedPensionAge(event.target.checked)}
        />
        <span>I have a provider-confirmed protected CS AVC age</span>
      </label>
      {showGuidanceNotes ? (
        <p id={descriptionId} className="field-help">
          Only use this if your CS AVC provider or scheme administrator has
          confirmed that these scheme-specific pension rights can be accessed
          from age 50 before the standard private pension access age.
        </p>
      ) : null}
    </div>
  );
}

function formatFieldValue(value: number, format?: RangeField["format"]) {
  if (format === "currency") {
    return formatCurrency(value);
  }

  if (format === "age") {
    return formatModelAge(value);
  }

  return value.toString();
}
