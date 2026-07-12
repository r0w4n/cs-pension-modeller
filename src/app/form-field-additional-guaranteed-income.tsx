import {
  createDefaultAdditionalGuaranteedIncome,
  getAdditionalGuaranteedIncomeDisplayName,
  type AdditionalGuaranteedIncome,
  type PensionValidationIssue,
} from "../settings";
import { FieldValidationMessages } from "./form-fields-shared";

type AdditionalGuaranteedIncomeEditorProps = {
  incomes: AdditionalGuaranteedIncome[];
  defaultStartAge: number;
  validationIssues: PensionValidationIssue[];
  onChange: (incomes: AdditionalGuaranteedIncome[]) => void;
};

export function AdditionalGuaranteedIncomeEditor({
  incomes,
  defaultStartAge,
  validationIssues,
  onChange,
}: AdditionalGuaranteedIncomeEditorProps) {
  function updateIncome(
    id: string,
    patch: Partial<AdditionalGuaranteedIncome>
  ) {
    onChange(
      incomes.map((income) =>
        income.id === id ? { ...income, ...patch } : income
      )
    );
  }

  function addIncome() {
    onChange([
      ...incomes,
      createDefaultAdditionalGuaranteedIncome(defaultStartAge),
    ]);
  }

  function removeIncome(id: string) {
    onChange(incomes.filter((income) => income.id !== id));
  }

  return (
    <div className="settings-subsection additional-income-editor">
      <div className="settings-subsection-heading">
        <h4>Additional guaranteed income</h4>
        <p className="section-copy">
          Add income from other sources that are not modelled elsewhere, such as
          another defined benefit pension, an annuity, or a known guaranteed
          annual income.
        </p>
        <p className="section-copy">
          This is treated as gross annual income and included in your retirement
          income projection. It does not apply scheme-specific rules or early
          retirement factors.
        </p>
      </div>

      {incomes.length === 0 ? (
        <p className="section-copy">No additional guaranteed income set up.</p>
      ) : null}

      <div className="additional-income-list">
        {incomes.map((income, index) => {
          const incomeValidationIssues = validationIssues.filter(
            (issue) => issue.itemId === income.id
          );
          const validationId =
            incomeValidationIssues.length > 0
              ? `additional-income-validation-${income.id}`
              : undefined;
          const hasValidationIssue = incomeValidationIssues.length > 0;
          const displayName = getAdditionalGuaranteedIncomeDisplayName(income);

          return (
            <div key={income.id} className="field-card additional-income-card">
              <div className="field-header">
                <span className="field-label-group">
                  <span className="field-label">
                    Additional income #{index + 1}
                  </span>
                </span>
              </div>

              <label className="additional-income-field">
                <span className="field-label">Name, optional</span>
                <input
                  className="text-input"
                  type="text"
                  value={income.name}
                  aria-describedby={validationId}
                  onChange={(event) =>
                    updateIncome(income.id, { name: event.target.value })
                  }
                />
              </label>

              <label className="additional-income-field">
                <span className="field-label">Annual income</span>
                <input
                  className="number-input"
                  type="number"
                  min={0}
                  step={1}
                  value={income.annualAmount ?? ""}
                  aria-invalid={hasValidationIssue || undefined}
                  aria-describedby={validationId}
                  onChange={(event) =>
                    updateIncome(income.id, {
                      annualAmount: parseOptionalNumber(event.target.value),
                    })
                  }
                />
                {income.annualAmount === null ? (
                  <span className="field-help">
                    Enter an annual income to include this row in the
                    projection.
                  </span>
                ) : null}
              </label>

              <div className="additional-income-grid">
                <label className="additional-income-field">
                  <span className="field-label">Starts at age</span>
                  <input
                    className="number-input"
                    type="number"
                    min={0}
                    step={1}
                    value={income.startAge ?? ""}
                    aria-invalid={hasValidationIssue || undefined}
                    aria-describedby={validationId}
                    onChange={(event) =>
                      updateIncome(income.id, {
                        startAge: parseOptionalNumber(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="additional-income-field">
                  <span className="field-label">Ends at age, optional</span>
                  <input
                    className="number-input"
                    type="number"
                    min={0}
                    step={1}
                    value={income.endAge ?? ""}
                    aria-invalid={hasValidationIssue || undefined}
                    aria-describedby={validationId}
                    onChange={(event) =>
                      updateIncome(income.id, {
                        endAge: parseOptionalNumber(event.target.value),
                      })
                    }
                  />
                  <span className="field-help">
                    Leave blank if this income is payable for life.
                  </span>
                </label>
              </div>

              <label className="additional-income-field">
                <span className="field-label">Increases each year</span>
                <select
                  className="select-input"
                  value={income.indexation}
                  aria-invalid={hasValidationIssue || undefined}
                  aria-describedby={validationId}
                  onChange={(event) =>
                    updateIncome(income.id, {
                      indexation: event.target
                        .value as AdditionalGuaranteedIncome["indexation"],
                      fixedIncreasePercent:
                        event.target.value === "fixed"
                          ? income.fixedIncreasePercent
                          : null,
                    })
                  }
                >
                  <option value="none">No increase</option>
                  <option value="cpi">CPI / inflation linked</option>
                  <option value="fixed">Fixed percentage</option>
                </select>
              </label>

              {income.indexation === "fixed" ? (
                <label className="additional-income-field">
                  <span className="field-label">Fixed increase percentage</span>
                  <input
                    className="number-input"
                    type="number"
                    min={-10}
                    max={20}
                    step={0.1}
                    value={income.fixedIncreasePercent ?? ""}
                    aria-invalid={hasValidationIssue || undefined}
                    aria-describedby={validationId}
                    onChange={(event) =>
                      updateIncome(income.id, {
                        fixedIncreasePercent: parseOptionalNumber(
                          event.target.value
                        ),
                      })
                    }
                  />
                </label>
              ) : null}

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={income.taxable}
                  onChange={(event) =>
                    updateIncome(income.id, { taxable: event.target.checked })
                  }
                />
                <span>Include as taxable income</span>
              </label>

              <button
                type="button"
                className="secondary-button"
                aria-label={`Remove ${displayName}`}
                onClick={() => removeIncome(income.id)}
              >
                Remove income
              </button>
              <FieldValidationMessages
                id={validationId}
                issues={incomeValidationIssues}
              />
            </div>
          );
        })}
      </div>

      <button type="button" className="secondary-button" onClick={addIncome}>
        Add additional income
      </button>
    </div>
  );
}

function parseOptionalNumber(value: string) {
  if (value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}
