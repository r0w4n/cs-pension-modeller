import { useEffect, useMemo, useState } from "react";
import { fieldGroups, type FieldDefinition } from "../fieldDefinitions";
import {
  deriveInflationAssumptions,
  type PensionSummary,
  type RetirementIncomeDisplay,
} from "../projection";
import {
  RetirementIncomeBridgeChart,
  type RetirementIncomeBridgeLimits,
  type RetirementIncomeBridgeParameters,
  type RetirementIncomePoint,
} from "../RetirementIncomeBridgeChart";
import type {
  PensionSettings,
  PensionValidationIssue,
} from "../settings";
import {
  OPTIONAL_SECTION_TOGGLES,
  buildComparisonStatusItems,
  clonePensionSettings,
  createBridgeAnswerResult,
  createComparisonResult,
  formatDate,
  formatDecimalAge,
  getSettingsSignature,
  type BridgeAnswerResultCache,
  type ComparisonResultCache,
  type ComparisonScenario,
  type JourneyFieldLabels,
  type JourneyStepDefinition,
  type OptionalSectionToggleKey,
} from "../app-domains";
import {
  ComparisonPanel as ComparisonPanelFeature,
  PensionSummarySection as PensionSummarySectionFeature,
} from "./comparison";
import {
  AddedPensionLumpSumsEditor as AddedPensionLumpSumsEditorFeature,
  SettingsFields as SettingsFieldsFeature,
  getValidationIssuesForField,
  type SettingsFieldOnChange,
} from "./form-fields";
import {
  InflationBasisPanel as InflationBasisPanelFeature,
  SummarySection as SummarySectionFeature,
  type SummaryItem,
  ValidationIssuesSection as ValidationIssuesSectionFeature,
} from "./results-summary";

export type JourneyStepViewModel = {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  pensionSummary: PensionSummary | null;
  retirementIncomeSeries: RetirementIncomePoint[];
  bridgeChartParameters: RetirementIncomeBridgeParameters;
  bridgeChartLimits: RetirementIncomeBridgeLimits;
  derivedInflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
  retirementIncomeDisplay: RetirementIncomeDisplay;
  retirementIncomeItems: SummaryItem[];
  retirementIncomeTitle: string;
  retirementIncomeTotal: string;
  retirementIncomeTargetTitle: string;
  retirementIncomeTarget: string;
  showGuidanceNotes: boolean;
  useDropdownDates: boolean;
  onChange: SettingsFieldOnChange;
  onChangeChartParameters: (
    patch: Partial<RetirementIncomeBridgeParameters>,
  ) => void;
  comparisonScenarios: ComparisonScenario[];
  comparisonResultCache: ComparisonResultCache;
  bridgeAnswerResultCache: BridgeAnswerResultCache;
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (scenarioSettings: PensionSettings) => void;
  onRetirementIncomeDisplayChange: (display: RetirementIncomeDisplay) => void;
  showLimitations: boolean;
  onToggleLimitations: () => void;
};

export type JourneyStepContentProps = {
  step: JourneyStepDefinition;
  viewModel: JourneyStepViewModel;
};

export function JourneyStepContent({
  step,
  viewModel,
}: JourneyStepContentProps) {
  const {
    settings,
    validationIssues,
    pensionSummary,
    retirementIncomeSeries,
    bridgeChartParameters,
    bridgeChartLimits,
    derivedInflationAssumptions,
    retirementIncomeDisplay,
    retirementIncomeItems,
    retirementIncomeTitle,
    retirementIncomeTotal,
    retirementIncomeTargetTitle,
    retirementIncomeTarget,
    showGuidanceNotes,
    useDropdownDates,
    onChange,
    onChangeChartParameters,
    comparisonScenarios,
    comparisonResultCache,
    bridgeAnswerResultCache,
    onScenariosChange,
    onLoadScenario,
    onRetirementIncomeDisplayChange,
    showLimitations,
    onToggleLimitations,
  } = viewModel;

  const currentComparisonResult = useMemo(
    () =>
      pensionSummary
        ? createComparisonResult(
            {
              id: "current-model",
              name: "Current model",
              settings: clonePensionSettings(settings),
              createdAt: "",
              updatedAt: "",
            },
            getSettingsSignature(settings),
            comparisonResultCache,
          )
        : null,
    [comparisonResultCache, pensionSummary, settings],
  );

  if (step.kind === "optional-sections") {
    return (
      <OptionalSectionToggleGrid
        settings={settings}
        onChange={onChange}
        toggleKeys={step.toggleKeys}
      />
    );
  }

  if (step.kind === "answer") {
    if (!pensionSummary) {
      return null;
    }

    return (
      <div className="journey-answer">
        {validationIssues.length > 0 ? (
          <ValidationIssuesSectionFeature validationIssues={validationIssues} />
        ) : null}

        <PensionSummarySectionFeature
          activeResult={currentComparisonResult}
          headingLevel={2}
          description="This answer updates automatically as you adjust the journey assumptions."
          retirementIncomeDisplay={retirementIncomeDisplay}
          onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
          retirementIncomeItems={retirementIncomeItems}
          retirementIncomeTitle={retirementIncomeTitle}
          retirementIncomeTotal={retirementIncomeTotal}
          retirementIncomeTargetTitle={retirementIncomeTargetTitle}
          retirementIncomeTarget={retirementIncomeTarget}
          statusItems={
            currentComparisonResult
              ? buildComparisonStatusItems(currentComparisonResult)
              : []
          }
          showLimitations={showLimitations}
          onToggleLimitations={onToggleLimitations}
        />

        <InflationBasisPanelFeature
          settings={settings}
          assumptions={derivedInflationAssumptions}
        />

        <SummarySectionFeature
          title="Key dates"
          items={[
            ...(settings.showAlpha
              ? [
                  {
                    label: "Alpha pension starts",
                    value: formatDate(pensionSummary.keyDates.startsAlphaPension),
                  },
                ]
              : []),
            ...(settings.showStatePension
              ? [
                  {
                    label: "State Pension starts",
                    value: formatDate(pensionSummary.keyDates.startsStatePension),
                  },
                ]
              : []),
            {
              label: "Normal Pension Age",
              value: formatDecimalAge(pensionSummary.calculated.normalPensionAge),
            },
          ]}
        />

        <RetirementIncomeBridgeChart
          data={retirementIncomeSeries}
          alphaLabel="Alpha pension"
          limits={bridgeChartLimits}
          statePensionEditable
          validationIssues={validationIssues}
          onChangeParameters={onChangeChartParameters}
          {...bridgeChartParameters}
        />

        <ComparisonPanelFeature
          settings={settings}
          validationIssues={validationIssues}
          scenarios={comparisonScenarios}
          comparisonResultCache={comparisonResultCache}
          onScenariosChange={onScenariosChange}
          onLoadScenario={onLoadScenario}
          retirementIncomeDisplay={retirementIncomeDisplay}
          onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
          showLimitations={showLimitations}
          onToggleLimitations={onToggleLimitations}
          derivedInflationAssumptions={derivedInflationAssumptions}
          retirementIncomeSeries={retirementIncomeSeries}
          bridgeChartParameters={bridgeChartParameters}
          bridgeChartLimits={bridgeChartLimits}
          onChangeChartParameters={onChangeChartParameters}
        />
      </div>
    );
  }

  if (step.kind === "bridge-answer") {
    return (
      <BridgeAnswer
        settings={settings}
        validationIssues={validationIssues}
        onChangeChartParameters={onChangeChartParameters}
        comparisonScenarios={comparisonScenarios}
        comparisonResultCache={comparisonResultCache}
        bridgeAnswerResultCache={bridgeAnswerResultCache}
        onScenariosChange={onScenariosChange}
        onLoadScenario={onLoadScenario}
        showLimitations={showLimitations}
        onToggleLimitations={onToggleLimitations}
      />
    );
  }

  if (step.kind === "fields") {
    return (
      <>
        <SettingsFieldsFeature
          fields={getFieldsByIds(step.fieldIds, step.fieldLabels)}
          settings={settings}
          validationIssues={validationIssues}
          onChange={onChange}
          showGuidanceNotes={showGuidanceNotes}
          useDropdownDates={useDropdownDates}
        />

        {step.fieldIds.includes("alphaAddedPensionMonthly") ? (
          <AddedPensionLumpSumsEditorFeature
            lumpSums={settings.alphaAddedPensionLumpSums}
            defaultStartDate={settings.startDate}
            useDropdownDates={useDropdownDates}
            title="Added pension lump sums"
            description="Add one-off or yearly added-pension lump sum purchases alongside the regular monthly amount."
            showFactorType
            validationIssues={getValidationIssuesForField(
              validationIssues,
              "alphaAddedPensionLumpSums",
            )}
            onChange={(nextLumpSums) =>
              onChange("alphaAddedPensionLumpSums", nextLumpSums)
            }
          />
        ) : null}
      </>
    );
  }

  return null;
}

export function OptionalSectionToggleGrid({
  settings,
  onChange,
  toggleKeys,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  toggleKeys?: readonly OptionalSectionToggleKey[];
}) {
  const visibleToggles = toggleKeys
    ? OPTIONAL_SECTION_TOGGLES.filter((toggle) => toggleKeys.includes(toggle.key))
    : OPTIONAL_SECTION_TOGGLES;

  return (
    <div className="field-grid">
      {visibleToggles.map((toggle) => (
        <label key={toggle.key} className="field-card checkbox-field-card">
          <span className="field-header">
            <span className="field-label-group">
              <span className="field-label">{toggle.label}</span>
            </span>
          </span>
          <span className="checkbox-row">
            <input
              aria-label={toggle.label}
              type="checkbox"
              checked={settings[toggle.key]}
              onChange={(event) => onChange(toggle.key, event.target.checked)}
            />
            <span>{toggle.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function BridgeAnswer({
  settings,
  validationIssues,
  onChangeChartParameters,
  comparisonScenarios,
  comparisonResultCache,
  bridgeAnswerResultCache,
  onScenariosChange,
  onLoadScenario,
  showLimitations,
  onToggleLimitations,
}: {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onChangeChartParameters: (
    patch: Partial<RetirementIncomeBridgeParameters>,
  ) => void;
  comparisonScenarios: ComparisonScenario[];
  comparisonResultCache: ComparisonResultCache;
  bridgeAnswerResultCache: BridgeAnswerResultCache;
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (scenarioSettings: PensionSettings) => void;
  showLimitations: boolean;
  onToggleLimitations: () => void;
}) {
  const [isReadyToCalculate, setIsReadyToCalculate] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsReadyToCalculate(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="journey-answer">
      {validationIssues.length > 0 ? (
        <ValidationIssuesSectionFeature validationIssues={validationIssues} />
      ) : null}
      {!isReadyToCalculate ? (
        <section className="summary-section summary-section--feature" aria-live="polite">
          <div className="summary-section-header">
            <h4>Preparing your result</h4>
            <p className="section-copy">
              We are lining up the bridge calculation and comparison view.
            </p>
          </div>
        </section>
      ) : null}

      <BridgeAnswerResults
        settings={settings}
        validationIssues={validationIssues}
        onChangeChartParameters={onChangeChartParameters}
        comparisonScenarios={comparisonScenarios}
        comparisonResultCache={comparisonResultCache}
        bridgeAnswerResultCache={bridgeAnswerResultCache}
        onScenariosChange={onScenariosChange}
        onLoadScenario={onLoadScenario}
        showLimitations={showLimitations}
        onToggleLimitations={onToggleLimitations}
      />
    </div>
  );
}

function BridgeAnswerResults({
  settings,
  validationIssues,
  onChangeChartParameters,
  comparisonScenarios,
  comparisonResultCache,
  bridgeAnswerResultCache,
  onScenariosChange,
  onLoadScenario,
  showLimitations,
  onToggleLimitations,
}: {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onChangeChartParameters: (
    patch: Partial<RetirementIncomeBridgeParameters>,
  ) => void;
  comparisonScenarios: ComparisonScenario[];
  comparisonResultCache: ComparisonResultCache;
  bridgeAnswerResultCache: BridgeAnswerResultCache;
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (scenarioSettings: PensionSettings) => void;
  showLimitations: boolean;
  onToggleLimitations: () => void;
}) {
  const {
    bridgeChartData,
    bridgeChartParameters,
    bridgeChartLimits,
    derivedInflationAssumptions,
  } = useMemo(
    () => createBridgeAnswerResult(settings, bridgeAnswerResultCache),
    [bridgeAnswerResultCache, settings],
  );

  return (
    <div className="journey-answer">
      {validationIssues.length > 0 ? (
        <ValidationIssuesSectionFeature validationIssues={validationIssues} />
      ) : null}

      <ComparisonPanelFeature
        settings={settings}
        validationIssues={validationIssues}
        scenarios={comparisonScenarios}
        comparisonResultCache={comparisonResultCache}
        onScenariosChange={onScenariosChange}
        onLoadScenario={onLoadScenario}
        retirementIncomeDisplay="annual"
        showLimitations={showLimitations}
        onToggleLimitations={onToggleLimitations}
        derivedInflationAssumptions={derivedInflationAssumptions}
        retirementIncomeSeries={bridgeChartData}
        bridgeChartParameters={bridgeChartParameters}
        bridgeChartLimits={bridgeChartLimits}
        onChangeChartParameters={onChangeChartParameters}
      />
    </div>
  );
}

function getFieldsByIds(
  fieldIds: readonly FieldDefinition["id"][],
  fieldLabels: JourneyFieldLabels = {},
) {
  return fieldIds
    .map((fieldId) => {
      const field = fieldGroups
        .flatMap((group) => group.fields)
        .find((candidate) => candidate.id === fieldId);

      if (!field) {
        return undefined;
      }

      return fieldLabels[fieldId] ? { ...field, label: fieldLabels[fieldId] } : field;
    })
    .filter((field): field is FieldDefinition => Boolean(field));
}
