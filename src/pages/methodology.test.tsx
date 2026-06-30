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
      "SIPP tax relief is modelled as a simple gross-up of selected contributions."
    );
    expect(assumptionsSectionElement).toHaveTextContent(
      "Investment growth is deterministic."
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

  it("documents currently modelled pension, savings, bridge, and comparison mechanisms", () => {
    render(<MethodologyPage />);

    expect(
      screen.getByRole("heading", { name: "Alpha EPA" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The EPA unreduced date is calculated/)
    ).toHaveTextContent(
      "The EPA unreduced date is calculated as Normal Pension Age minus the selected number of EPA years."
    );
    expect(
      screen.getByText(/grosses up net additions by 1 \/ 0.8/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Before SIPP and LISA access/)).toHaveTextContent(
      "draws from SIPP first"
    );
    expect(screen.getByText(/From LISA access onwards/)).toHaveTextContent(
      "draw from LISA before ISA"
    );
    expect(
      screen.getByText(/highest of the main inflation assumption/)
    ).toHaveTextContent(
      "the main inflation assumption, the State Pension wage-growth assumption, and 2.5%"
    );
    expect(
      screen.getByRole("heading", { name: "Scenario comparison methodology" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("ISA, LISA and SIPP depletion ages")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Lifetime ISA methodology" })
    ).toBeInTheDocument();
  });
});
