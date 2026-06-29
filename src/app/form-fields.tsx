import type {
  DateField,
  FieldDefinition,
  SettingsKey,
} from "../fieldDefinitions";
import type { PensionSettings, PensionValidationIssue } from "../settings";
import {
  isFieldDisabled,
  isFieldHiddenOnMobile,
  shouldRenderField,
  splitSettingsFields,
} from "../app-domains";
import { AddedPensionLumpSumsEditor } from "./form-field-lump-sums";
import {
  DateInputFieldEditor,
  DateSettingField,
  StatePensionAgeField,
  useMobileDateDropdowns,
  YearSettingField,
} from "./form-field-dates";
import type { FieldProps, SettingsFieldOnChange } from "./form-field-types";
import {
  CurrencySettingField,
  RangeSettingField,
  SelectSettingField,
} from "./form-field-values";
import {
  FieldLabel,
  FieldValidationMessage,
  getFieldCardClassName,
} from "./form-fields-shared";

type SettingsFieldsProps = {
  fields: readonly FieldDefinition[];
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  useDropdownDates: boolean;
  alphaPensionIncreaseDescription?: string;
};

export {
  AddedPensionLumpSumsEditor,
  DateInputFieldEditor,
  useMobileDateDropdowns,
};
export type { AddedPensionLumpSumsEditorProps } from "./form-field-types";
export type { SettingsFieldOnChange } from "./form-field-types";

export function SettingsFields({
  fields,
  settings,
  validationIssues,
  onChange,
  showGuidanceNotes,
  useDropdownDates,
  alphaPensionIncreaseDescription,
}: SettingsFieldsProps) {
  const { baseFields, alphaPensionIncreaseFields } =
    splitSettingsFields(fields);
  const visibleBaseFields = baseFields.filter((field) =>
    shouldRenderField(field.id, settings)
  );

  return (
    <>
      <div className="field-grid">
        {visibleBaseFields.map((field) => (
          <Field
            key={field.id}
            field={field}
            value={settings[field.id]}
            settings={settings}
            onChange={onChange}
            showGuidanceNotes={showGuidanceNotes}
            useDropdownDates={useDropdownDates}
            disabled={isFieldDisabled(field.id, settings)}
            hideOnMobile={isFieldHiddenOnMobile(field.id, settings)}
            validationIssue={getValidationIssueForField(
              validationIssues,
              field.id
            )}
          />
        ))}
      </div>

      {alphaPensionIncreaseFields.length > 0 ? (
        <div className="settings-subsection">
          <div className="settings-subsection-heading">
            <h4>Pension increases</h4>
            <p className="section-copy">
              {alphaPensionIncreaseDescription ??
                "Revalue Alpha benefits annually by CPI using the selected projection basis."}
            </p>
          </div>
          <div className="field-grid">
            {alphaPensionIncreaseFields.map((field) => (
              <Field
                key={field.id}
                field={field}
                value={settings[field.id]}
                settings={settings}
                onChange={onChange}
                showGuidanceNotes={showGuidanceNotes}
                useDropdownDates={useDropdownDates}
                disabled={isFieldDisabled(field.id, settings)}
                hideOnMobile={isFieldHiddenOnMobile(field.id, settings)}
                validationIssue={getValidationIssueForField(
                  validationIssues,
                  field.id
                )}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function getValidationIssuesForField(
  validationIssues: PensionValidationIssue[],
  fieldId: SettingsKey
) {
  return validationIssues.filter((issue) => issue.field === fieldId);
}

function Field({
  field,
  value,
  settings,
  onChange,
  showGuidanceNotes,
  useDropdownDates,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: FieldProps) {
  if (field.id === "statePensionDrawDate") {
    return (
      <StatePensionAgeField
        field={field}
        value={value as string}
        settings={settings}
        onChange={onChange}
        showGuidanceNotes={showGuidanceNotes}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "date") {
    return (
      <DateSettingField
        field={field}
        value={value as string}
        settings={settings}
        onChange={onChange}
        showGuidanceNotes={showGuidanceNotes}
        useDropdowns={useDropdownDates}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "month") {
    return (
      <DateSettingField
        field={field}
        value={value as string}
        settings={settings}
        onChange={onChange}
        showGuidanceNotes={showGuidanceNotes}
        useDropdowns={useDropdownDates}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "year") {
    return (
      <YearSettingField
        field={field as DateField & { type: "year" }}
        value={value as string}
        onChange={onChange}
        showGuidanceNotes={showGuidanceNotes}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "range") {
    return (
      <RangeSettingField
        field={field}
        value={value as number}
        settings={settings}
        onChange={onChange}
        showGuidanceNotes={showGuidanceNotes}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "select") {
    return (
      <SelectSettingField
        field={field}
        value={value as string}
        onChange={onChange}
        showGuidanceNotes={showGuidanceNotes}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "checkbox") {
    const validationId = validationIssue ? `${field.id}-validation` : undefined;

    return (
      <label
        className={`${getFieldCardClassName(false, false, Boolean(validationIssue))} checkbox-field-card`}
      >
        <span className="field-header">
          <FieldLabel field={field} showInfoLinks={showGuidanceNotes} />
        </span>
        <span className="checkbox-row">
          <input
            aria-label={field.label}
            type="checkbox"
            checked={value as boolean}
            aria-invalid={Boolean(validationIssue) || undefined}
            aria-describedby={validationId}
            onChange={(event) => onChange(field.id, event.target.checked)}
          />
          {showGuidanceNotes ? <span>{field.description}</span> : null}
        </span>
        <FieldValidationMessage id={validationId} issue={validationIssue} />
      </label>
    );
  }

  if (field.type === "currency-input") {
    return (
      <CurrencySettingField
        field={field}
        value={value as number}
        onChange={onChange}
        showGuidanceNotes={showGuidanceNotes}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  return null;
}

function getValidationIssueForField(
  validationIssues: PensionValidationIssue[],
  fieldId: FieldDefinition["id"]
) {
  return validationIssues.find((issue) => issue.field === fieldId);
}
