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
import {
  type FlexibleFundAccountId,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import {
  buildComparisonStatusItems,
  clonePensionSettings,
  createComparisonResult,
  formatDate,
  formatDecimalAge,
  getSettingsSignature,
  getWithdrawalStrategyFieldId,
  isExpertRetirementIncomeTargetStep,
  isSpendingSmileEditorStep,
  type ComparisonResultCache,
  type ComparisonScenario,
  type IncomeAgeRangeItem,
  type FlexibleWithdrawalSummary,
  type TargetBasedWithdrawalPreview,
  type JourneyFieldDescriptions,
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
  useMobileDateDropdowns,
  type SettingsFieldOnChange,
} from "./form-fields";
import {
  InflationBasisPanel as InflationBasisPanelFeature,
  SummarySection as SummarySectionFeature,
  ValidationIssuesSection as ValidationIssuesSectionFeature,
  ResultsSummarySection,
} from "./results-summary";
import { SettingsGroupSupplementaryEditor } from "./settings-group-supplementary-editor";
import { SpendingSmileEditor } from "./spending-smile-editor";
import { FlexibleWithdrawalPriorityEditor } from "./flexible-withdrawal-priority-editor";

export type JourneyStepViewModel = {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  pensionSummary: PensionSummary | null;
  retirementIncomeSeries: RetirementIncomePoint[];
  bridgeChartParameters: RetirementIncomeBridgeParameters;
  bridgeChartLimits: RetirementIncomeBridgeLimits;
  derivedInflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
  flexibleWithdrawalSummary: FlexibleWithdrawalSummary;
  targetBasedWithdrawalPreviews: TargetBasedWithdrawalPreview[];
  projectionRows: ProjectionRow[];
  retirementIncomeDisplay: RetirementIncomeDisplay;
  incomeAgeRangeItems: IncomeAgeRangeItem[];
  comparisonRetirementIncomeDisplay: RetirementIncomeDisplay;
  showGuidanceNotes: boolean;
  useDropdownDates: boolean;
  onChange: SettingsFieldOnChange;
  onChangeChartParameters: (
    patch: Partial<RetirementIncomeBridgeParameters>
  ) => void;
  comparisonScenarios: ComparisonScenario[];
  comparisonResultCache: ComparisonResultCache;
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (scenarioSettings: PensionSettings) => void;
  onRetirementIncomeDisplayChange: (display: RetirementIncomeDisplay) => void;
  onComparisonRetirementIncomeDisplayChange: (
    display: RetirementIncomeDisplay
  ) => void;
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
  const shouldRenderProjectionTable =
    !useMobileDateDropdowns("(max-width: 640px)");

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
    return renderExpertAnswerStep(
      viewModel,
      currentComparisonResult,
      shouldRenderProjectionTable
    );
  }

  if (step.kind === "bridge-answer") {
    return renderBridgeAnswerStep(
      step as JourneyStepDefinition & {
        kind: "bridge-answer";
        showProjectionTable?: boolean;
      },
      viewModel,
      currentComparisonResult,
      shouldRenderProjectionTable
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
  const { settings, validationIssues, onChange } = viewModel;
  const toggleKeys = step.toggleKeys;

  return (
    <>
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
    incomeAgeRangeItems,
    comparisonRetirementIncomeDisplay,
    comparisonScenarios,
    comparisonResultCache,
    onScenariosChange,
    onLoadScenario,
    onRetirementIncomeDisplayChange,
    onComparisonRetirementIncomeDisplayChange,
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
        description="Based on your selected retirement age, target income, pension start dates and bridge strategy."
        retirementIncomeDisplay={retirementIncomeDisplay}
        onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
        incomeAgeRangeItems={incomeAgeRangeItems}
        statusItems={buildStatusItems(currentComparisonResult)}
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
        retirementIncomeDisplay={comparisonRetirementIncomeDisplay}
        onRetirementIncomeDisplayChange={
          onComparisonRetirementIncomeDisplayChange
        }
        derivedInflationAssumptions={derivedInflationAssumptions}
        retirementIncomeSeries={retirementIncomeSeries}
        bridgeChartParameters={bridgeChartParameters}
        bridgeChartLimits={bridgeChartLimits}
        hideInactiveLegendItems
        showPensionSummary={false}
        onChangeChartParameters={onChangeChartParameters}
      />
    </>
  );
}

function renderExpertAnswerStep(
  viewModel: JourneyStepViewModel,
  currentComparisonResult: ReturnType<typeof createComparisonResult>,
  shouldRenderProjectionTable: boolean
) {
  const {
    settings,
    validationIssues,
    retirementIncomeSeries,
    bridgeChartParameters,
    bridgeChartLimits,
    derivedInflationAssumptions,
    flexibleWithdrawalSummary,
    targetBasedWithdrawalPreviews,
    projectionRows,
    retirementIncomeDisplay,
    incomeAgeRangeItems,
    comparisonRetirementIncomeDisplay,
    comparisonScenarios,
    comparisonResultCache,
    onScenariosChange,
    onLoadScenario,
    onRetirementIncomeDisplayChange,
    onComparisonRetirementIncomeDisplayChange,
    onChangeChartParameters,
    onChange,
  } = viewModel;

  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

      <ResultsSummarySection>
        <PensionSummarySectionFeature
          activeResult={currentComparisonResult}
          headingLevel={2}
          description="Based on your selected retirement age, target income, pension start dates and bridge strategy.."
          retirementIncomeDisplay={retirementIncomeDisplay}
          onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
          incomeAgeRangeItems={incomeAgeRangeItems}
          statusItems={buildStatusItems(currentComparisonResult)}
          flexibleWithdrawalSummary={flexibleWithdrawalSummary}
          targetBasedWithdrawalPreviews={targetBasedWithdrawalPreviews}
          onApplyTargetBasedStrategy={(accountId) =>
            applyTargetBasedStrategy(onChange, accountId)
          }
          onReviewWithdrawalStrategy={reviewWithdrawalStrategy}
        />
      </ResultsSummarySection>

      <InflationBasisPanelFeature
        settings={settings}
        assumptions={derivedInflationAssumptions}
      />

      <RetirementIncomeBridgeChart
        data={retirementIncomeSeries}
        alphaLabel="Alpha pension"
        showFlexibleWithdrawalInsights
        residualFlexibleFundInsights={
          flexibleWithdrawalSummary.residualAccounts
        }
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
          retirementIncomeDisplay={comparisonRetirementIncomeDisplay}
          onRetirementIncomeDisplayChange={
            onComparisonRetirementIncomeDisplayChange
          }
          showPensionSummary={false}
        />
      </ComparisonSection>

      {shouldRenderProjectionTable ? (
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

function renderBridgeAnswerStep(
  step: JourneyStepDefinition & {
    kind: "bridge-answer";
    showProjectionTable?: boolean;
  },
  viewModel: JourneyStepViewModel,
  currentComparisonResult: ReturnType<typeof createComparisonResult>,
  shouldRenderProjectionTable: boolean
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
    incomeAgeRangeItems,
    comparisonRetirementIncomeDisplay,
    comparisonScenarios,
    comparisonResultCache,
    onScenariosChange,
    onLoadScenario,
    onRetirementIncomeDisplayChange,
    onComparisonRetirementIncomeDisplayChange,
    onChangeChartParameters,
  } = viewModel;

  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

      <ResultsSummarySection>
        <PensionSummarySectionFeature
          activeResult={currentComparisonResult}
          headingLevel={2}
          description="This summary uses your current journey assumptions and shows projected income by age range."
          retirementIncomeDisplay={retirementIncomeDisplay}
          onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
          incomeAgeRangeItems={incomeAgeRangeItems}
          statusItems={buildStatusItems(currentComparisonResult, {
            hideBridgeFundingSection: Boolean(step.hideBridgeFundingSection),
          })}
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
          retirementIncomeDisplay={comparisonRetirementIncomeDisplay}
          onRetirementIncomeDisplayChange={
            onComparisonRetirementIncomeDisplayChange
          }
          hideInactiveLegendItems={Boolean(step.hideInactiveLegendItems)}
          hideBridgeFundingSection={Boolean(step.hideBridgeFundingSection)}
          hideFlexibleAssetsSection={Boolean(step.hideFlexibleAssetsSection)}
          showPensionSummary={false}
        />
      </ComparisonSection>

      {step.showProjectionTable !== false && shouldRenderProjectionTable ? (
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
    fieldDescriptions?: JourneyFieldDescriptions;
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
        fields={getFieldsByIds(
          step.fieldIds,
          step.fieldLabels,
          step.fieldDescriptions
        )}
        settings={settings}
        validationIssues={validationIssues}
        onChange={onChange}
        showGuidanceNotes={showGuidanceNotes}
        useDropdownDates={useDropdownDates}
        flexibleWithdrawalSummary={
          step.id.startsWith("expert-")
            ? viewModel.flexibleWithdrawalSummary
            : undefined
        }
      >
        {isSpendingSmileEditorStep(step.id) ? (
          <SpendingSmileEditor
            settings={settings}
            validationIssues={validationIssues}
            onChange={onChange}
          />
        ) : null}
        {isExpertRetirementIncomeTargetStep(step.id) ? (
          <FlexibleWithdrawalPriorityEditor
            settings={settings}
            onChange={onChange}
          />
        ) : null}
      </SettingsFieldsFeature>

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

function applyTargetBasedStrategy(
  onChange: SettingsFieldOnChange,
  accountId: FlexibleFundAccountId
) {
  const fieldId = getWithdrawalStrategyFieldId(accountId);
  onChange(fieldId, "meet_income_target");
}

function reviewWithdrawalStrategy(accountId: FlexibleFundAccountId) {
  const fieldId = getWithdrawalStrategyFieldId(accountId);
  const groupId = accountId === "csAvc" ? "cs-avc" : accountId;
  const existingField = document.getElementById(fieldId);

  if (existingField) {
    existingField.focus();
    existingField.scrollIntoView({ block: "center" });
    return;
  }

  const stepButton = document.querySelector<HTMLButtonElement>(
    `.journey-step-button[data-step-id="expert-${groupId}"]`
  );

  stepButton?.click();
  window.requestAnimationFrame(() => {
    const field = document.getElementById(fieldId);
    field?.focus();
    field?.scrollIntoView({ block: "center" });
  });
}

function buildStatusItems(
  currentComparisonResult: ReturnType<typeof createComparisonResult>,
  options: { hideBridgeFundingSection?: boolean } = {}
) {
  return currentComparisonResult
    ? buildComparisonStatusItems(currentComparisonResult, options)
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
  fieldLabels: JourneyFieldLabels = {},
  fieldDescriptions: JourneyFieldDescriptions = {}
) {
  return fieldIds
    .map((fieldId) => {
      const field = fieldGroups
        .flatMap((group) => group.fields)
        .find((candidate) => candidate.id === fieldId);

      if (!field) {
        return undefined;
      }

      return {
        ...field,
        ...(fieldLabels[fieldId] ? { label: fieldLabels[fieldId] } : {}),
        ...(fieldDescriptions[fieldId]
          ? { description: fieldDescriptions[fieldId] }
          : {}),
      };
    })
    .filter((field): field is FieldDefinition => Boolean(field));
}
