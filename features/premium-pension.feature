@civil-service-pension @premium @legacy
Feature: Premium Civil Service pension modelling

  Premium is a legacy Civil Service pension scheme.

  Members may have preserved or banked Premium benefits, but Premium can no
  longer be directly contributed to by most members. Once a member has moved
  into alpha, no further reckonable service is built up in Premium.

  Premium pension should be modelled separately from alpha and other Civil
  Service pension pots.

  Background:
    Given Civil Service pension factor tables version "acceptance-v1" are loaded
    And Civil Service pension commutation tables version "acceptance-v1" are loaded
    And pension outputs are rounded to 2 decimal places


  # ---------------------------------------------------------------------------
  # Legacy scheme status
  # ---------------------------------------------------------------------------

  @legacy @closed-scheme
  Scenario: Premium is shown as a legacy pension scheme
    Given the member has a Premium pension record
    When the pension record is displayed
    Then the scheme should be labelled "Premium"
    And the scheme status should be "Legacy"
    And the scheme should explain:
      """
      Premium is a legacy Civil Service pension. You may have preserved or banked
      Premium benefits, but you cannot directly build up new Premium pension in
      the modeller.
      """

  @legacy @closed-scheme @validation
  Scenario: Premium does not allow direct monthly contributions
    Given the member has a Premium pension record
    When the member attempts to add a monthly Premium contribution of 400.00
    Then the contribution should be rejected
    And the model should show the validation message:
      """
      Premium is a legacy Civil Service pension and cannot receive new direct
      monthly contributions. New Civil Service pension accrual should normally be
      modelled under alpha.
      """

  @legacy @closed-scheme @validation
  Scenario: Premium does not allow direct lump sum contributions
    Given the member has a Premium pension record
    When the member attempts to add a Premium lump sum contribution of 5000.00
    Then the contribution should be rejected
    And the model should show the validation message:
      """
      Premium is a legacy Civil Service pension and cannot receive new direct
      lump sum contributions.
      """


  # ---------------------------------------------------------------------------
  # Premium pension calculation
  # ---------------------------------------------------------------------------

  @calculation @final-salary
  Scenario Outline: Calculate Premium pension from final pensionable earnings and reckonable service
    Given the member has a Premium pension record
    And the member has final pensionable earnings of <finalPensionableEarnings>
    And the member has Premium reckonable service of <reckonableServiceYears> years
    When the Premium pension is calculated
    Then the unreduced annual Premium pension should be <expectedAnnualPension>

    Examples:
      | finalPensionableEarnings | reckonableServiceYears | expectedAnnualPension |
      | 60000.00                 | 10.0000                | 10000.00              |
      | 72000.00                 | 10.0000                | 12000.00              |
      | 60000.00                 | 12.5000                | 12500.00              |
      | 85000.00                 | 8.2500                 | 11687.50              |

  @calculation @final-salary @part-time
  Scenario: Calculate reckonable service for part-time Premium service
    Given the member has a Premium pension record
    And the member worked for 6 calendar years
    And the member worked 24 hours per week
    And the full-time working pattern was 36 hours per week
    And the member has final pensionable earnings of 27000.00
    When the Premium pension is calculated
    Then the Premium reckonable service should be 4.0000 years
    And the unreduced annual Premium pension should be 1800.00

  @calculation @final-salary @part-time
  Scenario: Calculate Premium pension with mixed full-time and part-time service
    Given the member has a Premium pension record
    And the member has the following Premium service history:
      | period          | calendarYears | actualWeeklyHours | fullTimeWeeklyHours |
      | full-time       | 8.0000        | 36.00             | 36.00               |
      | part-time       | 6.0000        | 20.00             | 36.00               |
      | compressed-full | 3.0000        | 36.00             | 36.00               |
    And the member has final pensionable earnings of 54000.00
    When the Premium pension is calculated
    Then the Premium reckonable service breakdown should be:
      | period          | reckonableServiceYears |
      | full-time       | 8.0000                 |
      | part-time       | 3.3333                 |
      | compressed-full | 3.0000                 |
      | total           | 14.3333                |
    And the unreduced annual Premium pension should be 12900.00


  # ---------------------------------------------------------------------------
  # No new Premium accrual after transition to alpha
  # ---------------------------------------------------------------------------

  @legacy @alpha-transition
  Scenario: Premium reckonable service does not increase after moving to alpha
    Given the member has a Premium pension record
    And the member has Premium reckonable service of 10.0000 years
    And the member moved to alpha on 2015-04-01
    And the member remains active in alpha for 5 further scheme years
    When the Civil Service pension projection is calculated
    Then the Premium reckonable service should remain 10.0000 years
    And no new Premium pension accrual should be added
    And new Civil Service pension accrual should be added only to alpha

  @legacy @alpha-transition @salary-link
  Scenario: Premium pension updates with final salary when final salary link is maintained
    Given the member has a Premium pension record
    And the member has Premium reckonable service of 10.0000 years
    And the member has final salary link status "maintained"
    And the member has current final pensionable earnings of 70000.00
    And the annual salary increase assumption is 3.00%
    When the member remains active in alpha for 5 further scheme years
    Then the Premium reckonable service should remain 10.0000 years
    And the final pensionable earnings used for Premium should be 81149.19
    And the unreduced annual Premium pension should be 13524.86

  @legacy @alpha-transition @salary-link
  Scenario: Premium pension does not update with salary once final salary link is broken
    Given the member has a Premium pension record
    And the member has Premium reckonable service of 10.0000 years
    And the member has final salary link status "broken"
    And the member has preserved final pensionable earnings of 70000.00
    And the annual salary increase assumption is 3.00%
    When the member remains active in alpha for 5 further scheme years
    Then the Premium reckonable service should remain 10.0000 years
    And the final pensionable earnings used for Premium should remain 70000.00
    And the unreduced annual Premium pension should be 11666.67


  # ---------------------------------------------------------------------------
  # Normal pension age
  # ---------------------------------------------------------------------------

  @normal-pension-age
  Scenario: Premium has normal pension age 60
    Given the member has a Premium pension record
    When the Premium pension age rules are loaded
    Then the Premium normal pension age should be 60

  @normal-pension-age @mixed-schemes
  Scenario: Premium and alpha have different normal pension ages
    Given the member has the following Civil Service pension pots:
      | scheme  | unreducedAnnualPension | normalPensionAge |
      | premium | 12000.00               | 60               |
      | alpha   | 15000.00               | 67               |
    When the member draws all Civil Service pension pots at age 60
    Then the Premium pension should be payable without early retirement reduction
    And the alpha pension should be reduced for early payment
    And the annual pension breakdown should be:
      | scheme  | unreducedAnnualPension | payableAnnualPension | annualReduction |
      | premium | 12000.00               | 12000.00             | 0.00            |
      | alpha   | 15000.00               | 10500.00             | 4500.00         |
      | total   | 27000.00               | 22500.00             | 4500.00         |


  # ---------------------------------------------------------------------------
  # Early retirement
  # ---------------------------------------------------------------------------

  @early-retirement
  Scenario Outline: Reduce Premium pension when drawn before age 60
    Given the member has a Premium pension record
    And the member has Premium normal pension age 60
    And the member has unreduced annual Premium pension of <unreducedAnnualPension>
    When the member draws Premium pension at age <drawAge>
    Then the annual Premium pension payable should be <expectedAnnualPension>
    And the annual reduction should be <expectedAnnualReduction>

    Examples:
      | unreducedAnnualPension | drawAge | expectedAnnualPension | expectedAnnualReduction |
      | 12000.00               | 60      | 12000.00              | 0.00                    |
      | 12000.00               | 58      | 10800.00              | 1200.00                 |
      | 12000.00               | 55      | 9000.00               | 3000.00                 |
      | 18000.00               | 55      | 13500.00              | 4500.00                 |

  @early-retirement
  Scenario: Premium early retirement reduction is permanent
    Given the member has a Premium pension record
    And the member has Premium normal pension age 60
    And the member has unreduced annual Premium pension of 12000.00
    When the member draws Premium pension at age 55
    Then the annual Premium pension payable at age 55 should be 9000.00
    And the annual Premium pension payable at age 60 before pension increases should still be 9000.00
    And the model should not remove the early retirement reduction at normal pension age


  # ---------------------------------------------------------------------------
  # CPI / pension increases
  # ---------------------------------------------------------------------------

  @cpi @deferred
  Scenario Outline: Revalue deferred Premium pension using CPI
    Given the member has a deferred Premium pension record
    And the member has annual Premium pension of <pensionAtDeferral> at deferral
    And the member defers pension for <deferredYears> years
    And the annual CPI assumption is <cpiRate>
    And CPI revaluation is <cpiEnabled>
    When the deferred Premium pension is projected to draw age
    Then the unreduced annual Premium pension at draw age should be <expectedAnnualPension>

    Examples:
      | pensionAtDeferral | deferredYears | cpiRate | cpiEnabled | expectedAnnualPension |
      | 10000.00          | 5             | 3.00%   | on         | 11592.74              |
      | 10000.00          | 5             | 3.00%   | off        | 10000.00              |
      | 12500.00          | 3             | 2.00%   | on         | 13265.10              |
      | 12500.00          | 3             | 2.00%   | off        | 12500.00              |

  @cpi @in-payment
  Scenario: Increase Premium pension in payment using CPI
    Given the member has a Premium pension in payment
    And the annual Premium pension payable is 12000.00
    And the annual CPI assumption is 3.00%
    And CPI revaluation is on
    When the pension is increased for 1 year in payment
    Then the annual Premium pension after increase should be 12360.00
    And the monthly gross Premium pension should be 1030.00


  # ---------------------------------------------------------------------------
  # Optional lump sum / commutation
  # ---------------------------------------------------------------------------

  @lump-sum @commutation
  Scenario Outline: Member gives up Premium pension for an optional lump sum
    Given the member has a Premium pension record
    And the member has annual Premium pension before commutation of <annualPensionBeforeCommutation>
    And the member chooses an optional lump sum of <chosenLumpSum>
    When the Premium commutation calculation is performed
    Then the annual Premium pension after commutation should be <annualPensionAfterCommutation>
    And the optional lump sum payable should be <optionalLumpSum>

    Examples:
      | annualPensionBeforeCommutation | chosenLumpSum | annualPensionAfterCommutation | optionalLumpSum |
      | 12000.00                       | 0.00          | 12000.00                      | 0.00            |
      | 12000.00                       | 12000.00      | 11000.00                      | 12000.00        |
      | 12000.00                       | 24000.00      | 10000.00                      | 24000.00        |

  @lump-sum @commutation @validation
  Scenario: Reject optional lump sum above the permitted maximum
    Given the member has a Premium pension record
    And the member has annual Premium pension before commutation of 12000.00
    And the maximum permitted optional lump sum is 60000.00
    When the member chooses an optional lump sum of 75000.00
    Then the optional lump sum should be rejected
    And the model should show the validation message:
      """
      The selected lump sum is above the permitted maximum for this Premium pension.
      """


  # ---------------------------------------------------------------------------
  # Abatement warning
  # ---------------------------------------------------------------------------

  @abatement @warning
  Scenario: Warn that Premium may be subject to abatement on Civil Service re-employment
    Given the member has a Premium pension in payment
    And the member indicates they may return to Civil Service employment
    When the pension result is displayed
    Then the model should show the warning:
      """
      Premium is a legacy Civil Service pension and may be subject to abatement if
      you take the pension and later return to Civil Service employment.
      """

  @abatement @warning
  Scenario: Do not show alpha-only abatement wording for Premium
    Given the member has a Premium pension in payment
    When the pension result is displayed
    Then the model should not say "alpha pensions are subject to abatement"
    And the model should explain abatement only for applicable legacy pension schemes


  # ---------------------------------------------------------------------------
  # End-to-end Premium projection
  # ---------------------------------------------------------------------------

  @end-to-end @premium @legacy @early-retirement @lump-sum
  Scenario: Project preserved Premium pension and draw it early with optional lump sum
    Given the member has a Premium pension record
    And the member has Premium reckonable service of 10.0000 years
    And the member has final salary link status "broken"
    And the member has preserved final pensionable earnings of 72000.00
    And the member has Premium normal pension age 60
    And the annual CPI assumption is 0.00%
    And CPI revaluation is off
    When the member draws Premium pension at age 55
    And the member chooses an optional lump sum of 9000.00
    Then the unreduced annual Premium pension before early retirement should be 12000.00
    And the annual Premium pension after early retirement reduction should be 9000.00
    And the annual Premium pension after commutation should be 8250.00
    And the optional lump sum payable should be 9000.00
    And the result should show:
      | component                       | annualAmount |
      | premiumBeforeEarlyRetirement    | 12000.00     |
      | premiumAfterEarlyRetirement     | 9000.00      |
      | pensionGivenUpForOptionalLumpSum | 750.00       |
      | premiumAfterCommutation         | 8250.00      |
