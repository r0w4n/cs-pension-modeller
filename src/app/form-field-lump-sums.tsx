import {
  createDefaultAddedPensionLumpSum,
  type AddedPensionLumpSum,
} from "../settings";
import { getLumpSumDateYearRange } from "../app-domains";
import type { AddedPensionLumpSumsEditorProps } from "./form-field-types";
import { DateSelectField } from "./form-field-dates";
import { FieldValidationMessages } from "./form-fields-shared";

export function AddedPensionLumpSumsEditor({
  lumpSums,
  defaultStartDate,
  useDropdownDates,
  title = "Lump sum purchases",
  description = "Add one-off or yearly lump sum purchases. A yearly entry repeats on the same calendar date until its end date.",
  emptyText = "No lump sum added pension purchases set up yet.",
  itemLabel = "Lump sum",
  addButtonLabel = "Add lump sum purchase",
  removeButtonLabel = "Remove lump sum",
  showFactorType = false,
  validationIssues = [],
  onChange,
}: AddedPensionLumpSumsEditorProps) {
  function updateLumpSum(id: string, patch: Partial<AddedPensionLumpSum>) {
    onChange(
      lumpSums.map((lumpSum) =>
        lumpSum.id === id ? { ...lumpSum, ...patch } : lumpSum
      )
    );
  }

  function addLumpSum() {
    onChange([...lumpSums, createDefaultAddedPensionLumpSum(defaultStartDate)]);
  }

  function removeLumpSum(id: string) {
    onChange(lumpSums.filter((lumpSum) => lumpSum.id !== id));
  }

  return (
    <div className="settings-subsection lump-sum-editor">
      <div className="settings-subsection-heading lump-sum-editor-heading">
        <h4>{title}</h4>
        <p className="section-copy">{description}</p>
      </div>

      {lumpSums.length === 0 ? (
        <p className="section-copy">{emptyText}</p>
      ) : null}

      <div className="lump-sum-list">
        {lumpSums.map((lumpSum, index) => {
          const lumpSumValidationIssues = validationIssues.filter(
            (issue) => issue.itemId === lumpSum.id
          );
          const validationId =
            lumpSumValidationIssues.length > 0
              ? `lump-sum-validation-${lumpSum.id}`
              : undefined;
          const hasValidationIssue = lumpSumValidationIssues.length > 0;

          return (
            <div key={lumpSum.id} className="field-card lump-sum-card">
              <div className="field-header">
                <span className="field-label-group">
                  <span className="field-label">
                    {itemLabel} #{index + 1}
                  </span>
                </span>
              </div>

              <span className="field-label">Amount</span>
              <input
                aria-label={`${itemLabel} amount ${index + 1}`}
                className="number-input"
                type="number"
                min={0}
                step={1}
                value={lumpSum.amount}
                aria-invalid={hasValidationIssue || undefined}
                aria-describedby={validationId}
                onChange={(event) =>
                  updateLumpSum(lumpSum.id, {
                    amount: Number(event.target.value),
                  })
                }
              />

              <span className="field-label">When</span>
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

              <span className="field-label">Cadence</span>
              <select
                aria-label={`${itemLabel} cadence ${index + 1}`}
                className="select-input"
                value={lumpSum.cadence}
                aria-invalid={hasValidationIssue || undefined}
                aria-describedby={validationId}
                onChange={(event) =>
                  updateLumpSum(lumpSum.id, {
                    cadence: event.target
                      .value as AddedPensionLumpSum["cadence"],
                  })
                }
              >
                <option value="one_off">One-off</option>
                <option value="yearly">Yearly</option>
              </select>

              {showFactorType ? (
                <>
                  <span className="field-label">Purchase type</span>
                  <select
                    aria-label={`${itemLabel} cover ${index + 1}`}
                    className="select-input"
                    value={lumpSum.factorType}
                    aria-invalid={hasValidationIssue || undefined}
                    aria-describedby={validationId}
                    onChange={(event) =>
                      updateLumpSum(lumpSum.id, {
                        factorType: event.target
                          .value as AddedPensionLumpSum["factorType"],
                      })
                    }
                  >
                    <option value="self">Self only</option>
                    <option value="self_plus_beneficiaries">
                      Self and dependants
                    </option>
                  </select>
                </>
              ) : null}

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
                        updateLumpSum(lumpSum.id, {
                          endDate: event.target.value,
                        })
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
