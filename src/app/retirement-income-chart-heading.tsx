export function RetirementIncomeChartHeading({
  chartTitleId,
  displayMode,
  isSimplePresentation,
  onChangeDisplayMode,
}: {
  chartTitleId: string;
  displayMode: "annual" | "monthly";
  isSimplePresentation: boolean;
  onChangeDisplayMode: (displayMode: "annual" | "monthly") => void;
}) {
  const title = getRetirementIncomeChartTitle(isSimplePresentation);

  return (
    <div className="retirement-income-chart-heading">
      <h3
        id={chartTitleId}
        className="retirement-income-chart-title retirement-income-chart-title--visible"
      >
        {title}
      </h3>
      <div
        className="summary-toggle retirement-income-display-toggle"
        role="group"
        aria-label="Chart income display"
      >
        {(["monthly", "annual"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={
              displayMode === mode
                ? "summary-toggle-button summary-toggle-button--active"
                : "summary-toggle-button"
            }
            aria-label={`Show chart as ${mode}`}
            aria-pressed={displayMode === mode}
            onClick={() => onChangeDisplayMode(mode)}
          >
            {mode === "monthly" ? "Monthly" : "Annual"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function getRetirementIncomeChartTitle(isSimplePresentation: boolean) {
  return isSimplePresentation
    ? "How your retirement income may change"
    : "Retirement income over time";
}

export function RetirementIncomeChartDescription({
  chartDescriptionId,
  isSimplePresentation,
  descriptionOverride,
}: {
  chartDescriptionId: string;
  isSimplePresentation: boolean;
  descriptionOverride?: string;
}) {
  const description =
    descriptionOverride ??
    (isSimplePresentation
      ? "The coloured areas show where your estimated income comes from as you get older. The line shows the amount you said you would like to spend. The tax pattern shows estimated Income Tax, and red hatching shows where the estimate gives you less than that."
      : "Stacked gross income chart showing ISA, SIPP, partial retirement income, Civil Service pensions, additional guaranteed income and State Pension against the target retirement income over age. Estimated Income Tax is shown with horizontal blue-grey hatching between income after estimated Income Tax and gross income. Shortfall is shown with red diagonal hatching.");

  return (
    <p
      id={chartDescriptionId}
      className={
        isSimplePresentation
          ? "retirement-income-chart-introduction"
          : "visually-hidden"
      }
    >
      {description}
    </p>
  );
}
