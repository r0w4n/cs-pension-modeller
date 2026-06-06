import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";
import * as d3 from "d3";
import type { PensionValidationIssue } from "./settings";

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
  assessedIncomeAnnual: number;
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
  nuvosStartAge: number;
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

export type RetirementIncomeBridgeChartProps =
  RetirementIncomeBridgeParameters & {
    data: RetirementIncomePoint[];
    alphaLabel?: string;
    hideInactiveLegendItems?: boolean;
    limits: RetirementIncomeBridgeLimits;
    statePensionEditable?: boolean;
    validationIssues?: PensionValidationIssue[];
    onChangeParameters: (
      patch: Partial<RetirementIncomeBridgeParameters>
    ) => void;
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
  nuvosStartAge: NumberLimit;
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
  | "nuvosStartAge"
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

type TouchPoint = {
  clientX: number;
  clientY: number;
  identifier: number;
};

type TouchListLike = {
  length: number;
  item?: (index: number) => TouchPoint | null;
  [index: number]: TouchPoint;
};

type ChartDimensions = {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
};

const incomeKeys: IncomeKey[] = [
  "isaIncomeAnnual",
  "sippIncomeAnnual",
  "partialRetirementIncomeAnnual",
  "alphaIncomeAnnual",
  "nuvosIncomeAnnual",
  "statePensionIncomeAnnual",
];

const sourceMeta: Record<
  IncomeKey,
  { label: string; shortLabel: string; colour: string }
> = {
  isaIncomeAnnual: {
    label: "ISA",
    shortLabel: "ISA",
    colour: "#1f8ee6",
  },
  sippIncomeAnnual: {
    label: "SIPP",
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
const DEFAULT_BUILD_UP_WINDOW_YEARS = 2.5;
const HANDLE_LABEL_WIDTH = 24;
const HANDLE_LABEL_HEIGHT = 84;
const HANDLE_LABEL_STACK_GAP = 16;
const HANDLE_LABEL_STACK_SPACING = HANDLE_LABEL_HEIGHT + HANDLE_LABEL_STACK_GAP;
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
  nuvosStartAge,
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
  hideInactiveLegendItems = false,
  limits,
  statePensionEditable = false,
  validationIssues = [],
  onChangeParameters,
}: RetirementIncomeBridgeChartProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeMarkerDragPointerIdRef = useRef<number | null>(null);
  const activeTargetDragPointerIdRef = useRef<number | null>(null);
  const activeMarkerTouchIdentifierRef = useRef<number | null>(null);
  const activeTargetTouchIdentifierRef = useRef<number | null>(null);
  const lastTouchStartTimeRef = useRef<number>(0);
  const [width, setWidth] = useState(960);
  const [displayMode, setDisplayMode] = useState<"annual" | "monthly">(
    "annual"
  );
  const [draftTargetIncomeAnnual, setDraftTargetIncomeAnnual] = useState<
    number | null
  >(null);
  const [isTargetDragging, setIsTargetDragging] = useState(false);
  const [pendingTargetIncomeAnnual, setPendingTargetIncomeAnnual] = useState<
    number | null
  >(null);
  const [draftMarkerAges, setDraftMarkerAges] = useState<
    Partial<Record<MilestoneKey, { age: number; baseAge: number }>>
  >({});
  const [activeMarkerDragKey, setActiveMarkerDragKey] =
    useState<MilestoneKey | null>(null);
  const [selectedMobileMarkerKey, setSelectedMobileMarkerKey] =
    useState<MilestoneKey>("retirementAge");
  const dataSourceTargetIncomeAnnual =
    data[0]?.targetIncomeAnnual ?? targetIncomeAnnual;
  const displayedTargetIncomeAnnual =
    draftTargetIncomeAnnual ??
    (pendingTargetIncomeAnnual !== null &&
    Math.abs(dataSourceTargetIncomeAnnual - pendingTargetIncomeAnnual) >= 0.001
      ? pendingTargetIncomeAnnual
      : targetIncomeAnnual);
  const divisor = displayMode === "monthly" ? 12 : 1;
  const valueLabel =
    displayMode === "monthly" ? "Monthly income" : "Annual income";
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

    const scaleFactor =
      displayedTargetIncomeAnnual / dataSourceTargetIncomeAnnual;

    return data.map((point) => {
      const nextTargetIncomeAnnual = point.targetIncomeAnnual * scaleFactor;

      return {
        ...point,
        targetIncomeAnnual: nextTargetIncomeAnnual,
        shortfallAnnual:
          point.age >= retirementAge
            ? Math.max(0, nextTargetIncomeAnnual - point.assessedIncomeAnnual)
            : 0,
      };
    });
  }, [
    data,
    dataSourceTargetIncomeAnnual,
    displayedTargetIncomeAnnual,
    retirementAge,
  ]);
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
    [partialRetirementEnabled, showIsa, showNuvos, showSipp, showStatePension]
  );
  const legendIncomeKeys = useMemo(
    () => (hideInactiveLegendItems ? visibleIncomeKeys : incomeKeys),
    [hideInactiveLegendItems, visibleIncomeKeys]
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

  const dimensions = useMemo<ChartDimensions>(() => {
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
  const plotWidth = Math.max(
    1,
    dimensions.width - dimensions.marginLeft - dimensions.marginRight
  );
  const plotHeight = Math.max(
    1,
    dimensions.height - dimensions.marginTop - dimensions.marginBottom
  );
  const ageExtent = d3.extent(displayedData, (point) => point.age);
  const activeMilestoneAges = createActiveMilestoneAges({
    alphaLeaveAge,
    alphaStartAge,
    nuvosStartAge,
    isaAccessAge,
    isaUseByAge,
    isaUseByAgeEnabled,
    partialRetirementEnabled,
    partialRetirementStartAge,
    retirementAge,
    showIsa,
    showNuvos,
    showSipp,
    showStatePension,
    sippAccessAge,
    sippUseByAge,
    sippUseByAgeEnabled,
    statePensionAge,
  });
  const activeMilestoneBoundaries = createActiveMilestoneBoundaries({
    alphaLeaveAge,
    alphaStartAge,
    isaAccessAge,
    isaUseByAge,
    isaUseByAgeEnabled,
    nuvosStartAge,
    partialRetirementEnabled,
    partialRetirementStartAge,
    retirementAge,
    showIsa,
    showNuvos,
    showSipp,
    showStatePension,
    sippAccessAge,
    sippUseByAge,
    sippUseByAgeEnabled,
    statePensionAge,
  });
  const earliestVisibleMilestoneAge = Math.min(
    ...filterFiniteAges([
      ...activeMilestoneAges,
      ...Object.values(draftMarkerAges).map(
        (draftAge) => draftAge?.age ?? null
      ),
    ])
  );
  const chartMaxAge = createChartMaxAge({
    dataMaxAge: ageExtent[1],
    fallbackMaxAge: statePensionAge + 20,
    milestoneAges: activeMilestoneAges,
  });
  const buildUpEndAge = createBuildUpEndAge({
    alphaLeaveAge,
    partialRetirementEnabled,
    partialRetirementStartAge,
    retirementAge,
  });
  const buildUpWindow = createBuildUpWindow({
    buildUpEndAge,
    chartMaxAge,
    dataMinAge: ageExtent[0],
    earliestMilestoneAge: Number.isFinite(earliestVisibleMilestoneAge)
      ? earliestVisibleMilestoneAge
      : undefined,
  });
  const { xDomainMax, xDomainMin } = buildUpWindow;
  const visibleData = useMemo(
    () =>
      createVisibleChartData(
        displayedData,
        buildUpWindow.xDomainMin,
        buildUpWindow.xDomainMax,
        activeMilestoneBoundaries
      ),
    [
      activeMilestoneBoundaries,
      buildUpWindow.xDomainMax,
      buildUpWindow.xDomainMin,
      displayedData,
    ]
  );
  const maxIncome =
    d3.max(
      visibleData,
      (point) =>
        Math.max(point.targetIncomeAnnual, point.totalIncomeAnnual) / divisor
    ) ?? displayedTargetIncomeAnnual / divisor;
  const yMax = Math.max(
    (displayedTargetIncomeAnnual / divisor) * 1.18,
    maxIncome * 1.18,
    10000 / divisor
  );
  const xScale = useMemo(
    () =>
      d3.scaleLinear().domain([xDomainMin, xDomainMax]).range([0, plotWidth]),
    [plotWidth, xDomainMax, xDomainMin]
  );
  const yScale = useMemo(
    () => d3.scaleLinear().domain([0, yMax]).nice().range([plotHeight, 0]),
    [plotHeight, yMax]
  );
  const stack = d3
    .stack<RetirementIncomePoint>()
    .keys(visibleIncomeKeys)
    .value((point, key) => Number(point[key as IncomeKey]) / divisor);
  const stackedSeries = stack(visibleData);
  const area = d3
    .area<d3.SeriesPoint<RetirementIncomePoint>>()
    .x((point) => xScale(point.data.age))
    .y0((point) => yScale(point[0]))
    .y1((point) => yScale(point[1]))
    .curve(d3.curveStepAfter);
  const shortfallArea = d3
    .area<RetirementIncomePoint>()
    .defined((point) => point.age >= retirementAge)
    .x((point) => xScale(point.age))
    .y0((point) =>
      yScale(
        Math.min(point.assessedIncomeAnnual, point.targetIncomeAnnual) / divisor
      )
    )
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
  const invalidMarkerKeys = useMemo(
    () => getInvalidMarkerKeys(validationIssues),
    [validationIssues]
  );
  const hasValidationIssues = validationIssues.length > 0;
  const projectionReady = data.length > 0;
  const milestoneMarkers: MilestoneMarker[] = useMemo(
    () => [
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
      ...(showNuvos
        ? [
            {
              key: "nuvosStartAge" as const,
              label: "Start Nuvos",
              shortLabel: "Start Nuvos",
              age: nuvosStartAge,
              colour: "#b45309",
              editable: true,
            },
          ]
        : []),
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
      showNuvos,
      showSipp,
      showIsa,
      nuvosStartAge,
      sippUseByAge,
      sippUseByAgeEnabled,
      showStatePension,
      sippAccessAge,
      statePensionAge,
      statePensionEditable,
    ]
  );
  const milestoneMarkerLookup = useMemo(
    () => new Map(milestoneMarkers.map((marker) => [marker.key, marker])),
    [milestoneMarkers]
  );
  const displayedMilestoneMarkers = useMemo(
    () =>
      milestoneMarkers.map((marker) => ({
        ...marker,
        age: getDisplayMarkerAge(marker.age, draftMarkerAges[marker.key]),
        layoutAge: draftMarkerAges[marker.key]?.baseAge ?? marker.age,
      })),
    [draftMarkerAges, milestoneMarkers]
  );
  const visibleMilestoneMarkers = useMemo(
    () =>
      displayedMilestoneMarkers.map((marker) => ({
        ...marker,
        plotAge: clampNumber(marker.age, xDomainMin, xDomainMax),
        layoutAge: clampNumber(
          marker.layoutAge ?? marker.age,
          xDomainMin,
          xDomainMax
        ),
      })),
    [displayedMilestoneMarkers, xDomainMax, xDomainMin]
  );
  const markerLayouts = createMarkerLayouts(
    visibleMilestoneMarkers,
    xScale,
    plotHeight
  );
  const draggingMobileMarker =
    activeMarkerDragKey === null
      ? undefined
      : visibleMilestoneMarkers.find(
          (marker) => marker.key === activeMarkerDragKey
        );
  const effectiveSelectedMobileMarkerKey = visibleMilestoneMarkers.some(
    (marker) => marker.key === selectedMobileMarkerKey
  )
    ? selectedMobileMarkerKey
    : visibleMilestoneMarkers[0]?.key;
  const selectedMobileMarker =
    visibleMilestoneMarkers.find(
      (marker) => marker.key === effectiveSelectedMobileMarkerKey
    ) ?? visibleMilestoneMarkers[0];
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
    ]
  );
  const buildUpWidth = Math.max(
    0,
    xScale(clampNumber(retirementAge, xDomainMin, xDomainMax)) -
      xScale(xDomainMin)
  );

  const handleMarkerKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    marker: MilestoneMarker
  ) => {
    if (
      !marker.editable ||
      !["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    const direction =
      event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
    onChangeParameters({
      [marker.key]: snapToLimit(
        marker.age + direction * limits[marker.key].step,
        limits[marker.key]
      ),
    });
  };

  const handleTargetLineKeyDown = (event: KeyboardEvent<SVGPathElement>) => {
    if (
      !["ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight"].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    const direction =
      event.key === "ArrowDown" || event.key === "ArrowLeft" ? -1 : 1;

    onChangeParameters({
      targetIncomeAnnual: snapToLimit(
        displayedTargetIncomeAnnual +
          direction * limits.targetIncomeAnnual.step,
        limits.targetIncomeAnnual
      ),
    });
    setPendingTargetIncomeAnnual(
      snapToLimit(
        displayedTargetIncomeAnnual +
          direction * limits.targetIncomeAnnual.step,
        limits.targetIncomeAnnual
      )
    );
  };

  const getPlotPointerPositionFromClient = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;

      if (!svg) {
        return null;
      }

      const rect = svg.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return null;
      }

      const viewBoxWidth = svg.viewBox.baseVal.width || dimensions.width;
      const viewBoxHeight = svg.viewBox.baseVal.height || dimensions.height;

      return {
        x:
          ((clientX - rect.left) * viewBoxWidth) / rect.width -
          dimensions.marginLeft,
        y:
          ((clientY - rect.top) * viewBoxHeight) / rect.height -
          dimensions.marginTop,
      };
    },
    [
      dimensions.height,
      dimensions.marginLeft,
      dimensions.marginTop,
      dimensions.width,
    ]
  );

  const getPlotPointerPosition = (event: PointerEvent<SVGElement>) =>
    getPlotPointerPositionFromClient(event.clientX, event.clientY);

  const isPrimaryPointerDragStart = (
    event: PointerEvent<SVGElement>
  ): boolean =>
    event.isPrimary &&
    (event.pointerType !== "touch" ||
      event.timeStamp - lastTouchStartTimeRef.current > 1_000) &&
    (event.pointerType !== "mouse" || event.button === 0);

  const getTrackedTouch = (touchList: TouchListLike, identifier: number) => {
    for (let index = 0; index < touchList.length; index += 1) {
      const touch =
        typeof touchList.item === "function"
          ? touchList.item(index)
          : touchList[index];

      if (touch?.identifier === identifier) {
        return touch;
      }
    }

    return null;
  };

  const getFirstChangedTouch = (touchList: TouchListLike) => {
    if (typeof touchList.item === "function") {
      return touchList.item(0);
    }

    return touchList[0] ?? null;
  };

  const getMarkerAgeFromPointer = (
    event: PointerEvent<SVGGElement>,
    markerKey: MilestoneKey
  ) => {
    const pointerPosition = getPlotPointerPosition(event);
    const marker = milestoneMarkerLookup.get(markerKey);

    if (!pointerPosition || !marker) {
      return marker?.age ?? limits[markerKey].min;
    }

    return snapToLimit(
      xScale.invert(clampNumber(pointerPosition.x, 0, plotWidth)),
      limits[markerKey]
    );
  };

  const getMarkerAgeFromClient = useCallback(
    (clientX: number, clientY: number, markerKey: MilestoneKey) => {
      const pointerPosition = getPlotPointerPositionFromClient(
        clientX,
        clientY
      );
      const marker = milestoneMarkerLookup.get(markerKey);

      if (!pointerPosition || !marker) {
        return marker?.age ?? limits[markerKey].min;
      }

      return snapToLimit(
        xScale.invert(clampNumber(pointerPosition.x, 0, plotWidth)),
        limits[markerKey]
      );
    },
    [
      getPlotPointerPositionFromClient,
      limits,
      milestoneMarkerLookup,
      plotWidth,
      xScale,
    ]
  );

  const updateDraftMarkerAge = (
    event: PointerEvent<SVGGElement>,
    markerKey: MilestoneKey
  ) => {
    const marker = milestoneMarkerLookup.get(markerKey);

    if (!marker) {
      return;
    }

    const nextAge = getMarkerAgeFromPointer(event, markerKey);

    setDraftMarkerAges((current) => ({
      ...current,
      [markerKey]: {
        age: nextAge,
        baseAge: current[markerKey]?.baseAge ?? marker.age,
      },
    }));
  };

  const updateDraftMarkerAgeFromClient = useCallback(
    (clientX: number, clientY: number, markerKey: MilestoneKey) => {
      const marker = milestoneMarkerLookup.get(markerKey);

      if (!marker) {
        return;
      }

      const nextAge = getMarkerAgeFromClient(clientX, clientY, markerKey);

      setDraftMarkerAges((current) => ({
        ...current,
        [markerKey]: {
          age: nextAge,
          baseAge: current[markerKey]?.baseAge ?? marker.age,
        },
      }));
    },
    [getMarkerAgeFromClient, milestoneMarkerLookup]
  );

  const clearMarkerDraft = (markerKey: MilestoneKey) => {
    setDraftMarkerAges((current) => {
      const nextDraftMarkerAges = { ...current };
      delete nextDraftMarkerAges[markerKey];
      return nextDraftMarkerAges;
    });
  };

  const handleMarkerPointerDown = (
    event: PointerEvent<SVGGElement>,
    markerKey: MilestoneKey
  ) => {
    const marker = milestoneMarkerLookup.get(markerKey);

    if (!marker?.editable || !isPrimaryPointerDragStart(event)) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    activeMarkerDragPointerIdRef.current = event.pointerId;
    setSelectedMobileMarkerKey(markerKey);
    setActiveMarkerDragKey(markerKey);
    updateDraftMarkerAge(event, markerKey);
  };

  const handleMarkerPointerMove = (
    event: PointerEvent<SVGGElement>,
    markerKey: MilestoneKey
  ) => {
    if (
      activeMarkerDragKey !== markerKey ||
      activeMarkerDragPointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    updateDraftMarkerAge(event, markerKey);
  };

  const handleMarkerTouchStart = (
    event: TouchEvent<SVGGElement>,
    markerKey: MilestoneKey
  ) => {
    const marker = milestoneMarkerLookup.get(markerKey);
    const touch = getFirstChangedTouch(event.changedTouches);

    if (!marker?.editable || !touch) {
      return;
    }

    lastTouchStartTimeRef.current = event.timeStamp;
    event.currentTarget.focus();
    activeMarkerTouchIdentifierRef.current = touch.identifier;
    activeMarkerDragPointerIdRef.current = null;
    setSelectedMobileMarkerKey(markerKey);
    setActiveMarkerDragKey(markerKey);
    updateDraftMarkerAgeFromClient(touch.clientX, touch.clientY, markerKey);
  };

  const handleMarkerTouchMove = (
    event: TouchEvent<SVGGElement>,
    markerKey: MilestoneKey
  ) => {
    if (activeMarkerDragKey !== markerKey) {
      return;
    }

    const identifier = activeMarkerTouchIdentifierRef.current;

    if (identifier === null) {
      return;
    }

    const touch = getTrackedTouch(event.touches, identifier);

    if (!touch) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    updateDraftMarkerAgeFromClient(touch.clientX, touch.clientY, markerKey);
  };

  const finishMarkerTouchDrag = (
    event: TouchEvent<SVGGElement>,
    markerKey: MilestoneKey,
    commit: boolean
  ) => {
    if (activeMarkerDragKey !== markerKey) {
      return;
    }

    const identifier = activeMarkerTouchIdentifierRef.current;

    if (identifier === null) {
      return;
    }

    const touch =
      getTrackedTouch(event.changedTouches, identifier) ??
      getTrackedTouch(event.touches, identifier);

    activeMarkerTouchIdentifierRef.current = null;
    clearMarkerDraft(markerKey);
    setActiveMarkerDragKey(null);

    if (!touch || !commit) {
      return;
    }

    const committedAge = getMarkerAgeFromClient(
      touch.clientX,
      touch.clientY,
      markerKey
    );

    onChangeParameters({ [markerKey]: committedAge });
  };

  const finishMarkerPointerDrag = (
    event: PointerEvent<SVGGElement>,
    markerKey: MilestoneKey,
    commit: boolean
  ) => {
    if (
      activeMarkerDragKey !== markerKey ||
      activeMarkerDragPointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const committedAge = getMarkerAgeFromPointer(event, markerKey);

    activeMarkerDragPointerIdRef.current = null;

    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    clearMarkerDraft(markerKey);
    setActiveMarkerDragKey(null);

    if (commit) {
      onChangeParameters({ [markerKey]: committedAge });
    }
  };

  const getTargetIncomeFromPointer = (event: PointerEvent<SVGPathElement>) => {
    const pointerPosition = getPlotPointerPosition(event);

    if (!pointerPosition) {
      return displayedTargetIncomeAnnual;
    }

    return snapToLimit(
      yScale.invert(clampNumber(pointerPosition.y, 0, plotHeight)) * divisor,
      limits.targetIncomeAnnual
    );
  };

  const updateDraftTargetIncome = (event: PointerEvent<SVGPathElement>) => {
    setDraftTargetIncomeAnnual(getTargetIncomeFromPointer(event));
  };

  const getTargetIncomeFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const pointerPosition = getPlotPointerPositionFromClient(
        clientX,
        clientY
      );

      if (!pointerPosition) {
        return displayedTargetIncomeAnnual;
      }

      return snapToLimit(
        yScale.invert(clampNumber(pointerPosition.y, 0, plotHeight)) * divisor,
        limits.targetIncomeAnnual
      );
    },
    [
      displayedTargetIncomeAnnual,
      divisor,
      getPlotPointerPositionFromClient,
      limits.targetIncomeAnnual,
      plotHeight,
      yScale,
    ]
  );

  const updateDraftTargetIncomeFromClient = useCallback(
    (clientX: number, clientY: number) => {
      setDraftTargetIncomeAnnual(getTargetIncomeFromClient(clientX, clientY));
    },
    [getTargetIncomeFromClient]
  );

  const handleTargetPointerDown = (event: PointerEvent<SVGPathElement>) => {
    if (!isPrimaryPointerDragStart(event)) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    activeTargetDragPointerIdRef.current = event.pointerId;
    setIsTargetDragging(true);
    updateDraftTargetIncome(event);
  };

  const handleTargetPointerMove = (event: PointerEvent<SVGPathElement>) => {
    if (activeTargetDragPointerIdRef.current !== event.pointerId) {
      return;
    }

    updateDraftTargetIncome(event);
  };

  const handleTargetTouchStart = (event: TouchEvent<SVGPathElement>) => {
    const touch = getFirstChangedTouch(event.changedTouches);

    if (!touch) {
      return;
    }

    lastTouchStartTimeRef.current = event.timeStamp;
    event.currentTarget.focus();
    activeTargetTouchIdentifierRef.current = touch.identifier;
    activeTargetDragPointerIdRef.current = null;
    setIsTargetDragging(true);
    updateDraftTargetIncomeFromClient(touch.clientX, touch.clientY);
  };

  const handleTargetTouchMove = (event: TouchEvent<SVGPathElement>) => {
    const identifier = activeTargetTouchIdentifierRef.current;

    if (identifier === null) {
      return;
    }

    const touch = getTrackedTouch(event.touches, identifier);

    if (!touch) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    updateDraftTargetIncomeFromClient(touch.clientX, touch.clientY);
  };

  const finishTargetTouchDrag = (
    event: TouchEvent<SVGPathElement>,
    commit: boolean
  ) => {
    const identifier = activeTargetTouchIdentifierRef.current;

    if (identifier === null) {
      return;
    }

    const touch =
      getTrackedTouch(event.changedTouches, identifier) ??
      getTrackedTouch(event.touches, identifier);

    activeTargetTouchIdentifierRef.current = null;
    setIsTargetDragging(false);
    setDraftTargetIncomeAnnual(null);

    if (!touch || !commit) {
      return;
    }

    const committedValue = getTargetIncomeFromClient(
      touch.clientX,
      touch.clientY
    );

    setPendingTargetIncomeAnnual(committedValue);
    onChangeParameters({ targetIncomeAnnual: committedValue });
  };

  const finishTargetPointerDrag = (
    event: PointerEvent<SVGPathElement>,
    commit: boolean
  ) => {
    if (activeTargetDragPointerIdRef.current !== event.pointerId) {
      return;
    }

    const committedValue = getTargetIncomeFromPointer(event);

    activeTargetDragPointerIdRef.current = null;
    setIsTargetDragging(false);

    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDraftTargetIncomeAnnual(null);

    if (commit) {
      setPendingTargetIncomeAnnual(committedValue);
      onChangeParameters({ targetIncomeAnnual: committedValue });
    }
  };

  useEffect(() => {
    if (activeMarkerDragKey === null) {
      return;
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (activeMarkerDragPointerIdRef.current !== event.pointerId) {
        return;
      }

      updateDraftMarkerAgeFromClient(
        event.clientX,
        event.clientY,
        activeMarkerDragKey
      );
    };

    const finishDrag = (event: globalThis.PointerEvent, commit: boolean) => {
      if (
        activeMarkerDragPointerIdRef.current !== event.pointerId ||
        activeMarkerDragKey === null
      ) {
        return;
      }

      const committedAge = getMarkerAgeFromClient(
        event.clientX,
        event.clientY,
        activeMarkerDragKey
      );

      activeMarkerDragPointerIdRef.current = null;
      clearMarkerDraft(activeMarkerDragKey);
      setActiveMarkerDragKey(null);

      if (commit) {
        onChangeParameters({ [activeMarkerDragKey]: committedAge });
      }
    };

    const handlePointerUp = (event: globalThis.PointerEvent) =>
      finishDrag(event, true);
    const handlePointerCancel = (event: globalThis.PointerEvent) =>
      finishDrag(event, false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [
    activeMarkerDragKey,
    getMarkerAgeFromClient,
    onChangeParameters,
    updateDraftMarkerAgeFromClient,
  ]);

  useEffect(() => {
    if (
      activeMarkerDragKey === null ||
      activeMarkerTouchIdentifierRef.current === null
    ) {
      return;
    }

    const handleTouchMove = (event: globalThis.TouchEvent) => {
      const touch = getTrackedTouch(
        event.touches,
        activeMarkerTouchIdentifierRef.current ?? -1
      );

      if (!touch) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }
      updateDraftMarkerAgeFromClient(
        touch.clientX,
        touch.clientY,
        activeMarkerDragKey
      );
    };

    const finishDrag = (event: globalThis.TouchEvent, commit: boolean) => {
      const identifier = activeMarkerTouchIdentifierRef.current;

      if (identifier === null || activeMarkerDragKey === null) {
        return;
      }

      const touch =
        getTrackedTouch(event.changedTouches, identifier) ??
        getTrackedTouch(event.touches, identifier);

      if (!touch) {
        activeMarkerTouchIdentifierRef.current = null;
        clearMarkerDraft(activeMarkerDragKey);
        setActiveMarkerDragKey(null);
        return;
      }

      const committedAge = getMarkerAgeFromClient(
        touch.clientX,
        touch.clientY,
        activeMarkerDragKey
      );

      activeMarkerTouchIdentifierRef.current = null;
      clearMarkerDraft(activeMarkerDragKey);
      setActiveMarkerDragKey(null);

      if (commit) {
        onChangeParameters({ [activeMarkerDragKey]: committedAge });
      }
    };

    const handleTouchEnd = (event: globalThis.TouchEvent) =>
      finishDrag(event, true);
    const handleTouchCancel = (event: globalThis.TouchEvent) =>
      finishDrag(event, false);

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [
    activeMarkerDragKey,
    getMarkerAgeFromClient,
    onChangeParameters,
    updateDraftMarkerAgeFromClient,
  ]);

  useEffect(() => {
    if (!isTargetDragging) {
      return;
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (activeTargetDragPointerIdRef.current !== event.pointerId) {
        return;
      }

      updateDraftTargetIncomeFromClient(event.clientX, event.clientY);
    };

    const finishDrag = (event: globalThis.PointerEvent, commit: boolean) => {
      if (activeTargetDragPointerIdRef.current !== event.pointerId) {
        return;
      }

      const committedValue = getTargetIncomeFromClient(
        event.clientX,
        event.clientY
      );

      activeTargetDragPointerIdRef.current = null;
      setIsTargetDragging(false);
      setDraftTargetIncomeAnnual(null);

      if (commit) {
        setPendingTargetIncomeAnnual(committedValue);
        onChangeParameters({ targetIncomeAnnual: committedValue });
      }
    };

    const handlePointerUp = (event: globalThis.PointerEvent) =>
      finishDrag(event, true);
    const handlePointerCancel = (event: globalThis.PointerEvent) =>
      finishDrag(event, false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [
    getTargetIncomeFromClient,
    isTargetDragging,
    onChangeParameters,
    updateDraftTargetIncomeFromClient,
  ]);

  useEffect(() => {
    if (!isTargetDragging || activeTargetTouchIdentifierRef.current === null) {
      return;
    }

    const handleTouchMove = (event: globalThis.TouchEvent) => {
      const touch = getTrackedTouch(
        event.touches,
        activeTargetTouchIdentifierRef.current ?? -1
      );

      if (!touch) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }
      updateDraftTargetIncomeFromClient(touch.clientX, touch.clientY);
    };

    const finishDrag = (event: globalThis.TouchEvent, commit: boolean) => {
      const identifier = activeTargetTouchIdentifierRef.current;

      if (identifier === null) {
        return;
      }

      const touch =
        getTrackedTouch(event.changedTouches, identifier) ??
        getTrackedTouch(event.touches, identifier);

      if (!touch) {
        activeTargetTouchIdentifierRef.current = null;
        setIsTargetDragging(false);
        setDraftTargetIncomeAnnual(null);
        return;
      }

      const committedValue = getTargetIncomeFromClient(
        touch.clientX,
        touch.clientY
      );

      activeTargetTouchIdentifierRef.current = null;
      setIsTargetDragging(false);
      setDraftTargetIncomeAnnual(null);

      if (commit) {
        setPendingTargetIncomeAnnual(committedValue);
        onChangeParameters({ targetIncomeAnnual: committedValue });
      }
    };

    const handleTouchEnd = (event: globalThis.TouchEvent) =>
      finishDrag(event, true);
    const handleTouchCancel = (event: globalThis.TouchEvent) =>
      finishDrag(event, false);

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [
    getTargetIncomeFromClient,
    isTargetDragging,
    onChangeParameters,
    updateDraftTargetIncomeFromClient,
  ]);

  return (
    <section
      className={`bridge-chart-panel${hasValidationIssues ? " bridge-chart-panel--invalid" : ""}`}
      aria-labelledby={chartTitleId}
      aria-describedby={chartDescriptionId}
      aria-live="polite"
    >
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

      {!projectionReady || hasValidationIssues ? (
        <div className="bridge-validation-banner" role="alert">
          <strong>
            {projectionReady
              ? "The chart is showing the current assumptions, but some settings need attention."
              : "The chart is showing the current assumptions, but they do not produce a valid projection."}
          </strong>
          <ul>
            {validationIssues.slice(0, 4).map((issue) => (
              <li key={`${issue.field}-${issue.itemId ?? issue.message}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="bridge-mobile-summary" aria-label="Chart summary">
        {mobileBridgeSummary.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <p id={chartDescriptionId} className="visually-hidden">
        Stacked income chart showing ISA, SIPP, partial retirement income,
        Alpha, Nuvos and State Pension income against the target retirement
        income over age.
      </p>

      <div className="bridge-chart-shell" ref={shellRef}>
        <svg
          ref={svgRef}
          className="bridge-chart-svg"
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          focusable="false"
          onContextMenu={(event) => event.preventDefault()}
        >
          <defs>
            <pattern
              id="shortfall-hatch"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke="#bf2c2c"
                strokeWidth="2"
              />
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
                <stop
                  offset="0%"
                  stopColor={sourceMeta[key].colour}
                  stopOpacity="0.9"
                />
                <stop
                  offset="100%"
                  stopColor={sourceMeta[key].colour}
                  stopOpacity="0.68"
                />
              </linearGradient>
            ))}
          </defs>

          <g
            transform={`translate(${dimensions.marginLeft},${dimensions.marginTop})`}
          >
            {buildUpWidth > 0 ? (
              <rect
                x={0}
                y={0}
                width={buildUpWidth}
                height={plotHeight}
                className="bridge-build-up-band"
              />
            ) : null}

            {yTicks.map((tick) => (
              <g key={tick} className="bridge-gridline">
                <line
                  x1={0}
                  x2={plotWidth}
                  y1={yScale(tick)}
                  y2={yScale(tick)}
                />
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
              d={shortfallArea(visibleData) ?? undefined}
              className="bridge-shortfall-fill"
            />
            <path
              d={shortfallArea(visibleData) ?? undefined}
              fill="url(#shortfall-hatch)"
              opacity="0.55"
            />

            <path
              className="bridge-target-line"
              d={targetLine(visibleData) ?? undefined}
            />
            <path
              className="bridge-target-line-hitbox"
              d={targetLine(visibleData) ?? undefined}
              role="slider"
              tabIndex={0}
              aria-label="Target income line"
              aria-valuemin={limits.targetIncomeAnnual.min / divisor}
              aria-valuemax={limits.targetIncomeAnnual.max / divisor}
              aria-valuenow={displayedTargetIncomeAnnual / divisor}
              onKeyDown={handleTargetLineKeyDown}
              onPointerDown={handleTargetPointerDown}
              onPointerMove={handleTargetPointerMove}
              onPointerUp={(event) => finishTargetPointerDrag(event, true)}
              onPointerCancel={(event) => finishTargetPointerDrag(event, false)}
              onTouchStart={handleTargetTouchStart}
              onTouchMove={handleTargetTouchMove}
              onTouchEnd={(event) => finishTargetTouchDrag(event, true)}
              onTouchCancel={(event) => finishTargetTouchDrag(event, false)}
            />

            {markerLayouts.map((marker) => {
              const x = xScale(marker.plotAge);
              const handleLabel = getMarkerHandleLabel(marker);

              return (
                <g
                  key={marker.key}
                  className={[
                    "bridge-milestone",
                    marker.editable ? "bridge-milestone--editable" : "",
                    invalidMarkerKeys.has(marker.key)
                      ? "bridge-milestone--invalid"
                      : "",
                    marker.key === effectiveSelectedMobileMarkerKey
                      ? "bridge-milestone--selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role={marker.editable ? "slider" : "img"}
                  tabIndex={0}
                  aria-label={`${marker.label}, age ${formatAgeValue(marker.age)}`}
                  aria-valuemin={limits[marker.key].min}
                  aria-valuemax={limits[marker.key].max}
                  aria-valuenow={marker.age}
                  onKeyDown={(event) => handleMarkerKeyDown(event, marker)}
                  onPointerDown={(event) =>
                    handleMarkerPointerDown(event, marker.key)
                  }
                  onPointerMove={(event) =>
                    handleMarkerPointerMove(event, marker.key)
                  }
                  onPointerUp={(event) =>
                    finishMarkerPointerDrag(event, marker.key, true)
                  }
                  onPointerCancel={(event) =>
                    finishMarkerPointerDrag(event, marker.key, false)
                  }
                  onTouchStart={(event) =>
                    handleMarkerTouchStart(event, marker.key)
                  }
                  onTouchMove={(event) =>
                    handleMarkerTouchMove(event, marker.key)
                  }
                  onTouchEnd={(event) =>
                    finishMarkerTouchDrag(event, marker.key, true)
                  }
                  onTouchCancel={(event) =>
                    finishMarkerTouchDrag(event, marker.key, false)
                  }
                >
                  <rect
                    x={x - 22}
                    y={marker.handleY - HANDLE_LABEL_HEIGHT / 2 - 10}
                    width={44}
                    height={HANDLE_LABEL_HEIGHT + 20}
                    fill="transparent"
                    aria-hidden="true"
                  />
                  <line
                    x1={x}
                    x2={x}
                    y1={marker.handleY + HANDLE_LABEL_HEIGHT / 2}
                    y2={plotHeight}
                    stroke={marker.colour}
                  />
                  <rect
                    x={x - HANDLE_LABEL_WIDTH / 2}
                    y={marker.handleY - HANDLE_LABEL_HEIGHT / 2}
                    width={HANDLE_LABEL_WIDTH}
                    height={HANDLE_LABEL_HEIGHT}
                    rx={HANDLE_LABEL_WIDTH / 2}
                    className="bridge-milestone-handle"
                    fill={marker.colour}
                  />
                  <text
                    x={x}
                    y={marker.handleY}
                    className="bridge-milestone-handle-label"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    transform={`rotate(90 ${x} ${marker.handleY})`}
                  >
                    {handleLabel}
                  </text>
                </g>
              );
            })}

            <line
              className="bridge-axis"
              x1={0}
              x2={plotWidth}
              y1={plotHeight}
              y2={plotHeight}
            />
            <line
              className="bridge-axis"
              x1={0}
              x2={0}
              y1={0}
              y2={plotHeight}
            />
            {xTicks.map((tick) => (
              <g key={tick} className="bridge-x-tick">
                <line
                  x1={xScale(tick)}
                  x2={xScale(tick)}
                  y1={plotHeight}
                  y2={plotHeight + 6}
                />
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
                transform={`translate(${xScale(draggingMobileMarker.plotAge)},${plotHeight + 18})`}
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

        <div
          className="bridge-legend bridge-legend--overlay"
          aria-label="Income sources"
        >
          <span>
            <span className="bridge-build-up-key" />
            {BUILD_UP_META.label}
          </span>
          {legendIncomeKeys.map((key) => {
            const label =
              key === "alphaIncomeAnnual" ? alphaLabel : sourceMeta[key].label;
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
              {visibleMilestoneMarkers.map((marker) => (
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
                    limits[selectedMobileMarker.key]
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
                  limits[selectedMobileMarker.key]
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
          onChange={(value) =>
            onChangeParameters({ alphaMonthlyAddedPension: value })
          }
        />
        {showIsa ? (
          <BridgeMetricControl
            label="ISA contribution"
            value={isaMonthlyContribution}
            suffix="/ month"
            limit={limits.isaMonthlyContribution}
            colour="#155ea8"
            onChange={(value) =>
              onChangeParameters({ isaMonthlyContribution: value })
            }
          />
        ) : null}
        {showSipp ? (
          <BridgeMetricControl
            label="SIPP contribution"
            value={sippMonthlyContribution}
            suffix="/ month"
            limit={limits.sippMonthlyContribution}
            colour="#0d6b40"
            onChange={(value) =>
              onChangeParameters({ sippMonthlyContribution: value })
            }
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
            onChange={(value) =>
              onChangeParameters({ partialRetirementWorkPercent: value })
            }
          />
        ) : null}
        <BridgeMetricControl
          label="Target income"
          value={
            displayMode === "monthly"
              ? targetIncomeAnnual / 12
              : targetIncomeAnnual
          }
          suffix={displayMode === "monthly" ? "/ month" : "/ year"}
          limit={getTargetIncomeControlLimit(
            limits.targetIncomeAnnual,
            displayMode
          )}
          colour="#0b3c5d"
          onChange={(value) =>
            onChangeParameters({
              targetIncomeAnnual:
                displayMode === "monthly" ? value * 12 : value,
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
    <div
      className="bridge-control-card"
      style={{ "--control-colour": colour } as React.CSSProperties}
    >
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
    </div>
  );
}

function createVisibleChartData(
  data: RetirementIncomePoint[],
  minAge: number,
  maxAge: number,
  milestoneBoundaries: Array<{ age: number; key: MilestoneKey }>
) {
  if (data.length === 0) {
    return [];
  }

  const visiblePoints = data.filter(
    (point) => point.age >= minAge && point.age <= maxAge
  );
  const startPoint = createChartBoundaryPoint(data, minAge);
  const endPoint = createChartBoundaryPoint(data, maxAge);
  const nextData = [...visiblePoints];
  const visibleMilestoneBoundaries = milestoneBoundaries.filter(
    (boundary) => boundary.age >= minAge && boundary.age <= maxAge
  );

  visibleMilestoneBoundaries.forEach((boundary) => {
    const boundaryPoint = createMilestoneBoundaryPoint(data, boundary);
    const existingPointIndex = nextData.findIndex((point) =>
      areAgesEquivalent(point.age, boundary.age)
    );

    if (existingPointIndex === -1) {
      nextData.push(boundaryPoint);
      return;
    }

    nextData[existingPointIndex] = boundaryPoint;
  });

  if (!nextData.some((point) => areAgesEquivalent(point.age, minAge))) {
    nextData.unshift(startPoint);
  }

  if (
    !areAgesEquivalent(minAge, maxAge) &&
    !nextData.some((point) => areAgesEquivalent(point.age, maxAge))
  ) {
    nextData.push(endPoint);
  }

  return nextData.sort((first, second) => first.age - second.age);
}

function createActiveMilestoneAges({
  alphaLeaveAge,
  alphaStartAge,
  isaAccessAge,
  isaUseByAge,
  isaUseByAgeEnabled,
  nuvosStartAge,
  partialRetirementEnabled,
  partialRetirementStartAge,
  retirementAge,
  showNuvos,
  showIsa,
  showSipp,
  showStatePension,
  sippAccessAge,
  sippUseByAge,
  sippUseByAgeEnabled,
  statePensionAge,
}: Pick<
  RetirementIncomeBridgeParameters,
  | "alphaLeaveAge"
  | "alphaStartAge"
  | "isaAccessAge"
  | "isaUseByAge"
  | "isaUseByAgeEnabled"
  | "nuvosStartAge"
  | "partialRetirementEnabled"
  | "partialRetirementStartAge"
  | "retirementAge"
  | "showNuvos"
  | "showIsa"
  | "showSipp"
  | "showStatePension"
  | "sippAccessAge"
  | "sippUseByAge"
  | "sippUseByAgeEnabled"
  | "statePensionAge"
>) {
  return [
    retirementAge,
    alphaLeaveAge,
    showSipp ? sippAccessAge : null,
    showSipp && sippUseByAgeEnabled ? sippUseByAge : null,
    showIsa ? isaAccessAge : null,
    showIsa && isaUseByAgeEnabled ? isaUseByAge : null,
    partialRetirementEnabled ? partialRetirementStartAge : null,
    alphaStartAge,
    showNuvos ? nuvosStartAge : null,
    showStatePension ? statePensionAge : null,
  ];
}

function createActiveMilestoneBoundaries(
  input: Pick<
    RetirementIncomeBridgeParameters,
    | "alphaLeaveAge"
    | "alphaStartAge"
    | "isaAccessAge"
    | "isaUseByAge"
    | "isaUseByAgeEnabled"
    | "nuvosStartAge"
    | "partialRetirementEnabled"
    | "partialRetirementStartAge"
    | "retirementAge"
    | "showNuvos"
    | "showIsa"
    | "showSipp"
    | "showStatePension"
    | "sippAccessAge"
    | "sippUseByAge"
    | "sippUseByAgeEnabled"
    | "statePensionAge"
  >
) {
  const {
    alphaLeaveAge,
    alphaStartAge,
    isaAccessAge,
    isaUseByAge,
    isaUseByAgeEnabled,
    nuvosStartAge,
    partialRetirementEnabled,
    partialRetirementStartAge,
    retirementAge,
    showNuvos,
    showIsa,
    showSipp,
    showStatePension,
    sippAccessAge,
    sippUseByAge,
    sippUseByAgeEnabled,
    statePensionAge,
  } = input;

  return [
    { key: "retirementAge" as const, age: retirementAge },
    { key: "alphaLeaveAge" as const, age: alphaLeaveAge },
    ...(showSipp
      ? [{ key: "sippAccessAge" as const, age: sippAccessAge }]
      : []),
    ...(showSipp && sippUseByAgeEnabled
      ? [{ key: "sippUseByAge" as const, age: sippUseByAge }]
      : []),
    ...(showIsa ? [{ key: "isaAccessAge" as const, age: isaAccessAge }] : []),
    ...(showIsa && isaUseByAgeEnabled
      ? [{ key: "isaUseByAge" as const, age: isaUseByAge }]
      : []),
    ...(partialRetirementEnabled
      ? [
          {
            key: "partialRetirementStartAge" as const,
            age: partialRetirementStartAge,
          },
        ]
      : []),
    { key: "alphaStartAge" as const, age: alphaStartAge },
    ...(showNuvos
      ? [{ key: "nuvosStartAge" as const, age: nuvosStartAge }]
      : []),
    ...(showStatePension
      ? [{ key: "statePensionAge" as const, age: statePensionAge }]
      : []),
  ];
}

function createChartMaxAge({
  dataMaxAge,
  fallbackMaxAge,
  milestoneAges,
}: {
  dataMaxAge: number | undefined;
  fallbackMaxAge: number;
  milestoneAges: Array<number | null>;
}) {
  return Math.ceil(
    Math.max(dataMaxAge ?? fallbackMaxAge, ...filterFiniteAges(milestoneAges))
  );
}

function filterFiniteAges(ages: Array<number | null>) {
  return ages.filter(
    (age): age is number => age !== null && Number.isFinite(age)
  );
}

function createBuildUpWindow({
  buildUpEndAge,
  chartMaxAge,
  dataMinAge,
  earliestMilestoneAge,
}: {
  buildUpEndAge: number;
  chartMaxAge: number;
  dataMinAge: number | undefined;
  earliestMilestoneAge: number | undefined;
}) {
  const defaultVisibleMinAge = Math.max(
    dataMinAge ?? buildUpEndAge - DEFAULT_BUILD_UP_WINDOW_YEARS,
    buildUpEndAge - DEFAULT_BUILD_UP_WINDOW_YEARS
  );
  const xDomainMin = Math.min(
    earliestMilestoneAge ?? defaultVisibleMinAge,
    defaultVisibleMinAge,
    chartMaxAge - 1
  );
  const xDomainMax = Math.max(chartMaxAge, xDomainMin + 1);

  return {
    xDomainMax,
    xDomainMin,
  };
}

function createBuildUpEndAge({
  alphaLeaveAge,
  partialRetirementEnabled,
  partialRetirementStartAge,
  retirementAge,
}: Pick<
  RetirementIncomeBridgeParameters,
  | "alphaLeaveAge"
  | "partialRetirementEnabled"
  | "partialRetirementStartAge"
  | "retirementAge"
>) {
  return Math.min(
    retirementAge,
    alphaLeaveAge,
    partialRetirementEnabled ? partialRetirementStartAge : retirementAge
  );
}

function createChartBoundaryPoint(data: RetirementIncomePoint[], age: number) {
  const previousPoint = findPreviousChartPoint(data, age);
  const nextPoint = data.find((point) => point.age >= age);

  return {
    ...(previousPoint ?? nextPoint ?? data[0]),
    age,
  };
}

function createMilestoneBoundaryPoint(
  data: RetirementIncomePoint[],
  boundary: { age: number; key: MilestoneKey }
) {
  const { age } = boundary;
  const fallbackNextPoint = data.find((point) => point.age > age);
  const nextPoint =
    findBoundaryTransitionPoint(data, boundary) ??
    fallbackNextPoint ??
    data.find((point) => point.age >= age);
  const previousPoint = findPreviousChartPoint(data, age);

  return {
    ...(nextPoint ?? previousPoint ?? data[0]),
    age,
  };
}

function findBoundaryTransitionPoint(
  data: RetirementIncomePoint[],
  boundary: { age: number; key: MilestoneKey }
) {
  const matcher = getMilestoneTransitionMatcher(boundary.key);

  if (!matcher) {
    return undefined;
  }

  return data.find((point) => point.age > boundary.age && matcher(point));
}

function getMilestoneTransitionMatcher(key: MilestoneKey) {
  if (key === "isaAccessAge") {
    return (point: RetirementIncomePoint) => point.isaIncomeAnnual > 0;
  }

  if (key === "isaUseByAge") {
    return (point: RetirementIncomePoint) => point.isaIncomeAnnual <= 0;
  }

  if (key === "sippAccessAge") {
    return (point: RetirementIncomePoint) => point.sippIncomeAnnual > 0;
  }

  if (key === "sippUseByAge") {
    return (point: RetirementIncomePoint) => point.sippIncomeAnnual <= 0;
  }

  if (key === "alphaStartAge") {
    return (point: RetirementIncomePoint) => point.alphaIncomeAnnual > 0;
  }

  if (key === "nuvosStartAge") {
    return (point: RetirementIncomePoint) => point.nuvosIncomeAnnual > 0;
  }

  if (key === "statePensionAge") {
    return (point: RetirementIncomePoint) => point.statePensionIncomeAnnual > 0;
  }

  if (key === "partialRetirementStartAge") {
    return (point: RetirementIncomePoint) =>
      point.partialRetirementIncomeAnnual > 0;
  }

  return undefined;
}

function findPreviousChartPoint(data: RetirementIncomePoint[], age: number) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const point = data[index];

    if (point && point.age <= age) {
      return point;
    }
  }

  return undefined;
}

function createMarkerLayouts<
  T extends MilestoneMarker & { layoutAge?: number },
>(markers: T[], xScale: d3.ScaleLinear<number, number>, plotHeight: number) {
  const rowByKey = new Map<MilestoneKey, number>();
  const minimumGap = HANDLE_LABEL_WIDTH + 6;
  const rowRightEdges: number[] = [];

  [...markers]
    .sort(
      (first, second) =>
        xScale(first.layoutAge ?? first.age) -
        xScale(second.layoutAge ?? second.age)
    )
    .forEach((marker) => {
      const markerX = xScale(marker.layoutAge ?? marker.age);
      const row = rowRightEdges.findIndex(
        (rightEdge) => markerX - rightEdge >= minimumGap
      );
      const nextRow = row === -1 ? rowRightEdges.length : row;

      rowRightEdges[nextRow] = markerX;
      rowByKey.set(marker.key, nextRow);
    });

  const maxRow = Math.max(0, ...rowByKey.values());
  const availableStackSpace = Math.max(0, plotHeight - HANDLE_LABEL_HEIGHT);
  const rowSpacing =
    maxRow === 0
      ? HANDLE_LABEL_STACK_SPACING
      : Math.min(HANDLE_LABEL_STACK_SPACING, availableStackSpace / maxRow);

  return markers.map((marker) => {
    const row = rowByKey.get(marker.key) ?? 0;
    const handleY = HANDLE_LABEL_HEIGHT / 2 + row * rowSpacing;

    return {
      ...marker,
      handleY,
    };
  });
}

function getTargetIncomeControlLimit(
  limit: NumberLimit,
  displayMode: "annual" | "monthly"
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

function getInvalidMarkerKeys(validationIssues: PensionValidationIssue[]) {
  const markerKeys = new Set<MilestoneKey>();

  for (const issue of validationIssues) {
    if (issue.field === "requirementAge") {
      markerKeys.add("retirementAge");
    }

    if (issue.field === "alphaPensionLeaveAge") {
      markerKeys.add("alphaLeaveAge");
    }

    if (issue.field === "alphaPensionDrawAge") {
      markerKeys.add("alphaStartAge");
    }

    if (issue.field === "sippDrawAge") {
      markerKeys.add("sippAccessAge");
    }

    if (issue.field === "sippWithdrawalTargetAge") {
      markerKeys.add("sippUseByAge");
    }

    if (issue.field === "isaDrawAge") {
      markerKeys.add("isaAccessAge");
    }

    if (issue.field === "isaWithdrawalTargetAge") {
      markerKeys.add("isaUseByAge");
    }

    if (issue.field === "partialRetirementStartAge") {
      markerKeys.add("partialRetirementStartAge");
    }

    if (issue.field === "statePensionDrawDate") {
      markerKeys.add("statePensionAge");
    }
  }

  return markerKeys;
}

function getMarkerHandleLabel(marker: MilestoneMarker) {
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
    (point) => point.age >= retirementAge && point.shortfallAnnual > 0
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
        showStatePension ? statePensionAge : alphaStartAge
      )}`,
    },
  ];
}

function isIncomeSourceEnabled(
  key: IncomeKey,
  state: Pick<
    RetirementIncomeBridgeParameters,
    | "partialRetirementEnabled"
    | "showIsa"
    | "showNuvos"
    | "showSipp"
    | "showStatePension"
  >
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
  enabled: boolean
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
  draftAge: { age: number; baseAge: number } | undefined
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
