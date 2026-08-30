import { fireEvent, render, screen } from "@testing-library/react";
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
  it("adapts the established results summary and table panels for a household", () => {
    const settings = createDefaultSettings();
    const jointSettings = {
      ...settings,
      jointRetirement: { ...settings.jointRetirement, enabled: true },
      partner: createDefaultPartnerSettings(),
    };
    const projection = calculateJointRetirementProjection(jointSettings);

    render(
      <JointRetirementResults
        projection={projection}
        settings={jointSettings}
        chartParameters={createRetirementIncomeChartParameters(jointSettings)}
        chartLimits={createRetirementIncomeChartLimits(jointSettings)}
        onChange={() => undefined}
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
      screen.getByRole("region", { name: "Retirement income over time" })
    ).toBeInTheDocument();
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
    expect(
      screen.getByTestId("retirement-income-static-milestone-you-retirement")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        "retirement-income-static-milestone-partner-retirement"
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("slider", { name: "Target income line" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("slider", { name: "Added Alpha pension" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("slider", { name: "Target income line" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show all rows" })
    ).toHaveAttribute("aria-pressed", "true");
    const monthlyChartButton = screen.getByRole("button", {
      name: "Show chart as monthly",
    });
    fireEvent.click(monthlyChartButton);
    expect(monthlyChartButton).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("group", { name: "Joint results chart view" })
    ).toBeInTheDocument();
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

    fireEvent.click(
      screen.getByRole("button", { name: "Partner retirement income" })
    );

    expect(
      screen.getByRole("heading", {
        name: "Monthly Partner’s income projection table",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: /Retire, age/ })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Chart key")).not.toHaveTextContent(
      "Shortfall"
    );
    expect(
      screen.getByText(
        /Estimated Income Tax can appear before Partner’s retirement/
      )
    ).toBeInTheDocument();
  });
});
