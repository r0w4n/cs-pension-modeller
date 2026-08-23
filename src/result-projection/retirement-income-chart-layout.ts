import * as d3 from "d3";
import type { PensionValidationIssue } from "../settings";
import type {
  RetirementIncomeChartParameters,
  RetirementIncomeMilestone,
  RetirementIncomeMilestoneKey,
  RetirementIncomePoint,
} from "./retirement-income-chart-model";

export type IncomeKey =
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

type MilestoneKey = RetirementIncomeMilestoneKey;
type MilestoneMarker = RetirementIncomeMilestone;

export const incomeKeys: IncomeKey[] = [
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

export const sourceMeta: Record<
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

const DEFAULT_BUILD_UP_WINDOW_YEARS = 2.5;
export const HANDLE_LABEL_WIDTH = 24;
export const HANDLE_LABEL_HEIGHT = 84;
const HANDLE_LABEL_STACK_GAP = 16;
const HANDLE_LABEL_STACK_SPACING = HANDLE_LABEL_HEIGHT + HANDLE_LABEL_STACK_GAP;

export function createVisibleChartData(
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

export function createActiveMilestoneAges({
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

export function createActiveMilestoneBoundaries(
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

export function createChartMaxAge({
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

export function filterFiniteAges(ages: Array<number | null>) {
  return ages.filter(
    (age): age is number => age !== null && Number.isFinite(age)
  );
}

export function createBuildUpWindow({
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

export function createBuildUpEndAge({
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

export function createChartIncomeSeriesDefinitions(
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

export function getChartIncomeGradientId(key: string) {
  return `retirement-income-gradient-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function getChartIncomeValue(
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

export function createStackedIncomeSeries(
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

export function hasActiveIncome(
  data: RetirementIncomePoint[],
  series: ChartIncomeSeriesDefinition
) {
  return data.some((point) => getChartIncomeValue(point, series) > 0);
}

export function createMarkerLayouts<
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

export function bringActiveMarkerToFront<T extends MilestoneMarker>(
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

export function createWholeYearTicks(minAge: number, maxAge: number) {
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

export function getInvalidMarkerKeys(
  validationIssues: PensionValidationIssue[]
) {
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

export function getMarkerHandleLabel(marker: MilestoneMarker) {
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

function areAgesEquivalent(firstAge: number, secondAge: number) {
  return Math.abs(firstAge - secondAge) < 0.001;
}
