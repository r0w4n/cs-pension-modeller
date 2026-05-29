import { fieldGroups } from "../fieldDefinitions";
import { knowledgeLinks } from "../knowledgeLinks";
import { calculateStatePensionDrawAge, type PensionSettings, type PensionValidationIssue } from "../settings";
import {
  formatAgeValue,
  formatDecimalAge,
  isSettingsGroupVisible,
} from "../app-domains";
import {
  AddedPensionLumpSumsEditor as AddedPensionLumpSumsEditorFeature,
  SettingsFields as SettingsFieldsFeature,
  getValidationIssuesForField,
  type SettingsFieldOnChange,
} from "./form-fields";
import { GuidanceNotesToggle as GuidanceNotesToggleFeature } from "./journey";
import { OptionalSectionToggleGrid } from "./journey-step-content";
import {
  SummarySection as SummarySectionFeature,
  ValidationIssuesSection as ValidationIssuesSectionFeature,
} from "./results-summary";
import type { PensionSummary } from "../projection";

type SettingsPanelProps = {
  settings: PensionSettings;
  settingsFormVersion: number;
  validationIssues: PensionValidationIssue[];
  onChange: SettingsFieldOnChange;
  onReset: () => void;
  showGuidanceNotes: boolean;
  onShowGuidanceNotesChange: (checked: boolean) => void;
  useDropdownDates: boolean;
  pensionSummary: PensionSummary | null;
};

export function SettingsPanel({
  settings,
  settingsFormVersion,
  validationIssues,
  onChange,
  onReset,
  showGuidanceNotes,
  onShowGuidanceNotesChange,
  useDropdownDates,
  pensionSummary,
}: SettingsPanelProps) {
  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <h2>Your retirement assumptions</h2>
        <p className="section-copy">
          These inputs define your pension scenario, letting you see how different
          assumptions affect your outcome.
        </p>
        <button
          type="button"
          className="secondary-button settings-reset-button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onReset}
        >
          Reset parameters
        </button>
      </div>

      <div className="settings-sections" key={settingsFormVersion}>
        <ValidationIssuesSectionFeature validationIssues={validationIssues} />

        <section className="settings-section">
          <div className="section-heading">
            <h3>Optional sections</h3>
            <p className="section-copy">
              Choose which parts of the modeller are in this scenario. Hidden
              sections keep their saved values, and guidance notes can be turned
              off once the controls feel familiar.
            </p>
            <GuidanceNotesToggleFeature
              checked={showGuidanceNotes}
              onChange={onShowGuidanceNotesChange}
            />
          </div>

          <OptionalSectionToggleGrid settings={settings} onChange={onChange} />
        </section>

        {fieldGroups
          .filter((group) => isSettingsGroupVisible(group.id, settings))
          .map((group) => (
            <section className="settings-section" key={group.id}>
              <div className="section-heading">
                <h3>{group.title}</h3>
                <p className="section-copy">{group.description}</p>
              </div>

              <SettingsFieldsFeature
                fields={group.fields}
                settings={settings}
                validationIssues={validationIssues}
                onChange={onChange}
                showGuidanceNotes={showGuidanceNotes}
                useDropdownDates={useDropdownDates}
              />

              <SettingsGroupSupplementaryEditor
                groupId={group.id}
                settings={settings}
                validationIssues={validationIssues}
                onChange={onChange}
                useDropdownDates={useDropdownDates}
              />
            </section>
          ))}

        {pensionSummary ? (
          <SummarySectionFeature
            title="Calculated details"
            items={[
              {
                label: "Normal Pension Age",
                value: formatDecimalAge(pensionSummary.calculated.normalPensionAge),
              },
              ...(settings.showStatePension
                ? [
                    {
                      label: "State Pension start age",
                      value: formatAgeValue(
                        calculateStatePensionDrawAge(
                          settings.dateOfBirth,
                          settings.statePensionDrawDate,
                        ),
                      ),
                      infoUrl: knowledgeLinks.statePensionAge,
                      infoLinkText: "Check State Pension age",
                    },
                  ]
                : []),
            ]}
          />
        ) : null}
      </div>
    </section>
  );
}

function SettingsGroupSupplementaryEditor({
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
          "alphaAddedPensionLumpSums",
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
          "sippLumpSums",
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
          "isaLumpSums",
        )}
        onChange={(nextLumpSums) => onChange("isaLumpSums", nextLumpSums)}
      />
    );
  }

  return null;
}
