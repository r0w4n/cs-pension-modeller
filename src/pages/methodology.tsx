import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StaticPageLayout } from "./static-page-layout";
import "../index.css";

const PROJECTED_SOURCES = [
  "Civil Service Alpha pension",
  "Alpha EPA pension where enabled",
  "Civil Service nuvos pension",
  "State Pension",
  "SIPP pension savings",
  "ISA savings",
  "Optional bridge funding before defined-benefit or State Pension income starts",
  "Simplified UK Income Tax",
  "Partial retirement effects",
  "Comparison between saved scenarios",
] as const;

const KEY_DATES = [
  "calculation start date",
  "Alpha and nuvos statement dates",
  "State Pension age",
  "Alpha pension draw age",
  "Alpha accrual stop age",
  "Alpha EPA unreduced date where EPA is enabled",
  "nuvos pension draw age",
  "nuvos accrual stop age",
  "SIPP access age",
  "ISA draw start age",
  "SIPP draw start age",
  "planning end age or life expectancy",
] as const;

const ADDED_PENSION_OPTIONS = [
  "monthly added-pension contributions",
  "lump-sum added-pension purchases",
  "factor type: self only, or self and dependants",
] as const;

const SIPP_PROJECTS = [
  "starting SIPP balance",
  "regular SIPP contributions",
  "lump-sum contributions",
  "selected tax-relief gross-up on net contributions",
  "investment growth",
  "selected SIPP draw age",
  "selected withdrawal strategy",
  "tax-free and taxable withdrawal proportions",
] as const;

const SIPP_WITHDRAWAL_APPROACHES = [
  "fixed annual withdrawal percentage",
  "depletion over life expectancy",
  "use-by-age strategy",
] as const;

const ISA_PROJECTS = [
  "starting ISA balance",
  "regular ISA contributions",
  "lump-sum ISA contributions",
  "investment growth",
  "selected ISA draw age",
  "selected withdrawal strategy",
] as const;

const BRIDGE_SENSITIVITIES = [
  "retirement age",
  "Alpha draw age",
  "State Pension age",
  "SIPP access age",
  "ISA and SIPP balances",
  "withdrawal order",
  "investment returns",
  "inflation",
  "income tax settings",
  "target retirement income",
] as const;

const PARTIAL_RETIREMENT_EFFECTS = [
  "future Alpha accrual",
  "future nuvos-related accrual assumptions",
  "SIPP contributions",
  "ISA contributions",
] as const;

const TAXABLE_INCOME_SOURCES = [
  "Alpha pension",
  "nuvos pension",
  "State Pension",
  "taxable SIPP withdrawals",
] as const;

const TAX_ASSUMPTIONS = [
  "Personal Allowance",
  "Personal Allowance taper",
  "basic-rate band",
  "higher-rate band",
  "additional-rate threshold",
  "taxable share of SIPP withdrawals",
] as const;

const COMPARISON_OUTPUTS = [
  "target income and projected gap",
  "lowest projected income",
  "years and lifetime amount below target",
  "secure pension income at key ages",
  "bridge-funding gaps before and after SIPP access",
  "ISA and SIPP depletion ages",
] as const;

function FormulaBlock({ children }: { children: string }) {
  return <pre className="section-copy formula-block">{children}</pre>;
}

export function MethodologyPage() {
  return (
    <StaticPageLayout
      eyebrow="Civil Service"
      title="Methodology"
      lead="This page explains how the Civil Service Pension Modeller projects retirement income, pension accrual, savings balances, drawdown, tax and bridge funding."
      description="Read how the modeller projects pension income, bridge funding, tax, inflation, and other assumptions."
    >
      <section>
        <p className="section-copy">
          The modeller is a deterministic monthly planning tool. It is designed
          for scenario comparison, not financial advice or probabilistic
          forecasting. Results depend directly on the inputs and assumptions you
          choose, including pension dates, inflation, wage growth, investment
          returns, withdrawal strategy, tax assumptions and life expectancy.
        </p>
      </section>

      <section>
        <h2>What the model projects</h2>
        <p className="section-copy">
          The modeller can project income and savings from several sources:
        </p>
        <ul className="section-copy">
          {PROJECTED_SOURCES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          The projection is run month by month from the selected start date to
          the selected planning horizon. Each month, the model calculates
          expected pension accrual, revaluation, savings growth, contributions,
          withdrawals, gross income, estimated tax and net income.
        </p>
        <p className="section-copy">
          Where earlier statement dates are needed, the model can build internal
          historical rows from those statement dates to the calculation start
          date. This lets accrued Alpha and nuvos components, added pension, EPA
          accrual and pension increases line up with the monthly projection.
        </p>
        <p className="section-copy">
          Within each row, investment pots are grown before that month&apos;s
          contribution and withdrawal calculations are applied. Defined-benefit
          income starts from the selected draw dates, flexible withdrawals are
          limited to the available pot balance, and Income Tax is calculated
          after gross income for the month has been assembled.
        </p>
      </section>

      <section>
        <h2>Projection basis: real and nominal values</h2>
        <p className="section-copy">
          The model can show values in either real terms or nominal terms.
        </p>
        <p className="section-copy">
          Real terms show future values adjusted for inflation, so amounts are
          expressed in today&apos;s spending power. Nominal terms show the cash
          amount expected in the future before adjusting back to today&apos;s
          prices.
        </p>
        <p className="section-copy">
          Where the model converts a nominal investment return into a real
          return, it uses the compound formula:
        </p>
        <FormulaBlock>
          {"real return = (1 + nominal return) / (1 + inflation) - 1"}
        </FormulaBlock>
        <p className="section-copy">
          For example, if expected nominal investment growth is 5% and inflation
          is 2.5%, the real return is approximately 2.44%, not simply 2.5%.
        </p>
        <p className="section-copy">
          The retirement-income target is also treated according to the selected
          basis. In real terms, the target stays flat in today&apos;s money. In
          nominal terms, the target increases over time with the inflation
          assumption.
        </p>
        <p className="section-copy">
          In real-terms projections, the model removes the main inflation
          assumption from investment returns and CPI-linked pension increases.
          For example, Alpha and nuvos CPI increases become flat in real terms.
          In nominal projections, CPI-linked increases and the inflated target
          are shown as future cash amounts.
        </p>
      </section>

      <section>
        <h2>Important assumptions and omissions</h2>
        <p className="section-copy">
          The modeller intentionally simplifies some areas so that results
          remain understandable and configurable. These simplifications mean the
          figures should be treated as planning estimates, not exact forecasts.
        </p>
        <ul className="section-copy">
          <li>
            Income Tax is estimated from configurable standard assumptions. It
            does not cover Scottish tax bands, benefit interactions, tax code
            changes, or other personal reliefs.
          </li>
          <li>
            Inflation is only modelled where explicit CPI or growth assumptions
            are enabled.
          </li>
          <li>
            State Pension modelling does not cover benefit interactions,
            overseas rules, lump-sum arrears choices, or pre-2016 deferral
            rules.
          </li>
          <li>Added pension purchase revaluation is simplified.</li>
          <li>
            SIPP tax relief is modelled as a simple gross-up of selected
            contributions. It does not check annual allowance, tapered annual
            allowance, carry forward, adjusted income, or provider-specific
            relief-at-source and net-pay timing.
          </li>
          <li>
            Investment growth is deterministic. The model does not simulate
            market volatility, charges, sequencing risk, or changing asset
            allocation.
          </li>
          <li>Scheme-specific edge cases are not exhaustively represented.</li>
        </ul>
      </section>

      <section>
        <h2>Date and age rules</h2>
        <p className="section-copy">
          The model derives key dates from the user&apos;s date of birth and
          selected pension settings. These include:
        </p>
        <ul className="section-copy">
          {KEY_DATES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          Legal and scheme ages are versioned assumptions. They may change in
          future legislation or scheme rules, so the model should be treated as
          a planning estimate based on the rules currently encoded in the
          application.
        </p>
      </section>

      <section>
        <h2>Alpha pension methodology</h2>
        <p className="section-copy">
          Alpha pension is modelled as a defined-benefit pension.
        </p>
        <p className="section-copy">Annual Alpha accrual is calculated as:</p>
        <FormulaBlock>
          {"annual accrual = pensionable earnings × 2.32%"}
        </FormulaBlock>
        <p className="section-copy">The projection applies this monthly:</p>
        <FormulaBlock>
          {"monthly accrual = pensionable earnings × 2.32% / 12"}
        </FormulaBlock>
        <p className="section-copy">
          For example, pensionable earnings of £42,000 produce monthly Alpha
          accrual of:
        </p>
        <FormulaBlock>{"£42,000 × 2.32% / 12 = £81.20"}</FormulaBlock>
        <p className="section-copy">
          The model can start from an existing Alpha pension amount taken from
          an Annual Benefit Statement. It then projects future accrual from the
          selected start date.
        </p>
        <p className="section-copy">
          In the expert journey, an optional expected pay-rise percentage can
          increase future Alpha pensionable earnings for each full year after
          the calculation start date. Leaving it at 0% keeps pensionable
          earnings flat. This affects future Alpha accrual, but does not model
          payroll contribution deductions.
        </p>

        <h3>Alpha revaluation</h3>
        <p className="section-copy">
          Where pension increases are enabled, accrued Alpha pension is revalued
          annually by:
        </p>
        <FormulaBlock>{"CPI"}</FormulaBlock>
        <p className="section-copy">
          Leaving the scheme stops future 2.32% accrual. The model applies CPI
          revaluation to accrued Alpha pension.
        </p>

        <h3>Alpha EPA</h3>
        <p className="section-copy">
          When EPA is enabled, Alpha accrual during the selected EPA date range
          is tracked as a separate EPA portion rather than standard Alpha
          accrual. The same 2.32% annual accrual rate is used, but the EPA
          portion has its own unreduced date.
        </p>
        <p className="section-copy">
          The EPA unreduced date is calculated as Normal Pension Age minus the
          selected number of EPA years. If Alpha is drawn before that EPA date,
          the EPA portion is reduced using the Alpha early-retirement factor for
          the EPA age. If Alpha is drawn on or after the EPA date, the EPA
          portion is not reduced for early payment. The standard Alpha portion
          continues to use the normal Alpha reduction test against Normal
          Pension Age.
        </p>

        <h3>Alpha draw age and early retirement</h3>
        <p className="section-copy">
          If Alpha is drawn before its normal pension age, the model applies
          Alpha early-retirement reduction factors from the Alpha factor table.
        </p>
        <p className="section-copy">
          The model uses the selected Alpha draw date to determine whether a
          reduction applies. Where the draw date falls between factor-table
          points, the model interpolates between available values.
        </p>
        <p className="section-copy">
          The model does not add a late-retirement enhancement when Alpha is
          drawn after Normal Pension Age; it treats the reduction factor as 1.
        </p>

        <h3>Alpha added pension</h3>
        <p className="section-copy">
          The model supports optional Alpha added pension. Added pension is
          treated separately from standard Alpha accrual.
        </p>
        <p className="section-copy">
          Added pension purchases can be modelled using:
        </p>
        <ul className="section-copy">
          {ADDED_PENSION_OPTIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          The model uses age-based added-pension factor tables to estimate the
          extra annual pension purchased.
        </p>
        <p className="section-copy">
          Known simplification: added-pension revaluation is currently
          simplified. The purchase revaluation factor used in the added-pension
          factor calculation is currently 1. When Alpha pension increases are
          enabled, purchased added pension is then tracked alongside the
          standard Alpha portion for annual revaluation in the projection.
          Without pension increases enabled, added pension remains at its
          purchased annual amount. This may understate or misstate the final
          value of added pension in some scenarios.
        </p>
      </section>

      <section>
        <h2>nuvos pension methodology</h2>
        <p className="section-copy">nuvos is modelled separately from Alpha.</p>
        <p className="section-copy">
          The model allows existing nuvos pension and future nuvos-related
          assumptions to be included in the projection. nuvos income is treated
          as defined-benefit pension income and can be included in gross
          retirement income and tax calculations.
        </p>
        <p className="section-copy">Annual nuvos accrual is calculated as:</p>
        <FormulaBlock>
          {"annual accrual = nuvos pensionable earnings × 2.3%"}
        </FormulaBlock>
        <p className="section-copy">
          The projection applies this monthly until the earlier of the selected
          nuvos leave age and nuvos draw age. If partial retirement applies, the
          selected work percentage reduces future nuvos accrual from the
          partial-retirement start date.
        </p>
        <p className="section-copy">
          When nuvos pension increases are enabled, each existing and future
          nuvos component is revalued annually by the modelled CPI assumption.
          In real-terms mode this CPI increase is removed, so CPI-linked nuvos
          revaluation is flat in today&apos;s spending power. In nominal mode it
          compounds using the main inflation assumption.
        </p>
        <p className="section-copy">
          If nuvos is drawn before age 65, the model applies the nuvos
          early-payment formula rather than the Alpha factor table. The formula
          reduces the pension by 5% a year for the first 3 years early, 4% a
          year for the next 3 years early, and 3% a year for any further early
          period.
        </p>
        <p className="section-copy">
          For example, if nuvos is drawn 4 years and 10 months before age 65,
          the model estimates the reduction as:
        </p>
        <FormulaBlock>
          {
            "3 years × 5% + 22 months × 4% / 12 = 22.33%\nfactor = 1 - 22.33% = 0.7767"
          }
        </FormulaBlock>
      </section>

      <section>
        <h2>State Pension methodology</h2>
        <p className="section-copy">
          The model derives State Pension age from the user&apos;s date of birth
          using encoded age rules.
        </p>
        <p className="section-copy">
          State Pension income starts from the selected State Pension draw date.
          If the draw date is later than the default State Pension age, the
          model applies deferral uplift.
        </p>
        <p className="section-copy">
          For post-6 April 2016 State Pension deferral, the model applies:
        </p>
        <FormulaBlock>
          {"1% extra State Pension for every 9 weeks deferred"}
        </FormulaBlock>
        <p className="section-copy">The minimum deferral period is 9 weeks.</p>
        <p className="section-copy">
          For example, a full-year deferral gives approximately:
        </p>
        <FormulaBlock>{"52 / 9 = 5.78% uplift"}</FormulaBlock>
        <p className="section-copy">
          So a £12,000 annual State Pension deferred by one year becomes
          approximately:
        </p>
        <FormulaBlock>{"£12,000 × 1.0578 = £12,693"}</FormulaBlock>
        <p className="section-copy">
          The model can also apply future State Pension growth assumptions,
          depending on the selected settings. When future growth is enabled, the
          base forecast is uprated using the highest of the main inflation
          assumption, the State Pension wage-growth assumption, and 2.5%. In
          real-terms mode this nominal increase is converted back into
          today&apos;s spending power.
        </p>
        <p className="section-copy">
          The deferred uplift component is calculated at the draw date. After
          draw, the base State Pension continues to use the selected future
          growth setting. The deferred extra grows only with the main inflation
          assumption in nominal mode, and stays flat in real-terms mode.
        </p>
        <p className="section-copy">
          Known simplification: the model does not represent every possible
          State Pension choice, arrears option or future legislative change.
          State Pension age and uprating policy are subject to government
          review.
        </p>
      </section>

      <section>
        <h2>SIPP methodology</h2>
        <p className="section-copy">
          The SIPP is modelled as a defined-contribution pension pot.
        </p>
        <p className="section-copy">The model projects:</p>
        <ul className="section-copy">
          {SIPP_PROJECTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          Investment growth is applied monthly using the annual return
          assumption converted into a monthly rate.
        </p>
        <p className="section-copy">
          Regular SIPP contributions and scheduled lump sums are included until
          the earlier of the SIPP draw date and target retirement age. If tax
          relief is selected, the model grosses up net additions by 1 / 0.8 for
          basic-rate relief or 1 / 0.6 for higher-rate relief. Partial
          retirement can reduce future regular contributions from the
          partial-retirement start date.
        </p>
        <p className="section-copy">
          The model supports different withdrawal approaches, including:
        </p>
        <ul className="section-copy">
          {SIPP_WITHDRAWAL_APPROACHES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          SIPP withdrawals can be split between tax-free and taxable portions
          according to the selected tax-free withdrawal setting. The taxable
          portion is included in the simplified Income Tax calculation.
        </p>
        <p className="section-copy">
          For the use-by-age strategy, the model calculates a level monthly
          withdrawal at the first draw month intended to use the pot by the
          selected target age, allowing for the modelled monthly growth rate.
          For the zero-at-death strategy, the current pot is spread over the
          remaining scheduled months to life expectancy. For the percentage
          strategy, the model withdraws the selected annual percentage divided
          by 12, limited by the pot available.
        </p>
        <p className="section-copy">
          Known simplification: the model does not attempt to reproduce all
          pension wrapper rules, provider-specific drawdown mechanics, lifetime
          allowance history, annual allowance behaviour, emergency tax coding,
          or recycling rules.
        </p>
      </section>

      <section>
        <h2>ISA methodology</h2>
        <p className="section-copy">
          The ISA is modelled as a tax-free investment pot.
        </p>
        <p className="section-copy">The model projects:</p>
        <ul className="section-copy">
          {ISA_PROJECTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          ISA withdrawals are not treated as taxable income.
        </p>
        <p className="section-copy">
          Regular ISA saving and scheduled lump sums are included until the
          earlier of the ISA draw date and target retirement age. ISA
          contributions are not grossed up for tax relief. Partial retirement
          can reduce future regular ISA saving from the partial-retirement start
          date.
        </p>
        <p className="section-copy">
          ISA withdrawal strategies mirror the SIPP strategies: percentage
          withdrawal, depletion over life expectancy, or a level use-by-age
          withdrawal that allows for the modelled monthly growth rate.
        </p>
        <p className="section-copy">
          The ISA can be used as a bridge before pension income starts. For
          example, a user may choose to draw from ISA savings between early
          retirement and Alpha or State Pension commencement.
        </p>
        <p className="section-copy">
          Known simplification: the model does not enforce all ISA subscription
          rules, product restrictions or provider-specific mechanics. It treats
          the ISA as a general tax-free investment balance.
        </p>
      </section>

      <section>
        <h2>Bridge funding methodology</h2>
        <p className="section-copy">
          Bridge funding is the use of temporary savings or pension withdrawals
          to cover income gaps before later income streams begin.
        </p>
        <p className="section-copy">
          The model can show where income is below the selected
          retirement-income target and whether ISA or SIPP drawdown can cover
          that gap.
        </p>
        <p className="section-copy">
          Bridge analysis first prepares a retirement scenario where Alpha and
          nuvos accrual stop at the target retirement age and ISA drawdown can
          begin at retirement. It then compares net secure income from Alpha,
          nuvos and State Pension with the selected target for each month from
          retirement to life expectancy.
        </p>
        <p className="section-copy">
          Before SIPP access, any shortfall is tracked as an ISA-only bridge
          requirement. From SIPP access onwards, the bridge calculation draws
          from SIPP first and then ISA, limited by the balances available. Any
          remaining gap is recorded as an unfunded shortfall. The comparison
          view also estimates the extra monthly saving that would be needed to
          cover any remaining shortfall over the months before retirement.
        </p>
        <p className="section-copy">A typical bridge scenario might be:</p>
        <FormulaBlock>
          {
            "Retire early → use ISA → use SIPP → Alpha starts → State Pension starts"
          }
        </FormulaBlock>
        <p className="section-copy">The bridge analysis is sensitive to:</p>
        <ul className="section-copy">
          {BRIDGE_SENSITIVITIES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          The bridge chart should be interpreted as a planning view, not a
          guarantee. A shortfall shown in the bridge chart may mean that savings
          are exhausted, pension income starts too late, or the income target is
          too high for the selected assumptions.
        </p>
        <p className="section-copy">
          Where requested by the comparison view, the model tests whole-year
          Alpha and nuvos draw ages from the later of age 55 and the selected
          retirement age up to the relevant normal pension age. The first age
          that passes the bridge-plan and stable guaranteed-income checks is
          shown as the earliest sustainable pension draw age, if one is found.
        </p>
      </section>

      <section>
        <h2>Partial retirement methodology</h2>
        <p className="section-copy">
          Partial retirement allows the model to reduce future accrual and
          savings contributions from a selected date.
        </p>
        <p className="section-copy">
          When partial retirement is enabled, the model can reduce:
        </p>
        <ul className="section-copy">
          {PARTIAL_RETIREMENT_EFFECTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          The reduction is based on the selected work percentage.
        </p>
        <p className="section-copy">
          For example, if the work percentage is set to 60%, the model can
          project future pensionable earnings, accrual and contributions at 60%
          of their previous level from the partial-retirement start date.
        </p>
        <p className="section-copy">
          Partial retirement can materially affect both future pension accrual
          and bridge-funding capacity.
        </p>
        <p className="section-copy">
          Partial retirement does not directly reduce existing accrued pension,
          State Pension, or the current ISA and SIPP balances already entered.
          It changes future accrual and regular saving assumptions from the
          selected start age.
        </p>
      </section>

      <section>
        <h2>Tax methodology</h2>
        <p className="section-copy">
          The model includes a simplified UK Income Tax estimate.
        </p>
        <p className="section-copy">Taxable income may include:</p>
        <ul className="section-copy">
          {TAXABLE_INCOME_SOURCES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          ISA withdrawals are excluded from taxable income.
        </p>
        <p className="section-copy">
          The model estimates tax annually and then divides the annual estimate
          into monthly amounts. It applies simplified assumptions for:
        </p>
        <ul className="section-copy">
          {TAX_ASSUMPTIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          Known simplification: this is not PAYE payroll logic and is not tax
          advice. The model does not fully cover Scottish income-tax bands,
          National Insurance, benefit interactions, marriage allowance, salary
          sacrifice, tax-code timing, emergency tax, capital gains tax,
          inheritance tax or all pension tax edge cases.
        </p>
      </section>

      <section>
        <h2>Scenario comparison methodology</h2>
        <p className="section-copy">
          Saved comparison scenarios store a snapshot of the current settings in
          local browser storage when local saving is enabled. Each scenario is
          recalculated from its saved settings rather than reusing the current
          on-screen result.
        </p>
        <p className="section-copy">
          The comparison view derives metrics including:
        </p>
        <ul className="section-copy">
          {COMPARISON_OUTPUTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          These metrics are intended to make scenarios easier to compare. They
          are not a ranking, recommendation, or statement that one option is the
          best choice.
        </p>
      </section>
    </StaticPageLayout>
  );
}

const methodologyRoot = document.getElementById("root");

if (methodologyRoot) {
  createRoot(methodologyRoot).render(
    <StrictMode>
      <MethodologyPage />
    </StrictMode>
  );
}
