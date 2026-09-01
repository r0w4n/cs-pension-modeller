import { formatDate } from "../result-projection/formatting";
import {
  getChartIncomeValue,
  type ChartIncomeSeriesDefinition,
} from "../result-projection/retirement-income-chart-layout";
import type {
  RetirementIncomeChartEvent,
  RetirementIncomePoint,
} from "../result-projection/retirement-income-chart-model";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function RetirementIncomeChartPeriodDetails({
  displayMode,
  events,
  id,
  point,
  seriesDefinitions,
}: {
  displayMode: "annual" | "monthly";
  events: RetirementIncomeChartEvent[];
  id: string;
  point: RetirementIncomePoint;
  seriesDefinitions: ChartIncomeSeriesDefinition[];
}) {
  const divisor = displayMode === "monthly" ? 12 : 1;
  const suffix = displayMode === "monthly" ? "per month" : "per year";
  const tax =
    point.estimatedIncomeTaxAnnual ??
    Math.max(
      0,
      point.totalIncomeAnnual -
        (point.takeHomeIncomeAnnual ?? point.assessedIncomeAnnual)
    );
  const takeHome = point.takeHomeIncomeAnnual ?? point.assessedIncomeAnnual;
  const sources = seriesDefinitions.flatMap((series) => {
    const annualAmount = getChartIncomeValue(point, series);
    return annualAmount > 0 ? [{ ...series, annualAmount }] : [];
  });

  return (
    <div
      id={id}
      className="retirement-income-period-details"
      aria-live="polite"
      data-testid="retirement-income-period-details"
    >
      <strong className="retirement-income-period-details-date">
        {formatDate(point.date)}
      </strong>
      <dl className="retirement-income-period-details-values">
        <PeriodValue
          label="Household income"
          value={formatCurrency(point.totalIncomeAnnual / divisor, suffix)}
        />
        <PeriodValue
          label="Estimated Income Tax"
          value={formatCurrency(tax / divisor, suffix)}
        />
        <PeriodValue
          label="Take-home income"
          value={formatCurrency(takeHome / divisor, suffix)}
        />
        <PeriodValue
          label="Target"
          value={
            point.targetIncomeAnnual > 0
              ? formatCurrency(point.targetIncomeAnnual / divisor, suffix)
              : "Not assessed"
          }
        />
        <PeriodValue
          label="Shortfall"
          value={formatCurrency(point.shortfallAnnual / divisor, suffix)}
        />
      </dl>
      {sources.length > 0 ? (
        <section aria-labelledby={`${id}-sources`}>
          <h4 id={`${id}-sources`}>Sources</h4>
          <dl className="retirement-income-period-details-values">
            {sources.map((source) => (
              <PeriodValue
                key={source.key}
                label={source.label}
                value={formatCurrency(source.annualAmount / divisor, suffix)}
              />
            ))}
          </dl>
        </section>
      ) : null}
      {events.length > 0 ? (
        <section aria-labelledby={`${id}-events`}>
          <h4 id={`${id}-events`}>Events</h4>
          <ul>
            {events.map((event) => (
              <li key={event.key}>{event.label}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PeriodValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatCurrency(value: number, suffix: string) {
  return `${currencyFormatter.format(Math.round(value))} ${suffix}`;
}
