import { fireEvent, render, screen } from "@testing-library/react";
import {
  AssumptionsVersionStrip,
  GovernedAssumptionsTable,
  RetirementIncomeDisplayToggle,
  RetirementIncomeSummaryFooter,
  ResultsSummarySection,
} from "./results-summary";

describe("results-summary module", () => {
  it("renders section children", () => {
    render(
      <ResultsSummarySection>
        <p>Summary child</p>
      </ResultsSummarySection>,
    );

    expect(screen.getByText("Summary child")).toBeInTheDocument();
  });

  it("switches income display", () => {
    const onChange = vi.fn();

    render(<RetirementIncomeDisplayToggle value="monthly" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Annual" }));
    expect(onChange).toHaveBeenCalledWith("annual");
  });

  it("renders retirement income footer labels", () => {
    render(
      <RetirementIncomeSummaryFooter
        totalLabel="Annual total"
        totalValue="£10"
        targetLabel="Annual target"
        targetValue="£20"
      />,
    );

    expect(screen.getByText("Annual total")).toBeInTheDocument();
    expect(screen.getByText("Annual target")).toBeInTheDocument();
  });

  it("renders the assumptions version strip", () => {
    render(<AssumptionsVersionStrip />);

    expect(screen.getByLabelText("Assumptions version")).toHaveTextContent(
      "Assumptions version 2026.05",
    );
    expect(screen.getByRole("link", { name: "View methodology" })).toHaveAttribute(
      "href",
      "./methodology/index.html",
    );
  });

  it("renders the governed assumptions table", () => {
    render(<GovernedAssumptionsTable />);

    expect(screen.getByRole("columnheader", { name: "Affected fields" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /State Pension age/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /GOV.UK State Pension age guidance/i }),
    ).toHaveAttribute("href", "https://example.com/source-url-placeholder");
  });
});
