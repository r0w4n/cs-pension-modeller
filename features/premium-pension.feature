@civil-service-pension @premium @legacy
Feature: Premium Civil Service pension modelling

  Premium is modelled as a closed legacy Civil Service pension where the user
  enters preserved benefits from a statement or pension portal. The modeller
  does not build new Premium accrual, salary-link benefits or optional Premium
  commutation.

  Background:
    Given Premium early-retirement factor tables version "2026-01" are loaded
    And Premium early-retirement tables are:
      | normalPensionAge | workbookTable | guidanceTable |
      | 60               | 1-406         | P1ER60PEN1    |
      | 65               | 1-410         | P1ER65PEN1    |
    And pension outputs are rounded to 2 decimal places


  # ---------------------------------------------------------------------------
  # Supported Premium input surface
  # ---------------------------------------------------------------------------

  @legacy @closed-scheme
  Scenario: Premium is shown as a closed preserved pension
    When the Premium pension input group is inspected
    Then the Premium optional-section label should be "Premium"
    And the Premium field group title should be "Your Premium pension"
    And the Premium field group should explain:
      """
      Premium is a closed legacy Civil Service defined benefit pension. You cannot build up new Premium pension. Enter the preserved annual Premium pension from your statement or pension portal; the modeller applies simplified CPI-linked increases before and after the age you choose to take it.
      """

  @legacy @closed-scheme @validation
  Scenario: Premium does not expose contribution or salary-service accrual inputs
    When the Premium pension input group is inspected
    Then Premium should ask for these production fields:
      | fieldId                             |
      | premiumAnnualPensionAtValuationDate |
      | premiumValuationDate                |
      | premiumDrawAge                      |
      | premiumHasNpa65                     |
      | premiumNormalPensionAge             |
      | premiumEarliestAccessAge            |
    And Premium should not ask for unsupported fields:
      | fieldId                         |
      | premiumMonthlyContribution      |
      | premiumLumpSumContribution      |
      | premiumFinalPensionableEarnings |
      | premiumReckonableServiceYears   |
      | premiumFinalSalaryLink          |
      | premiumOptionalLumpSum          |


  # ---------------------------------------------------------------------------
  # Preserved Premium pension calculation
  # ---------------------------------------------------------------------------

  @calculation @preserved @cpi
  Scenario Outline: Revalue preserved Premium pension using the selected CPI basis
    Given the member has a deferred Premium pension record
    And the member has annual Premium pension of <pensionAtValuationDate> at valuation
    And the Premium valuation date is <valuationDate>
    And the Premium member date of birth is <dateOfBirth>
    And the member has Premium normal pension age <normalPensionAge>
    And the planned Premium draw age is <drawAge>
    And the annual CPI assumption is <cpiRate>
    And CPI revaluation is <cpiEnabled>
    When the preserved Premium pension is calculated
    Then the unreduced annual Premium pension at draw age should be <expectedAnnualPension>
    And the annual Premium pension payable should be <expectedAnnualPensionPayable>

    Examples:
      | pensionAtValuationDate | valuationDate | dateOfBirth | normalPensionAge | drawAge | cpiRate | cpiEnabled | expectedAnnualPension | expectedAnnualPensionPayable |
      | 10000.00               | 2026-04-01    | 1970-04-01  | 60               | 61      | 3.00%   | on         | 11592.74              | 11592.74                     |
      | 10000.00               | 2026-04-01    | 1970-04-01  | 60               | 61      | 3.00%   | off        | 10000.00              | 10000.00                     |
      | 12000.00               | 2026-04-01    | 1970-04-01  | 60               | 58      | 0.00%   | off        | 12000.00              | 10992.00                     |
      | 12000.00               | 2026-04-01    | 1970-04-01  | 65               | 60.5    | 0.00%   | off        | 12000.00              | 9612.00                      |

  @early-retirement
  Scenario Outline: Use published Premium early-retirement factors by completed month
    Given the member has a deferred Premium pension record
    And the member has annual Premium pension of <unreducedAnnualPension> at valuation
    And the Premium valuation date is 2026-04-01
    And the Premium member date of birth is 1970-04-01
    And the member has Premium normal pension age <normalPensionAge>
    And the annual CPI assumption is 0.00%
    And CPI revaluation is off
    When the member draws Premium pension at age <drawAge> and <drawAgeMonths> months
    Then the Premium early-retirement factor should be <expectedFactor>
    And the annual Premium pension payable should be <expectedAnnualPension>
    And the annual reduction should be <expectedAnnualReduction>

    Examples:
      | normalPensionAge | unreducedAnnualPension | drawAge | drawAgeMonths | expectedFactor | expectedAnnualPension | expectedAnnualReduction |
      | 60               | 12000.00               | 60      | 0             | 1.000          | 12000.00              | 0.00                    |
      | 60               | 12000.00               | 58      | 0             | 0.916          | 10992.00              | 1008.00                 |
      | 60               | 12000.00               | 58      | 6             | 0.936          | 11232.00              | 768.00                  |
      | 60               | 18000.00               | 55      | 0             | 0.806          | 14508.00              | 3492.00                 |
      | 65               | 12000.00               | 60      | 0             | 0.783          | 9396.00               | 2604.00                 |
      | 65               | 12000.00               | 60      | 6             | 0.801          | 9612.00               | 2388.00                 |
      | 65               | 12000.00               | 65      | 0             | 1.000          | 12000.00              | 0.00                    |

  @early-retirement
  Scenario: Premium early retirement reduction is permanent
    Given the member has a deferred Premium pension record
    And the member has annual Premium pension of 12000.00 at valuation
    And the Premium valuation date is 2026-04-01
    And the Premium member date of birth is 1970-04-01
    And the member has Premium normal pension age 60
    And the annual CPI assumption is 0.00%
    And CPI revaluation is off
    When the member draws Premium pension at age 55
    Then the annual Premium pension payable at age 55 should be 9672.00
    And the annual Premium pension payable at age 60 before pension increases should still be 9672.00
    And calculating Premium at age 60 should use the original early-retirement reduction

  @early-retirement @unsupported
  Scenario Outline: Flag Premium early-retirement cases outside the published factor scope
    Given the member has a deferred Premium pension record
    And the member has annual Premium pension of 12000.00 at valuation
    And the Premium valuation date is 2026-04-01
    And the Premium member date of birth is 1970-04-01
    And the member has Premium normal pension age <normalPensionAge>
    And the annual CPI assumption is 0.00%
    And CPI revaluation is off
    When the member draws Premium pension at age <drawAge>
    Then the Premium early-retirement factor should be unavailable
    And the annual Premium pension payable should be 0.00

    Examples:
      | normalPensionAge | drawAge |
      | 60               | 54      |
      | 63               | 58      |


  # ---------------------------------------------------------------------------
  # In-payment increases
  # ---------------------------------------------------------------------------

  @cpi @in-payment
  Scenario Outline: Apply the CPI setting to Premium pension increases in payment
    Given the member has a Premium pension in payment
    And the annual Premium pension payable is 12000.00
    And the annual CPI assumption is 3.00%
    And CPI revaluation is <cpiEnabled>
    When the pension is increased for 1 year in payment
    Then the annual Premium pension after increase should be <expectedAnnualPension>
    And the monthly gross Premium pension should be <expectedMonthlyPension>

    Examples:
      | cpiEnabled | expectedAnnualPension | expectedMonthlyPension |
      | on         | 12360.00              | 1030.00                |
      | off        | 12000.00              | 1000.00                |

  @cpi @in-payment @early-retirement
  Scenario: Increase an early-reduced Premium pension in payment without removing the reduction
    Given the member has a deferred Premium pension record
    And the member has annual Premium pension of 12000.00 at valuation
    And the Premium valuation date is 2026-04-01
    And the Premium member date of birth is 1970-04-01
    And the member has Premium normal pension age 60
    And the annual CPI assumption is 3.00%
    And CPI revaluation is on
    When the member draws Premium pension at age 55
    Then the annual Premium pension payable should be 9672.00
    When the pension is increased for 1 year in payment
    Then the annual Premium pension after increase should be 9962.16
    And the monthly gross Premium pension should be 830.18
