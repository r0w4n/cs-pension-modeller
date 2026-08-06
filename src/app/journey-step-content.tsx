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
  type JourneyOptionalSectionCopy,
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
        toggleCopy?: JourneyOptionalSectionCopy;
      },
      viewModel
    );
  }

  if (step.kind === "information") {
    return renderInformationStep(step);
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

function renderInformationStep(
  step: JourneyStepDefinition & { kind: "information" }
) {
  return (
    <section className="journey-information" aria-label="About Alpha pension">
      {step.sections.map((section) => (
        <div key={section.heading} className="journey-information-section">
          <h4>{section.heading}</h4>
          <p>{section.description}</p>
        </div>
      ))}
    </section>
  );
}

function renderOptionalSectionsStep(
  step: JourneyStepDefinition & {
    kind: "optional-sections";
    toggleKeys?: readonly OptionalSectionToggleKey[];
    toggleCopy?: JourneyOptionalSectionCopy;
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
        toggleCopy={step.toggleCopy}
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

      <InflationBasisPanelFeature
        settings={settings}
        assumptions={derivedInflationAssumptions}
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

      <InflationBasisPanelFeature
        settings={settings}
        assumptions={derivedInflationAssumptions}
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

      <ComparisonBridgeChart
        retirementIncomeSeries={retirementIncomeSeries}
        bridgeChartParameters={bridgeChartParameters}
        bridgeChartLimits={bridgeChartLimits}
        hideInactiveLegendItems={Boolean(step.hideInactiveLegendItems)}
        validationIssues={validationIssues}
        onChangeChartParameters={onChangeChartParameters}
      />

      <InflationBasisPanelFeature
        settings={settings}
        assumptions={derivedInflationAssumptions}
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

      {step.supportLink ? (
        <aside
          className="journey-support-callout"
          aria-labelledby={`journey-support-${step.id}`}
        >
          <h4 id={`journey-support-${step.id}`}>{step.supportLink.heading}</h4>
          <p>{step.supportLink.description}</p>
          <a href={step.supportLink.href} target="_blank" rel="noreferrer">
            {step.supportLink.label}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </aside>
      ) : null}

      <SettingsFieldsFeature
        fields={getFieldsByIds(
          step.fieldIds,
          step.fieldLabels,
          step.fieldDescriptions,
          step.hideFieldInfoLinks
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
  fieldDescriptions: JourneyFieldDescriptions = {},
  hideFieldInfoLinks = false
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
        ...(hideFieldInfoLinks
          ? { infoUrl: undefined, infoLinks: undefined }
          : {}),
      };
    })
    .filter((field): field is FieldDefinition => Boolean(field));
}
