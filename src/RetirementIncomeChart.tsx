import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type TouchEvent,
} from "react";
import * as d3 from "d3";
import { trackAnalyticsEvent } from "./analytics";
import {
  formatModelAge,
  formatModelAgeCompact,
  type PensionValidationIssue,
  type SpendingSmileStrategy,
} from "./settings";
import {
  MAX_SPENDING_SMILE_PERCENTAGE,
  MIN_SPENDING_SMILE_PERCENTAGE,
  getSpendingSmilePercentageField,
  updateSpendingSmilePercentage,
  type SmilePercentageField,
} from "./spending-smile";
import { clampNumber, snapToLimit } from "./app/chart-drag-constraints";
import type { ResidualFlexibleFundInsight } from "./result-projection/flexible-withdrawals";
import { RETIREMENT_CHART_OVERLAY_META } from "./app-domains/retirement-chart-overlays";
import { selectRetirementChartLegendKeys } from "./app-domains/retirement-chart-legend";
import { createRetirementIncomeMilestones } from "./result-projection/retirement-income-chart-controls";
import {
  RetirementIncomeChartDescription,
  RetirementIncomeChartHeading,
} from "./app/retirement-income-chart-heading";
import {
  createSurplusSummaryPoints,
  FlexibleSurplusLegend,
  SurplusTextEquivalent,
} from "./app/retirement-income-chart-accessibility";
import {
  createFlexibleAccountWarnings,
  RetirementIncomeControlGrid,
} from "./app/retirement-income-chart-controls";
import { RetirementIncomeMobileNavigation } from "./app/retirement-income-chart-mobile-navigation";
import { RetirementIncomeChartPeriodDetails } from "./app/retirement-income-chart-period-details";
import {
  getRetirementIncomeChartPresentation,
  type RetirementIncomeChartInteractionMode,
} from "./app-domains/retirement-income-chart-presentation";

export { getRetirementIncomeChartTitle } from "./app/retirement-income-chart-heading";
import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomeChartEditableMilestone,
  RetirementIncomeChartEvent,
  RetirementIncomeChartStaticMilestone,
  RetirementIncomeChartSeriesDefinition,
  RetirementIncomeMilestone,
  RetirementIncomeMilestoneKey,
  RetirementIncomePoint,
  VisibleRetirementIncomeMilestone,
} from "./result-projection/retirement-income-chart-model";
import {
  bringActiveMarkerToFront,
  createActiveMilestoneAges,
  createActiveMilestoneBoundaries,
  createBuildUpEndAge,
  createBuildUpWindow,
  createChartIncomeSeriesDefinitions,
  createChartMaxAge,
  createMarkerLayouts,
  createPersonAgeAxisTicks,
  createStackedIncomeSeries,
  createVisibleChartData,
  createWholeYearTicks,
  filterFiniteAges,
  getChartIncomeGradientId,
  getChartIncomeValue,
  getInvalidMarkerKeys,
  getRetirementIncomeEventsForDate,
  getMarkerHandleLabel,
  HANDLE_LABEL_HEIGHT,
  HANDLE_LABEL_WIDTH,
  hasActiveIncome,
  incomeKeys,
  isRetirementIncomeSourceEnabled,
} from "./result-projection/retirement-income-chart-layout";

export type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomePoint,
} from "./result-projection/retirement-income-chart-model";

type RetirementIncomeChartCommonProps = RetirementIncomeChartParameters & {
  data: RetirementIncomePoint[];
  alphaLabel?: string;
  /** Gives a reused chart an accurate accessible explanation of its data. */
  chartDescription?: string;
  /** Optional visible title for a reused chart presentation. */
  chartTitle?: string;
  /** Optional text equivalent for representative semantic chart values. */
  chartDataAccessibilitySummary?: string;
  hideInactiveLegendItems?: boolean;
  showFlexibleWithdrawalInsights?: boolean;
  /** Uses each projected row's target without applying the single-target editor. */
  useDataTargets?: boolean;
  /** Controls whether the chart's milestone markers are shown. */
  showMilestoneMarkers?: boolean;
  /** Selects the x-axis semantics for a shared household timeline. */
  timelineMode?: "age" | "calendar";
  /** Optional owner-attributed series for a derived household chart. */
  seriesDefinitions?: RetirementIncomeChartSeriesDefinition[];
  /** Semantic household events exposed through period inspection. */
  periodEvents?: RetirementIncomeChartEvent[];
  /** Read-only milestones shown using the shared chart marker styling. */
  staticMilestones?: RetirementIncomeChartStaticMilestone[];
  /** Owner-aware editable milestones projected onto a household timeline. */
  editableMilestones?: RetirementIncomeChartEditableMilestone[];
  /** Suppress the personal shortfall overlay when the target is shared. */
  showShortfallOverlay?: boolean;
  /** Controls the standard single-person contribution controls below the plot. */
  showParameterControls?: boolean;
  /** Reuses the chart's control area for household-specific shared controls. */
  additionalParameterControls?: ReactNode;
  /** Called when a target segment is edited, with the displayed age/timeline. */
  onChangeTargetIncome?: (value: number, age?: number) => void;
  presentation?: "standard" | "simple";
  residualFlexibleFundInsights?: ResidualFlexibleFundInsight[];
  limits: RetirementIncomeChartLimits;
  statePensionEditable?: boolean;
  validationIssues?: PensionValidationIssue[];
};

export type RetirementIncomeChartProps = RetirementIncomeChartCommonProps & {
  interactionMode?: Extract<
    RetirementIncomeChartInteractionMode,
    "editable-person" | "editable-household"
  >;
  readOnly?: false;
  onChangeParameters: (patch: Partial<RetirementIncomeChartParameters>) => void;
  onChangeEditableMilestone?: (key: string, timelineValue: number) => void;
};

export type RetirementIncomeChartReadOnlyProps =
  RetirementIncomeChartCommonProps & {
    interactionMode: Extract<
      RetirementIncomeChartInteractionMode,
      "readonly-household"
    >;
    readOnly: true;
    onChangeParameters?: never;
    onChangeEditableMilestone?: (key: string, timelineValue: number) => void;
  };

type RetirementIncomeChartComponentProps =
  RetirementIncomeChartProps | RetirementIncomeChartReadOnlyProps;

type MilestoneKey = RetirementIncomeMilestoneKey;
type MilestoneMarker = RetirementIncomeMilestone;
type VisibleMilestoneMarker = VisibleRetirementIncomeMilestone;

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
const DRAG_AGE_LABEL_WIDTH = 58;
const DRAG_AGE_LABEL_HEIGHT = 19;
const TARGET_INCOME_Y_AXIS_HEADROOM_PERCENT = 0.18;
const TARGET_INCOME_Y_AXIS_MIN_HEADROOM_ANNUAL = 5000;
const MARKER_DRAG_LEFT_OVERSCAN_RATIO = 0.4;
const CALENDAR_AXIS_HEIGHT = 530;
const CALENDAR_AXIS_HEIGHT_COMPACT = 510;
const CALENDAR_AXIS_MARGIN_BOTTOM = 122;
const CALENDAR_AXIS_MARGIN_BOTTOM_COMPACT = 116;
const spendingSmilePhaseMeta = [
  {
    key: "goGo",
    label: "Go-go",
    percentageField: "goGoPercentage",
  },
  {
    key: "slowGo",
    label: "Slow-go",
    percentageField: "slowGoPercentage",
  },
  {
    key: "noGo",
    label: "No-go",
    percentageField: "noGoPercentage",
  },
] as const satisfies readonly {
  key: SpendingSmilePhaseKey;
  label: string;
  percentageField: SmilePercentageField;
}[];

type SpendingSmilePhaseKey = "goGo" | "slowGo" | "noGo";

type PendingSpendingSmile = {
  strategy: SpendingSmileStrategy;
  sourceData: RetirementIncomePoint[];
  sourceStrategy: SpendingSmileStrategy;
};

// eslint-disable-next-line sonarjs/cyclomatic-complexity, sonarjs/cognitive-complexity
export function RetirementIncomeChart({
  data,
  targetIncomeAnnual,
  spendingSmileEnabled,
  goGoPercentage,
  slowGoStartAge,
  slowGoPercentage,
  noGoStartAge,
  noGoPercentage,
  alphaMonthlyAddedPension,
  isaMonthlyContribution,
  lisaMonthlyContribution,
  sippMonthlyContribution,
  retirementAge,
  alphaLeaveAge,
  sippAccessAge,
  sippUseByAge,
  isaAccessAge,
  lisaAccessAge,
  alphaStartAge,
  nuvosStartAge,
  premiumStartAge,
  isaUseByAge,
  lisaUseByAge,
  partialRetirementStartAge,
  partialRetirementWorkPercent,
  partialRetirementEnabled,
  statePensionAge,
  showAlpha,
  showClassic,
  showClassicPlus,
  showCsAvc,
  showIsa,
  showLisa,
  showSipp,
  sippUseByAgeEnabled,
  showNuvos,
  showPremium,
  isaUseByAgeEnabled,
  lisaUseByAgeEnabled,
  showStatePension,
  alphaLabel = "Alpha pension",
  chartDescription,
  chartTitle,
  chartDataAccessibilitySummary,
  hideInactiveLegendItems = false,
  showFlexibleWithdrawalInsights = false,
  interactionMode = "editable-person",
  useDataTargets = false,
  showMilestoneMarkers = true,
  timelineMode = "age",
  seriesDefinitions,
  periodEvents = [],
  staticMilestones = [],
  editableMilestones = [],
  showShortfallOverlay = true,
  showParameterControls = true,
  additionalParameterControls,
  onChangeTargetIncome,
  presentation = "standard",
  residualFlexibleFundInsights = [],
  limits,
  statePensionEditable = false,
  validationIssues = [],
  onChangeParameters,
  onChangeEditableMilestone,
}: RetirementIncomeChartComponentProps) {
  const commitParameters = useCallback(
    (patch: Partial<RetirementIncomeChartParameters>) => {
      onChangeParameters?.(patch);
    },
    [onChangeParameters]
  );
  const isSimplePresentation = presentation === "simple";
  const interactionPresentation =
    getRetirementIncomeChartPresentation(interactionMode);
  const isStaticPresentation = isStaticChartPresentation(
    isSimplePresentation,
    interactionPresentation.readOnly
  );
  const isCalendarTimeline = timelineMode === "calendar";
  const shellRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const targetLineHitboxRef = useRef<SVGPathElement | null>(null);
  const activeMarkerDragPointerIdRef = useRef<number | null>(null);
  const activeEditableMilestonePointerIdRef = useRef<number | null>(null);
  const activeMarkerDragScaleRef = useRef<d3.ScaleLinear<
    number,
    number
  > | null>(null);
  const activeTargetDragPointerIdRef = useRef<number | null>(null);
  const activeSmileDragPointerIdRef = useRef<number | null>(null);
  const activeSmileDragPhaseRef = useRef<SpendingSmilePhaseKey | null>(null);
  const activeMarkerTouchIdentifierRef = useRef<number | null>(null);
  const activeTargetTouchIdentifierRef = useRef<number | null>(null);
  const lastTouchStartTimeRef = useRef<number>(0);
  const [width, setWidth] = useState(960);
  const [displayMode, setDisplayMode] = useState<"annual" | "monthly">(
    isSimplePresentation ? "monthly" : "annual"
  );
  const [draftTargetIncomeAnnual, setDraftTargetIncomeAnnual] = useState<
    number | null
  >(null);
  const [isTargetDragging, setIsTargetDragging] = useState(false);
  const [pendingTargetIncomeAnnual, setPendingTargetIncomeAnnual] = useState<
    number | null
  >(null);
  const [draftSpendingSmile, setDraftSpendingSmile] =
    useState<SpendingSmileStrategy | null>(null);
  const [pendingSpendingSmile, setPendingSpendingSmile] =
    useState<PendingSpendingSmile | null>(null);
  const [draftMarkerAges, setDraftMarkerAges] = useState<
    Partial<Record<MilestoneKey, { age: number; baseAge: number }>>
  >({});
  const [activeMarkerDragKey, setActiveMarkerDragKey] =
    useState<MilestoneKey | null>(null);
  const [activeEditableMilestoneKey, setActiveEditableMilestoneKey] = useState<
    string | null
  >(null);
  const [editableMilestoneDrafts, setEditableMilestoneDrafts] = useState<
    Record<string, number>
  >({});
  const [selectedMobileMarkerKey, setSelectedMobileMarkerKey] =
    useState<MilestoneKey>("retirementAge");
  const [isMobileNavigationVisible, setIsMobileNavigationVisible] =
    useState(false);
  const [inspectedPointDate, setInspectedPointDate] = useState<string | null>(
    null
  );
  const dataSourceTargetIncomeAnnual =
    data.find((point) => point.targetIncomeAnnual > 0)?.targetIncomeAnnual ??
    targetIncomeAnnual;
  const displayedTargetIncomeAnnual =
    draftTargetIncomeAnnual ??
    (pendingTargetIncomeAnnual !== null &&
    Math.abs(dataSourceTargetIncomeAnnual - pendingTargetIncomeAnnual) >= 0.001
      ? pendingTargetIncomeAnnual
      : targetIncomeAnnual);
  const spendingSmile = useMemo<SpendingSmileStrategy>(
    () => ({
      goGoPercentage,
      slowGoStartAge,
      slowGoPercentage,
      noGoStartAge,
      noGoPercentage,
    }),
    [
      goGoPercentage,
      noGoPercentage,
      noGoStartAge,
      slowGoPercentage,
      slowGoStartAge,
    ]
  );
  const resolvedSpendingSmile = resolveDisplayedSpendingSmile({
    data,
    draft: draftSpendingSmile,
    pending: pendingSpendingSmile,
    strategy: spendingSmile,
  });
  const displayedSpendingSmile = applySpendingSmileMarkerDrafts(
    resolvedSpendingSmile,
    draftMarkerAges
  );
  const dataSourceSpendingSmile = resolveDataSourceSpendingSmile({
    data,
    pending: pendingSpendingSmile,
    strategy: spendingSmile,
  });
  const divisor = displayMode === "monthly" ? 12 : 1;
  const valueLabel =
    displayMode === "monthly" ? "Monthly income" : "Annual income";
  const axisTargetLabel = formatCurrency(displayedTargetIncomeAnnual / divisor);
  const axisTitle = createRetirementIncomeAxisTitle(
    valueLabel,
    axisTargetLabel,
    isSimplePresentation
  );
  const chartTitleId = "retirement-income-chart-title";
  const chartDescriptionId = "retirement-income-chart-description";
  const chartDataDescriptionId = "retirement-income-chart-data-description";
  const displayedData = useMemo(
    () =>
      useDataTargets
        ? data
        : createDisplayedTargetData({
            data,
            dataSourceTargetIncomeAnnual,
            displayedSpendingSmile,
            displayedTargetIncomeAnnual,
            retirementAge,
            dataSourceSpendingSmile,
            spendingSmileEnabled,
          }),
    [
      data,
      dataSourceSpendingSmile,
      dataSourceTargetIncomeAnnual,
      displayedSpendingSmile,
      displayedTargetIncomeAnnual,
      retirementAge,
      spendingSmileEnabled,
      useDataTargets,
    ]
  );
  const periodDetailsId = "retirement-income-period-details";
  const isPeriodInspectionEnabled =
    interactionPresentation.showPeriodInspection && displayedData.length > 0;
  const inspectedPoint = inspectedPointDate
    ? displayedData.find((point) => point.date === inspectedPointDate)
    : undefined;
  const inspectedEvents = inspectedPoint
    ? getRetirementIncomeEventsForDate(periodEvents, inspectedPoint.date)
    : [];
  const enabledIncomeKeys = useMemo(
    () =>
      incomeKeys.filter((key) =>
        isRetirementIncomeSourceEnabled(key, {
          showAlpha,
          showClassic,
          showClassicPlus,
          showCsAvc,
          partialRetirementEnabled,
          showIsa,
          showLisa,
          showNuvos,
          showPremium,
          showSipp,
          showStatePension,
        })
      ),
    [
      partialRetirementEnabled,
      showAlpha,
      showClassic,
      showClassicPlus,
      showCsAvc,
      showIsa,
      showLisa,
      showNuvos,
      showPremium,
      showSipp,
      showStatePension,
    ]
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
  const isCompact = width < 640;
  const hasPersonAgeAxes =
    isCalendarTimeline &&
    data.some(
      (point) =>
        point.personAges?.you !== undefined ||
        point.personAges?.partner !== undefined
    );

  const dimensions = useMemo<ChartDimensions>(() => {
    const height = hasPersonAgeAxes
      ? isCompact
        ? CALENDAR_AXIS_HEIGHT_COMPACT
        : CALENDAR_AXIS_HEIGHT
      : isCompact
        ? 420
        : 460;

    return {
      width,
      height,
      marginTop: isCompact ? 38 : 46,
      marginRight: isCompact ? 8 : 28,
      marginBottom: hasPersonAgeAxes
        ? isCompact
          ? CALENDAR_AXIS_MARGIN_BOTTOM_COMPACT
          : CALENDAR_AXIS_MARGIN_BOTTOM
        : isCompact
          ? 34
          : 38,
      marginLeft: isCompact ? 48 : 78,
    };
  }, [hasPersonAgeAxes, isCompact, width]);
  const plotWidth = Math.max(
    1,
    dimensions.width - dimensions.marginLeft - dimensions.marginRight
  );
  const plotHeight = Math.max(
    1,
    dimensions.height - dimensions.marginTop - dimensions.marginBottom
  );
  const ageExtent = d3.extent(displayedData, getTimelineValue);
  const activeMilestoneAges = createActiveMilestoneAges({
    alphaLeaveAge,
    alphaStartAge,
    nuvosStartAge,
    premiumStartAge,
    isaAccessAge,
    isaUseByAge,
    isaUseByAgeEnabled,
    lisaAccessAge,
    lisaUseByAge,
    lisaUseByAgeEnabled,
    partialRetirementEnabled,
    partialRetirementStartAge,
    retirementAge,
    showAlpha,
    showIsa,
    showLisa,
    showNuvos,
    showPremium,
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
    lisaAccessAge,
    lisaUseByAge,
    lisaUseByAgeEnabled,
    nuvosStartAge,
    premiumStartAge,
    partialRetirementEnabled,
    partialRetirementStartAge,
    retirementAge,
    showAlpha,
    showIsa,
    showLisa,
    showNuvos,
    showPremium,
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
    showAlpha,
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
  const enabledIncomeSeries = useMemo(
    () =>
      createChartIncomeSeriesDefinitions(
        seriesDefinitions ? [] : enabledIncomeKeys,
        visibleData,
        seriesDefinitions
      ),
    [enabledIncomeKeys, seriesDefinitions, visibleData]
  );
  const allLegendIncomeSeries = useMemo(
    () =>
      createChartIncomeSeriesDefinitions(
        seriesDefinitions ? [] : incomeKeys,
        visibleData,
        seriesDefinitions
      ),
    [seriesDefinitions, visibleData]
  );
  const legendIncomeKeys = useMemo(() => {
    const enabledKeys = new Set(
      enabledIncomeSeries.map((series) => series.key)
    );
    const visibleLegendKeys = new Set(
      selectRetirementChartLegendKeys(
        allLegendIncomeSeries.map((series) => ({
          key: series.key,
          enabled: enabledKeys.has(series.key),
          active: hasActiveIncome(visibleData, series),
        })),
        hideInactiveLegendItems
      )
    );

    return allLegendIncomeSeries.filter((series) =>
      visibleLegendKeys.has(series.key)
    );
  }, [
    allLegendIncomeSeries,
    enabledIncomeSeries,
    hideInactiveLegendItems,
    visibleData,
  ]);
  const maxIncome =
    d3.max(visibleData, (point) => point.totalIncomeAnnual / divisor) ??
    displayedTargetIncomeAnnual / divisor;
  const targetIncomeHeadroom = Math.max(
    (targetIncomeAnnual / divisor) * TARGET_INCOME_Y_AXIS_HEADROOM_PERCENT,
    TARGET_INCOME_Y_AXIS_MIN_HEADROOM_ANNUAL / divisor
  );
  const yMax = Math.max(
    displayedTargetIncomeAnnual / divisor + targetIncomeHeadroom,
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
  const stackedIncomeKeys = useMemo(
    () =>
      createStackedIncomeSeries(
        enabledIncomeSeries.filter((series) =>
          hasActiveIncome(visibleData, series)
        ),
        visibleData
      ),
    [enabledIncomeSeries, visibleData]
  );
  const stack = d3
    .stack<RetirementIncomePoint>()
    .keys(stackedIncomeKeys.map((series) => series.key))
    .order(d3.stackOrderNone)
    .value((point, key) => {
      const series = stackedIncomeKeys.find(
        (candidate) => candidate.key === key
      );

      return (series ? getChartIncomeValue(point, series) : 0) / divisor;
    });
  const stackedSeries = stack(visibleData);
  const area = d3
    .area<d3.SeriesPoint<RetirementIncomePoint>>()
    .x((point) => xScale(getTimelineValue(point.data)))
    .y0((point) => yScale(point[0]))
    .y1((point) => yScale(point[1]))
    .curve(d3.curveStepAfter);
  const shortfallArea = d3
    .area<RetirementIncomePoint>()
    .defined(
      (point) =>
        showShortfallOverlay && getTimelineValue(point) >= retirementAge
    )
    .x((point) => xScale(getTimelineValue(point)))
    .y0((point) =>
      yScale(
        Math.min(point.assessedIncomeAnnual, point.targetIncomeAnnual) / divisor
      )
    )
    .y1((point) => yScale(point.targetIncomeAnnual / divisor))
    .curve(d3.curveStepAfter);
  const estimatedIncomeTaxArea = d3
    .area<RetirementIncomePoint>()
    .defined((point) => getEstimatedIncomeTaxAnnual(point) > 0)
    .x((point) => xScale(getTimelineValue(point)))
    .y0((point) =>
      yScale(
        (point.takeHomeIncomeAnnual ?? point.assessedIncomeAnnual) / divisor
      )
    )
    .y1((point) => yScale(point.totalIncomeAnnual / divisor))
    .curve(d3.curveStepAfter);
  const hasEstimatedIncomeTax = visibleData.some(
    (point) => getEstimatedIncomeTaxAnnual(point) > 0
  );
  const avoidableSurplusArea = d3
    .area<RetirementIncomePoint>()
    .defined(
      (point) =>
        !isStaticPresentation &&
        getTimelineValue(point) >= retirementAge &&
        point.avoidableFlexibleSurplusAnnual > 0
    )
    .x((point) => xScale(getTimelineValue(point)))
    .y0((point) => yScale(point.targetIncomeAnnual / divisor))
    .y1((point) =>
      yScale(
        (point.targetIncomeAnnual + point.avoidableFlexibleSurplusAnnual) /
          divisor
      )
    )
    .curve(d3.curveStepAfter);
  const flexibleSurplusData = getFlexibleSurplusData(
    visibleData,
    showFlexibleWithdrawalInsights
  );
  const surplusSummaryPoints = createSurplusSummaryPoints(flexibleSurplusData);
  const reducibleFlexibleAccounts = new Set(
    flexibleSurplusData.flatMap((point) =>
      point.flexibleWithdrawalInsights.map((insight) => insight.accountId)
    )
  );
  const flexibleAccountWarnings = showFlexibleWithdrawalInsights
    ? createFlexibleAccountWarnings(
        reducibleFlexibleAccounts,
        residualFlexibleFundInsights
      )
    : new Map<string, string>();
  const hasUnavoidableSurplus = flexibleSurplusData.some(
    (point) => point.unavoidableSurplusAnnual > 0
  );
  const targetLine = d3
    .line<RetirementIncomePoint>()
    .defined((point) => point.targetIncomeAnnual > 0)
    .x((point) => xScale(getTimelineValue(point)))
    .y((point) => yScale(point.targetIncomeAnnual / divisor))
    .curve(d3.curveStepAfter);
  const spendingSmilePhasePaths = createSpendingSmilePhasePaths({
    enabled: spendingSmileEnabled,
    displayedSpendingSmile,
    targetLine,
    visibleData,
  });
  const yTicks = yScale.ticks(5);
  const xTicks = xScale.ticks(
    isCalendarTimeline ? (width < 640 ? 4 : 7) : width < 640 ? 5 : 8
  );
  const xYearTicks = createWholeYearTicks(xDomainMin, xDomainMax);
  const personAgeAxisTicks = {
    you: hasPersonAgeAxes
      ? createPersonAgeAxisTicks(
          visibleData,
          "you",
          xDomainMin,
          xDomainMax,
          width < 640 ? 4 : 7
        )
      : [],
    partner: hasPersonAgeAxes
      ? createPersonAgeAxisTicks(
          visibleData,
          "partner",
          xDomainMin,
          xDomainMax,
          width < 640 ? 4 : 7
        )
      : [],
  };
  const invalidMarkerKeys = useMemo(
    () => getInvalidMarkerKeys(validationIssues),
    [validationIssues]
  );
  const hasValidationIssues = validationIssues.length > 0;
  const projectionReady = data.length > 0;
  const milestoneMarkers: MilestoneMarker[] = createRetirementIncomeMilestones(
    {
      retirementAge,
      slowGoStartAge: resolvedSpendingSmile.slowGoStartAge,
      noGoStartAge: resolvedSpendingSmile.noGoStartAge,
      alphaLeaveAge,
      sippAccessAge,
      sippUseByAge,
      isaAccessAge,
      lisaAccessAge,
      alphaStartAge,
      nuvosStartAge,
      premiumStartAge,
      isaUseByAge,
      lisaUseByAge,
      partialRetirementStartAge,
      statePensionAge,
      spendingSmileEnabled,
      partialRetirementEnabled,
      showAlpha,
      showIsa,
      showLisa,
      showNuvos,
      showPremium,
      showSipp,
      showStatePension,
      sippUseByAgeEnabled,
      isaUseByAgeEnabled,
      lisaUseByAgeEnabled,
    },
    statePensionEditable
  ).map((marker) => ({
    ...marker,
    editable: marker.editable && !isStaticPresentation,
  }));
  const displayedMilestoneMarkerDefinitions = getDisplayedMilestoneMarkers(
    milestoneMarkers,
    showMilestoneMarkers && interactionPresentation.showInlineMilestones
  );
  const milestoneMarkerLookup = useMemo(
    () =>
      new Map(
        displayedMilestoneMarkerDefinitions.map((marker) => [
          marker.key,
          marker,
        ])
      ),
    [displayedMilestoneMarkerDefinitions]
  );
  const displayedMilestoneMarkers = useMemo(
    () =>
      displayedMilestoneMarkerDefinitions.map((marker) => ({
        ...marker,
        age: getDisplayMarkerAge(marker.age, draftMarkerAges[marker.key]),
        layoutAge: draftMarkerAges[marker.key]?.baseAge ?? marker.age,
      })),
    [displayedMilestoneMarkerDefinitions, draftMarkerAges]
  );
  const visibleMilestoneMarkers = useMemo<VisibleMilestoneMarker[]>(
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
  const derivedMarkerLayouts = createMarkerLayouts(
    [
      ...staticMilestones.map((marker) => ({
        ...marker,
        age: marker.timelineValue,
        layoutAge: marker.timelineValue,
        editable: false as const,
      })),
      ...editableMilestones.map((marker) => ({
        ...marker,
        age: editableMilestoneDrafts[marker.key] ?? marker.timelineValue,
        layoutAge: marker.timelineValue,
        editable: true as const,
      })),
    ],
    xScale,
    plotHeight
  );
  const displayedDerivedMarkerLayouts = showMilestoneMarkers
    ? derivedMarkerLayouts
    : [];
  const renderedMarkerLayouts = useMemo(
    () => bringActiveMarkerToFront(markerLayouts, activeMarkerDragKey),
    [activeMarkerDragKey, markerLayouts]
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
  const mobileRetirementIncomeSummary = useMemo(
    () =>
      createMobileRetirementIncomeSummary({
        displayedData,
        displayedTargetIncomeAnnual,
        isSimplePresentation,
        isCalendarTimeline,
        retirementAge,
        showStatePension,
        statePensionAge,
        alphaStartAge,
      }),
    [
      alphaStartAge,
      displayedData,
      displayedTargetIncomeAnnual,
      isCalendarTimeline,
      isSimplePresentation,
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

  const commitTargetIncome = useCallback(
    (value: number, age?: number) => {
      if (onChangeTargetIncome) {
        onChangeTargetIncome(value, age);
        return;
      }

      commitParameters({ targetIncomeAnnual: value });
    },
    [commitParameters, onChangeTargetIncome]
  );

  const commitMarkerAge = (markerKey: MilestoneKey, age: number) => {
    setPendingSpendingSmile((current) =>
      updatePendingSpendingSmileForMarker({
        current,
        data,
        dataSourceStrategy: dataSourceSpendingSmile,
        displayedStrategy: displayedSpendingSmile,
        markerKey,
        age,
      })
    );
    commitParameters({ [markerKey]: age });
  };

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
    commitMarkerAge(
      marker.key,
      snapToLimit(
        marker.age + direction * limits[marker.key].step,
        limits[marker.key]
      )
    );
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
    const nextTargetIncomeAnnual = snapToLimit(
      displayedTargetIncomeAnnual + direction * limits.targetIncomeAnnual.step,
      limits.targetIncomeAnnual
    );

    commitTargetIncome(nextTargetIncomeAnnual);
    setPendingTargetIncomeAnnual(nextTargetIncomeAnnual);
  };

  useEffect(() => {
    const touchDragHitboxes = [targetLineHitboxRef.current].filter(
      (element): element is SVGPathElement => element !== null
    );

    if (touchDragHitboxes.length === 0) {
      return;
    }

    const preventPageScroll = (event: globalThis.TouchEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    touchDragHitboxes.forEach((hitbox) => {
      hitbox.addEventListener("touchstart", preventPageScroll, {
        passive: false,
      });
      hitbox.addEventListener("touchmove", preventPageScroll, {
        passive: false,
      });
    });

    return () => {
      touchDragHitboxes.forEach((hitbox) => {
        hitbox.removeEventListener("touchstart", preventPageScroll);
        hitbox.removeEventListener("touchmove", preventPageScroll);
      });
    };
  }, [isStaticPresentation, spendingSmileEnabled]);

  const changeDisplayMode = (nextDisplayMode: "annual" | "monthly") => {
    if (nextDisplayMode === displayMode) {
      return;
    }

    setDisplayMode(nextDisplayMode);
    trackAnalyticsEvent("chart_display_changed", {
      display_mode: nextDisplayMode,
    });
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

  const getPlotPointerPosition = useCallback(
    (event: PointerEvent<SVGElement>) =>
      getPlotPointerPositionFromClient(event.clientX, event.clientY),
    [getPlotPointerPositionFromClient]
  );

  const inspectNearestPeriod = useCallback(
    (timelineValue: number) => {
      const point = d3.least(displayedData, (candidate) =>
        Math.abs(getTimelineValue(candidate) - timelineValue)
      );
      if (point) {
        setInspectedPointDate(point.date);
      }
    },
    [displayedData]
  );

  const inspectPeriodFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const pointerPosition = getPlotPointerPositionFromClient(
        clientX,
        clientY
      );
      if (!pointerPosition) {
        return;
      }
      inspectNearestPeriod(
        xScale.invert(clampNumber(pointerPosition.x, 0, plotWidth))
      );
    },
    [getPlotPointerPositionFromClient, inspectNearestPeriod, plotWidth, xScale]
  );

  const inspectInitialPeriod = () => {
    const point =
      displayedData.find((candidate) => candidate.targetIncomeAnnual > 0) ??
      displayedData[0];
    if (point) {
      setInspectedPointDate(point.date);
    }
  };

  const handlePeriodInspectionKeyDown = (
    event: KeyboardEvent<SVGRectElement>
  ) => {
    if (event.key === "Escape") {
      setInspectedPointDate(null);
      return;
    }
    if (
      ![
        "ArrowLeft",
        "ArrowDown",
        "ArrowRight",
        "ArrowUp",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      return;
    }
    event.preventDefault();
    const currentIndex = inspectedPointDate
      ? displayedData.findIndex((point) => point.date === inspectedPointDate)
      : -1;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? displayedData.length - 1
          : event.key === "ArrowLeft" || event.key === "ArrowDown"
            ? Math.max(0, currentIndex <= 0 ? 0 : currentIndex - 1)
            : Math.min(
                displayedData.length - 1,
                currentIndex < 0 ? 0 : currentIndex + 1
              );
    const point = displayedData[nextIndex];
    if (point) {
      setInspectedPointDate(point.date);
    }
  };

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

  const getMarkerDragScale = useCallback(
    () => activeMarkerDragScaleRef.current ?? xScale,
    [xScale]
  );

  const getMarkerDragPlotX = useCallback(
    (plotX: number) =>
      clampNumber(
        plotX,
        -plotWidth * MARKER_DRAG_LEFT_OVERSCAN_RATIO,
        plotWidth
      ),
    [plotWidth]
  );

  const getMarkerAgeFromPointer = useCallback(
    (event: PointerEvent<SVGGElement>, markerKey: MilestoneKey) => {
      const pointerPosition = getPlotPointerPosition(event);
      const marker = milestoneMarkerLookup.get(markerKey);

      if (!pointerPosition || !marker) {
        return marker?.age ?? limits[markerKey].min;
      }

      return snapToLimit(
        getMarkerDragScale().invert(getMarkerDragPlotX(pointerPosition.x)),
        limits[markerKey]
      );
    },
    [
      getMarkerDragPlotX,
      getMarkerDragScale,
      getPlotPointerPosition,
      limits,
      milestoneMarkerLookup,
    ]
  );

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
        getMarkerDragScale().invert(getMarkerDragPlotX(pointerPosition.x)),
        limits[markerKey]
      );
    },
    [
      getMarkerDragPlotX,
      getMarkerDragScale,
      getPlotPointerPositionFromClient,
      limits,
      milestoneMarkerLookup,
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
    activeMarkerDragScaleRef.current = xScale.copy();
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
    activeMarkerDragScaleRef.current = xScale.copy();
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
    activeMarkerDragScaleRef.current = null;
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

    commitMarkerAge(markerKey, committedAge);
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
    activeMarkerDragScaleRef.current = null;

    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    clearMarkerDraft(markerKey);
    setActiveMarkerDragKey(null);

    if (commit) {
      commitMarkerAge(markerKey, committedAge);
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

  const getTargetTimelineValueFromPointer = (
    event: PointerEvent<SVGPathElement>
  ) => {
    const pointerPosition = getPlotPointerPosition(event);

    return pointerPosition
      ? getMarkerDragScale().invert(getMarkerDragPlotX(pointerPosition.x))
      : undefined;
  };

  const getSpendingSmilePercentageFromPointer = (
    event: PointerEvent<SVGPathElement>,
    phase: SpendingSmilePhaseKey
  ) => {
    const pointerPosition = getPlotPointerPosition(event);
    const percentageField = getSpendingSmilePercentageFieldForPhase(phase);

    if (!pointerPosition || targetIncomeAnnual <= 0) {
      return displayedSpendingSmile[percentageField];
    }

    const annualTarget =
      yScale.invert(clampNumber(pointerPosition.y, 0, plotHeight)) * divisor;

    return updateSpendingSmilePercentage(
      displayedSpendingSmile,
      percentageField,
      (annualTarget / targetIncomeAnnual) * 100
    )[percentageField];
  };

  const updateDraftSpendingSmile = (
    event: PointerEvent<SVGPathElement>,
    phase: SpendingSmilePhaseKey
  ) => {
    const percentageField = getSpendingSmilePercentageFieldForPhase(phase);
    const percentage = getSpendingSmilePercentageFromPointer(event, phase);
    setDraftSpendingSmile(
      updateSpendingSmilePercentage(
        displayedSpendingSmile,
        percentageField,
        percentage
      )
    );
  };

  const handleSpendingSmilePointerDown = (
    event: PointerEvent<SVGPathElement>,
    phase: SpendingSmilePhaseKey
  ) => {
    if (!isPrimaryPointerDragStart(event)) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    activeSmileDragPointerIdRef.current = event.pointerId;
    activeSmileDragPhaseRef.current = phase;

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    updateDraftSpendingSmile(event, phase);
  };

  const handleSpendingSmilePointerMove = (
    event: PointerEvent<SVGPathElement>,
    phase: SpendingSmilePhaseKey
  ) => {
    if (
      activeSmileDragPhaseRef.current !== phase ||
      activeSmileDragPointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    updateDraftSpendingSmile(event, phase);
  };

  const finishSpendingSmilePointerDrag = (
    event: PointerEvent<SVGPathElement>,
    phase: SpendingSmilePhaseKey,
    commit: boolean
  ) => {
    if (
      activeSmileDragPhaseRef.current !== phase ||
      activeSmileDragPointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const percentageField = getSpendingSmilePercentageFieldForPhase(phase);
    const percentage = getSpendingSmilePercentageFromPointer(event, phase);
    const committedStrategy = updateSpendingSmilePercentage(
      draftSpendingSmile ?? displayedSpendingSmile,
      percentageField,
      percentage
    );

    activeSmileDragPointerIdRef.current = null;
    activeSmileDragPhaseRef.current = null;
    setDraftSpendingSmile(null);

    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (commit) {
      setPendingSpendingSmile({
        strategy: committedStrategy,
        sourceData: data,
        sourceStrategy: spendingSmile,
      });
      commitParameters({
        [percentageField]: committedStrategy[percentageField],
      });
    }
  };

  const handleSpendingSmileKeyDown = (
    event: KeyboardEvent<SVGPathElement>,
    phase: SpendingSmilePhaseKey
  ) => {
    if (
      !["ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight"].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    const direction =
      event.key === "ArrowDown" || event.key === "ArrowLeft" ? -1 : 1;
    const percentageField = getSpendingSmilePercentageFieldForPhase(phase);
    const nextStrategy = updateSpendingSmilePercentage(
      displayedSpendingSmile,
      percentageField,
      displayedSpendingSmile[percentageField] + direction
    );

    setPendingSpendingSmile({
      strategy: nextStrategy,
      sourceData: data,
      sourceStrategy: spendingSmile,
    });
    commitParameters({
      [percentageField]: nextStrategy[percentageField],
    });
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

  const getTargetTimelineValueFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const pointerPosition = getPlotPointerPositionFromClient(
        clientX,
        clientY
      );

      return pointerPosition
        ? getMarkerDragScale().invert(getMarkerDragPlotX(pointerPosition.x))
        : undefined;
    },
    [getMarkerDragPlotX, getMarkerDragScale, getPlotPointerPositionFromClient]
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
    commitTargetIncome(
      committedValue,
      getTargetTimelineValueFromClient(touch.clientX, touch.clientY)
    );
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
      commitTargetIncome(
        committedValue,
        getTargetTimelineValueFromPointer(event)
      );
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
      activeMarkerDragScaleRef.current = null;
      clearMarkerDraft(activeMarkerDragKey);
      setActiveMarkerDragKey(null);

      if (commit) {
        commitParameters({ [activeMarkerDragKey]: committedAge });
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
    commitParameters,
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
        activeMarkerDragScaleRef.current = null;
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
      activeMarkerDragScaleRef.current = null;
      clearMarkerDraft(activeMarkerDragKey);
      setActiveMarkerDragKey(null);

      if (commit) {
        commitParameters({ [activeMarkerDragKey]: committedAge });
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
    commitParameters,
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
        commitTargetIncome(
          committedValue,
          getTargetTimelineValueFromClient(event.clientX, event.clientY)
        );
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
    commitParameters,
    commitTargetIncome,
    getTargetTimelineValueFromClient,
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
        commitTargetIncome(
          committedValue,
          getTargetTimelineValueFromClient(touch.clientX, touch.clientY)
        );
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
    commitParameters,
    commitTargetIncome,
    getTargetTimelineValueFromClient,
    updateDraftTargetIncomeFromClient,
  ]);

  const editableMilestoneLookup = new Map(
    editableMilestones.map((milestone) => [milestone.key, milestone])
  );

  const getEditableMilestoneValue = (
    event: PointerEvent<SVGGElement>,
    key: string
  ) => {
    const milestone = editableMilestoneLookup.get(key);
    const pointerPosition = getPlotPointerPosition(event);

    if (!milestone || !pointerPosition) {
      return milestone?.timelineValue ?? 0;
    }

    return snapToLimit(
      xScale.invert(getMarkerDragPlotX(pointerPosition.x)),
      milestone.limit
    );
  };

  const updateEditableMilestoneDraft = (
    event: PointerEvent<SVGGElement>,
    key: string
  ) => {
    const timelineValue = getEditableMilestoneValue(event, key);
    setEditableMilestoneDrafts((current) => ({
      ...current,
      [key]: timelineValue,
    }));
  };

  const handleEditableMilestonePointerDown = (
    event: PointerEvent<SVGGElement>,
    key: string
  ) => {
    if (!isPrimaryPointerDragStart(event)) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activeEditableMilestonePointerIdRef.current = event.pointerId;
    setActiveEditableMilestoneKey(key);
    updateEditableMilestoneDraft(event, key);
  };

  const finishEditableMilestonePointerDrag = (
    event: PointerEvent<SVGGElement>,
    key: string,
    commit: boolean
  ) => {
    if (
      activeEditableMilestoneKey !== key ||
      activeEditableMilestonePointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const timelineValue = getEditableMilestoneValue(event, key);
    activeEditableMilestonePointerIdRef.current = null;
    setActiveEditableMilestoneKey(null);
    setEditableMilestoneDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    if (commit) {
      onChangeEditableMilestone?.(key, timelineValue);
    }
  };

  const handleEditableMilestoneKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    milestone: RetirementIncomeChartEditableMilestone
  ) => {
    if (
      !["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    const direction =
      event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
    onChangeEditableMilestone?.(
      milestone.key,
      snapToLimit(
        milestone.timelineValue + direction * milestone.limit.step,
        milestone.limit
      )
    );
  };

  return (
    <section
      className={`retirement-income-chart-panel${hasValidationIssues ? " retirement-income-chart-panel--invalid" : ""}`}
      aria-labelledby={chartTitleId}
      aria-describedby={`${chartDescriptionId}${chartDataAccessibilitySummary ? ` ${chartDataDescriptionId}` : ""}`}
      aria-live="polite"
    >
      <RetirementIncomeChartHeading
        chartTitleId={chartTitleId}
        chartTitle={chartTitle}
        displayMode={displayMode}
        isSimplePresentation={isSimplePresentation}
        onChangeDisplayMode={changeDisplayMode}
      />

      {!projectionReady || hasValidationIssues ? (
        <div className="retirement-income-validation-banner" role="alert">
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

      <div
        className="retirement-income-mobile-summary"
        aria-label="Chart summary"
      >
        {mobileRetirementIncomeSummary.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <RetirementIncomeChartDescription
        chartDescriptionId={chartDescriptionId}
        isSimplePresentation={isSimplePresentation}
        descriptionOverride={chartDescription}
      />
      {chartDataAccessibilitySummary ? (
        <p
          id={chartDataDescriptionId}
          className="visually-hidden"
          data-testid="retirement-income-chart-data-equivalent"
        >
          {chartDataAccessibilitySummary}
        </p>
      ) : null}

      <div className="retirement-income-chart-shell" ref={shellRef}>
        <svg
          ref={svgRef}
          className="retirement-income-chart-svg"
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          focusable="false"
          onContextMenu={(event) => event.preventDefault()}
        >
          <defs>
            <pattern
              id="estimated-income-tax-hatch"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect width="8" height="8" fill="#dce6ef" fillOpacity="0.82" />
              <line
                x1="0"
                y1="4"
                x2="8"
                y2="4"
                stroke="#385a78"
                strokeWidth="1.6"
              />
            </pattern>
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
            <pattern
              id="avoidable-surplus-hatch"
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="7"
                stroke="#8a5200"
                strokeWidth="2"
              />
            </pattern>
            {enabledIncomeSeries.map((series) => (
              <linearGradient
                key={series.key}
                id={getChartIncomeGradientId(series.key)}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={series.colour} stopOpacity="0.9" />
                <stop
                  offset="100%"
                  stopColor={series.colour}
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
                className="retirement-income-build-up-band"
              />
            ) : null}

            {yTicks.map((tick) => (
              <g key={tick} className="retirement-income-gridline">
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
              const chartSeries = stackedIncomeKeys.find(
                (candidate) => candidate.key === series.key
              );

              if (!chartSeries) {
                return null;
              }

              return (
                <path
                  key={chartSeries.key}
                  d={area(series) ?? undefined}
                  fill={`url(#${getChartIncomeGradientId(chartSeries.key)})`}
                  stroke={chartSeries.colour}
                  strokeWidth="1.5"
                />
              );
            })}

            <path
              d={estimatedIncomeTaxArea(visibleData) ?? undefined}
              className="retirement-income-income-tax-fill"
              fill="url(#estimated-income-tax-hatch)"
            />

            <path
              d={toSvgPath(avoidableSurplusArea(flexibleSurplusData))}
              className="retirement-income-avoidable-surplus-fill"
              fill="url(#avoidable-surplus-hatch)"
            />

            <path
              d={shortfallArea(visibleData) ?? undefined}
              className="retirement-income-shortfall-fill"
            />

            <path
              d={shortfallArea(visibleData) ?? undefined}
              fill="url(#shortfall-hatch)"
              opacity="0.55"
            />

            <path
              className="retirement-income-target-line"
              d={targetLine(visibleData) ?? undefined}
            />
            {isStaticPresentation ? null : spendingSmileEnabled ? (
              spendingSmilePhasePaths.map((phase) =>
                phase.path ? (
                  <path
                    key={phase.key}
                    className="retirement-income-target-line-hitbox retirement-income-smile-phase-hitbox"
                    data-testid={`spending-smile-${phase.key}-target-handle`}
                    d={phase.path}
                    role="slider"
                    tabIndex={0}
                    aria-label={`${phase.label} spending percentage`}
                    aria-valuemin={MIN_SPENDING_SMILE_PERCENTAGE}
                    aria-valuemax={MAX_SPENDING_SMILE_PERCENTAGE}
                    aria-valuenow={
                      displayedSpendingSmile[phase.percentageField]
                    }
                    aria-valuetext={`${displayedSpendingSmile[phase.percentageField]}%, ${formatCurrency(
                      (targetIncomeAnnual *
                        displayedSpendingSmile[phase.percentageField]) /
                        100 /
                        divisor
                    )} ${displayMode === "monthly" ? "per month" : "per year"}`}
                    onKeyDown={(event) =>
                      handleSpendingSmileKeyDown(event, phase.key)
                    }
                    onPointerDown={(event) =>
                      handleSpendingSmilePointerDown(event, phase.key)
                    }
                    onPointerMove={(event) =>
                      handleSpendingSmilePointerMove(event, phase.key)
                    }
                    onPointerUp={(event) =>
                      finishSpendingSmilePointerDrag(event, phase.key, true)
                    }
                    onPointerCancel={(event) =>
                      finishSpendingSmilePointerDrag(event, phase.key, false)
                    }
                  >
                    <title>Drag to adjust {phase.label} spending</title>
                  </path>
                ) : null
              )
            ) : (
              <path
                ref={targetLineHitboxRef}
                className="retirement-income-target-line-hitbox"
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
                onPointerCancel={(event) =>
                  finishTargetPointerDrag(event, false)
                }
                onTouchStart={handleTargetTouchStart}
                onTouchMove={handleTargetTouchMove}
                onTouchEnd={(event) => finishTargetTouchDrag(event, true)}
                onTouchCancel={(event) => finishTargetTouchDrag(event, false)}
              />
            )}

            {renderedMarkerLayouts.map((marker) => {
              const x = xScale(marker.plotAge);
              const handleLabel = getMarkerHandleLabel(marker);

              return (
                <g
                  key={marker.key}
                  className={[
                    "retirement-income-milestone",
                    invalidMarkerKeys.has(marker.key)
                      ? "retirement-income-milestone--invalid"
                      : "",
                    marker.key === effectiveSelectedMobileMarkerKey
                      ? "retirement-income-milestone--selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <line
                    x1={x}
                    x2={x}
                    y1={marker.handleY + HANDLE_LABEL_HEIGHT / 2}
                    y2={plotHeight}
                    stroke={marker.colour}
                    aria-hidden="true"
                  />
                  <g
                    className={[
                      "retirement-income-milestone-drag-label",
                      marker.editable
                        ? "retirement-income-milestone-drag-label--editable"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role={marker.editable ? "slider" : "img"}
                    tabIndex={marker.editable ? 0 : undefined}
                    data-testid={`retirement-income-marker-${marker.key}`}
                    aria-label={`${marker.label}, age ${formatModelAge(marker.age)}`}
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
                    <rect
                      x={x - HANDLE_LABEL_WIDTH / 2}
                      y={marker.handleY - HANDLE_LABEL_HEIGHT / 2}
                      width={HANDLE_LABEL_WIDTH}
                      height={HANDLE_LABEL_HEIGHT}
                      rx={HANDLE_LABEL_WIDTH / 2}
                      className="retirement-income-milestone-handle"
                      fill={marker.colour}
                    />
                    <text
                      x={x}
                      y={marker.handleY}
                      className="retirement-income-milestone-handle-label"
                      dominantBaseline="middle"
                      textAnchor="middle"
                      transform={`rotate(90 ${x} ${marker.handleY})`}
                    >
                      {handleLabel}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Household controls reuse the same marker renderer, but are
                intentionally kept separate from the established marker path. */}
            {/* eslint-disable-next-line sonarjs/cognitive-complexity */}
            {displayedDerivedMarkerLayouts.map((marker) => {
              const x = xScale(marker.age);
              const editableMilestone = editableMilestoneLookup.get(marker.key);
              const isEditable = Boolean(
                editableMilestone && onChangeEditableMilestone
              );

              return (
                <g
                  key={marker.key}
                  className={`retirement-income-milestone retirement-income-static-milestone${isEditable ? "" : " retirement-income-milestone--static"}`}
                  role={isEditable ? "slider" : "img"}
                  tabIndex={isEditable ? 0 : undefined}
                  aria-label={marker.label}
                  aria-valuemin={editableMilestone?.limit.min}
                  aria-valuemax={editableMilestone?.limit.max}
                  aria-valuenow={isEditable ? marker.age : undefined}
                  data-testid={
                    isEditable
                      ? `retirement-income-household-control-${marker.key}`
                      : `retirement-income-static-milestone-${marker.key}`
                  }
                  onKeyDown={
                    editableMilestone
                      ? (event) =>
                          handleEditableMilestoneKeyDown(
                            event,
                            editableMilestone
                          )
                      : undefined
                  }
                  onPointerDown={
                    isEditable
                      ? (event) =>
                          handleEditableMilestonePointerDown(event, marker.key)
                      : undefined
                  }
                  onPointerMove={
                    isEditable
                      ? (event) => {
                          if (
                            activeEditableMilestoneKey === marker.key &&
                            activeEditableMilestonePointerIdRef.current ===
                              event.pointerId
                          ) {
                            updateEditableMilestoneDraft(event, marker.key);
                          }
                        }
                      : undefined
                  }
                  onPointerUp={
                    isEditable
                      ? (event) =>
                          finishEditableMilestonePointerDrag(
                            event,
                            marker.key,
                            true
                          )
                      : undefined
                  }
                  onPointerCancel={
                    isEditable
                      ? (event) =>
                          finishEditableMilestonePointerDrag(
                            event,
                            marker.key,
                            false
                          )
                      : undefined
                  }
                >
                  <line
                    x1={x}
                    x2={x}
                    y1={marker.handleY + HANDLE_LABEL_HEIGHT / 2}
                    y2={plotHeight}
                    stroke={marker.colour}
                    aria-hidden="true"
                  />
                  <g
                    className={`retirement-income-milestone-drag-label${isEditable ? " retirement-income-milestone-drag-label--editable" : ""}`}
                  >
                    <rect
                      x={x - 22}
                      y={marker.handleY - HANDLE_LABEL_HEIGHT / 2 - 10}
                      width={44}
                      height={HANDLE_LABEL_HEIGHT + 20}
                      fill="transparent"
                      aria-hidden="true"
                    />
                    <rect
                      x={x - HANDLE_LABEL_WIDTH / 2}
                      y={marker.handleY - HANDLE_LABEL_HEIGHT / 2}
                      width={HANDLE_LABEL_WIDTH}
                      height={HANDLE_LABEL_HEIGHT}
                      rx={HANDLE_LABEL_WIDTH / 2}
                      className="retirement-income-milestone-handle"
                      fill={marker.colour}
                      aria-hidden="true"
                    />
                    <text
                      x={x}
                      y={marker.handleY}
                      className="retirement-income-milestone-handle-label"
                      dominantBaseline="middle"
                      textAnchor="middle"
                      transform={`rotate(90 ${x} ${marker.handleY})`}
                      aria-hidden="true"
                    >
                      {marker.shortLabel}
                    </text>
                  </g>
                </g>
              );
            })}

            <line
              className="retirement-income-axis"
              x1={0}
              x2={plotWidth}
              y1={plotHeight}
              y2={plotHeight}
            />
            <line
              className="retirement-income-axis"
              x1={0}
              x2={0}
              y1={0}
              y2={plotHeight}
            />
            {xYearTicks.map((tick) => (
              <g
                key={tick}
                className={`retirement-income-x-year-tick${
                  tick % 10 === 0
                    ? " retirement-income-x-year-tick--decade"
                    : ""
                }`}
                data-age={tick}
                aria-hidden="true"
              >
                <line
                  x1={xScale(tick)}
                  x2={xScale(tick)}
                  y1={plotHeight}
                  y2={plotHeight + (tick % 10 === 0 ? 9 : 6)}
                />
              </g>
            ))}
            {xTicks.map((tick) => (
              <g key={tick} className="retirement-income-x-tick">
                <line
                  x1={xScale(tick)}
                  x2={xScale(tick)}
                  y1={plotHeight}
                  y2={plotHeight + 6}
                />
                <text x={xScale(tick)} y={plotHeight + 18} textAnchor="middle">
                  {isCalendarTimeline
                    ? formatCalendarTimelineTick(tick)
                    : Math.round(tick)}
                </text>
              </g>
            ))}
            {!isCalendarTimeline ? (
              <text
                className="retirement-income-axis-title"
                x={0}
                y={plotHeight + 30}
              >
                Age
              </text>
            ) : null}
            {hasPersonAgeAxes ? (
              <>
                <PersonAgeAxis
                  axisKey="you"
                  label="You"
                  ticks={personAgeAxisTicks.you}
                  plotHeight={plotHeight}
                  plotWidth={plotWidth}
                  xScale={xScale}
                />
                <PersonAgeAxis
                  axisKey="partner"
                  label="Partner"
                  ticks={personAgeAxisTicks.partner}
                  plotHeight={plotHeight}
                  plotWidth={plotWidth}
                  xScale={xScale}
                />
              </>
            ) : null}
            {draggingMobileMarker ? (
              <g
                className="retirement-income-drag-age"
                transform={`translate(${clampNumber(
                  xScale(draggingMobileMarker.plotAge),
                  DRAG_AGE_LABEL_WIDTH / 2,
                  plotWidth - DRAG_AGE_LABEL_WIDTH / 2
                )},${plotHeight + 18})`}
              >
                <rect
                  x={-DRAG_AGE_LABEL_WIDTH / 2}
                  y={-13}
                  width={DRAG_AGE_LABEL_WIDTH}
                  height={DRAG_AGE_LABEL_HEIGHT}
                  rx={6}
                />
                <text y="0.12em" textAnchor="middle">
                  {formatAgeValue(draggingMobileMarker.age)}
                </text>
              </g>
            ) : null}
            <text
              className="retirement-income-axis-title"
              x={-dimensions.marginLeft + 2}
              y={-24}
            >
              {axisTitle}
            </text>
            {isPeriodInspectionEnabled ? (
              <rect
                className="retirement-income-period-inspector"
                data-testid="retirement-income-period-inspector"
                x={0}
                y={0}
                width={plotWidth}
                height={plotHeight}
                fill="transparent"
                pointerEvents={
                  interactionMode === "editable-household" ? "none" : undefined
                }
                tabIndex={0}
                aria-label="Inspect Combined retirement income by period. Use Left and Right Arrow keys to move between months."
                aria-describedby={
                  inspectedPoint ? periodDetailsId : chartDescriptionId
                }
                onFocus={() => {
                  if (!inspectedPoint) {
                    inspectInitialPeriod();
                  }
                }}
                onBlur={() => setInspectedPointDate(null)}
                onKeyDown={handlePeriodInspectionKeyDown}
                onPointerDown={(event) => {
                  event.currentTarget.focus();
                  inspectPeriodFromClient(event.clientX, event.clientY);
                }}
                onPointerMove={(event) => {
                  if (event.pointerType !== "touch") {
                    inspectPeriodFromClient(event.clientX, event.clientY);
                  }
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== "touch") {
                    setInspectedPointDate(null);
                  }
                }}
              >
                <title>Inspect household income, sources and events</title>
              </rect>
            ) : null}
          </g>
        </svg>

        {inspectedPoint ? (
          <RetirementIncomeChartPeriodDetails
            id={periodDetailsId}
            displayMode={displayMode}
            point={inspectedPoint}
            seriesDefinitions={enabledIncomeSeries}
            events={inspectedEvents}
          />
        ) : null}

        <div
          className="retirement-income-legend retirement-income-legend--overlay"
          aria-label="Chart key"
        >
          <span>
            <span className="retirement-income-build-up-key" />
            {BUILD_UP_META.label}
          </span>
          {legendIncomeKeys.map((series) => {
            const key = series.incomeKey;
            const label =
              key === "alphaIncomeAnnual" ? alphaLabel : series.label;

            return (
              <span key={series.key}>
                <span style={{ background: series.colour }} />
                {label}
              </span>
            );
          })}
          {hasEstimatedIncomeTax ? (
            <span>
              <span className="retirement-income-income-tax-key" />
              {RETIREMENT_CHART_OVERLAY_META.estimatedIncomeTax.label}
            </span>
          ) : null}
          {showShortfallOverlay ? (
            <span>
              <span className="retirement-income-shortfall-key" />
              {getRetirementIncomeShortfallLabel(isSimplePresentation)}
            </span>
          ) : null}
          <FlexibleSurplusLegend visible={showFlexibleWithdrawalInsights} />
        </div>
      </div>

      <SurplusTextEquivalent points={surplusSummaryPoints} />

      {!isStaticPresentation && showMilestoneMarkers ? (
        <RetirementIncomeMobileNavigation
          isCompact={isCompact}
          isVisible={isMobileNavigationVisible}
          limits={limits}
          selectedMobileMarker={selectedMobileMarker}
          visibleMilestoneMarkers={visibleMilestoneMarkers}
          onChangeParameters={commitParameters}
          onSelectMobileMarker={(key) => {
            setSelectedMobileMarkerKey(key);
            trackAnalyticsEvent("chart_mobile_marker_selected", {
              chart_marker: key,
            });
          }}
          onToggleVisibility={() => {
            setIsMobileNavigationVisible((currentValue) => {
              const nextValue = !currentValue;

              trackAnalyticsEvent("chart_mobile_controls_toggled", {
                expanded: nextValue,
              });

              return nextValue;
            });
          }}
        />
      ) : null}

      {!isStaticPresentation && showParameterControls ? (
        <RetirementIncomeControlGrid
          displayedAlphaMonthlyAddedPension={alphaMonthlyAddedPension}
          flexibleAccountWarnings={flexibleAccountWarnings}
          hasUnavoidableSurplus={hasUnavoidableSurplus}
          isaMonthlyContribution={isaMonthlyContribution}
          lisaMonthlyContribution={lisaMonthlyContribution}
          limits={limits}
          onChangeParameters={commitParameters}
          partialRetirementEnabled={partialRetirementEnabled}
          partialRetirementWorkPercent={partialRetirementWorkPercent}
          showAlpha={showAlpha}
          showIsa={showIsa}
          showLisa={showLisa}
          showSipp={showSipp}
          sippMonthlyContribution={sippMonthlyContribution}
        />
      ) : null}
      {!isStaticPresentation ? additionalParameterControls : null}
    </section>
  );
}

function isStaticChartPresentation(
  isSimplePresentation: boolean,
  readOnly: boolean
) {
  return isSimplePresentation || readOnly;
}

function getDisplayedMilestoneMarkers(
  markers: MilestoneMarker[],
  showMilestoneMarkers: boolean
) {
  return showMilestoneMarkers ? markers : [];
}

function createRetirementIncomeAxisTitle(
  valueLabel: string,
  targetLabel: string,
  isSimplePresentation: boolean
) {
  const comparisonLabel = isSimplePresentation ? "Amount you want" : "Target";
  return `${valueLabel} (£) · ${comparisonLabel} ${targetLabel}`;
}

function createMobileRetirementIncomeSummary({
  displayedData,
  displayedTargetIncomeAnnual,
  isSimplePresentation,
  isCalendarTimeline,
  retirementAge,
  showStatePension,
  statePensionAge,
  alphaStartAge,
}: {
  displayedData: RetirementIncomePoint[];
  displayedTargetIncomeAnnual: number;
  isSimplePresentation: boolean;
  isCalendarTimeline: boolean;
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
  const shortfallValue =
    firstShortfallPoint && lastShortfallPoint
      ? `${isCalendarTimeline ? "Years" : "Ages"} ${formatTimelineValue(firstShortfallPoint.age, isCalendarTimeline)}-${formatTimelineValue(lastShortfallPoint.age, isCalendarTimeline)}`
      : isSimplePresentation
        ? "No ages with less than you want"
        : "No modelled shortfall";

  const summary = [
    {
      label: isSimplePresentation ? "Amount you want" : "Target",
      value: `${formatCurrency(displayedTargetIncomeAnnual)} / year`,
    },
    {
      label: getRetirementIncomeShortfallLabel(isSimplePresentation),
      value: shortfallValue,
    },
  ];

  if (!isCalendarTimeline) {
    summary.push({
      label: showStatePension ? "State Pension" : "Alpha pension",
      value: `Age ${formatTimelineValue(
        showStatePension ? statePensionAge : alphaStartAge,
        false
      )}`,
    });
  }

  return summary;
}

function getRetirementIncomeShortfallLabel(isSimplePresentation: boolean) {
  return isSimplePresentation
    ? "Less than you want"
    : RETIREMENT_CHART_OVERLAY_META.shortfall.label;
}

function formatTimelineValue(value: number, isCalendarTimeline: boolean) {
  return isCalendarTimeline ? String(Math.round(value)) : formatAgeValue(value);
}

function getFlexibleSurplusData(
  data: RetirementIncomePoint[],
  visible: boolean
) {
  return visible ? data : [];
}

function toSvgPath(path: string | null) {
  return path ?? undefined;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value));
}

function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value);
}

function formatAgeValue(value: number) {
  return formatModelAgeCompact(value);
}

function formatCalendarTimelineTick(value: number) {
  const totalMonths = Math.round(value * 12);
  const year = Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function PersonAgeAxis({
  axisKey,
  label,
  ticks,
  plotHeight,
  plotWidth,
  xScale,
}: {
  axisKey: "you" | "partner";
  label: string;
  ticks: Array<{ age: number; timelineValue: number }>;
  plotHeight: number;
  plotWidth: number;
  xScale: d3.ScaleLinear<number, number>;
}) {
  const axisY = plotHeight + (axisKey === "you" ? 44 : 82);
  const tickLabelY = axisY + 18;
  const titleY = axisY + 34;

  return (
    <g
      className={`retirement-income-person-age-axis retirement-income-${axisKey}-age-axis`}
      data-testid={`retirement-income-${axisKey}-age-axis`}
      role="group"
      aria-label={`${label} age axis`}
    >
      <line
        className="retirement-income-axis"
        x1={0}
        x2={plotWidth}
        y1={axisY}
        y2={axisY}
      />
      {ticks.map((tick) => {
        const x = xScale(tick.timelineValue);
        return (
          <g
            key={`${axisKey}-${tick.age}`}
            className="retirement-income-person-age-tick"
            data-age={tick.age}
          >
            <line x1={x} x2={x} y1={axisY} y2={axisY + 6} />
            <text x={x} y={tickLabelY} textAnchor="middle">
              {Math.round(tick.age)}
            </text>
          </g>
        );
      })}
      <text className="retirement-income-axis-title" x={0} y={titleY}>
        {label}
      </text>
    </g>
  );
}

function getTimelineValue(point: RetirementIncomePoint) {
  return point.timelineValue ?? point.age;
}

function getEstimatedIncomeTaxAnnual(point: RetirementIncomePoint) {
  return (
    point.estimatedIncomeTaxAnnual ??
    Math.max(
      0,
      point.totalIncomeAnnual -
        (point.takeHomeIncomeAnnual ?? point.assessedIncomeAnnual)
    )
  );
}

function resolveDisplayedSpendingSmile({
  data,
  draft,
  pending,
  strategy,
}: {
  data: RetirementIncomePoint[];
  draft: SpendingSmileStrategy | null;
  pending: PendingSpendingSmile | null;
  strategy: SpendingSmileStrategy;
}) {
  if (draft) {
    return draft;
  }
  if (pending?.sourceData === data) {
    return pending.strategy;
  }
  return strategy;
}

function resolveDataSourceSpendingSmile({
  data,
  pending,
  strategy,
}: {
  data: RetirementIncomePoint[];
  pending: PendingSpendingSmile | null;
  strategy: SpendingSmileStrategy;
}) {
  return pending?.sourceData === data ? pending.sourceStrategy : strategy;
}

function applySpendingSmileMarkerDrafts(
  strategy: SpendingSmileStrategy,
  draftMarkerAges: Partial<
    Record<MilestoneKey, { age: number; baseAge: number }>
  >
): SpendingSmileStrategy {
  return {
    ...strategy,
    slowGoStartAge:
      draftMarkerAges.slowGoStartAge?.age ?? strategy.slowGoStartAge,
    noGoStartAge: draftMarkerAges.noGoStartAge?.age ?? strategy.noGoStartAge,
  };
}

function updatePendingSpendingSmileForMarker({
  current,
  data,
  dataSourceStrategy,
  displayedStrategy,
  markerKey,
  age,
}: {
  current: PendingSpendingSmile | null;
  data: RetirementIncomePoint[];
  dataSourceStrategy: SpendingSmileStrategy;
  displayedStrategy: SpendingSmileStrategy;
  markerKey: MilestoneKey;
  age: number;
}): PendingSpendingSmile | null {
  if (markerKey !== "slowGoStartAge" && markerKey !== "noGoStartAge") {
    return current;
  }

  return {
    strategy: {
      ...displayedStrategy,
      [markerKey]: age,
    },
    sourceData: data,
    sourceStrategy: dataSourceStrategy,
  };
}

function createDisplayedTargetData({
  data,
  dataSourceSpendingSmile,
  dataSourceTargetIncomeAnnual,
  displayedSpendingSmile,
  displayedTargetIncomeAnnual,
  retirementAge,
  spendingSmileEnabled,
}: {
  data: RetirementIncomePoint[];
  dataSourceSpendingSmile: SpendingSmileStrategy;
  dataSourceTargetIncomeAnnual: number;
  displayedSpendingSmile: SpendingSmileStrategy;
  displayedTargetIncomeAnnual: number;
  retirementAge: number;
  spendingSmileEnabled: boolean;
}) {
  if (dataSourceTargetIncomeAnnual <= 0) {
    return data.map((point) => ({
      ...point,
      targetIncomeAnnual: 0,
      shortfallAnnual: 0,
    }));
  }

  if (spendingSmileEnabled) {
    return data.map((point) => {
      const sourcePercentageField = getSpendingSmilePercentageField(
        point.age,
        dataSourceSpendingSmile
      );
      const displayedPercentageField = getSpendingSmilePercentageField(
        point.age,
        displayedSpendingSmile
      );
      const sourcePercentage = dataSourceSpendingSmile[sourcePercentageField];
      const displayedPercentage =
        displayedSpendingSmile[displayedPercentageField];
      const scaleFactor =
        sourcePercentage > 0 ? displayedPercentage / sourcePercentage : 1;

      return updateDisplayedTargetPoint(
        point,
        point.targetIncomeAnnual * scaleFactor,
        retirementAge
      );
    });
  }

  const scaleFactor =
    displayedTargetIncomeAnnual / dataSourceTargetIncomeAnnual;
  return data.map((point) =>
    updateDisplayedTargetPoint(
      point,
      point.targetIncomeAnnual * scaleFactor,
      retirementAge
    )
  );
}

function updateDisplayedTargetPoint(
  point: RetirementIncomePoint,
  targetIncomeAnnual: number,
  retirementAge: number
): RetirementIncomePoint {
  const totalSurplus = Math.max(
    0,
    point.assessedIncomeAnnual - targetIncomeAnnual
  );
  const unavoidableSurplusAnnual = Math.max(
    0,
    point.guaranteedNetIncomeAnnual - targetIncomeAnnual
  );
  const flexibleNetIncome = Math.max(
    0,
    point.assessedIncomeAnnual - point.guaranteedNetIncomeAnnual
  );

  return {
    ...point,
    targetIncomeAnnual,
    shortfallAnnual:
      point.age >= retirementAge
        ? Math.max(0, targetIncomeAnnual - point.assessedIncomeAnnual)
        : 0,
    unavoidableSurplusAnnual,
    avoidableFlexibleSurplusAnnual: Math.min(flexibleNetIncome, totalSurplus),
  };
}

function getSpendingSmilePercentageFieldForPhase(
  phase: SpendingSmilePhaseKey
): SmilePercentageField {
  return phase === "goGo"
    ? "goGoPercentage"
    : phase === "slowGo"
      ? "slowGoPercentage"
      : "noGoPercentage";
}

function isAgeInSpendingSmilePhase(
  age: number,
  phase: SpendingSmilePhaseKey,
  strategy: SpendingSmileStrategy
) {
  return (
    getSpendingSmilePercentageField(age, strategy) ===
    getSpendingSmilePercentageFieldForPhase(phase)
  );
}

function createSpendingSmilePhasePaths({
  enabled,
  displayedSpendingSmile,
  targetLine,
  visibleData,
}: {
  enabled: boolean;
  displayedSpendingSmile: SpendingSmileStrategy;
  targetLine: d3.Line<RetirementIncomePoint>;
  visibleData: RetirementIncomePoint[];
}) {
  if (!enabled) {
    return [];
  }

  return spendingSmilePhaseMeta.map((phase) => ({
    ...phase,
    path:
      targetLine(
        visibleData.filter((point) =>
          isAgeInSpendingSmilePhase(
            point.age,
            phase.key,
            displayedSpendingSmile
          )
        )
      ) ?? undefined,
  }));
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
