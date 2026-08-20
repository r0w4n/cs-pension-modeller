import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fieldGroups, type FieldDefinition } from "../fieldDefinitions";
import {
  deriveInflationAssumptions,
  type PensionSummary,
  type RetirementIncomeDisplay,
  type ProjectionRow,
} from "../projection";
import {
  RetirementIncomeChart,
  type RetirementIncomeChartLimits,
  type RetirementIncomeChartParameters,
  type RetirementIncomePoint,
} from "../RetirementIncomeChart";
import {
  defaultSettings,
  type FlexibleFundAccountId,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import {
  buildComparisonStatusItems,
  calculateAddedPensionMonthlyIncome,
  clonePensionSettings,
  createAddedPensionGoalBasis,
  createComparisonResult,
  estimateAddedPensionMonthlyContribution,
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
  type JourneyCurrencyFieldPresentation,
  type JourneyOptionalQuestion,
  type JourneyOptionalSectionCopy,
  type JourneyStepDefinition,
  type OptionalSectionToggleKey,
} from "../app-domains";
import { ComparisonRetirementIncomeChart } from "./chart";
import {
  ComparisonPanel as ComparisonPanelFeature,
  ComparisonSection,
  PensionSummarySection as PensionSummarySectionFeature,
  SimplePensionDetails,
  SimplePensionSummary,
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
  retirementIncomeChartParameters: RetirementIncomeChartParameters;
  retirementIncomeChartLimits: RetirementIncomeChartLimits;
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
    patch: Partial<RetirementIncomeChartParameters>
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

type OptionalQuestionSettingId = JourneyOptionalQuestion["setting"]["id"];

export function JourneyStepContent({
  step,
  viewModel,
}: JourneyStepContentProps) {
  const { settings, comparisonResultCache } = viewModel;
  const [optionalQuestionAnswers, setOptionalQuestionAnswers] = useState<
    Partial<Record<OptionalQuestionSettingId, boolean>>
  >({});
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
    const optionalQuestionSettingId = step.optionalQuestion?.setting.id;

    return renderFieldsStep(
      step,
      viewModel,
      optionalQuestionSettingId
        ? optionalQuestionAnswers[optionalQuestionSettingId]
        : undefined,
      (settingId, enabled) =>
        setOptionalQuestionAnswers((current) => ({
          ...current,
          [settingId]: enabled,
        }))
    );
  }

  return null;
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
    retirementIncomeChartParameters,
    retirementIncomeChartLimits,
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

      <RetirementIncomeChart
        data={retirementIncomeSeries}
        alphaLabel="Alpha pension"
        hideInactiveLegendItems
        limits={retirementIncomeChartLimits}
        statePensionEditable
        validationIssues={validationIssues}
        onChangeParameters={onChangeChartParameters}
        {...retirementIncomeChartParameters}
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
        retirementIncomeChartParameters={retirementIncomeChartParameters}
        retirementIncomeChartLimits={retirementIncomeChartLimits}
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
    retirementIncomeChartParameters,
    retirementIncomeChartLimits,
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

      <RetirementIncomeChart
        data={retirementIncomeSeries}
        alphaLabel="Alpha pension"
        showFlexibleWithdrawalInsights
        residualFlexibleFundInsights={
          flexibleWithdrawalSummary.residualAccounts
        }
        limits={retirementIncomeChartLimits}
        statePensionEditable
        validationIssues={validationIssues}
        onChangeParameters={onChangeChartParameters}
        {...retirementIncomeChartParameters}
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
    showComparisonSection?: boolean;
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
    retirementIncomeChartParameters,
    retirementIncomeChartLimits,
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
  const usesSimpleResults = step.resultsPresentation === "simple";

  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

      <ResultsSummarySection>
        {usesSimpleResults ? (
          <SimplePensionSummary
            activeResult={currentComparisonResult}
            retirementIncomeDisplay={retirementIncomeDisplay}
            onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
          />
        ) : (
          <PensionSummarySectionFeature
            activeResult={currentComparisonResult}
            headingLevel={2}
            description="This summary uses your current journey assumptions and shows projected income by age range."
            retirementIncomeDisplay={retirementIncomeDisplay}
            onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
            incomeAgeRangeItems={incomeAgeRangeItems}
            statusItems={buildStatusItems(currentComparisonResult)}
          />
        )}
      </ResultsSummarySection>

      <ComparisonRetirementIncomeChart
        retirementIncomeSeries={retirementIncomeSeries}
        retirementIncomeChartParameters={retirementIncomeChartParameters}
        retirementIncomeChartLimits={retirementIncomeChartLimits}
        hideInactiveLegendItems={Boolean(step.hideInactiveLegendItems)}
        presentation={usesSimpleResults ? "simple" : "standard"}
        validationIssues={validationIssues}
        onChangeChartParameters={onChangeChartParameters}
      />

      {usesSimpleResults ? (
        <>
          <SimplePensionDetails
            activeResult={currentComparisonResult}
            retirementIncomeDisplay={retirementIncomeDisplay}
            incomeAgeRangeItems={incomeAgeRangeItems}
          />
          <details className="simple-results-disclosure simple-results-methodology">
            <summary>How this estimate was worked out</summary>
            <InflationBasisPanelFeature
              settings={settings}
              assumptions={derivedInflationAssumptions}
            />
          </details>
        </>
      ) : (
        <InflationBasisPanelFeature
          settings={settings}
          assumptions={derivedInflationAssumptions}
        />
      )}

      {step.showComparisonSection !== false ? (
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
      ) : null}

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
    optionalQuestion?: JourneyOptionalQuestion;
    addedPensionIncomeGoal?: boolean;
  },
  viewModel: JourneyStepViewModel,
  optionalQuestionAnswer: boolean | undefined,
  onOptionalQuestionAnswer: (
    settingId: OptionalQuestionSettingId,
    enabled: boolean
  ) => void
) {
  const {
    settings,
    validationIssues,
    showGuidanceNotes,
    useDropdownDates,
    onChange,
  } = viewModel;

  if (step.addedPensionIncomeGoal && step.optionalQuestion) {
    return (
      <>
        <ValidationSummary validationIssues={validationIssues} />
        <AddedPensionGapEditor
          question={step.optionalQuestion}
          settings={settings}
          answer={optionalQuestionAnswer}
          onChange={onChange}
          onAnswer={onOptionalQuestionAnswer}
        />
      </>
    );
  }

  const settingsFields = (
    <SettingsFieldsFeature
      fields={getFieldsByIds(
        step.fieldIds,
        step.fieldLabels,
        step.fieldDescriptions,
        step.currencyFieldPresentation,
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
      useNpaLinkedDefaults={step.id.startsWith("expert-")}
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
      {step.supportLinkLayout === "inline" && step.supportLink ? (
        <JourneySupportPanel
          stepId={step.id}
          supportLink={step.supportLink}
          inline
        />
      ) : null}
    </SettingsFieldsFeature>
  );

  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

      {step.supportLink && step.supportLinkLayout !== "inline" ? (
        <JourneySupportPanel stepId={step.id} supportLink={step.supportLink} />
      ) : null}

      {step.optionalQuestion ? (
        <OptionalFieldsQuestion
          question={step.optionalQuestion}
          settings={settings}
          answer={optionalQuestionAnswer}
          onChange={onChange}
          onAnswer={onOptionalQuestionAnswer}
        >
          {settingsFields}
        </OptionalFieldsQuestion>
      ) : (
        settingsFields
      )}

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

function JourneySupportPanel({
  stepId,
  supportLink,
  inline = false,
}: {
  stepId: string;
  supportLink: NonNullable<
    Extract<JourneyStepDefinition, { kind: "fields" }>["supportLink"]
  >;
  inline?: boolean;
}) {
  return (
    <aside
      className={
        inline ? "field-card journey-support-field" : "journey-support-callout"
      }
      aria-labelledby={`journey-support-${stepId}`}
    >
      <h4
        id={`journey-support-${stepId}`}
        className={inline ? "field-label" : undefined}
      >
        {supportLink.heading}
      </h4>
      <p className={inline ? "field-help" : undefined}>
        {supportLink.description}
      </p>
      <a href={supportLink.href} target="_blank" rel="noreferrer">
        {supportLink.label}
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    </aside>
  );
}

function AddedPensionGapEditor({
  question,
  settings,
  answer,
  onChange,
  onAnswer,
}: {
  question: JourneyOptionalQuestion;
  settings: PensionSettings;
  answer: boolean | undefined;
  onChange: SettingsFieldOnChange;
  onAnswer: (settingId: OptionalQuestionSettingId, enabled: boolean) => void;
}) {
  const usesAfterTaxTarget =
    settings.retirementIncomeTargetBasis === "after_tax";
  const usesUnconfirmedStatePension =
    settings.showStatePension && !settings.statePensionForecastConfirmed;
  const basis = useMemo(
    () => createAddedPensionGoalBasis(settings),
    [settings]
  );
  const monthlyGap = Math.max(
    0,
    basis.targetMonthlyIncome - basis.projectedMonthlyIncome
  );
  const estimatedMonthlyContribution = estimateAddedPensionMonthlyContribution(
    basis,
    monthlyGap
  );
  const estimatedMonthlyIncrease = calculateAddedPensionMonthlyIncome(
    basis,
    estimatedMonthlyContribution
  );
  const remainingMonthlyGap = Math.max(
    0,
    monthlyGap - estimatedMonthlyIncrease
  );

  useEffect(() => {
    if (monthlyGap <= 0 && settings.alphaAddedPensionMonthly > 0) {
      onAnswer(question.setting.id, false);
      onChange("alphaAddedPensionMonthly", 0);
    }
  }, [
    monthlyGap,
    onAnswer,
    onChange,
    question.setting.id,
    settings.alphaAddedPensionMonthly,
  ]);

  return (
    <div className="added-pension-gap">
      <section
        className="added-pension-gap-summary"
        aria-labelledby="added-pension-gap-heading"
      >
        <h4 id="added-pension-gap-heading">
          Your projection before Added Pension
        </h4>
        <dl>
          <div>
            <dt>
              {usesAfterTaxTarget
                ? "Your target spending after estimated tax"
                : "Your retirement income target before tax"}
            </dt>
            <dd>{formatWholePounds(basis.targetMonthlyIncome)} a month</dd>
          </div>
          <div>
            <dt>
              {usesAfterTaxTarget
                ? "Estimated take-home pension income"
                : "Current projected retirement income before tax"}
            </dt>
            <dd>{formatWholePounds(basis.projectedMonthlyIncome)} a month</dd>
          </div>
          <div>
            <dt>
              {usesAfterTaxTarget
                ? "Estimated monthly spending gap"
                : "Monthly income gap before tax"}
            </dt>
            <dd>{formatWholePounds(monthlyGap)} a month</dd>
          </div>
        </dl>
        <p>
          {usesAfterTaxTarget
            ? "These are modelled amounts after estimated Income Tax, based on the information and assumptions entered."
            : "These are modelled amounts before tax, based on the information and assumptions entered."}
        </p>
        {usesUnconfirmedStatePension ? (
          <p className="field-warning" role="status">
            This comparison includes an unconfirmed State Pension assumption of{" "}
            {formatWholePounds(settings.currentStatePension)} a year. Your
            actual spending gap could be larger if your personalised forecast is
            lower.
          </p>
        ) : null}
      </section>

      {monthlyGap <= 0 ? (
        <p className="added-pension-gap-message">
          This projection{" "}
          {usesUnconfirmedStatePension ? "appears to meet" : "meets or exceeds"}{" "}
          the{" "}
          {usesAfterTaxTarget
            ? "target spending after estimated tax"
            : "retirement income target before tax"}
          , so the modeller has not added an Added Pension payment.
          {usesUnconfirmedStatePension
            ? " Check your personalised State Pension forecast before relying on this comparison."
            : ""}
        </p>
      ) : basis.monthlyIncomePerContributionPound <= 0 ? (
        <p className="added-pension-gap-message" role="status">
          The modeller cannot estimate an Added Pension payment from the current
          details. Review the dates and Alpha pension information entered.
        </p>
      ) : (
        <OptionalFieldsQuestion
          question={question}
          settings={settings}
          answer={answer}
          onChange={onChange}
          onAnswer={onAnswer}
        >
          <AddedPensionGapEstimate
            settings={settings}
            monthlyGap={monthlyGap}
            estimatedMonthlyContribution={estimatedMonthlyContribution}
            estimatedMonthlyIncrease={estimatedMonthlyIncrease}
            remainingMonthlyGap={remainingMonthlyGap}
            projectedMonthlyIncome={basis.projectedMonthlyIncome}
            usesAfterTaxTarget={usesAfterTaxTarget}
            onChange={onChange}
          />
        </OptionalFieldsQuestion>
      )}
    </div>
  );
}

function AddedPensionGapEstimate({
  settings,
  monthlyGap,
  estimatedMonthlyContribution,
  estimatedMonthlyIncrease,
  remainingMonthlyGap,
  projectedMonthlyIncome,
  usesAfterTaxTarget,
  onChange,
}: {
  settings: PensionSettings;
  monthlyGap: number;
  estimatedMonthlyContribution: number;
  estimatedMonthlyIncrease: number;
  remainingMonthlyGap: number;
  projectedMonthlyIncome: number;
  usesAfterTaxTarget: boolean;
  onChange: SettingsFieldOnChange;
}) {
  useEffect(() => {
    if (settings.alphaAddedPensionMonthly !== estimatedMonthlyContribution) {
      onChange("alphaAddedPensionMonthly", estimatedMonthlyContribution);
    }
  }, [
    estimatedMonthlyContribution,
    onChange,
    settings.alphaAddedPensionMonthly,
  ]);

  return (
    <section className="added-pension-gap-estimate" aria-live="polite">
      <h4>Estimated Added Pension needed</h4>
      <p>
        To try to close the {formatWholePounds(monthlyGap)} monthly difference,
        the model estimates an extra payment of approximately{" "}
        <strong>
          {formatWholePounds(estimatedMonthlyContribution)} a month
        </strong>
        .
      </p>
      <p>
        That payment is estimated to add{" "}
        {formatWholePounds(estimatedMonthlyIncrease)} a month of pension income,
        giving a projected total of{" "}
        {formatWholePounds(projectedMonthlyIncome + estimatedMonthlyIncrease)} a
        month {usesAfterTaxTarget ? "after estimated tax" : "before tax"}.
      </p>
      {remainingMonthlyGap > 0 ? (
        <p>
          This does not close the whole gap. About{" "}
          {formatWholePounds(remainingMonthlyGap)} a month remains because the
          estimated payment has reached the modeller's supported limit.
        </p>
      ) : null}
      <p className="field-help">
        This is an illustration, not a scheme quote. Check the amount, purchase
        limits and eligibility with the official Civil Service Added Pension
        calculator before making a decision.
      </p>
    </section>
  );
}

function formatWholePounds(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function OptionalFieldsQuestion({
  question,
  settings,
  answer,
  onChange,
  onAnswer,
  children,
}: {
  question: JourneyOptionalQuestion;
  settings: PensionSettings;
  answer: boolean | undefined;
  onChange: SettingsFieldOnChange;
  onAnswer: (settingId: OptionalQuestionSettingId, enabled: boolean) => void;
  children: ReactNode;
}) {
  const isEnabled = answer ?? isOptionalQuestionEnabled(question, settings);
  const statePensionAssumptionId =
    question.setting.id === "statePensionForecastConfirmed"
      ? "state-pension-assumption"
      : undefined;

  const chooseAnswer = (enabled: boolean) => {
    onAnswer(question.setting.id, enabled);

    if (question.setting.id === "alphaEpaEnabled") {
      onChange("alphaEpaEnabled", enabled);
      return;
    }

    if (question.setting.id === "statePensionForecastConfirmed") {
      if (!enabled) {
        onChange("currentStatePension", defaultSettings.currentStatePension);
      }
      onChange("statePensionForecastConfirmed", enabled);
      return;
    }

    if (!enabled) {
      onChange("alphaAddedPensionMonthly", 0);
    }
  };

  return (
    <div className="journey-optional-question">
      <fieldset>
        <legend
          className={
            question.showPrompt ? "journey-question-prompt" : "visually-hidden"
          }
        >
          {question.prompt}
        </legend>
        <div className="journey-optional-question-answers">
          <label>
            <input
              type="radio"
              name={`journey-question-${question.setting.id}`}
              checked={!isEnabled}
              aria-describedby={
                !isEnabled ? statePensionAssumptionId : undefined
              }
              onChange={() => chooseAnswer(false)}
            />
            <span>{question.noLabel}</span>
          </label>
          <label>
            <input
              type="radio"
              name={`journey-question-${question.setting.id}`}
              checked={isEnabled}
              onChange={() => chooseAnswer(true)}
            />
            <span>{question.yesLabel}</span>
          </label>
        </div>
      </fieldset>

      {question.setting.id === "statePensionForecastConfirmed" && !isEnabled ? (
        <div
          id={statePensionAssumptionId}
          className="journey-assumption-callout"
        >
          <h4>What we&apos;ll use for now</h4>
          <p>
            We&apos;ll use{" "}
            <strong>
              {formatWholePounds(defaultSettings.currentStatePension)} a year
            </strong>{" "}
            until you enter your own forecast. Your amount may be different.
          </p>
          <p>
            Your result will remind you that this number needs checking. It will
            also show whether changing it could leave you with less than the
            amount you want.
          </p>
        </div>
      ) : null}

      {isEnabled ? children : null}
    </div>
  );
}

function isOptionalQuestionEnabled(
  question: JourneyOptionalQuestion,
  settings: PensionSettings
) {
  if (question.setting.id === "alphaEpaEnabled") {
    return settings.alphaEpaEnabled;
  }

  if (question.setting.id === "statePensionForecastConfirmed") {
    return settings.statePensionForecastConfirmed;
  }

  return settings.alphaAddedPensionMonthly > 0;
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
  fieldLabels: JourneyFieldLabels = {},
  fieldDescriptions: JourneyFieldDescriptions = {},
  currencyFieldPresentation: JourneyCurrencyFieldPresentation = {},
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
        ...(field.type === "currency-input"
          ? currencyFieldPresentation[field.id]
          : {}),
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
