import type { AppMode } from "./app-persistence";

export type AppModeOption = AppMode;

type ModeSelectionProps = {
  selectedMode: AppModeOption | null;
  onSelectMode: (mode: AppModeOption) => void;
};

export function ModeSelection({
  selectedMode,
  onSelectMode,
}: ModeSelectionProps) {
  return (
    <section className="mode-panel" aria-labelledby="mode-selection-title">
      <div className="panel-heading">
        <h2 id="mode-selection-title">Choose the level of detail</h2>
        <p className="section-copy">
          Use Quick for Alpha pension comparisons, Simple for a guided
          retirement income plan, or the early retirement and expert journeys
          for more detail. Each journey keeps its own inputs.
        </p>
      </div>

      <div className="mode-card-grid">
        <button
          type="button"
          className={getModeCardClassName(selectedMode === "quick")}
          aria-pressed={selectedMode === "quick"}
          onClick={() => onSelectMode("quick")}
        >
          <span className="card-label">Quick journey</span>
          <strong>Quick modeller</strong>
          <span>
            The original pension calculator, kept for those who prefer a simpler
            approach. Enter a few figures, explore your options and get a quick
            estimate of your retirement pension.
          </span>
        </button>
        <button
          type="button"
          className={getModeCardClassName(selectedMode === "simple")}
          aria-pressed={selectedMode === "simple"}
          onClick={() => onSelectMode("simple")}
        >
          <span className="card-label">Simple journey</span>
          <strong>Simplified retirement journey</strong>
          <span>
            Answer a few plain-English questions about you, the income you would
            like, and when you want to retire. At the end, see an estimate of
            how much money you might have each month and where it may come from.
          </span>
        </button>

        <button
          type="button"
          className={getModeCardClassName(selectedMode === "bridge")}
          aria-pressed={selectedMode === "bridge"}
          onClick={() => onSelectMode("bridge")}
        >
          <span className="card-label">Early retirement journey</span>
          <strong>Work out what I need to retire early</strong>
          <span>
            Build a retirement income plan using your Civil Service pension,
            State Pension, SIPP, ISA and other savings. See how your bridging
            pots could support you before your main pensions start.
          </span>
        </button>

        <button
          type="button"
          className={getModeCardClassName(selectedMode === "expert")}
          aria-pressed={selectedMode === "expert"}
          onClick={() => onSelectMode("expert")}
        >
          <span className="card-label">Expert journey</span>
          <strong>Work through every setting with full control</strong>
          <span>
            This journey gives you more control over your retirement projection,
            including detailed assumptions for pensions, savings, tax,
            inflation, investment growth and partial retirement.
          </span>
        </button>
      </div>
    </section>
  );
}

function getModeCardClassName(isActive: boolean) {
  return ["mode-card", isActive ? "mode-card--active" : ""]
    .filter(Boolean)
    .join(" ");
}
