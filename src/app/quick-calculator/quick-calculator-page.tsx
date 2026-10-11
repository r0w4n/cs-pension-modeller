import type {
  CheckboxField,
  CurrencyInputField,
  DateField,
  FieldDefinition,
  RangeField,
  SelectField,
} from "../../fieldDefinitions";
import { useRef } from "react";
import { fieldGroups } from "../../fieldDefinitions";
import {
  calculateDateAge,
  calculateNormalPensionAge,
  calculateStatePensionDrawDate,
  formatCurrency,
  formatModelAge,
  type PensionValidationIssue,
} from "../../settings";
import { formatDate, formatPercent } from "../../result-projection/formatting";
import { QUICK_CALCULATOR_RESULT_BASIS } from "../../result-projection/quick-calculator-results";
import { Helmet } from "../../helmet";
import { resolveAppBaseHref } from "../app-base";
import { AlphaEpaPeriodsEditor } from "../form-field-alpha-epa-periods";
import { MonthSelectField, YearSettingField } from "../form-field-dates";
import {
  CurrencySettingField,
  RangeSettingField,
  SelectSettingField,
} from "../form-field-values";
import {
  FieldHelp,
  FieldLabel,
  FieldValidationMessage,
  getFieldCardClassName,
} from "../form-fields-shared";
import { ImportantInformationDialog } from "../important-information-dialog";
import { SavedLocalFeedback } from "../saved-local-feedback";
import { SettingsFields } from "../form-fields";
import { SiteFooter } from "../site-footer";
import { useQuickCalculator } from "./use-quick-calculator";
import { getQuickCalculatorIncompleteMessage } from "./quick-calculator-readiness";

const birthField = getField("dateOfBirth", {
  label: "Birth month and year",
}) as DateField;
const statementYearField = getField("alphaPensionAbsDate", {
  label: "Statement year",
  description:
    "Defaults to the latest supported statement year. Check this against your statement; the model uses the 1 April scheme checkpoint.",
}) as DateField & { type: "year" };
const accruedPensionField = getField("accruedPensionAtLastAbs", {
  label: "Alpha pension on your statement (£ per year)",
  description:
    "Enter annual pension income from your statement, not a pension pot or current cash value. The starting £0 is an assumption to check; zero is a valid answer.",
}) as CurrencyInputField;
const earningsField = getField("pensionableEarnings", {
  label: "Pensionable earnings (£ per year)",
  description:
    "Your actual annual pensionable earnings before the hypothetical hours reduction. Zero is a valid answer.",
  emptyWhenZero: false,
}) as RangeField;
const retirementAgeField = getField("alphaPensionDrawAge", {
  label: "Selected retirement age",
  description:
    "The model assumes Alpha service ends and Alpha starts at this age. Use whole years or 3, 6 or 9 months.",
}) as RangeField;
const addedPensionField = getField("alphaAddedPensionMonthly", {
  label: "Monthly Added Pension payment (£ per month)",
  description:
    "This is an optional Added Pension purchase payment, separate from normal payroll pension contributions. It is treated as constant over the modelled post-statement period.",
}) as RangeField;
const addedPensionCoverField = getField("alphaAddedPensionFactorType", {
  label: "Added Pension cover",
}) as SelectField;
const reducedHoursAgeField = getField("partialRetirementStartAge", {
  label: "Reduce working hours from age",
  description:
    "A start at or after a comparison retirement age has no effect for that comparison. A date before today is treated as a historical scenario assumption.",
}) as RangeField;
const workPercentField = getField("partialRetirementWorkPercent", {
  label: "Working percentage after reducing hours (%)",
  description:
    "50% means half the baseline pensionable earnings. The model also applies this percentage to regular Added Pension payments after the reduction date.",
}) as RangeField;
const statePensionField = getField("currentStatePension") as CurrencyInputField;
const stateForecastField = getField(
  "statePensionForecastConfirmed"
) as CheckboxField;
const epaEnabledField = getField("alphaEpaEnabled") as CheckboxField;

export function QuickCalculatorPage() {
  const calculator = useQuickCalculator();
  const pageHeadingRef = useRef<HTMLHeadingElement>(null);
  const appBaseHref = resolveAppBaseHref();
  const currentAge = calculator.completion.dateOfBirth
    ? calculateDateAge(
        calculator.inputs.dateOfBirth,
        calculator.calculationDate
      )
    : null;
  const normalPensionAge = calculator.completion.dateOfBirth
    ? calculateNormalPensionAge(calculator.inputs.dateOfBirth)
    : null;
  const statePensionDate = calculator.completion.dateOfBirth
    ? calculateStatePensionDrawDate(calculator.inputs.dateOfBirth)
    : null;
  const resultIssues = calculator.inputValidationIssues.concat(
    calculator.calculationState.batch?.scenarios.flatMap(
      (scenario) => scenario.validationIssues
    ) ?? []
  );

  return (
    <>
      <Helmet>
        <title>Quick Alpha calculator | Civil Service Pension Modeller</title>
        <meta
          name="description"
          content="Compare eight illustrative Alpha pension estimates using statement figures and quick controls."
        />
      </Helmet>
      {!calculator.hasAcknowledgedNotice ? (
        <ImportantInformationDialog
          onContinue={calculator.acknowledgeNotice}
          manageFocus
          focusAfterCloseRef={pageHeadingRef}
        />
      ) : null}

      <main
        className="app-shell quick-calculator-shell"
        aria-hidden={!calculator.hasAcknowledgedNotice || undefined}
        inert={!calculator.hasAcknowledgedNotice ? true : undefined}
      >
        <SavedLocalFeedback show={calculator.showSavedFeedback} />
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Civil Service Pensions</p>
            <h1 ref={pageHeadingRef} tabIndex={-1}>
              Quick Alpha calculator
            </h1>
            <p className="lead">
              Enter your statement figures, then adjust the sliders to compare
              retirement estimates. This calculator uses the same calculation
              model as the full modeller. Your full-modeller plans are kept
              separately.
            </p>
            <a className="static-backlink" href={appBaseHref}>
              Back to the full modeller
            </a>
          </div>
        </section>

        <section className="quick-calculator-layout">
          <div className="panel quick-calculator-controls" id="quick-inputs">
            <div className="panel-heading">
              <p className="eyebrow">Your assumptions</p>
              <h2>Statement and retirement inputs</h2>
              <p className="section-copy">
                Enter your birth month and year. The starting assumptions are £0
                annual Alpha pension and £40,000 pensionable earnings; replace
                these with your own figures.
              </p>
            </div>

            <div className="quick-field-list" key={calculator.resetVersion}>
              <div
                className={getFieldCardClassName(
                  false,
                  false,
                  Boolean(calculator.draftErrors.dateOfBirth)
                )}
              >
                <span className="field-header">
                  <FieldLabel field={birthField} />
                </span>
                <MonthSelectField
                  label={birthField.label}
                  value={calculator.birthMonthDraft}
                  idPrefix="quick-date-of-birth"
                  yearRange={{
                    min: new Date().getUTCFullYear() - 100,
                    max: new Date().getUTCFullYear() - 16,
                  }}
                  hasValidationIssue={Boolean(
                    calculator.draftErrors.dateOfBirth
                  )}
                  describedBy={
                    calculator.draftErrors.dateOfBirth
                      ? "quick-date-of-birth-validation"
                      : undefined
                  }
                  onChange={calculator.updateBirthMonth}
                />
                <FieldHelp field={birthField} showGuidanceNotes />
                <FieldValidationMessage
                  id="quick-date-of-birth-validation"
                  issue={toIssue(
                    "dateOfBirth",
                    calculator.draftErrors.dateOfBirth
                  )}
                />
                {currentAge !== null && normalPensionAge !== null ? (
                  <p className="quick-derived-value">
                    Current age on {formatDate(calculator.calculationDate)}:{" "}
                    {formatModelAge(currentAge)}. Alpha Normal Pension Age:{" "}
                    {formatModelAge(normalPensionAge)}.
                  </p>
                ) : null}
              </div>

              <YearSettingField
                field={statementYearField}
                value={calculator.inputs.alphaPensionAbsDate}
                onChange={calculator.onChange}
                showGuidanceNotes
                domIdPrefix="quick"
              />

              <CurrencySettingField
                field={accruedPensionField}
                value={calculator.inputs.accruedPensionAtLastAbs}
                onChange={calculator.onChange}
                resetValue={calculator.resetValues.accruedPensionAtLastAbs}
                showGuidanceNotes
                domIdPrefix="quick"
                initialDraftValue={
                  calculator.completion.accruedPensionAtLastAbs ? undefined : ""
                }
                strictDraftValidation
                validationIssue={toIssue(
                  "accruedPensionAtLastAbs",
                  calculator.draftErrors.accruedPensionAtLastAbs
                )}
                onDraftStateChange={(state) =>
                  calculator.handleDraft("accruedPensionAtLastAbs", state, true)
                }
              />

              <RangeSettingField
                field={earningsField}
                value={calculator.inputs.pensionableEarnings}
                settings={calculator.inputs}
                onChange={calculator.onChange}
                resetValue={calculator.resetValues.pensionableEarnings}
                showGuidanceNotes
                domIdPrefix="quick"
                isAnswered={calculator.completion.pensionableEarnings}
                strictDraftValidation
                validationIssue={toIssue(
                  "pensionableEarnings",
                  calculator.draftErrors.pensionableEarnings
                )}
                onDraftStateChange={(state) =>
                  calculator.handleDraft("pensionableEarnings", state, true)
                }
              />

              <RangeSettingField
                field={retirementAgeField}
                value={calculator.inputs.alphaPensionDrawAge}
                settings={calculator.inputs}
                onChange={calculator.onChange}
                resetValue={calculator.resetValues.alphaPensionDrawAge}
                showGuidanceNotes
                domIdPrefix="quick"
                strictDraftValidation
                validationIssue={toIssue(
                  "alphaPensionDrawAge",
                  calculator.draftErrors.alphaPensionDrawAge
                )}
                onDraftStateChange={(state) =>
                  calculator.handleDraft("alphaPensionDrawAge", state)
                }
              />

              <RangeSettingField
                field={addedPensionField}
                value={calculator.inputs.alphaAddedPensionMonthly}
                settings={calculator.inputs}
                onChange={calculator.onChange}
                resetValue={calculator.resetValues.alphaAddedPensionMonthly}
                showGuidanceNotes
                domIdPrefix="quick"
                strictDraftValidation
                validationIssue={toIssue(
                  "alphaAddedPensionMonthly",
                  calculator.draftErrors.alphaAddedPensionMonthly
                )}
                onDraftStateChange={(state) =>
                  calculator.handleDraft("alphaAddedPensionMonthly", state)
                }
              />

              <SelectSettingField
                field={addedPensionCoverField}
                value={calculator.inputs.alphaAddedPensionFactorType}
                onChange={calculator.onChange}
                showGuidanceNotes
                domIdPrefix="quick"
              />

              <RangeSettingField
                field={reducedHoursAgeField}
                value={calculator.inputs.partialRetirementStartAge}
                settings={calculator.inputs}
                onChange={calculator.onChange}
                resetValue={calculator.resetValues.partialRetirementStartAge}
                showGuidanceNotes
                domIdPrefix="quick"
                strictDraftValidation
                validationIssue={toIssue(
                  "partialRetirementStartAge",
                  calculator.draftErrors.partialRetirementStartAge
                )}
                onDraftStateChange={(state) =>
                  calculator.handleDraft("partialRetirementStartAge", state)
                }
              />

              <RangeSettingField
                field={workPercentField}
                value={calculator.inputs.partialRetirementWorkPercent}
                settings={calculator.inputs}
                onChange={calculator.onChange}
                resetValue={calculator.resetValues.partialRetirementWorkPercent}
                showGuidanceNotes
                domIdPrefix="quick"
                strictDraftValidation
                validationIssue={toIssue(
                  "partialRetirementWorkPercent",
                  calculator.draftErrors.partialRetirementWorkPercent
                )}
                onDraftStateChange={(state) =>
                  calculator.handleDraft("partialRetirementWorkPercent", state)
                }
              />
            </div>

            <details
              className="quick-disclosure"
              key={`state-and-epa-${calculator.resetVersion}`}
            >
              <summary>State Pension and EPA</summary>
              <div className="quick-disclosure-content">
                <label className="field-card checkbox-field-card">
                  <span className="field-header">
                    <span className="field-label">Include State Pension</span>
                  </span>
                  <span className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={calculator.inputs.showStatePension}
                      onChange={(event) =>
                        calculator.onChange(
                          "showStatePension",
                          event.currentTarget.checked
                        )
                      }
                    />
                    <span>
                      Include the entered State Pension assumption from its
                      derived start date.
                    </span>
                  </span>
                </label>
                <div className="field-grid quick-disclosure-field-grid">
                  <CurrencySettingField
                    field={statePensionField}
                    value={calculator.inputs.currentStatePension}
                    onChange={calculator.onChange}
                    resetValue={calculator.resetValues.currentStatePension}
                    showGuidanceNotes
                    disabled={!calculator.inputs.showStatePension}
                    domIdPrefix="quick"
                    strictDraftValidation
                    validationIssue={
                      calculator.inputs.showStatePension
                        ? toIssue(
                            "currentStatePension",
                            calculator.draftErrors.currentStatePension
                          )
                        : undefined
                    }
                    onDraftStateChange={(state) =>
                      calculator.handleDraft("currentStatePension", state)
                    }
                  />
                  <SettingsFields
                    fields={[stateForecastField]}
                    settings={calculator.inputs}
                    validationIssues={resultIssues}
                    onChange={calculator.onChange}
                    showGuidanceNotes
                    useDropdownDates={false}
                    domIdPrefix="quick"
                  />
                </div>
                {statePensionDate ? (
                  <p className="section-copy">
                    Derived State Pension start date:{" "}
                    {formatDate(statePensionDate)}. This does not move with the
                    selected retirement age.
                  </p>
                ) : null}
                <SettingsFields
                  fields={[epaEnabledField]}
                  settings={calculator.inputs}
                  validationIssues={resultIssues}
                  onChange={calculator.onChange}
                  showGuidanceNotes
                  useDropdownDates={false}
                  domIdPrefix="quick"
                />
                {calculator.inputs.alphaEpaEnabled ? (
                  <AlphaEpaPeriodsEditor
                    periods={calculator.inputs.alphaEpaPeriods}
                    defaultStartDate={`${calculator.inputs.alphaPensionAbsDate}-04-01`}
                    validationIssues={resultIssues}
                    domIdPrefix="quick"
                    onChange={calculator.updateEpaPeriods}
                  />
                ) : null}
              </div>
            </details>

            <QuickCalculatorAssumptions
              inflationRateAnnual={calculator.inflationRateAnnual}
            />

            {calculator.storageMessage ? (
              <p className="section-copy quick-storage-status" role="status">
                {calculator.storageMessage}
              </p>
            ) : null}
            <p className="section-copy">
              Manage saved data in{" "}
              <a href={`${appBaseHref}settings/`}>Settings</a>.
            </p>
            <a
              className="primary-button quick-mobile-results-link"
              href="#quick-results"
            >
              View estimates
            </a>
          </div>

          <section
            className="panel quick-calculator-results"
            id="quick-results"
          >
            <div className="panel-heading">
              <p className="eyebrow">Illustrative comparisons</p>
              <h2>Your estimates</h2>
              <p className="quick-results-basis">
                {QUICK_CALCULATOR_RESULT_BASIS.label}
              </p>
              <p className="section-copy">
                These comparisons are illustrations, not recommendations or
                guaranteed pension amounts. Check important decisions against
                your official pension statement.
              </p>
            </div>
            <QuickResults calculator={calculator} />
            <a
              className="static-backlink quick-back-to-inputs"
              href="#quick-inputs"
            >
              Back to inputs
            </a>
          </section>
        </section>

        <section className="panel quick-essential-notice">
          <h2>Planning and illustration only</h2>
          <p className="section-copy">
            This calculator is not financial advice and is not affiliated with
            the Civil Service Pension Scheme, Capita, the Cabinet Office, or the
            Alpha Pension Scheme. Results depend on the assumptions entered and
            the model&apos;s documented limitations.
          </p>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}

export function QuickCalculatorAssumptions({
  inflationRateAnnual,
}: {
  inflationRateAnnual: number;
}) {
  return (
    <details className="quick-disclosure">
      <summary>Assumptions used</summary>
      <ul className="section-copy">
        <li>
          Figures are in today&apos;s money, using an annual inflation
          assumption of {formatPercent(inflationRateAnnual / 100)}, with pension
          increases applied.
        </li>
        <li>
          Pensionable pay stays flat before any reduced-hours assumption.
          Service ends when Alpha starts in each comparison.
        </li>
        <li>
          The statement year uses the 1 April checkpoint. Regular Added Pension
          payments are modelled after that checkpoint, including any supported
          period before today.
        </li>
        <li>
          Outputs are gross annual rates before tax. This page excludes legacy
          pensions, savings, household modelling, spending targets and tax
          controls.
        </li>
      </ul>
    </details>
  );
}

function QuickResults({
  calculator,
}: {
  calculator: ReturnType<typeof useQuickCalculator>;
}) {
  if (!calculator.requiredInputsComplete) {
    return (
      <div className="quick-results-empty" role="status">
        {getQuickCalculatorIncompleteMessage(calculator.completion)}
      </div>
    );
  }

  if (calculator.hasInputProblems) {
    return (
      <div className="quick-results-empty" role="status">
        Correct the highlighted input before estimates can be shown.
      </div>
    );
  }

  if (calculator.calculationState.status === "idle") {
    return (
      <div className="quick-results-empty" role="status" aria-live="polite">
        Calculating eight estimates…
      </div>
    );
  }

  if (
    calculator.calculationState.status === "error" &&
    !calculator.projectedResults
  ) {
    return (
      <div className="quick-results-empty" role="alert">
        <p>The estimates could not be calculated. Your inputs are unchanged.</p>
        <button
          type="button"
          className="primary-button"
          onClick={calculator.retry}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!calculator.projectedResults) {
    return (
      <div className="quick-results-empty" role="status" aria-live="polite">
        Calculating eight estimates…
      </div>
    );
  }

  const results = calculator.projectedResults;
  return (
    <div className="quick-results-content" aria-live="polite">
      {calculator.resultsAreForPreviousInputs ? (
        <p className="quick-pending-note" role="status">
          Updating estimates. The amounts below are for the previous committed
          inputs.
        </p>
      ) : null}
      {calculator.calculationState.status === "error" ? (
        <div className="quick-pending-note" role="alert">
          The latest update failed. Previous estimates remain below.{" "}
          <button
            type="button"
            className="secondary-button"
            onClick={calculator.retry}
          >
            Retry
          </button>
        </div>
      ) : null}
      {results.normalAge === results.selectedAge ? (
        <p className="quick-pending-note">
          Your selected age equals Alpha Normal Pension Age, so matching rows
          show equal estimates.
        </p>
      ) : null}
      <ResultGroup
        title={`At normal pension age — ${formatModelAge(results.normalAge)}`}
        cards={results.cards.filter((card) => card.basis === "normal")}
      />
      <ResultGroup
        title={`At your selected age — ${formatModelAge(results.selectedAge)}`}
        cards={results.cards.filter((card) => card.basis === "selected")}
      />
    </div>
  );
}

function ResultGroup({
  title,
  cards,
}: {
  title: string;
  cards: NonNullable<
    ReturnType<typeof useQuickCalculator>["projectedResults"]
  >["cards"];
}) {
  return (
    <section className="quick-result-group">
      <h3>{title}</h3>
      <div className="quick-result-card-grid">
        {cards.map((card) => (
          <article className="quick-result-card" key={card.id}>
            <h4>{card.label}</h4>
            {card.status === "unavailable" ? (
              <>
                <p className="quick-unavailable">Estimate unavailable</p>
                <ul className="section-copy">
                  {card.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="quick-result-amount">
                  <span>Estimated Alpha pension</span>
                  <strong>
                    {formatCurrency(card.alphaAnnual ?? 0)} per year
                  </strong>
                </p>
                <p className="section-copy">
                  Starts {formatDate(card.alphaDrawDate)} at age{" "}
                  {formatModelAge(card.retirementAge)}.
                </p>
                {card.statePensionIncluded && card.combinedAnnual !== null ? (
                  <p className="quick-result-amount quick-result-amount--secondary">
                    <span>
                      Alpha + State Pension from{" "}
                      {formatDate(card.combinedStartDate ?? "")}
                    </span>
                    <strong>
                      {formatCurrency(card.combinedAnnual)} per year
                    </strong>
                    <small>
                      Annualised rate at that date
                      {!card.statePensionConfirmed
                        ? "; uses an unconfirmed State Pension assumption"
                        : ""}
                    </small>
                  </p>
                ) : null}
                {card.notes.length > 0 ? (
                  <ul className="section-copy quick-card-notes">
                    {card.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function getField(
  id: FieldDefinition["id"],
  overrides: Partial<FieldDefinition> = {}
) {
  const field = fieldGroups
    .flatMap((group) => group.fields)
    .find((candidate) => candidate.id === id);
  if (!field) {
    throw new Error(`Missing field definition: ${id}`);
  }
  return { ...field, ...overrides } as FieldDefinition;
}

function toIssue(
  field: PensionValidationIssue["field"],
  message?: string
): PensionValidationIssue | undefined {
  return message ? { field, message } : undefined;
}
