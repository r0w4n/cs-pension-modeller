import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { deriveInflationAssumptions } from "../projection";
import { createDefaultSettings } from "../settings";
import {
  createBridgeChartLimits,
  createBridgeChartParameters,
} from "../app-domains";
import {
  JourneyStepContent,
  type JourneyStepViewModel,
} from "./journey-step-content";

const projectionTableMocks = vi.hoisted(() => ({
  section: vi.fn(),
}));

vi.mock("../RetirementIncomeBridgeChart", () => ({
  RetirementIncomeBridgeChart: () => <div>Bridge chart</div>,
}));

vi.mock("./chart", () => ({
  ComparisonBridgeChart: () => <div>Comparison bridge chart</div>,
}));

vi.mock("./comparison", () => ({
  ComparisonPanel: () => <div>Comparison panel</div>,
  ComparisonSection: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  PensionSummarySection: () => <div>Pension summary</div>,
}));

vi.mock("./projection-table", () => ({
  ProjectionTableSectionContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ProjectionTableSection: (props: unknown) => {
    projectionTableMocks.section(props);
    return <div>Projection table section</div>;
  },
}));

vi.mock("./results-summary", () => ({
  InflationBasisPanel: () => <div>Inflation basis</div>,
  ResultsSummarySection: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  SummarySection: () => <div>Summary section</div>,
  ValidationIssuesSection: () => <div>Validation issues</div>,
}));

describe("JourneyStepContent", () => {
  const originalMatchMedia = window.matchMedia;

  const mockMatchMedia = (matches: boolean) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  beforeEach(() => {
    projectionTableMocks.section.mockClear();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders the projection table for desktop expert results", () => {
    mockMatchMedia(false);

    render(
      <JourneyStepContent
        step={{
          id: "results",
          eyebrow: "Results",
          title: "Results",
          description: "Review results",
          kind: "expert-answer",
        }}
        viewModel={createViewModel()}
      />
    );

    expect(screen.getByText("Projection table section")).toBeInTheDocument();
    expect(projectionTableMocks.section).toHaveBeenCalledTimes(1);
  });

  it("skips the projection table for mobile expert results", () => {
    mockMatchMedia(true);

    render(
      <JourneyStepContent
        step={{
          id: "results",
          eyebrow: "Results",
          title: "Results",
          description: "Review results",
          kind: "expert-answer",
        }}
        viewModel={createViewModel()}
      />
    );

    expect(
      screen.queryByText("Projection table section")
    ).not.toBeInTheDocument();
    expect(projectionTableMocks.section).not.toHaveBeenCalled();
  });

  it("skips the projection table for mobile bridge results", () => {
    mockMatchMedia(true);

    render(
      <JourneyStepContent
        step={{
          id: "results",
          eyebrow: "Results",
          title: "Results",
          description: "Review results",
          kind: "bridge-answer",
        }}
        viewModel={createViewModel()}
      />
    );

    expect(
      screen.queryByText("Projection table section")
    ).not.toBeInTheDocument();
    expect(projectionTableMocks.section).not.toHaveBeenCalled();
  });
});

function createViewModel(): JourneyStepViewModel {
  const settings = createDefaultSettings();

  return {
    settings,
    validationIssues: [],
    pensionSummary: null,
    retirementIncomeSeries: [],
    bridgeChartParameters: createBridgeChartParameters(settings),
    bridgeChartLimits: createBridgeChartLimits(settings),
    derivedInflationAssumptions: deriveInflationAssumptions(settings),
    projectionRows: [],
    retirementIncomeDisplay: "monthly",
    retirementIncomeItems: [],
    retirementIncomeTitle: "Retirement income",
    retirementIncomeTotal: "£0",
    retirementIncomeTargetTitle: "Target",
    retirementIncomeTarget: "£0",
    comparisonRetirementIncomeDisplay: "annual",
    showGuidanceNotes: true,
    useDropdownDates: false,
    onChange: vi.fn(),
    onChangeChartParameters: vi.fn(),
    comparisonScenarios: [],
    comparisonResultCache: new Map(),
    onScenariosChange: vi.fn(),
    onLoadScenario: vi.fn(),
    onRetirementIncomeDisplayChange: vi.fn(),
    onComparisonRetirementIncomeDisplayChange: vi.fn(),
  };
}
