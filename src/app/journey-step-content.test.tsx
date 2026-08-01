import { fireEvent, render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { deriveInflationAssumptions } from "../projection";
import { createDefaultSettings, type PensionSettings } from "../settings";
import {
  createBridgeChartLimits,
  createBridgeChartParameters,
} from "../app-domains";
import {
  JourneyStepContent,
  type JourneyStepViewModel,
} from "./journey-step-content";
import { FlexibleWithdrawalPriorityEditor } from "./flexible-withdrawal-priority-editor";

const projectionTableMocks = vi.hoisted(() => ({
  section: vi.fn(),
}));

const journeyContentMocks = vi.hoisted(() => ({
  bridgeChart: vi.fn(),
  pensionSummary: vi.fn(),
  retirementChart: vi.fn(),
}));

vi.mock("../RetirementIncomeBridgeChart", () => ({
  RetirementIncomeBridgeChart: (props: unknown) => {
    journeyContentMocks.retirementChart(props);
    return <div>Bridge chart</div>;
  },
}));

vi.mock("./chart", () => ({
  ComparisonBridgeChart: (props: unknown) => {
    journeyContentMocks.bridgeChart(props);
    return <div>Comparison bridge chart</div>;
  },
}));

vi.mock("./comparison", () => ({
  ComparisonPanel: () => <div>Comparison panel</div>,
  ComparisonSection: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  PensionSummarySection: (props: unknown) => {
    journeyContentMocks.pensionSummary(props);
    return <div>Pension summary</div>;
  },
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
    journeyContentMocks.bridgeChart.mockClear();
    journeyContentMocks.pensionSummary.mockClear();
    journeyContentMocks.retirementChart.mockClear();
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

  it("places flexible-fund priority in the retirement income target step", () => {
    mockMatchMedia(false);
    const viewModel = createViewModel();
    viewModel.settings = {
      ...viewModel.settings,
      spendingStrategyType: "SPENDING_SMILE",
      sippWithdrawalStrategy: "meet_income_target",
      isaWithdrawalStrategy: "meet_income_target",
    };

    render(
      <JourneyStepContent
        step={{
          id: "expert-retirement-target",
          eyebrow: "Pension planning",
          title: "Retirement income target",
          description: "Set the income target.",
          kind: "fields",
          groupId: "retirement-target",
          fieldIds: ["desiredRetirementIncome", "requirementAge"],
        }}
        viewModel={viewModel}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Income-target funding priority" })
    ).toBeInTheDocument();

    fireEvent.keyDown(
      screen.getByRole("button", {
        name: "Reorder ISA. Priority 2 of 2.",
      }),
      { key: "ArrowUp" }
    );

    expect(viewModel.onChange).toHaveBeenCalledWith(
      "flexibleWithdrawalPriority",
      ["isa", "sipp", "csAvc", "lisa"]
    );
  });

  it("shows and edits a single flexible account when SMILE spending is enabled", () => {
    mockMatchMedia(false);
    const viewModel = createViewModel();
    viewModel.settings = {
      ...viewModel.settings,
      spendingStrategyType: "SPENDING_SMILE",
      showSipp: true,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
      sippWithdrawalStrategy: "use_by_age",
    };

    render(
      <JourneyStepContent
        step={{
          id: "expert-retirement-target",
          eyebrow: "Pension planning",
          title: "Retirement income target",
          description: "Set the income target.",
          kind: "fields",
          groupId: "retirement-target",
          fieldIds: ["desiredRetirementIncome", "requirementAge"],
        }}
        viewModel={viewModel}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Income-target funding priority" })
    ).toBeInTheDocument();
    const strategy = screen.getByRole("combobox", {
      name: "SIPP withdrawal strategy",
    });
    expect(strategy).toHaveValue("use_by_age");
    expect(
      screen.getByRole("region", { name: "Other withdrawal strategies" })
    ).toContainElement(strategy);
    expect(
      screen.queryByRole("button", {
        name: /Reorder SIPP/,
      })
    ).not.toBeInTheDocument();

    fireEvent.change(strategy, { target: { value: "meet_income_target" } });

    expect(viewModel.onChange).toHaveBeenCalledWith(
      "sippWithdrawalStrategy",
      "meet_income_target"
    );
  });

  it("saves native drag ordering only when the account is dropped", () => {
    mockMatchMedia(false);
    const viewModel = createViewModel();
    viewModel.settings = {
      ...viewModel.settings,
      spendingStrategyType: "SPENDING_SMILE",
      sippWithdrawalStrategy: "meet_income_target",
      isaWithdrawalStrategy: "meet_income_target",
    };

    render(
      <JourneyStepContent
        step={{
          id: "expert-retirement-target",
          eyebrow: "Pension planning",
          title: "Retirement income target",
          description: "Set the income target.",
          kind: "fields",
          groupId: "retirement-target",
          fieldIds: ["desiredRetirementIncome", "requirementAge"],
        }}
        viewModel={viewModel}
      />
    );

    const rows = screen.getAllByRole("listitem");
    rows.forEach((row, index) => {
      vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
        top: index * 100,
        height: 100,
      } as DOMRect);
    });
    const isaHandle = screen.getByRole("button", {
      name: "Reorder ISA. Priority 2 of 2.",
    });
    const dataTransfer = {
      dropEffect: "none",
      effectAllowed: "none",
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    fireEvent.dragStart(isaHandle, { dataTransfer });
    fireEvent.dragOver(rows[0], { dataTransfer, clientY: 1 });

    expect(viewModel.onChange).not.toHaveBeenCalled();

    fireEvent.drop(rows[0], { dataTransfer, clientY: 1 });

    expect(viewModel.onChange).toHaveBeenCalledTimes(1);
    expect(viewModel.onChange).toHaveBeenCalledWith(
      "flexibleWithdrawalPriority",
      ["isa", "sipp", "csAvc", "lisa"]
    );
  });

  it("keeps the SMILE funding panel visible when no flexible account is included", () => {
    mockMatchMedia(false);
    const viewModel = createViewModel();
    viewModel.settings = {
      ...viewModel.settings,
      spendingStrategyType: "SPENDING_SMILE",
      showSipp: false,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
    };

    render(
      <JourneyStepContent
        step={{
          id: "expert-retirement-target",
          eyebrow: "Pension planning",
          title: "Retirement income target",
          description: "Set the income target.",
          kind: "fields",
          groupId: "retirement-target",
          fieldIds: ["desiredRetirementIncome", "requirementAge"],
        }}
        viewModel={viewModel}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Income-target funding priority" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Include a SIPP, Civil Service AVC, LISA or ISA/)
    ).toBeInTheDocument();
  });

  it("moves every non-target strategy below without hiding the editor", () => {
    mockMatchMedia(false);
    render(
      <StatefulPriorityEditor
        initialSettings={{
          ...createDefaultSettings(),
          spendingStrategyType: "SPENDING_SMILE",
          sippWithdrawalStrategy: "meet_income_target",
          isaWithdrawalStrategy: "meet_income_target",
        }}
      />
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "SIPP withdrawal strategy" }),
      { target: { value: "use_by_age" } }
    );
    expect(
      screen.getByRole("region", { name: "Income-target funding priority" })
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-other-account="sipp"]')
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("combobox", { name: "ISA withdrawal strategy" }),
      { target: { value: "percentage" } }
    );

    expect(
      screen.getByRole("region", { name: "Income-target funding priority" })
    ).toBeInTheDocument();
    expect(document.querySelectorAll("[data-priority-account]")).toHaveLength(
      0
    );
    expect(document.querySelectorAll("[data-other-account]")).toHaveLength(2);
  });

  it("hides income-target funding priority for flat spending", () => {
    mockMatchMedia(false);
    const viewModel = createViewModel();
    viewModel.settings = {
      ...viewModel.settings,
      spendingStrategyType: "FLAT",
      sippWithdrawalStrategy: "meet_income_target",
      isaWithdrawalStrategy: "meet_income_target",
    };

    render(
      <JourneyStepContent
        step={{
          id: "expert-retirement-target",
          eyebrow: "Pension planning",
          title: "Retirement income target",
          description: "Set the income target.",
          kind: "fields",
          groupId: "retirement-target",
          fieldIds: ["desiredRetirementIncome", "requirementAge"],
        }}
        viewModel={viewModel}
      />
    );

    expect(
      screen.queryByRole("region", { name: "Income-target funding priority" })
    ).not.toBeInTheDocument();
  });

  it("keeps flexible withdrawal results and chart presentation out of bridge answers", () => {
    mockMatchMedia(false);

    render(
      <JourneyStepContent
        step={{
          id: "answer",
          eyebrow: "Result",
          title: "Your results",
          description: "Review results",
          kind: "bridge-answer",
        }}
        viewModel={createViewModel()}
      />
    );

    const summaryProps = journeyContentMocks.pensionSummary.mock
      .calls[0]?.[0] as Record<string, unknown>;
    const chartProps = journeyContentMocks.bridgeChart.mock.calls[0]?.[0] as
      Record<string, unknown> | undefined;

    expect(summaryProps.flexibleWithdrawalSummary).toBeUndefined();
    expect(chartProps?.showFlexibleWithdrawalInsights).not.toBe(true);
  });

  it("enables flexible withdrawal results and chart presentation for expert answers", () => {
    mockMatchMedia(false);

    render(
      <JourneyStepContent
        step={{
          id: "answer",
          eyebrow: "Result",
          title: "Your results",
          description: "Review results",
          kind: "expert-answer",
        }}
        viewModel={createViewModel()}
      />
    );

    const summaryProps = journeyContentMocks.pensionSummary.mock
      .calls[0]?.[0] as Record<string, unknown>;
    const chartProps = journeyContentMocks.retirementChart.mock
      .calls[0]?.[0] as Record<string, unknown>;

    expect(summaryProps.flexibleWithdrawalSummary).toBeDefined();
    expect(chartProps.showFlexibleWithdrawalInsights).toBe(true);
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
    flexibleWithdrawalSummary: {
      accounts: [],
      residualAccounts: [],
      affectedAges: [],
      totalReducibleGrossWithdrawal: 0,
      totalAvoidableNetSurplus: 0,
      largestAnnualAvoidableSurplus: 0,
    },
    targetBasedWithdrawalPreviews: [],
    projectionRows: [],
    retirementIncomeDisplay: "monthly",
    incomeAgeRangeItems: [],
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

function StatefulPriorityEditor({
  initialSettings,
}: {
  initialSettings: PensionSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);

  return (
    <FlexibleWithdrawalPriorityEditor
      settings={settings}
      onChange={(key, value) =>
        setSettings((current) => ({ ...current, [key]: value }))
      }
    />
  );
}
