import {
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  RetirementIncomeChart,
  type RetirementIncomeChartProps,
  type RetirementIncomeChartReadOnlyProps,
  type RetirementIncomePoint,
} from "./RetirementIncomeChart";
import { LISA_MONTHLY_CONTRIBUTION_MAX } from "./settings";

const basePoint: RetirementIncomePoint = {
  date: "2026-01-01",
  age: 40.5,
  targetIncomeAnnual: 31700,
  isaIncomeAnnual: 0,
  lisaIncomeAnnual: 0,
  sippIncomeAnnual: 0,
  csAvcIncomeAnnual: 0,
  partialRetirementIncomeAnnual: 0,
  alphaIncomeAnnual: 0,
  classicIncomeAnnual: 0,
  classicPlusIncomeAnnual: 0,
  nuvosIncomeAnnual: 0,
  premiumIncomeAnnual: 0,
  additionalGuaranteedIncomeAnnual: 0,
  statePensionIncomeAnnual: 0,
  totalIncomeAnnual: 0,
  assessedIncomeAnnual: 0,
  shortfallAnnual: 0,
  guaranteedNetIncomeAnnual: 0,
  unavoidableSurplusAnnual: 0,
  avoidableFlexibleSurplusAnnual: 0,
  flexibleWithdrawalInsights: [],
};

const baseProps: RetirementIncomeChartProps = {
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
    },
  ],
  targetIncomeAnnual: 31700,
  spendingSmileEnabled: false,
  goGoPercentage: 100,
  slowGoStartAge: 75,
  slowGoPercentage: 85,
  noGoStartAge: 80,
  noGoPercentage: 70,
  alphaMonthlyAddedPension: 0,
  isaMonthlyContribution: 0,
  lisaMonthlyContribution: 0,
  sippMonthlyContribution: 0,
  retirementAge: 60,
  alphaLeaveAge: 55,
  sippAccessAge: 57,
  sippUseByAge: 60,
  isaAccessAge: 60,
  lisaAccessAge: 60,
  alphaStartAge: 60,
  nuvosStartAge: 60,
  premiumStartAge: 60,
  isaUseByAge: 60,
  lisaUseByAge: 75,
  partialRetirementStartAge: 55,
  partialRetirementWorkPercent: 50,
  partialRetirementEnabled: false,
  statePensionAge: 67,
  showAlpha: true,
  showClassic: false,
  showClassicPlus: false,
  showCsAvc: false,
  showIsa: false,
  showLisa: false,
  showSipp: false,
  sippUseByAgeEnabled: false,
  showNuvos: false,
  showPremium: false,
  isaUseByAgeEnabled: false,
  lisaUseByAgeEnabled: false,
  showStatePension: true,
  limits: {
    targetIncomeAnnual: { min: 0, max: 200000, step: 600 },
    alphaMonthlyAddedPension: { min: 0, max: 2000, step: 25 },
    isaMonthlyContribution: { min: 0, max: 2000, step: 25 },
    lisaMonthlyContribution: {
      min: 0,
      max: LISA_MONTHLY_CONTRIBUTION_MAX,
      step: 25,
    },
    sippMonthlyContribution: { min: 0, max: 2000, step: 25 },
    retirementAge: { min: 40, max: 67, step: 0.25 },
    slowGoStartAge: { min: 61, max: 79, step: 0.25 },
    noGoStartAge: { min: 76, max: 80, step: 0.25 },
    alphaLeaveAge: { min: 40, max: 67, step: 0.25 },
    sippAccessAge: { min: 57, max: 67, step: 0.25 },
    sippUseByAge: { min: 57.25, max: 80, step: 0.25 },
    isaAccessAge: { min: 40, max: 67, step: 0.25 },
    lisaAccessAge: { min: 60, max: 80, step: 0.25 },
    alphaStartAge: { min: 60, max: 67, step: 0.25 },
    nuvosStartAge: { min: 60, max: 67, step: 0.25 },
    premiumStartAge: { min: 55, max: 67, step: 0.25 },
    isaUseByAge: { min: 60.25, max: 80, step: 0.25 },
    lisaUseByAge: { min: 60.25, max: 80, step: 0.25 },
    partialRetirementStartAge: { min: 40, max: 59.75, step: 0.25 },
    partialRetirementWorkPercent: { min: 0, max: 100, step: 1 },
    statePensionAge: { min: 67, max: 80, step: 0.25 },
  },
  onChangeParameters: vi.fn(),
};

function renderChart(props: Partial<RetirementIncomeChartProps> = {}) {
  return render(<RetirementIncomeChart {...baseProps} {...props} />);
}

function renderReadonlyHouseholdChart(
  props: Partial<RetirementIncomeChartReadOnlyProps> = {}
) {
  const { onChangeParameters: _onChangeParameters, ...readonlyBaseProps } =
    baseProps;
  return render(
    <RetirementIncomeChart
      {...readonlyBaseProps}
      {...props}
      readOnly
      interactionMode="readonly-household"
    />
  );
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
  return document
    .querySelector(".retirement-income-shortfall-fill")
    ?.getAttribute("d");
}

function getIncomeTaxFillPath() {
  return document
    .querySelector(".retirement-income-income-tax-fill")
    ?.getAttribute("d");
}

function getXAxisLabels() {
  return [...document.querySelectorAll(".retirement-income-x-tick text")].map(
    (node) => node.textContent
  );
}

function getXAxisYearTickAges() {
  return [...document.querySelectorAll(".retirement-income-x-year-tick")].map(
    (node) => Number(node.getAttribute("data-age"))
  );
}

function getXAxisYearTickLength(age: number) {
  const line = document.querySelector(
    `.retirement-income-x-year-tick[data-age="${age}"] line`
  );

  return (
    Number(line?.getAttribute("y2") ?? 0) -
    Number(line?.getAttribute("y1") ?? 0)
  );
}

function getBuildUpBandWidth() {
  const width = document
    .querySelector(".retirement-income-build-up-band")
    ?.getAttribute("width");

  return Number(width);
}

function getMilestoneHitAreas() {
  return [
    ...document.querySelectorAll(
      ".retirement-income-milestone-drag-label > rect[aria-hidden='true']"
    ),
  ].map((node) => ({
    height: Number(node.getAttribute("height")),
    y: Number(node.getAttribute("y")),
  }));
}

function getMilestoneLabelsInRenderOrder() {
  return [
    ...document.querySelectorAll(".retirement-income-milestone-drag-label"),
  ].map((node) => node.getAttribute("aria-label"));
}

function getMilestoneLineX(label: RegExp | string) {
  const marker = screen
    .getByRole("slider", { name: label })
    .closest(".retirement-income-milestone");

  return Number(marker?.querySelector("line")?.getAttribute("x1"));
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
    .querySelector(".retirement-income-milestone-handle")
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

function getPathYSpan(path: string) {
  const yCoordinates = [...path.matchAll(/-?\d+(?:\.\d+)?/g)]
    .map((match, index) => ({ index, value: Number(match[0]) }))
    .filter(({ index }) => index % 2 === 1)
    .map(({ value }) => value);

  return Math.max(...yCoordinates) - Math.min(...yCoordinates);
}

describe("RetirementIncomeChart", () => {
  it("caps ISA and SIPP contribution drag controls at £2,000 per month", () => {
    renderChart({ showIsa: true, showSipp: true });

    expect(
      screen.getByRole("slider", { name: "ISA contribution" })
    ).toHaveAttribute("max", "2000");
    expect(
      screen.getByRole("slider", { name: "SIPP contribution" })
    ).toHaveAttribute("max", "2000");
  });

  it("shows the standard chart title as retirement income over time", () => {
    renderChart();

    expect(
      screen.getByRole("heading", { name: "Retirement income over time" })
    ).toHaveClass("retirement-income-chart-title--visible");
  });

  it("hides flexible-fund surplus presentation unless explicitly enabled", () => {
    render(
      <RetirementIncomeChart
        {...baseProps}
        targetIncomeAnnual={24_000}
        isaMonthlyContribution={175}
        residualFlexibleFundInsights={[
          {
            accountId: "isa",
            label: "ISA",
            endingBalance: 20_000,
            planningHorizonAge: 80,
            wasUsed: false,
          },
        ]}
        showIsa
        data={[
          {
            ...basePoint,
            age: 66,
            date: "2052-01-01",
            targetIncomeAnnual: 24_000,
            totalIncomeAnnual: 31_000,
            assessedIncomeAnnual: 31_000,
            guaranteedNetIncomeAnnual: 25_000,
            unavoidableSurplusAnnual: 1_000,
            avoidableFlexibleSurplusAnnual: 6_000,
            flexibleWithdrawalInsights: [
              {
                accountId: "isa",
                label: "ISA",
                reducibleGrossAnnual: 6_000,
                avoidableNetAnnual: 6_000,
              },
            ],
            isaBalance: 20_000,
          },
        ]}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Inspect surplus at age 66" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Avoidable flexible-fund surplus", { exact: true })
    ).not.toBeInTheDocument();
    expect(
      screen
        .getByRole("slider", { name: "ISA contribution" })
        .closest(".retirement-income-control-card")
    ).not.toHaveClass("retirement-income-control-card--surplus");
  });

  it("highlights the relevant adjustment control without graph circles", () => {
    render(
      <RetirementIncomeChart
        {...baseProps}
        targetIncomeAnnual={24_000}
        showFlexibleWithdrawalInsights
        showIsa
        data={[
          {
            ...basePoint,
            age: 66,
            date: "2052-01-01",
            targetIncomeAnnual: 24_000,
            totalIncomeAnnual: 31_000,
            assessedIncomeAnnual: 31_000,
            guaranteedNetIncomeAnnual: 25_000,
            unavoidableSurplusAnnual: 1_000,
            avoidableFlexibleSurplusAnnual: 6_000,
            flexibleWithdrawalInsights: [
              {
                accountId: "isa",
                label: "ISA",
                reducibleGrossAnnual: 6_000,
                avoidableNetAnnual: 6_000,
              },
            ],
          },
        ]}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Inspect surplus at age 66" })
    ).not.toBeInTheDocument();
    const isaControl = screen.getByRole("slider", {
      name: "ISA contribution",
    });
    expect(isaControl.closest(".retirement-income-control-card")).toHaveClass(
      "retirement-income-control-card--surplus"
    );
    expect(isaControl).toHaveAccessibleDescription(
      "Potential overspend: modelled ISA withdrawals could be reduced at some ages."
    );
    expect(
      screen.getByText(/Age 66: £1,000 unavoidable surplus/)
    ).toBeInTheDocument();
  });

  it("highlights target-based contributions that remain unused at the planning horizon", () => {
    render(
      <RetirementIncomeChart
        {...baseProps}
        showFlexibleWithdrawalInsights
        showLisa
        showSipp
        lisaMonthlyContribution={225}
        sippMonthlyContribution={175}
        residualFlexibleFundInsights={[
          {
            accountId: "lisa",
            label: "LISA",
            endingBalance: 86_924,
            planningHorizonAge: 80,
            wasUsed: false,
          },
          {
            accountId: "sipp",
            label: "SIPP",
            endingBalance: 88_253,
            planningHorizonAge: 80,
            wasUsed: false,
          },
        ]}
        data={[
          {
            ...basePoint,
            age: 60,
            date: "2047-01-01",
            lisaBalance: 40_000,
            sippBalance: 42_000,
          },
          {
            ...basePoint,
            age: 80,
            date: "2067-01-01",
            lisaBalance: 86_924,
            sippBalance: 88_253,
          },
        ]}
      />
    );

    const lisaControl = screen.getByRole("slider", {
      name: "LISA contribution",
    });
    const sippControl = screen.getByRole("slider", {
      name: "SIPP contribution",
    });

    expect(lisaControl.closest(".retirement-income-control-card")).toHaveClass(
      "retirement-income-control-card--surplus"
    );
    expect(sippControl.closest(".retirement-income-control-card")).toHaveClass(
      "retirement-income-control-card--surplus"
    );
    expect(lisaControl).toHaveAccessibleDescription(
      "Potential over-saving: the LISA is not used for modelled income and retains £86,924 at age 80. You may want to compare a lower contribution."
    );
    expect(sippControl).toHaveAccessibleDescription(
      "Potential over-saving: the SIPP is not used for modelled income and retains £88,253 at age 80. You may want to compare a lower contribution."
    );
  });

  it("highlights added Alpha pension when guaranteed income exceeds the target", () => {
    render(
      <RetirementIncomeChart
        {...baseProps}
        targetIncomeAnnual={24_000}
        alphaMonthlyAddedPension={475}
        showFlexibleWithdrawalInsights
        data={[
          {
            ...basePoint,
            age: 68,
            date: "2055-01-01",
            targetIncomeAnnual: 24_000,
            totalIncomeAnnual: 28_000,
            assessedIncomeAnnual: 28_000,
            guaranteedNetIncomeAnnual: 28_000,
            unavoidableSurplusAnnual: 4_000,
          },
        ]}
      />
    );

    const alphaControl = screen.getByRole("slider", {
      name: "Added Alpha pension",
    });
    expect(alphaControl.closest(".retirement-income-control-card")).toHaveClass(
      "retirement-income-control-card--surplus"
    );
    expect(alphaControl).toHaveAccessibleDescription(
      "Potential overspend: guaranteed income exceeds the target at some ages. Added Alpha pension is one adjustable contributor."
    );
  });

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

  it("supports a static household display without single-person controls", () => {
    renderReadonlyHouseholdChart({
      alphaLabel: "Household gross income",
      chartDescription:
        "Gross household income is shown against the shared household target.",
      useDataTargets: true,
      periodEvents: [
        {
          key: "you-retirement",
          label: "You retire",
          date: "2045-07-01",
          timelineValue: 2045.5,
          owner: "you",
        },
        {
          key: "you-alpha-start",
          label: "Your Alpha pension starts",
          date: "2045-07-01",
          timelineValue: 2045.5,
          owner: "you",
        },
      ],
      staticMilestones: [
        {
          key: "you-retirement",
          label: "You retire",
          shortLabel: "You retire",
          timelineValue: 2045.5,
          colour: "#0f6f72",
        },
      ],
      data: [
        { ...basePoint, targetIncomeAnnual: 0 },
        {
          ...basePoint,
          age: 60,
          date: "2045-07-01",
          alphaIncomeAnnual: 45_000,
          assessedIncomeAnnual: 38_000,
          targetIncomeAnnual: 40_000,
          takeHomeIncomeAnnual: 38_000,
          totalIncomeAnnual: 45_000,
        },
      ],
    });

    expect(
      screen.getByText(
        "Gross household income is shown against the shared household target."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Household gross income")).toBeInTheDocument();
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(
      screen.getByTestId("retirement-income-static-milestone-you-retirement")
    ).toBeInTheDocument();
    fireEvent.focus(screen.getByTestId("retirement-income-period-inspector"));
    expect(
      screen.getByTestId("retirement-income-period-details")
    ).toHaveTextContent("You retire");
    expect(
      screen.getByTestId("retirement-income-period-details")
    ).toHaveTextContent("Your Alpha pension starts");
    expect(
      document
        .querySelector(".retirement-income-target-line")
        ?.getAttribute("d")
    ).not.toBeNull();
  });

  it("keeps upward target income drags from repeatedly inflating the y scale", () => {
    mockChartResize(960);

    const onChangeParameters =
      vi.fn<RetirementIncomeChartProps["onChangeParameters"]>();
    renderChart({ onChangeParameters });
    const svg = document.querySelector(".retirement-income-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected retirement income chart SVG to be rendered");
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

  it("lets each SMILE phase update its own percentage", () => {
    const onChangeParameters =
      vi.fn<RetirementIncomeChartProps["onChangeParameters"]>();
    const smileData = [
      { ...basePoint, age: 60, targetIncomeAnnual: 31_700 },
      { ...basePoint, age: 74, targetIncomeAnnual: 31_700 },
      { ...basePoint, age: 75, targetIncomeAnnual: 26_945 },
      { ...basePoint, age: 79, targetIncomeAnnual: 26_945 },
      { ...basePoint, age: 80, targetIncomeAnnual: 22_190 },
    ];

    renderChart({
      data: smileData,
      spendingSmileEnabled: true,
      onChangeParameters,
    });

    expect(
      screen.getByRole("slider", {
        name: "Go-go spending percentage",
      })
    ).toHaveAttribute("aria-valuenow", "100");
    const slowGoHandle = screen.getByRole("slider", {
      name: "Slow-go spending percentage",
    });
    expect(slowGoHandle).toHaveAttribute("aria-valuenow", "85");
    expect(
      screen.getByRole("slider", {
        name: "No-go spending percentage",
      })
    ).toHaveAttribute("aria-valuenow", "70");
    expect(
      screen.queryByRole("slider", { name: "Target income line" })
    ).not.toBeInTheDocument();

    fireEvent.keyDown(slowGoHandle, { key: "ArrowDown" });

    expect(onChangeParameters).toHaveBeenCalledWith({
      slowGoPercentage: 84,
    });
  });

  it("lets SMILE phase boundaries update their own start age", () => {
    const onChangeParameters =
      vi.fn<RetirementIncomeChartProps["onChangeParameters"]>();

    renderChart({
      spendingSmileEnabled: true,
      onChangeParameters,
    });

    const slowGoStartHandle = screen.getByRole("slider", {
      name: /Start Slow-go, age 75/i,
    });
    const noGoStartHandle = screen.getByRole("slider", {
      name: /Start No-go, age 80/i,
    });
    expect(slowGoStartHandle).toHaveAttribute("aria-valuemin", "61");
    expect(slowGoStartHandle).toHaveAttribute("aria-valuemax", "79");
    expect(noGoStartHandle).toHaveAttribute("aria-valuemin", "76");
    expect(noGoStartHandle).toHaveAttribute("aria-valuemax", "80");

    fireEvent.keyDown(slowGoStartHandle, { key: "ArrowRight" });

    expect(onChangeParameters).toHaveBeenCalledWith({
      slowGoStartAge: 75.25,
    });
  });

  it("only starts a SMILE boundary drag from its label", () => {
    const onChangeParameters =
      vi.fn<RetirementIncomeChartProps["onChangeParameters"]>();

    renderChart({
      spendingSmileEnabled: true,
      onChangeParameters,
    });

    const slowGoStartLabel = screen.getByRole("slider", {
      name: /Start Slow-go, age 75/i,
    });
    const marker = slowGoStartLabel.closest(".retirement-income-milestone");
    const guideLine = marker?.querySelector("line");

    if (!guideLine) {
      throw new Error("Expected the Slow-go guide line to be rendered");
    }

    fireEvent.pointerDown(guideLine, {
      button: 0,
      clientX: 600,
      clientY: 200,
      isPrimary: true,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(guideLine, {
      clientX: 540,
      clientY: 200,
      isPrimary: true,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(guideLine, {
      clientX: 540,
      clientY: 200,
      isPrimary: true,
      pointerId: 7,
      pointerType: "mouse",
    });

    expect(onChangeParameters).not.toHaveBeenCalled();
  });

  it("commits a dragged SMILE phase without changing the other phases", () => {
    mockChartResize(960);
    const onChangeParameters =
      vi.fn<RetirementIncomeChartProps["onChangeParameters"]>();
    const smileData = [
      { ...basePoint, age: 60, targetIncomeAnnual: 31_700 },
      { ...basePoint, age: 74, targetIncomeAnnual: 31_700 },
      { ...basePoint, age: 75, targetIncomeAnnual: 26_945 },
      { ...basePoint, age: 79, targetIncomeAnnual: 26_945 },
      { ...basePoint, age: 80, targetIncomeAnnual: 22_190 },
    ];

    const { rerender } = renderChart({
      data: smileData,
      spendingSmileEnabled: true,
      onChangeParameters,
    });
    const svg = document.querySelector(".retirement-income-chart-svg");
    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected retirement income chart SVG to be rendered");
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

    const slowGoHandle = screen.getByRole("slider", {
      name: "Slow-go spending percentage",
    });
    fireEvent.pointerDown(slowGoHandle, {
      button: 0,
      clientX: 600,
      clientY: 170,
      isPrimary: true,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(slowGoHandle, {
      clientX: 600,
      clientY: 210,
      isPrimary: true,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(slowGoHandle, {
      clientX: 600,
      clientY: 210,
      isPrimary: true,
      pointerId: 7,
      pointerType: "mouse",
    });

    expect(onChangeParameters).toHaveBeenCalledTimes(1);
    const patch = onChangeParameters.mock.calls[0]?.[0];
    expect(Object.keys(patch ?? {})).toEqual(["slowGoPercentage"]);
    expect(typeof patch?.slowGoPercentage).toBe("number");

    const committedPercentage = patch?.slowGoPercentage;
    if (typeof committedPercentage !== "number") {
      throw new Error("Expected the Slow-go percentage to be committed");
    }

    const releasedPath = slowGoHandle.getAttribute("d");
    rerender(
      <RetirementIncomeChart
        {...baseProps}
        data={smileData}
        spendingSmileEnabled
        slowGoPercentage={committedPercentage}
        onChangeParameters={onChangeParameters}
      />
    );

    expect(
      screen.getByRole("slider", {
        name: "Slow-go spending percentage",
      })
    ).toHaveAttribute("d", releasedPath);

    const recalculatedData = smileData.map((point) =>
      point.age >= 75 && point.age < 80
        ? {
            ...point,
            targetIncomeAnnual: (31_700 * committedPercentage) / 100,
          }
        : point
    );
    rerender(
      <RetirementIncomeChart
        {...baseProps}
        data={recalculatedData}
        spendingSmileEnabled
        slowGoPercentage={committedPercentage}
        onChangeParameters={onChangeParameters}
      />
    );

    expect(
      screen.getByRole("slider", {
        name: "Slow-go spending percentage",
      })
    ).toHaveAttribute("d", releasedPath);
  });

  it("prevents page scrolling while the target income line is changed by touch", () => {
    mockChartResize(360);

    const onChangeParameters =
      vi.fn<RetirementIncomeChartProps["onChangeParameters"]>();
    renderChart({ onChangeParameters });
    const svg = document.querySelector(".retirement-income-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected retirement income chart SVG to be rendered");
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
      vi.fn<RetirementIncomeChartProps["onChangeParameters"]>();
    renderChart({ onChangeParameters });
    const svg = document.querySelector(".retirement-income-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected retirement income chart SVG to be rendered");
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
    const svg = document.querySelector(".retirement-income-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected retirement income chart SVG to be rendered");
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
        },
        {
          ...basePoint,
          date: "2055-03-15",
          age: 66.75,
          targetIncomeAnnual: 31700,
          assessedIncomeAnnual: 0,
          shortfallAnnual: 31700,
        },
        {
          ...basePoint,
          date: "2055-08-15",
          age: 67 + 2 / 12,
          targetIncomeAnnual: 31700,
          assessedIncomeAnnual: 0,
          shortfallAnnual: 31700,
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
        },
      ],
      retirementAge: 66.75,
      alphaLeaveAge: 66.75,
      alphaStartAge: 67.25,
      statePensionAge: 68,
    });

    const alphaStartX = screen
      .getByRole("slider", { name: /Start Alpha/ })
      .closest(".retirement-income-milestone")
      ?.querySelector("line")
      ?.getAttribute("x1");

    expect(alphaStartX).toBeDefined();
    expect(getShortfallFillPath()).toContain(alphaStartX);
  });

  it("distinguishes estimated Income Tax from shortfall in the chart and key", () => {
    renderChart({
      data: [
        {
          ...basePoint,
          date: "2045-07-01",
          age: 60,
          targetIncomeAnnual: 35_000,
          alphaIncomeAnnual: 40_000,
          totalIncomeAnnual: 40_000,
          assessedIncomeAnnual: 34_000,
          shortfallAnnual: 1_000,
        },
        {
          ...basePoint,
          date: "2046-07-01",
          age: 61,
          targetIncomeAnnual: 35_000,
          alphaIncomeAnnual: 40_000,
          totalIncomeAnnual: 40_000,
          assessedIncomeAnnual: 34_000,
          shortfallAnnual: 1_000,
        },
      ],
      targetIncomeAnnual: 35_000,
    });

    const chartKey = screen.getByLabelText("Chart key");

    expect(chartKey).toHaveTextContent("Estimated Income Tax");
    expect(chartKey).toHaveTextContent("Shortfall");
    expect(
      chartKey.querySelector(".retirement-income-income-tax-key")
    ).not.toBeNull();
    expect(
      chartKey.querySelector(".retirement-income-shortfall-key")
    ).not.toBeNull();
    expect(getIncomeTaxFillPath()).toBeTruthy();
    expect(
      document.querySelector(".retirement-income-income-tax-fill")
    ).toHaveAttribute("fill", "url(#estimated-income-tax-hatch)");
    expect(
      document.querySelector("#estimated-income-tax-hatch")
    ).not.toHaveAttribute("patternTransform");
    expect(document.querySelector("#shortfall-hatch")).toHaveAttribute(
      "patternTransform",
      "rotate(45)"
    );
  });

  it("omits the estimated Income Tax key when gross and take-home income match", () => {
    renderChart();

    expect(screen.getByLabelText("Chart key")).not.toHaveTextContent(
      "Estimated Income Tax"
    );
  });

  it("starts with a 2.5-year build-up window and expands for earlier milestones", () => {
    renderChart();

    expect(screen.queryByLabelText("Build-up shown")).not.toBeInTheDocument();
    expect(getXAxisLabels()[0]).toBe("55");
    expect(getBuildUpBandWidth()).toBeGreaterThan(0);
  });

  it.each([
    { label: "ISA", setting: "showIsa" },
    { label: "LISA", setting: "showLisa" },
    { label: "SIPP", setting: "showSipp" },
    { label: "Civil Service AVC", setting: "showCsAvc" },
  ] as const)(
    "shows $label in the chart key only while it is enabled",
    ({ label, setting }) => {
      const { rerender } = renderChart({ [setting]: true });

      expect(
        screen.getByRole("button", {
          name: `Toggle chart ${label} source`,
        })
      ).toHaveTextContent(label);

      rerender(
        <RetirementIncomeChart {...baseProps} {...{ [setting]: false }} />
      );

      expect(
        within(screen.getByLabelText("Chart key")).queryByText(label, {
          exact: true,
        })
      ).not.toBeInTheDocument();
    }
  );

  it("hides the additional income legend item when it has no chart values", () => {
    renderChart({ hideInactiveLegendItems: true });

    expect(screen.queryByText("Additional income")).not.toBeInTheDocument();
  });

  it("renders named additional income areas when the chart data contains streams", () => {
    renderChart({
      data: [
        basePoint,
        {
          ...basePoint,
          date: "2045-07-01",
          age: 60,
          alphaIncomeAnnual: 18000,
          additionalGuaranteedIncomeAnnual: 5000,
          additionalGuaranteedIncomeStreams: [
            {
              id: "previous-employer-db",
              label: "Previous employer DB pension",
              annualAmount: 5000,
            },
          ],
          totalIncomeAnnual: 23000,
          assessedIncomeAnnual: 23000,
          shortfallAnnual: 8700,
        },
        {
          ...basePoint,
          date: "2065-07-01",
          age: 80,
          alphaIncomeAnnual: 18000,
          additionalGuaranteedIncomeAnnual: 5000,
          additionalGuaranteedIncomeStreams: [
            {
              id: "previous-employer-db",
              label: "Previous employer DB pension",
              annualAmount: 5000,
            },
          ],
          statePensionIncomeAnnual: 10000,
          totalIncomeAnnual: 33000,
          assessedIncomeAnnual: 33000,
          shortfallAnnual: 0,
        },
      ],
      hideInactiveLegendItems: true,
    });

    expect(
      screen.getByText("Previous employer DB pension")
    ).toBeInTheDocument();
    expect(getIncomeAreaStrokeColours()).toContain("#6d7d10");
    expect(getPathYSpan(getIncomeAreaPath("#6d7d10"))).toBeGreaterThan(0);
  });

  it("renders multiple additional income streams as separate chart areas", () => {
    renderChart({
      data: [
        basePoint,
        {
          ...basePoint,
          date: "2045-07-01",
          age: 60,
          additionalGuaranteedIncomeAnnual: 8000,
          additionalGuaranteedIncomeStreams: [
            {
              id: "previous-employer-db",
              label: "Previous employer DB pension",
              annualAmount: 5000,
            },
            {
              id: "annuity",
              label: "Purchased annuity",
              annualAmount: 3000,
            },
          ],
          totalIncomeAnnual: 8000,
          assessedIncomeAnnual: 8000,
          shortfallAnnual: 23700,
        },
      ],
      hideInactiveLegendItems: true,
    });

    expect(
      screen.getByText("Previous employer DB pension")
    ).toBeInTheDocument();
    expect(screen.getByText("Purchased annuity")).toBeInTheDocument();
    expect(getIncomeAreaStrokeColours()).toEqual(
      expect.arrayContaining(["#6d7d10", "#9a5b13"])
    );
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
        },
        {
          ...basePoint,
          date: "2046-01-01",
          age: 61,
          isaIncomeAnnual: 16000,
          sippIncomeAnnual: 3000,
          totalIncomeAnnual: 19000,
          assessedIncomeAnnual: 19000,
        },
        {
          ...basePoint,
          date: "2047-01-01",
          age: 62,
          sippIncomeAnnual: 15000,
          totalIncomeAnnual: 15000,
          assessedIncomeAnnual: 15000,
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

  it("keeps the first active income area at the bottom when a later source starts", () => {
    renderChart({
      data: [
        {
          ...basePoint,
          date: "2043-01-01",
          age: 58,
          sippIncomeAnnual: 12000,
          totalIncomeAnnual: 12000,
          assessedIncomeAnnual: 12000,
        },
        {
          ...basePoint,
          date: "2044-01-01",
          age: 59,
          sippIncomeAnnual: 12000,
          totalIncomeAnnual: 12000,
          assessedIncomeAnnual: 12000,
        },
        {
          ...basePoint,
          date: "2045-01-01",
          age: 60,
          isaIncomeAnnual: 8000,
          sippIncomeAnnual: 12000,
          totalIncomeAnnual: 20000,
          assessedIncomeAnnual: 20000,
        },
        {
          ...basePoint,
          date: "2046-01-01",
          age: 61,
          isaIncomeAnnual: 15000,
          sippIncomeAnnual: 3000,
          totalIncomeAnnual: 18000,
          assessedIncomeAnnual: 18000,
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
    const svg = document.querySelector(".retirement-income-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected retirement income chart SVG to be rendered");
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
      clientX: 100,
      clientY: 150,
      pointerId: 1,
    });

    const dragAgeLabel = document.querySelector(".retirement-income-drag-age");
    const dragAgeLabelRect = dragAgeLabel?.querySelector("rect");

    expect(dragAgeLabel?.textContent).toBe("57y 3m");
    expect(dragAgeLabelRect).toHaveAttribute("width", "58");

    fireEvent.pointerUp(window, {
      clientX: 100,
      clientY: 150,
      pointerId: 1,
    });

    expect(onChangeParameters).toHaveBeenCalledWith({ retirementAge: 57.25 });
  });

  it("uses quarter-year steps for the mobile age input", () => {
    mockChartResize(360);

    renderChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Show chart controls" })
    );

    expect(screen.getByRole("spinbutton", { name: "Age" })).toHaveAttribute(
      "step",
      "0.25"
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
    const svg = document.querySelector(".retirement-income-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected retirement income chart SVG to be rendered");
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
    const svg = document.querySelector(".retirement-income-chart-svg");

    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected retirement income chart SVG to be rendered");
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

    fireEvent.keyDown(screen.getByLabelText(/Leave Alpha, age 60/i), {
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
      screen.getByRole("slider", { name: /Start Nuvos, age 66/i })
    ).toBeInTheDocument();
  });

  it("emits a Premium start-age patch for keyboard changes to its milestone", () => {
    const onChangeParameters = vi.fn();

    renderChart({
      showPremium: true,
      premiumStartAge: 60,
      onChangeParameters,
    });

    fireEvent.keyDown(
      screen.getByRole("slider", { name: /Start Premium, age 60/i }),
      { key: "ArrowLeft" }
    );

    expect(onChangeParameters).toHaveBeenCalledWith({
      premiumStartAge: 59.75,
    });
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
        },
        {
          ...basePoint,
          date: "2052-01-01",
          age: 64 + 7 / 12,
          isaIncomeAnnual: 12000,
          totalIncomeAnnual: 12000,
          assessedIncomeAnnual: 12000,
        },
        {
          ...basePoint,
          date: "2053-03-01",
          age: 65.75,
          isaIncomeAnnual: 12000,
          totalIncomeAnnual: 12000,
          assessedIncomeAnnual: 12000,
        },
        {
          ...basePoint,
          date: "2053-06-01",
          age: 66,
        },
      ],
      showIsa: true,
      isaAccessAge: 59.25,
      isaUseByAge: 65.75,
      isaUseByAgeEnabled: true,
      showStatePension: false,
    });

    const isaPath = getIncomeAreaPath("#1f8ee6");
    const isaStartX = getMilestoneLineX(/ISA start, age 59 years 3 months/i);
    const isaUseByX = getMilestoneLineX(/ISA stop, age 65 years 9 months/i);
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
        },
        {
          ...basePoint,
          date: "2053-01-01",
          age: 65 + 7 / 12,
          sippIncomeAnnual: 15000,
          totalIncomeAnnual: 15000,
          assessedIncomeAnnual: 15000,
        },
        {
          ...basePoint,
          date: "2054-03-01",
          age: 66.75,
          sippIncomeAnnual: 15000,
          totalIncomeAnnual: 15000,
          assessedIncomeAnnual: 15000,
        },
        {
          ...basePoint,
          date: "2054-06-01",
          age: 67,
        },
      ],
      showSipp: true,
      sippAccessAge: 59.25,
      sippUseByAge: 66.75,
      sippUseByAgeEnabled: true,
      showStatePension: false,
    });

    const sippPath = getIncomeAreaPath("#148c55");
    const sippStartX = getMilestoneLineX(/SIPP start, age 59 years 3 months/i);
    const sippUseByX = getMilestoneLineX(/SIPP stop, age 66 years 9 months/i);
    const sippActiveRange = getAreaActiveXRange(sippPath);

    expectPathToContainX(sippPath, sippStartX);
    expectPathToContainX(sippPath, sippUseByX);
    expect(sippActiveRange.startX).toBeCloseTo(sippStartX, 2);
    expect(sippActiveRange.endX).toBeCloseTo(sippUseByX, 2);
  });
});
