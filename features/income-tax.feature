@income-tax
Feature: Retirement income tax modelling

  The modeller should show a qualified 2026/27 Income Tax estimate based on
  the selected assumptions, while keeping taxable and tax-free retirement
  income sources transparent.

  The estimate covers non-savings, non-dividend pension income under either
  the England, Wales and Northern Ireland bands or the Scottish bands. It
  groups modelled income into April-to-March years, applies one Personal
  Allowance and the selected bands to that modelled tax-year income, then
  allocates the liability across rows in proportion to taxable income. Before
  retirement, the entered full salary is used as unshown tax context so that a
  switch from earnings to pension income does not create a fresh allowance.
  At the projection horizon, the final taxable monthly income is continued as
  tax-only context to the following 5 April so that truncating the projection
  does not create an artificial tax-free period.
  The monthly calculator scenarios below remain useful for a steady-income
  illustration, but projection results use the tax-year calculation.

  State Pension is taxable pension income but is normally paid without tax
  deducted. The model combines it with the other supported taxable retirement
  income before estimating tax.

  SIPP and CS AVC withdrawals can be modelled as fully taxable, UFPLS-style,
  custom or unknown. New plans track a shared pension lump-sum allowance,
  including an amount already used and modelled classic or classic plus
  automatic lump sums. Migrated plans retain their previous untracked custom
  percentage behavior. The model does not determine crystallisation history or
  protected allowances. It excludes employment income that differs from the
  entered salary assumption, savings, dividends, tax-code adjustments,
  emergency tax, National Insurance, Blind Person's Allowance, Marriage
  Allowance, Married Couple's Allowance, annual-allowance charges and the money
  purchase annual allowance.

  Background:
    Given Income Tax outputs are rounded to 2 decimal places

  Rule: Tax is optional and the standalone monthly calculator illustrates steady income

    @optional
    Scenario: Do not deduct Income Tax when taxation is disabled
      Given Income Tax modelling is off
      And monthly Alpha pension income is 3000.00
      And monthly State Pension income is 1000.00
      And monthly SIPP income is 500.00
      When monthly Income Tax is calculated
      Then the monthly Income Tax should be 0.00

    @annualisation
    Scenario: Annualise the current monthly taxable pension income before applying tax
      Given Income Tax modelling is on
      And the personal allowance is 0.00
      And the basic rate band is 50000.00
      And monthly Alpha pension income is 1000.00
      When monthly Income Tax is calculated
      Then the monthly taxable retirement income should be 1000.00
      And the annualised taxable retirement income should be 12000.00
      And the monthly Income Tax should be 200.00

  Rule: Projection tax uses the modelled April-to-March income

    @tax-year @part-year
    Scenario: Do not annualise a short modelled income period
      Given Income Tax modelling is on
      And the modelled tax year has these taxable monthly amounts:
        | date       | amount  |
        | 2027-01-15 | 4000.00 |
        | 2027-02-15 | 4000.00 |
        | 2027-03-15 | 4000.00 |
      When the modelled tax-year liability is allocated
      Then the total modelled Income Tax should be 0.00

    @tax-year @projection-end-context
    Scenario: Continue final taxable income to 5 April for the terminal tax rate
      Given Income Tax modelling is on
      And the modelled tax year has these taxable monthly amounts:
        | date       | amount  |
        | 2026-04-15 | 4000.00 |
        | 2026-05-15 | 4000.00 |
        | 2026-06-15 | 4000.00 |
      When the modelled tax-year liability is allocated
      Then the total modelled Income Tax should be 1771.50

    @tax-year @employment-context
    Scenario: Use earlier employment income as tax context when retirement starts mid-year
      Given Income Tax modelling is on
      And the modelled tax year has these taxable monthly amounts:
        | date       | amount  | taxContext |
        | 2026-04-15 | 0.00    | 3500.00    |
        | 2026-05-15 | 0.00    | 3500.00    |
        | 2026-06-15 | 3500.00 | 0.00       |
        | 2026-07-15 | 3500.00 | 0.00       |
        | 2026-08-15 | 3500.00 | 0.00       |
        | 2026-09-15 | 3500.00 | 0.00       |
        | 2026-10-15 | 3500.00 | 0.00       |
        | 2026-11-15 | 3500.00 | 0.00       |
        | 2026-12-15 | 3500.00 | 0.00       |
        | 2027-01-15 | 3500.00 | 0.00       |
        | 2027-02-15 | 3500.00 | 0.00       |
        | 2027-03-15 | 3500.00 | 0.00       |
      When the modelled tax-year liability is allocated
      Then the total modelled Income Tax should be 4905.00

    @tax-year @employment-income
    Scenario: Combine reduced-hours salary with pension income
      Given Income Tax modelling is on
      And monthly Alpha pension income is 500.00
      And monthly "reduced-hours employment" income is 2000.00
      When monthly Income Tax is calculated
      Then the monthly taxable retirement income should be 2500.00

  Rule: The results chart distinguishes estimated tax from target shortfall

    @chart-presentation
    Scenario: Distinguish estimated Income Tax from retirement-income shortfall
      Given the chart has annual gross retirement income of 40000.00
      And the chart has annual take-home retirement income of 34000.00
      And the chart has annual target retirement income of 35000.00
      When retirement chart overlays are prepared
      Then chart estimated Income Tax should be 6000.00
      And chart shortfall should be 1000.00
      And the chart key should identify "Estimated Income Tax" separately from "Shortfall"

  Rule: The UK-wide Personal Allowance is removed from taxable pension income

    @standard-assumptions @personal-allowance
    Scenario Outline: Apply the 2026/27 Personal Allowance and taper
      Given Income Tax modelling is on
      And the Income Tax regime is England, Wales or Northern Ireland
      When annual taxable retirement income of <annualTaxableIncome> is taxed
      Then the annual Income Tax should be <expectedAnnualTax>

      Examples:
        | annualTaxableIncome | expectedAnnualTax |
        | 0.00                | 0.00              |
        | 12570.00            | 0.00              |
        | 12571.00            | 0.20              |
        | 100000.00           | 27432.00          |
        | 100002.00           | 27433.20          |
        | 125140.00           | 42516.00          |

  Rule: England, Wales and Northern Ireland use three taxable-income bands

    @standard-assumptions @rest-of-uk
    Scenario Outline: Apply each 2026/27 rest-of-UK marginal rate at its boundary
      Given Income Tax modelling is on
      And the Income Tax regime is England, Wales or Northern Ireland
      When annual taxable retirement income of <annualTaxableIncome> is taxed
      Then the annual Income Tax should be <expectedAnnualTax>

      Examples:
        | annualTaxableIncome | expectedAnnualTax |
        | 50000.00            | 7486.00           |
        | 50270.00            | 7540.00           |
        | 50271.00            | 7540.40           |
        | 125140.00           | 42516.00          |
        | 125141.00           | 42516.45          |
        | 130000.00           | 44703.00          |

    @configurable-assumptions @regression
    Scenario: Treat a configured additional-rate threshold as taxable income
      Given Income Tax modelling is on
      And the Income Tax regime is England, Wales or Northern Ireland
      And the personal allowance is 20000.00
      And the personal allowance taper threshold is 200000.00
      And the basic rate band is 37700.00
      And the additional rate taxable-income threshold is 125140.00
      When annual taxable retirement income of 145140.00 is taxed
      Then the annual Income Tax should be 42516.00

  Rule: Scotland uses six taxable-income bands for pension income

    @scotland @standard-assumptions
    Scenario Outline: Apply each 2026/27 Scottish marginal rate at its boundary
      Given Income Tax modelling is on
      And the Income Tax regime is Scotland
      When annual taxable retirement income of <annualTaxableIncome> is taxed
      Then the annual Income Tax should be <expectedAnnualTax>

      Examples:
        | annualTaxableIncome | expectedAnnualTax |
        | 12570.00            | 0.00              |
        | 12571.00            | 0.19              |
        | 16537.00            | 753.73            |
        | 16538.00            | 753.93            |
        | 29526.00            | 3351.53           |
        | 29527.00            | 3351.74           |
        | 43662.00            | 6320.09           |
        | 43663.00            | 6320.51           |
        | 75000.00            | 19482.05          |
        | 75001.00            | 19482.50          |
        | 100000.00           | 30732.05          |
        | 100002.00           | 30733.40          |
        | 125140.00           | 47701.55          |
        | 125141.00           | 47702.03          |
        | 130000.00           | 50034.35          |

  Rule: Regular pension income and taxable withdrawals are combined before tax

    @taxable-sources
    Scenario Outline: Include each regular taxable retirement income source
      Given Income Tax modelling is on
      And the personal allowance is 0.00
      And the basic rate band is 50000.00
      And monthly <incomeSource> income is 1000.00
      When monthly Income Tax is calculated
      Then the monthly taxable retirement income should be 1000.00
      And the monthly Income Tax should be 200.00

      Examples:
        | incomeSource                            |
        | "Alpha pension"                        |
        | "classic pension"                      |
        | "classic plus pension"                 |
        | "nuvos pension"                        |
        | "Premium pension"                      |
        | "State Pension"                        |
        | "taxable additional guaranteed income" |

    @sipp
    Scenario: Keep the selected tax-free SIPP share outside taxable income
      Given Income Tax modelling is on
      And the SIPP tax-free withdrawal share is 25.00%
      And monthly Alpha pension income is 2000.00
      And monthly State Pension income is 1000.00
      And monthly SIPP income is 1000.00
      When monthly Income Tax is calculated
      Then the monthly taxable retirement income should be 3750.00
      And the monthly Income Tax should be 540.50

    @cs-avc
    Scenario: Keep the selected tax-free CS AVC share outside taxable income
      Given Income Tax modelling is on
      And the CS AVC tax-free withdrawal share is 25.00%
      And monthly Alpha pension income is 2000.00
      And monthly State Pension income is 1000.00
      And monthly CS AVC income is 1000.00
      When monthly Income Tax is calculated
      Then the monthly taxable retirement income should be 3750.00
      And the monthly Income Tax should be 540.50

    @withdrawal-treatment @conservative-assumption
    Scenario: Treat an unconfirmed SIPP withdrawal basis as fully taxable
      Given Income Tax modelling is on
      And the SIPP withdrawal treatment is "unknown"
      When tax treatment is applied to a SIPP withdrawal of 1000.00 and a CS AVC withdrawal of 0.00
      Then the SIPP tax-free cash should be 0.00
      And the SIPP taxable withdrawal should be 1000.00

    @lump-sum-allowance @shared-ledger
    Scenario: Share the remaining pension lump-sum allowance in funding order
      Given Income Tax modelling is on
      And the SIPP withdrawal treatment is "ufpls"
      And the CS AVC withdrawal treatment is "ufpls"
      And the remaining pension lump-sum allowance is 300.00
      When tax treatment is applied to a SIPP withdrawal of 1000.00 and a CS AVC withdrawal of 1000.00
      Then the SIPP tax-free cash should be 250.00
      And the CS AVC tax-free cash should be 50.00
      And the CS AVC taxable withdrawal should be 950.00
      And the remaining pension lump-sum allowance should be 0.00

    @scotland @sipp
    Scenario: Apply Scottish bands after excluding the selected tax-free SIPP share
      Given Income Tax modelling is on
      And the Income Tax regime is Scotland
      And the SIPP tax-free withdrawal share is 25.00%
      And monthly Alpha pension income is 2000.00
      And monthly State Pension income is 1000.00
      And monthly SIPP income is 1000.00
      When monthly Income Tax is calculated
      Then the monthly taxable retirement income should be 3750.00
      And the monthly Income Tax should be 573.50

    @combined-income
    Scenario: Combine pension sources before applying the allowance and bands
      Given Income Tax modelling is on
      And monthly Alpha pension income is 1000.00
      And monthly "classic pension" income is 250.00
      And monthly nuvos pension income is 250.00
      And monthly State Pension income is 500.00
      When monthly Income Tax is calculated
      Then the monthly taxable retirement income should be 2000.00
      And the monthly Income Tax should be 190.50

  Rule: Tax-free retirement income is not included in taxable pension income

    @tax-free-sources
    Scenario Outline: Exclude tax-free savings withdrawals from Income Tax
      Given Income Tax modelling is on
      And the personal allowance is 0.00
      And monthly <incomeSource> income is 1000.00
      When monthly Income Tax is calculated
      Then the monthly taxable retirement income should be 0.00
      And the monthly Income Tax should be 0.00

      Examples:
        | incomeSource                              |
        | "ISA withdrawal"                         |
        | "qualifying LISA withdrawal"             |
        | "non-taxable additional guaranteed income" |
