import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { deriveInflationAssumptions } from "../projection";
import { createDefaultSettings, type PensionSettings } from "../settings";
import { createComparisonResult } from "../result-projection/comparison-result";
import {
  createRetirementIncomeChartLimits,
  createRetirementIncomeChartParameters,
} from "../result-projection/retirement-income";
import {
  JourneyStepContent,
  type JourneyStepViewModel,
} from "./journey-step-content";
import { FlexibleWithdrawalPriorityEditor } from "./flexible-withdrawal-priority-editor";
import { calculateRetirementPlan } from "../calculation/retirement-plan";

const projectionTableMocks = vi.hoisted(() => ({
  section: vi.fn(),
}));

const journeyContentMocks = vi.hoisted(() => ({
  retirementIncomeChartAdapter: vi.fn(),
  comparisonPanel: vi.fn(),
  pensionSummary: vi.fn(),
}));

const STANDARD_RESULTS_SECTIONS = [
  { id: "summary", presentation: "standard" },
  { id: "retirement-income-chart", presentation: "standard" },
  { id: "inflation-basis", presentation: "expanded" },
  { id: "comparison" },
  { id: "projection-table" },
] as const;

const DETAILED_RESULTS_SECTIONS = [
  { id: "summary", presentation: "detailed" },
  { id: "retirement-income-chart", presentation: "detailed" },
  { id: "inflation-basis", presentation: "expanded" },
  { id: "comparison" },
  { id: "projection-table" },
] as const;

const SIMPLE_RESULTS_SECTIONS = [
  { id: "summary", presentation: "simple" },
  { id: "retirement-income-chart", presentation: "simple" },
  { id: "income-details", presentation: "simple" },
  { id: "inflation-basis", presentation: "disclosure" },
] as const;

vi.mock("./retirement-income-chart-adapter", () => ({
  RetirementIncomeChartAdapter: (props: unknown) => {
    journeyContentMocks.retirementIncomeChartAdapter(props);
    return <div>Journey retirement income chart</div>;
  },
}));

vi.mock("./comparison", () => ({
  ComparisonPanel: (props: unknown) => {
    journeyContentMocks.comparisonPanel(props);
    return <div>Comparison panel</div>;
  },
  ComparisonSection: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  PensionSummarySection: (props: unknown) => {
    journeyContentMocks.pensionSummary(props);
    return <div>Pension summary</div>;
  },
  SimplePensionDetails: () => <div>Simple pension details</div>,
  SimplePensionSummary: () => <div>Simple pension summary</div>,
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
  const originalMatchMedia = window.matchMedia?.bind(window);

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
    journeyContentMocks.retirementIncomeChartAdapter.mockClear();
    journeyContentMocks.comparisonPanel.mockClear();
    journeyContentMocks.pensionSummary.mockClear();
  });

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

  it("places inline support beside its field using matching cards", () => {
    mockMatchMedia(false);

    render(
      <JourneyStepContent
        step={{
          id: "target",
          eyebrow: "Step 2",
          title: "What yearly income would you like?",
          description: "Choose a target.",
          kind: "fields",
          fieldIds: ["desiredRetirementIncome"],
          fieldLabels: {
            desiredRetirementIncome:
              "How much would you like each year in retirement?",
          },
          supportLinkLayout: "inline",
          supportLink: {
            heading: "Not sure what amount to choose?",
            description: "Use this guide as a starting point.",
            href: "https://www.retirementlivingstandards.org.uk/",
            label: "Help me choose a retirement income",
          },
        }}
        viewModel={createViewModel()}
      />
    );

    const supportLink = screen.getByRole("link", {
      name: /Help me choose a retirement income/i,
    });
    const incomeInput = screen.getByLabelText(
      "How much would you like each year in retirement?"
    );
    const supportCard = supportLink.closest(".field-card");
    const incomeCard = incomeInput.closest(".field-card");

    expect(supportLink).toHaveAttribute(
      "href",
      "https://www.retirementlivingstandards.org.uk/"
    );
    expect(supportCard).not.toBeNull();
    expect(incomeCard).not.toBeNull();
    expect(supportCard?.parentElement).toBe(incomeCard?.parentElement);
    expect(supportCard?.parentElement).toHaveClass("field-grid");
  });

  it("shows the income gap before estimating Added Pension needed", async () => {
    mockMatchMedia(false);
    const viewModel = createViewModel();
    viewModel.settings = {
      ...viewModel.settings,
      desiredRetirementIncome: 60000,
      retirementIncomeTargetBasis: "after_tax",
      taxationEnabled: true,
    };

    render(
      <JourneyStepContent
        step={{
          id: "alpha-options",
          eyebrow: "Projection so far",
          title: "Could Added Pension close the gap?",
          description: "Compare the target with the projection.",
          kind: "fields",
          fieldIds: ["alphaAddedPensionMonthly"],
          addedPensionIncomeGoal: true,
          optionalQuestion: {
            prompt: "Would you like Added Pension to try to close this gap?",
            noLabel: "No, keep this projection",
            yesLabel: "Yes, estimate the Added Pension needed",
            showPrompt: true,
            setting: {
              id: "alphaAddedPensionMonthly",
              enabledWhen: "positive",
            },
          },
        }}
        viewModel={viewModel}
      />
    );

    expect(
      screen.getByRole("radio", {
        name: "No, keep this projection",
      })
    ).toBeChecked();
    expect(
      screen.getByRole("heading", {
        name: "Your projection before Added Pension",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your target spending after estimated tax")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Estimated take-home pension income")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Estimated monthly spending gap")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This comparison includes an unconfirmed State Pension/)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("radio", {
        name: "Yes, estimate the Added Pension needed",
      })
    );

    expect(
      screen.getByRole("heading", { name: "Estimated Added Pension needed" })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(viewModel.onChange).toHaveBeenCalledWith(
        "alphaAddedPensionMonthly",
        expect.any(Number)
      )
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: "No, keep this projection",
      })
    );

    expect(viewModel.onChange).toHaveBeenCalledWith(
      "alphaAddedPensionMonthly",
      0
    );
  });

  it("reveals EPA fields only after a plain-English yes answer", () => {
    mockMatchMedia(false);
    const viewModel = createViewModel();

    render(
      <JourneyStepContent
        step={{
          id: "alpha-epa",
          eyebrow: "Optional",
          title: "Do you have an Alpha EPA?",
          description: "Choose whether to include an EPA.",
          kind: "fields",
          fieldIds: [
            "alphaEpaYearsBeforeNpa",
            "alphaEpaStartDate",
            "alphaEpaEndDate",
          ],
          fieldLabels: {
            alphaEpaYearsBeforeNpa: "How many years early does your EPA cover?",
          },
          optionalQuestion: {
            prompt: "Do you have an Alpha EPA?",
            noLabel: "No, I do not have an EPA",
            yesLabel: "Yes, I have an EPA",
            setting: {
              id: "alphaEpaEnabled",
              enabledWhen: "true",
            },
          },
        }}
        viewModel={viewModel}
      />
    );

    expect(
      screen.getByRole("radio", { name: "No, I do not have an EPA" })
    ).toBeChecked();
    expect(
      screen.queryByLabelText("How many years early does your EPA cover?")
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Yes, I have an EPA" }));

    expect(viewModel.onChange).toHaveBeenCalledWith("alphaEpaEnabled", true);
    expect(
      screen.getByLabelText("How many years early does your EPA cover?")
    ).toBeInTheDocument();
  });

  it("makes the full State Pension an explicit unconfirmed assumption", () => {
    mockMatchMedia(false);
    const viewModel = createViewModel();
    viewModel.settings = {
      ...viewModel.settings,
      currentStatePension: 12_000,
      statePensionForecastConfirmed: false,
    };

    render(
      <JourneyStepContent
        step={{
          id: "state-pension-forecast",
          eyebrow: "Step 5",
          title: "Do you know your State Pension forecast?",
          description: "Confirm the State Pension amount.",
          kind: "fields",
          fieldIds: ["currentStatePension"],
          fieldLabels: {
            currentStatePension:
              "How much State Pension does your forecast show each year?",
          },
          optionalQuestion: {
            prompt: "Do you know your State Pension forecast?",
            noLabel: "No — use £12,548 a year for now",
            yesLabel: "Yes, enter my forecast",
            showPrompt: true,
            setting: {
              id: "statePensionForecastConfirmed",
              enabledWhen: "true",
            },
          },
        }}
        viewModel={viewModel}
      />
    );

    expect(
      screen.getByRole("radio", {
        name: "No — use £12,548 a year for now",
      })
    ).toBeChecked();
    expect(
      screen.getByRole("heading", { name: "What we'll use for now" })
    ).toBeInTheDocument();
    expect(screen.getByText(/We'll use/)).toHaveTextContent("£12,548 a year");
    expect(screen.getByText(/Your result will remind you/)).toHaveTextContent(
      "changing it could leave you with less than the amount you want"
    );
    expect(
      screen.getByRole("radio", {
        name: "No — use £12,548 a year for now",
      })
    ).toHaveAttribute("aria-describedby", "state-pension-assumption");
    expect(
      screen.queryByLabelText(
        "How much State Pension does your forecast show each year?"
      )
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("radio", { name: "Yes, enter my forecast" })
    );

    expect(viewModel.onChange).toHaveBeenCalledWith(
      "statePensionForecastConfirmed",
      true
    );
    expect(
      screen.getByLabelText(
        "How much State Pension does your forecast show each year?"
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "What we'll use for now" })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("radio", {
        name: "No — use £12,548 a year for now",
      })
    );

    expect(viewModel.onChange).toHaveBeenCalledWith(
      "currentStatePension",
      12_547.6
    );
    expect(viewModel.onChange).toHaveBeenCalledWith(
      "statePensionForecastConfirmed",
      false
    );
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
          kind: "results",
          sections: DETAILED_RESULTS_SECTIONS,
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
          kind: "results",
          sections: DETAILED_RESULTS_SECTIONS,
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
          kind: "results",
          sections: STANDARD_RESULTS_SECTIONS,
        }}
        viewModel={createViewModel()}
      />
    );

    expect(
      screen.queryByText("Projection table section")
    ).not.toBeInTheDocument();
    expect(projectionTableMocks.section).not.toHaveBeenCalled();
  });

  it.each([
    {
      sections: STANDARD_RESULTS_SECTIONS,
      chartText: "Journey retirement income chart",
    },
    {
      sections: DETAILED_RESULTS_SECTIONS,
      chartText: "Journey retirement income chart",
    },
  ])(
    "places the projection basis below the $chartText",
    ({ sections, chartText }) => {
      mockMatchMedia(false);

      render(
        <JourneyStepContent
          step={{
            id: "results",
            eyebrow: "Results",
            title: "Results",
            description: "Review results",
            kind: "results",
            sections,
          }}
          viewModel={createViewModel()}
        />
      );

      const chart = screen.getByText(chartText);
      const projectionBasis = screen.getByText("Inflation basis");

      expect(
        chart.compareDocumentPosition(projectionBasis) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  );

  it("places flexible-fund priority in the retirement income target step", () => {
    mockMatchMedia(false);
    const viewModel = createViewModel();
    viewModel.settings = {
      ...viewModel.settings,
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
          showFlexibleWithdrawalPriority: true,
          showSpendingSmileEditor: true,
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
          showFlexibleWithdrawalPriority: true,
          showSpendingSmileEditor: true,
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
          showFlexibleWithdrawalPriority: true,
          showSpendingSmileEditor: true,
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
          showFlexibleWithdrawalPriority: true,
          showSpendingSmileEditor: true,
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
          spendingStrategyType: "FLAT",
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

  it("keeps flexible withdrawal results out of standard results", () => {
    mockMatchMedia(false);

    render(
      <JourneyStepContent
        step={{
          id: "answer",
          eyebrow: "Result",
          title: "Your results",
          description: "Review results",
          kind: "results",
          sections: STANDARD_RESULTS_SECTIONS,
        }}
        viewModel={createViewModel()}
      />
    );

    const summaryProps = journeyContentMocks.pensionSummary.mock
      .calls[0]?.[0] as Record<string, unknown>;
    const chartProps = journeyContentMocks.retirementIncomeChartAdapter.mock
      .calls[0]?.[0] as Record<string, unknown> | undefined;

    expect(summaryProps.flexibleWithdrawalSummary).toBeUndefined();
    expect(chartProps?.showFlexibleWithdrawalInsights).not.toBe(true);
  });

  it("can omit comparison controls from simplified results", () => {
    mockMatchMedia(false);

    render(
      <JourneyStepContent
        step={{
          id: "answer",
          eyebrow: "Result",
          title: "Your results",
          description: "Review results",
          kind: "results",
          sections: SIMPLE_RESULTS_SECTIONS,
        }}
        viewModel={createViewModel()}
      />
    );

    expect(journeyContentMocks.comparisonPanel).not.toHaveBeenCalled();
    expect(screen.queryByText("Comparison panel")).not.toBeInTheDocument();
    expect(screen.getByText("Simple pension summary")).toBeInTheDocument();
    expect(screen.getByText("Simple pension details")).toBeInTheDocument();
    expect(
      screen.getByText("Journey retirement income chart")
    ).toBeInTheDocument();
    expect(screen.getByText("Inflation basis")).toBeInTheDocument();
    expect(
      journeyContentMocks.retirementIncomeChartAdapter
    ).toHaveBeenCalledWith(expect.objectContaining({ presentation: "simple" }));
  });

  it("enables flexible withdrawal results in detailed results", () => {
    mockMatchMedia(false);

    render(
      <JourneyStepContent
        step={{
          id: "answer",
          eyebrow: "Result",
          title: "Your results",
          description: "Review results",
          kind: "results",
          sections: DETAILED_RESULTS_SECTIONS,
        }}
        viewModel={createViewModel()}
      />
    );

    const summaryProps = journeyContentMocks.pensionSummary.mock
      .calls[0]?.[0] as Record<string, unknown>;
    const chartProps = journeyContentMocks.retirementIncomeChartAdapter.mock
      .calls[0]?.[0] as Record<string, unknown>;

    expect(summaryProps.flexibleWithdrawalSummary).toBeDefined();
    expect(chartProps.presentation).toBe("detailed");
    expect(chartProps.residualFlexibleFundInsights).toBeDefined();
  });

  it("configures summary and chart presentations independently", () => {
    mockMatchMedia(false);

    render(
      <JourneyStepContent
        step={{
          id: "answer",
          eyebrow: "Result",
          title: "Your results",
          description: "Review results",
          kind: "results",
          sections: [
            { id: "summary", presentation: "standard" },
            { id: "retirement-income-chart", presentation: "detailed" },
          ],
        }}
        viewModel={createViewModel()}
      />
    );

    const summaryProps = journeyContentMocks.pensionSummary.mock
      .calls[0]?.[0] as Record<string, unknown>;

    expect(summaryProps.flexibleWithdrawalSummary).toBeUndefined();
    expect(
      journeyContentMocks.retirementIncomeChartAdapter
    ).toHaveBeenCalledWith(
      expect.objectContaining({ presentation: "detailed" })
    );
  });
});

function createViewModel(): JourneyStepViewModel {
  const settings = createDefaultSettings();
  const retirementPlanResult = calculateRetirementPlan(settings);

  return {
    settings,
    retirementPlanResult,
    currentComparisonResult: createComparisonResult(
      {
        id: "current-model",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings),
      retirementPlanResult
    ),
    validationIssues: [],
    pensionSummary: null,
    retirementIncomeSeries: [],
    retirementIncomeChartParameters:
      createRetirementIncomeChartParameters(settings),
    retirementIncomeChartLimits: createRetirementIncomeChartLimits(settings),
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
