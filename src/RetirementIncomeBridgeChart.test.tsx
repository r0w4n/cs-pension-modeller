import { render, screen } from "@testing-library/react";
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
  isaUseByAge: 60,
  partialRetirementStartAge: 55,
  partialRetirementWorkPercent: 50,
  partialRetirementEnabled: false,
  statePensionAge: 67,
  showIsa: false,
  showSipp: false,
  sippUseByAgeEnabled: false,
  showNuvos: false,
  isaUseByAgeEnabled: false,
  showStatePension: true,
  limits: {
    targetIncomeAnnual: { min: 0, max: 200000, step: 600 },
    alphaMonthlyAddedPension: { min: 0, max: 1000, step: 25 },
    isaMonthlyContribution: { min: 0, max: 5000, step: 25 },
    sippMonthlyContribution: { min: 0, max: 5000, step: 25 },
    retirementAge: { min: 40, max: 67, step: 0.25 },
    alphaLeaveAge: { min: 40, max: 67, step: 0.25 },
    sippAccessAge: { min: 57, max: 67, step: 0.25 },
    sippUseByAge: { min: 57.25, max: 80, step: 0.25 },
    isaAccessAge: { min: 40, max: 67, step: 0.25 },
    alphaStartAge: { min: 60, max: 67, step: 0.25 },
    isaUseByAge: { min: 60.25, max: 80, step: 0.25 },
    partialRetirementStartAge: { min: 40, max: 59.75, step: 0.25 },
    partialRetirementWorkPercent: { min: 0, max: 100, step: 1 },
    statePensionAge: { min: 67, max: 80, step: 0.25 },
  },
  onChangeParameters: vi.fn(),
};

function renderChart(props: Partial<RetirementIncomeBridgeChartProps> = {}) {
  return render(<RetirementIncomeBridgeChart {...baseProps} {...props} />);
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

function getBuildUpBandWidth() {
  const width = document
    .querySelector(".bridge-build-up-band")
    ?.getAttribute("width");

  return Number(width);
}

describe("RetirementIncomeBridgeChart", () => {
  it("starts the target income line at the y axis", () => {
    renderChart({ retirementAge: 44, alphaStartAge: 44 });

    expect(getTargetLinePath()).toMatch(/^M0,/);
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
    expect(getXAxisLabels()[0]).toBe("56");
    expect(getBuildUpBandWidth()).toBeGreaterThan(0);
  });
});
