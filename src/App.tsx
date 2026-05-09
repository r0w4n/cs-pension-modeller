import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type CurrencyInputField,
  fieldGroups,
  type DateField,
  type FieldDefinition,
  type RangeField,
  type SettingsKey,
  type SelectField,
} from "./fieldDefinitions";
import {
  createProjectionTable,
  generatePensionSummary,
  type RetirementIncomeDisplay,
  type ProjectionRow,
} from "./projection";
import {
  createDefaultAddedPensionLumpSum,
  calculateNormalPensionAge,
  createDefaultSettings,
  defaultSettings,
  formatCurrency,
  getAlphaAbsYear,
  calculateStatePensionDrawDate,
  loadStoredSettings,
  normalizeSetting,
  saveSettings,
  validateSettings,
  type AddedPensionLumpSum,
  type PensionSettings,
  type PensionValidationIssue,
} from "./settings";

const ACKNOWLEDGEMENT_STORAGE_KEY = "cs-pension-calculator.acknowledgement";
const ACKNOWLEDGEMENT_VERSION = "v1";
const OPTIONAL_SECTION_TOGGLES = [
  {
    key: "showSipp",
    label: "SIPP",
    description: "Show SIPP inputs and include SIPP values in the calculator.",
  },
  {
    key: "showStatePension",
    label: "State Pension",
    description:
      "Show State Pension inputs and include State Pension values in the calculator.",
  },
  {
    key: "showIsa",
    label: "ISA",
    description: "Show ISA inputs and include ISA values in the calculator.",
  },
] as const;

function App() {
  const [settings, setSettings] = useState<PensionSettings>(loadStoredSettings);
  const [settingsFormVersion, setSettingsFormVersion] = useState(0);
  const [retirementIncomeDisplay, setRetirementIncomeDisplay] =
    useState<RetirementIncomeDisplay>("monthly");
  const [hasAcknowledgedNotice, setHasAcknowledgedNotice] = useState(
    loadAcknowledgementState,
  );
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const savedFeedbackTimer = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );
  const useDropdownDates = useMobileDateDropdowns();
  const deferredSettings = useDeferredValue(settings);
  const validationIssues = useMemo(
    () => validateSettings(deferredSettings),
    [deferredSettings],
  );
  const projectionRows = useMemo(
    () => createProjectionTable(deferredSettings),
    [deferredSettings],
  );
  const pensionSummary = useMemo(
    () => generatePensionSummary(projectionRows, deferredSettings),
    [projectionRows, deferredSettings],
  );
  const retirementIncomeTitle =
    retirementIncomeDisplay === "monthly"
      ? "Monthly retirement income"
      : "Annual retirement income";
  const retirementIncomeItems = pensionSummary.retirementIncome.sources.map((source) => ({
    label:
      retirementIncomeDisplay === "monthly"
        ? `Monthly ${source.label}`
        : `Annual ${source.label}`,
    value: formatCurrencyDetailed(
      retirementIncomeDisplay === "monthly" ? source.monthlyIncome : source.annualIncome,
    ),
  }));
  const retirementIncomeTotal = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? pensionSummary.retirementIncome.totalMonthlyIncome
      : pensionSummary.retirementIncome.totalAnnualIncome,
  );
  const retirementIncomeTargetTitle =
    retirementIncomeDisplay === "monthly"
      ? "Monthly target retirement income"
      : "Annual target retirement income";
  const retirementIncomeTarget = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? settings.desiredRetirementIncome / 12
      : settings.desiredRetirementIncome,
  );

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    return () => {
      if (savedFeedbackTimer.current) {
        window.clearTimeout(savedFeedbackTimer.current);
      }
    };
  }, []);

  function updateSetting<K extends SettingsKey>(key: K, value: PensionSettings[K]) {
    showSavedLabel();
    setSettings((current) => ({
      ...current,
      [key]: normalizeSetting(key, value),
      ...(key === "dateOfBirth"
        ? {
            normalPensionAge: calculateNormalPensionAge(value as string),
            statePensionDrawDate: calculateStatePensionDrawDate(value as string),
          }
        : {}),
    }));
  }

  function resetSettings() {
    showSavedLabel();
    setSettingsFormVersion((current) => current + 1);
    setSettings(createDefaultSettings());
  }

  function showSavedLabel() {
    if (savedFeedbackTimer.current) {
      window.clearTimeout(savedFeedbackTimer.current);
    }

    setShowSavedFeedback(true);
    savedFeedbackTimer.current = window.setTimeout(() => {
      setShowSavedFeedback(false);
      savedFeedbackTimer.current = null;
    }, 1400);
  }

  return (
    <>
      {!hasAcknowledgedNotice ? (
        <div className="acknowledgement-overlay" role="dialog" aria-modal="true" aria-labelledby="acknowledgement-title">
          <section className="acknowledgement-card">
            <p className="eyebrow">Before you continue</p>
            <h2 id="acknowledgement-title">Important information</h2>
            <p className="section-copy">
              This calculator provides estimates for illustrative purposes only. It is not
              financial advice and is not affiliated with or endorsed by the Civil Service
              or the Alpha Pension Scheme. Results should not be relied upon without
              seeking guidance from a qualified financial adviser.
            </p>
            <p className="section-copy">
              Cookies are used for analytics purposes only, and no financial or personal
              information is transmitted.
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={acknowledgeNotice}
            >
              I understand
            </button>
          </section>
        </div>
      ) : null}

      <main className="app-shell" aria-hidden={!hasAcknowledgedNotice}>
        {showSavedFeedback ? (
          <span className="saved-feedback" role="status" aria-live="polite">
            Saved Locally
          </span>
        ) : null}

        <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Civil Service</p>
          <h1>Retirement Income Calculator</h1>
          <p className="lead">
            Plan your retirement income by modelling your Alpha pension together
            with SIPP withdrawals, ISA income and State Pension payments.
          </p>
        </div>

        <div className="hero-actions">
          <article className="summary-card summary-card--accent">
            <p className="card-label">At Alpha pension draw date</p>
            <div className="summary-card-amounts">
              <h2>{formatCurrencyDetailed(pensionSummary.alphaPension.annualAtDraw)}</h2>
              <p className="summary-card-secondary-amount">
                {formatCurrencyDetailed(pensionSummary.alphaPension.monthlyAtDraw)} per month
              </p>
            </div>
            <p>
              Annual Alpha pension after reduction from{" "}
              {formatDate(pensionSummary.keyDates.startsAlphaPension)}.
            </p>
          </article>

          {settings.showSipp ? (
            <article className="summary-card">
              <p className="card-label">SIPP at SIPP draw start</p>
              <div className="summary-card-amounts">
                <h2>{formatCurrencyDetailed(pensionSummary.sippPension.potAtDraw)}</h2>
                <p className="summary-card-secondary-amount">
                  {formatCurrencyDetailed(pensionSummary.sippPension.monthlyAtDraw)} per month
                </p>
              </div>
              <p>
                Projected SIPP pot and monthly drawdown from{" "}
                {formatDate(pensionSummary.keyDates.startsSippDraw)}.
              </p>
            </article>
          ) : null}

          {settings.showIsa ? (
            <article className="summary-card">
              <p className="card-label">ISA at ISA draw start</p>
              <div className="summary-card-amounts">
                <h2>{formatCurrencyDetailed(pensionSummary.isaPension.potAtDraw)}</h2>
                <p className="summary-card-secondary-amount">
                  {formatCurrencyDetailed(pensionSummary.isaPension.monthlyAtDraw)} per month
                </p>
              </div>
              <p>
                Projected ISA pot and monthly drawdown from{" "}
                {formatDate(pensionSummary.keyDates.startsIsaDraw)}.
              </p>
            </article>
          ) : null}

          {settings.showStatePension ? (
            <article className="summary-card">
              <p className="card-label">At State Pension start</p>
              <div className="summary-card-amounts">
                <h2>
                  {formatCurrencyDetailed(
                    pensionSummary.incomeOverTime.monthlyAtStateStart * 12,
                  )}
                </h2>
                <p className="summary-card-secondary-amount">
                  {formatCurrencyDetailed(pensionSummary.incomeOverTime.monthlyAtStateStart)} per
                  month
                </p>
              </div>
              <p>
                Total annual pension from{" "}
                {formatDate(pensionSummary.keyDates.startsStatePension)}, including{" "}
                {formatCurrencyDetailed(pensionSummary.incomeOverTime.monthlyStatePension)}{" "}
                monthly State Pension.
              </p>
            </article>
          ) : null}
        </div>
      </section>

      <SummarySection
        title="Pension Summary"
        headingLevel={2}
        variant="feature"
        description="This summary is generated from the current calculation result, so the same structure can later support side-by-side scenario comparisons."
        items={retirementIncomeItems}
        controls={
          <div
            className="summary-toggle"
            role="group"
            aria-label="Pension Summary display"
          >
            <button
              type="button"
              className={
                retirementIncomeDisplay === "monthly"
                  ? "summary-toggle-button summary-toggle-button--active"
                  : "summary-toggle-button"
              }
              aria-pressed={retirementIncomeDisplay === "monthly"}
              onClick={() => setRetirementIncomeDisplay("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={
                retirementIncomeDisplay === "annual"
                  ? "summary-toggle-button summary-toggle-button--active"
                  : "summary-toggle-button"
              }
              aria-pressed={retirementIncomeDisplay === "annual"}
              onClick={() => setRetirementIncomeDisplay("annual")}
            >
              Annual
            </button>
          </div>
        }
        footer={
          <>
            <div className="summary-total" aria-label={retirementIncomeTitle}>
              <span>{retirementIncomeTitle}</span>
              <strong>{retirementIncomeTotal}</strong>
            </div>
            <div className="summary-target" aria-label={retirementIncomeTargetTitle}>
              <span>{retirementIncomeTargetTitle}</span>
              <strong>{retirementIncomeTarget}</strong>
            </div>
          </>
        }
      />

      <section className="layout">
        <section className="panel settings-panel">
          <div className="panel-heading">
            <h2>Pension Parameters</h2>
            <p className="section-copy">
              These inputs define your pension scenario, letting you see how
              different assumptions affect your outcome.
            </p>
            <button
              type="button"
              className="secondary-button settings-reset-button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={resetSettings}
            >
              Reset parameters
            </button>
          </div>

          <div className="settings-sections" key={settingsFormVersion}>
            {validationIssues.length > 0 ? (
              <section className="settings-section" aria-live="polite">
                <div className="section-heading">
                  <h3>Check these assumptions</h3>
                  <p className="section-copy">
                    The projection is paused until these settings are brought back
                    into a valid range.
                  </p>
                </div>

                <ul className="section-copy">
                  {validationIssues.map((issue) => (
                    <li key={`${issue.field}-${issue.itemId ?? "field"}-${issue.message}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="settings-section">
              <div className="section-heading">
                <h3>Optional sections</h3>
                <p className="section-copy">
                  Show or hide the optional calculator sections without losing any
                  settings you have already entered.
                </p>
              </div>

              <div className="field-grid">
                {OPTIONAL_SECTION_TOGGLES.map((toggle) => (
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
                        onChange={(event) =>
                          updateSetting(
                            toggle.key,
                            event.target.checked as PensionSettings[typeof toggle.key],
                          )
                        }
                      />
                      <span>{toggle.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {fieldGroups
              .filter((group) => isSettingsGroupVisible(group.id, settings))
              .map((group) => (
              <section className="settings-section" key={group.id}>
                <div className="section-heading">
                  <h3>{group.title}</h3>
                  <p className="section-copy">{group.description}</p>
                </div>

                <SettingsFields
                  fields={group.fields}
                  settings={settings}
                  validationIssues={validationIssues}
                  onChange={updateSetting}
                  useDropdownDates={useDropdownDates}
                />

                {group.id === "alpha" ? (
                  <AddedPensionLumpSumsEditor
                    lumpSums={settings.alphaAddedPensionLumpSums}
                    defaultStartDate={settings.startDate}
                    useDropdownDates={useDropdownDates}
                    validationIssues={getValidationIssuesForField(
                      validationIssues,
                      "alphaAddedPensionLumpSums",
                    )}
                    onChange={(nextLumpSums) =>
                      updateSetting("alphaAddedPensionLumpSums", nextLumpSums)
                    }
                  />
                ) : null}

                {group.id === "sipp" ? (
                  <AddedPensionLumpSumsEditor
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
                    onChange={(nextLumpSums) =>
                      updateSetting("sippLumpSums", nextLumpSums)
                    }
                  />
                ) : null}

                {group.id === "isa" ? (
                  <AddedPensionLumpSumsEditor
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
                    onChange={(nextLumpSums) =>
                      updateSetting("isaLumpSums", nextLumpSums)
                    }
                  />
                ) : null}
              </section>
            ))}

            <SummarySection
              title="Calculated details"
              items={[
                {
                  label: "Normal Pension Age",
                  value: `${pensionSummary.calculated.normalPensionAge}`,
                },
                ...(settings.showStatePension
                  ? [
                      {
                        label: "State Pension draw date",
                        value: formatDate(pensionSummary.keyDates.startsStatePension),
                        infoUrl: "https://www.gov.uk/state-pension-age",
                        infoLinkText: "Check State Pension age",
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Monthly pension projection table</h2>
          <p className="section-copy">
            The table is generated from the projection layer so each row stays
            traceable back to the calculator inputs and factor tables.
          </p>
        </div>

        <ProjectionTable rows={projectionRows} settings={settings} />
        </section>
      </main>
    </>
  );

  function acknowledgeNotice() {
    setHasAcknowledgedNotice(true);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        ACKNOWLEDGEMENT_STORAGE_KEY,
        ACKNOWLEDGEMENT_VERSION,
      );
    }
  }
}

type SummaryItem = {
  label: string;
  value: string;
  infoUrl?: string;
  infoLinkText?: string;
};

type SummarySectionProps = {
  title: string;
  items: SummaryItem[];
  headingLevel?: 2 | 3;
  description?: string;
  groupTitle?: string;
  variant?: "compact" | "feature";
  controls?: ReactNode;
  footer?: ReactNode;
};

function SummarySection({
  title,
  items,
  headingLevel = 3,
  description,
  groupTitle,
  variant = "compact",
  controls,
  footer,
}: SummarySectionProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <section className={`summary-section summary-section--${variant}`}>
      <div className="summary-section-header">
        <Heading>{title}</Heading>
        {controls}
      </div>
      {description ? <p className="section-copy">{description}</p> : null}
      <div className="summary-section-inner">
        {groupTitle ? <h3>{groupTitle}</h3> : null}
        <dl className="snapshot-list">
          {items.map(({ label, value, infoUrl, infoLinkText }) => (
            <div key={label}>
              <dt>
                <span className="field-label-group">
                  <span>{label}</span>
                  {infoUrl ? (
                    <InfoLink href={infoUrl} text={infoLinkText ?? `More about ${label}`} />
                  ) : null}
                </span>
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {footer}
      </div>
    </section>
  );
}

function FieldLabel({ field }: { field: FieldDefinition }) {
  const infoUrl = "infoUrl" in field ? field.infoUrl : undefined;
  const infoLinkText = "infoLinkText" in field ? field.infoLinkText : undefined;

  return (
    <span className="field-label-group">
      <span className="field-label">{field.label}</span>
      {infoUrl ? (
        <InfoLink href={infoUrl} text={infoLinkText ?? `More about ${field.label}`} />
      ) : null}
    </span>
  );
}

function InfoLink({ href, text }: { href: string; text: string }) {
  return (
    <a className="field-info-link" href={href} target="_blank" rel="noreferrer">
      {text}
    </a>
  );
}

type SettingsFieldsProps = {
  fields: readonly FieldDefinition[];
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onChange: FieldProps["onChange"];
  useDropdownDates: boolean;
};

function SettingsFields({
  fields,
  settings,
  validationIssues,
  onChange,
  useDropdownDates,
}: SettingsFieldsProps) {
  const baseFields = fields.filter(
    (field) => !["applyPensionIncreases", "assumedCpiPercent"].includes(field.id),
  );
  const pensionIncreaseFields = fields.filter((field) =>
    ["applyPensionIncreases", "assumedCpiPercent"].includes(field.id),
  );

  return (
    <>
      <div className="field-grid">
        {baseFields.map((field) => (
          <Field
            key={field.id}
            field={field}
            value={settings[field.id]}
            onChange={onChange}
            useDropdownDates={useDropdownDates}
            disabled={isFieldDisabled(field.id, settings)}
            hideOnMobile={isFieldHiddenOnMobile(field.id, settings)}
            validationIssue={getValidationIssueForField(validationIssues, field.id)}
          />
        ))}
      </div>

      {pensionIncreaseFields.length > 0 ? (
        <div className="settings-subsection">
          <div className="settings-subsection-heading">
            <h4>Pension increases</h4>
            <p className="section-copy">
              Revalue Alpha benefits annually by CPI + 1.6% while active, and CPI
              after leaving Alpha service.
            </p>
          </div>
          <div className="field-grid">
            {pensionIncreaseFields.map((field) => (
              <Field
                key={field.id}
                field={field}
                value={settings[field.id]}
                onChange={onChange}
                useDropdownDates={useDropdownDates}
                disabled={isFieldDisabled(field.id, settings)}
                hideOnMobile={isFieldHiddenOnMobile(field.id, settings)}
                validationIssue={getValidationIssueForField(validationIssues, field.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function isFieldDisabled(fieldId: FieldDefinition["id"], settings: PensionSettings) {
  return (
    (fieldId === "assumedCpiPercent" && !settings.applyPensionIncreases) ||
    (["statePensionCpiPercent", "statePensionWageGrowthPercent"].includes(
      fieldId,
    ) &&
      !settings.statePensionApplyFutureGrowth) ||
    (fieldId === "sippRealInterestPercent" && !settings.sippApplyRealInterest) ||
    (fieldId === "sippWithdrawalPercent" &&
      settings.sippWithdrawalStrategy !== "percentage") ||
    (fieldId === "isaRealInterestPercent" && !settings.isaApplyRealInterest) ||
    (fieldId === "isaWithdrawalPercent" &&
      settings.isaWithdrawalStrategy !== "percentage") ||
    (["alphaEpaYearsBeforeNpa", "alphaEpaStartDate", "alphaEpaEndDate"].includes(
      fieldId,
    ) &&
      !settings.alphaEpaEnabled)
  );
}

function isFieldHiddenOnMobile(fieldId: FieldDefinition["id"], settings: PensionSettings) {
  return (
    (fieldId === "assumedCpiPercent" && !settings.applyPensionIncreases) ||
    (["statePensionCpiPercent", "statePensionWageGrowthPercent"].includes(
      fieldId,
    ) &&
      !settings.statePensionApplyFutureGrowth) ||
    (fieldId === "sippRealInterestPercent" && !settings.sippApplyRealInterest) ||
    (fieldId === "sippWithdrawalPercent" &&
      settings.sippWithdrawalStrategy !== "percentage") ||
    (fieldId === "isaRealInterestPercent" && !settings.isaApplyRealInterest) ||
    (fieldId === "isaWithdrawalPercent" &&
      settings.isaWithdrawalStrategy !== "percentage") ||
    (["alphaEpaYearsBeforeNpa", "alphaEpaStartDate", "alphaEpaEndDate"].includes(
      fieldId,
    ) &&
      !settings.alphaEpaEnabled)
  );
}

function getValidationIssueForField(
  validationIssues: PensionValidationIssue[],
  fieldId: FieldDefinition["id"],
) {
  return validationIssues.find((issue) => issue.field === fieldId);
}

function getValidationIssuesForField(
  validationIssues: PensionValidationIssue[],
  fieldId: SettingsKey,
) {
  return validationIssues.filter((issue) => issue.field === fieldId);
}

function getFieldCardClassName(
  disabled: boolean,
  hideOnMobile: boolean,
  hasValidationIssue = false,
) {
  return [
    "field-card",
    disabled ? "field-card--disabled" : "",
    hideOnMobile ? "field-card--mobile-hidden" : "",
    hasValidationIssue ? "field-card--invalid" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type FieldProps = {
  field: FieldDefinition;
  value: PensionSettings[SettingsKey];
  onChange: <K extends SettingsKey>(key: K, value: PensionSettings[K]) => void;
  useDropdownDates: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
};

function Field({
  field,
  value,
  onChange,
  useDropdownDates,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: FieldProps) {
  if (field.type === "date") {
    return (
      <DateSettingField
        field={field}
        value={value as string}
        onChange={onChange}
        useDropdowns={useDropdownDates}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "year") {
    return (
      <YearSettingField
        field={field as DateField & { type: "year" }}
        value={value as string}
        onChange={onChange}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "range") {
    return (
      <RangeSettingField
        field={field}
        value={value as number}
        onChange={onChange}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "select") {
    return (
      <SelectSettingField
        field={field as SelectField}
        value={value as string}
        onChange={onChange}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "checkbox") {
    const validationId = validationIssue ? `${field.id}-validation` : undefined;

    return (
      <label
        className={`${getFieldCardClassName(false, false, Boolean(validationIssue))} checkbox-field-card`}
      >
        <span className="field-header">
          <FieldLabel field={field} />
        </span>
        <span className="checkbox-row">
          <input
            aria-label={field.label}
            type="checkbox"
            checked={value as boolean}
            aria-invalid={Boolean(validationIssue) || undefined}
            aria-describedby={validationId}
            onChange={(event) =>
              onChange(
                field.id,
                event.target.checked as PensionSettings[typeof field.id],
              )
            }
          />
          <span>{field.description}</span>
        </span>
        <FieldValidationMessage id={validationId} issue={validationIssue} />
      </label>
    );
  }

  if (field.type === "currency-input") {
    return (
      <CurrencySettingField
        field={field as CurrencyInputField}
        value={value as number}
        onChange={onChange}
        validationIssue={validationIssue}
      />
    );
  }

  return null;
}

function YearSettingField({
  field,
  value,
  onChange,
  validationIssue,
}: {
  field: DateField & { type: "year" };
  value: string;
  onChange: FieldProps["onChange"];
  validationIssue?: PensionValidationIssue;
}) {
  const draftYear = getAlphaAbsYear(value);
  const currentYear = new Date().getUTCFullYear();
  const firstAbsYear = 2015;
  const yearOptions = Array.from(
    { length: currentYear - firstAbsYear + 1 },
    (_, index) => currentYear - index,
  );

  return (
    <YearSettingFieldEditor
      key={value}
      field={field}
      initialYear={draftYear.toString()}
      yearOptions={yearOptions}
      onChange={onChange}
      validationIssue={validationIssue}
    />
  );
}

function YearSettingFieldEditor({
  field,
  initialYear,
  yearOptions,
  onChange,
  validationIssue,
}: {
  field: DateField & { type: "year" };
  initialYear: string;
  yearOptions: number[];
  onChange: FieldProps["onChange"];
  validationIssue?: PensionValidationIssue;
}) {
  const [localYear, setLocalYear] = useState(initialYear);
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  return (
    <label className={getFieldCardClassName(false, false, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <select
        aria-label={field.label}
        className="select-input"
        value={localYear}
        aria-invalid={Boolean(validationIssue) || undefined}
        aria-describedby={validationId}
        onChange={(event) => {
          setLocalYear(event.target.value);
        }}
        onBlur={(event) => {
          onChange(field.id, event.target.value as PensionSettings[typeof field.id]);
        }}
      >
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </label>
  );
}

function SelectSettingField({
  field,
  value,
  onChange,
  validationIssue,
}: {
  field: SelectField;
  value: string;
  onChange: FieldProps["onChange"];
  validationIssue?: PensionValidationIssue;
}) {
  return (
    <SelectSettingFieldEditor
      key={value}
      field={field}
      initialValue={value}
      onChange={onChange}
      validationIssue={validationIssue}
    />
  );
}

function SelectSettingFieldEditor({
  field,
  initialValue,
  onChange,
  validationIssue,
}: {
  field: SelectField;
  initialValue: string;
  onChange: FieldProps["onChange"];
  validationIssue?: PensionValidationIssue;
}) {
  const [draftValue, setDraftValue] = useState(initialValue);
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  return (
    <label className={getFieldCardClassName(false, false, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <select
        aria-label={field.label}
        className="select-input"
        value={draftValue}
        aria-invalid={Boolean(validationIssue) || undefined}
        aria-describedby={validationId}
        onChange={(event) => {
          setDraftValue(event.target.value);
        }}
        onBlur={(event) =>
          onChange(
            field.id,
            event.target.value as PensionSettings[typeof field.id],
          )
        }
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </label>
  );
}

function CurrencySettingField({
  field,
  value,
  onChange,
  validationIssue,
}: {
  field: CurrencyInputField;
  value: number;
  onChange: FieldProps["onChange"];
  validationIssue?: PensionValidationIssue;
}) {
  const resetValue = defaultSettings[field.id] as PensionSettings[typeof field.id];

  return (
    <CurrencySettingFieldEditor
      key={value}
      field={field}
      initialValue={value}
      resetValue={resetValue}
      onChange={onChange}
      validationIssue={validationIssue}
    />
  );
}

function CurrencySettingFieldEditor({
  field,
  initialValue,
  resetValue,
  onChange,
  validationIssue,
}: {
  field: CurrencyInputField;
  initialValue: number;
  resetValue: PensionSettings[typeof field.id];
  onChange: FieldProps["onChange"];
  validationIssue?: PensionValidationIssue;
}) {
  const [draftValue, setDraftValue] = useState(initialValue.toString());
  const showsResetButton = field.id !== "desiredRetirementIncome";
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  const commitDraftValue = (nextDraftValue: string) => {
    const parsedValue = nextDraftValue.trim() === "" ? 0 : Number(nextDraftValue);
    const nextValue = Number.isFinite(parsedValue) ? parsedValue : initialValue;
    onChange(field.id, nextValue as PensionSettings[typeof field.id]);
    setDraftValue(
      normalizeSetting(field.id, nextValue as PensionSettings[typeof field.id]).toString(),
    );
  };

  const applyPresetValue = (
    presetValue: NonNullable<CurrencyInputField["presets"]>[number]["value"],
  ) => {
    setDraftValue(presetValue.toString());
    onChange(field.id, presetValue as PensionSettings[typeof field.id]);
  };

  return (
    <div className={getFieldCardClassName(false, false, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <input
        aria-label={field.label}
        className="select-input"
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={draftValue}
        aria-invalid={Boolean(validationIssue) || undefined}
        aria-describedby={validationId}
        onChange={(event) => {
          setDraftValue(event.target.value);
        }}
        onBlur={(event) => {
          commitDraftValue(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraftValue(event.currentTarget.value);
            event.currentTarget.blur();
          }
        }}
      />
      {field.presets?.length ? (
        <div className="field-preset-group" aria-label={`${field.label} presets`}>
          {field.presets.map((preset) => (
            <button
              key={`${preset.label}-${preset.value}-${preset.description ?? ""}`}
              type="button"
              className="field-preset-button"
              aria-label={preset.description ? `${preset.label}: ${preset.description}` : preset.label}
              title={preset.description}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                applyPresetValue(preset.value);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
      {showsResetButton ? (
        <button
          type="button"
          className="secondary-button field-reset-button"
          aria-label={`Reset ${field.label} to default`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraftValue(resetValue.toString());
            onChange(field.id, resetValue);
          }}
        >
          Reset to default
        </button>
      ) : null}
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

function RangeSettingField({
  field,
  value,
  onChange,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: RangeField;
  value: number;
  onChange: FieldProps["onChange"];
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const [draftValue, setDraftValue] = useState<number | null>(null);
  const [draftExactValue, setDraftExactValue] = useState<string | null>(null);
  const canResetToDefault = field.id === "assumedCpiPercent";
  const resetValue = defaultSettings[field.id] as PensionSettings[typeof field.id];
  const isEditingExactValue = draftExactValue !== null;
  const parsedDraftExactValue =
    draftExactValue === null || draftExactValue.trim() === ""
      ? Number.NaN
      : Number(draftExactValue);
  const hasValidDraftExactValue =
    Number.isFinite(parsedDraftExactValue) &&
    parsedDraftExactValue >= field.min &&
    parsedDraftExactValue <= field.max;
  const displayedRangeValue = hasValidDraftExactValue
    ? parsedDraftExactValue
    : draftValue ?? value;
  const displayedExactValue = draftExactValue ?? displayedRangeValue.toString();
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  const commitRangeValue = (nextValue: number) => {
    onChange(field.id, nextValue as PensionSettings[typeof field.id]);
    setDraftValue(null);
    setDraftExactValue(null);
  };

  const updateDraftExactValue = (nextDraftValue: string) => {
    const parsedValue = Number(nextDraftValue);

    if (
      nextDraftValue.trim() !== "" &&
      Number.isFinite(parsedValue) &&
      parsedValue >= field.min &&
      parsedValue <= field.max
    ) {
      setDraftValue(parsedValue);
    }
  };

  const normalizeExactValue = (nextDraftValue: string) => {
    const parsedValue = Number(nextDraftValue);
    const nextValue =
      nextDraftValue.trim() === "" || !Number.isFinite(parsedValue)
        ? displayedRangeValue
        : parsedValue;

    commitRangeValue(nextValue);
  };

  return (
    <div className={getFieldCardClassName(disabled, hideOnMobile, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <div className="range-control-grid">
        <div className="range-slider-group">
          <input
            aria-label={field.label}
            className="range-input"
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={displayedRangeValue}
            disabled={disabled}
            aria-invalid={Boolean(validationIssue) || undefined}
            aria-describedby={validationId}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setDraftValue(nextValue);
              if (!isEditingExactValue) {
                setDraftExactValue(null);
              }
            }}
            onMouseUp={(event) => commitRangeValue(Number(event.currentTarget.value))}
            onTouchEnd={(event) => commitRangeValue(Number(event.currentTarget.value))}
            onBlur={(event) => commitRangeValue(Number(event.currentTarget.value))}
          />
          <div className="range-scale">
            <span>{formatFieldValue(field.min, field.format)}</span>
            <span>{formatFieldValue(field.max, field.format)}</span>
          </div>
        </div>
        <input
          aria-label={`${field.label} exact value`}
          className="number-input"
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={displayedExactValue}
          disabled={disabled}
          aria-invalid={Boolean(validationIssue) || undefined}
          aria-describedby={validationId}
          onFocus={(event) => {
            setDraftExactValue(event.currentTarget.value);
          }}
          onChange={(event) => {
            const nextDraftValue = event.target.value;
            setDraftExactValue(nextDraftValue);
            updateDraftExactValue(nextDraftValue);
          }}
          onBlur={(event) => {
            normalizeExactValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              normalizeExactValue(event.currentTarget.value);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      {canResetToDefault ? (
        <button
          type="button"
          className="secondary-button field-reset-button"
          aria-label="Reset assumed CPI to default"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange(field.id, resetValue);
            setDraftValue(null);
            setDraftExactValue(null);
          }}
        >
          Reset to default
        </button>
      ) : null}
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

type DateParts = {
  year: string;
  month: string;
  day: string;
};

type DateSelectFieldProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  idPrefix: string;
  yearRange: {
    min: number;
    max: number;
  };
  disabled?: boolean;
  describedBy?: string;
  hasValidationIssue?: boolean;
};

function DateSelectField({
  label,
  value,
  onChange,
  idPrefix,
  yearRange,
  disabled = false,
  describedBy,
  hasValidationIssue = false,
}: DateSelectFieldProps) {
  const parts = getDateParts(value);
  const selectedYear = Number(parts.year);
  const selectedMonth = Number(parts.month);
  const minYear = Math.min(
    yearRange.min,
    Number.isFinite(selectedYear) ? selectedYear : yearRange.min,
  );
  const maxYear = Math.max(
    yearRange.max,
    Number.isFinite(selectedYear) ? selectedYear : yearRange.max,
  );
  const yearOptions = Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => String(maxYear - index),
  );
  const dayCount = getDaysInMonth(selectedYear, selectedMonth);
  const dayOptions = Array.from({ length: dayCount }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );

  const commit = (nextParts: DateParts) => {
    const nextValue = `${nextParts.year}-${nextParts.month}-${nextParts.day}`;
    onChange(nextValue);
  };

  return (
    <div
      className="date-select-grid"
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
    >
      <label className="date-select-field" htmlFor={`${idPrefix}-day`}>
        <span className="date-select-label">Day</span>
        <select
          id={`${idPrefix}-day`}
          aria-label={`${label} day`}
          className="select-input"
          value={parts.day}
          disabled={disabled}
          aria-invalid={hasValidationIssue || undefined}
          onChange={(event) => commit({ ...parts, day: event.target.value })}
        >
          {dayOptions.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <label className="date-select-field" htmlFor={`${idPrefix}-month`}>
        <span className="date-select-label">Month</span>
        <select
          id={`${idPrefix}-month`}
          aria-label={`${label} month`}
          className="select-input"
          value={parts.month}
          disabled={disabled}
          aria-invalid={hasValidationIssue || undefined}
          onChange={(event) => {
            const nextMonth = event.target.value;
            const nextDay = clampDay(parts.day, parts.year, nextMonth);
            commit({ ...parts, month: nextMonth, day: nextDay });
          }}
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </label>

      <label className="date-select-field" htmlFor={`${idPrefix}-year`}>
        <span className="date-select-label">Year</span>
        <select
          id={`${idPrefix}-year`}
          aria-label={`${label} year`}
          className="select-input"
          value={parts.year}
          disabled={disabled}
          aria-invalid={hasValidationIssue || undefined}
          onChange={(event) => {
            const nextYear = event.target.value;
            const nextDay = clampDay(parts.day, nextYear, parts.month);
            commit({ ...parts, year: nextYear, day: nextDay });
          }}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function DateSettingField({
  field,
  value,
  onChange,
  useDropdowns,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: DateField;
  value: string;
  onChange: FieldProps["onChange"];
  useDropdowns: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  function commitDateValue(nextValue: string) {
    const normalizedValue = normalizeSetting(
      field.id,
      nextValue as PensionSettings[typeof field.id],
    ) as string;

    onChange(field.id, normalizedValue as PensionSettings[typeof field.id]);
  }

  return (
    <div className={getFieldCardClassName(disabled, hideOnMobile, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      {useDropdowns ? (
        <DateSelectField
          label={field.label}
          value={value}
          idPrefix={field.id}
          yearRange={getPrimaryDateYearRange(field.id)}
          disabled={disabled}
          describedBy={validationId}
          hasValidationIssue={Boolean(validationIssue)}
          onChange={(nextValue) => {
            commitDateValue(nextValue);
          }}
        />
      ) : (
        <input
          key={value}
          aria-label={field.label}
          className="date-input"
          type="date"
          defaultValue={value}
          disabled={disabled}
          aria-invalid={Boolean(validationIssue) || undefined}
          aria-describedby={validationId}
          onBlur={(event) => {
            commitDateValue(event.target.value);
          }}
        />
      )}
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

function FieldValidationMessage({
  id,
  issue,
}: {
  id?: string;
  issue?: PensionValidationIssue;
}) {
  if (!issue || !id) {
    return null;
  }

  return (
    <p id={id} className="field-error">
      {issue.message}
    </p>
  );
}

function FieldValidationMessages({
  id,
  issues,
}: {
  id?: string;
  issues: PensionValidationIssue[];
}) {
  if (!id || issues.length === 0) {
    return null;
  }

  return (
    <ul id={id} className="field-error-list">
      {issues.map((issue) => (
        <li key={`${issue.itemId ?? "field"}-${issue.message}`}>{issue.message}</li>
      ))}
    </ul>
  );
}

function formatFieldValue(value: number, format?: "currency") {
  if (format === "currency") {
    return formatCurrency(value);
  }

  return value.toString();
}

type ProjectionTableProps = {
  rows: ProjectionRow[];
  settings: PensionSettings;
};

type ProjectionTableColumn = {
  key: string;
  label: string;
  width: string;
  setting?: "showStatePension" | "showSipp" | "showIsa";
};

const projectionTableColumns: ProjectionTableColumn[] = [
  { key: "date", label: "Date", width: "7rem" },
  {
    key: "totalMonthlyPensionTakeHomePay",
    label: "Total Monthly Pension Income",
    width: "8rem",
  },
  { key: "age", label: "Age (years/months)", width: "7rem" },
  { key: "monthlyAddedPension", label: "Monthly Added Pension", width: "7rem" },
  { key: "lumpSumAddedPension", label: "Lump sum added pension", width: "7rem" },
  { key: "annualStandardAlphaPension", label: "Standard Alpha Pension", width: "8rem" },
  { key: "annualEpaAlphaPension", label: "EPA Alpha Pension", width: "8rem" },
  { key: "annualAccruedAlphaPension", label: "Annual Accrued Alpha Pension", width: "8rem" },
  {
    key: "annualAlphaPensionIncludingReduction",
    label: "Annual Alpha Pension Including Reduction",
    width: "9rem",
  },
  { key: "monthlyAlphaPensionTakeHome", label: "Monthly Alpha Pension take-home", width: "7rem" },
  {
    key: "monthlyStatePension",
    label: "Monthly State pension",
    width: "6rem",
    setting: "showStatePension",
  },
  {
    key: "monthlySippPension",
    label: "Monthly SIPP pension",
    width: "7rem",
    setting: "showSipp",
  },
  {
    key: "monthlyIsaPension",
    label: "Monthly ISA pension",
    width: "7rem",
    setting: "showIsa",
  },
] as const;

function ProjectionTable({ rows, settings }: ProjectionTableProps) {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(true);
  const visibleColumns = projectionTableColumns.filter(
    (column) => !column.setting || settings[column.setting],
  );
  const visibleRows = showMilestonesOnly
    ? rows.filter((row) => row.milestones.length > 0)
    : rows;
  const milestoneRowCount = rows.filter((row) => row.milestones.length > 0).length;

  const syncHeaderScroll = (scrollLeft: number) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  if (rows.length === 0) {
    return (
      <div className="table-shell">
        <p>No projection rows are available for the current settings.</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <div className="table-controls">
        <button
          type="button"
          className="secondary-button"
          aria-pressed={showMilestonesOnly}
          onClick={() => setShowMilestonesOnly((current) => !current)}
        >
          {showMilestonesOnly ? "Show all rows" : "Only show milestone rows"}
        </button>
        <p className="table-status">
          Showing {visibleRows.length} of {rows.length} rows
          {showMilestonesOnly ? ` (${milestoneRowCount} milestones)` : ""}.
        </p>
      </div>

      <div className="table-header-shell">
        <div className="table-header-scroll" ref={headerScrollRef}>
          <table className="projection-table projection-table--header" aria-hidden="true">
            <colgroup>
              {visibleColumns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      </div>

      <div className="table-body-shell" onScroll={(event) => syncHeaderScroll(event.currentTarget.scrollLeft)}>
        <table className="projection-table projection-table--body">
          <colgroup>
            {visibleColumns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className="projection-table-sr-only">
            <tr>
              {visibleColumns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.date}
                className={row.milestones.length > 0 ? "projection-row projection-row--milestone" : "projection-row"}
                title={row.milestones.length > 0 ? row.milestones.join(", ") : undefined}
              >
                <td>
                  <div className="projection-date-cell">
                    <span>{formatDate(row.milestoneDates[0] ?? row.date)}</span>
                    {row.milestones.length > 0 ? (
                      <span className="milestone-badges">
                        {row.milestones.map((milestone: string) => (
                          <span className="milestone-badge" key={`${row.date}-${milestone}`}>
                            {milestone}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td>{formatCurrencyDetailed(row.totalMonthlyPensionTakeHomePay)}</td>
                <td>{formatAge(row.age, row.ageMonths)}</td>
                <td>{formatCurrencyDetailed(row.monthlyAddedPension)}</td>
                <td>{formatCurrencyDetailed(row.lumpSumAddedPension)}</td>
                <td>{formatCurrencyDetailed(row.annualStandardAlphaPension)}</td>
                <td>{formatCurrencyDetailed(row.annualEpaAlphaPension)}</td>
                <td>{formatCurrencyDetailed(row.annualAccruedAlphaPension)}</td>
                <td>{formatCurrencyDetailed(row.annualAlphaPensionIncludingReduction)}</td>
                <td>{formatCurrencyDetailed(row.monthlyAlphaPensionTakeHome)}</td>
                {settings.showStatePension ? (
                  <td>{formatCurrencyDetailed(row.monthlyStatePension)}</td>
                ) : null}
                {settings.showSipp ? (
                  <td>{formatCurrencyDetailed(row.monthlySippPension)}</td>
                ) : null}
                {settings.showIsa ? (
                  <td>{formatCurrencyDetailed(row.monthlyIsaPension)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAge(years: number, months: number) {
  return `${years}y ${months}m`;
}

function isSettingsGroupVisible(groupId: string, settings: PensionSettings) {
  if (groupId === "state") {
    return settings.showStatePension;
  }

  if (groupId === "sipp") {
    return settings.showSipp;
  }

  if (groupId === "isa") {
    return settings.showIsa;
  }

  return true;
}

type AddedPensionLumpSumsEditorProps = {
  lumpSums: AddedPensionLumpSum[];
  defaultStartDate: string;
  useDropdownDates: boolean;
  title?: string;
  description?: string;
  emptyText?: string;
  itemLabel?: string;
  addButtonLabel?: string;
  removeButtonLabel?: string;
  validationIssues?: PensionValidationIssue[];
  onChange: (nextLumpSums: AddedPensionLumpSum[]) => void;
};

function AddedPensionLumpSumsEditor({
  lumpSums,
  defaultStartDate,
  useDropdownDates,
  title = "Lump sum purchases",
  description = "Add one-off or yearly lump sum purchases. A yearly entry repeats on the same calendar date until its end date.",
  emptyText = "No lump sum added pension purchases set up yet.",
  itemLabel = "Lump sum",
  addButtonLabel = "Add lump sum purchase",
  removeButtonLabel = "Remove lump sum",
  validationIssues = [],
  onChange,
}: AddedPensionLumpSumsEditorProps) {
  function updateLumpSum(
    id: string,
    patch: Partial<AddedPensionLumpSum>,
  ) {
    onChange(
      lumpSums.map((lumpSum) => (lumpSum.id === id ? { ...lumpSum, ...patch } : lumpSum)),
    );
  }

  function addLumpSum() {
    onChange([...lumpSums, createDefaultAddedPensionLumpSum(defaultStartDate)]);
  }

  function removeLumpSum(id: string) {
    onChange(lumpSums.filter((lumpSum) => lumpSum.id !== id));
  }

  return (
    <div className="lump-sum-editor">
      <div className="lump-sum-editor-heading">
        <h4>{title}</h4>
        <p className="section-copy">{description}</p>
      </div>

      <div className="field-grid">
        {lumpSums.length === 0 ? (
          <p className="section-copy">{emptyText}</p>
        ) : null}

        {lumpSums.map((lumpSum, index) => {
          const lumpSumValidationIssues = validationIssues.filter(
            (issue) => issue.itemId === lumpSum.id,
          );
          const validationId = lumpSumValidationIssues.length
            ? `lump-sum-${lumpSum.id}-validation`
            : undefined;
          const hasValidationIssue = lumpSumValidationIssues.length > 0;

          return (
          <div
            className={getFieldCardClassName(false, false, hasValidationIssue)}
            key={lumpSum.id}
          >
            <span className="field-header">
              <span className="field-label">{itemLabel} #{index + 1}</span>
            </span>

            <label className="field-label" htmlFor={`lump-sum-amount-${lumpSum.id}`}>
              Amount (£)
            </label>
            <input
              id={`lump-sum-amount-${lumpSum.id}`}
              aria-label={`${itemLabel} amount ${index + 1}`}
              className="select-input"
              min={0}
              step={500}
              type="number"
              value={lumpSum.amount}
              aria-invalid={hasValidationIssue || undefined}
              aria-describedby={validationId}
              onChange={(event) =>
                updateLumpSum(lumpSum.id, { amount: Number(event.target.value) })
              }
            />

            <span className="field-label">Payment start date</span>
            {useDropdownDates ? (
              <DateSelectField
                label={`${itemLabel} start date ${index + 1}`}
                value={lumpSum.startDate}
                idPrefix={`lump-sum-start-${lumpSum.id}`}
                yearRange={getLumpSumDateYearRange("start")}
                describedBy={validationId}
                hasValidationIssue={hasValidationIssue}
                onChange={(nextValue) =>
                  updateLumpSum(lumpSum.id, { startDate: nextValue })
                }
              />
            ) : (
              <input
                id={`lump-sum-start-${lumpSum.id}`}
                aria-label={`${itemLabel} start date ${index + 1}`}
                className="date-input"
                type="date"
                value={lumpSum.startDate}
                aria-invalid={hasValidationIssue || undefined}
                aria-describedby={validationId}
                onChange={(event) =>
                  updateLumpSum(lumpSum.id, { startDate: event.target.value })
                }
              />
            )}

            <label className="field-label" htmlFor={`lump-sum-cadence-${lumpSum.id}`}>
              Cadence
            </label>
            <select
              id={`lump-sum-cadence-${lumpSum.id}`}
              aria-label={`${itemLabel} cadence ${index + 1}`}
              className="date-input"
              value={lumpSum.cadence}
              aria-invalid={hasValidationIssue || undefined}
              aria-describedby={validationId}
              onChange={(event) =>
                updateLumpSum(lumpSum.id, {
                  cadence: event.target.value as AddedPensionLumpSum["cadence"],
                })
              }
            >
              <option value="once">One-off</option>
              <option value="yearly">Yearly</option>
            </select>

            {lumpSum.cadence === "yearly" ? (
              <>
                <span className="field-label">Repeat until</span>
                {useDropdownDates ? (
                  <DateSelectField
                    label={`${itemLabel} end date ${index + 1}`}
                    value={lumpSum.endDate}
                    idPrefix={`lump-sum-end-${lumpSum.id}`}
                    yearRange={getLumpSumDateYearRange("end")}
                    describedBy={validationId}
                    hasValidationIssue={hasValidationIssue}
                    onChange={(nextValue) =>
                      updateLumpSum(lumpSum.id, { endDate: nextValue })
                    }
                  />
                ) : (
                  <input
                    id={`lump-sum-end-${lumpSum.id}`}
                    aria-label={`${itemLabel} end date ${index + 1}`}
                    className="date-input"
                    type="date"
                    value={lumpSum.endDate}
                    aria-invalid={hasValidationIssue || undefined}
                    aria-describedby={validationId}
                    onChange={(event) =>
                      updateLumpSum(lumpSum.id, { endDate: event.target.value })
                    }
                  />
                )}
              </>
            ) : null}

            <button
              type="button"
              className="secondary-button"
              onClick={() => removeLumpSum(lumpSum.id)}
            >
              {removeButtonLabel}
            </button>
            <FieldValidationMessages
              id={validationId}
              issues={lumpSumValidationIssues}
            />
          </div>
          );
        })}
      </div>

      <button type="button" className="secondary-button" onClick={addLumpSum}>
        {addButtonLabel}
      </button>
    </div>
  );
}

const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

function getDateParts(value: string): DateParts {
  const [year = "", month = "", day = ""] = value.split("-");
  return { year, month, day };
}

function getDaysInMonth(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 31;
  }

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(day: string, year: string, month: string) {
  const maxDay = getDaysInMonth(Number(year), Number(month));
  const nextDay = Math.min(Number(day), maxDay);
  return String(nextDay).padStart(2, "0");
}

function getPrimaryDateYearRange(fieldId: DateField["id"]) {
  const currentYear = new Date().getUTCFullYear();

  switch (fieldId) {
    case "dateOfBirth":
      return { min: currentYear - 100, max: currentYear };
    case "startDate":
      return { min: currentYear - 5, max: currentYear + 5 };
    case "alphaPensionAbsDate":
      return { min: 2015, max: currentYear };
    default:
      return { min: currentYear - 25, max: currentYear + 25 };
  }
}

function getLumpSumDateYearRange(kind: "start" | "end") {
  const currentYear = new Date().getUTCFullYear();

  if (kind === "start") {
    return { min: currentYear - 5, max: currentYear + 40 };
  }

  return { min: currentYear - 5, max: currentYear + 50 };
}

function useMobileDateDropdowns() {
  const mobileBreakpoint = "(max-width: 480px)";
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(mobileBreakpoint).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(mobileBreakpoint);
    const updateMatch = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", updateMatch);

    return () => {
      mediaQuery.removeEventListener("change", updateMatch);
    };
  }, []);

  return matches;
}

function loadAcknowledgementState() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.localStorage.getItem(ACKNOWLEDGEMENT_STORAGE_KEY) ===
    ACKNOWLEDGEMENT_VERSION
  );
}

export default App;
