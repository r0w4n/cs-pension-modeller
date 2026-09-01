import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fieldGroups,
  type FieldDefinition,
  type SettingsKey,
} from "../fieldDefinitions";
import {
  deriveInflationAssumptions,
  type PensionSummary,
  type RetirementIncomeDisplay,
  type ProjectionRow,
} from "../projection";
import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomePoint,
} from "../result-projection/retirement-income-chart-model";
import {
  defaultSettings,
  type FlexibleFundAccountId,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import {
  buildBridgePlanReview,
  buildComparisonStatusItems,
  buildRetirementOutcomeBanner,
  type JourneyFieldDescriptions,
  type JourneyFieldLabels,
  type JourneyCurrencyFieldPresentation,
  type JourneyOptionalQuestion,
  type JourneyOptionalSectionCopy,
  type JourneyResultsSection,
  type JourneyStepDefinition,
  type OptionalSectionToggleKey,
} from "../app-domains";
import type {
  ComparisonResult,
  ComparisonScenario,
} from "../result-projection/comparison-result";
import {
  calculateAddedPensionMonthlyIncome,
  createAddedPensionGoalBasis,
  estimateAddedPensionMonthlyContribution,
} from "../calculation/added-pension-goal";
import type { IncomeAgeRangeItem } from "../result-projection/income-age-ranges";
import {
  getWithdrawalStrategyFieldId,
  type FlexibleWithdrawalSummary,
} from "../result-projection/flexible-withdrawals";
import type { TargetBasedWithdrawalPreview } from "../calculation/target-based-withdrawal-previews";
import type { RetirementPlanResult } from "../calculation/retirement-plan";
import type { ComparisonResultCache } from "./comparison-result-cache";
import { RetirementIncomeChartAdapter } from "./retirement-income-chart-adapter";
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
  ValidationIssuesSection as ValidationIssuesSectionFeature,
  ResultsSummarySection,
  SummarySection,
} from "./results-summary";
import { SettingsGroupSupplementaryEditor } from "./settings-group-supplementary-editor";
import { SpendingSmileEditor } from "./spending-smile-editor";
import { FlexibleWithdrawalPriorityEditor } from "./flexible-withdrawal-priority-editor";
import { isSettingsGroupVisible } from "../app-domains/settings-group-visibility";
import {
  JointHouseholdTargetFields,
  JointPartnerTaxFields,
  JointRetirementToggle,
  PartnerOptionalSections,
} from "./joint-retirement-controls";
import { JointRetirementResults } from "./joint-retirement-results";
import { applyPartnerSettingsFieldChange } from "./chart-state";

export type JourneyStepViewModel = {
  settings: PensionSettings;
  retirementPlanResult: RetirementPlanResult | null;
  currentComparisonResult: ComparisonResult | null;
  isProjectionPending: boolean;
  validationIssues: PensionValidationIssue[];
  pensionSummary: PensionSummary | null;
  retirementIncomeSeries: RetirementIncomePoint[];
  retirementIncomeChartParameters: RetirementIncomeChartParameters;
  retirementIncomeChartLimits: RetirementIncomeChartLimits;
  derivedInflationAssumptions: ReturnType<
    typeof deriveInflationAssumptions
  > | null;
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
  const [optionalQuestionAnswers, setOptionalQuestionAnswers] = useState<
    Partial<Record<OptionalQuestionSettingId, boolean>>
  >({});
  const shouldRenderProjectionTable =
    !useMobileDateDropdowns("(max-width: 640px)");

  if (step.kind === "optional-sections") {
    return renderOptionalSectionsStep(step, viewModel);
  }

  if (step.kind === "review") {
    return <JourneyReviewStep step={step} viewModel={viewModel} />;
  }

  if (step.kind === "results") {
    return (
      <JourneyResultsStep
        step={step}
        viewModel={viewModel}
        shouldRenderProjectionTable={shouldRenderProjectionTable}
      />
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

function JourneyReviewStep({
  step,
  viewModel,
}: {
  step: JourneyStepDefinition & { kind: "review" };
  viewModel: JourneyStepViewModel;
}) {
  const reviewSections =
    step.presentation === "bridge-plan"
      ? buildBridgePlanReview(viewModel.settings)
      : [];

  return (
    <div className="journey-plan-review">
      <ValidationSummary validationIssues={viewModel.validationIssues} />
      {reviewSections.map((section) => (
        <SummarySection
          key={section.title}
          title={section.title}
          items={section.items}
          description={section.description}
          headingLevel={4}
          variant="feature"
        />
      ))}
      <aside className="journey-assumption-callout" aria-label="Planning note">
        <h4>Planning illustration only</h4>
        <p>
          These choices are assumptions, not guaranteed outcomes. Check pension
          amounts and access dates against official statements before making an
          important decision.
        </p>
      </aside>
    </div>
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
      {step.id === "optional-sections" ? (
        <>
          <JointRetirementToggle settings={settings} onChange={onChange} />
          <PartnerOptionalSections settings={settings} onChange={onChange} />
        </>
      ) : null}
    </>
  );
}

function JourneyResultsStep({
  step,
  viewModel,
  shouldRenderProjectionTable,
}: {
  step: JourneyStepDefinition & { kind: "results" };
  viewModel: JourneyStepViewModel;
  shouldRenderProjectionTable: boolean;
}) {
  const {
    settings,
    retirementPlanResult,
    currentComparisonResult,
    isProjectionPending,
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
  const summaryPresentation = getResultsSection(step, "summary")?.presentation;
  const chartPresentation = getResultsSection(
    step,
    "retirement-income-chart"
  )?.presentation;
  const inflationPresentation = getResultsSection(
    step,
    "inflation-basis"
  )?.presentation;

  if (
    !retirementPlanResult ||
    !currentComparisonResult ||
    !derivedInflationAssumptions
  ) {
    return (
      <>
        <ValidationSummary validationIssues={validationIssues} />
        <p className="section-copy" role="status">
          Calculating your results…
        </p>
      </>
    );
  }

  if (settings.jointRetirement.enabled) {
    return (
      <JointJourneyResultsStep
        settings={settings}
        retirementPlanResult={retirementPlanResult}
        currentComparisonResult={currentComparisonResult}
        isProjectionPending={isProjectionPending}
        validationIssues={validationIssues}
        chartParameters={retirementIncomeChartParameters}
        chartLimits={retirementIncomeChartLimits}
        retirementIncomeDisplay={retirementIncomeDisplay}
        onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
        onChange={onChange}
        comparisonRetirementIncomeDisplay={comparisonRetirementIncomeDisplay}
        onComparisonRetirementIncomeDisplayChange={
          onComparisonRetirementIncomeDisplayChange
        }
        comparisonScenarios={comparisonScenarios}
        comparisonResultCache={comparisonResultCache}
        onScenariosChange={onScenariosChange}
        onLoadScenario={onLoadScenario}
        showComparison={hasResultsSection(step, "comparison")}
        inflationPresentation={inflationPresentation}
        derivedInflationAssumptions={derivedInflationAssumptions}
      />
    );
  }

  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

      {isProjectionPending ? (
        <p className="section-copy" role="status">
          Updating calculated results…
        </p>
      ) : null}

      {summaryPresentation ? (
        <ResultsSummarySection>
          {summaryPresentation === "simple" ? (
            <SimplePensionSummary
              activeResult={currentComparisonResult}
              retirementIncomeDisplay={retirementIncomeDisplay}
              onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
            />
          ) : summaryPresentation === "detailed" ? (
            <PensionSummarySectionFeature
              activeResult={currentComparisonResult}
              headingLevel={2}
              description="Based on your selected retirement age, target income, pension start dates and withdrawal strategy."
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
      ) : null}

      {chartPresentation ? (
        <RetirementIncomeChartAdapter
          retirementIncomeSeries={retirementIncomeSeries}
          retirementIncomeChartParameters={retirementIncomeChartParameters}
          retirementIncomeChartLimits={retirementIncomeChartLimits}
          residualFlexibleFundInsights={
            flexibleWithdrawalSummary.residualAccounts
          }
          presentation={chartPresentation}
          validationIssues={validationIssues}
          onChangeChartParameters={onChangeChartParameters}
        />
      ) : null}

      {hasResultsSection(step, "income-details") ? (
        <SimplePensionDetails
          activeResult={currentComparisonResult}
          retirementIncomeDisplay={retirementIncomeDisplay}
          incomeAgeRangeItems={incomeAgeRangeItems}
        />
      ) : null}

      {inflationPresentation === "disclosure" ? (
        <details className="simple-results-disclosure simple-results-methodology">
          <summary>How this estimate was worked out</summary>
          <InflationBasisPanelFeature
            settings={settings}
            assumptions={derivedInflationAssumptions}
          />
        </details>
      ) : inflationPresentation === "expanded" ? (
        <InflationBasisPanelFeature
          settings={settings}
          assumptions={derivedInflationAssumptions}
        />
      ) : null}

      {hasResultsSection(step, "projection-table") &&
      shouldRenderProjectionTable ? (
        <ProjectionTableSectionContainer>
          <ProjectionTableSectionFeature
            rows={projectionRows}
            settings={settings}
          />
        </ProjectionTableSectionContainer>
      ) : null}

      {hasResultsSection(step, "comparison") ? (
        <ComparisonSection>
          <ComparisonPanelFeature
            settings={settings}
            validationIssues={validationIssues}
            scenarios={comparisonScenarios}
            comparisonResultCache={comparisonResultCache}
            retirementPlanResult={retirementPlanResult}
            isProjectionPending={isProjectionPending}
            onScenariosChange={onScenariosChange}
            onLoadScenario={onLoadScenario}
            retirementIncomeDisplay={comparisonRetirementIncomeDisplay}
            onRetirementIncomeDisplayChange={
              onComparisonRetirementIncomeDisplayChange
            }
            showPensionSummary={false}
          />
        </ComparisonSection>
      ) : null}
    </>
  );
}

function JointJourneyResultsStep({
  settings,
  retirementPlanResult,
  currentComparisonResult,
  isProjectionPending,
  validationIssues,
  chartParameters,
  chartLimits,
  retirementIncomeDisplay,
  onRetirementIncomeDisplayChange,
  onChange,
  comparisonRetirementIncomeDisplay,
  onComparisonRetirementIncomeDisplayChange,
  comparisonScenarios,
  comparisonResultCache,
  onScenariosChange,
  onLoadScenario,
  showComparison,
  inflationPresentation,
  derivedInflationAssumptions,
}: {
  settings: PensionSettings;
  retirementPlanResult: RetirementPlanResult;
  currentComparisonResult: ComparisonResult;
  isProjectionPending: boolean;
  validationIssues: PensionValidationIssue[];
  chartParameters: RetirementIncomeChartParameters;
  chartLimits: RetirementIncomeChartLimits;
  retirementIncomeDisplay: RetirementIncomeDisplay;
  onRetirementIncomeDisplayChange: (display: RetirementIncomeDisplay) => void;
  onChange: SettingsFieldOnChange;
  comparisonRetirementIncomeDisplay: RetirementIncomeDisplay;
  onComparisonRetirementIncomeDisplayChange: (
    display: RetirementIncomeDisplay
  ) => void;
  comparisonScenarios: ComparisonScenario[];
  comparisonResultCache: ComparisonResultCache;
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (settings: PensionSettings) => void;
  showComparison: boolean;
  inflationPresentation:
    | Extract<JourneyResultsSection, { id: "inflation-basis" }>["presentation"]
    | undefined;
  derivedInflationAssumptions: NonNullable<
    JourneyStepViewModel["derivedInflationAssumptions"]
  >;
}) {
  return (
    <>
      <ValidationSummary validationIssues={validationIssues} />

      {isProjectionPending ? (
        <p className="section-copy" role="status">
          Updating calculated results…
        </p>
      ) : null}

      {retirementPlanResult.jointProjection ? (
        <JointRetirementResults
          projection={retirementPlanResult.jointProjection}
          settings={settings}
          outcome={buildRetirementOutcomeBanner(currentComparisonResult)}
          statusItems={buildComparisonStatusItems(currentComparisonResult)}
          chartParameters={chartParameters}
          chartLimits={chartLimits}
          retirementIncomeDisplay={retirementIncomeDisplay}
          onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
          validationIssues={validationIssues}
          onChange={onChange}
        />
      ) : (
        <section
          className="panel"
          aria-labelledby="household-results-unavailable-title"
        >
          <div className="panel-heading">
            <h2 id="household-results-unavailable-title">
              Household results need more details
            </h2>
            <p className="section-copy">
              Complete the highlighted settings before the combined household
              projection can be shown. While two-person modelling is enabled,
              this page does not show a single-person result in its place.
            </p>
          </div>
        </section>
      )}

      {inflationPresentation === "disclosure" ? (
        <details className="simple-results-disclosure simple-results-methodology">
          <summary>How this estimate was worked out</summary>
          <InflationBasisPanelFeature
            settings={settings}
            assumptions={derivedInflationAssumptions}
          />
        </details>
      ) : inflationPresentation === "expanded" ? (
        <InflationBasisPanelFeature
          settings={settings}
          assumptions={derivedInflationAssumptions}
        />
      ) : null}

      {showComparison ? (
        <ComparisonSection>
          <ComparisonPanelFeature
            settings={settings}
            validationIssues={validationIssues}
            scenarios={comparisonScenarios}
            comparisonResultCache={comparisonResultCache}
            retirementPlanResult={retirementPlanResult}
            isProjectionPending={isProjectionPending}
            onScenariosChange={onScenariosChange}
            onLoadScenario={onLoadScenario}
            retirementIncomeDisplay={comparisonRetirementIncomeDisplay}
            onRetirementIncomeDisplayChange={
              onComparisonRetirementIncomeDisplayChange
            }
            showPensionSummary={false}
          />
        </ComparisonSection>
      ) : null}
    </>
  );
}

function hasResultsSection(
  step: JourneyStepDefinition & { kind: "results" },
  sectionId: JourneyResultsSection["id"]
) {
  return step.sections.some((section) => section.id === sectionId);
}

function getResultsSection<SectionId extends JourneyResultsSection["id"]>(
  step: JourneyStepDefinition & { kind: "results" },
  sectionId: SectionId
) {
  return step.sections.find(
    (section): section is Extract<JourneyResultsSection, { id: SectionId }> =>
      section.id === sectionId
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
      validationIssues={validationIssues.filter(
        (issue) => issue.personId !== "partner"
      )}
      onChange={onChange}
      showGuidanceNotes={showGuidanceNotes}
      useDropdownDates={useDropdownDates}
      flexibleWithdrawalSummary={
        step.showFlexibleWithdrawalInsights
          ? viewModel.flexibleWithdrawalSummary
          : undefined
      }
      useNpaLinkedDefaults={Boolean(step.useNpaLinkedDefaults)}
    >
      {step.showSpendingSmileEditor ? (
        <SpendingSmileEditor
          settings={settings}
          validationIssues={validationIssues}
          onChange={onChange}
          expertMode={Boolean(step.useNpaLinkedDefaults)}
        />
      ) : null}
      {step.showFlexibleWithdrawalPriority ? (
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
  const partner = settings.partner;
  const onPartnerChange: SettingsFieldOnChange = (key, value) =>
    updatePartnerSetting(settings, key, value, onChange);

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
      ) : step.groupId === "retirement-target" &&
        settings.jointRetirement.enabled ? (
        <JointHouseholdTargetFields
          settings={settings}
          onChange={onChange}
          showGuidanceNotes={showGuidanceNotes}
          showSpendingSmileEditor={Boolean(step.showSpendingSmileEditor)}
          validationIssues={validationIssues}
        />
      ) : (
        settingsFields
      )}

      {step.groupId === "tax" && settings.jointRetirement.enabled ? (
        <JointPartnerTaxFields
          settings={settings}
          onChange={onChange}
          showGuidanceNotes={showGuidanceNotes}
        />
      ) : null}

      {step.groupId && isSettingsGroupVisible(step.groupId, settings) ? (
        <SettingsGroupSupplementaryEditor
          groupId={step.groupId}
          settings={settings}
          validationIssues={validationIssues.filter(
            (issue) => issue.personId !== "partner"
          )}
          onChange={onChange}
          useDropdownDates={useDropdownDates}
        />
      ) : null}

      {shouldShowPartnerFields(step.groupId, settings) && partner ? (
        <section
          className="settings-section"
          aria-labelledby={`partner-${step.id}`}
        >
          <div className="section-heading">
            <h3 id={`partner-${step.id}`}>Partner</h3>
          </div>
          <SettingsFieldsFeature
            fields={getFieldsByIds(
              step.fieldIds,
              undefined,
              undefined,
              step.currencyFieldPresentation,
              step.hideFieldInfoLinks
            ).map((field) => ({
              ...field,
              label: getPartnerFieldLabel(field.label),
              description: "",
            }))}
            settings={partner as PensionSettings}
            validationIssues={validationIssues.filter(
              (issue) => issue.personId === "partner"
            )}
            onChange={onPartnerChange}
            showGuidanceNotes={showGuidanceNotes}
            useDropdownDates={useDropdownDates}
            useNpaLinkedDefaults={Boolean(step.useNpaLinkedDefaults)}
            domIdPrefix="partner"
          />
          {step.groupId ? (
            <SettingsGroupSupplementaryEditor
              groupId={step.groupId}
              settings={partner as PensionSettings}
              validationIssues={validationIssues.filter(
                (issue) => issue.personId === "partner"
              )}
              onChange={onPartnerChange}
              useDropdownDates={useDropdownDates}
              domIdPrefix="partner"
              ownerLabel="Partner"
              showDescriptions={false}
            />
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function updatePartnerSetting<K extends SettingsKey>(
  settings: PensionSettings,
  key: K,
  value: PensionSettings[K],
  onChange: SettingsFieldOnChange
) {
  onChange(
    "partner",
    applyPartnerSettingsFieldChange(settings, key, value, {
      alignAlphaLeaveAgeToRetirement: false,
      dateOfBirthUpdate: "relink-npa-defaults",
    })
  );
}

function shouldShowPartnerFields(
  groupId: string | undefined,
  settings: PensionSettings
) {
  if (
    !groupId ||
    !settings.jointRetirement.enabled ||
    !settings.partner ||
    groupId === "retirement-target" ||
    groupId === "inflation" ||
    groupId === "tax"
  ) {
    return false;
  }

  return isSettingsGroupVisible(groupId, settings.partner as PensionSettings);
}

function getPartnerFieldLabel(label: string) {
  return label.startsWith("Your ")
    ? `Partner's ${label.slice("Your ".length)}`
    : `Partner ${label}`;
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
    <ValidationIssuesSectionFeature
      validationIssues={validationIssues.map((issue) =>
        issue.personId === "partner"
          ? { ...issue, message: `Partner: ${issue.message}` }
          : issue
      )}
    />
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

function buildStatusItems(currentComparisonResult: ComparisonResult) {
  return currentComparisonResult
    ? buildComparisonStatusItems(currentComparisonResult)
    : [];
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
