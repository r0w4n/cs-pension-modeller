import { fireEvent, render, screen } from "@testing-library/react";
import {
  AssumptionsVersionStrip,
  RetirementIncomeDisplayToggle,
  RetirementIncomeSummaryFooter,
  ResultsSummarySection,
} from "./results-summary";

describe("results-summary module", () => {
  it("renders section children", () => {
    render(
      <ResultsSummarySection>
        <p>Summary child</p>
      </ResultsSummarySection>
    );

    expect(screen.getByText("Summary child")).toBeInTheDocument();
  });

  it("switches income display", () => {
    const onChange = vi.fn();

    render(
      <RetirementIncomeDisplayToggle value="monthly" onChange={onChange} />
    );

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
      />
    );

    expect(screen.getByText("Annual total")).toBeInTheDocument();
    expect(screen.getByText("Annual target")).toBeInTheDocument();
  });

  it("renders the assumptions version strip", () => {
    render(<AssumptionsVersionStrip />);

    expect(
      screen.getByRole("heading", { name: "Planning tool only" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Planning and privacy disclaimer")
    ).toHaveTextContent(
      "This modeller is for illustration, not financial advice."
    );
    expect(
      screen.getByRole("link", { name: "View methodology" })
    ).toHaveAttribute("href", "./methodology/index.html");
    expect(screen.queryByText(/Assumptions version/i)).not.toBeInTheDocument();
  });
});
