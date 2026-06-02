import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  RetirementIncomeBridgeChart,
  type RetirementIncomeBridgeLimits,
  type RetirementIncomeBridgeParameters,
  type RetirementIncomePoint,
} from "../RetirementIncomeBridgeChart";
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

export function ComparisonBridgeChart({
  retirementIncomeSeries,
  bridgeChartParameters,
  bridgeChartLimits,
  hideInactiveLegendItems = false,
  validationIssues,
  onChangeChartParameters,
}: {
  retirementIncomeSeries?: RetirementIncomePoint[];
  bridgeChartParameters?: RetirementIncomeBridgeParameters;
  bridgeChartLimits?: RetirementIncomeBridgeLimits;
  hideInactiveLegendItems?: boolean;
  validationIssues?: PensionValidationIssue[];
  onChangeChartParameters?: (
    patch: Partial<RetirementIncomeBridgeParameters>
  ) => void;
}) {
  if (
    !retirementIncomeSeries ||
    !bridgeChartParameters ||
    !bridgeChartLimits ||
    !onChangeChartParameters
  ) {
    return null;
  }

  return (
    <RetirementIncomeBridgeChart
      data={retirementIncomeSeries}
      alphaLabel="Alpha pension"
      hideInactiveLegendItems={hideInactiveLegendItems}
      limits={bridgeChartLimits}
      statePensionEditable
      validationIssues={validationIssues}
      onChangeParameters={onChangeChartParameters}
      {...bridgeChartParameters}
    />
  );
}
