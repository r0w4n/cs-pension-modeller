import {
  useCallback,
  useEffect,
  useId,
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
import {
  clampNumber,
  clampToLimit,
  snapToLimit,
  type ChartNumberLimit,
} from "./app/chart-drag-constraints";
import type { ResidualFlexibleFundInsight } from "./app-domains/flexible-withdrawals";
import {
  calculateRetirementChartOverlays,
  RETIREMENT_CHART_OVERLAY_META,
} from "./app-domains/retirement-chart-overlays";
import { selectRetirementChartLegendKeys } from "./app-domains/retirement-chart-legend";

export type RetirementIncomePoint = {
  date: string;
  age: number;
  targetIncomeAnnual: number;
  isaIncomeAnnual: number;
  lisaIncomeAnnual: number;
  sippIncomeAnnual: number;
  csAvcIncomeAnnual: number;
  alphaIncomeAnnual: number;
  classicIncomeAnnual: number;
  classicPlusIncomeAnnual: number;
  nuvosIncomeAnnual: number;
  premiumIncomeAnnual: number;
  additionalGuaranteedIncomeAnnual: number;
  additionalGuaranteedIncomeStreams?: RetirementIncomeAdditionalIncomePoint[];
  partialRetirementIncomeAnnual: number;
  statePensionIncomeAnnual: number;
  totalIncomeAnnual: number;
  takeHomeIncomeAnnual?: number;
  assessedIncomeAnnual: number;
  shortfallAnnual: number;
  guaranteedNetIncomeAnnual: number;
  unavoidableSurplusAnnual: number;
  avoidableFlexibleSurplusAnnual: number;
  flexibleWithdrawalInsights: RetirementIncomeFlexibleWithdrawalInsight[];
  isaBalance?: number;
  lisaBalance?: number;
  sippBalance?: number;
  csAvcBalance?: number;
};

export type RetirementIncomeFlexibleWithdrawalInsight = {
  accountId: string;
  label: string;
  reducibleGrossAnnual: number;
  avoidableNetAnnual: number;
};

export type RetirementIncomeAdditionalIncomePoint = {
  id: string;
  label: string;
  annualAmount: number;
};

export type RetirementIncomeChartParameters = {
  targetIncomeAnnual: number;
  spendingSmileEnabled: boolean;
  goGoPercentage: number;
  slowGoStartAge: number;
  slowGoPercentage: number;
  noGoStartAge: number;
  noGoPercentage: number;
  alphaMonthlyAddedPension: number;
  isaMonthlyContribution: number;
  lisaMonthlyContribution: number;
  sippMonthlyContribution: number;
  retirementAge: number;
  alphaLeaveAge: number;
  sippAccessAge: number;
  sippUseByAge: number;
  isaAccessAge: number;
  lisaAccessAge: number;
  alphaStartAge: number;
  nuvosStartAge: number;
  premiumStartAge: number;
  isaUseByAge: number;
  lisaUseByAge: number;
  partialRetirementStartAge: number;
  partialRetirementWorkPercent: number;
  partialRetirementEnabled: boolean;
  statePensionAge: number;
  showAlpha: boolean;
  showClassic: boolean;
  showClassicPlus: boolean;
  showCsAvc: boolean;
  showIsa: boolean;
  showLisa: boolean;
  showSipp: boolean;
  sippUseByAgeEnabled: boolean;
  showNuvos: boolean;
  showPremium: boolean;
  isaUseByAgeEnabled: boolean;
  lisaUseByAgeEnabled: boolean;
  showStatePension: boolean;
};

export type RetirementIncomeChartProps = RetirementIncomeChartParameters & {
  data: RetirementIncomePoint[];
  alphaLabel?: string;
  hideInactiveLegendItems?: boolean;
  showFlexibleWithdrawalInsights?: boolean;
  presentation?: "standard" | "simple";
  residualFlexibleFundInsights?: ResidualFlexibleFundInsight[];
  limits: RetirementIncomeChartLimits;
  statePensionEditable?: boolean;
  validationIssues?: PensionValidationIssue[];
  onChangeParameters: (patch: Partial<RetirementIncomeChartParameters>) => void;
};

export type RetirementIncomeChartLimits = {
  targetIncomeAnnual: NumberLimit;
  alphaMonthlyAddedPension: NumberLimit;
  isaMonthlyContribution: NumberLimit;
  lisaMonthlyContribution: NumberLimit;
  sippMonthlyContribution: NumberLimit;
  retirementAge: NumberLimit;
  slowGoStartAge: NumberLimit;
  noGoStartAge: NumberLimit;
  alphaLeaveAge: NumberLimit;
  sippAccessAge: NumberLimit;
  sippUseByAge: NumberLimit;
  isaAccessAge: NumberLimit;
  lisaAccessAge: NumberLimit;
  alphaStartAge: NumberLimit;
  nuvosStartAge: NumberLimit;
  premiumStartAge: NumberLimit;
  isaUseByAge: NumberLimit;
  lisaUseByAge: NumberLimit;
  partialRetirementStartAge: NumberLimit;
  partialRetirementWorkPercent: NumberLimit;
  statePensionAge: NumberLimit;
};

type NumberLimit = ChartNumberLimit;

type IncomeKey =
  | "isaIncomeAnnual"
  | "lisaIncomeAnnual"
  | "sippIncomeAnnual"
  | "csAvcIncomeAnnual"
  | "alphaIncomeAnnual"
  | "classicIncomeAnnual"
  | "classicPlusIncomeAnnual"
  | "nuvosIncomeAnnual"
  | "premiumIncomeAnnual"
  | "additionalGuaranteedIncomeAnnual"
  | "partialRetirementIncomeAnnual"
  | "statePensionIncomeAnnual";

type MilestoneKey =
  | "retirementAge"
  | "slowGoStartAge"
  | "noGoStartAge"
  | "alphaLeaveAge"
  | "sippAccessAge"
  | "sippUseByAge"
  | "isaAccessAge"
  | "lisaAccessAge"
  | "alphaStartAge"
  | "nuvosStartAge"
  | "premiumStartAge"
  | "isaUseByAge"
  | "lisaUseByAge"
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

type VisibleMilestoneMarker = MilestoneMarker & {
  plotAge: number;
  layoutAge: number;
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
  "lisaIncomeAnnual",
  "sippIncomeAnnual",
  "csAvcIncomeAnnual",
  "partialRetirementIncomeAnnual",
  "alphaIncomeAnnual",
  "classicIncomeAnnual",
  "classicPlusIncomeAnnual",
  "nuvosIncomeAnnual",
  "premiumIncomeAnnual",
  "statePensionIncomeAnnual",
];

type ChartIncomeSeriesDefinition = {
  key: string;
  label: string;
  colour: string;
  incomeKey?: IncomeKey;
  additionalIncomeId?: string;
};

const additionalIncomeColours = [
  "#6d7d10",
  "#9a5b13",
  "#0f766e",
  "#7e3af2",
  "#0e7490",
  "#be123c",
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
  lisaIncomeAnnual: {
    label: "LISA",
    shortLabel: "LISA",
    colour: "#7c5c12",
  },
  sippIncomeAnnual: {
    label: "SIPP",
    shortLabel: "SIPP",
    colour: "#148c55",
  },
  csAvcIncomeAnnual: {
    label: "Civil Service AVC",
    shortLabel: "CS AVC",
    colour: "#0f766e",
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
  classicIncomeAnnual: {
    label: "classic pension",
    shortLabel: "classic",
    colour: "#8b5cf6",
  },
  classicPlusIncomeAnnual: {
    label: "classic plus pension",
    shortLabel: "classic plus",
    colour: "#a855f7",
  },
  nuvosIncomeAnnual: {
    label: "Nuvos pension",
    shortLabel: "Nuvos",
    colour: "#b45309",
  },
  premiumIncomeAnnual: {
    label: "Premium pension",
    shortLabel: "Premium",
    colour: "#0f766e",
  },
  additionalGuaranteedIncomeAnnual: {
    label: "Additional income",
    shortLabel: "Additional",
    colour: "#6d7d10",
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
const DRAG_AGE_LABEL_WIDTH = 58;
const DRAG_AGE_LABEL_HEIGHT = 19;
const TARGET_INCOME_Y_AXIS_HEADROOM_PERCENT = 0.18;
const TARGET_INCOME_Y_AXIS_MIN_HEADROOM_ANNUAL = 5000;
const MARKER_DRAG_LEFT_OVERSCAN_RATIO = 0.4;
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

function createSpendingSmileMilestoneMarkers(
  enabled: boolean,
  strategy: SpendingSmileStrategy
): MilestoneMarker[] {
  if (!enabled) {
    return [];
  }

  return [
    {
      key: "slowGoStartAge",
      label: "Start Slow-go",
      shortLabel: "Slow-go",
      age: strategy.slowGoStartAge,
      colour: "#2563a8",
      editable: true,
    },
    {
      key: "noGoStartAge",
      label: "Start No-go",
      shortLabel: "No-go",
      age: strategy.noGoStartAge,
      colour: "#0b4dc2",
      editable: true,
    },
  ];
}

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
  hideInactiveLegendItems = false,
  showFlexibleWithdrawalInsights = false,
  presentation = "standard",
  residualFlexibleFundInsights = [],
  limits,
  statePensionEditable = false,
  validationIssues = [],
  onChangeParameters,
}: RetirementIncomeChartProps) {
  const isSimplePresentation = presentation === "simple";
  const shellRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const targetLineHitboxRef = useRef<SVGPathElement | null>(null);
  const alphaAddedPensionHitboxRef = useRef<SVGPathElement | null>(null);
  const activeMarkerDragPointerIdRef = useRef<number | null>(null);
  const activeMarkerDragScaleRef = useRef<d3.ScaleLinear<
    number,
    number
  > | null>(null);
  const activeTargetDragPointerIdRef = useRef<number | null>(null);
  const activeSmileDragPointerIdRef = useRef<number | null>(null);
  const activeSmileDragPhaseRef = useRef<SpendingSmilePhaseKey | null>(null);
  const activeAlphaAddedPensionDragPointerIdRef = useRef<number | null>(null);
  const activeMarkerTouchIdentifierRef = useRef<number | null>(null);
  const activeTargetTouchIdentifierRef = useRef<number | null>(null);
  const activeAlphaAddedPensionTouchIdentifierRef = useRef<number | null>(null);
  const alphaAddedPensionDragStartRef = useRef<{
    annualAtPointer: number;
    monthlyContribution: number;
  } | null>(null);
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
  const [draftAlphaMonthlyAddedPension, setDraftAlphaMonthlyAddedPension] =
    useState<number | null>(null);
  const [draftMarkerAges, setDraftMarkerAges] = useState<
    Partial<Record<MilestoneKey, { age: number; baseAge: number }>>
  >({});
  const [activeMarkerDragKey, setActiveMarkerDragKey] =
    useState<MilestoneKey | null>(null);
  const [selectedMobileMarkerKey, setSelectedMobileMarkerKey] =
    useState<MilestoneKey>("retirementAge");
  const [isMobileNavigationVisible, setIsMobileNavigationVisible] =
    useState(false);
  const dataSourceTargetIncomeAnnual =
    data[0]?.targetIncomeAnnual ?? targetIncomeAnnual;
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
  const displayedAlphaMonthlyAddedPension =
    draftAlphaMonthlyAddedPension ?? alphaMonthlyAddedPension;
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
  const displayedData = useMemo(
    () =>
      createDisplayedTargetData({
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
    ]
  );
  const enabledIncomeKeys = useMemo(
    () =>
      incomeKeys.filter((key) =>
        isIncomeSourceEnabled(key, {
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

  const dimensions = useMemo<ChartDimensions>(() => {
    const height = isCompact ? 420 : 460;

    return {
      width,
      height,
      marginTop: isCompact ? 38 : 46,
      marginRight: isCompact ? 8 : 28,
      marginBottom: isCompact ? 34 : 38,
      marginLeft: isCompact ? 48 : 78,
    };
  }, [isCompact, width]);
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
    () => createChartIncomeSeriesDefinitions(enabledIncomeKeys, visibleData),
    [enabledIncomeKeys, visibleData]
  );
  const allLegendIncomeSeries = useMemo(
    () => createChartIncomeSeriesDefinitions(incomeKeys, visibleData),
    [visibleData]
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
  const alphaStackedSeries = stackedSeries.find(
    (series) => series.key === "alphaIncomeAnnual"
  );
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
  const estimatedIncomeTaxArea = d3
    .area<RetirementIncomePoint>()
    .defined(
      (point) =>
        calculateRetirementChartOverlays({
          grossIncomeAnnual: point.totalIncomeAnnual,
          takeHomeIncomeAnnual:
            point.takeHomeIncomeAnnual ?? point.assessedIncomeAnnual,
          assessedIncomeAnnual: point.assessedIncomeAnnual,
          targetIncomeAnnual: point.targetIncomeAnnual,
        }).estimatedIncomeTaxAnnual > 0
    )
    .x((point) => xScale(point.age))
    .y0((point) =>
      yScale(
        (point.takeHomeIncomeAnnual ?? point.assessedIncomeAnnual) / divisor
      )
    )
    .y1((point) => yScale(point.totalIncomeAnnual / divisor))
    .curve(d3.curveStepAfter);
  const hasEstimatedIncomeTax = visibleData.some(
    (point) =>
      calculateRetirementChartOverlays({
        grossIncomeAnnual: point.totalIncomeAnnual,
        takeHomeIncomeAnnual:
          point.takeHomeIncomeAnnual ?? point.assessedIncomeAnnual,
        assessedIncomeAnnual: point.assessedIncomeAnnual,
        targetIncomeAnnual: point.targetIncomeAnnual,
      }).estimatedIncomeTaxAnnual > 0
  );
  const avoidableSurplusArea = d3
    .area<RetirementIncomePoint>()
    .defined(
      (point) =>
        point.age >= retirementAge && point.avoidableFlexibleSurplusAnnual > 0
    )
    .x((point) => xScale(point.age))
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
    .x((point) => xScale(point.age))
    .y((point) => yScale(point.targetIncomeAnnual / divisor))
    .curve(d3.curveStepAfter);
  const spendingSmilePhasePaths = createSpendingSmilePhasePaths({
    enabled: spendingSmileEnabled,
    displayedSpendingSmile,
    targetLine,
    visibleData,
  });
  const alphaTopLine = d3
    .line<d3.SeriesPoint<RetirementIncomePoint>>()
    .defined((point) => point.data.alphaIncomeAnnual > 0)
    .x((point) => xScale(point.data.age))
    .y((point) => yScale(point[1]))
    .curve(d3.curveStepAfter);
  const alphaTopLinePath = alphaStackedSeries
    ? alphaTopLine(alphaStackedSeries)
    : undefined;
  const showAlphaTopLineHitbox = shouldShowAlphaTopLineHitbox({
    alphaTopLinePath,
    isSimplePresentation,
    showAlpha,
  });
  const yTicks = yScale.ticks(5);
  const xTicks = xScale.ticks(width < 640 ? 5 : 8);
  const xYearTicks = createWholeYearTicks(xDomainMin, xDomainMax);
  const invalidMarkerKeys = useMemo(
    () => getInvalidMarkerKeys(validationIssues),
    [validationIssues]
  );
  const hasValidationIssues = validationIssues.length > 0;
  const projectionReady = data.length > 0;
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
        ...createSpendingSmileMilestoneMarkers(
          spendingSmileEnabled,
          resolvedSpendingSmile
        ),
        ...(showAlpha
          ? [
              {
                key: "alphaLeaveAge" as const,
                label: "Leave Alpha",
                shortLabel: "Leave alpha",
                age: alphaLeaveAge,
                colour: "#b45309",
                editable: true,
              },
            ]
          : []),
        ...(showSipp
          ? [
              {
                key: "sippAccessAge" as const,
                label: "SIPP start",
                shortLabel: "SIPP start",
                age: sippAccessAge,
                colour: sourceMeta.sippIncomeAnnual.colour,
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
                colour: sourceMeta.sippIncomeAnnual.colour,
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
                colour: sourceMeta.isaIncomeAnnual.colour,
                editable: true,
              },
            ]
          : []),
        ...(showLisa
          ? [
              {
                key: "lisaAccessAge" as const,
                label: "LISA start",
                shortLabel: "LISA start",
                age: lisaAccessAge,
                colour: sourceMeta.lisaIncomeAnnual.colour,
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
        ...(showAlpha
          ? [
              {
                key: "alphaStartAge" as const,
                label: "Start Alpha",
                shortLabel: "Start Alpha",
                age: alphaStartAge,
                colour: "#7353bf",
                editable: true,
              },
            ]
          : []),
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
        ...(showPremium
          ? [
              {
                key: "premiumStartAge" as const,
                label: "Start Premium",
                shortLabel: "Start Premium",
                age: premiumStartAge,
                colour: "#0f766e",
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
                colour: sourceMeta.isaIncomeAnnual.colour,
                editable: true,
              },
            ]
          : []),
        ...(showLisa && lisaUseByAgeEnabled
          ? [
              {
                key: "lisaUseByAge" as const,
                label: "LISA stop",
                shortLabel: "LISA stop",
                age: lisaUseByAge,
                colour: sourceMeta.lisaIncomeAnnual.colour,
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
      ].map((marker) => ({
        ...marker,
        key: marker.key as MilestoneKey,
        editable: marker.editable && !isSimplePresentation,
      })),
    [
      alphaStartAge,
      alphaLeaveAge,
      isaAccessAge,
      isaUseByAge,
      isaUseByAgeEnabled,
      isSimplePresentation,
      lisaAccessAge,
      lisaUseByAge,
      lisaUseByAgeEnabled,
      partialRetirementEnabled,
      partialRetirementStartAge,
      retirementAge,
      resolvedSpendingSmile,
      showAlpha,
      showNuvos,
      showPremium,
      showSipp,
      showIsa,
      showLisa,
      nuvosStartAge,
      premiumStartAge,
      sippUseByAge,
      sippUseByAgeEnabled,
      showStatePension,
      spendingSmileEnabled,
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
        retirementAge,
        showStatePension,
        statePensionAge,
        alphaStartAge,
      }),
    [
      alphaStartAge,
      displayedData,
      displayedTargetIncomeAnnual,
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
    onChangeParameters({ [markerKey]: age });
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

    onChangeParameters({
      targetIncomeAnnual: nextTargetIncomeAnnual,
    });
    setPendingTargetIncomeAnnual(nextTargetIncomeAnnual);
  };

  const commitAlphaMonthlyAddedPension = (nextValue: number) => {
    const nextContribution = snapToLimit(
      nextValue,
      limits.alphaMonthlyAddedPension
    );

    setDraftAlphaMonthlyAddedPension(nextContribution);
    onChangeParameters({
      alphaMonthlyAddedPension: nextContribution,
    });
  };

  const handleAlphaAddedPensionKeyDown = (
    event: KeyboardEvent<SVGPathElement>
  ) => {
    if (
      !["ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight"].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    const direction =
      event.key === "ArrowDown" || event.key === "ArrowLeft" ? -1 : 1;
    commitAlphaMonthlyAddedPension(
      alphaMonthlyAddedPension +
        direction * limits.alphaMonthlyAddedPension.step
    );
  };

  useEffect(() => {
    const touchDragHitboxes = [
      targetLineHitboxRef.current,
      alphaAddedPensionHitboxRef.current,
    ].filter((element): element is SVGPathElement => element !== null);

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
  }, [alphaTopLinePath, showAlpha]);

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
      onChangeParameters({
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
    onChangeParameters({
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

  const updateDraftTargetIncomeFromClient = useCallback(
    (clientX: number, clientY: number) => {
      setDraftTargetIncomeAnnual(getTargetIncomeFromClient(clientX, clientY));
    },
    [getTargetIncomeFromClient]
  );

  const getAnnualIncomeFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const pointerPosition = getPlotPointerPositionFromClient(
        clientX,
        clientY
      );

      if (!pointerPosition) {
        return null;
      }

      return (
        yScale.invert(clampNumber(pointerPosition.y, 0, plotHeight)) * divisor
      );
    },
    [divisor, getPlotPointerPositionFromClient, plotHeight, yScale]
  );

  const getAlphaMonthlyAddedPensionFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const dragStart = alphaAddedPensionDragStartRef.current;
      const annualAtPointer = getAnnualIncomeFromClient(clientX, clientY);

      if (!dragStart || annualAtPointer === null) {
        return alphaMonthlyAddedPension;
      }

      return snapToLimit(
        dragStart.monthlyContribution +
          (annualAtPointer - dragStart.annualAtPointer) / 12,
        limits.alphaMonthlyAddedPension
      );
    },
    [
      alphaMonthlyAddedPension,
      getAnnualIncomeFromClient,
      limits.alphaMonthlyAddedPension,
    ]
  );

  const startAlphaAddedPensionDrag = (
    clientX: number,
    clientY: number,
    touchTimeStamp: number
  ) => {
    const annualAtPointer = getAnnualIncomeFromClient(clientX, clientY);

    if (annualAtPointer === null) {
      return false;
    }

    lastTouchStartTimeRef.current = touchTimeStamp;
    alphaAddedPensionDragStartRef.current = {
      annualAtPointer,
      monthlyContribution: alphaMonthlyAddedPension,
    };
    setDraftAlphaMonthlyAddedPension(alphaMonthlyAddedPension);
    return true;
  };

  const updateDraftAlphaAddedPensionFromClient = useCallback(
    (clientX: number, clientY: number) => {
      setDraftAlphaMonthlyAddedPension(
        getAlphaMonthlyAddedPensionFromClient(clientX, clientY)
      );
    },
    [getAlphaMonthlyAddedPensionFromClient]
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

  const handleAlphaAddedPensionPointerDown = (
    event: PointerEvent<SVGPathElement>
  ) => {
    if (!showAlpha || !isPrimaryPointerDragStart(event)) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();

    if (
      !startAlphaAddedPensionDrag(event.clientX, event.clientY, event.timeStamp)
    ) {
      return;
    }

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    activeAlphaAddedPensionDragPointerIdRef.current = event.pointerId;
  };

  const handleAlphaAddedPensionPointerMove = (
    event: PointerEvent<SVGPathElement>
  ) => {
    if (activeAlphaAddedPensionDragPointerIdRef.current !== event.pointerId) {
      return;
    }

    updateDraftAlphaAddedPensionFromClient(event.clientX, event.clientY);
  };

  const finishAlphaAddedPensionPointerDrag = (
    event: PointerEvent<SVGPathElement>,
    commit: boolean
  ) => {
    if (activeAlphaAddedPensionDragPointerIdRef.current !== event.pointerId) {
      return;
    }

    const committedValue = getAlphaMonthlyAddedPensionFromClient(
      event.clientX,
      event.clientY
    );

    activeAlphaAddedPensionDragPointerIdRef.current = null;
    alphaAddedPensionDragStartRef.current = null;
    setDraftAlphaMonthlyAddedPension(null);

    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (commit) {
      onChangeParameters({ alphaMonthlyAddedPension: committedValue });
    }
  };

  const handleAlphaAddedPensionTouchStart = (
    event: TouchEvent<SVGPathElement>
  ) => {
    if (!showAlpha) {
      return;
    }

    const touch = getFirstChangedTouch(event.changedTouches);

    if (!touch) {
      return;
    }

    event.currentTarget.focus();

    if (
      !startAlphaAddedPensionDrag(touch.clientX, touch.clientY, event.timeStamp)
    ) {
      return;
    }

    activeAlphaAddedPensionTouchIdentifierRef.current = touch.identifier;
    activeAlphaAddedPensionDragPointerIdRef.current = null;
  };

  const handleAlphaAddedPensionTouchMove = (
    event: TouchEvent<SVGPathElement>
  ) => {
    const identifier = activeAlphaAddedPensionTouchIdentifierRef.current;

    if (identifier === null) {
      return;
    }

    const touch = getTrackedTouch(event.touches, identifier);

    if (!touch) {
      return;
    }

    updateDraftAlphaAddedPensionFromClient(touch.clientX, touch.clientY);
  };

  const finishAlphaAddedPensionTouchDrag = (
    event: TouchEvent<SVGPathElement>,
    commit: boolean
  ) => {
    const identifier = activeAlphaAddedPensionTouchIdentifierRef.current;

    if (identifier === null) {
      return;
    }

    const touch =
      getTrackedTouch(event.changedTouches, identifier) ??
      getTrackedTouch(event.touches, identifier);

    const committedValue = touch
      ? getAlphaMonthlyAddedPensionFromClient(touch.clientX, touch.clientY)
      : alphaMonthlyAddedPension;

    activeAlphaAddedPensionTouchIdentifierRef.current = null;
    alphaAddedPensionDragStartRef.current = null;
    setDraftAlphaMonthlyAddedPension(null);

    if (touch && commit) {
      onChangeParameters({ alphaMonthlyAddedPension: committedValue });
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
      className={`retirement-income-chart-panel${hasValidationIssues ? " retirement-income-chart-panel--invalid" : ""}`}
      aria-labelledby={chartTitleId}
      aria-describedby={chartDescriptionId}
      aria-live="polite"
    >
      <RetirementIncomeChartHeading
        chartTitleId={chartTitleId}
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
      />

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

            <OptionalChartLayer visible={showAlphaTopLineHitbox}>
              <path
                ref={alphaAddedPensionHitboxRef}
                className="retirement-income-alpha-added-pension-hitbox"
                d={alphaTopLinePath ?? undefined}
                role="slider"
                tabIndex={0}
                aria-label="Alpha added pension top edge"
                aria-valuemin={limits.alphaMonthlyAddedPension.min}
                aria-valuemax={limits.alphaMonthlyAddedPension.max}
                aria-valuenow={displayedAlphaMonthlyAddedPension}
                onKeyDown={handleAlphaAddedPensionKeyDown}
                onPointerDown={handleAlphaAddedPensionPointerDown}
                onPointerMove={handleAlphaAddedPensionPointerMove}
                onPointerUp={(event) =>
                  finishAlphaAddedPensionPointerDrag(event, true)
                }
                onPointerCancel={(event) =>
                  finishAlphaAddedPensionPointerDrag(event, false)
                }
                onTouchStart={handleAlphaAddedPensionTouchStart}
                onTouchMove={handleAlphaAddedPensionTouchMove}
                onTouchEnd={(event) =>
                  finishAlphaAddedPensionTouchDrag(event, true)
                }
                onTouchCancel={(event) =>
                  finishAlphaAddedPensionTouchDrag(event, false)
                }
              />
            </OptionalChartLayer>

            <path
              className="retirement-income-target-line"
              d={targetLine(visibleData) ?? undefined}
            />
            {isSimplePresentation ? null : spendingSmileEnabled ? (
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
                  {Math.round(tick)}
                </text>
              </g>
            ))}
            <text
              className="retirement-income-axis-title"
              x={0}
              y={plotHeight + 30}
            >
              Age
            </text>
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
          </g>
        </svg>

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
            const enabled = key
              ? isIncomeSourceEnabled(key, {
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
              : true;
            const togglePatch = key
              ? getIncomeSourceTogglePatch(key, !enabled)
              : null;

            if (isSimplePresentation || !key || !togglePatch) {
              return (
                <span key={series.key}>
                  <span style={{ background: series.colour }} />
                  {label}
                </span>
              );
            }

            return (
              <button
                key={series.key}
                type="button"
                className="retirement-income-legend-toggle"
                aria-label={getIncomeSourceToggleLabel(key)}
                aria-pressed={enabled}
                onClick={() => onChangeParameters(togglePatch)}
              >
                <span style={{ background: series.colour }} />
                {label}
              </button>
            );
          })}
          {hasEstimatedIncomeTax ? (
            <span>
              <span className="retirement-income-income-tax-key" />
              {RETIREMENT_CHART_OVERLAY_META.estimatedIncomeTax.label}
            </span>
          ) : null}
          <span>
            <span className="retirement-income-shortfall-key" />
            {getRetirementIncomeShortfallLabel(isSimplePresentation)}
          </span>
          <FlexibleSurplusLegend visible={showFlexibleWithdrawalInsights} />
        </div>
      </div>

      <SurplusTextEquivalent points={surplusSummaryPoints} />

      {!isSimplePresentation ? (
        <RetirementIncomeMobileNavigation
          isCompact={isCompact}
          isVisible={isMobileNavigationVisible}
          limits={limits}
          selectedMobileMarker={selectedMobileMarker}
          visibleMilestoneMarkers={visibleMilestoneMarkers}
          onChangeParameters={onChangeParameters}
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

      {!isSimplePresentation ? (
        <RetirementIncomeControlGrid
          displayedAlphaMonthlyAddedPension={displayedAlphaMonthlyAddedPension}
          flexibleAccountWarnings={flexibleAccountWarnings}
          hasUnavoidableSurplus={hasUnavoidableSurplus}
          isaMonthlyContribution={isaMonthlyContribution}
          lisaMonthlyContribution={lisaMonthlyContribution}
          limits={limits}
          onChangeParameters={onChangeParameters}
          partialRetirementEnabled={partialRetirementEnabled}
          partialRetirementWorkPercent={partialRetirementWorkPercent}
          showAlpha={showAlpha}
          showIsa={showIsa}
          showLisa={showLisa}
          showSipp={showSipp}
          sippMonthlyContribution={sippMonthlyContribution}
        />
      ) : null}
    </section>
  );
}

function OptionalChartLayer({
  children,
  visible,
}: {
  children: ReactNode;
  visible: boolean;
}) {
  return visible ? children : null;
}

function shouldShowAlphaTopLineHitbox({
  alphaTopLinePath,
  isSimplePresentation,
  showAlpha,
}: {
  alphaTopLinePath: string | null | undefined;
  isSimplePresentation: boolean;
  showAlpha: boolean;
}) {
  return showAlpha && !isSimplePresentation && Boolean(alphaTopLinePath);
}

function RetirementIncomeChartHeading({
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

function RetirementIncomeChartDescription({
  chartDescriptionId,
  isSimplePresentation,
}: {
  chartDescriptionId: string;
  isSimplePresentation: boolean;
}) {
  const description = isSimplePresentation
    ? "The coloured areas show where your estimated income comes from as you get older. The line shows the amount you said you would like to spend. The tax pattern shows estimated Income Tax, and red hatching shows where the estimate gives you less than that."
    : "Stacked gross income chart showing ISA, SIPP, partial retirement income, Civil Service pensions, additional guaranteed income and State Pension against the target retirement income over age. Estimated Income Tax is shown with horizontal blue-grey hatching between income after estimated Income Tax and gross income. Shortfall is shown with red diagonal hatching.";

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

function createRetirementIncomeAxisTitle(
  valueLabel: string,
  targetLabel: string,
  isSimplePresentation: boolean
) {
  const comparisonLabel = isSimplePresentation ? "Amount you want" : "Target";
  return `${valueLabel} (£) · ${comparisonLabel} ${targetLabel}`;
}

function createFlexibleAccountWarnings(
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
      `Potential over-saving: ${explanation} at age ${formatAgeValue(residualAccount.planningHorizonAge)}. You may want to compare a lower contribution.`
    );
  });

  return warnings;
}

function RetirementIncomeControlGrid({
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
          colour={sourceMeta.lisaIncomeAnnual.colour}
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
  limit: NumberLimit;
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
  lisaAccessAge,
  lisaUseByAge,
  lisaUseByAgeEnabled,
  nuvosStartAge,
  premiumStartAge,
  partialRetirementEnabled,
  partialRetirementStartAge,
  retirementAge,
  showAlpha,
  showNuvos,
  showPremium,
  showIsa,
  showLisa,
  showSipp,
  showStatePension,
  sippAccessAge,
  sippUseByAge,
  sippUseByAgeEnabled,
  statePensionAge,
}: Pick<
  RetirementIncomeChartParameters,
  | "alphaLeaveAge"
  | "alphaStartAge"
  | "isaAccessAge"
  | "isaUseByAge"
  | "isaUseByAgeEnabled"
  | "lisaAccessAge"
  | "lisaUseByAge"
  | "lisaUseByAgeEnabled"
  | "nuvosStartAge"
  | "premiumStartAge"
  | "partialRetirementEnabled"
  | "partialRetirementStartAge"
  | "retirementAge"
  | "showAlpha"
  | "showNuvos"
  | "showPremium"
  | "showIsa"
  | "showLisa"
  | "showSipp"
  | "showStatePension"
  | "sippAccessAge"
  | "sippUseByAge"
  | "sippUseByAgeEnabled"
  | "statePensionAge"
>) {
  return [
    retirementAge,
    showAlpha ? alphaLeaveAge : null,
    showSipp ? sippAccessAge : null,
    showSipp && sippUseByAgeEnabled ? sippUseByAge : null,
    showIsa ? isaAccessAge : null,
    showIsa && isaUseByAgeEnabled ? isaUseByAge : null,
    showLisa ? lisaAccessAge : null,
    showLisa && lisaUseByAgeEnabled ? lisaUseByAge : null,
    partialRetirementEnabled ? partialRetirementStartAge : null,
    showAlpha ? alphaStartAge : null,
    showNuvos ? nuvosStartAge : null,
    showPremium ? premiumStartAge : null,
    showStatePension ? statePensionAge : null,
  ];
}

function createActiveMilestoneBoundaries(
  input: Pick<
    RetirementIncomeChartParameters,
    | "alphaLeaveAge"
    | "alphaStartAge"
    | "isaAccessAge"
    | "isaUseByAge"
    | "isaUseByAgeEnabled"
    | "lisaAccessAge"
    | "lisaUseByAge"
    | "lisaUseByAgeEnabled"
    | "nuvosStartAge"
    | "premiumStartAge"
    | "partialRetirementEnabled"
    | "partialRetirementStartAge"
    | "retirementAge"
    | "showAlpha"
    | "showNuvos"
    | "showPremium"
    | "showIsa"
    | "showLisa"
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
    lisaAccessAge,
    lisaUseByAge,
    lisaUseByAgeEnabled,
    nuvosStartAge,
    premiumStartAge,
    partialRetirementEnabled,
    partialRetirementStartAge,
    retirementAge,
    showAlpha,
    showNuvos,
    showPremium,
    showIsa,
    showLisa,
    showSipp,
    showStatePension,
    sippAccessAge,
    sippUseByAge,
    sippUseByAgeEnabled,
    statePensionAge,
  } = input;

  return [
    { key: "retirementAge" as const, age: retirementAge },
    ...(showAlpha
      ? [{ key: "alphaLeaveAge" as const, age: alphaLeaveAge }]
      : []),
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
    ...(showLisa
      ? [{ key: "lisaAccessAge" as const, age: lisaAccessAge }]
      : []),
    ...(showLisa && lisaUseByAgeEnabled
      ? [{ key: "lisaUseByAge" as const, age: lisaUseByAge }]
      : []),
    ...(partialRetirementEnabled
      ? [
          {
            key: "partialRetirementStartAge" as const,
            age: partialRetirementStartAge,
          },
        ]
      : []),
    ...(showAlpha
      ? [{ key: "alphaStartAge" as const, age: alphaStartAge }]
      : []),
    ...(showNuvos
      ? [{ key: "nuvosStartAge" as const, age: nuvosStartAge }]
      : []),
    ...(showPremium
      ? [{ key: "premiumStartAge" as const, age: premiumStartAge }]
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
  showAlpha,
}: Pick<
  RetirementIncomeChartParameters,
  | "alphaLeaveAge"
  | "partialRetirementEnabled"
  | "partialRetirementStartAge"
  | "retirementAge"
  | "showAlpha"
>) {
  return Math.min(
    retirementAge,
    showAlpha ? alphaLeaveAge : retirementAge,
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

  if (key === "lisaAccessAge") {
    return (point: RetirementIncomePoint) => point.lisaIncomeAnnual > 0;
  }

  if (key === "lisaUseByAge") {
    return (point: RetirementIncomePoint) => point.lisaIncomeAnnual <= 0;
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

  if (key === "premiumStartAge") {
    return (point: RetirementIncomePoint) => point.premiumIncomeAnnual > 0;
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

function createChartIncomeSeriesDefinitions(
  keys: IncomeKey[],
  data: RetirementIncomePoint[]
) {
  return [
    ...keys.map((key) => ({
      key,
      label: sourceMeta[key].label,
      colour: sourceMeta[key].colour,
      incomeKey: key,
    })),
    ...createAdditionalIncomeSeriesDefinitions(data),
  ];
}

function createAdditionalIncomeSeriesDefinitions(
  data: RetirementIncomePoint[]
) {
  const seriesById = new Map<string, ChartIncomeSeriesDefinition>();

  data.forEach((point) => {
    point.additionalGuaranteedIncomeStreams?.forEach((stream) => {
      if (seriesById.has(stream.id)) {
        return;
      }

      seriesById.set(stream.id, {
        key: createAdditionalIncomeSeriesKey(stream.id),
        label: stream.label,
        colour:
          additionalIncomeColours[
            seriesById.size % additionalIncomeColours.length
          ],
        additionalIncomeId: stream.id,
      });
    });
  });

  if (
    seriesById.size === 0 &&
    data.some((point) => point.additionalGuaranteedIncomeAnnual > 0)
  ) {
    return [
      {
        key: "additionalGuaranteedIncomeAnnual",
        label: sourceMeta.additionalGuaranteedIncomeAnnual.label,
        colour: sourceMeta.additionalGuaranteedIncomeAnnual.colour,
        incomeKey: "additionalGuaranteedIncomeAnnual" as const,
      },
    ];
  }

  return [...seriesById.values()];
}

function createAdditionalIncomeSeriesKey(id: string) {
  return `additionalGuaranteedIncome:${id}`;
}

function getChartIncomeGradientId(key: string) {
  return `retirement-income-gradient-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function getChartIncomeValue(
  point: RetirementIncomePoint,
  series: ChartIncomeSeriesDefinition
) {
  if (series.additionalIncomeId) {
    return (
      point.additionalGuaranteedIncomeStreams?.find(
        (stream) => stream.id === series.additionalIncomeId
      )?.annualAmount ?? 0
    );
  }

  return series.incomeKey ? point[series.incomeKey] : 0;
}

function createStackedIncomeSeries(
  seriesDefinitions: ChartIncomeSeriesDefinition[],
  data: RetirementIncomePoint[]
) {
  const keyIndex = new Map(
    seriesDefinitions.map((series, index) => [series.key, index])
  );

  return [...seriesDefinitions].sort((leftSeries, rightSeries) => {
    const leftFirstActiveAge = findFirstActiveIncomeAge(data, leftSeries);
    const rightFirstActiveAge = findFirstActiveIncomeAge(data, rightSeries);

    if (leftFirstActiveAge !== rightFirstActiveAge) {
      return leftFirstActiveAge - rightFirstActiveAge;
    }

    return (
      (keyIndex.get(leftSeries.key) ?? 0) - (keyIndex.get(rightSeries.key) ?? 0)
    );
  });
}

function findFirstActiveIncomeAge(
  data: RetirementIncomePoint[],
  series: ChartIncomeSeriesDefinition
) {
  const firstActivePoint = data.find(
    (point) => getChartIncomeValue(point, series) > 0
  );

  return firstActivePoint?.age ?? Number.POSITIVE_INFINITY;
}

function hasActiveIncome(
  data: RetirementIncomePoint[],
  series: ChartIncomeSeriesDefinition
) {
  return data.some((point) => getChartIncomeValue(point, series) > 0);
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

function bringActiveMarkerToFront<T extends MilestoneMarker>(
  markers: T[],
  activeMarkerKey: MilestoneKey | null
) {
  if (activeMarkerKey === null) {
    return markers;
  }

  const activeMarker = markers.find((marker) => marker.key === activeMarkerKey);

  if (!activeMarker) {
    return markers;
  }

  return [
    ...markers.filter((marker) => marker.key !== activeMarkerKey),
    activeMarker,
  ];
}

function createWholeYearTicks(minAge: number, maxAge: number) {
  const firstTick = Math.ceil(minAge);
  const lastTick = Math.floor(maxAge);

  if (firstTick > lastTick) {
    return [];
  }

  return Array.from(
    { length: lastTick - firstTick + 1 },
    (_, index) => firstTick + index
  );
}

const validationFieldMarkerKeys: Partial<
  Record<PensionValidationIssue["field"], MilestoneKey>
> = {
  requirementAge: "retirementAge",
  alphaPensionLeaveAge: "alphaLeaveAge",
  alphaPensionDrawAge: "alphaStartAge",
  sippDrawAge: "sippAccessAge",
  sippWithdrawalTargetAge: "sippUseByAge",
  isaDrawAge: "isaAccessAge",
  isaWithdrawalTargetAge: "isaUseByAge",
  lisaDrawAge: "lisaAccessAge",
  lisaWithdrawalTargetAge: "lisaUseByAge",
  partialRetirementStartAge: "partialRetirementStartAge",
  statePensionDrawDate: "statePensionAge",
};

const spendingSmileValidationMarkerKeys: Record<string, MilestoneKey> = {
  slowGoStartAge: "slowGoStartAge",
  noGoStartAge: "noGoStartAge",
};

function getInvalidMarkerKeys(validationIssues: PensionValidationIssue[]) {
  const markerKeys = new Set<MilestoneKey>();

  for (const issue of validationIssues) {
    const markerKey =
      validationFieldMarkerKeys[issue.field] ??
      (issue.field === "spendingSmile" && issue.itemId
        ? spendingSmileValidationMarkerKeys[issue.itemId]
        : undefined);

    if (markerKey) {
      markerKeys.add(markerKey);
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

  if (marker.key === "lisaAccessAge") {
    return "LISA start";
  }

  if (marker.key === "lisaUseByAge") {
    return "LISA stop";
  }

  return marker.shortLabel;
}

function createMobileRetirementIncomeSummary({
  displayedData,
  displayedTargetIncomeAnnual,
  isSimplePresentation,
  retirementAge,
  showStatePension,
  statePensionAge,
  alphaStartAge,
}: {
  displayedData: RetirementIncomePoint[];
  displayedTargetIncomeAnnual: number;
  isSimplePresentation: boolean;
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
      ? `Ages ${formatAgeValue(firstShortfallPoint.age)}-${formatAgeValue(lastShortfallPoint.age)}`
      : isSimplePresentation
        ? "No ages with less than you want"
        : "No modelled shortfall";

  return [
    {
      label: isSimplePresentation ? "Amount you want" : "Target",
      value: `${formatCurrency(displayedTargetIncomeAnnual)} / year`,
    },
    {
      label: getRetirementIncomeShortfallLabel(isSimplePresentation),
      value: shortfallValue,
    },
    {
      label: showStatePension ? "State Pension" : "Alpha pension",
      value: `Age ${formatAgeValue(
        showStatePension ? statePensionAge : alphaStartAge
      )}`,
    },
  ];
}

function getRetirementIncomeShortfallLabel(isSimplePresentation: boolean) {
  return isSimplePresentation
    ? "Less than you want"
    : RETIREMENT_CHART_OVERLAY_META.shortfall.label;
}

function getFlexibleSurplusData(
  data: RetirementIncomePoint[],
  visible: boolean
) {
  return visible ? data : [];
}

function FlexibleSurplusLegend({ visible }: { visible: boolean }) {
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

function toSvgPath(path: string | null) {
  return path ?? undefined;
}

function SurplusTextEquivalent({
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

function createSurplusSummaryPoints(data: RetirementIncomePoint[]) {
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

type RetirementIncomeMobileNavigationProps = {
  isCompact: boolean;
  isVisible: boolean;
  limits: RetirementIncomeChartLimits;
  selectedMobileMarker: VisibleMilestoneMarker | undefined;
  visibleMilestoneMarkers: VisibleMilestoneMarker[];
  onChangeParameters: (patch: Partial<RetirementIncomeChartParameters>) => void;
  onSelectMobileMarker: (key: MilestoneKey) => void;
  onToggleVisibility: () => void;
};

function RetirementIncomeMobileNavigation({
  isCompact,
  isVisible,
  limits,
  selectedMobileMarker,
  visibleMilestoneMarkers,
  onChangeParameters,
  onSelectMobileMarker,
  onToggleVisibility,
}: RetirementIncomeMobileNavigationProps) {
  if (!selectedMobileMarker || !isCompact) {
    return null;
  }

  const markerLimit = limits[selectedMobileMarker.key];

  return (
    <>
      <button
        type="button"
        className="retirement-income-mobile-navigation-toggle"
        aria-expanded={isVisible}
        onClick={onToggleVisibility}
      >
        {isVisible ? "Hide chart controls" : "Show chart controls"}
      </button>
      {isVisible ? (
        <div className="retirement-income-mobile-navigation">
          <label>
            <span>Chart section</span>
            <select
              className="select-input"
              value={selectedMobileMarker.key}
              onChange={(event) =>
                onSelectMobileMarker(event.target.value as MilestoneKey)
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
              min={markerLimit.min}
              max={markerLimit.max}
              step={markerLimit.step}
              value={selectedMobileMarker.age.toString()}
              disabled={!selectedMobileMarker.editable}
              onChange={(event) =>
                onChangeParameters({
                  [selectedMobileMarker.key]: snapToLimit(
                    Number(event.target.value),
                    markerLimit
                  ),
                })
              }
            />
          </label>
          <input
            aria-label={`Chart ${selectedMobileMarker.label} age`}
            type="range"
            min={markerLimit.min}
            max={markerLimit.max}
            step={markerLimit.step}
            value={selectedMobileMarker.age}
            disabled={!selectedMobileMarker.editable}
            onChange={(event) =>
              onChangeParameters({
                [selectedMobileMarker.key]: snapToLimit(
                  Number(event.target.value),
                  markerLimit
                ),
              })
            }
          />
        </div>
      ) : null}
    </>
  );
}

function isIncomeSourceEnabled(
  key: IncomeKey,
  state: Pick<
    RetirementIncomeChartParameters,
    | "showAlpha"
    | "showClassic"
    | "showClassicPlus"
    | "showCsAvc"
    | "partialRetirementEnabled"
    | "showIsa"
    | "showLisa"
    | "showNuvos"
    | "showPremium"
    | "showSipp"
    | "showStatePension"
  >
) {
  if (key === "alphaIncomeAnnual") {
    return state.showAlpha;
  }

  if (key === "classicIncomeAnnual") {
    return state.showClassic;
  }

  if (key === "classicPlusIncomeAnnual") {
    return state.showClassicPlus;
  }

  if (key === "csAvcIncomeAnnual") {
    return state.showCsAvc;
  }

  if (key === "isaIncomeAnnual") {
    return state.showIsa;
  }

  if (key === "lisaIncomeAnnual") {
    return state.showLisa;
  }

  if (key === "sippIncomeAnnual") {
    return state.showSipp;
  }

  if (key === "nuvosIncomeAnnual") {
    return state.showNuvos;
  }

  if (key === "premiumIncomeAnnual") {
    return state.showPremium;
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
): Partial<RetirementIncomeChartParameters> | null {
  if (key === "alphaIncomeAnnual") {
    return { showAlpha: enabled };
  }

  if (key === "classicIncomeAnnual") {
    return { showClassic: enabled };
  }

  if (key === "classicPlusIncomeAnnual") {
    return { showClassicPlus: enabled };
  }

  if (key === "csAvcIncomeAnnual") {
    return { showCsAvc: enabled };
  }

  if (key === "isaIncomeAnnual") {
    return { showIsa: enabled };
  }

  if (key === "lisaIncomeAnnual") {
    return { showLisa: enabled };
  }

  if (key === "sippIncomeAnnual") {
    return { showSipp: enabled };
  }

  if (key === "nuvosIncomeAnnual") {
    return { showNuvos: enabled };
  }

  if (key === "premiumIncomeAnnual") {
    return { showPremium: enabled };
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
  return formatModelAgeCompact(value);
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
