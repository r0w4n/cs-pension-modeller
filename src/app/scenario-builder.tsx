import { MAX_COMPARISON_SCENARIOS } from "./comparison-state";

export type ScenarioBuilderProps = {
  scenarioCount: number;
  isValid: boolean;
  limitReached: boolean;
  nameValue: string;
  onNameChange: (value: string) => void;
  onAdd: () => void;
};

export function ScenarioBuilder({
  scenarioCount,
  isValid,
  limitReached,
  nameValue,
  onNameChange,
  onAdd,
}: ScenarioBuilderProps) {
  return (
    <section
      className="comparison-builder"
      aria-labelledby="comparison-builder-title"
    >
      <div>
        <h3 id="comparison-builder-title">Save this result as a scenario</h3>
        <p className="section-copy">
          You can save up to {MAX_COMPARISON_SCENARIOS} scenarios during this
          session.
        </p>
      </div>
      <div className="comparison-add-row">
        <label className="comparison-name-field">
          <span>Scenario name</span>
          <input
            className="text-input"
            type="text"
            value={nameValue}
            placeholder={`Scenario ${scenarioCount + 1}`}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="primary-button"
          disabled={!isValid || limitReached}
          onClick={onAdd}
        >
          Add to comparison
        </button>
      </div>
      {!isValid ? (
        <p className="table-status">
          Fix the current validation issues before adding a scenario.
        </p>
      ) : null}
      {limitReached ? (
        <p className="table-status">
          Comparison limit reached. Remove a scenario before adding another.
        </p>
      ) : null}
    </section>
  );
}
