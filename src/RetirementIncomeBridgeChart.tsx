import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import * as d3 from "d3";

export type RetirementIncomePoint = {
  date: string;
  age: number;
  targetIncomeAnnual: number;
  isaIncomeAnnual: number;
  sippIncomeAnnual: number;
  alphaIncomeAnnual: number;
  nuvosIncomeAnnual: number;
  partialRetirementIncomeAnnual: number;
  statePensionIncomeAnnual: number;
  totalIncomeAnnual: number;
  shortfallAnnual: number;
  isaBalance?: number;
  sippBalance?: number;
  phase:
    | "build-up"
    | "isa-bridge"
    | "sipp-bridge"
    | "alpha-only"
    | "alpha-sipp"
    | "alpha-state";
};

export type RetirementIncomeBridgeParameters = {
  targetIncomeAnnual: number;
  alphaMonthlyAddedPension: number;
  isaMonthlyContribution: number;
  sippMonthlyContribution: number;
  retirementAge: number;
  alphaLeaveAge: number;
  sippAccessAge: number;
  sippUseByAge: number;
  isaAccessAge: number;
  alphaStartAge: number;
  isaUseByAge: number;
  partialRetirementStartAge: number;
  partialRetirementWorkPercent: number;
  partialRetirementEnabled: boolean;
  statePensionAge: number;
  showIsa: boolean;
  showSipp: boolean;
  sippUseByAgeEnabled: boolean;
  showNuvos: boolean;
  isaUseByAgeEnabled: boolean;
  showStatePension: boolean;
};

export type RetirementIncomeBridgeChartProps = RetirementIncomeBridgeParameters & {
  data: RetirementIncomePoint[];
  alphaLabel?: string;
  limits: RetirementIncomeBridgeLimits;
  statePensionEditable?: boolean;
  onChangeParameters: (patch: Partial<RetirementIncomeBridgeParameters>) => void;
};

export type RetirementIncomeBridgeLimits = {
  targetIncomeAnnual: NumberLimit;
  alphaMonthlyAddedPension: NumberLimit;
  isaMonthlyContribution: NumberLimit;
  sippMonthlyContribution: NumberLimit;
  retirementAge: NumberLimit;
  alphaLeaveAge: NumberLimit;
  sippAccessAge: NumberLimit;
  sippUseByAge: NumberLimit;
  isaAccessAge: NumberLimit;
  alphaStartAge: NumberLimit;
  isaUseByAge: NumberLimit;
  partialRetirementStartAge: NumberLimit;
  partialRetirementWorkPercent: NumberLimit;
  statePensionAge: NumberLimit;
};

type NumberLimit = {
  min: number;
  max: number;
  step: number;
};

type IncomeKey =
  | "isaIncomeAnnual"
  | "sippIncomeAnnual"
  | "alphaIncomeAnnual"
  | "nuvosIncomeAnnual"
  | "partialRetirementIncomeAnnual"
  | "statePensionIncomeAnnual";

type MilestoneKey =
  | "retirementAge"
  | "alphaLeaveAge"
  | "sippAccessAge"
  | "sippUseByAge"
  | "isaAccessAge"
  | "alphaStartAge"
  | "isaUseByAge"
  | "partialRetirementStartAge"
  | "statePensionAge";

type MilestoneMarker = {
  key: MilestoneKey;
  label: string;
  shortLabel: string;
  age: number;
  colour: string;
  editable: boolean;
};

const incomeKeys: IncomeKey[] = [
  "isaIncomeAnnual",
  "sippIncomeAnnual",
  "partialRetirementIncomeAnnual",
  "alphaIncomeAnnual",
  "nuvosIncomeAnnual",
  "statePensionIncomeAnnual",
];

const sourceMeta: Record<IncomeKey, { label: string; shortLabel: string; colour: string }> = {
  isaIncomeAnnual: {
    label: "ISA bridge",
    shortLabel: "ISA",
    colour: "#1f8ee6",
  },
  sippIncomeAnnual: {
    label: "SIPP bridge",
    shortLabel: "SIPP",
    colour: "#148c55",
  },
  partialRetirementIncomeAnnual: {
    label: "Partial retirement income",
    shortLabel: "Partial",
    colour: "#c2410c",
  },
  alphaIncomeAnnual: {
    label: "Alpha pension",
    shortLabel: "Alpha",
    colour: "#7353bf",
  },
  nuvosIncomeAnnual: {
    label: "Nuvos pension",
    shortLabel: "Nuvos",
    colour: "#b45309",
  },
  statePensionIncomeAnnual: {
    label: "State Pension",
    shortLabel: "State",
    colour: "#1d62d1",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

const BUILD_UP_META = {
  label: "Build-up",
};
const HANDLE_RADIUS = 9;
const MOBILE_HANDLE_WIDTH = 24;
const MOBILE_HANDLE_HEIGHT = 84;
const HANDLE_STACK_SPACING = 28;
const MOBILE_HANDLE_STACK_GAP = 16;
const MOBILE_HANDLE_STACK_SPACING = MOBILE_HANDLE_HEIGHT + MOBILE_HANDLE_STACK_GAP;
const MARKER_TAG_HEIGHT = 24;
const MARKER_TAG_GAP = 8;
const MARKER_TAG_PADDING_X = 8;
const MARKER_TAG_DOT_RADIUS = 3.5;
const MARKER_TAG_ROW_SPACING = 8;
const MARKER_TAG_MIN_WIDTH = 72;
const MARKER_TAG_MAX_WIDTH = 136;
const MARKER_TAG_CHAR_WIDTH = 6.4;
export function RetirementIncomeBridgeChart({
  data,
  targetIncomeAnnual,
  alphaMonthlyAddedPension,
  isaMonthlyContribution,
  sippMonthlyContribution,
  retirementAge,
  alphaLeaveAge,
  sippAccessAge,
  sippUseByAge,
  isaAccessAge,
  alphaStartAge,
  isaUseByAge,
  partialRetirementStartAge,
  partialRetirementWorkPercent,
  partialRetirementEnabled,
  statePensionAge,
  showIsa,
  showSipp,
  sippUseByAgeEnabled,
  showNuvos,
  isaUseByAgeEnabled,
  showStatePension,
  alphaLabel = "Alpha pension",
  limits,
  statePensionEditable = false,
  onChangeParameters,
}: RetirementIncomeBridgeChartProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const targetLineRef = useRef<SVGPathElement | null>(null);
  const markerRefs = useRef(new Map<MilestoneKey, SVGGElement>());
  const [width, setWidth] = useState(960);
  const [displayMode, setDisplayMode] = useState<"annual" | "monthly">("annual");
  const [draftTargetIncomeAnnual, setDraftTargetIncomeAnnual] = useState<number | null>(
    null,
  );
  const [pendingTargetIncomeAnnual, setPendingTargetIncomeAnnual] = useState<number | null>(
    null,
  );
  const [draftMarkerAges, setDraftMarkerAges] = useState<
    Partial<Record<MilestoneKey, { age: number; baseAge: number }>>
  >({});
  const [activeMarkerDragKey, setActiveMarkerDragKey] = useState<MilestoneKey | null>(
    null,
  );
  const [selectedMobileMarkerKey, setSelectedMobileMarkerKey] =
    useState<MilestoneKey>("retirementAge");
  const dataSourceTargetIncomeAnnual = data[0]?.targetIncomeAnnual ?? targetIncomeAnnual;
  const displayedTargetIncomeAnnual =
    draftTargetIncomeAnnual ??
    (pendingTargetIncomeAnnual !== null &&
    Math.abs(dataSourceTargetIncomeAnnual - pendingTargetIncomeAnnual) >= 0.001
      ? pendingTargetIncomeAnnual
      : targetIncomeAnnual);
  const divisor = displayMode === "monthly" ? 12 : 1;
  const valueLabel = displayMode === "monthly" ? "Monthly income" : "Annual income";
  const axisTargetLabel = formatCurrency(displayedTargetIncomeAnnual / divisor);
  const chartTitleId = "retirement-income-bridge-chart-title";
  const chartDescriptionId = "retirement-income-bridge-chart-description";
  const displayedData = useMemo(() => {
    if (dataSourceTargetIncomeAnnual <= 0) {
      return data.map((point) => ({
        ...point,
        targetIncomeAnnual: 0,
        shortfallAnnual: 0,
      }));
    }

    const scaleFactor = displayedTargetIncomeAnnual / dataSourceTargetIncomeAnnual;

    return data.map((point) => {
      const nextTargetIncomeAnnual = point.targetIncomeAnnual * scaleFactor;

      return {
        ...point,
        targetIncomeAnnual: nextTargetIncomeAnnual,
        shortfallAnnual:
          point.age >= retirementAge
            ? Math.max(0, nextTargetIncomeAnnual - point.totalIncomeAnnual)
            : 0,
      };
    });
  }, [data, dataSourceTargetIncomeAnnual, displayedTargetIncomeAnnual, retirementAge]);
  const visibleIncomeKeys = useMemo(
    () =>
      incomeKeys.filter((key) => {
        if (key === "isaIncomeAnnual") {
          return showIsa;
        }

        if (key === "sippIncomeAnnual") {
          return showSipp;
        }

        if (key === "nuvosIncomeAnnual") {
          return showNuvos;
        }

        if (key === "partialRetirementIncomeAnnual") {
          return partialRetirementEnabled;
        }

        if (key === "statePensionIncomeAnnual") {
          return showStatePension;
        }

        return true;
      }),
    [partialRetirementEnabled, showIsa, showNuvos, showSipp, showStatePension],
  );

  useEffect(() => {
    if (!shellRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(Math.max(300, entry.contentRect.width));
      }
    });

    observer.observe(shellRef.current);

    return () => observer.disconnect();
  }, []);

  const dimensions = useMemo(() => {
    const isCompact = width < 640;
    const height = isCompact ? 420 : 460;

    return {
      width,
      height,
      marginTop: isCompact ? 38 : 46,
      marginRight: isCompact ? 8 : 28,
      marginBottom: isCompact ? 34 : 38,
      marginLeft: isCompact ? 48 : 78,
    };
  }, [width]);
  const isCompactChart = width < 640;

  const plotWidth = Math.max(
    1,
    dimensions.width - dimensions.marginLeft - dimensions.marginRight,
  );
  const plotHeight = Math.max(
    1,
    dimensions.height - dimensions.marginTop - dimensions.marginBottom,
  );
  const ageExtent = d3.extent(displayedData, (point) => point.age);
  const minAge = Math.floor(ageExtent[0] ?? retirementAge - 5);
  const maxAge = Math.ceil(ageExtent[1] ?? statePensionAge + 20);
  const maxIncome =
    d3.max(displayedData, (point) =>
      Math.max(point.targetIncomeAnnual, point.totalIncomeAnnual) / divisor,
    ) ?? displayedTargetIncomeAnnual / divisor;
  const yMax = Math.max(
    (displayedTargetIncomeAnnual / divisor) * 1.18,
    maxIncome * 1.18,
    10000 / divisor,
  );
  const xScale = useMemo(
    () => d3.scaleLinear().domain([minAge, maxAge]).range([0, plotWidth]),
    [maxAge, minAge, plotWidth],
  );
  const yScale = useMemo(
    () => d3.scaleLinear().domain([0, yMax]).nice().range([plotHeight, 0]),
    [plotHeight, yMax],
  );
  const stack = d3
    .stack<RetirementIncomePoint>()
    .keys(visibleIncomeKeys)
    .value((point, key) => Number(point[key as IncomeKey]) / divisor);
  const stackedSeries = stack(displayedData);
  const area = d3
    .area<d3.SeriesPoint<RetirementIncomePoint>>()
    .x((point) => xScale(point.data.age))
    .y0((point) => yScale(point[0]))
    .y1((point) => yScale(point[1]))
    .curve(d3.curveStepAfter);
  const shortfallArea = d3
    .area<RetirementIncomePoint>()
    .defined((point) => point.shortfallAnnual > 0)
    .x((point) => xScale(point.age))
    .y0((point) => yScale(point.totalIncomeAnnual / divisor))
    .y1((point) => yScale(point.targetIncomeAnnual / divisor))
    .curve(d3.curveStepAfter);
  const targetLine = d3
    .line<RetirementIncomePoint>()
    .defined((point) => point.targetIncomeAnnual > 0)
    .x((point) => xScale(point.age))
    .y((point) => yScale(point.targetIncomeAnnual / divisor))
    .curve(d3.curveStepAfter);
  const yTicks = yScale.ticks(5);
  const xTicks = xScale.ticks(width < 640 ? 5 : 8);
  const milestoneMarkers: MilestoneMarker[] = useMemo(
    () =>
      [
      {
        key: "retirementAge",
        label: "Retire",
        shortLabel: "Retire",
        age: retirementAge,
        colour: "#0f6f72",
        editable: true,
      },
      {
        key: "alphaLeaveAge",
        label: "Leave Alpha",
        shortLabel: "Leave alpha",
        age: alphaLeaveAge,
        colour: "#b45309",
        editable: true,
      },
      ...(showSipp
        ? [
            {
              key: "sippAccessAge" as const,
              label: "SIPP start",
              shortLabel: "SIPP start",
              age: sippAccessAge,
              colour: "#148c55",
              editable: true,
            },
          ]
        : []),
      ...(showSipp && sippUseByAgeEnabled
        ? [
            {
              key: "sippUseByAge" as const,
              label: "SIPP stop",
              shortLabel: "SIPP stop",
              age: sippUseByAge,
              colour: "#0d6b40",
              editable: true,
            },
          ]
        : []),
      ...(showIsa
        ? [
            {
              key: "isaAccessAge" as const,
              label: "ISA start",
              shortLabel: "ISA start",
              age: isaAccessAge,
              colour: "#1f8ee6",
              editable: true,
            },
          ]
        : []),
      ...(partialRetirementEnabled
        ? [
            {
              key: "partialRetirementStartAge" as const,
              label: "Start partial",
              shortLabel: "Start partial",
              age: partialRetirementStartAge,
              colour: "#c2410c",
              editable: true,
            },
          ]
        : []),
      {
        key: "alphaStartAge",
        label: "Start Alpha",
        shortLabel: "Start Alpha",
        age: alphaStartAge,
        colour: "#7353bf",
        editable: true,
      },
      ...(showIsa && isaUseByAgeEnabled
        ? [
            {
              key: "isaUseByAge" as const,
              label: "ISA stop",
              shortLabel: "ISA stop",
              age: isaUseByAge,
              colour: "#155ea8",
              editable: true,
            },
          ]
        : []),
      ...(showStatePension
        ? [
            {
              key: "statePensionAge" as const,
              label: "Start State",
              shortLabel: "Start State",
              age: statePensionAge,
              colour: "#1d62d1",
              editable: statePensionEditable,
            },
          ]
        : []),
    ],
    [
      alphaStartAge,
      alphaLeaveAge,
      isaAccessAge,
      isaUseByAge,
      isaUseByAgeEnabled,
      partialRetirementEnabled,
      partialRetirementStartAge,
      retirementAge,
      showSipp,
      showIsa,
      sippUseByAge,
      sippUseByAgeEnabled,
      showStatePension,
      sippAccessAge,
      statePensionAge,
      statePensionEditable,
    ],
  );
  const displayedMilestoneMarkers = useMemo(
    () =>
      milestoneMarkers.map((marker) => ({
        ...marker,
        age: getDisplayMarkerAge(marker.age, draftMarkerAges[marker.key]),
        layoutAge: draftMarkerAges[marker.key]?.baseAge ?? marker.age,
      })),
    [draftMarkerAges, milestoneMarkers],
  );
  const markerLayouts = createMarkerLayouts(
    displayedMilestoneMarkers,
    xScale,
    plotWidth,
    isCompactChart,
  );
  const draggingMobileMarker =
    activeMarkerDragKey === null
      ? undefined
      : displayedMilestoneMarkers.find((marker) => marker.key === activeMarkerDragKey);
  const effectiveSelectedMobileMarkerKey = displayedMilestoneMarkers.some(
    (marker) => marker.key === selectedMobileMarkerKey,
  )
    ? selectedMobileMarkerKey
    : displayedMilestoneMarkers[0]?.key;
  const selectedMobileMarker =
    displayedMilestoneMarkers.find(
      (marker) => marker.key === effectiveSelectedMobileMarkerKey,
    ) ??
    displayedMilestoneMarkers[0];
  const mobileBridgeSummary = useMemo(
    () =>
      createMobileBridgeSummary({
        displayedData,
        displayedTargetIncomeAnnual,
        retirementAge,
        showStatePension,
        statePensionAge,
        alphaStartAge,
      }),
    [
      alphaStartAge,
      displayedData,
      displayedTargetIncomeAnnual,
      retirementAge,
      showStatePension,
      statePensionAge,
    ],
  );
  const buildUpWidth = Math.max(0, xScale(retirementAge) - xScale(minAge));

  useEffect(() => {
    const cleanup: Array<() => void> = [];

    milestoneMarkers.forEach((marker) => {
      const node = markerRefs.current.get(marker.key);

      if (!node || !marker.editable) {
        return;
      }

      const drag = d3
        .drag<SVGGElement, unknown>()
        .on("start drag", (event) => {
          const nextAge = xScale.invert(clampNumber(event.x, 0, plotWidth));

          setActiveMarkerDragKey(marker.key);
          setDraftMarkerAges((current) => ({
            ...current,
            [marker.key]: {
              age: snapToLimit(nextAge, limits[marker.key]),
              baseAge: marker.age,
            },
          }));
        })
        .on("end", (event) => {
          const nextAge = xScale.invert(clampNumber(event.x, 0, plotWidth));
          const committedAge = snapToLimit(nextAge, limits[marker.key]);

          setDraftMarkerAges((current) => {
            const nextDraftMarkerAges = { ...current };
            delete nextDraftMarkerAges[marker.key];
            return nextDraftMarkerAges;
          });
          setActiveMarkerDragKey(null);
          onChangeParameters({ [marker.key]: committedAge });
        });

      d3.select(node).call(drag);
      cleanup.push(() => d3.select(node).on(".drag", null));
    });

    return () => {
      cleanup.forEach((clean) => clean());
    };
  }, [limits, milestoneMarkers, onChangeParameters, plotWidth, xScale]);

  useEffect(() => {
    const node = targetLineRef.current;

    if (!node) {
      return;
    }

    const drag = d3
      .drag<SVGPathElement, unknown>()
      .on("start drag", (event) => {
        const nextValue = yScale.invert(clampNumber(event.y, 0, plotHeight)) * divisor;

        setDraftTargetIncomeAnnual(snapToLimit(nextValue, limits.targetIncomeAnnual));
      })
      .on("end", (event) => {
        const nextValue = yScale.invert(clampNumber(event.y, 0, plotHeight)) * divisor;
        const committedValue = snapToLimit(nextValue, limits.targetIncomeAnnual);

        setDraftTargetIncomeAnnual(null);
        setPendingTargetIncomeAnnual(committedValue);
        onChangeParameters({ targetIncomeAnnual: committedValue });
      });

    d3.select(node).call(drag);

    return () => {
      d3.select(node).on(".drag", null);
    };
  }, [divisor, limits.targetIncomeAnnual, onChangeParameters, plotHeight, yScale]);

  const handleMarkerKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    marker: MilestoneMarker,
  ) => {
    if (!marker.editable || !["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
    onChangeParameters({
      [marker.key]: snapToLimit(
        marker.age + direction * limits[marker.key].step,
        limits[marker.key],
      ),
    });
  };

  const handleTargetLineKeyDown = (event: KeyboardEvent<SVGPathElement>) => {
    if (!["ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowDown" || event.key === "ArrowLeft" ? -1 : 1;

    onChangeParameters({
      targetIncomeAnnual: snapToLimit(
        displayedTargetIncomeAnnual + direction * limits.targetIncomeAnnual.step,
        limits.targetIncomeAnnual,
      ),
    });
    setPendingTargetIncomeAnnual(
      snapToLimit(
        displayedTargetIncomeAnnual + direction * limits.targetIncomeAnnual.step,
        limits.targetIncomeAnnual,
      ),
    );
  };

  if (data.length === 0) {
    return (
      <section className="bridge-chart-panel" aria-live="polite">
        <p className="section-copy">
          The chart will appear once the current assumptions produce a valid projection.
        </p>
      </section>
    );
  }

  return (
    <section className="bridge-chart-panel" aria-labelledby={chartTitleId}>
      <div className="bridge-chart-heading">
        <h3 id={chartTitleId} className="bridge-chart-title">
          Retirement income bridge
        </h3>
        <div
          className="summary-toggle bridge-display-toggle"
          role="group"
          aria-label="Chart income display"
        >
          <button
            type="button"
            className={
              displayMode === "monthly"
                ? "summary-toggle-button summary-toggle-button--active"
                : "summary-toggle-button"
            }
            aria-label="Show chart as monthly"
            aria-pressed={displayMode === "monthly"}
            onClick={() => setDisplayMode("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={
              displayMode === "annual"
                ? "summary-toggle-button summary-toggle-button--active"
                : "summary-toggle-button"
            }
            aria-label="Show chart as annual"
            aria-pressed={displayMode === "annual"}
            onClick={() => setDisplayMode("annual")}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="bridge-mobile-summary" aria-label="Chart summary">
        {mobileBridgeSummary.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="bridge-chart-shell" ref={shellRef}>
        <svg
          className="bridge-chart-svg"
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          role="img"
          aria-labelledby={`${chartTitleId} ${chartDescriptionId}`}
          tabIndex={0}
        >
          <desc id={chartDescriptionId}>
            Stacked income chart showing ISA, SIPP, partial retirement income,
            Alpha, Nuvos and State Pension income against the target retirement
            income over age.
          </desc>
          <defs>
            <pattern
              id="shortfall-hatch"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="#bf2c2c" strokeWidth="2" />
            </pattern>
            {visibleIncomeKeys.map((key) => (
              <linearGradient
                key={key}
                id={`bridge-gradient-${key}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={sourceMeta[key].colour} stopOpacity="0.9" />
                <stop offset="100%" stopColor={sourceMeta[key].colour} stopOpacity="0.68" />
              </linearGradient>
            ))}
          </defs>

          <g transform={`translate(${dimensions.marginLeft},${dimensions.marginTop})`}>
            {buildUpWidth > 0 ? (
              <rect
                x={xScale(minAge)}
                y={0}
                width={buildUpWidth}
                height={plotHeight}
                className="bridge-build-up-band"
              />
            ) : null}

            {yTicks.map((tick) => (
              <g key={tick} className="bridge-gridline">
                <line x1={0} x2={plotWidth} y1={yScale(tick)} y2={yScale(tick)} />
                <text x={-12} y={yScale(tick)} dy="0.32em" textAnchor="end">
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            ))}

            {stackedSeries.map((series) => {
              const key = series.key as IncomeKey;

              return (
                <path
                  key={key}
                  d={area(series) ?? undefined}
                  fill={`url(#bridge-gradient-${key})`}
                  stroke={sourceMeta[key].colour}
                  strokeWidth="1.5"
                />
              );
            })}

            <path
              d={shortfallArea(displayedData) ?? undefined}
              className="bridge-shortfall-fill"
            />
            <path
              d={shortfallArea(displayedData) ?? undefined}
              fill="url(#shortfall-hatch)"
              opacity="0.55"
            />

            <path
              className="bridge-target-line"
              d={targetLine(displayedData) ?? undefined}
            />
            <path
              ref={targetLineRef}
              className="bridge-target-line-hitbox"
              d={targetLine(displayedData) ?? undefined}
              role="slider"
              tabIndex={0}
              aria-label="Target income line"
              aria-valuemin={limits.targetIncomeAnnual.min / divisor}
              aria-valuemax={limits.targetIncomeAnnual.max / divisor}
              aria-valuenow={displayedTargetIncomeAnnual / divisor}
              onKeyDown={handleTargetLineKeyDown}
            />

            {markerLayouts.map((marker) => {
              const x = xScale(marker.age);
              const compactHandleLabel = getMobileMarkerLabel(marker);

              return (
                <g
                  key={marker.key}
                  ref={(node) => {
                    if (node) {
                      markerRefs.current.set(marker.key, node);
                    } else {
                      markerRefs.current.delete(marker.key);
                    }
                  }}
                  className={
                    [
                      "bridge-milestone",
                      marker.editable ? "bridge-milestone--editable" : "",
                      marker.key === effectiveSelectedMobileMarkerKey
                        ? "bridge-milestone--selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  role={marker.editable ? "slider" : "img"}
                  tabIndex={0}
                  aria-label={`${marker.label}, age ${formatAgeValue(marker.age)}`}
                  aria-valuemin={limits[marker.key].min}
                  aria-valuemax={limits[marker.key].max}
                  aria-valuenow={marker.age}
                  onKeyDown={(event) => handleMarkerKeyDown(event, marker)}
                >
                  <line
                    x1={x}
                    x2={x}
                    y1={marker.handleY + MOBILE_HANDLE_HEIGHT / 2}
                    y2={plotHeight}
                    stroke={marker.colour}
                  />
                  <rect
                    x={x - MOBILE_HANDLE_WIDTH / 2}
                    y={marker.handleY - MOBILE_HANDLE_HEIGHT / 2}
                    width={MOBILE_HANDLE_WIDTH}
                    height={MOBILE_HANDLE_HEIGHT}
                    rx={MOBILE_HANDLE_WIDTH / 2}
                    className="bridge-milestone-mobile-handle"
                    fill={marker.colour}
                  />
                  <text
                    x={x}
                    y={marker.handleY}
                    className="bridge-milestone-mobile-label"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    transform={`rotate(90 ${x} ${marker.handleY})`}
                  >
                    {compactHandleLabel}
                  </text>
                </g>
              );
            })}

            <line className="bridge-axis" x1={0} x2={plotWidth} y1={plotHeight} y2={plotHeight} />
            <line className="bridge-axis" x1={0} x2={0} y1={0} y2={plotHeight} />
            {xTicks.map((tick) => (
              <g key={tick} className="bridge-x-tick">
                <line x1={xScale(tick)} x2={xScale(tick)} y1={plotHeight} y2={plotHeight + 6} />
                <text x={xScale(tick)} y={plotHeight + 18} textAnchor="middle">
                  {Math.round(tick)}
                </text>
              </g>
            ))}
            <text className="bridge-axis-title" x={0} y={plotHeight + 30}>
              Age
            </text>
            {draggingMobileMarker ? (
              <g
                className="bridge-drag-age"
                transform={`translate(${xScale(draggingMobileMarker.age)},${plotHeight + 18})`}
              >
                <rect x={-18} y={-13} width={36} height={19} rx={6} />
                <text y="0.12em" textAnchor="middle">
                  {formatAgeValue(draggingMobileMarker.age)}
                </text>
              </g>
            ) : null}
            <text
              className="bridge-axis-title"
              x={-dimensions.marginLeft + 2}
              y={-24}
            >
              {`${valueLabel} (£) · Target ${axisTargetLabel}`}
            </text>
          </g>
        </svg>

        <div className="bridge-legend bridge-legend--overlay" aria-label="Income sources">
          <span>
            <span className="bridge-build-up-key" />
            {BUILD_UP_META.label}
          </span>
          {incomeKeys.map((key) => {
            const label = key === "alphaIncomeAnnual" ? alphaLabel : sourceMeta[key].label;
            const enabled = isIncomeSourceEnabled(key, {
              partialRetirementEnabled,
              showIsa,
              showNuvos,
              showSipp,
              showStatePension,
            });
            const togglePatch = getIncomeSourceTogglePatch(key, !enabled);

            if (!togglePatch) {
              return (
                <span key={key}>
                  <span style={{ background: sourceMeta[key].colour }} />
                  {label}
                </span>
              );
            }

            return (
              <button
                key={key}
                type="button"
                className="bridge-legend-toggle"
                aria-label={getIncomeSourceToggleLabel(key)}
                aria-pressed={enabled}
                onClick={() => onChangeParameters(togglePatch)}
              >
                <span style={{ background: sourceMeta[key].colour }} />
                {label}
              </button>
            );
          })}
          <span>
            <span className="bridge-shortfall-key" />
            Shortfall
          </span>
        </div>

      </div>

      {selectedMobileMarker ? (
        <div className="bridge-mobile-marker-summary">
          <span>Selected milestone</span>
          <strong>{selectedMobileMarker.label}</strong>
          <span>Age {formatAgeValue(selectedMobileMarker.age)}</span>
        </div>
      ) : null}

      {selectedMobileMarker ? (
        <div className="bridge-mobile-navigation">
          <label>
            <span>Chart section</span>
            <select
              className="select-input"
              value={selectedMobileMarker.key}
              onChange={(event) =>
                setSelectedMobileMarkerKey(event.target.value as MilestoneKey)
              }
            >
              {displayedMilestoneMarkers.map((marker) => (
                <option key={marker.key} value={marker.key}>
                  {marker.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Age</span>
            <input
              className="number-input"
              type="number"
              min={limits[selectedMobileMarker.key].min}
              max={limits[selectedMobileMarker.key].max}
              step={limits[selectedMobileMarker.key].step}
              value={formatAgeValue(selectedMobileMarker.age)}
              disabled={!selectedMobileMarker.editable}
              onChange={(event) =>
                onChangeParameters({
                  [selectedMobileMarker.key]: snapToLimit(
                    Number(event.target.value),
                    limits[selectedMobileMarker.key],
                  ),
                })
              }
            />
          </label>
          <input
            aria-label={`Chart ${selectedMobileMarker.label} age`}
            type="range"
            min={limits[selectedMobileMarker.key].min}
            max={limits[selectedMobileMarker.key].max}
            step={limits[selectedMobileMarker.key].step}
            value={selectedMobileMarker.age}
            disabled={!selectedMobileMarker.editable}
            onChange={(event) =>
              onChangeParameters({
                [selectedMobileMarker.key]: snapToLimit(
                  Number(event.target.value),
                  limits[selectedMobileMarker.key],
                ),
              })
            }
          />
        </div>
      ) : null}

      <div className="bridge-control-grid">
        <BridgeMetricControl
          label="Added Alpha pension"
          value={alphaMonthlyAddedPension}
          suffix="/ month"
          limit={limits.alphaMonthlyAddedPension}
          colour="#7353bf"
          onChange={(value) => onChangeParameters({ alphaMonthlyAddedPension: value })}
        />
        {showIsa ? (
          <BridgeMetricControl
            label="ISA contribution"
            value={isaMonthlyContribution}
            suffix="/ month"
            limit={limits.isaMonthlyContribution}
            colour="#1f8ee6"
            onChange={(value) => onChangeParameters({ isaMonthlyContribution: value })}
          />
        ) : null}
        {showSipp ? (
          <BridgeMetricControl
            label="SIPP contribution"
            value={sippMonthlyContribution}
            suffix="/ month"
            limit={limits.sippMonthlyContribution}
            colour="#148c55"
            onChange={(value) => onChangeParameters({ sippMonthlyContribution: value })}
          />
        ) : null}
        {partialRetirementEnabled ? (
          <BridgeMetricControl
            label="Partial work"
            value={partialRetirementWorkPercent}
            suffix="%"
            limit={limits.partialRetirementWorkPercent}
            colour="#c2410c"
            formatValue={(value) => String(Math.round(value))}
            onChange={(value) => onChangeParameters({ partialRetirementWorkPercent: value })}
          />
        ) : null}
        <BridgeMetricControl
          label="Target income"
          value={displayMode === "monthly" ? targetIncomeAnnual / 12 : targetIncomeAnnual}
          suffix={displayMode === "monthly" ? "/ month" : "/ year"}
          limit={getTargetIncomeControlLimit(limits.targetIncomeAnnual, displayMode)}
          colour="#0b3c5d"
          onChange={(value) =>
            onChangeParameters({
              targetIncomeAnnual: displayMode === "monthly" ? value * 12 : value,
            })
          }
        />
      </div>
    </section>
  );
}

function BridgeMetricControl({
  label,
  value,
  suffix,
  limit,
  colour,
  formatValue = formatCurrency,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  limit: NumberLimit;
  colour: string;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const boundedValue = clampToLimit(value, limit);
  const [draftValue, setDraftValue] = useState<number | null>(null);
  const displayedValue = draftValue ?? boundedValue;
  const roundedValue = Math.round(displayedValue);

  const commitDraftValue = (nextValue: number) => {
    if (draftValue === null) {
      return;
    }

    onChange(clampToLimit(nextValue, limit));
    setDraftValue(null);
  };

  return (
    <div className="bridge-control-card" style={{ "--control-colour": colour } as React.CSSProperties}>
      <span>{label}</span>
      <strong>
        {formatValue(roundedValue)} <small>{suffix}</small>
      </strong>
      <div className="bridge-control-row">
        <input
          aria-label={label}
          type="range"
          min={limit.min}
          max={limit.max}
          step={limit.step}
          value={displayedValue}
          onChange={(event) => {
            setDraftValue(clampToLimit(Number(event.target.value), limit));
          }}
          onMouseUp={(event) => commitDraftValue(Number(event.currentTarget.value))}
          onTouchEnd={(event) => commitDraftValue(Number(event.currentTarget.value))}
          onBlur={(event) => commitDraftValue(Number(event.currentTarget.value))}
          onKeyUp={(event) => commitDraftValue(Number(event.currentTarget.value))}
        />
      </div>
    </div>
  );
}

function createMarkerLayouts(
  markers: Array<MilestoneMarker & { layoutAge?: number }>,
  xScale: d3.ScaleLinear<number, number>,
  plotWidth: number,
  isCompactChart: boolean,
) {
  if (isCompactChart) {
    const rowByKey = new Map<MilestoneKey, number>();
    const minimumGap = MOBILE_HANDLE_WIDTH + 6;
    const rowRightEdges: number[] = [];

    [...markers]
      .sort((first, second) => xScale(first.layoutAge ?? first.age) - xScale(second.layoutAge ?? second.age))
      .forEach((marker) => {
        const markerX = xScale(marker.layoutAge ?? marker.age);
        const row = rowRightEdges.findIndex(
          (rightEdge) => markerX - rightEdge >= minimumGap,
        );
        const nextRow = row === -1 ? rowRightEdges.length : row;

        rowRightEdges[nextRow] = markerX;
        rowByKey.set(marker.key, nextRow);
      });

    return markers.map((marker) => {
      const row = rowByKey.get(marker.key) ?? 0;
      const labelText = `${marker.shortLabel} ${formatAgeValue(marker.age)}`;
      const handleY =
        MOBILE_HANDLE_HEIGHT / 2 + row * MOBILE_HANDLE_STACK_SPACING;

      return {
        ...marker,
        handleY,
        labelText,
        tagX: 0,
        tagY: handleY - MARKER_TAG_HEIGHT / 2,
        tagWidth: getMarkerTagWidth(labelText),
      };
    });
  }

  const rowEnds: number[] = [];
  const rowByKey = new Map<MilestoneKey, number>();
  const tagXByKey = new Map<MilestoneKey, number>();
  const tagWidthByKey = new Map<MilestoneKey, number>();
  const labelTextByKey = new Map<MilestoneKey, string>();

  [...markers]
    .sort((first, second) => xScale(first.age) - xScale(second.age))
    .forEach((marker) => {
      const markerX = xScale(marker.age);
      const labelText = `${marker.shortLabel} ${formatAgeValue(marker.age)}`;
      const tagWidth = getMarkerTagWidth(labelText);
      const preferredTagX =
        markerX + tagWidth + MARKER_TAG_GAP > plotWidth
          ? markerX - tagWidth - MARKER_TAG_GAP
          : markerX + MARKER_TAG_GAP;
      const tagX = clampNumber(preferredTagX, 0, Math.max(0, plotWidth - tagWidth));
      const row = rowEnds.findIndex(
        (endX) => tagX - endX >= MARKER_TAG_ROW_SPACING,
      );
      const nextRow = row === -1 ? rowEnds.length : row;
      rowEnds[nextRow] = tagX + tagWidth;
      rowByKey.set(marker.key, nextRow);
      tagXByKey.set(marker.key, tagX);
      tagWidthByKey.set(marker.key, tagWidth);
      labelTextByKey.set(marker.key, labelText);
    });

  return markers.map((marker) => {
    const row = rowByKey.get(marker.key) ?? 0;
    const handleY = row * HANDLE_STACK_SPACING;

    return {
      ...marker,
      handleY,
      labelText: labelTextByKey.get(marker.key) ?? marker.label,
      tagX: tagXByKey.get(marker.key) ?? 0,
      tagY: row * HANDLE_STACK_SPACING - MARKER_TAG_HEIGHT / 2,
      tagWidth: tagWidthByKey.get(marker.key) ?? MARKER_TAG_MIN_WIDTH,
    };
  });
}

function getMarkerTagWidth(label: string) {
  return clampNumber(
    label.length * MARKER_TAG_CHAR_WIDTH +
      MARKER_TAG_PADDING_X * 3 +
      MARKER_TAG_DOT_RADIUS * 2,
    MARKER_TAG_MIN_WIDTH,
    MARKER_TAG_MAX_WIDTH,
  );
}

function getTargetIncomeControlLimit(
  limit: NumberLimit,
  displayMode: "annual" | "monthly",
) {
  if (displayMode === "annual") {
    return limit;
  }

  return {
    min: limit.min / 12,
    max: limit.max / 12,
    step: limit.step / 12,
  };
}

function getMobileMarkerLabel(marker: MilestoneMarker) {
  if (marker.key === "retirementAge") {
    return "Retire";
  }

  if (marker.key === "alphaLeaveAge") {
    return "Leave alpha";
  }

  if (marker.key === "alphaStartAge") {
    return "Start Alpha";
  }

  if (marker.key === "statePensionAge") {
    return "Start State";
  }

  if (marker.key === "partialRetirementStartAge") {
    return "Start partial";
  }

  if (marker.key === "sippAccessAge") {
    return "SIPP start";
  }

  if (marker.key === "sippUseByAge") {
    return "SIPP stop";
  }

  if (marker.key === "isaAccessAge") {
    return "ISA start";
  }

  if (marker.key === "isaUseByAge") {
    return "ISA stop";
  }

  return marker.shortLabel;
}

function createMobileBridgeSummary({
  displayedData,
  displayedTargetIncomeAnnual,
  retirementAge,
  showStatePension,
  statePensionAge,
  alphaStartAge,
}: {
  displayedData: RetirementIncomePoint[];
  displayedTargetIncomeAnnual: number;
  retirementAge: number;
  showStatePension: boolean;
  statePensionAge: number;
  alphaStartAge: number;
}) {
  const shortfallPoints = displayedData.filter(
    (point) => point.age >= retirementAge && point.shortfallAnnual > 0,
  );
  const firstShortfallPoint = shortfallPoints[0];
  const lastShortfallPoint = shortfallPoints.at(-1);
  const shortfallLabel =
    firstShortfallPoint && lastShortfallPoint
      ? `Ages ${formatAgeValue(firstShortfallPoint.age)}-${formatAgeValue(lastShortfallPoint.age)}`
      : "No modelled shortfall";

  return [
    {
      label: "Target",
      value: `${formatCurrency(displayedTargetIncomeAnnual)} / year`,
    },
    {
      label: "Shortfall",
      value: shortfallLabel,
    },
    {
      label: showStatePension ? "State Pension" : "Alpha pension",
      value: `Age ${formatAgeValue(
        showStatePension ? statePensionAge : alphaStartAge,
      )}`,
    },
  ];
}

function isIncomeSourceEnabled(
  key: IncomeKey,
  state: Pick<
    RetirementIncomeBridgeParameters,
    "partialRetirementEnabled" | "showIsa" | "showNuvos" | "showSipp" | "showStatePension"
  >,
) {
  if (key === "isaIncomeAnnual") {
    return state.showIsa;
  }

  if (key === "sippIncomeAnnual") {
    return state.showSipp;
  }

  if (key === "nuvosIncomeAnnual") {
    return state.showNuvos;
  }

  if (key === "partialRetirementIncomeAnnual") {
    return state.partialRetirementEnabled;
  }

  if (key === "statePensionIncomeAnnual") {
    return state.showStatePension;
  }

  return true;
}

function getIncomeSourceTogglePatch(
  key: IncomeKey,
  enabled: boolean,
): Partial<RetirementIncomeBridgeParameters> | null {
  if (key === "isaIncomeAnnual") {
    return { showIsa: enabled };
  }

  if (key === "sippIncomeAnnual") {
    return { showSipp: enabled };
  }

  if (key === "nuvosIncomeAnnual") {
    return { showNuvos: enabled };
  }

  if (key === "partialRetirementIncomeAnnual") {
    return { partialRetirementEnabled: enabled };
  }

  if (key === "statePensionIncomeAnnual") {
    return { showStatePension: enabled };
  }

  return null;
}

function getIncomeSourceToggleLabel(key: IncomeKey) {
  if (key === "partialRetirementIncomeAnnual") {
    return "Toggle chart partial retirement source";
  }

  return `Toggle chart ${sourceMeta[key].label} source`;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value));
}

function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value);
}

function formatAgeValue(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function getDisplayMarkerAge(
  sourceAge: number,
  draftAge: { age: number; baseAge: number } | undefined,
) {
  if (!draftAge) {
    return sourceAge;
  }

  if (
    areAgesEquivalent(sourceAge, draftAge.baseAge) ||
    areAgesEquivalent(sourceAge, draftAge.age)
  ) {
    return draftAge.age;
  }

  return sourceAge;
}

function areAgesEquivalent(firstAge: number, secondAge: number) {
  return Math.abs(firstAge - secondAge) < 0.001;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampToLimit(value: number, limit: NumberLimit) {
  return clampNumber(value, limit.min, limit.max);
}

function snapToLimit(value: number, limit: NumberLimit) {
  const clamped = clampToLimit(value, limit);
  const steps = Math.round((clamped - limit.min) / limit.step);
  const snapped = limit.min + steps * limit.step;
  return Number(snapToLimitPrecision(snapped, limit.step));
}

function snapToLimitPrecision(value: number, step: number) {
  const precision = Math.max(0, (step.toString().split(".")[1] ?? "").length);
  return value.toFixed(precision);
}
