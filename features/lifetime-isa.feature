@lisa @lifetime-isa
Feature: Lifetime ISA retirement modelling

  The modeller should project an existing Lifetime ISA (LISA) as a tax-free
  retirement savings pot using the current statutory contribution, government
  bonus and later-life access rules, while keeping modeller assumptions and
  out-of-scope LISA uses explicit.

  # Facts reviewed against GOV.UK and HMRC guidance on 2026-09-01.
  # Current rules used by this feature:
  # - https://www.gov.uk/lifetime-isa
  # - https://www.gov.uk/lifetime-isa/withdrawing-money-from-your-lifetime-isa
  # - https://www.gov.uk/individual-savings-accounts/how-isas-work
  # - https://www.gov.uk/guidance/managing-lifetime-isa-applications-and-accounts
  #
  # The government has consulted on a future first-time-buyer ISA to replace
  # LISAs for new accounts. No commencement date or replacement rules are
  # applied here because those changes are not currently in force.

  Background:
    Given a default LISA modelling scenario
    And LISA outputs are rounded to 2 decimal places

  Rule: Existing LISA holders may contribute before age 50

  @eligibility @age
  Scenario: Do not confuse the LISA opening age with the contribution stop age
    Given the member opened a valid LISA before age 40
    And the member is now age 42
    When an otherwise eligible LISA contribution is evaluated
    Then the contribution should not be rejected because the member is age 40 or over
    And LISA contributions should remain eligible before age 50 subject to the applicable contribution limits

  @contributions @age-50 @boundary
  Scenario: Stop new LISA contributions on the 50th birthday
    Given the member reaches age 50 on "2027-03-15"
    When a LISA contribution of 100.00 is evaluated on "2027-03-14"
    Then the contribution should be eligible by age
    When a LISA contribution of 100.00 is evaluated on "2027-03-15"
    Then the contribution should not be eligible by age
    And no government bonus should be added for that ineligible contribution

  @contributions @age-50
  Scenario: Keep the LISA invested after contributions stop at age 50
    Given the member is age 50
    And the member has a LISA balance of 50000.00
    And the member plans regular LISA contributions of 300.00 per month
    And the annual LISA net investment return assumption is 0.00%
    When the LISA is projected for 12 months
    Then accepted LISA contributions should be 0.00
    And the LISA government bonus should be 0.00
    And the projected LISA balance should be 50000.00

  @investment-growth @age-50
  Scenario: Continue investment growth after age 50
    Given the member is age 50
    And the member has a LISA balance of 50000.00
    And the member makes no further eligible LISA contributions
    And the annual LISA net investment return assumption is greater than 0.00%
    When the LISA is projected beyond age 50
    Then the existing LISA balance should continue to receive modelled investment growth
    And investment growth should not receive a LISA government bonus

  Rule: Eligible additions share a £4,000 tax-year limit and receive a 25% bonus

  @contributions @annual-limit @government-bonus
  Scenario: Cap combined regular and lump-sum additions within a tax year
    Given the member is under age 50 throughout tax year "2026/27"
    And planned regular LISA contributions total 3600.00 in tax year "2026/27"
    And planned lump-sum LISA contributions total 1000.00 in tax year "2026/27"
    When eligible LISA additions are calculated for tax year "2026/27"
    Then accepted LISA additions should be 4000.00
    And additions above the LISA annual limit should be 600.00
    And the LISA government bonus should be 1000.00
    And total accepted additions including government bonus should be 5000.00

  @contributions @government-bonus
  Scenario Outline: Apply a 25 percent government bonus only to eligible additions
    Given the member is under age 50
    And eligible LISA additions in the tax year are <eligibleAdditions>
    When the LISA government bonus is calculated
    Then the LISA government bonus should be <expectedBonus>

    Examples:
      | eligibleAdditions | expectedBonus |
      | 0.00              | 0.00          |
      | 1000.00           | 250.00        |
      | 2500.00           | 625.00        |
      | 4000.00           | 1000.00       |

  @contributions @tax-year @annual-limit
  Scenario: Reset the LISA contribution limit on 6 April
    Given the member is under age 50 on "2027-04-05" and "2027-04-06"
    And the member has already made 4000.00 of eligible LISA additions in tax year "2026/27"
    When a further LISA addition of 4000.00 is scheduled on "2027-04-06"
    Then the further addition should be assessed against tax year "2027/28"
    And up to 4000.00 of that addition should be eligible in tax year "2027/28"
    And the government bonus for 4000.00 of eligible additions in tax year "2027/28" should be 1000.00

  @government-bonus @investment-growth
  Scenario: Do not apply the government bonus to an existing balance or investment return
    Given the member is under age 50
    And the member has a LISA balance of 10000.00
    And the member makes no eligible LISA additions in the tax year
    And the annual LISA net investment return assumption is 5.00%
    When the LISA is projected for the tax year
    Then the LISA government bonus should be 0.00
    And the existing balance should still receive modelled investment growth

  @contributions @monthly-control @copy
  Scenario: Do not present one twelfth of the annual allowance as a statutory monthly limit
    When the regular LISA contribution control and guidance are inspected
    Then the guidance should explain that the statutory LISA payment limit is 4000.00 per tax year
    And the guidance should not describe 333.33 per month as a statutory LISA contribution limit
    And any regular monthly planning maximum should be described as a modeller convention for regular saving
    And regular and lump-sum additions should share the same annual LISA limit

  @isa-allowance @copy @limitation
  Scenario: Explain that LISA payments form part of the overall ISA allowance
    Given the model includes both ISA and LISA contributions
    When the LISA allowance guidance is inspected
    Then it should explain that LISA payments count towards the overall annual ISA subscription limit
    And it should not describe the LISA allowance as an additional allowance on top of the overall ISA allowance
    And if cross-account ISA allowance validation is not implemented the methodology should say so explicitly

  Rule: Retirement withdrawals are modelled from age 60

  @access-age @validation
  Scenario: Require age 60 for the modeller's retirement LISA draw start age
    Given the modeller is using LISA for later-life retirement spending
    When the LISA draw start age is 59
    Then the LISA draw start age validation message should be "LISA retirement draw start age must be at least 60. The modeller does not model first-home, terminal-illness or charged early withdrawals."
    When the LISA draw start age is 60
    Then LISA draw start age validation should pass

  @access-age @withdrawals
  Scenario: Do not make retirement LISA funds available before the configured qualifying draw age
    Given the member retires at age 57
    And the member has a LISA balance of 40000.00
    And the LISA draw start age is 60
    And the LISA uses the target-based withdrawal strategy
    When the retirement income projection is calculated
    Then LISA retirement withdrawals at ages 57 through 59 should be 0.00
    And the LISA may be used for retirement withdrawals from age 60

  @withdrawals @strategy
  Scenario Outline: Apply each supported LISA withdrawal strategy only after LISA retirement access
    Given the member has a LISA balance of 50000.00
    And the LISA draw start age is 60
    And the LISA withdrawal strategy is <strategy>
    When the retirement income projection is calculated
    Then the strategy should not produce LISA retirement withdrawals before age 60
    And the strategy may produce LISA retirement withdrawals from age 60 subject to its configured rules

    Examples:
      | strategy                   |
      | "Annual percentage"       |
      | "Use by age"              |
      | "Zero at death"           |
      | "Use to meet income target" |

  @tax @withdrawals
  Scenario: Exclude qualifying LISA withdrawals from taxable retirement income
    Given Income Tax modelling is on
    And the member is age 60
    And monthly qualifying LISA withdrawal income is 1000.00
    When monthly Income Tax is calculated for the retirement projection
    Then taxable income from the qualifying LISA withdrawal should be 0.00
    And the full 1000.00 LISA withdrawal should be available toward after-tax spending

  Rule: The retirement modeller keeps non-retirement LISA mechanics out of scope

  @scope @limitations @copy
  Scenario: Explain the LISA behaviours that the retirement model does not determine
    When the LISA methodology and important information are inspected
    Then they should explain that the retirement LISA projection does not model first-home withdrawals
    And they should explain that the retirement LISA projection does not model the 25 percent withdrawal charge for other pre-60 withdrawals
    And they should explain that the retirement LISA projection does not model terminal-illness withdrawals
    And they should explain that the modeller does not determine legal contribution eligibility from UK residence or Crown-service status
    And they should explain that provider-specific payment, bonus-claim and transfer mechanics are outside the projection

  @scope @opening-age
  Scenario: Treat an entered balance as an existing LISA rather than deciding whether a new LISA can be opened
    Given a user is age 40 or over
    And the user enters a current LISA balance greater than 0.00
    When the LISA retirement projection is calculated
    Then the existing LISA balance should be accepted for modelling
    And the modeller should not claim that the user is currently eligible to open a new LISA
