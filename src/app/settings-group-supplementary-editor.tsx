import type { PensionValidationIssue, PensionSettings } from "../settings";
import {
  AddedPensionLumpSumsEditor as AddedPensionLumpSumsEditorFeature,
  getValidationIssuesForField,
  type SettingsFieldOnChange,
} from "./form-fields";
import { AdditionalGuaranteedIncomeEditor } from "./form-field-additional-guaranteed-income";

export function SettingsGroupSupplementaryEditor({
  groupId,
  settings,
  validationIssues,
  onChange,
  useDropdownDates,
}: {
  groupId: string;
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onChange: SettingsFieldOnChange;
  useDropdownDates: boolean;
}) {
  if (groupId === "alpha") {
    return (
      <AddedPensionLumpSumsEditorFeature
        lumpSums={settings.alphaAddedPensionLumpSums}
        defaultStartDate={settings.startDate}
        useDropdownDates={useDropdownDates}
        showFactorType
        validationIssues={getValidationIssuesForField(
          validationIssues,
          "alphaAddedPensionLumpSums"
        )}
        onChange={(nextLumpSums) =>
          onChange("alphaAddedPensionLumpSums", nextLumpSums)
        }
      />
    );
  }

  if (groupId === "sipp") {
    return (
      <AddedPensionLumpSumsEditorFeature
        lumpSums={settings.sippLumpSums}
        defaultStartDate={settings.startDate}
        useDropdownDates={useDropdownDates}
        title="SIPP lump sums"
        description="Add one-off or yearly lump sum contributions. A yearly entry repeats on the same calendar date until its end date."
        emptyText="No SIPP lump sum contributions set up yet."
        itemLabel="SIPP lump sum"
        addButtonLabel="Add SIPP lump sum"
        removeButtonLabel="Remove SIPP lump sum"
        validationIssues={getValidationIssuesForField(
          validationIssues,
          "sippLumpSums"
        )}
        onChange={(nextLumpSums) => onChange("sippLumpSums", nextLumpSums)}
      />
    );
  }

  if (groupId === "isa") {
    return (
      <AddedPensionLumpSumsEditorFeature
        lumpSums={settings.isaLumpSums}
        defaultStartDate={settings.startDate}
        useDropdownDates={useDropdownDates}
        title="ISA lump sums"
        description="Add one-off or yearly lump sum ISA contributions. A yearly entry repeats on the same calendar date until its end date."
        emptyText="No ISA lump sum contributions set up yet."
        itemLabel="ISA lump sum"
        addButtonLabel="Add ISA lump sum"
        removeButtonLabel="Remove ISA lump sum"
        validationIssues={getValidationIssuesForField(
          validationIssues,
          "isaLumpSums"
        )}
        onChange={(nextLumpSums) => onChange("isaLumpSums", nextLumpSums)}
      />
    );
  }

  if (groupId === "additional-income") {
    return (
      <AdditionalGuaranteedIncomeEditor
        incomes={settings.additionalGuaranteedIncomes}
        defaultStartAge={settings.requirementAge}
        validationIssues={getValidationIssuesForField(
          validationIssues,
          "additionalGuaranteedIncomes"
        )}
        onChange={(nextIncomes) =>
          onChange("additionalGuaranteedIncomes", nextIncomes)
        }
      />
    );
  }

  return null;
}
