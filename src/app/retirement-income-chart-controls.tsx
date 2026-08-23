import { useId, useState } from "react";
import type { ResidualFlexibleFundInsight } from "../result-projection/flexible-withdrawals";
import { formatModelAgeCompact } from "../settings";
import type {
  ChartNumberLimit,
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
} from "../result-projection/retirement-income-chart-model";
import { clampToLimit } from "./chart-drag-constraints";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function createFlexibleAccountWarnings(
  reducibleAccounts: Set<string>,
  residualAccounts: ResidualFlexibleFundInsight[]
) {
  const warnings = new Map<string, string>();
  const labels: Record<"isa" | "lisa" | "sipp", string> = {
    isa: "ISA",
    lisa: "LISA",
    sipp: "SIPP",
  };

  Object.entries(labels).forEach(([accountId, label]) => {
    if (reducibleAccounts.has(accountId)) {
      warnings.set(
        accountId,
        `Potential overspend: modelled ${label} withdrawals could be reduced at some ages.`
      );
      return;
    }

    const residualAccount = residualAccounts.find(
      (account) => account.accountId === accountId
    );

    if (!residualAccount) {
      return;
    }

    const explanation = residualAccount.wasUsed
      ? `the model leaves ${formatCurrency(residualAccount.endingBalance)} in the ${residualAccount.label}`
      : `the ${residualAccount.label} is not used for modelled income and retains ${formatCurrency(residualAccount.endingBalance)}`;
    warnings.set(
      accountId,
      `Potential over-saving: ${explanation} at age ${formatModelAgeCompact(residualAccount.planningHorizonAge)}. You may want to compare a lower contribution.`
    );
  });

  return warnings;
}

export function RetirementIncomeControlGrid({
  displayedAlphaMonthlyAddedPension,
  flexibleAccountWarnings,
  hasUnavoidableSurplus,
  isaMonthlyContribution,
  lisaMonthlyContribution,
  limits,
  onChangeParameters,
  partialRetirementEnabled,
  partialRetirementWorkPercent,
  showAlpha,
  showIsa,
  showLisa,
  showSipp,
  sippMonthlyContribution,
}: Pick<
  RetirementIncomeChartParameters,
  | "isaMonthlyContribution"
  | "lisaMonthlyContribution"
  | "partialRetirementEnabled"
  | "partialRetirementWorkPercent"
  | "showAlpha"
  | "showIsa"
  | "showLisa"
  | "showSipp"
  | "sippMonthlyContribution"
> & {
  displayedAlphaMonthlyAddedPension: number;
  flexibleAccountWarnings: Map<string, string>;
  hasUnavoidableSurplus: boolean;
  limits: RetirementIncomeChartLimits;
  onChangeParameters: (patch: Partial<RetirementIncomeChartParameters>) => void;
}) {
  return (
    <div className="retirement-income-control-grid">
      {showAlpha ? (
        <RetirementIncomeMetricControl
          label="Added Alpha pension"
          value={displayedAlphaMonthlyAddedPension}
          suffix="/ month"
          limit={limits.alphaMonthlyAddedPension}
          colour="#7353bf"
          surplusWarning={
            hasUnavoidableSurplus &&
            displayedAlphaMonthlyAddedPension >
              limits.alphaMonthlyAddedPension.min
              ? "Potential overspend: guaranteed income exceeds the target at some ages. Added Alpha pension is one adjustable contributor."
              : undefined
          }
          onChange={(value) =>
            onChangeParameters({ alphaMonthlyAddedPension: value })
          }
        />
      ) : null}
      {showIsa ? (
        <RetirementIncomeMetricControl
          label="ISA contribution"
          value={isaMonthlyContribution}
          suffix="/ month"
          limit={limits.isaMonthlyContribution}
          colour="#155ea8"
          surplusWarning={flexibleAccountWarnings.get("isa")}
          onChange={(value) =>
            onChangeParameters({ isaMonthlyContribution: value })
          }
        />
      ) : null}
      {showLisa ? (
        <RetirementIncomeMetricControl
          label="LISA contribution"
          value={lisaMonthlyContribution}
          suffix="/ month"
          limit={limits.lisaMonthlyContribution}
          colour="#7c5c12"
          surplusWarning={flexibleAccountWarnings.get("lisa")}
          onChange={(value) =>
            onChangeParameters({ lisaMonthlyContribution: value })
          }
        />
      ) : null}
      {showSipp ? (
        <RetirementIncomeMetricControl
          label="SIPP contribution"
          value={sippMonthlyContribution}
          suffix="/ month"
          limit={limits.sippMonthlyContribution}
          colour="#0d6b40"
          surplusWarning={flexibleAccountWarnings.get("sipp")}
          onChange={(value) =>
            onChangeParameters({ sippMonthlyContribution: value })
          }
        />
      ) : null}
      {partialRetirementEnabled ? (
        <RetirementIncomeMetricControl
          label="Partial work"
          value={partialRetirementWorkPercent}
          suffix="%"
          limit={limits.partialRetirementWorkPercent}
          colour="#c2410c"
          formatValue={(value) => String(Math.round(value))}
          onChange={(value) =>
            onChangeParameters({ partialRetirementWorkPercent: value })
          }
        />
      ) : null}
    </div>
  );
}

function RetirementIncomeMetricControl({
  label,
  value,
  suffix,
  limit,
  colour,
  surplusWarning,
  formatValue = formatCurrency,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  limit: ChartNumberLimit;
  colour: string;
  surplusWarning?: string;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const boundedValue = clampToLimit(value, limit);
  const [draftValue, setDraftValue] = useState<number | null>(null);
  const displayedValue = draftValue ?? boundedValue;
  const roundedValue = Math.round(displayedValue);
  const surplusWarningId = useId();

  const commitDraftValue = (nextValue: number) => {
    if (draftValue === null) {
      return;
    }

    onChange(clampToLimit(nextValue, limit));
    setDraftValue(null);
  };

  return (
    <div
      className={`retirement-income-control-card${
        surplusWarning ? " retirement-income-control-card--surplus" : ""
      }`}
      style={{ "--control-colour": colour } as React.CSSProperties}
    >
      <span>{label}</span>
      <strong>
        {formatValue(roundedValue)} <small>{suffix}</small>
      </strong>
      <div className="retirement-income-control-row">
        <input
          aria-label={label}
          aria-describedby={surplusWarning ? surplusWarningId : undefined}
          type="range"
          min={limit.min}
          max={limit.max}
          step={limit.step}
          value={displayedValue}
          onChange={(event) => {
            setDraftValue(clampToLimit(Number(event.target.value), limit));
          }}
          onMouseUp={(event) =>
            commitDraftValue(Number(event.currentTarget.value))
          }
          onTouchEnd={(event) =>
            commitDraftValue(Number(event.currentTarget.value))
          }
          onBlur={(event) =>
            commitDraftValue(Number(event.currentTarget.value))
          }
          onKeyUp={(event) =>
            commitDraftValue(Number(event.currentTarget.value))
          }
        />
      </div>
      {surplusWarning ? (
        <p
          id={surplusWarningId}
          className="retirement-income-control-surplus-warning"
        >
          {surplusWarning}
        </p>
      ) : null}
    </div>
  );
}

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value));
}
