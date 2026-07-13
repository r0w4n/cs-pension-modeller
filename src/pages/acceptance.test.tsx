import { render, screen, within } from "@testing-library/react";
import { AcceptancePage } from "./acceptance";

describe("AcceptancePage", () => {
  it("renders generated feature files with public status language", () => {
    render(<AcceptancePage />);

    expect(document.title).toBe(
      "Acceptance criteria | Civil Service Pension Modeller"
    );
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "Read the behaviour scenarios used to check the Civil Service Pension Modeller."
    );

    expect(
      screen.getByRole("heading", { name: "Acceptance criteria" })
    ).toBeInTheDocument();
    expect(screen.getByText("Alpha pension modelling")).toBeInTheDocument();
    expect(
      screen.getByText("Build alpha pension while active")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Covered by tests").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Under review").length).toBeGreaterThan(0);
  });

  it("shows scenario steps and example tables from the feature file", () => {
    render(<AcceptancePage />);

    const alphaScenario = screen
      .getByText("Build alpha pension while active")
      .closest("details");

    expect(alphaScenario).not.toBeNull();

    const scenario = alphaScenario as HTMLElement;
    expect(scenario).toHaveTextContent(
      "Given the member is in the alpha scheme"
    );
    expect(scenario).toHaveTextContent(
      "Passing current alpha accrual examples"
    );

    const table = within(scenario).getByRole("table", {
      name: "Passing current alpha accrual examples data",
    });

    expect(
      within(table).getByRole("columnheader", {
        name: "startingAlphaPension",
      })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("cell", { name: "4176.00" })
    ).toBeInTheDocument();
  });
});
