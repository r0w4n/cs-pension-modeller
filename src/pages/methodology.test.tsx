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

  it("documents current Alpha GAD factor provenance and completed-month lookup", () => {
    render(<MethodologyPage />);

    const alphaHeading = screen.getByRole("heading", {
      name: "Alpha pension methodology",
    });
    const alphaSection = alphaHeading.closest("section");

    expect(alphaSection).not.toBeNull();
    expect(alphaSection as HTMLElement).toHaveTextContent(
      "CS_GB_Consolidated_Factors_2026-01.xlsx, issued on 29 May 2026"
    );
    expect(alphaSection as HTMLElement).toHaveTextContent(
      "table 0-402 for NPA/EPA 65, table 0-403 for 66, table 0-404 for 67, and table 0-405 for 68"
    );
    expect(alphaSection as HTMLElement).toHaveTextContent(
      "matched to the published factor for age in complete years and months, ignoring part months"
    );
    expect(alphaSection as HTMLElement).toHaveTextContent(
      "If NPA or EPA is itself a non-integer age"
    );
    expect(
      screen.getByRole("link", {
        name: "GAD Alpha early-payment factor tables",
      })
    ).toHaveAttribute(
      "href",
      "https://gadfactorguidancehub.co.uk/guidance/csps_gb/erf-and-lrf/csps_gb__csops__early-payment-reduction-normal-health-and-age-addition/tables"
    );
  });

  it("documents Premium factor provenance, scope, and the current review caveat", () => {
    render(<MethodologyPage />);

    const premiumHeading = screen.getByRole("heading", {
      name: "Premium pension methodology",
    });
    const premiumSection = premiumHeading.closest("section");

    expect(premiumSection).not.toBeNull();
    expect(premiumSection as HTMLElement).toHaveTextContent(
      "no further Premium accrual and no further Premium contributions"
    );
    expect(premiumSection as HTMLElement).toHaveTextContent("version 2026-01");
    expect(premiumSection as HTMLElement).toHaveTextContent(
      "sheet x-406, table 1-406 (guidance table P1ER60PEN1)"
    );
    expect(premiumSection as HTMLElement).toHaveTextContent(
      "sheet x-410, table 1-410 (guidance table P1ER65PEN1)"
    );
    expect(premiumSection as HTMLElement).toHaveTextContent(
      "published NPA 60 factor at age 55 is 0.806"
    );
    expect(premiumSection as HTMLElement).toHaveTextContent(
      "entry for age in completed years and completed months, ignoring part months"
    );
    expect(premiumSection as HTMLElement).toHaveTextContent(
      "does not estimate under-55 cases or personal Normal Pension Ages other than 60 or 65"
    );
    expect(premiumSection as HTMLElement).toHaveTextContent(
      "does not substitute tables 1-408 or 1-412 as direct pension multipliers"
    );
    expect(premiumSection as HTMLElement).toHaveTextContent(
      "under review following the change to the SCAPE discount rate"
    );
    expect(
      screen.getByRole("link", {
        name: "GAD Civil Service early-retirement factor tables",
      })
    ).toHaveAttribute(
      "href",
      "https://gadfactorguidancehub.co.uk/guidance/csps_gb/erf-and-lrf/csps_gb__pcsps__early-retirement-late-retirement-age-addition-and-late-payment-supplement/tables"
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
    expect(
      screen.getByText(/The retirement income summary starts/)
    ).toHaveTextContent(
      "each range starting when the active income sources change"
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
    expect(
      screen.getByText(/Regular LISA saving and scheduled lump sums/)
    ).toHaveTextContent(
      "The regular monthly contribution control is capped at one twelfth of the annual LISA allowance."
    );
  });
});
