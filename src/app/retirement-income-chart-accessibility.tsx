import type { RetirementIncomePoint } from "../result-projection/retirement-income-chart-model";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function FlexibleSurplusLegend({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <span>
      <span className="retirement-income-avoidable-surplus-key" />
      Avoidable flexible-fund surplus
    </span>
  );
}

export function SurplusTextEquivalent({
  points,
}: {
  points: RetirementIncomePoint[];
}) {
  if (points.length === 0) {
    return null;
  }

  return (
    <details className="retirement-income-surplus-text-equivalent">
      <summary>Flexible-fund surplus by age</summary>
      <ul>
        {points.map((point) => (
          <li key={`surplus-text-${point.date}-${point.age}`}>
            Age {Math.floor(point.age)}:{" "}
            {formatCurrency(point.unavoidableSurplusAnnual)} unavoidable surplus
            and {formatCurrency(point.avoidableFlexibleSurplusAnnual)} avoidable
            flexible-fund surplus.
            {point.flexibleWithdrawalInsights.map(
              (insight) =>
                ` ${insight.label} could be reduced by ${formatCurrency(
                  insight.reducibleGrossAnnual
                )} gross.`
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function createSurplusSummaryPoints(data: RetirementIncomePoint[]) {
  const seenAges = new Set<number>();

  return data.filter((point) => {
    const age = Math.floor(point.age);
    const hasSurplus =
      point.unavoidableSurplusAnnual > 0 ||
      point.avoidableFlexibleSurplusAnnual > 0;

    if (!hasSurplus || seenAges.has(age)) {
      return false;
    }

    seenAges.add(age);
    return true;
  });
}

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value));
}
