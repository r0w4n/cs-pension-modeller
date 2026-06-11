export type AppModeOption = "bridge" | "simple" | "expert";

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
          The simplified journey asks fewer questions and keeps assumptions
          simple. Switch to the expert journey any time if you want every
          modelling control.
        </p>
      </div>

      <div className="mode-card-grid">
        <button
          type="button"
          className={getModeCardClassName(selectedMode === "simple")}
          aria-pressed={selectedMode === "simple"}
          onClick={() => onSelectMode("simple")}
        >
          <span className="card-label">Simple journey</span>
          <strong>Simplified retirement journey</strong>
          <span>
            Answer a smaller set of questions to see what your retirement could
            look like financially. This journey keeps the main assumptions
            simple and shows your projected income, key dates, and assumptions
            at the end.
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
          <strong>Work through every setting with full control.</strong>
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
