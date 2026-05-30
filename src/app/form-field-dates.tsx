import { useEffect, useState } from "react";
import type { DateField } from "../fieldDefinitions";
import {
  calculateMinimumStatePensionDrawAge,
  calculateStatePensionDrawAge,
  calculateStatePensionDrawDateFromAge,
  defaultSettings,
  getAlphaAbsYear,
  normalizeSetting,
  normalizeStatePensionDrawAge,
  normalizeStatePensionDrawDate,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import {
  getPrimaryDateYearRange,
  getStatePensionDefaultDrawDate,
  formatAgeValue,
  formatDate,
} from "../app-domains";
import type {
  DateParts,
  DateSelectFieldProps,
  SettingsFieldOnChange,
} from "./form-field-types";
import {
  FieldHelp,
  FieldLabel,
  FieldValidationMessage,
  getFieldCardClassName,
} from "./form-fields-shared";

export function useMobileDateDropdowns() {
  const mobileBreakpoint = "(max-width: 480px)";
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(mobileBreakpoint).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(mobileBreakpoint);
    const updateMatch = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", updateMatch);

    return () => {
      mediaQuery.removeEventListener("change", updateMatch);
    };
  }, []);

  return matches;
}

export function DateInputFieldEditor({
  label,
  initialValue,
  min,
  disabled = false,
  describedBy,
  hasValidationIssue = false,
  onCommit,
}: {
  label: string;
  initialValue: string;
  min?: string;
  disabled?: boolean;
  describedBy?: string;
  hasValidationIssue?: boolean;
  onCommit: (nextValue: string) => string;
}) {
  const [draftValue, setDraftValue] = useState(initialValue);

  return (
    <input
      aria-label={label}
      className="date-input"
      type="date"
      min={min}
      value={draftValue}
      disabled={disabled}
      aria-invalid={hasValidationIssue || undefined}
      aria-describedby={describedBy}
      onChange={(event) => {
        setDraftValue(event.target.value);
      }}
      onBlur={(event) => {
        setDraftValue(onCommit(event.target.value));
      }}
    />
  );
}

export function StatePensionAgeField({
  field,
  value,
  settings,
  onChange,
  showGuidanceNotes,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: DateField;
  value: string;
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const minimumStatePensionAge = calculateMinimumStatePensionDrawAge(
    settings.dateOfBirth,
  );
  const maximumStatePensionAge = Math.max(
    minimumStatePensionAge,
    settings.lifeExpectancy,
  );
  const currentStatePensionAge = calculateStatePensionDrawAge(
    settings.dateOfBirth,
    value,
  );
  const [draftValue, setDraftValue] = useState<number | null>(null);
  const [draftExactValue, setDraftExactValue] = useState<string | null>(null);
  const parsedDraftExactValue =
    draftExactValue === null || draftExactValue.trim() === ""
      ? Number.NaN
      : Number(draftExactValue);
  const hasValidDraftExactValue =
    Number.isFinite(parsedDraftExactValue) &&
    parsedDraftExactValue >= minimumStatePensionAge &&
    parsedDraftExactValue <= maximumStatePensionAge;
  const displayedRangeValue = hasValidDraftExactValue
    ? parsedDraftExactValue
    : Math.min(
        maximumStatePensionAge,
        Math.max(minimumStatePensionAge, draftValue ?? currentStatePensionAge),
      );
  const displayedExactValue = draftExactValue ?? displayedRangeValue.toString();
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  const commitAgeValue = (nextValue: number) => {
    const normalizedAge = normalizeStatePensionDrawAge(
      Math.min(maximumStatePensionAge, Math.max(minimumStatePensionAge, nextValue)),
      settings.dateOfBirth,
    );

    onChange(
      "statePensionDrawDate",
      calculateStatePensionDrawDateFromAge(settings.dateOfBirth, normalizedAge),
    );
    setDraftValue(null);
    setDraftExactValue(null);
  };

  const updateDraftExactValue = (nextDraftValue: string) => {
    const parsedValue = Number(nextDraftValue);

    if (
      nextDraftValue.trim() !== "" &&
      Number.isFinite(parsedValue) &&
      parsedValue >= minimumStatePensionAge &&
      parsedValue <= maximumStatePensionAge
    ) {
      setDraftValue(parsedValue);
    }
  };

  const normalizeExactValue = (nextDraftValue: string) => {
    const parsedValue = Number(nextDraftValue);
    const nextValue =
      nextDraftValue.trim() === "" || !Number.isFinite(parsedValue)
        ? displayedRangeValue
        : parsedValue;

    commitAgeValue(nextValue);
  };

  return (
    <div className={getFieldCardClassName(disabled, hideOnMobile, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <div className="range-control-grid">
        <div className="range-slider-group">
          <input
            aria-label={field.label}
            className="range-input"
            type="range"
            min={minimumStatePensionAge}
            max={maximumStatePensionAge}
            step={0.25}
            value={displayedRangeValue}
            disabled={disabled}
            aria-invalid={Boolean(validationIssue) || undefined}
            aria-describedby={validationId}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setDraftValue(nextValue);
              setDraftExactValue(null);
            }}
            onMouseUp={(event) => commitAgeValue(Number(event.currentTarget.value))}
            onTouchEnd={(event) => commitAgeValue(Number(event.currentTarget.value))}
            onBlur={(event) => commitAgeValue(Number(event.currentTarget.value))}
          />
          <div className="range-scale">
            <span>{formatAgeValue(minimumStatePensionAge)}</span>
            <span>{formatAgeValue(maximumStatePensionAge)}</span>
          </div>
        </div>
        <input
          aria-label={`${field.label} exact value`}
          className="number-input"
          type="number"
          min={minimumStatePensionAge}
          max={maximumStatePensionAge}
          step={0.25}
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
            updateDraftExactValue(nextDraftValue);
          }}
          onBlur={(event) => {
            normalizeExactValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              normalizeExactValue(event.currentTarget.value);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      <button
        type="button"
        className="secondary-button field-reset-button"
        aria-label="Reset State Pension start age to default value"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          onChange(
            "statePensionDrawDate",
            calculateStatePensionDrawDateFromAge(
              settings.dateOfBirth,
              minimumStatePensionAge,
            ),
          );
          setDraftValue(null);
          setDraftExactValue(null);
        }}
      >
        {`Reset to default (State Pension age ${formatAgeValue(minimumStatePensionAge)})`}
      </button>
      <FieldHelp field={field} showGuidanceNotes={showGuidanceNotes} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

export function YearSettingField({
  field,
  value,
  onChange,
  showGuidanceNotes,
  validationIssue,
}: {
  field: DateField & { type: "year" };
  value: string;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const draftYear = getAlphaAbsYear(value);
  const currentYear = new Date().getUTCFullYear();
  const firstAbsYear = 2015;
  const resetValue = defaultSettings[field.id];
  const yearOptions = Array.from(
    { length: currentYear - firstAbsYear + 1 },
    (_, index) => currentYear - index,
  );

  return (
    <YearSettingFieldEditor
      field={field}
      initialYear={draftYear.toString()}
      resetValue={resetValue}
      yearOptions={yearOptions}
      onChange={onChange}
      showGuidanceNotes={showGuidanceNotes}
      validationIssue={validationIssue}
    />
  );
}

function YearSettingFieldEditor({
  field,
  initialYear,
  resetValue,
  yearOptions,
  onChange,
  showGuidanceNotes,
  validationIssue,
}: {
  field: DateField & { type: "year" };
  initialYear: string;
  resetValue: PensionSettings[typeof field.id];
  yearOptions: number[];
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const [localYear, setLocalYear] = useState(initialYear);
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  return (
    <label className={getFieldCardClassName(false, false, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <select
        aria-label={field.label}
        className="select-input"
        value={localYear}
        aria-invalid={Boolean(validationIssue) || undefined}
        aria-describedby={validationId}
        onChange={(event) => {
          setLocalYear(event.target.value);
        }}
        onBlur={(event) => {
          onChange(field.id, event.target.value);
        }}
      >
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="secondary-button field-reset-button"
        aria-label={`Reset ${field.label} to default value`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setLocalYear(String(resetValue));
          onChange(field.id, resetValue);
        }}
      >
        {`Reset to default (${resetValue})`}
      </button>
      <FieldHelp field={field} showGuidanceNotes={showGuidanceNotes} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </label>
  );
}

export function DateSelectField({
  label,
  value,
  onChange,
  idPrefix,
  yearRange,
  disabled = false,
  describedBy,
  hasValidationIssue = false,
}: DateSelectFieldProps) {
  const parts = getDateParts(value);
  const selectedYear = Number(parts.year);
  const selectedMonth = Number(parts.month);
  const minYear = Math.min(
    yearRange.min,
    Number.isFinite(selectedYear) ? selectedYear : yearRange.min,
  );
  const maxYear = Math.max(
    yearRange.max,
    Number.isFinite(selectedYear) ? selectedYear : yearRange.max,
  );
  const yearOptions = Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => String(maxYear - index),
  );
  const dayCount = getDaysInMonth(selectedYear, selectedMonth);
  const dayOptions = Array.from({ length: dayCount }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );

  const commit = (nextParts: DateParts) => {
    const nextValue = `${nextParts.year}-${nextParts.month}-${nextParts.day}`;
    onChange(nextValue);
  };

  return (
    <div
      className="date-select-grid"
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
    >
      <label className="date-select-field" htmlFor={`${idPrefix}-day`}>
        <span className="date-select-label">Day</span>
        <select
          id={`${idPrefix}-day`}
          aria-label={`${label} day`}
          className="select-input"
          value={parts.day}
          disabled={disabled}
          aria-invalid={hasValidationIssue || undefined}
          onChange={(event) => commit({ ...parts, day: event.target.value })}
        >
          {dayOptions.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <label className="date-select-field" htmlFor={`${idPrefix}-month`}>
        <span className="date-select-label">Month</span>
        <select
          id={`${idPrefix}-month`}
          aria-label={`${label} month`}
          className="select-input"
          value={parts.month}
          disabled={disabled}
          aria-invalid={hasValidationIssue || undefined}
          onChange={(event) => {
            const nextMonth = event.target.value;
            const nextDay = clampDay(parts.day, parts.year, nextMonth);
            commit({ ...parts, month: nextMonth, day: nextDay });
          }}
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </label>

      <label className="date-select-field" htmlFor={`${idPrefix}-year`}>
        <span className="date-select-label">Year</span>
        <select
          id={`${idPrefix}-year`}
          aria-label={`${label} year`}
          className="select-input"
          value={parts.year}
          disabled={disabled}
          aria-invalid={hasValidationIssue || undefined}
          onChange={(event) => {
            const nextYear = event.target.value;
            const nextDay = clampDay(parts.day, nextYear, parts.month);
            commit({ ...parts, year: nextYear, day: nextDay });
          }}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function DateSettingField({
  field,
  value,
  settings,
  onChange,
  showGuidanceNotes,
  useDropdowns,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: DateField;
  value: string;
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  useDropdowns: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const validationId = validationIssue ? `${field.id}-validation` : undefined;
  const statePensionDefaultDrawDate =
    field.id === "statePensionDrawDate"
      ? getStatePensionDefaultDrawDate(settings)
      : undefined;

  function commitDateValue(nextValue: string) {
    const normalizedValue =
      field.id === "statePensionDrawDate"
        ? normalizeStatePensionDrawDate(nextValue, settings.dateOfBirth)
        : normalizeSetting(field.id, nextValue);

    onChange(field.id, normalizedValue);
    return normalizedValue;
  }

  return (
    <div className={getFieldCardClassName(disabled, hideOnMobile, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      {useDropdowns ? (
        <DateSelectField
          label={field.label}
          value={value}
          idPrefix={field.id}
          yearRange={getPrimaryDateYearRange(field.id, settings)}
          disabled={disabled}
          describedBy={validationId}
          hasValidationIssue={Boolean(validationIssue)}
          onChange={(nextValue) => {
            commitDateValue(nextValue);
          }}
        />
      ) : (
        <DateInputFieldEditor
          key={value}
          label={field.label}
          initialValue={value}
          min={statePensionDefaultDrawDate}
          disabled={disabled}
          describedBy={validationId}
          hasValidationIssue={Boolean(validationIssue)}
          onCommit={commitDateValue}
        />
      )}
      {statePensionDefaultDrawDate ? (
        <button
          type="button"
          className="secondary-button field-reset-button"
          aria-label="Reset State Pension draw date to default value"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange(field.id, statePensionDefaultDrawDate);
          }}
        >
          {`Reset to default (${formatDate(statePensionDefaultDrawDate)})`}
        </button>
      ) : null}
      <FieldHelp field={field} showGuidanceNotes={showGuidanceNotes} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

function getDateParts(value: string): DateParts {
  const [year = "", month = "", day = ""] = value.split("-");
  return { year, month, day };
}

function getDaysInMonth(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 31;
  }

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(day: string, year: string, month: string) {
  const maxDay = getDaysInMonth(Number(year), Number(month));
  const nextDay = Math.min(Number(day), maxDay);
  return String(nextDay).padStart(2, "0");
}
