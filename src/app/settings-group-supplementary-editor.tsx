import type { PensionValidationIssue, PensionSettings } from "../settings";
import {
  AddedPensionLumpSumsEditor as AddedPensionLumpSumsEditorFeature,
  getValidationIssuesForField,
  type SettingsFieldOnChange,
} from "./form-fields";
import { AdditionalGuaranteedIncomeEditor } from "./form-field-additional-guaranteed-income";
import { AlphaEpaPeriodsEditor } from "./form-field-alpha-epa-periods";

export function SettingsGroupSupplementaryEditor({
  groupId,
  settings,
  validationIssues,
  onChange,
  useDropdownDates,
  domIdPrefix,
  ownerLabel,
  showDescriptions = true,
}: {
  groupId: string;
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onChange: SettingsFieldOnChange;
  useDropdownDates: boolean;
  domIdPrefix?: string;
  ownerLabel?: string;
  showDescriptions?: boolean;
}) {
  if (groupId === "alpha") {
    return (
      <>
        <AddedPensionLumpSumsEditorFeature
          lumpSums={settings.alphaAddedPensionLumpSums}
          defaultStartDate={settings.startDate}
          useDropdownDates={useDropdownDates}
          showFactorType
          description={showDescriptions ? undefined : ""}
          domIdPrefix={domIdPrefix}
          ownerLabel={ownerLabel}
          validationIssues={getValidationIssuesForField(
            validationIssues,
            "alphaAddedPensionLumpSums"
          )}
          onChange={(nextLumpSums) =>
            onChange("alphaAddedPensionLumpSums", nextLumpSums)
          }
        />
        {settings.alphaEpaEnabled ? (
          <AlphaEpaPeriodsEditor
            periods={settings.alphaEpaPeriods}
            defaultStartDate={settings.startDate}
            validationIssues={getValidationIssuesForField(
              validationIssues,
              "alphaEpaPeriods"
            )}
            domIdPrefix={domIdPrefix}
            ownerLabel={ownerLabel}
            showDescription={showDescriptions}
            onChange={(periods) => onChange("alphaEpaPeriods", periods)}
          />
        ) : null}
      </>
    );
  }

  if (groupId === "alpha-epa" && settings.alphaEpaEnabled) {
    return (
      <AlphaEpaPeriodsEditor
        periods={settings.alphaEpaPeriods}
        defaultStartDate={settings.startDate}
        validationIssues={getValidationIssuesForField(
          validationIssues,
          "alphaEpaPeriods"
        )}
        domIdPrefix={domIdPrefix}
        ownerLabel={ownerLabel}
        showDescription={showDescriptions}
        onChange={(periods) => onChange("alphaEpaPeriods", periods)}
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
        description={
          showDescriptions
            ? "Add one-off or yearly lump sum contributions. A yearly entry repeats on the same calendar date until its end date."
            : ""
        }
        emptyText="No SIPP lump sum contributions set up yet."
        itemLabel="SIPP lump sum"
        addButtonLabel="Add SIPP lump sum"
        removeButtonLabel="Remove SIPP lump sum"
        domIdPrefix={domIdPrefix}
        ownerLabel={ownerLabel}
        validationIssues={getValidationIssuesForField(
          validationIssues,
          "sippLumpSums"
        )}
        onChange={(nextLumpSums) => onChange("sippLumpSums", nextLumpSums)}
      />
    );
  }

  if (groupId === "cs-avc") {
    return (
      <AddedPensionLumpSumsEditorFeature
        lumpSums={settings.csAvcLumpSums}
        defaultStartDate={settings.startDate}
        useDropdownDates={useDropdownDates}
        title="CS AVC lump sums"
        description={
          showDescriptions
            ? "Add one-off or yearly lump sum CS AVC contributions. A yearly entry repeats on the same calendar date until its end date."
            : ""
        }
        emptyText="No CS AVC lump sum contributions set up yet."
        itemLabel="CS AVC lump sum"
        addButtonLabel="Add CS AVC lump sum"
        removeButtonLabel="Remove CS AVC lump sum"
        domIdPrefix={domIdPrefix}
        ownerLabel={ownerLabel}
        validationIssues={getValidationIssuesForField(
          validationIssues,
          "csAvcLumpSums"
        )}
        onChange={(nextLumpSums) => onChange("csAvcLumpSums", nextLumpSums)}
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
        description={
          showDescriptions
            ? "Add one-off or yearly lump sum ISA contributions. A yearly entry repeats on the same calendar date until its end date."
            : ""
        }
        emptyText="No ISA lump sum contributions set up yet."
        itemLabel="ISA lump sum"
        addButtonLabel="Add ISA lump sum"
        removeButtonLabel="Remove ISA lump sum"
        domIdPrefix={domIdPrefix}
        ownerLabel={ownerLabel}
        validationIssues={getValidationIssuesForField(
          validationIssues,
          "isaLumpSums"
        )}
        onChange={(nextLumpSums) => onChange("isaLumpSums", nextLumpSums)}
      />
    );
  }

  if (groupId === "lisa") {
    return (
      <AddedPensionLumpSumsEditorFeature
        lumpSums={settings.lisaLumpSums}
        defaultStartDate={settings.startDate}
        useDropdownDates={useDropdownDates}
        title="LISA lump sums"
        description={
          showDescriptions
            ? "Add one-off or yearly LISA contributions. Regular and lump-sum LISA additions share the £4,000 tax-year limit; this modeller does not validate the combined overall ISA allowance."
            : ""
        }
        emptyText="No LISA lump sum contributions set up yet."
        itemLabel="LISA lump sum"
        addButtonLabel="Add LISA lump sum"
        removeButtonLabel="Remove LISA lump sum"
        domIdPrefix={domIdPrefix}
        ownerLabel={ownerLabel}
        validationIssues={getValidationIssuesForField(
          validationIssues,
          "lisaLumpSums"
        )}
        onChange={(nextLumpSums) => onChange("lisaLumpSums", nextLumpSums)}
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
        domIdPrefix={domIdPrefix}
        ownerLabel={ownerLabel}
        onChange={(nextIncomes) => {
          if (!settings.showAdditionalGuaranteedIncome) {
            onChange("showAdditionalGuaranteedIncome", true);
          }
          onChange("additionalGuaranteedIncomes", nextIncomes);
        }}
      />
    );
  }

  return null;
}
