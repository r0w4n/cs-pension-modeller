import { clampNumber } from "../../app-domains";
import { formatCurrency, type PensionSettings } from "../../settings";
import type { SettingsFieldOnChange } from "../../app/form-field-types";
import type { OptimiserController } from "./useOptimiserController";
import type { StrategyRankingMode } from "./optimiserTypes";

type OptimiserSearchSettingsProps = {
  settings: PensionSettings;
  optimiser: OptimiserController;
  onChange: SettingsFieldOnChange;
};

export function OptimiserSearchSettings({
  settings,
  optimiser,
  onChange,
}: OptimiserSearchSettingsProps) {
  const { isRunning, searchState, updateSearchState, runOptimiser } = optimiser;

  return (
    <>
      <div className="optimiser-form-grid">
        <SliderField
          id="optimiser-target-retirement-age"
          label="Target retirement age"
          value={settings.requirementAge}
          min={0}
          max={70}
          step={1}
          inputStep={1}
          onChange={(value) => onChange("requirementAge", value)}
        />

        <SliderField
          id="optimiser-max-contribution"
          label="Maximum total monthly contribution to search"
          value={searchState.maxMonthlyContribution}
          min={0}
          max={2_000}
          step={100}
          inputStep={100}
          prefix="£"
          onChange={(value) =>
            updateSearchState("maxMonthlyContribution", value)
          }
        />

        <label className="optimiser-field-card optimiser-checkbox">
          <input
            type="checkbox"
            checked={searchState.includeAddedPension}
            disabled={!settings.showAlpha}
            onChange={(event) =>
              updateSearchState("includeAddedPension", event.target.checked)
            }
          />
          <span>
            <span className="field-label">Search added pension</span>
            <span className="field-help">
              Let the optimiser test monthly added pension purchases up to{" "}
              {formatCurrency(400)}/month where Alpha is included.
            </span>
          </span>
        </label>

        <label className="optimiser-field-card optimiser-checkbox">
          <input
            type="checkbox"
            checked={searchState.includePartialRetirement}
            disabled={!settings.partialRetirementEnabled}
            onChange={(event) =>
              updateSearchState(
                "includePartialRetirement",
                event.target.checked
              )
            }
          />
          <span>
            <span className="field-label">Search partial retirement</span>
            <span className="field-help">
              Let the optimiser test reduced-hours start ages and work
              percentages using the salary basis entered in the partial
              retirement section.
            </span>
          </span>
        </label>

        <label className="optimiser-field-card">
          <span className="field-label">Ranking preference</span>
          <select
            className="select-input"
            value={searchState.rankingMode}
            onChange={(event) =>
              updateSearchState(
                "rankingMode",
                event.target.value as StrategyRankingMode
              )
            }
          >
            <option value="lowest-contribution">
              Lowest monthly contribution
            </option>
            <option value="earliest-retirement">Earliest retirement</option>
            <option value="lowest-complexity">Lowest complexity</option>
          </select>
        </label>
      </div>

      <div className="optimiser-assumptions">
        <span className="card-label">Saved target used</span>
        <p className="section-copy">
          The search uses retirement from age {settings.requirementAge}, a
          target of {formatCurrency(settings.desiredRetirementIncome)}/year
          until age {settings.lifeExpectancy}, and an income basis of{" "}
          {settings.taxationEnabled ? "net of modelled Income Tax" : "gross"}.
        </p>
      </div>

      <button
        type="button"
        className="primary-button optimiser-run-button"
        disabled={isRunning}
        onClick={() => {
          void runOptimiser(settings);
        }}
      >
        {isRunning ? "Searching..." : "Run optimiser"}
      </button>
    </>
  );
}

function SliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  inputStep,
  prefix,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  inputStep: number;
  prefix?: string;
  onChange: (value: number) => void;
}) {
  const normalizedValue = clampNumber(value, min, max);

  const commitValue = (nextValue: number) => {
    onChange(clampNumber(nextValue, min, max));
  };

  return (
    <label className="optimiser-field-card" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="range-control-grid">
        <span className="range-slider-group">
          <input
            aria-label={label}
            className="range-input"
            type="range"
            min={min}
            max={max}
            step={step}
            value={normalizedValue}
            onChange={(event) => commitValue(Number(event.target.value))}
          />
          <span className="range-scale">
            <span>{formatSliderValue(min, prefix)}</span>
            <span>{formatSliderValue(max, prefix)}</span>
          </span>
        </span>

        <span className="optimiser-input-row">
          {prefix ? <span aria-hidden="true">{prefix}</span> : null}
          <input
            id={id}
            className="number-input"
            type="number"
            value={normalizedValue}
            min={min}
            max={max}
            step={inputStep}
            aria-label={`${label} exact value`}
            onChange={(event) => commitValue(Number(event.target.value))}
          />
        </span>
      </span>
    </label>
  );
}

function formatSliderValue(value: number, prefix?: string) {
  return prefix ? formatCurrency(value) : value.toString();
}
