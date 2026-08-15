import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  RetirementIncomeChart,
  type RetirementIncomeChartLimits,
  type RetirementIncomeChartParameters,
  type RetirementIncomePoint,
} from "../RetirementIncomeChart";
import type { PensionValidationIssue } from "../settings";

export function DeferredBelowFold({
  children,
  estimatedHeight,
  forceRender = false,
}: {
  children: ReactNode;
  estimatedHeight: number;
  forceRender?: boolean;
}) {
  const [shouldRender, setShouldRender] = useState(false);
  const placeholderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (forceRender || shouldRender) {
      return undefined;
    }

    const placeholder = placeholderRef.current;

    if (!placeholder || typeof window.IntersectionObserver !== "function") {
      setShouldRender(true);
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: "700px 0px" }
    );

    observer.observe(placeholder);

    return () => observer.disconnect();
  }, [forceRender, shouldRender]);

  if (forceRender || shouldRender) {
    return children;
  }

  return (
    <div
      ref={placeholderRef}
      aria-hidden="true"
      style={{ minHeight: `${estimatedHeight}px` }}
    />
  );
}

export function ComparisonRetirementIncomeChart({
  retirementIncomeSeries,
  retirementIncomeChartParameters,
  retirementIncomeChartLimits,
  hideInactiveLegendItems = false,
  showFlexibleWithdrawalInsights = false,
  presentation = "standard",
  validationIssues,
  onChangeChartParameters,
}: {
  retirementIncomeSeries?: RetirementIncomePoint[];
  retirementIncomeChartParameters?: RetirementIncomeChartParameters;
  retirementIncomeChartLimits?: RetirementIncomeChartLimits;
  hideInactiveLegendItems?: boolean;
  showFlexibleWithdrawalInsights?: boolean;
  presentation?: "standard" | "simple";
  validationIssues?: PensionValidationIssue[];
  onChangeChartParameters?: (
    patch: Partial<RetirementIncomeChartParameters>
  ) => void;
}) {
  if (
    !retirementIncomeSeries ||
    !retirementIncomeChartParameters ||
    !retirementIncomeChartLimits ||
    !onChangeChartParameters
  ) {
    return null;
  }

  return (
    <RetirementIncomeChart
      data={retirementIncomeSeries}
      alphaLabel="Alpha pension"
      hideInactiveLegendItems={hideInactiveLegendItems}
      showFlexibleWithdrawalInsights={showFlexibleWithdrawalInsights}
      presentation={presentation}
      limits={retirementIncomeChartLimits}
      statePensionEditable
      validationIssues={validationIssues}
      onChangeParameters={onChangeChartParameters}
      {...retirementIncomeChartParameters}
    />
  );
}
