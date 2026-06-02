import { useMemo } from "react";
import { fieldGroups, type FieldDefinition } from "../fieldDefinitions";
import {
  deriveInflationAssumptions,
  type PensionSummary,
  type RetirementIncomeDisplay,
  type ProjectionRow,
} from "../projection";
import {
  RetirementIncomeBridgeChart,
  type RetirementIncomeBridgeLimits,
  type RetirementIncomeBridgeParameters,
  type RetirementIncomePoint,
} from "../RetirementIncomeBridgeChart";
import { type PensionSettings, type PensionValidationIssue } from "../settings";
import {
  buildComparisonStatusItems,
  clonePensionSettings,
  createComparisonResult,
  formatDate,
  formatDecimalAge,
  getSettingsSignature,
  type ComparisonResultCache,
  type ComparisonScenario,
  type JourneyFieldLabels,
  type JourneyStepDefinition,
  type OptionalSectionToggleKey,
} from "../app-domains";
import { ComparisonBridgeChart } from "./chart";
import {
  ComparisonPanel as ComparisonPanelFeature,
  ComparisonSection,
  PensionSummarySection as PensionSummarySectionFeature,
} from "./comparison";
import { OptionalSectionToggleGrid } from "./optional-section-toggle-grid";
import {
  ProjectionTableSection as ProjectionTableSectionFeature,
  ProjectionTableSectionContainer,
} from "./projection-table";
import {
  SettingsFields as SettingsFieldsFeature,
  type SettingsFieldOnChange,
} from "./form-fields";
import {
  InflationBasisPanel as InflationBasisPanelFeature,
  SummarySection as SummarySectionFeature,
  type SummaryItem,
  ValidationIssuesSection as ValidationIssuesSectionFeature,
  ResultsSummarySection,
} from "./results-summary";
import { SettingsGroupSupplementaryEditor } from "./settings-group-supplementary-editor";

export type JourneyStepViewModel = {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  pensionSummary: PensionSummary | null;
  retirementIncomeSeries: RetirementIncomePoint[];
  bridgeChartParameters: RetirementIncomeBridgeParameters;
  bridgeChartLimits: RetirementIncomeBridgeLimits;
  derivedInflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
  projectionRows: ProjectionRow[];
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
    patch: Partial<RetirementIncomeBridgeParameters>
  ) => void;
  onReset: () => void;
  onExport: () => void;
  comparisonScenarios: ComparisonScenario[];
  comparisonResultCache: ComparisonResultCache;
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
  const { settings, comparisonResultCache } = viewModel;

  const currentComparisonResult = useMemo(
    () =>
      createComparisonResult(
        {
          id: "current-model",
          name: "Current model",
          settings: clonePensionSettings(settings),
          createdAt: "",
          updatedAt: "",
        },
        getSettingsSignature(settings),
        comparisonResultCache
      ),
    [comparisonResultCache, settings]
  );

  if (step.kind === "optional-sections") {
    return renderOptionalSectionsStep(
      step as JourneyStepDefinition & {
        kind: "optional-sections";
        toggleKeys?: readonly OptionalSectionToggleKey[];
      },
      viewModel
    );
  }

  if (step.kind === "answer") {
    return renderAnswerStep(viewModel, currentComparisonResult);
  }

  if (step.kind === "expert-answer") {
    return renderExpertAnswerStep(viewModel, currentComparisonResult);
  }

  if (step.kind === "bridge-answer") {
    return renderBridgeAnswerStep(
      step as JourneyStepDefinition & {
        kind: "bridge-answer";
        showProjectionTable?: boolean;
      },
      viewModel,
      currentComparisonResult
    );
  }

  if (step.kind === "fields") {
    return renderFieldsStep(step, viewModel);
  }

  return null;
}

function renderOptionalSectionsStep(
  step: JourneyStepDefinition & {
    kind: "optional-sections";
    toggleKeys?: readonly OptionalSectionToggleKey[];
  },
  viewModel: JourneyStepViewModel
) {
  const { settings, validationIssues, onChange, onReset, onExport } = viewModel;
  const toggleKeys = step.toggleKeys;

  return (
    <>
      {step.id === "optional-sections" ? (
        <div className="settings-panel-actions">
          <button type="button" className="secondary-button" onClick={onExport}>
            Export parameters
          </button>
          <button
            type="button"
            className="secondary-button settings-reset-button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onReset}
          >
            Reset parameters
          </button>
        </div>
      ) : null}

      <ValidationSummary validationIssues={validationIssues} />

      <OptionalSectionToggleGrid
        settings={settings}
        onChange={onChange}
        toggleKeys={toggleKeys}
      />
    </>
  );
}

function renderAnswerStep(
  viewModel: JourneyStepViewModel,
  currentComparisonResult: ReturnType<typeof createComparisonResult>
) {
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
    comparisonScenarios,
    comparisonResultCache,
    onScenariosChange,
    onLoadScenario,
    onRetirementIncomeDisplayChange,
    showLimitations,
    onToggleLimitations,
    onChangeChartParameters,
  } = viewModel;

  if (!pensionSummary) {
    return null;
  }

  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

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
        statusItems={buildStatusItems(currentComparisonResult)}
        showLimitations={showLimitations}
        onToggleLimitations={onToggleLimitations}
      />

      <InflationBasisPanelFeature
        settings={settings}
        assumptions={derivedInflationAssumptions}
      />

      <SummarySectionFeature
        title="Key dates"
        items={buildKeyDateItems(settings, pensionSummary)}
      />

      <RetirementIncomeBridgeChart
        data={retirementIncomeSeries}
        alphaLabel="Alpha pension"
        hideInactiveLegendItems
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
        hideInactiveLegendItems
        onChangeChartParameters={onChangeChartParameters}
      />
    </>
  );
}

function renderExpertAnswerStep(
  viewModel: JourneyStepViewModel,
  currentComparisonResult: ReturnType<typeof createComparisonResult>
) {
  const {
    settings,
    validationIssues,
    retirementIncomeSeries,
    bridgeChartParameters,
    bridgeChartLimits,
    derivedInflationAssumptions,
    projectionRows,
    retirementIncomeDisplay,
    retirementIncomeItems,
    retirementIncomeTitle,
    retirementIncomeTotal,
    retirementIncomeTargetTitle,
    retirementIncomeTarget,
    comparisonScenarios,
    comparisonResultCache,
    onScenariosChange,
    onLoadScenario,
    onRetirementIncomeDisplayChange,
    showLimitations,
    onToggleLimitations,
    onChangeChartParameters,
  } = viewModel;

  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

      <ResultsSummarySection>
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
          statusItems={buildStatusItems(currentComparisonResult)}
          showLimitations={showLimitations}
          onToggleLimitations={onToggleLimitations}
        />
      </ResultsSummarySection>

      <InflationBasisPanelFeature
        settings={settings}
        assumptions={derivedInflationAssumptions}
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

      <ComparisonSection>
        <ComparisonPanelFeature
          settings={settings}
          validationIssues={validationIssues}
          scenarios={comparisonScenarios}
          comparisonResultCache={comparisonResultCache}
          onScenariosChange={onScenariosChange}
          onLoadScenario={onLoadScenario}
        />
      </ComparisonSection>

      <ProjectionTableSectionContainer>
        <ProjectionTableSectionFeature
          rows={projectionRows}
          settings={settings}
        />
      </ProjectionTableSectionContainer>
    </>
  );
}

function renderBridgeAnswerStep(
  step: JourneyStepDefinition & {
    kind: "bridge-answer";
    showProjectionTable?: boolean;
  },
  viewModel: JourneyStepViewModel,
  currentComparisonResult: ReturnType<typeof createComparisonResult>
) {
  const {
    settings,
    validationIssues,
    retirementIncomeSeries,
    bridgeChartParameters,
    bridgeChartLimits,
    derivedInflationAssumptions,
    projectionRows,
    retirementIncomeDisplay,
    retirementIncomeItems,
    retirementIncomeTitle,
    retirementIncomeTotal,
    retirementIncomeTargetTitle,
    retirementIncomeTarget,
    comparisonScenarios,
    comparisonResultCache,
    onScenariosChange,
    onLoadScenario,
    onRetirementIncomeDisplayChange,
    showLimitations,
    onToggleLimitations,
    onChangeChartParameters,
  } = viewModel;

  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

      <ResultsSummarySection>
        <PensionSummarySectionFeature
          activeResult={currentComparisonResult}
          headingLevel={2}
          description="This summary uses your current journey assumptions and shows your projected annual income before tax."
          retirementIncomeDisplay={retirementIncomeDisplay}
          onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
          retirementIncomeItems={retirementIncomeItems}
          retirementIncomeTitle={retirementIncomeTitle}
          retirementIncomeTotal={retirementIncomeTotal}
          retirementIncomeTargetTitle={retirementIncomeTargetTitle}
          retirementIncomeTarget={retirementIncomeTarget}
          statusItems={buildStatusItems(currentComparisonResult)}
          showLimitations={showLimitations}
          onToggleLimitations={onToggleLimitations}
        />
      </ResultsSummarySection>

      <InflationBasisPanelFeature
        settings={settings}
        assumptions={derivedInflationAssumptions}
      />

      <ComparisonBridgeChart
        retirementIncomeSeries={retirementIncomeSeries}
        bridgeChartParameters={bridgeChartParameters}
        bridgeChartLimits={bridgeChartLimits}
        hideInactiveLegendItems={Boolean(step.hideInactiveLegendItems)}
        validationIssues={validationIssues}
        onChangeChartParameters={onChangeChartParameters}
      />

      <ComparisonSection>
        <ComparisonPanelFeature
          settings={settings}
          validationIssues={validationIssues}
          scenarios={comparisonScenarios}
          comparisonResultCache={comparisonResultCache}
          onScenariosChange={onScenariosChange}
          onLoadScenario={onLoadScenario}
          hideInactiveLegendItems={Boolean(step.hideInactiveLegendItems)}
        />
      </ComparisonSection>

      {step.showProjectionTable !== false ? (
        <ProjectionTableSectionContainer>
          <ProjectionTableSectionFeature
            rows={projectionRows}
            settings={settings}
          />
        </ProjectionTableSectionContainer>
      ) : null}
    </>
  );
}

function renderFieldsStep(
  step: JourneyStepDefinition & {
    kind: "fields";
    fieldIds: readonly FieldDefinition["id"][];
    fieldLabels?: JourneyFieldLabels;
    groupId?: string;
  },
  viewModel: JourneyStepViewModel
) {
  const {
    settings,
    validationIssues,
    showGuidanceNotes,
    useDropdownDates,
    onChange,
  } = viewModel;

  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

      <SettingsFieldsFeature
        fields={getFieldsByIds(step.fieldIds, step.fieldLabels)}
        settings={settings}
        validationIssues={validationIssues}
        onChange={onChange}
        showGuidanceNotes={showGuidanceNotes}
        useDropdownDates={useDropdownDates}
      />

      {step.groupId ? (
        <SettingsGroupSupplementaryEditor
          groupId={step.groupId}
          settings={settings}
          validationIssues={validationIssues}
          onChange={onChange}
          useDropdownDates={useDropdownDates}
        />
      ) : null}
    </>
  );
}

function ValidationSummary({
  validationIssues,
}: {
  validationIssues: PensionValidationIssue[];
}) {
  return validationIssues.length > 0 ? (
    <ValidationIssuesSectionFeature validationIssues={validationIssues} />
  ) : null;
}

function buildStatusItems(
  currentComparisonResult: ReturnType<typeof createComparisonResult>
) {
  return currentComparisonResult
    ? buildComparisonStatusItems(currentComparisonResult)
    : [];
}

function buildKeyDateItems(
  settings: PensionSettings,
  pensionSummary: PensionSummary
) {
  return [
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
  ];
}

function getFieldsByIds(
  fieldIds: readonly FieldDefinition["id"][],
  fieldLabels: JourneyFieldLabels = {}
) {
  return fieldIds
    .map((fieldId) => {
      const field = fieldGroups
        .flatMap((group) => group.fields)
        .find((candidate) => candidate.id === fieldId);

      if (!field) {
        return undefined;
      }

      return fieldLabels[fieldId]
        ? { ...field, label: fieldLabels[fieldId] }
        : field;
    })
    .filter((field): field is FieldDefinition => Boolean(field));
}
