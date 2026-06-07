import { render, screen } from "@testing-library/react";
import { MethodologyPage } from "./methodology";

describe("MethodologyPage", () => {
  it("includes the assumptions and omissions section", () => {
    render(<MethodologyPage />);

    expect(
      screen.getByRole("heading", { name: "Methodology" })
    ).toBeInTheDocument();

    const assumptionsHeading = screen.getByRole("heading", {
      name: "Important assumptions and omissions",
    });
    const assumptionsSection = assumptionsHeading.closest("section");
    const assumptionsSectionElement = assumptionsSection as HTMLElement;

    expect(assumptionsSection).not.toBeNull();
    expect(assumptionsSectionElement).toHaveTextContent(
      "The modeller intentionally simplifies some areas so that results remain understandable and configurable."
    );
    expect(assumptionsSectionElement).toHaveTextContent(
      "Income Tax is estimated from configurable standard assumptions."
    );
    expect(assumptionsSectionElement).toHaveTextContent(
      "Inflation is only modelled where explicit CPI or growth assumptions are enabled."
    );
    expect(assumptionsSectionElement).toHaveTextContent(
      "State Pension modelling does not cover benefit interactions, overseas rules, lump-sum arrears choices, or pre-2016 deferral rules."
    );
    expect(assumptionsSectionElement).toHaveTextContent(
      "Added pension purchase revaluation is simplified."
    );
    expect(assumptionsSectionElement).toHaveTextContent(
      "Scheme-specific edge cases are not exhaustively represented."
    );
    expect(
      screen.queryByRole("heading", { name: "Planning tool only" })
    ).not.toBeInTheDocument();
  });
});
