import {
  createDefaultAlphaEpaPeriod,
  type AlphaEpaPeriod,
  type PensionValidationIssue,
} from "../settings";
import { FieldValidationMessages } from "./form-fields-shared";

export function AlphaEpaPeriodsEditor({
  periods,
  defaultStartDate,
  validationIssues,
  onChange,
}: {
  periods: AlphaEpaPeriod[];
  defaultStartDate: string;
  validationIssues: PensionValidationIssue[];
  onChange: (periods: AlphaEpaPeriod[]) => void;
}) {
  function updatePeriod(id: string, patch: Partial<AlphaEpaPeriod>) {
    onChange(
      periods.map((period) =>
        period.id === id ? { ...period, ...patch } : period
      )
    );
  }

  return (
    <div className="settings-subsection epa-periods-editor">
      <div className="settings-subsection-heading">
        <h4>EPA purchase periods</h4>
        <p className="section-copy">
          Add each period shown on your pension record. A gap builds standard
          alpha pension; a later period can restart EPA or use a different −1,
          −2 or −3 option. Only one EPA option can apply at a time.
        </p>
      </div>

      {periods.length === 0 ? (
        <p className="section-copy">No EPA purchase periods added yet.</p>
      ) : null}

      <div className="epa-period-list">
        {periods.map((period, index) => {
          const issues = validationIssues.filter(
            (issue) => issue.itemId === period.id
          );
          const validationId =
            issues.length > 0
              ? `epa-period-validation-${period.id}`
              : undefined;

          return (
            <div className="field-card epa-period-card" key={period.id}>
              <div className="field-header">
                <span className="field-label">EPA period #{index + 1}</span>
              </div>
              <label className="epa-period-field">
                <span className="field-label">Option</span>
                <select
                  className="select-input"
                  aria-label={`EPA option ${index + 1}`}
                  aria-invalid={issues.length > 0 || undefined}
                  aria-describedby={validationId}
                  value={period.yearsBeforeNpa}
                  onChange={(event) =>
                    updatePeriod(period.id, {
                      yearsBeforeNpa: Number(event.target.value) as 1 | 2 | 3,
                    })
                  }
                >
                  <option value={1}>NPA −1 year</option>
                  <option value={2}>NPA −2 years</option>
                  <option value={3}>NPA −3 years</option>
                </select>
              </label>
              <div className="epa-period-date-grid">
                <label className="epa-period-field">
                  <span className="field-label">Start date</span>
                  <input
                    className="date-input"
                    type="date"
                    aria-label={`EPA start date ${index + 1}`}
                    aria-invalid={issues.length > 0 || undefined}
                    aria-describedby={validationId}
                    value={period.startDate}
                    onChange={(event) =>
                      updatePeriod(period.id, { startDate: event.target.value })
                    }
                  />
                </label>
                <label className="epa-period-field">
                  <span className="field-label">End date</span>
                  <input
                    className="date-input"
                    type="date"
                    aria-label={`EPA end date ${index + 1}`}
                    aria-invalid={issues.length > 0 || undefined}
                    aria-describedby={validationId}
                    value={period.endDate}
                    onChange={(event) =>
                      updatePeriod(period.id, { endDate: event.target.value })
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  onChange(
                    periods.filter((candidate) => candidate.id !== period.id)
                  )
                }
              >
                Remove EPA period
              </button>
              <FieldValidationMessages id={validationId} issues={issues} />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="secondary-button"
        onClick={() =>
          onChange([...periods, createDefaultAlphaEpaPeriod(defaultStartDate)])
        }
      >
        Add EPA period
      </button>
    </div>
  );
}
