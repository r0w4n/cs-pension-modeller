import { render, screen } from "@testing-library/react";
import { MethodologyPage } from "./methodology";

describe("MethodologyPage", () => {
  it("includes the assumptions and omissions section", () => {
    render(<MethodologyPage />);

    expect(document.title).toBe("Methodology | Civil Service Pension Modeller");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "Read how the modeller projects pension income, flexible withdrawals, tax, inflation, and other assumptions."
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
      "Income Tax is estimated from configurable standard assumptions. It supports the 2026/27 rest-of-UK and Scottish regimes"
    );
    expect(assumptionsSectionElement).toHaveTextContent(
      "Inflation is only modelled where explicit CPI or growth assumptions are enabled."
    );
    expect(assumptionsSectionElement).toHaveTextContent(
      "The modeller does not calculate Alpha ill-health retirement, death benefits, survivor benefits, transfers, pension sharing, scheme pays adjustments, or remedy-specific benefit choices."
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

  it("documents the supported UK pension Income Tax rules and limitations", () => {
    render(<MethodologyPage />);

    const taxSection = screen
      .getByRole("heading", { name: "Tax methodology" })
      .closest("section") as HTMLElement;

    expect(taxSection).toHaveTextContent(
      "The selected regime is applied unchanged throughout the projection"
    );
    expect(taxSection).toHaveTextContent("classic pension");
    expect(taxSection).toHaveTextContent("classic plus pension");
    expect(taxSection).toHaveTextContent(
      "summed taxable income represented in each modelled April-to-March year as a proxy for adjusted net income"
    );
    expect(taxSection).toHaveTextContent(
      "starter rate 19% up to £3,967; basic rate 20% up to £16,956; intermediate rate 21% up to £31,092; higher rate 42% up to £62,430; advanced rate 45% up to £125,140; and top rate 48% above £125,140"
    );
    expect(taxSection).toHaveTextContent(
      "effective from 6 April 2026 to 5 April 2027"
    );
    expect(taxSection).toHaveTextContent(
      "shared pension lump-sum allowance less the amount entered as already used"
    );
    expect(taxSection).toHaveTextContent(
      "usual standard allowance is £268,275"
    );
    expect(taxSection).toHaveTextContent(
      "£10,000 money purchase annual allowance"
    );
    expect(
      screen.getByRole("link", { name: "HMRC Scottish Income Tax rates" })
    ).toHaveAttribute("href", "https://www.gov.uk/scottish-income-tax");
    expect(
      screen.getByRole("link", { name: "taxable pension income" })
    ).toHaveAttribute("href", "https://www.gov.uk/tax-on-pension/taxed");
    expect(
      screen.getByRole("link", { name: "State Pension tax guidance" })
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/guidance/how-your-state-pension-is-taxed"
    );
    expect(
      screen.getByRole("link", { name: "pension lump-sum allowance" })
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/tax-on-your-private-pension/lump-sum-allowance"
    );
    expect(
      screen.getByRole("link", {
        name: "£10,000 money purchase annual allowance",
      })
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/guidance/work-out-your-allowances-if-youve-flexibly-accessed-your-pension"
    );
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
    expect(alphaSection as HTMLElement).toHaveTextContent(
      "age-addition tables 0-415 and 0-416"
    );
    expect(alphaSection as HTMLElement).toHaveTextContent(
      "late-payment-supplement tables 0-419 and 0-420"
    );
    expect(alphaSection as HTMLElement).toHaveTextContent(
      "£12 of lump sum for each £1 of annual pension exchanged"
    );
    expect(
      screen.getByRole("link", {
        name: "GAD Alpha early-payment factor tables",
      })
    ).toHaveAttribute(
      "href",
      "https://gadfactorguidancehub.co.uk/guidance/csps_gb/erf-and-lrf/csps_gb__csops__early-payment-reduction-normal-health-and-age-addition/tables"
    );
    expect(
      screen.getByRole("link", {
        name: "GAD Alpha age-addition methodology",
      })
    ).toHaveAttribute(
      "href",
      "https://gadfactorguidancehub.co.uk/guidance/csps_gb/erf-and-lrf/csps_gb__csops__early-payment-reduction-normal-health-and-age-addition/methodology/age-additions-and-assumed-age-additions-for-active-members-retiring-after-npaepa"
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

  it("documents currently modelled pension, savings, withdrawal, and comparison mechanisms", () => {
    render(<MethodologyPage />);

    expect(
      screen.getByRole("heading", { name: "Alpha EPA" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Each EPA portion's unreduced date is calculated/)
    ).toHaveTextContent(
      "Each EPA portion's unreduced date is calculated as Normal Pension Age minus its selected number of EPA years."
    );
    expect(
      screen.getByText(/Under the Alpha scheme rules, partial retirement/)
    ).toHaveTextContent("reduction in pensionable earnings of at least 20%");
    expect(
      screen.getByText(/grosses up net additions by 1 \/ 0.8/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Flexible withdrawals before later pensions",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The retirement income summary starts/)
    ).toHaveTextContent(
      "each range starting when the active income sources change"
    );
    expect(screen.getByText(/Account balances include/)).toHaveTextContent(
      "Each account then follows its configured access age and withdrawal strategy"
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
      screen.getByText("ISA, LISA, SIPP and CS AVC depletion ages")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Lifetime ISA methodology" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Regular LISA saving and scheduled lump sums/)
    ).toHaveTextContent(
      "LISA payments count towards the overall annual ISA subscription allowance."
    );
    expect(
      screen.getByText(/Regular LISA saving and scheduled lump sums/)
    ).toHaveTextContent("modeller convention for regular saving");
    expect(
      screen.getByText(/Known simplification: the retirement LISA projection/)
    ).toHaveTextContent("terminal-illness withdrawals");
    expect(
      screen.getByText(/Known simplification: the retirement LISA projection/)
    ).toHaveTextContent(
      "does not validate combined ISA and LISA subscriptions"
    );
  });
});
