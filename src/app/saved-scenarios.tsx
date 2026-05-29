import type { PensionSettings } from "../settings";
import {
  formatCurrencyDetailed,
  type ComparisonResult,
  type ComparisonScenario,
} from "../app-domains";

export function SavedScenariosSection({
  scenarios,
  savedResults,
  currentScenarioIsValid,
  maxScenarios,
  onLoadScenario,
  renameScenario,
  replaceScenario,
  removeScenario,
}: {
  scenarios: ComparisonScenario[];
  savedResults: ComparisonResult[];
  currentScenarioIsValid: boolean;
  maxScenarios: number;
  onLoadScenario: (settings: PensionSettings) => void;
  renameScenario: (id: string, name: string) => void;
  replaceScenario: (id: string) => void;
  removeScenario: (id: string) => void;
}) {
  return (
    <section className="comparison-saved-section" aria-labelledby="saved-scenarios-title">
      <div className="summary-section-header">
        <h3 id="saved-scenarios-title">Saved scenarios</h3>
        <span className="table-status">
          {scenarios.length} of {maxScenarios} saved
        </span>
      </div>

      {scenarios.length === 0 ? (
        <p className="section-copy">
          No scenarios saved yet. Save this result to compare it with other
          retirement options during this session.
        </p>
      ) : (
        <div className="comparison-card-grid" role="list">
          {savedResults.map((result) => (
            <article className="comparison-card" key={result.scenario.id}>
              <label className="comparison-name-field">
                <span>Scenario name</span>
                <input
                  className="text-input"
                  type="text"
                  value={result.scenario.name}
                  onChange={(event) =>
                    renameScenario(result.scenario.id, event.target.value)
                  }
                />
              </label>
              <strong>{formatCurrencyDetailed(result.annualIncome)}</strong>
              <span>{result.bridgeAnalysis.planWorks ? "Looks workable" : "Needs attention"}</span>
              <small>
                {result.currentMatchesSaved
                  ? "Matches current model inputs"
                  : "Current model inputs differ from this saved snapshot"}
              </small>
              <div className="comparison-card-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onLoadScenario(result.scenario.settings)}
                >
                  Load this scenario
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!currentScenarioIsValid}
                  onClick={() => replaceScenario(result.scenario.id)}
                >
                  Replace with current
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => removeScenario(result.scenario.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
