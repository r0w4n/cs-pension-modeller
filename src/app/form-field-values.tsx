import { useState } from "react";
import type {
  CurrencyInputField,
  RangeField,
  SelectField,
} from "../fieldDefinitions";
import { clampNumber, getEffectiveRangeField } from "../app-domains";
import {
  calculateMinimumSippAccessAge,
  defaultSettings,
  formatCurrency,
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
}: {
  field: SelectField;
  value: string;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

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
      <SelectSettingFieldEditor
        field={field}
        value={value}
        disabled={disabled}
        describedBy={validationId}
        hasValidationIssue={Boolean(validationIssue)}
        onChange={(nextValue) =>
          onChange(field.id, nextValue as PensionSettings[typeof field.id])
        }
      />
      <FieldHelp field={field} showGuidanceNotes={showGuidanceNotes} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

function SelectSettingFieldEditor({
  field,
  value,
  disabled = false,
  describedBy,
  hasValidationIssue = false,
  onChange,
}: {
  field: SelectField;
  value: string;
  disabled?: boolean;
  describedBy?: string;
  hasValidationIssue?: boolean;
  onChange: (nextValue: string) => void;
}) {
  return (
    <select
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
}: {
  field: CurrencyInputField;
  value: number;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const validationId = validationIssue ? `${field.id}-validation` : undefined;
  const resetValue = defaultSettings[field.id];

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
        field={field}
        initialValue={value}
        resetValue={resetValue}
        disabled={disabled}
        describedBy={validationId}
        hasValidationIssue={Boolean(validationIssue)}
        onCommit={(nextValue) => {
          const normalizedValue = clampNumber(
            nextValue,
            0,
            Number.MAX_SAFE_INTEGER
          );
          onChange(field.id, normalizedValue);
          return normalizedValue;
        }}
      />
      <FieldHelp field={field} showGuidanceNotes={showGuidanceNotes} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

function CurrencySettingFieldEditor({
  field,
  initialValue,
  resetValue,
  disabled = false,
  describedBy,
  hasValidationIssue = false,
  onCommit,
}: {
  field: CurrencyInputField;
  initialValue: number;
  resetValue: PensionSettings[typeof field.id];
  disabled?: boolean;
  describedBy?: string;
  hasValidationIssue?: boolean;
  onCommit: (nextValue: number) => number;
}) {
  const [draftValue, setDraftValue] = useState(initialValue.toString());
  const showsResetButton =
    field.id !== "desiredRetirementIncome" &&
    field.id !== "accruedPensionAtLastAbs";

  const commitValue = (nextValue: string) => {
    const parsedValue = Number(nextValue);
    const normalizedValue = Number.isFinite(parsedValue)
      ? parsedValue
      : initialValue;
    const committedValue = onCommit(normalizedValue);
    setDraftValue(committedValue.toString());
  };

  const applyPresetValue = (
    presetValue: NonNullable<CurrencyInputField["presets"]>[number]["value"]
  ) => {
    setDraftValue(presetValue.toString());
    onCommit(presetValue);
  };

  return (
    <>
      <input
        aria-label={field.label}
        className="number-input"
        type="number"
        step={field.step ?? 1}
        min={field.min ?? 0}
        max={field.max ?? undefined}
        value={draftValue}
        disabled={disabled}
        aria-invalid={hasValidationIssue || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          setDraftValue(event.target.value);
        }}
        onBlur={(event) => {
          commitValue(event.target.value);
        }}
      />
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
            setDraftValue(resetValue.toString());
            onCommit(resetValue);
          }}
        >
          {`Reset to default (${formatCurrency(resetValue)})`}
        </button>
      ) : null}
    </>
  );
}

export function RangeSettingField({
  field,
  value,
  settings,
  onChange,
  showGuidanceNotes,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: RangeField;
  value: number;
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const effectiveField = getEffectiveRangeField(field, settings);
  const preservesBelowMinimumValue = field.id === "sippDrawAge";
  const [draftValue, setDraftValue] = useState<number | null>(null);
  const [draftExactValue, setDraftExactValue] = useState<string | null>(null);
  const parsedDraftExactValue =
    draftExactValue === null || draftExactValue.trim() === ""
      ? Number.NaN
      : Number(draftExactValue);
  const hasValidDraftExactValue =
    Number.isFinite(parsedDraftExactValue) &&
    parsedDraftExactValue >= effectiveField.min &&
    parsedDraftExactValue <= effectiveField.max;
  const displayedRangeValue = hasValidDraftExactValue
    ? parsedDraftExactValue
    : Math.min(
        effectiveField.max,
        Math.max(effectiveField.min, draftValue ?? value)
      );
  const displayedExactValue =
    draftExactValue ??
    (preservesBelowMinimumValue && value < effectiveField.min
      ? value.toString()
      : displayedRangeValue.toString());
  const validationId = validationIssue ? `${field.id}-validation` : undefined;
  const resetValue = defaultSettings[field.id];
  const resetLabel =
    field.id === "requirementAge"
      ? "Reset retirement age to default value"
      : `Reset ${effectiveField.label} to default value`;

  const commitValue = (nextValue: number) => {
    const normalizedValue = clampNumber(
      nextValue,
      preservesBelowMinimumValue ? field.min : effectiveField.min,
      effectiveField.max
    );
    onChange(field.id, normalizedValue);
    setDraftValue(null);
    setDraftExactValue(null);
  };

  return (
    <div
      className={getFieldCardClassName(
        disabled,
        hideOnMobile,
        Boolean(validationIssue)
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
            disabled={disabled}
            aria-invalid={Boolean(validationIssue) || undefined}
            aria-describedby={validationId}
            onPointerDown={(event) => {
              event.currentTarget.focus({ preventScroll: true });
            }}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setDraftValue(nextValue);
              setDraftExactValue(null);
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
          aria-invalid={Boolean(validationIssue) || undefined}
          aria-describedby={validationId}
          onFocus={(event) => {
            setDraftExactValue(event.currentTarget.value);
          }}
          onChange={(event) => {
            const nextDraftValue = event.target.value;
            setDraftExactValue(nextDraftValue);

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
            const parsedValue = Number(event.target.value);
            const nextValue =
              event.target.value.trim() === "" || !Number.isFinite(parsedValue)
                ? displayedRangeValue
                : parsedValue;
            commitValue(nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const parsedValue = Number(event.currentTarget.value);
              const nextValue =
                event.currentTarget.value.trim() === "" ||
                !Number.isFinite(parsedValue)
                  ? displayedRangeValue
                  : parsedValue;
              commitValue(nextValue);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      {field.id === "sippDrawAge" ? (
        <SippProtectedAgeInlineControls
          settings={settings}
          onChange={onChange}
          disabled={disabled}
          showGuidanceNotes={showGuidanceNotes}
        />
      ) : null}
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
        }}
      >
        {`Reset to default (${formatFieldValue(resetValue, effectiveField.format)})`}
      </button>
      <FieldHelp field={effectiveField} showGuidanceNotes={showGuidanceNotes} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
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

function formatFieldValue(value: number, format?: "currency") {
  if (format === "currency") {
    return formatCurrency(value);
  }

  return value.toString();
}
