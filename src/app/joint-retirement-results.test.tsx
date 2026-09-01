import { fireEvent, render, screen, within } from "@testing-library/react";
import { calculateJointRetirementProjection } from "../calculation/joint-retirement-plan";
import {
  createDefaultPartnerSettings,
  createDefaultSettings,
} from "../settings";
import {
  createRetirementIncomeChartLimits,
  createRetirementIncomeChartParameters,
} from "../result-projection/retirement-income";
import { JointRetirementResults } from "./joint-retirement-results";

describe("JointRetirementResults", () => {
  it("passes coordinated flexible withdrawals into the household chart series", () => {
    const defaults = createDefaultSettings();
    const settings = {
      ...defaults,
      dateOfBirth: "1977-04-01",
      requirementAge: 54.5,
      lifeExpectancy: 85,
      showAlpha: true,
      alphaPensionLeaveAge: 55,
      alphaPensionDrawAge: 57,
      accruedPensionAtLastAbs: 16_000,
      pensionableEarnings: 70_000,
      showIsa: true,
      isaCurrentPot: 45_000,
      isaMonthlyContribution: 2_000,
      isaDrawAge: 54,
      isaWithdrawalStrategy: "meet_income_target" as const,
      showSipp: true,
      sippCurrentPot: 45_000,
      sippMonthlyContribution: 1_725,
      sippDrawAge: 57,
      sippWithdrawalStrategy: "meet_income_target" as const,
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1986-10-01",
        requirementAge: 65,
        lifeExpectancy: 85,
        showIsa: true,
        isaCurrentPot: 1_000,
        isaMonthlyContribution: 2_000,
        isaDrawAge: 54.25,
        isaWithdrawalStrategy: "meet_income_target" as const,
        showSipp: true,
        sippCurrentPot: 15_000,
        sippMonthlyContribution: 1_875,
        sippDrawAge: 65,
        sippWithdrawalStrategy: "meet_income_target" as const,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 45_400,
        fullyRetiredDesiredRetirementIncome: 45_400,
        flexibleWithdrawalPriority: [
          "you:isa" as const,
          "you:sipp" as const,
          "partner:isa" as const,
          "partner:sipp" as const,
        ],
      },
    };
    const projection = calculateJointRetirementProjection(settings);
    const onChange = vi.fn();

    render(
      <JointRetirementResults
        projection={projection}
        settings={settings}
        {...createResultsPresentationProps()}
        chartParameters={createRetirementIncomeChartParameters(settings)}
        chartLimits={createRetirementIncomeChartLimits(settings)}
        onChange={onChange}
      />
    );

    expect(
      screen.getByTestId("retirement-income-chart-data-equivalent")
    ).toHaveTextContent("You — ISA");
    const chart = screen.getByRole("region", {
      name: "Household Retirement Plan",
    });
    expect(chart.querySelectorAll('path[stroke="#1f8ee6"]')).toHaveLength(2);
  });

  it("shows the shared over-saving diagnostic for each person's coordinated pots", () => {
    const defaults = createDefaultSettings();
    const settings = {
      ...defaults,
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 75,
      desiredRetirementIncome: 12_000,
      taxationEnabled: false,
      showAlpha: false,
      showStatePension: false,
      showIsa: false,
      showSipp: true,
      sippCurrentPot: 500_000,
      sippMonthlyContribution: 1_000,
      sippDrawAge: 60,
      sippWithdrawalStrategy: "meet_income_target" as const,
      flexibleWithdrawalPriority: ["sipp" as const],
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1970-06-01",
        requirementAge: 60,
        lifeExpectancy: 75,
        taxationEnabled: false,
        showStatePension: false,
        showIsa: false,
        showSipp: true,
        sippCurrentPot: 20_000,
        sippMonthlyContribution: 200,
        sippDrawAge: 60,
        sippWithdrawalStrategy: "meet_income_target" as const,
        flexibleWithdrawalPriority: ["sipp" as const],
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 12_000,
        fullyRetiredDesiredRetirementIncome: 12_000,
        flexibleWithdrawalPriority: [
          "you:sipp" as const,
          "partner:sipp" as const,
        ],
      },
    };
    const projection = calculateJointRetirementProjection(settings);

    render(
      <JointRetirementResults
        projection={projection}
        settings={settings}
        {...createResultsPresentationProps()}
        chartParameters={createRetirementIncomeChartParameters(settings)}
        chartLimits={createRetirementIncomeChartLimits(settings)}
        onChange={vi.fn()}
      />
    );

    const warningSection = screen
      .getByRole("heading", { name: "Potential over-saving" })
      .closest(".summary-status-block");
    expect(warningSection).toHaveTextContent(
      /Your SIPP: Potential over-saving: the model leaves £[\d,]+ in the SIPP at age 75\./
    );
    expect(warningSection).toHaveTextContent(
      /Partner SIPP: Potential over-saving: the SIPP is not used for modelled income and retains £[\d,]+ at age 75\./
    );
  });

  it("uses one editable household chart with owner-specific contribution controls", () => {
    const onChange = vi.fn();
    const settings = createDefaultSettings();
    const jointSettings = {
      ...settings,
      desiredRetirementIncome: 30_000,
      jointRetirement: {
        ...settings.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 45_400,
        fullyRetiredDesiredRetirementIncome: 45_400,
      },
      partner: {
        ...createDefaultPartnerSettings(),
        desiredRetirementIncome: 24_000,
      },
    };
    const projection = calculateJointRetirementProjection(jointSettings);

    render(
      <JointRetirementResults
        projection={projection}
        settings={jointSettings}
        {...createResultsPresentationProps()}
        chartParameters={createRetirementIncomeChartParameters(jointSettings)}
        chartLimits={createRetirementIncomeChartLimits(jointSettings)}
        onChange={onChange}
      />
    );

    expect(
      screen
        .getByRole("heading", { name: "Household retirement income summary" })
        .closest(".summary-section")
    ).toHaveClass("summary-section--feature");
    expect(
      screen
        .getByRole("heading", {
          name: "Monthly household income projection table",
        })
        .closest(".panel")
    ).not.toBeNull();
    expect(screen.getByText("Planning tool only")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("region", { name: "Household Retirement Plan" })
    ).toHaveLength(1);
    expect(screen.queryByText("Calendar month/year")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("retirement-income-you-age-axis")
    ).toHaveTextContent("You");
    expect(
      screen.getByTestId("retirement-income-partner-age-axis")
    ).toHaveTextContent("Partner");
    expect(screen.getByText("Your State Pension")).toBeInTheDocument();
    expect(screen.getByText("Partner State Pension")).toBeInTheDocument();
    expect(screen.getByText("Your SIPP")).toBeInTheDocument();
    expect(screen.getByText("Partner SIPP")).toBeInTheDocument();
    expect(screen.getByText("Your ISA")).toBeInTheDocument();
    expect(screen.getByText("Partner ISA")).toBeInTheDocument();
    expect(
      screen.getByTestId("retirement-income-chart-data-equivalent")
    ).toHaveTextContent(
      "Combined household retirement income uses a calendar-month timeline"
    );
    expect(
      screen.getByTestId("retirement-income-chart-data-equivalent")
    ).toHaveTextContent("You — State Pension");
    expect(
      screen.getByTestId("retirement-income-chart-data-equivalent")
    ).toHaveTextContent("Household events available through period inspection");
    const yourRetirementControl = screen.getByRole("slider", {
      name: "You: Retire",
    });
    const partnerRetirementControl = screen.getByRole("slider", {
      name: "Partner: Retire",
    });
    expect(screen.getByText("P1 Retire")).toBeInTheDocument();
    expect(screen.getByText("P2 Retire")).toBeInTheDocument();
    expect(screen.queryByText("Editing controls")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", {
        name: "Household chart control visibility",
      })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("group", {
        name: "Household chart contribution controls",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "Target income line" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "Your Added Alpha pension" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "Your ISA contribution" })
    ).toHaveAttribute("max", "2000");
    expect(
      screen.getByRole("slider", { name: "Your SIPP contribution" })
    ).toHaveAttribute("max", "2000");
    expect(
      screen.getByRole("slider", { name: "Partner ISA contribution" })
    ).toHaveAttribute("max", "2000");
    expect(
      screen.getByRole("slider", { name: "Partner SIPP contribution" })
    ).toHaveAttribute("max", "2000");
    expect(
      screen.getByRole("button", { name: "Show all rows" })
    ).toHaveAttribute("aria-pressed", "true");
    const monthlyChartButton = screen.getByRole("button", {
      name: "Show chart as monthly",
    });
    fireEvent.click(monthlyChartButton);
    expect(monthlyChartButton).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByRole("group", { name: "Joint results chart view" })
    ).not.toBeInTheDocument();
    const periodInspector = screen.getByTestId(
      "retirement-income-period-inspector"
    );
    fireEvent.focus(periodInspector);
    expect(
      screen.getByTestId("retirement-income-period-details")
    ).toHaveTextContent("Events");
    expect(
      screen.getByTestId("retirement-income-period-details")
    ).toHaveTextContent(/You retire|Partner retires/);

    fireEvent.keyDown(yourRetirementControl, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith("requirementAge", 67.75);
    expect(onChange).not.toHaveBeenCalledWith(
      "partner",
      expect.objectContaining({ requirementAge: 67.75 })
    );

    onChange.mockClear();
    fireEvent.keyDown(partnerRetirementControl, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith(
      "partner",
      expect.objectContaining({ requirementAge: 67.75 })
    );
    expect(onChange).not.toHaveBeenCalledWith("requirementAge", 67.75);

    onChange.mockClear();
    const partnerIsaContribution = screen.getByRole("slider", {
      name: "Partner ISA contribution",
    });
    fireEvent.change(partnerIsaContribution, { target: { value: "425" } });
    fireEvent.blur(partnerIsaContribution, { target: { value: "425" } });
    expect(onChange).toHaveBeenCalledWith(
      "partner",
      expect.objectContaining({ isaMonthlyContribution: 425 })
    );

    expect(
      screen.queryByRole("region", {
        name: "Partner household chart controls",
      })
    ).not.toBeInTheDocument();

    onChange.mockClear();
    fireEvent.keyDown(
      screen.getByRole("slider", { name: "Target income line" }),
      {
        key: "ArrowUp",
      }
    );
    expect(onChange).toHaveBeenCalledWith(
      "jointRetirement",
      expect.objectContaining({
        fullyRetiredDesiredRetirementIncome: 46_200,
      })
    );
  });

  it("matches the detailed single-person summary pattern", () => {
    const settings = {
      ...createDefaultSettings(),
      jointRetirement: {
        ...createDefaultSettings().jointRetirement,
        enabled: true,
      },
      partner: createDefaultPartnerSettings(),
    };
    const projection = calculateJointRetirementProjection(settings);
    const onDisplayChange = vi.fn();

    render(
      <JointRetirementResults
        projection={projection}
        settings={settings}
        {...createResultsPresentationProps()}
        chartParameters={createRetirementIncomeChartParameters(settings)}
        chartLimits={createRetirementIncomeChartLimits(settings)}
        retirementIncomeDisplay="annual"
        onRetirementIncomeDisplayChange={onDisplayChange}
      />
    );

    expect(
      screen.getByRole("group", {
        name: "Retirement income summary display",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Income at different periods" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Plan status" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Household target starts")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Both people retired")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Fully-retired household target")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Largest modelled household shortfall")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Household planning horizon" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "How the household assessment works",
      })
    ).not.toBeInTheDocument();

    const summaryToggle = screen.getByRole("group", {
      name: "Retirement income summary display",
    });
    fireEvent.click(
      within(summaryToggle).getByRole("button", { name: "Monthly" })
    );
    expect(onDisplayChange).toHaveBeenCalledWith("monthly");
  });
});

function createResultsPresentationProps() {
  return {
    outcome: {
      status: "onTrack" as const,
      label: "Looks workable" as const,
      message:
        "Based on the assumptions entered, the household estimate meets the shared target.",
    },
    statusItems: [
      { label: "Overall status", value: "Looks workable" },
      { label: "Target shortfall", value: "No household shortfall" },
      { label: "Main issue", value: "No issue identified" },
      { label: "Income basis", value: "After estimated Income Tax" },
    ],
  };
}
