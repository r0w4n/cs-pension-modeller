import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { knowledgeLinks } from "../knowledgeLinks";
import {
  LISA_ALLOWANCE_GUIDANCE,
  LISA_LIMITATIONS_GUIDANCE,
} from "../app-domains/lisa";
import { PENSION_WITHDRAWAL_TAX_RULES } from "../data/income-tax-rules";
import { StaticPageLayout } from "./static-page-layout";
import "../index.css";

const PROJECTED_SOURCES = [
  "Civil Service Alpha pension",
  "Alpha EPA pension where enabled",
  "Civil Service classic pension",
  "Civil Service classic plus pension",
  "Civil Service nuvos pension",
  "Civil Service Premium pension",
  "State Pension",
  "Additional guaranteed income entered by the user",
  "SIPP pension savings",
  "Civil Service Additional Voluntary Contribution (CS AVC) pension savings",
  "ISA savings",
  "Lifetime ISA (LISA) savings",
  "Simplified UK Income Tax",
  "Partial retirement effects",
  "Comparison between saved scenarios",
] as const;

const KEY_DATES = [
  "current date (the internal calculation start date)",
  "Alpha and nuvos statement dates",
  "Premium valuation date",
  "State Pension age",
  "Alpha pension draw age",
  "Alpha accrual stop age",
  "Alpha EPA unreduced date where EPA is enabled",
  "classic pension draw age",
  "classic plus pension draw age",
  "nuvos pension draw age",
  "nuvos final pensionable-service date",
  "Premium pension draw age",
  "SIPP access age",
  "CS AVC access age",
  "ISA draw start age",
  "LISA draw start age",
  "SIPP draw start age",
  "CS AVC draw start age",
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
  "withdraw only what is needed to help meet the active income target",
] as const;

const CS_AVC_PROJECTS = [
  "starting CS AVC balance",
  "regular CS AVC contributions",
  "lump-sum CS AVC contributions",
  "investment growth",
  "selected CS AVC draw age",
  "selected withdrawal strategy",
  "tax-free and taxable withdrawal proportions",
] as const;

const ISA_PROJECTS = [
  "starting ISA balance",
  "regular ISA contributions",
  "lump-sum ISA contributions",
  "investment growth",
  "selected ISA draw age",
  "selected withdrawal strategy",
] as const;

const LISA_PROJECTS = [
  "starting LISA balance",
  "regular LISA contributions",
  "lump-sum LISA contributions",
  "25% government bonus on eligible additions",
  "annual eligible-addition cap",
  "investment growth",
  "selected LISA draw age from age 60",
  "selected withdrawal strategy",
] as const;

const FLEXIBLE_WITHDRAWAL_SENSITIVITIES = [
  "retirement age",
  "Alpha draw age",
  "Premium draw age",
  "State Pension age",
  "SIPP access age",
  "CS AVC access age",
  "ISA, LISA, SIPP and CS AVC balances",
  "withdrawal order",
  "investment returns",
  "inflation",
  "income tax settings",
  "target retirement income",
] as const;

const PARTIAL_RETIREMENT_EFFECTS = [
  "future Alpha accrual",
  "SIPP contributions",
  "CS AVC contributions",
  "ISA contributions",
  "LISA contributions",
] as const;

const TAXABLE_INCOME_SOURCES = [
  "Alpha pension",
  "classic pension",
  "classic plus pension",
  "nuvos pension",
  "Premium pension",
  "State Pension",
  "taxable additional guaranteed income",
  "modelled reduced-hours salary during partial retirement",
  "taxable SIPP withdrawals",
  "taxable CS AVC withdrawals",
] as const;

const TAX_ASSUMPTIONS = [
  "selected 2026/27 rest-of-UK or Scottish regime",
  "Personal Allowance",
  "Personal Allowance taper",
  "configurable rest-of-UK basic, higher and additional bands",
  "published Scottish starter, basic, intermediate, higher, advanced and top bands",
  "entered full salary as unshown tax context before retirement",
  "taxable share of SIPP withdrawals",
  "taxable share of CS AVC withdrawals",
  "one liability for the modelled income in each April-to-March year",
  "final taxable monthly income continuing to 5 April as tax-only context",
] as const;

const COMPARISON_OUTPUTS = [
  "target income and projected gap",
  "lowest projected income",
  "years and lifetime amount below target",
  "secure pension income at key ages",
  "income shortfalls before and after pension-pot and LISA access",
  "ISA, LISA, SIPP and CS AVC depletion ages",
] as const;

function FormulaBlock({ children }: { children: string }) {
  return <pre className="section-copy formula-block">{children}</pre>;
}

export function MethodologyPage() {
  return (
    <StaticPageLayout
      eyebrow="Civil Service Pensions"
      title="Methodology"
      lead="This page explains how the Civil Service Pension Modeller projects retirement income, pension accrual, savings balances, flexible withdrawals, tax and income shortfalls."
      description="Read how the modeller projects pension income, flexible withdrawals, tax, inflation, and other assumptions."
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
          The projection is run month by month from the current date to the
          selected planning horizon. The current date is set automatically and
          is not an editable assumption. Each month, the model calculates
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
          income starts from the selected draw dates, additional guaranteed
          income starts from the ages entered by the user, flexible withdrawals
          are limited to the available pot balance, and Income Tax is calculated
          after gross income for the month has been assembled.
        </p>
      </section>

      <section>
        <h2>Retirement income target</h2>
        <p className="section-copy">
          The retirement income target represents money available to spend after
          the modeller&apos;s simplified Income Tax estimate. The target is
          therefore compared with projected take-home income, and target,
          shortfall and surplus calculations use that same after-tax basis.
        </p>
        <p className="section-copy">
          The simplified journey asks for a monthly spending amount and shows
          its yearly equivalent. The bridge and expert journeys ask for the
          annual amount. Income Tax estimation is enabled because it is needed
          to make these comparisons.
        </p>
        <p className="section-copy">
          Retirement Living Standards examples describe expenditure rather than
          gross pension income. They are starting points only: household size,
          housing costs and personal circumstances can materially change the
          amount needed.
        </p>
        <p className="section-copy">
          In the Expert journey, optional two-person modelling uses household
          after-estimated-Income-Tax targets rather than assigning a target to
          either person. When retirement months differ, the household can use a
          flat target from the first retirement until both people are retired,
          followed by its fully-retired target.
        </p>
        <p className="section-copy">
          The one-person target quick-selects use Pensions UK&apos;s Retirement
          Living Standards published on 3 June 2026: £13,900 (Minimum), £32,700
          (Moderate) and £45,400 (Comfortable). They are annual expenditure
          references, not income guarantees, and exclude housing costs.
        </p>
        <p className="section-copy">
          The two-person target quick-selects use Pensions UK&apos;s Retirement
          Living Standards published on 3 June 2026: £22,500 (Minimum), £45,400
          (Moderate) and £62,700 (Comfortable). They are annual household
          expenditure references, not income guarantees, and exclude housing
          costs.
        </p>
        <p className="section-copy">
          Joint Expert results use one editable Household Retirement Plan chart
          on a calendar timeline. Its x-axis shows calendar dates with aligned
          You and Partner age scales. It keeps each income source attributed to
          You or Partner and uses the canonical household target, estimated
          Income Tax, take-home income and shortfall. The underlying person
          projections remain separate for their own accounts, withdrawal
          strategies and tax treatment. The chart keeps the established target
          and milestone interactions inline; contribution settings remain in
          their existing journey fields instead of being repeated below the
          chart.
        </p>
        <p className="section-copy">
          To keep the household projection readable, owner-specific editable
          milestones use short P1 (You) and P2 (Partner) labels in the familiar
          chart-marker style. Calendar-period inspection and the chart&apos;s
          accessible description retain the complete event names. This
          presentation does not alter the underlying household calculation.
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
          The retirement-income target represents the amount available to spend
          after estimated Income Tax. In real terms, the target stays flat in
          today&apos;s money. In nominal terms, the target increases over time
          with the inflation assumption.
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
            supports the 2026/27 rest-of-UK and Scottish regimes, but does not
            cover future tax-year changes, benefit interactions, tax-code
            changes, savings or dividend income, or other personal reliefs.
          </li>
          <li>
            Inflation is only modelled where explicit CPI or growth assumptions
            are enabled.
          </li>
          <li>
            The modeller does not calculate Alpha ill-health retirement, death
            benefits, survivor benefits, transfers, pension sharing, scheme pays
            adjustments, or remedy-specific benefit choices.
          </li>
          <li>
            Alpha partial retirement in the planning journey changes future
            earnings, accrual and saving assumptions. It does not currently add
            a separately selected partial-retirement pension payment to the
            income timeline.
          </li>
          <li>
            Additional guaranteed income is a simple gross annual amount entered
            by the user. It does not model provider-specific rules, early
            retirement factors, commutation, survivor benefits, GMP, or scheme
            revaluation rules.
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
          Numeric modelling ages are represented in quarter-year steps: whole
          years, then 3, 6 or 9 months. An age entered, derived or loaded from
          an older saved file is rounded to the nearest quarter year, and the
          rounded value is used throughout the model. Calendar-date inputs keep
          their exact entered dates, while the projection itself continues to
          run monthly. This is a planning convention and does not change an
          official pension or legal eligibility date.
        </p>
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
          current date.
        </p>
        <p className="section-copy">
          In the expert journey, an optional expected pay-rise percentage can
          increase future Alpha pensionable earnings for each full year after
          the current date. Leaving it at 0% keeps pensionable earnings flat.
          This affects future Alpha accrual, but does not model payroll
          contribution deductions.
        </p>

        <h3>Alpha revaluation</h3>
        <p className="section-copy">
          Accrued Alpha pension is revalued annually by:
        </p>
        <FormulaBlock>{"CPI"}</FormulaBlock>
        <p className="section-copy">
          Leaving the scheme stops future 2.32% accrual. The model applies CPI
          revaluation to accrued Alpha pension. The scheme&apos;s annual price
          adjustment can be positive or negative, and pension in payment
          continues to receive the applicable annual pension increase.
          Projection inputs remain assumptions rather than forecasts.
        </p>
        <p className="section-copy">
          Members leaving with at least two years of qualifying service will
          normally retain preserved Alpha benefits. Shorter service can instead
          lead to refund or transfer options. See the{" "}
          <a
            href={knowledgeLinks.alphaLeavingService}
            target="_blank"
            rel="noreferrer"
          >
            official leaving-service guidance
          </a>
          .
        </p>

        <h3>Alpha EPA</h3>
        <p className="section-copy">
          EPA is configured separately from added pension because it changes the
          unreduced date for a distinct portion of Alpha accrual, rather than
          buying extra annual pension through added-pension factors.
        </p>
        <p className="section-copy">
          When EPA is enabled, Alpha accrual during each selected EPA purchase
          period is tracked separately from standard Alpha accrual. The same
          2.32% annual accrual rate is used. The model supports partial periods,
          gaps, restarts and changes between EPA −1, −2 and −3. Only one EPA
          option can overlap a date; accrual in a gap returns to standard Alpha.
        </p>
        <p className="section-copy">
          Each EPA portion&apos;s unreduced date is calculated as Normal Pension
          Age minus its selected number of EPA years. When Alpha is claimed, the
          main Alpha pension and all EPA portions come into payment together.
          Each EPA portion is reduced independently if the claim date is before
          that portion&apos;s EPA date. The standard Alpha portion continues to
          use Normal Pension Age.
        </p>
        <p className="section-copy">
          An EPA cannot provide an unreduced age below 65. EPA accrual is
          revalued like the main Alpha pension, and a change to State Pension
          age can change both Normal Pension Age and the corresponding EPA age.
          EPA normally starts or changes on 1 April and cancellation normally
          takes effect after 31 March. Joining Alpha, leaving it, or restarting
          after a break can produce a partial scheme year, so entered dates
          should be checked against the member&apos;s official pension record.
          The projection runs monthly, so a period that begins or ends part-way
          through a month is represented at monthly rather than daily
          resolution. See the{" "}
          <a href={knowledgeLinks.alphaEpa} target="_blank" rel="noreferrer">
            official EPA guidance
          </a>
          .
        </p>

        <h3>Alpha draw age and early retirement</h3>
        <p className="section-copy">
          If Alpha is drawn before its normal pension age, the model applies the
          Government Actuary&apos;s Department (GAD) Alpha early-payment
          reduction factor for the relevant Normal Pension Age or EPA.
        </p>
        <p className="section-copy">
          The factor data comes from consolidated Civil Service factors workbook
          CS_GB_Consolidated_Factors_2026-01.xlsx, issued on 29 May 2026. The
          model uses table 0-402 for NPA/EPA 65, table 0-403 for 66, table 0-404
          for 67, and table 0-405 for 68. These are the workbook sheets x-402 to
          x-405 and are explicitly identified as Alpha tables. The source is
          available from the{" "}
          <a
            href={knowledgeLinks.alphaEarlyRetirementFactors}
            target="_blank"
            rel="noreferrer"
          >
            GAD Alpha early-payment factor tables
          </a>
          .
        </p>
        <p className="section-copy">
          Retirement age is matched to the published factor for age in complete
          years and months, ignoring part months. The model uses that monthly
          entry directly rather than interpolating between annual retirement-age
          values. If NPA or EPA is itself a non-integer age, the model follows
          the GAD guidance by interpolating between the two relevant NPA/EPA
          tables. The on-screen Alpha draw-age control selects quarter years;
          each selected value therefore maps to a completed-month entry.
        </p>
        <p className="section-copy">
          The workbook identifies these factors as the 2023 factor review set
          and records them as issued to the client on 29 June 2023. GAD may
          revise the workbook or factors, so important decisions should be
          checked against an official pension quotation or statement.
        </p>
        <h3>Alpha late retirement</h3>
        <p className="section-copy">
          The Alpha calculation domain distinguishes members remaining in active
          service from members retiring from deferred status. Active opening
          balances use GAD age-addition tables 0-415 and 0-416. Deferred opening
          balances use late-payment-supplement tables 0-419 and 0-420. Self-only
          Added Pension uses its separate table.
        </p>
        <p className="section-copy">
          The factor is selected for age in completed years and months. A
          cumulative multiplier for an opening balance is calculated by dividing
          the factor at payment age by the factor at Normal Pension Age.
          Active-member age-addition percentages are rounded to four decimal
          places as directed by GAD. GAD&apos;s full active-member calculation
          applies additions to scheme-year opening balances and may include an
          assumed age addition on leaving or retirement. See the{" "}
          <a
            href={knowledgeLinks.alphaLateRetirementMethodology}
            target="_blank"
            rel="noreferrer"
          >
            GAD Alpha age-addition methodology
          </a>
          .
        </p>
        <p className="section-copy">
          The main projection timeline does not yet reconstruct every
          scheme-year age addition across pension earned after Normal Pension
          Age. Late-retirement examples therefore cover a stated opening balance
          and should not be treated as an official late-retirement quotation.
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
          The model uses the Government Actuary&apos;s Department consolidated
          Civil Service factors workbook
          CS_GB_Consolidated_Factors_2026-01.xlsx, issued on 29 May 2026. Lump
          sums use tables 0-714 to 0-717 and regular contributions use tables
          0-718 to 0-721, covering Normal Pension Ages 65 to 68. The source is
          available from the{" "}
          <a
            href={knowledgeLinks.alphaAddedPensionFactors}
            target="_blank"
            rel="noreferrer"
          >
            GAD Alpha added-pension factor tables
          </a>
          .
        </p>
        <p className="section-copy">
          For a lump sum, the model uses the member&apos;s age on the payment
          date. For regular contributions, it uses the age at the start of the
          scheme year or payment period. If Normal Pension Age is not a whole
          year, the factor is interpolated between the adjacent published
          tables. Regular purchases stop at the earlier of the end of Alpha
          pensionable service or the last age supported by those tables; this
          does not stop ordinary Alpha accrual. The purchase calculation also
          applies GAD table 0-728 using the number of 1 Aprils after the
          calculation date up to Normal Pension Age. The purchased amount is
          then tracked alongside standard Alpha for the projection&apos;s annual
          CPI revaluation.
        </p>

        <h3>Alpha retirement lump sum</h3>
        <p className="section-copy">
          Alpha does not provide an automatic retirement lump sum. Subject to
          the scheme and tax limits, a member can exchange annual pension for a
          lump sum at £12 of lump sum for each £1 of annual pension exchanged.
          The calculation domain captures that exchange rule, but the main
          projection journey does not currently include a commutation amount
          control. See the{" "}
          <a
            href={knowledgeLinks.alphaCommutation}
            target="_blank"
            rel="noreferrer"
          >
            official lump-sum guidance
          </a>
          .
        </p>
      </section>

      <section>
        <h2>classic and classic plus pension methodology</h2>
        <p className="section-copy">
          classic and classic plus are modelled separately from Alpha and nuvos.
          They are treated as legacy Civil Service defined-benefit pensions and
          can be included in gross retirement income and tax calculations.
        </p>
        <p className="section-copy">
          For classic, the model can either use known annual pension and
          automatic lump sum figures entered by the user, or estimate benefits
          from final pensionable earnings and reckonable service. The estimate
          uses:
        </p>
        <FormulaBlock>
          {
            "classic annual pension = final pensionable earnings × reckonable service ÷ 80\nautomatic lump sum = classic annual pension × 3"
          }
        </FormulaBlock>
        <p className="section-copy">
          For classic plus, the estimate separates pre-2002 and post-2002
          service. Pre-2002 service is modelled like classic with an automatic
          lump sum. Post-2002 service is modelled at 1/60 with no automatic lump
          sum in the model.
        </p>
        <FormulaBlock>
          {
            "pre-2002 pension = final pensionable earnings × pre-2002 service ÷ 80\npost-2002 pension = final pensionable earnings × post-2002 service ÷ 60\nautomatic lump sum = pre-2002 pension × 3"
          }
        </FormulaBlock>
        <p className="section-copy">
          If the final salary link is maintained, the model projects current
          final pensionable earnings using the salary increase assumption. If
          the link is broken, it uses the preserved final pensionable earnings
          entered by the user. The entered reckonable service is treated as
          fixed and does not increase during future Alpha service.
        </p>
        <p className="section-copy">
          When pension increases are enabled, deferred classic and classic plus
          pension and automatic lump sum values are revalued annually by the
          modelled CPI assumption. In real-terms mode this CPI increase is
          removed; in nominal mode it compounds using the main inflation
          assumption.
        </p>
        <p className="section-copy">
          The model uses age 60 as the Normal Pension Age for classic and
          classic plus. If benefits are drawn before age 60, the model applies a
          5% reduction for each year early, pro-rated by month. It does not add
          a late-retirement enhancement when benefits are drawn after age 60.
        </p>
      </section>

      <section>
        <h2>nuvos pension methodology</h2>
        <p className="section-copy">nuvos is modelled separately from Alpha.</p>
        <p className="section-copy">
          The model allows existing nuvos pension to be included in the
          projection. nuvos income is treated as defined-benefit pension income
          and can be included in gross retirement income and tax calculations.
        </p>
        <p className="section-copy">
          The model does not add earnings-based nuvos accrual after 31 March
          2015. From then, the statement value is only revalued by pension
          increases where those increases are enabled.
        </p>
        <p className="section-copy">
          When nuvos pension increases are enabled, the existing nuvos pension
          is revalued annually by the modelled CPI assumption. In real-terms
          mode this CPI increase is removed, so CPI-linked nuvos revaluation is
          flat in today&apos;s spending power. In nominal mode it compounds
          using the main inflation assumption.
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
        <h2>Premium pension methodology</h2>
        <p className="section-copy">
          Premium is modelled as a preserved legacy Civil Service defined
          benefit pension. The model assumes no further Premium accrual and no
          further Premium contributions.
        </p>
        <p className="section-copy">
          The entered Premium amount is increased by CPI from the valuation or
          statement date and continues to receive CPI-linked increases after
          payment begins. In real-terms mode these CPI increases are removed, so
          the Premium amount is flat in today&apos;s spending power. In nominal
          mode it compounds using the main inflation assumption. The model uses
          simplified whole-year compounding from the valuation date; it does not
          reproduce the scheme&apos;s April increase date or the proportionate
          first increase for a pension that has been in payment for less than a
          year.
        </p>
        <p className="section-copy">
          If Premium is taken before its Normal Pension Age, a Premium
          early-retirement reduction factor is required. For a supported draw
          age from 55, the model multiplies the CPI-revalued pension by the
          published Premium factor for Normal Pension Age 60 or 65. It selects
          the entry for age in completed years and completed months, ignoring
          part months, rather than interpolating between annual retirement-age
          values. It does not use Alpha reduction factors or the nuvos
          fixed-percentage reduction formula for Premium. The on-screen Premium
          draw-age control selects quarter years, and the factor calculation
          uses the corresponding completed-month entry.
        </p>
        <FormulaBlock>
          {
            "reduced Premium pension = CPI-revalued Premium pension × Premium early-retirement factor"
          }
        </FormulaBlock>
        <p className="section-copy">
          The factors come from the Government Actuary&apos;s Department (GAD)
          consolidated Civil Service factors workbook, version 2026-01, issued
          on 29 May 2026 and retrieved on 19 July 2026. NPA 60 uses workbook
          sheet x-406, table 1-406 (guidance table P1ER60PEN1); NPA 65 uses
          sheet x-410, table 1-410 (guidance table P1ER65PEN1). The workbook
          identifies these factors as the 2023 factor review set and records
          them as issued to the client on 29 June 2023. The source workbook is
          available from the{" "}
          <a
            href={knowledgeLinks.premiumEarlyRetirementFactors}
            target="_blank"
            rel="noreferrer"
          >
            GAD Civil Service early-retirement factor tables
          </a>
          . A versioned copy of the values used by the model is stored with the
          application source.
        </p>
        <p className="section-copy">
          For example, the published NPA 60 factor at age 55 is 0.806, so a
          CPI-revalued Premium pension of £12,000 is modelled as £9,672 a year
          from age 55. The reduction remains in the pension after Normal Pension
          Age; the model does not restore the unreduced amount at age 60.
        </p>
        <p className="section-copy">
          The model does not estimate under-55 cases or personal Normal Pension
          Ages other than 60 or 65. Some under-55 cases require the separate GAD
          Circumstance 2 formula, a pension-increase multiplier and table 1-421;
          personal pension ages are handled case by case in the GAD guidance.
          The model does not substitute tables 1-408 or 1-412 as direct pension
          multipliers or interpolate a personal NPA. If a factor is unavailable,
          the model excludes the reduced Premium income and flags the omission
          rather than silently estimating it.
        </p>
        <p className="section-copy">
          Civil Service Pensions currently says that factors used in some
          pension calculations are under review following the change to the
          SCAPE discount rate effective from 19 May 2026. This model continues
          to use the published 2026-01 workbook until replacement Premium
          factors are issued. Check material decisions against an official
          quotation and the latest{" "}
          <a
            href={knowledgeLinks.premiumFactorReviewNotice}
            target="_blank"
            rel="noreferrer"
          >
            Civil Service Pensions calculator notice
          </a>
          .
        </p>
        <p className="section-copy">
          The model does not currently estimate final salary, reckonable
          service, commutation, survivor benefits, abatement, ill-health
          retirement, pension sharing, GMP adjustments, or scheme-specific edge
          cases.
        </p>
      </section>

      <section>
        <h2>State Pension methodology</h2>
        <p className="section-copy">
          The model derives State Pension age from the user&apos;s date of birth
          using encoded age rules.
        </p>
        <p className="section-copy">
          The default annual amount is the full new State Pension rate and is
          treated as an unconfirmed assumption. The model also assesses the
          projection without that income. An otherwise on-track result is marked
          as needing a check only when the target depends on the assumed amount.
          If the target remains met without it, the result stays on track and
          carries a caution until the user confirms that the amount comes from
          their personalised{" "}
          <a href={knowledgeLinks.statePensionForecast}>
            State Pension forecast
          </a>
          . The actual amount depends on the person&apos;s National Insurance
          record and may differ because of qualifying years or time contracted
          out.
        </p>
        <p className="section-copy">
          In a two-person plan, this check is applied to each person&apos;s
          unconfirmed State Pension separately. The household result removes all
          unconfirmed amounts together to test whether the shared target still
          appears to be met, while the caution identifies whether the assumption
          belongs to You, Partner, or both.
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
        <h2>CS AVC methodology</h2>
        <p className="section-copy">
          Civil Service AVC is modelled as a separate invested defined
          contribution pension pot. It does not increase Alpha, classic, premium
          or nuvos defined benefit pension in the model.
        </p>
        <p className="section-copy">The model projects:</p>
        <ul className="section-copy">
          {CS_AVC_PROJECTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          Regular CS AVC contributions and scheduled lump sums are included
          until the earlier of the CS AVC draw date and target retirement age.
          The entered contribution is treated as the amount added to the CS AVC
          pot. The model does not add employer contributions and does not apply
          the SIPP tax-relief gross-up setting to CS AVC contributions.
        </p>
        <p className="section-copy">
          CS AVC drawdown uses the same withdrawal strategies as SIPP:
          percentage, zero at death, or use by a selected age. Withdrawals can
          be split between tax-free and taxable portions using the separate CS
          AVC tax-free withdrawal setting.
        </p>
        <p className="section-copy">
          The model applies standard registered pension access-age assumptions:
          age 55 before 6 April 2028 and age 57 from that date, unless the user
          marks the CS AVC as having provider-confirmed protected access. Users
          should check access age, provider terms, charges and retirement
          options against their CS AVC provider statement.
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
        <h2>Lifetime ISA methodology</h2>
        <p className="section-copy">
          The Lifetime ISA (LISA) is modelled as a tax-free investment pot for
          retirement bridge spending from age 60.
        </p>
        <p className="section-copy">The model projects:</p>
        <ul className="section-copy">
          {LISA_PROJECTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          LISA withdrawals are not treated as taxable income.
        </p>
        <p className="section-copy">{LISA_ALLOWANCE_GUIDANCE}</p>
        <p className="section-copy">{LISA_LIMITATIONS_GUIDANCE}</p>
      </section>

      <section>
        <h2>Target-based flexible withdrawals and surplus</h2>
        <p className="section-copy">
          ISA, LISA, SIPP and Civil Service AVC accounts can use “Use to meet
          income target”. From the target retirement age, the model first
          calculates guaranteed income and any withdrawals required by Annual
          percentage, Use by age or Zero at death. It then considers eligible
          target-based accounts in the saved priority order and withdraws only
          enough to close the remaining after-tax spending gap.
        </p>
        <p className="section-copy">
          The coordinator consumes the active target produced by the target
          engine, whether that target is flat or adjusted by the Go-Go, Slow-Go,
          No-Go phases. It does not calculate those phases inside the account
          logic. Inaccessible or empty accounts are skipped for that month
          without changing their saved priority.
        </p>
        <p className="section-copy">
          ISA and LISA withdrawals meet the after-tax gap directly. For taxable
          SIPP and Civil Service AVC withdrawals, the model repeatedly
          recalculates Income Tax to estimate the gross amount needed. This
          includes the selected tax-free withdrawal share and the modelled
          allowance and tax bands.
        </p>
        <p className="section-copy">
          Existing withdrawal strategies remain explicit instructions and are
          not silently reduced. Where they produce income above the active
          target, the model separates unavoidable guaranteed-income surplus from
          avoidable flexible-fund surplus. Reducible withdrawals are attributed
          in reverse saved priority order, with tax recalculated after each
          reduction.
        </p>
        <p className="section-copy">
          Estimated unspent income is accumulated as unallocated cash with no
          assumed return. It is not placed back into a tax-advantaged account.
          The non-destructive target-based preview instead recalculates the
          projection with avoided withdrawals left in the original account,
          including later growth, tax, withdrawals, shortfalls and ending
          balances.
        </p>
        <p className="section-copy">
          In expert results, a target-based account with ongoing contributions
          is also marked as potential over-saving when the model leaves at least
          £1 in it at the selected planning horizon. This is a prompt to compare
          assumptions, not a conclusion that the remaining balance is unwanted
          or that contributions should be reduced.
        </p>
        <p className="section-copy">
          In two-person modelling, this check is applied separately to each
          person&apos;s target-based accounts using that person&apos;s remaining
          pot at their selected planning horizon.
        </p>
      </section>

      <section>
        <h2>Go-Go, Slow-Go, No-Go spending methodology</h2>
        <p className="section-copy">
          The expert journey can replace the flat retirement spending target
          with three percentage phases. Go-go starts at the target retirement
          age, Slow-go starts at its selected age, and No-go starts at its
          selected age. The selected after-tax retirement income target remains
          the only monetary target.
        </p>
        <p className="section-copy">
          The stored values are a percentage for each phase and the two
          later-phase start ages. The applicable percentage is multiplied by the
          selected after-tax target in today&apos;s money. In nominal mode, that
          phase-adjusted target is increased from the model start date using the
          existing inflation assumption. The strategy changes only the spending
          requirement; pension dates, tax, withdrawal order, growth and life
          expectancy continue to use the existing model.
        </p>
        <p className="section-copy">
          Retirement Living Standards values are selected through the existing
          after-tax retirement target control. Go-Go, Slow-Go, No-Go does not
          create separate standards or monetary targets for individual phases.
          These values are annual expenditure benchmarks rather than gross
          income figures and exclude rent and mortgage costs.
        </p>
        <p className="section-copy">
          In a two-person plan, the transition target remains flat. Go-Go starts
          when both people are retired, while Slow-Go and No-Go use the later
          retiree&apos;s configured ages and resolve them to calendar months.
        </p>
      </section>

      <section>
        <h2>Flexible withdrawals before later pensions</h2>
        <p className="section-copy">
          A user can configure temporary ISA, LISA, SIPP or CS AVC withdrawals
          before later pension income begins. These withdrawals are calculated
          as part of the same monthly retirement projection as every other
          income source; there is no separate bridge-funding calculation.
        </p>
        <p className="section-copy">
          The retirement income summary starts with an outcome banner showing
          whether the scenario appears to meet the selected income target. The
          outcome, plan status and comparison headline metrics are assessed from
          the same monthly projection used by the retirement income chart. They
          therefore respect the withdrawal strategy configured for each ISA,
          LISA, SIPP and CS AVC account. Temporary ISA, LISA, SIPP and CS AVC
          withdrawals that run in a bridge period are not treated as permanent
          pension income. The detailed summary groups projected income by age
          range, with each range starting when the active income sources change.
        </p>
        <p className="section-copy">
          The model can show where income is below the selected
          retirement-income target and whether ISA, LISA, SIPP or CS AVC
          drawdown covers that gap under the selected withdrawal strategies.
        </p>
        <p className="section-copy">
          The simplified, early-retirement and expert journeys are different
          ways of presenting shared inputs and results. They all pass their
          saved assumptions through the same validation and projection engine;
          selecting a journey does not select a different pension calculation. A
          journey may show fewer inputs or results, or explain them differently,
          while its stored settings remain the assumptions used by the
          projection.
        </p>
        <p className="section-copy">
          Account balances include applicable investment growth, regular saving,
          scheduled lump sums and partial-retirement saving reductions. Each
          account then follows its configured access age and withdrawal
          strategy. The coordinated target-based strategy can use available
          flexible accounts to help meet the active target, while fixed,
          life-expectancy and use-by-age strategies follow their configured
          withdrawal amounts. Any remaining gap appears as a shortfall in the
          chart, assessment and comparison results.
        </p>
        <p className="section-copy">
          A scenario is labelled as meeting its target only when the main
          projection has no modelled shortfall from the selected retirement age
          to the planning horizon. The assessment also derives the first and
          largest shortfall, lifetime shortfall, secure income once all selected
          pensions are active, the secure-income position at the planning
          horizon and the first flexible fund exhausted from those same rows.
        </p>
        <p className="section-copy">
          A typical early-retirement scenario might be:
        </p>
        <FormulaBlock>
          {
            "Retire early -> use ISA -> use SIPP/CS AVC/LISA -> Alpha starts -> State Pension starts"
          }
        </FormulaBlock>
        <p className="section-copy">
          The projected withdrawals and shortfalls are sensitive to:
        </p>
        <ul className="section-copy">
          {FLEXIBLE_WITHDRAWAL_SENSITIVITIES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          The retirement income chart should be interpreted as a planning view,
          not a guarantee. A shortfall shown in the chart may mean that savings
          are exhausted, pension income starts too late, or the income target is
          too high for the selected assumptions.
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
          and the capacity to fund early-retirement withdrawals.
        </p>
        <p className="section-copy">
          Partial retirement does not directly reduce existing accrued pension,
          State Pension, or the current ISA and SIPP balances already entered.
          It changes future accrual and regular saving assumptions from the
          selected start age.
        </p>
        <p className="section-copy">
          In a two-person Expert plan, partial retirement is configured per
          person. When one person has fully retired, the other person&apos;s
          modelled employment income contributes to household income and their
          own Income Tax estimate. Full salary applies before that person&apos;s
          partial-retirement start and reduced salary applies afterwards. Salary
          already shown as household cash income is not added again as tax-rate
          context. National Insurance is not modelled.
        </p>
        <p className="section-copy">
          Under the Alpha scheme rules, partial retirement also requires
          employer agreement, the member to have reached minimum pension age,
          and a reduction in pensionable earnings of at least 20%. A member may
          take some or all of their accrued pension and continue building
          further pension. The current planning controls model reduced future
          work and saving only; they do not place a selected portion of accrued
          Alpha pension into payment. See the{" "}
          <a
            href={knowledgeLinks.alphaPartialRetirement}
            target="_blank"
            rel="noreferrer"
          >
            official partial-retirement guidance
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Tax methodology</h2>
        <p className="section-copy">
          The model includes a simplified 2026/27 UK Income Tax estimate for
          pension income and enables it for new plans by default. The selected
          regime is applied unchanged throughout the projection; the model does
          not forecast future tax policy or uprate tax bands.
        </p>
        <p className="section-copy">Taxable income may include:</p>
        <ul className="section-copy">
          {TAXABLE_INCOME_SOURCES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          ISA withdrawals and qualifying LISA withdrawals are excluded from
          taxable income. State Pension is included as taxable income even
          though tax is not normally deducted from the State Pension payment
          itself; see HMRC's{" "}
          <a
            href={knowledgeLinks.statePensionTax}
            target="_blank"
            rel="noreferrer"
          >
            State Pension tax guidance
          </a>
          .
        </p>
        <p className="section-copy">
          The model groups projection rows into April-to-March modeling years,
          calculates one liability from the taxable income represented in each
          year, and allocates that liability across the rows in proportion to
          their taxable income. This allocation is a planning presentation, not
          a prediction of PAYE deductions. Before partial or full retirement, it
          assumes the entered full salary continues as tax-only context. The
          salary affects the tax-year effective rate but is not added to the
          retirement-income chart or retirement cash flow. Once partial
          retirement starts, the modelled reduced-hours salary replaces that
          context and is shown as income. At the projection horizon, the model
          assumes the final taxable monthly income continues to the following 5
          April for tax-rate context only. This avoids an artificial tax drop
          caused solely by ending the projection, without extending income or
          balances beyond the selected life-expectancy age. It applies
          simplified assumptions for:
        </p>
        <ul className="section-copy">
          {TAX_ASSUMPTIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="section-copy">
          For England, Wales and Northern Ireland, the model applies the
          configurable basic, higher and additional-rate assumptions. For
          Scotland, it applies the published 2026/27 taxable-income band limits:
          starter rate 19% up to £3,967; basic rate 20% up to £16,956;
          intermediate rate 21% up to £31,092; higher rate 42% up to £62,430;
          advanced rate 45% up to £125,140; and top rate 48% above £125,140.
          These limits apply after the modelled Personal Allowance. The
          allowance is reduced by £1 for every £2 above the selected taper
          threshold. The model uses the summed taxable income represented in
          each modelled April-to-March year as a proxy for adjusted net income;
          it does not reduce that proxy for pension contributions, Gift Aid or
          other reliefs. If the projection starts part-way through a tax year,
          income before the model start is unknown and is not included, while
          the full Personal Allowance is still applied. This can understate tax
          for that first partial year.
        </p>
        <p className="section-copy">
          SIPP and CS AVC withdrawals can be marked as fully taxable,
          UFPLS-style with 25% tax-free cash, a custom tax-free share, or not
          confirmed. The not-confirmed option uses the conservative fully
          taxable assumption. The model does not infer whether cash is
          uncrystallised, crystallised or flexi-access drawdown; the selection
          remains a planning assumption to check with the provider.
        </p>
        <p className="section-copy">
          For new plans, the model starts with the selected shared pension
          lump-sum allowance less the amount entered as already used. It reduces
          that balance for modelled classic and classic plus automatic lump
          sums, then for tax-free SIPP and CS AVC cash in the selected funding
          order. Once the balance is exhausted, later SIPP and CS AVC
          withdrawals are taxable. The usual standard allowance is £
          {PENSION_WITHDRAWAL_TAX_RULES.standardLumpSumAllowance.toLocaleString(
            "en-GB"
          )}
          , although protected allowances and transitional rules may change the
          available amount. Migrated plans keep allowance tracking off so their
          existing results do not change silently. A known limitation is that a
          modelled classic or classic plus automatic lump sum above the
          remaining allowance reduces the ledger to zero, but the excess is not
          currently added as taxable lump-sum income. SIPP treatment is
          configured with SIPP withdrawal assumptions and CS AVC treatment with
          CS AVC assumptions; the shared allowance and general regime remain in
          Tax assumptions.
        </p>
        <p className="section-copy">
          Sources: the published{" "}
          <a
            href={knowledgeLinks.incomeTaxRates}
            target="_blank"
            rel="noreferrer"
          >
            HMRC Income Tax rates and Personal Allowances
          </a>
          ,{" "}
          <a
            href={knowledgeLinks.scottishIncomeTaxRates}
            target="_blank"
            rel="noreferrer"
          >
            HMRC Scottish Income Tax rates
          </a>{" "}
          and{" "}
          <a
            href="https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/"
            target="_blank"
            rel="noreferrer"
          >
            Scottish Government rates and bands
          </a>
          , and HMRC guidance on{" "}
          <a
            href={knowledgeLinks.pensionTaxableIncome}
            target="_blank"
            rel="noreferrer"
          >
            taxable pension income
          </a>{" "}
          and the{" "}
          <a
            href={knowledgeLinks.pensionLumpSumAllowance}
            target="_blank"
            rel="noreferrer"
          >
            pension lump-sum allowance
          </a>
          . The modelled rates are effective from 6 April 2026 to 5 April 2027.
        </p>
        <p className="section-copy">
          Known simplification: this is not PAYE payroll logic and is not tax
          advice. The model does not cover National Insurance, benefit
          interactions, Blind Person's Allowance, Marriage Allowance, Married
          Couple's Allowance, salary sacrifice, tax-code timing, emergency tax,
          capital gains tax, inheritance tax, savings or dividend rates,
          employment or self-employment income that differs from the entered
          full-salary context or the reduced-hours salary modelled between
          partial retirement and the retirement target, annual-allowance
          charges, the{" "}
          <a
            href={knowledgeLinks.moneyPurchaseAnnualAllowance}
            target="_blank"
            rel="noreferrer"
          >
            £
            {PENSION_WITHDRAWAL_TAX_RULES.moneyPurchaseAnnualAllowance.toLocaleString(
              "en-GB"
            )}{" "}
            money purchase annual allowance
          </a>{" "}
          after flexible access, or all pension tax edge cases. Scottish rates
          apply only to the non-savings, non-dividend pension income represented
          by the model. Check the estimate against provider statements, HMRC and
          regulated advice where appropriate.
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
        <p className="section-copy">
          A two-person saved scenario is a complete household snapshot,
          including dormant Partner data. The model does not calculate survivor
          pensions, inheritance or asset transfers when one planning horizon is
          reached, and it does not automatically reduce the household target at
          that point.
        </p>
        <p className="section-copy">
          Comparisons are kept within the same model type. Two-person scenarios
          use their coordinated household target, assessment, timing and
          flexible-fund metrics; a saved scenario from the other model type is
          not silently combined into that table and remains available to load.
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
