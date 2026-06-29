import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import {
  RetirementIncomeBridgeChart,
  type RetirementIncomeBridgeChartProps,
  type RetirementIncomePoint,
} from "./RetirementIncomeBridgeChart";

const basePoint: RetirementIncomePoint = {
  date: "2026-01-01",
  age: 40.5,
  targetIncomeAnnual: 31700,
  isaIncomeAnnual: 0,
  sippIncomeAnnual: 0,
  partialRetirementIncomeAnnual: 0,
  alphaIncomeAnnual: 0,
  nuvosIncomeAnnual: 0,
  statePensionIncomeAnnual: 0,
  totalIncomeAnnual: 0,
  assessedIncomeAnnual: 0,
  shortfallAnnual: 0,
  phase: "build-up",
};

const baseProps: RetirementIncomeBridgeChartProps = {
  data: [
    basePoint,
    {
      ...basePoint,
      date: "2045-07-01",
      age: 60,
      alphaIncomeAnnual: 18000,
      totalIncomeAnnual: 18000,
      assessedIncomeAnnual: 18000,
      shortfallAnnual: 13700,
      phase: "alpha-only",
    },
    {
      ...basePoint,
      date: "2065-07-01",
      age: 80,
      alphaIncomeAnnual: 18000,
      statePensionIncomeAnnual: 10000,
      totalIncomeAnnual: 28000,
      assessedIncomeAnnual: 28000,
      shortfallAnnual: 3700,
      phase: "alpha-state",
    },
  ],
  targetIncomeAnnual: 31700,
  alphaMonthlyAddedPension: 0,
  isaMonthlyContribution: 0,
  sippMonthlyContribution: 0,
  retirementAge: 60,
  alphaLeaveAge: 55,
  sippAccessAge: 57,
  sippUseByAge: 60,
  isaAccessAge: 60,
  alphaStartAge: 60,
  nuvosStartAge: 60,
  isaUseByAge: 60,
  partialRetirementStartAge: 55,
  partialRetirementWorkPercent: 50,
  partialRetirementEnabled: false,
  statePensionAge: 67,
  showAlpha: true,
  showIsa: false,
  showSipp: false,
  sippUseByAgeEnabled: false,
  showNuvos: false,
  isaUseByAgeEnabled: false,
  showStatePension: true,
  limits: {
    targetIncomeAnnual: { min: 0, max: 200000, step: 600 },
    alphaMonthlyAddedPension: { min: 0, max: 2000, step: 25 },
    isaMonthlyContribution: { min: 0, max: 5000, step: 25 },
    sippMonthlyContribution: { min: 0, max: 5000, step: 25 },
    retirementAge: { min: 40, max: 67, step: 1 },
    alphaLeaveAge: { min: 40, max: 67, step: 1 },
    sippAccessAge: { min: 57, max: 67, step: 1 },
    sippUseByAge: { min: 57.25, max: 80, step: 1 },
    isaAccessAge: { min: 40, max: 67, step: 1 },
    alphaStartAge: { min: 60, max: 67, step: 1 },
    nuvosStartAge: { min: 60, max: 67, step: 1 },
    isaUseByAge: { min: 60.25, max: 80, step: 1 },
    partialRetirementStartAge: { min: 40, max: 59.75, step: 1 },
    partialRetirementWorkPercent: { min: 0, max: 100, step: 1 },
    statePensionAge: { min: 67, max: 80, step: 1 },
  },
  onChangeParameters: vi.fn(),
};

function renderChart(props: Partial<RetirementIncomeBridgeChartProps> = {}) {
  return render(<RetirementIncomeBridgeChart {...baseProps} {...props} />);
}

function mockChartResize(width: number, height = 420) {
  class MockResizeObserver implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    observe() {
      this.callback(
        [
          {
            borderBoxSize: [],
            contentBoxSize: [],
            contentRect: {
              bottom: height,
              height,
              left: 0,
              right: width,
              top: 0,
              width,
              x: 0,
              y: 0,
              toJSON: () => "",
            },
            devicePixelContentBoxSize: [],
            target: document.body,
          },
        ],
        this
      );
    }

    disconnect() {}

    unobserve() {}

    takeRecords() {
      return [];
    }
  }

  vi.stubGlobal("ResizeObserver", MockResizeObserver);
}

function getTargetLinePath() {
  return screen
    .getByRole("slider", { name: "Target income line" })
    .getAttribute("d");
}

function getShortfallFillPath() {
  return document.querySelector(".bridge-shortfall-fill")?.getAttribute("d");
}

function getXAxisLabels() {
  return [...document.querySelectorAll(".bridge-x-tick text")].map(
    (node) => node.textContent
  );
}

function getXAxisYearTickAges() {
  return [...document.querySelectorAll(".bridge-x-year-tick")].map((node) =>
    Number(node.getAttribute("data-age"))
  );
}

function getXAxisYearTickLength(age: number) {
  const line = document.querySelector(
    `.bridge-x-year-tick[data-age="${age}"] line`
  );

  return (
    Number(line?.getAttribute("y2") ?? 0) -
    Number(line?.getAttribute("y1") ?? 0)
  );
}

function getBuildUpBandWidth() {
  const width = document
    .querySelector(".bridge-build-up-band")
    ?.getAttribute("width");

  return Number(width);
}

function getMilestoneHitAreas() {
  return [
    ...document.querySelectorAll(
      ".bridge-milestone > rect[aria-hidden='true']"
    ),
  ].map((node) => ({
    height: Number(node.getAttribute("height")),
    y: Number(node.getAttribute("y")),
  }));
}

function getMilestoneLabelsInRenderOrder() {
  return [...document.querySelectorAll(".bridge-milestone")].map((node) =>
    node.getAttribute("aria-label")
  );
}

function getMilestoneLineX(label: RegExp | string) {
  return Number(
    screen
      .getByRole("slider", { name: label })
      .querySelector("line")
      ?.getAttribute("x1")
  );
}

function getIncomeAreaPath(strokeColour: string) {
  return (
    [...document.querySelectorAll("path")]
      .find((node) => node.getAttribute("stroke") === strokeColour)
      ?.getAttribute("d") ?? ""
  );
}

function getIncomeAreaStrokeColours() {
  return [...document.querySelectorAll("path[stroke]")]
    .map((node) => node.getAttribute("stroke"))
    .filter((stroke): stroke is string => Boolean(stroke));
}

function getMilestoneHandleFill(label: RegExp | string) {
  return screen
    .getByRole("slider", { name: label })
    .querySelector(".bridge-milestone-handle")
    ?.getAttribute("fill");
}

function expectPathToContainX(path: string, x: number) {
  const xCoordinates = [...path.matchAll(/-?\d+(?:\.\d+)?/g)]
    .map((match, index) => ({ index, value: Number(match[0]) }))
    .filter(({ index }) => index % 2 === 0)
    .map(({ value }) => value);

  expect(xCoordinates.some((value) => Math.abs(value - x) < 0.01)).toBe(true);
}

function getAreaActiveXRange(path: string) {
  const coordinates = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) =>
    Number(match[0])
  );
  const points = [];

  for (let index = 0; index < coordinates.length; index += 2) {
    points.push({ x: coordinates[index], y: coordinates[index + 1] });
  }

  const baselineY = Math.max(...points.map((point) => point.y));
  const activePoints = points.filter((point) => point.y < baselineY - 0.01);

  return {
    startX: activePoints[0]?.x ?? 0,
    endX: activePoints.at(-1)?.x ?? 0,
  };
}

describe("RetirementIncomeBridgeChart", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds unlabelled x-axis marks for whole years without adding more labels", () => {
    renderChart();

    const labels = getXAxisLabels();
    const yearTicks = getXAxisYearTickAges();

    expect(yearTicks.length).toBeGreaterThan(labels.length);
    expect(yearTicks.every((age) => Number.isInteger(age))).toBe(true);
    expect(labels.length).toBeLessThan(yearTicks.length);
    expect(getXAxisYearTickLength(60)).toBeGreaterThan(
      getXAxisYearTickLength(61)
    );
  });

  it("starts the target income line at the y axis", () => {
    renderChart({ retirementAge: 44, alphaStartAge: 44 });

    expect(getTargetLinePath()).toMatch(/^M0,/);
  });

  it("keeps upward target income drags from repeatedly inflating the y scale", () => {
    mockChartResize(960);

    const onChangeParameters =
      vi.fn<RetirementIncomeBridgeChartProps["onChangeParameters"]>();
    renderChart({ onChangeParameters });
    const svg = document.querySelector(".bridge-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected bridge chart svg to be rendered");
    }

    Object.defineProperty(svg, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 460,
        height: 460,
        left: 0,
        right: 960,
        top: 0,
        width: 960,
        x: 0,
        y: 0,
        toJSON: () => "",
      }),
    });

    const targetLine = screen.getByRole("slider", {
      name: "Target income line",
    });

    fireEvent.pointerDown(targetLine, {
      button: 0,
      clientX: 420,
      clientY: 86,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });

    for (let index = 0; index < 6; index += 1) {
      fireEvent.pointerMove(targetLine, {
        clientX: 420,
        clientY: 86,
        isPrimary: true,
        pointerId: 1,
        pointerType: "mouse",
      });
    }

    fireEvent.pointerUp(targetLine, {
      clientX: 420,
      clientY: 86,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(onChangeParameters).toHaveBeenCalledWith({
      targetIncomeAnnual: 49200,
    });
  });

  it("prevents page scrolling while the target income line is changed by touch", () => {
    mockChartResize(360);

    const onChangeParameters =
      vi.fn<RetirementIncomeBridgeChartProps["onChangeParameters"]>();
    renderChart({ onChangeParameters });
    const svg = document.querySelector(".bridge-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected bridge chart svg to be rendered");
    }

    Object.defineProperty(svg, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 420,
        height: 420,
        left: 0,
        right: 360,
        top: 0,
        width: 360,
        x: 0,
        y: 0,
        toJSON: () => "",
      }),
    });

    const targetLine = screen.getByRole("slider", {
      name: "Target income line",
    });
    const touchStartPreventDefault = vi.fn();
    const touchMovePreventDefault = vi.fn();

    const touchStartEvent = createEvent.touchStart(targetLine, {
      changedTouches: [{ identifier: 1, clientX: 180, clientY: 140 }],
      touches: [{ identifier: 1, clientX: 180, clientY: 140 }],
      cancelable: true,
    });
    Object.defineProperty(touchStartEvent, "preventDefault", {
      configurable: true,
      value: touchStartPreventDefault,
    });
    fireEvent(targetLine, touchStartEvent);

    const touchMoveEvent = createEvent.touchMove(targetLine, {
      changedTouches: [{ identifier: 1, clientX: 180, clientY: 110 }],
      touches: [{ identifier: 1, clientX: 180, clientY: 110 }],
      cancelable: true,
    });
    Object.defineProperty(touchMoveEvent, "preventDefault", {
      configurable: true,
      value: touchMovePreventDefault,
    });
    fireEvent(targetLine, touchMoveEvent);

    fireEvent.touchEnd(targetLine, {
      changedTouches: [{ identifier: 1, clientX: 180, clientY: 110 }],
      touches: [],
    });

    expect(touchStartPreventDefault).toHaveBeenCalled();
    expect(touchMovePreventDefault).toHaveBeenCalled();
    expect(onChangeParameters).toHaveBeenCalledWith({
      targetIncomeAnnual: 27600,
    });
  });

  it("updates monthly added pension when the Alpha pension top edge is dragged", () => {
    mockChartResize(960);

    const onChangeParameters =
      vi.fn<RetirementIncomeBridgeChartProps["onChangeParameters"]>();
    renderChart({ onChangeParameters });
    const svg = document.querySelector(".bridge-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected bridge chart svg to be rendered");
    }

    Object.defineProperty(svg, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 460,
        height: 460,
        left: 0,
        right: 960,
        top: 0,
        width: 960,
        x: 0,
        y: 0,
        toJSON: () => "",
      }),
    });

    const alphaEdge = screen.getByRole("slider", {
      name: "Alpha added pension top edge",
    });

    fireEvent.pointerDown(alphaEdge, {
      button: 0,
      clientX: 500,
      clientY: 260,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(alphaEdge, {
      clientX: 500,
      clientY: 230,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(alphaEdge, {
      clientX: 500,
      clientY: 230,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(onChangeParameters).toHaveBeenCalled();
    const patch = onChangeParameters.mock.calls[0]?.[0];
    expect(patch).toBeDefined();
    expect(patch.alphaMonthlyAddedPension).toBeGreaterThan(0);
    expect(patch.alphaMonthlyAddedPension! % 25).toBe(0);
  });

  it("extends the x-axis left while a milestone is dragged beyond the plot edge", () => {
    mockChartResize(960);

    renderChart();
    const svg = document.querySelector(".bridge-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected bridge chart svg to be rendered");
    }

    Object.defineProperty(svg, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 460,
        height: 460,
        left: 0,
        right: 960,
        top: 0,
        width: 960,
        x: 0,
        y: 0,
        toJSON: () => "",
      }),
    });

    const initialFirstTick = Math.min(...getXAxisYearTickAges());
    const alphaLeaveMarker = screen.getByRole("slider", {
      name: /Leave alpha, age 55/i,
    });

    fireEvent.pointerDown(alphaLeaveMarker, {
      button: 0,
      clientX: getMilestoneLineX(/Leave alpha, age 55/i) + 78,
      clientY: 150,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(window, {
      clientX: 20,
      clientY: 150,
      pointerId: 1,
    });

    expect(Math.min(...getXAxisYearTickAges())).toBeLessThan(initialFirstTick);

    fireEvent.pointerCancel(window, {
      clientX: 20,
      clientY: 150,
      pointerId: 1,
    });
  });

  it("extends stepped shortfall shading to the alpha start boundary", () => {
    renderChart({
      data: [
        {
          ...basePoint,
          date: "2054-12-15",
          age: 66.5,
          targetIncomeAnnual: 31700,
          assessedIncomeAnnual: 31700,
          phase: "build-up",
        },
        {
          ...basePoint,
          date: "2055-03-15",
          age: 66.75,
          targetIncomeAnnual: 31700,
          assessedIncomeAnnual: 0,
          shortfallAnnual: 31700,
          phase: "build-up",
        },
        {
          ...basePoint,
          date: "2055-08-15",
          age: 67 + 2 / 12,
          targetIncomeAnnual: 31700,
          assessedIncomeAnnual: 0,
          shortfallAnnual: 31700,
          phase: "build-up",
        },
        {
          ...basePoint,
          date: "2055-09-15",
          age: 67.25,
          targetIncomeAnnual: 31700,
          alphaIncomeAnnual: 31700,
          totalIncomeAnnual: 31700,
          assessedIncomeAnnual: 31700,
          shortfallAnnual: 0,
          phase: "alpha-only",
        },
        {
          ...basePoint,
          date: "2056-06-15",
          age: 68,
          targetIncomeAnnual: 31700,
          alphaIncomeAnnual: 31700,
          totalIncomeAnnual: 31700,
          assessedIncomeAnnual: 31700,
          shortfallAnnual: 0,
          phase: "alpha-state",
        },
      ],
      retirementAge: 66.75,
      alphaLeaveAge: 66.75,
      alphaStartAge: 67.25,
      statePensionAge: 68,
    });

    const alphaStartX = screen
      .getByRole("slider", { name: /Start Alpha/ })
      .querySelector("line")
      ?.getAttribute("x1");

    expect(alphaStartX).toBeDefined();
    expect(getShortfallFillPath()).toContain(alphaStartX);
  });

  it("starts with a 2.5-year build-up window and expands for earlier milestones", () => {
    renderChart();

    expect(screen.queryByLabelText("Build-up shown")).not.toBeInTheDocument();
    expect(getXAxisLabels()[0]).toBe("55");
    expect(getBuildUpBandWidth()).toBeGreaterThan(0);
  });

  it("labels the bridge series as ISA and SIPP in the chart legend", () => {
    renderChart();

    expect(
      screen.getByRole("button", { name: "Toggle chart ISA source" })
    ).toHaveTextContent("ISA");
    expect(
      screen.getByRole("button", { name: "Toggle chart SIPP source" })
    ).toHaveTextContent("SIPP");
  });

  it("matches ISA and SIPP start and stop handles to the legend colours", () => {
    renderChart({
      showIsa: true,
      showSipp: true,
      isaUseByAgeEnabled: true,
      sippUseByAgeEnabled: true,
    });

    expect(getMilestoneHandleFill(/ISA start/i)).toBe("#1f8ee6");
    expect(getMilestoneHandleFill(/ISA stop/i)).toBe("#1f8ee6");
    expect(getMilestoneHandleFill(/SIPP start/i)).toBe("#148c55");
    expect(getMilestoneHandleFill(/SIPP stop/i)).toBe("#148c55");
  });

  it("uses the legend order for stacked income areas that start together", () => {
    renderChart({
      data: [
        {
          ...basePoint,
          date: "2045-01-01",
          age: 60,
          isaIncomeAnnual: 4000,
          sippIncomeAnnual: 12000,
          totalIncomeAnnual: 16000,
          assessedIncomeAnnual: 16000,
          phase: "sipp-bridge",
        },
        {
          ...basePoint,
          date: "2046-01-01",
          age: 61,
          isaIncomeAnnual: 16000,
          sippIncomeAnnual: 3000,
          totalIncomeAnnual: 19000,
          assessedIncomeAnnual: 19000,
          phase: "sipp-bridge",
        },
        {
          ...basePoint,
          date: "2047-01-01",
          age: 62,
          sippIncomeAnnual: 15000,
          totalIncomeAnnual: 15000,
          assessedIncomeAnnual: 15000,
          phase: "sipp-bridge",
        },
      ],
      showIsa: true,
      showSipp: true,
      showStatePension: false,
    });

    expect(getIncomeAreaStrokeColours().slice(0, 2)).toEqual([
      "#1f8ee6",
      "#148c55",
    ]);
  });

  it("keeps the first active bridge area at the bottom when a later source starts", () => {
    renderChart({
      data: [
        {
          ...basePoint,
          date: "2043-01-01",
          age: 58,
          sippIncomeAnnual: 12000,
          totalIncomeAnnual: 12000,
          assessedIncomeAnnual: 12000,
          phase: "sipp-bridge",
        },
        {
          ...basePoint,
          date: "2044-01-01",
          age: 59,
          sippIncomeAnnual: 12000,
          totalIncomeAnnual: 12000,
          assessedIncomeAnnual: 12000,
          phase: "sipp-bridge",
        },
        {
          ...basePoint,
          date: "2045-01-01",
          age: 60,
          isaIncomeAnnual: 8000,
          sippIncomeAnnual: 12000,
          totalIncomeAnnual: 20000,
          assessedIncomeAnnual: 20000,
          phase: "sipp-bridge",
        },
        {
          ...basePoint,
          date: "2046-01-01",
          age: 61,
          isaIncomeAnnual: 15000,
          sippIncomeAnnual: 3000,
          totalIncomeAnnual: 18000,
          assessedIncomeAnnual: 18000,
          phase: "sipp-bridge",
        },
      ],
      showIsa: true,
      showSipp: true,
      sippAccessAge: 58,
      isaAccessAge: 60,
      showStatePension: false,
    });

    expect(getIncomeAreaStrokeColours().slice(0, 2)).toEqual([
      "#148c55",
      "#1f8ee6",
    ]);
  });

  it("moves the build-up window earlier when leave alpha is dragged earlier", () => {
    const view = renderChart({
      alphaLeaveAge: 59,
      retirementAge: 60,
    });
    const laterFirstLabel = Number(getXAxisLabels()[0]);

    view.unmount();

    renderChart({
      alphaLeaveAge: 55,
      retirementAge: 60,
    });

    expect(Number(getXAxisLabels()[0])).toBeLessThan(laterFirstLabel);
    expect(getBuildUpBandWidth()).toBeGreaterThan(0);
  });

  it("keeps the build-up shading running to retirement even when leave alpha is earlier", () => {
    renderChart({
      alphaLeaveAge: 55,
      retirementAge: 60,
    });

    expect(getBuildUpBandWidth()).toBeCloseTo(
      getMilestoneLineX(/Retire, age 60/i),
      5
    );
  });

  it("updates a milestone from window pointer events after touch drag starts", () => {
    mockChartResize(360);

    const onChangeParameters = vi.fn();
    renderChart({ onChangeParameters });
    const svg = document.querySelector(".bridge-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected bridge chart svg to be rendered");
    }

    Object.defineProperty(svg, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 420,
        height: 420,
        left: 0,
        right: 360,
        top: 0,
        width: 360,
        x: 0,
        y: 0,
        toJSON: () => "",
      }),
    });

    const retirementMarker = screen.getByRole("slider", {
      name: /Retire, age 60/i,
    });

    fireEvent.pointerDown(retirementMarker, {
      button: 0,
      clientX: 109,
      clientY: 150,
      isPrimary: true,
      pointerId: 1,
      pointerType: "touch",
    });
    fireEvent.pointerMove(window, {
      clientX: 97,
      clientY: 150,
      pointerId: 1,
    });
    fireEvent.pointerUp(window, {
      clientX: 97,
      clientY: 150,
      pointerId: 1,
    });

    expect(onChangeParameters).toHaveBeenCalledWith({ retirementAge: 57 });
  });

  it("uses whole-year steps for the mobile age input", () => {
    mockChartResize(360);

    renderChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Show chart controls" })
    );

    expect(screen.getByRole("spinbutton", { name: "Age" })).toHaveAttribute(
      "step",
      "1"
    );
  });

  it("hides mobile chart controls until requested", () => {
    mockChartResize(360);

    renderChart();

    expect(
      screen.queryByRole("spinbutton", { name: "Age" })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Show chart controls" })
    );

    expect(screen.getByRole("spinbutton", { name: "Age" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide chart controls" })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("brings the active dragged milestone to the front", () => {
    renderChart({
      showSipp: true,
      sippAccessAge: 60,
    });

    expect(getMilestoneLabelsInRenderOrder().at(-1)).toMatch(
      /Start State, age 67/i
    );

    fireEvent.pointerDown(screen.getByRole("slider", { name: /Retire/i }), {
      button: 0,
      clientX: 120,
      clientY: 150,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(getMilestoneLabelsInRenderOrder().at(-1)).toMatch(/Retire, age 60/i);
  });

  it("does not show the selected milestone label in the mobile marker summary", () => {
    mockChartResize(360);

    renderChart();

    expect(screen.queryByText("Selected milestone")).not.toBeInTheDocument();
  });

  it("updates a milestone from window touch events after touch drag starts", () => {
    mockChartResize(360);

    const onChangeParameters = vi.fn();
    renderChart({ onChangeParameters });
    const svg = document.querySelector(".bridge-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected bridge chart svg to be rendered");
    }

    Object.defineProperty(svg, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 420,
        height: 420,
        left: 0,
        right: 360,
        top: 0,
        width: 360,
        x: 0,
        y: 0,
        toJSON: () => "",
      }),
    });

    const retirementMarker = screen.getByRole("slider", {
      name: /Retire, age 60/i,
    });

    fireEvent.touchStart(retirementMarker, {
      changedTouches: [
        {
          identifier: 1,
          clientX: 109,
          clientY: 150,
        },
      ],
      touches: [
        {
          identifier: 1,
          clientX: 109,
          clientY: 150,
        },
      ],
    });
    fireEvent.touchMove(window, {
      changedTouches: [
        {
          identifier: 1,
          clientX: 97,
          clientY: 150,
        },
      ],
      touches: [
        {
          identifier: 1,
          clientX: 97,
          clientY: 150,
        },
      ],
    });
    fireEvent.touchEnd(window, {
      changedTouches: [
        {
          identifier: 1,
          clientX: 97,
          clientY: 150,
        },
      ],
      touches: [],
    });

    expect(onChangeParameters).toHaveBeenCalledWith({ retirementAge: 57 });
  });

  it("updates a milestone from element touch events on the first drag", () => {
    mockChartResize(360);

    const onChangeParameters = vi.fn();
    renderChart({ onChangeParameters });
    const svg = document.querySelector(".bridge-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected bridge chart svg to be rendered");
    }

    Object.defineProperty(svg, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 420,
        height: 420,
        left: 0,
        right: 360,
        top: 0,
        width: 360,
        x: 0,
        y: 0,
        toJSON: () => "",
      }),
    });

    const retirementMarker = screen.getByRole("slider", {
      name: /Retire, age 60/i,
    });

    fireEvent.touchStart(retirementMarker, {
      timeStamp: 100,
      changedTouches: [{ identifier: 1, clientX: 109, clientY: 150 }],
      touches: [{ identifier: 1, clientX: 109, clientY: 150 }],
    });
    const touchMoveEvent = createEvent.touchMove(retirementMarker, {
      changedTouches: [{ identifier: 1, clientX: 97, clientY: 150 }],
      touches: [{ identifier: 1, clientX: 97, clientY: 150 }],
      bubbles: false,
      cancelable: true,
    });
    Object.defineProperty(touchMoveEvent, "preventDefault", {
      configurable: true,
      value: vi.fn(() => {
        throw new Error(
          "Touch drag should not call preventDefault from the React touchmove handler"
        );
      }),
    });
    fireEvent(retirementMarker, touchMoveEvent);
    fireEvent.touchEnd(retirementMarker, {
      changedTouches: [{ identifier: 1, clientX: 97, clientY: 150 }],
      touches: [],
    });

    expect(onChangeParameters).toHaveBeenCalledWith({ retirementAge: 57 });
  });

  it("does not let leave alpha move past retirement during chart interaction", () => {
    const onChangeParameters = vi.fn();

    renderChart({
      alphaLeaveAge: 60,
      retirementAge: 60,
      limits: {
        ...baseProps.limits,
        alphaLeaveAge: { min: 40, max: 60, step: 1 },
      },
      onChangeParameters,
    });

    fireEvent.keyDown(screen.getByLabelText("Leave Alpha, age 60"), {
      key: "ArrowRight",
    });

    expect(onChangeParameters).toHaveBeenCalledWith({ alphaLeaveAge: 60 });
  });

  it("gives aligned milestones separate hit areas around each handle", () => {
    renderChart({
      alphaLeaveAge: 60,
      alphaStartAge: 60,
      nuvosStartAge: 60,
      retirementAge: 60,
      statePensionAge: 60,
      showNuvos: true,
    });

    const hitAreas = getMilestoneHitAreas();

    expect(hitAreas).toHaveLength(5);
    expect(new Set(hitAreas.map((area) => area.y)).size).toBeGreaterThan(1);
    expect(hitAreas.every((area) => area.height < 200)).toBe(true);
  });

  it("renders a Start Nuvos milestone when nuvos is enabled", () => {
    renderChart({
      showNuvos: true,
      nuvosStartAge: 66,
    });

    expect(
      screen.getByRole("slider", { name: "Start Nuvos, age 66" })
    ).toBeInTheDocument();
  });

  it("aligns the ISA area boundaries with the ISA markers", () => {
    renderChart({
      data: [
        {
          ...basePoint,
          date: "2045-06-01",
          age: 58,
        },
        {
          ...basePoint,
          date: "2046-09-01",
          age: 59.25,
        },
        {
          ...basePoint,
          date: "2046-10-01",
          age: 59 + 4 / 12,
          isaIncomeAnnual: 12000,
          totalIncomeAnnual: 12000,
          assessedIncomeAnnual: 12000,
          phase: "isa-bridge",
        },
        {
          ...basePoint,
          date: "2052-01-01",
          age: 64 + 7 / 12,
          isaIncomeAnnual: 12000,
          totalIncomeAnnual: 12000,
          assessedIncomeAnnual: 12000,
          phase: "isa-bridge",
        },
        {
          ...basePoint,
          date: "2053-03-01",
          age: 65.75,
          isaIncomeAnnual: 12000,
          totalIncomeAnnual: 12000,
          assessedIncomeAnnual: 12000,
          phase: "isa-bridge",
        },
        {
          ...basePoint,
          date: "2053-06-01",
          age: 66,
          phase: "alpha-only",
        },
      ],
      showIsa: true,
      isaAccessAge: 59.25,
      isaUseByAge: 65.75,
      isaUseByAgeEnabled: true,
      showStatePension: false,
    });

    const isaPath = getIncomeAreaPath("#1f8ee6");
    const isaStartX = getMilestoneLineX(/ISA start, age 59.25/i);
    const isaUseByX = getMilestoneLineX(/ISA stop, age 65.75/i);
    const isaActiveRange = getAreaActiveXRange(isaPath);

    expectPathToContainX(isaPath, isaStartX);
    expectPathToContainX(isaPath, isaUseByX);
    expect(isaActiveRange.startX).toBeCloseTo(isaStartX, 2);
    expect(isaActiveRange.endX).toBeCloseTo(isaUseByX, 2);
  });

  it("aligns the SIPP area boundaries with the SIPP markers", () => {
    renderChart({
      data: [
        {
          ...basePoint,
          date: "2045-06-01",
          age: 58,
        },
        {
          ...basePoint,
          date: "2046-09-01",
          age: 59.25,
        },
        {
          ...basePoint,
          date: "2046-10-01",
          age: 59 + 4 / 12,
          sippIncomeAnnual: 15000,
          totalIncomeAnnual: 15000,
          assessedIncomeAnnual: 15000,
          phase: "sipp-bridge",
        },
        {
          ...basePoint,
          date: "2053-01-01",
          age: 65 + 7 / 12,
          sippIncomeAnnual: 15000,
          totalIncomeAnnual: 15000,
          assessedIncomeAnnual: 15000,
          phase: "sipp-bridge",
        },
        {
          ...basePoint,
          date: "2054-03-01",
          age: 66.75,
          sippIncomeAnnual: 15000,
          totalIncomeAnnual: 15000,
          assessedIncomeAnnual: 15000,
          phase: "sipp-bridge",
        },
        {
          ...basePoint,
          date: "2054-06-01",
          age: 67,
          phase: "alpha-only",
        },
      ],
      showSipp: true,
      sippAccessAge: 59.25,
      sippUseByAge: 66.75,
      sippUseByAgeEnabled: true,
      showStatePension: false,
    });

    const sippPath = getIncomeAreaPath("#148c55");
    const sippStartX = getMilestoneLineX(/SIPP start, age 59.25/i);
    const sippUseByX = getMilestoneLineX(/SIPP stop, age 66.75/i);
    const sippActiveRange = getAreaActiveXRange(sippPath);

    expectPathToContainX(sippPath, sippStartX);
    expectPathToContainX(sippPath, sippUseByX);
    expect(sippActiveRange.startX).toBeCloseTo(sippStartX, 2);
    expect(sippActiveRange.endX).toBeCloseTo(sippUseByX, 2);
  });
});
