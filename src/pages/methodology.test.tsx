import { render, screen } from "@testing-library/react";
import { MethodologyPage } from "./methodology";

describe("MethodologyPage", () => {
  it("includes the assumptions and omissions section", () => {
    render(<MethodologyPage />);

    expect(document.title).toBe("Methodology | Civil Service Pension Modeller");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "Read how the modeller projects pension income, bridge funding, tax, inflation, and other assumptions."
    );
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

  it("includes the nuvos early-payment worked example", () => {
    render(<MethodologyPage />);

    const nuvosHeading = screen.getByRole("heading", {
      name: "nuvos pension methodology",
    });
    const nuvosSection = nuvosHeading.closest("section");

    expect(nuvosSection).not.toBeNull();
    expect(nuvosSection as HTMLElement).toHaveTextContent(
      "if nuvos is drawn 4 years and 10 months before age 65"
    );
    expect(nuvosSection as HTMLElement).toHaveTextContent(
      "factor = 1 - 22.33% = 0.7767"
    );
  });
});
