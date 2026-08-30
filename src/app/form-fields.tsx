import type {
  DateField,
  FieldDefinition,
  SettingsKey,
} from "../fieldDefinitions";
import type { ReactNode } from "react";
import type { PensionSettings, PensionValidationIssue } from "../settings";
import {
  isFieldDisabled,
  isFieldHiddenOnMobile,
  shouldRenderField,
} from "../app-domains";
import {
  getFlexibleFundAccountIdForStrategyField,
  type FlexibleWithdrawalSummary,
} from "../result-projection/flexible-withdrawals";
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
  children?: ReactNode;
  flexibleWithdrawalSummary?: FlexibleWithdrawalSummary;
  useNpaLinkedDefaults?: boolean;
  domIdPrefix?: string;
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
  children,
  flexibleWithdrawalSummary,
  useNpaLinkedDefaults = false,
  domIdPrefix,
}: SettingsFieldsProps) {
  const visibleFields = fields.filter((field) =>
    shouldRenderField(field.id, settings)
  );

  return (
    <div className="field-grid">
      {visibleFields.map((field) => (
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
          warning={getFlexibleWithdrawalFieldWarning(
            field.id,
            flexibleWithdrawalSummary,
            domIdPrefix
          )}
          useNpaLinkedDefaults={useNpaLinkedDefaults}
          domIdPrefix={domIdPrefix}
        />
      ))}
      {children}
    </div>
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
  warning,
  useNpaLinkedDefaults = false,
  domIdPrefix,
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
        useNpaLinkedDefaults={useNpaLinkedDefaults}
        domIdPrefix={domIdPrefix}
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
        domIdPrefix={domIdPrefix}
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
        domIdPrefix={domIdPrefix}
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
        domIdPrefix={domIdPrefix}
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
        useNpaLinkedDefaults={useNpaLinkedDefaults}
        domIdPrefix={domIdPrefix}
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
        warning={warning}
        domIdPrefix={domIdPrefix}
      />
    );
  }

  if (field.type === "checkbox") {
    const domId = getFieldDomId(field.id, domIdPrefix);
    const validationId = validationIssue ? `${domId}-validation` : undefined;
    const descriptionId = showGuidanceNotes
      ? `${domId}-description`
      : undefined;
    const describedBy = [descriptionId, validationId].filter(Boolean).join(" ");

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
            aria-describedby={describedBy || undefined}
            onChange={(event) => onChange(field.id, event.target.checked)}
          />
          {showGuidanceNotes ? (
            <span id={descriptionId}>{field.description}</span>
          ) : null}
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
        domIdPrefix={domIdPrefix}
      />
    );
  }

  return null;
}

function getFlexibleWithdrawalFieldWarning(
  fieldId: SettingsKey,
  summary?: FlexibleWithdrawalSummary,
  domIdPrefix?: string
) {
  const accountId = getFlexibleFundAccountIdForStrategyField(fieldId);

  if (!accountId || !summary) {
    return undefined;
  }

  const insight = summary.accounts.find(
    (candidate) => candidate.accountId === accountId
  );

  if (!insight) {
    return undefined;
  }

  const firstAge = insight.affectedAges[0];
  const lastAge = insight.affectedAges.at(-1);
  const ageRange =
    firstAge === lastAge
      ? `at age ${firstAge}`
      : `between ages ${firstAge} and ${lastAge}`;
  const formattedAmount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(insight.reducibleGrossWithdrawal);

  return {
    id: `${getFieldDomId(fieldId, domIdPrefix)}-withdrawal-warning`,
    message: `This strategy is projected to withdraw approximately ${formattedAmount} more than is needed to meet the income target ${ageRange}. Consider “Use to meet income target”.`,
  };
}

function getFieldDomId(fieldId: string, domIdPrefix?: string) {
  return domIdPrefix ? `${domIdPrefix}-${fieldId}` : fieldId;
}

function getValidationIssueForField(
  validationIssues: PensionValidationIssue[],
  fieldId: FieldDefinition["id"]
) {
  return validationIssues.find((issue) => issue.field === fieldId);
}
