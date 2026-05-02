import { useEffect, useRef, useState } from "react";
import {
  fieldGroups,
  type DateField,
  type FieldDefinition,
  type SettingsKey,
} from "./fieldDefinitions";
import {
  createProjectionTable,
  generatePensionSummary,
  type PensionSummary,
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
} from "./settings";

function App() {
  const [settings, setSettings] = useState<PensionSettings>(loadStoredSettings);
  const useDropdownDates = useMobileDateDropdowns();
  const validationIssues = validateSettings(settings);
  const projectionRows = createProjectionTable(settings);
  const pensionSummary = generatePensionSummary(projectionRows, settings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  function updateSetting<K extends SettingsKey>(key: K, value: PensionSettings[K]) {
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
    setSettings(createDefaultSettings());
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Civil Service Alpha</p>
          <h1>Pension Summary</h1>
          <p className="lead">
            A concise read-out of what you are projected to receive, when key
            pension milestones land, and how monthly income changes across
            retirement phases.
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
              {formatDate(pensionSummary.keyDates.startsStatePension)}.
            </p>
          </article>
        </div>
      </section>

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
              onClick={resetSettings}
            >
              Reset parameters
            </button>
          </div>

          <div className="settings-sections">
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
                    <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {fieldGroups.map((group) => (
              <section className="settings-section" key={group.id}>
                <div className="section-heading">
                  <h3>{group.title}</h3>
                  <p className="section-copy">{group.description}</p>
                </div>

                <div className="field-grid">
                  {group.fields.map((field) => (
                    <Field
                      key={field.id}
                      field={field}
                      value={settings[field.id]}
                      onChange={updateSetting}
                      useDropdownDates={useDropdownDates}
                    />
                  ))}
                </div>

                {group.id === "alpha" ? (
                  <AddedPensionLumpSumsEditor
                    lumpSums={settings.alphaAddedPensionLumpSums}
                    defaultStartDate={settings.startDate}
                    useDropdownDates={useDropdownDates}
                    onChange={(nextLumpSums) =>
                      updateSetting("alphaAddedPensionLumpSums", nextLumpSums)
                    }
                  />
                ) : null}
              </section>
            ))}
          </div>
        </section>

        <aside className="panel side-panel">
          <div className="panel-heading">
            <h2>Pension Summary</h2>
            <p className="section-copy">
              The headline outcomes below are all derived from the same monthly
              projection rows shown in the table.
            </p>
          </div>

          <PensionSummaryPanel summary={pensionSummary} />
        </aside>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Monthly pension projection table</h2>
          <p className="section-copy">
            The table is generated from the projection layer so each row stays
            traceable back to the calculator inputs and factor tables.
          </p>
        </div>

        <ProjectionTable rows={projectionRows} />
      </section>
    </main>
  );
}

type PensionSummaryPanelProps = {
  summary: PensionSummary;
};

function PensionSummaryPanel({ summary }: PensionSummaryPanelProps) {
  return (
    <div className="summary-sections">
      <SummarySection
        title="Alpha Pension"
        items={[
          [
            "Annual Alpha Pension at retirement",
            formatCurrencyDetailed(summary.alphaPension.annualAtDraw),
          ],
          [
            "Monthly Alpha Pension at retirement",
            formatCurrencyDetailed(summary.alphaPension.monthlyAtDraw),
          ],
          [
            "Maximum Annual Alpha Pension Accrued",
            formatCurrencyDetailed(summary.alphaPension.maximumAnnualAccrued),
          ],
          [
            "Total Alpha pension added after today",
            formatCurrencyDetailed(summary.alphaPension.totalAddedAfterToday),
          ],
          [
            "Monthly income at Alpha pension start",
            formatCurrencyDetailed(summary.incomeOverTime.monthlyAtAlphaStart),
          ],
          [
            "Monthly State Pension",
            formatCurrencyDetailed(summary.incomeOverTime.monthlyStatePension),
          ],
          [
            "Total Monthly Pension at State Pension start",
            formatCurrencyDetailed(summary.incomeOverTime.monthlyAtStateStart),
          ],
          [
            "Monthly income after State Pension",
            formatCurrencyDetailed(summary.incomeOverTime.monthlyAfterStatePension),
          ],
        ]}
      />

      <SummarySection
        title="Key Dates"
        items={[
          ["Stops Alpha accrual", formatDate(summary.keyDates.stopsAlphaAccrual)],
          ["Starts Alpha pension", formatDate(summary.keyDates.startsAlphaPension)],
          ["Starts State Pension", formatDate(summary.keyDates.startsStatePension)],
          [
            "Years between stopping accrual and drawing pension",
            formatYears(summary.transitions.yearsBetweenStoppingAccrualAndDrawingPension),
          ],
          [
            "Years between Alpha pension and State pension",
            formatYears(summary.transitions.yearsBetweenAlphaPensionAndStatePension),
          ],
        ]}
      />
    </div>
  );
}

type SummarySectionProps = {
  title: string;
  items: Array<[label: string, value: string]>;
};

function SummarySection({ title, items }: SummarySectionProps) {
  return (
    <section className="summary-section">
      <h3>{title}</h3>
      <dl className="snapshot-list">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FieldLabel({ field }: { field: FieldDefinition }) {
  return (
    <span className="field-label-group">
      <span className="field-label">{field.label}</span>
      {field.infoUrl ? (
        <a
          className="field-info-link"
          href={field.infoUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`${field.label} information`}
          title={`More information about ${field.label}`}
        >
          <span aria-hidden="true">i</span>
        </a>
      ) : null}
    </span>
  );
}

type FieldProps = {
  field: FieldDefinition;
  value: PensionSettings[SettingsKey];
  onChange: <K extends SettingsKey>(key: K, value: PensionSettings[K]) => void;
  useDropdownDates: boolean;
};

function Field({ field, value, onChange, useDropdownDates }: FieldProps) {
  if (field.type === "date") {
    return (
      <DateSettingField
        field={field}
        value={value as string}
        onChange={onChange}
        useDropdowns={useDropdownDates}
      />
    );
  }

  if (field.type === "year") {
    const draftYear = getAlphaAbsYear(value as string);
    const currentYear = new Date().getUTCFullYear();
    const firstAbsYear = 2015;
    const yearOptions = Array.from(
      { length: currentYear - firstAbsYear + 1 },
      (_, index) => currentYear - index,
    );

    return (
      <label className="field-card">
        <span className="field-header">
          <FieldLabel field={field} />
        </span>
        <select
          aria-label={field.label}
          className="select-input"
          value={draftYear}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(field.id, nextValue as PensionSettings[typeof field.id]);
          }}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "range") {
    const commitRangeValue = (nextValue: number) => {
      onChange(field.id, nextValue as PensionSettings[typeof field.id]);
    };

    return (
      <div className="field-card">
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
              value={value as number}
              onChange={(event) => commitRangeValue(Number(event.target.value))}
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
            value={value as number}
            onChange={(event) => commitRangeValue(Number(event.target.value))}
          />
        </div>
        {field.id === "currentStatePension" ? (
          <button
            type="button"
            className="secondary-button field-reset-button"
            onClick={() =>
              onChange(
                field.id,
                defaultSettings.currentStatePension as PensionSettings[typeof field.id],
              )
            }
          >
            Reset to default
          </button>
        ) : null}
      </div>
    );
  }

  return null;
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
};

function DateSelectField({
  label,
  value,
  onChange,
  idPrefix,
  yearRange,
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
    <div className="date-select-grid" role="group" aria-label={label}>
      <label className="date-select-field" htmlFor={`${idPrefix}-day`}>
        <span className="date-select-label">Day</span>
        <select
          id={`${idPrefix}-day`}
          aria-label={`${label} day`}
          className="select-input"
          value={parts.day}
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
}: {
  field: DateField;
  value: string;
  onChange: FieldProps["onChange"];
  useDropdowns: boolean;
}) {
  function commitDateValue(nextValue: string) {
    const normalizedValue = normalizeSetting(
      field.id,
      nextValue as PensionSettings[typeof field.id],
    ) as string;

    onChange(field.id, normalizedValue as PensionSettings[typeof field.id]);
  }

  return (
    <div className="field-card">
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      {useDropdowns ? (
        <DateSelectField
          label={field.label}
          value={value}
          idPrefix={field.id}
          yearRange={getPrimaryDateYearRange(field.id)}
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
          onBlur={(event) => {
            commitDateValue(event.target.value);
          }}
        />
      )}
    </div>
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
};

const projectionTableColumns = [
  { key: "date", label: "Date", width: "7rem" },
  { key: "age", label: "Age (years/months)", width: "7rem" },
  { key: "monthlyAddedPension", label: "Monthly Added Pension", width: "7rem" },
  { key: "lumpSumAddedPension", label: "Lump sum added pension", width: "7rem" },
  { key: "annualAccruedAlphaPension", label: "Annual Accrued Alpha Pension", width: "8rem" },
  {
    key: "annualAlphaPensionIncludingReduction",
    label: "Annual Alpha Pension Including Reduction",
    width: "9rem",
  },
  { key: "monthlyAlphaPensionTakeHome", label: "Monthly Alpha Pension take-home", width: "7rem" },
  { key: "monthlyStatePension", label: "Monthly State pension", width: "6rem" },
  { key: "totalMonthlyPensionTakeHomePay", label: "Total Monthly Pension take-home pay", width: "8rem" },
] as const;

function ProjectionTable({ rows }: ProjectionTableProps) {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(true);
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
              {projectionTableColumns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {projectionTableColumns.map((column) => (
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
            {projectionTableColumns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className="projection-table-sr-only">
            <tr>
              {projectionTableColumns.map((column) => (
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
                    <span>{formatDate(row.date)}</span>
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
                <td>{formatAge(row.age, row.ageMonths)}</td>
                <td>{formatCurrencyDetailed(row.monthlyAddedPension)}</td>
                <td>{formatCurrencyDetailed(row.lumpSumAddedPension)}</td>
                <td>{formatCurrencyDetailed(row.annualAccruedAlphaPension)}</td>
                <td>{formatCurrencyDetailed(row.annualAlphaPensionIncludingReduction)}</td>
                <td>{formatCurrencyDetailed(row.monthlyAlphaPensionTakeHome)}</td>
                <td>{formatCurrencyDetailed(row.monthlyStatePension)}</td>
                <td>{formatCurrencyDetailed(row.totalMonthlyPensionTakeHomePay)}</td>
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

function formatYears(value: number) {
  return `${value.toFixed(1)} years`;
}

type AddedPensionLumpSumsEditorProps = {
  lumpSums: AddedPensionLumpSum[];
  defaultStartDate: string;
  useDropdownDates: boolean;
  onChange: (nextLumpSums: AddedPensionLumpSum[]) => void;
};

function AddedPensionLumpSumsEditor({
  lumpSums,
  defaultStartDate,
  useDropdownDates,
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
    <section className="settings-section">
      <div className="section-heading">
        <h3>Lump sum purchases</h3>
        <p className="section-copy">
          Add one-off or yearly lump sum purchases. A yearly entry repeats on the same
          calendar date until its end date.
        </p>
      </div>

      <div className="field-grid">
        {lumpSums.length === 0 ? (
          <p className="section-copy">No lump sum added pension purchases set up yet.</p>
        ) : null}

        {lumpSums.map((lumpSum, index) => (
          <div className="field-card" key={lumpSum.id}>
            <span className="field-header">
              <span className="field-label">Lump sum #{index + 1}</span>
            </span>

            <label className="field-label" htmlFor={`lump-sum-amount-${lumpSum.id}`}>
              Amount (£)
            </label>
            <input
              id={`lump-sum-amount-${lumpSum.id}`}
              aria-label={`Lump sum amount ${index + 1}`}
              className="select-input"
              min={0}
              step={500}
              type="number"
              value={lumpSum.amount}
              onChange={(event) =>
                updateLumpSum(lumpSum.id, { amount: Number(event.target.value) })
              }
            />

            <span className="field-label">Payment start date</span>
            {useDropdownDates ? (
              <DateSelectField
                label={`Lump sum start date ${index + 1}`}
                value={lumpSum.startDate}
                idPrefix={`lump-sum-start-${lumpSum.id}`}
                yearRange={getLumpSumDateYearRange("start")}
                onChange={(nextValue) =>
                  updateLumpSum(lumpSum.id, { startDate: nextValue })
                }
              />
            ) : (
              <input
                id={`lump-sum-start-${lumpSum.id}`}
                aria-label={`Lump sum start date ${index + 1}`}
                className="date-input"
                type="date"
                value={lumpSum.startDate}
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
              aria-label={`Lump sum cadence ${index + 1}`}
              className="date-input"
              value={lumpSum.cadence}
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
                    label={`Lump sum end date ${index + 1}`}
                    value={lumpSum.endDate}
                    idPrefix={`lump-sum-end-${lumpSum.id}`}
                    yearRange={getLumpSumDateYearRange("end")}
                    onChange={(nextValue) =>
                      updateLumpSum(lumpSum.id, { endDate: nextValue })
                    }
                  />
                ) : (
                  <input
                    id={`lump-sum-end-${lumpSum.id}`}
                    aria-label={`Lump sum end date ${index + 1}`}
                    className="date-input"
                    type="date"
                    value={lumpSum.endDate}
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
              Remove lump sum
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="secondary-button" onClick={addLumpSum}>
        Add lump sum purchase
      </button>
    </section>
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

export default App;
