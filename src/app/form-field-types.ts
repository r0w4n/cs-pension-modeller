import type { FieldDefinition, SettingsKey } from "../fieldDefinitions";
import type {
  AddedPensionLumpSum,
  PensionSettings,
  PensionValidationIssue,
} from "../settings";

export type SettingsFieldOnChange = <K extends SettingsKey>(
  key: K,
  value: PensionSettings[K]
) => void;

export type FieldProps = {
  field: FieldDefinition;
  value: PensionSettings[SettingsKey];
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  useDropdownDates: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
};

export type DateParts = {
  year: string;
  month: string;
  day: string;
};

export type DateSelectFieldProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  idPrefix: string;
  yearRange: {
    min: number;
    max: number;
  };
  disabled?: boolean;
  describedBy?: string;
  hasValidationIssue?: boolean;
};

export type MonthSelectFieldProps = Omit<DateSelectFieldProps, "value"> & {
  value: string;
};

export type AddedPensionLumpSumsEditorProps = {
  lumpSums: AddedPensionLumpSum[];
  defaultStartDate: string;
  useDropdownDates: boolean;
  title?: string;
  description?: string;
  emptyText?: string;
  itemLabel?: string;
  addButtonLabel?: string;
  removeButtonLabel?: string;
  showFactorType?: boolean;
  validationIssues?: PensionValidationIssue[];
  onChange: (nextLumpSums: AddedPensionLumpSum[]) => void;
};
