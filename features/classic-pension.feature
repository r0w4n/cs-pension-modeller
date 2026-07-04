@civil-service-pension @legacy @classic @classic-plus
Feature: Model classic and classic plus Civil Service legacy pensions

  The modeller should support classic and classic plus as legacy Civil Service
  defined benefit pension pots.

  These pensions are not current contribution pots. The user can enter existing
  preserved or banked benefits, or enter the final salary and service details
  needed to estimate those benefits.

  Background:
    Given classic pension outputs are rounded to 2 decimal places
    And classic lump sum outputs are rounded to 2 decimal places


  # ---------------------------------------------------------------------------
  # Classic calculation
  # ---------------------------------------------------------------------------

  @classic @calculation
  Scenario Outline: Calculate classic pension from final salary and service
    Given the user has added a classic pension pot
    And the classic calculation mode is "estimate from salary and service"
    And the classic final pensionable earnings are <finalPensionableEarnings>
    And the classic reckonable service is <reckonableServiceYears> years
    When the classic pension pot is calculated
    Then the unreduced annual classic pension should be <expectedAnnualPension>
    And the automatic classic lump sum should be <expectedAutomaticLumpSum>

    Examples:
      | finalPensionableEarnings | reckonableServiceYears | expectedAnnualPension | expectedAutomaticLumpSum |
      | 60000.00                 | 10.0000                | 7500.00               | 22500.00                 |
      | 72000.00                 | 20.0000                | 18000.00              | 54000.00                 |
      | 54000.00                 | 14.3333                | 9674.98               | 29024.93                 |
      | 85000.00                 | 8.2500                 | 8765.63               | 26296.88                 |

  @classic @calculation @manual-entry
  Scenario: Enter known classic pension values directly
    Given the user has added a classic pension pot
    And the classic calculation mode is "enter known pension"
    When the user enters annual classic pension of 9000.00
    And the user enters automatic classic lump sum of 27000.00
    Then the unreduced annual classic pension should be 9000.00
    And the automatic classic lump sum should be 27000.00
    And the modeller should not recalculate classic pension from salary and service

  @classic @calculation @breakdown
  Scenario: Show classic calculation breakdown
    Given the user has added a classic pension pot
    And the classic calculation mode is "estimate from salary and service"
    And the classic final pensionable earnings are 60000.00
    And the classic reckonable service is 10.0000 years
    When the classic pension pot is calculated
    Then the classic calculation breakdown should show:
      | item                     | value    |
      | finalPensionableEarnings | 60000.00 |
      | reckonableServiceYears   | 10.0000  |
      | annualPension            | 7500.00  |
      | automaticLumpSum         | 22500.00 |


  # ---------------------------------------------------------------------------
  # Classic plus calculation
  # ---------------------------------------------------------------------------

  @classic-plus @calculation
  Scenario Outline: Calculate classic plus pension from pre-2002 and post-2002 service
    Given the user has added a classic plus pension pot
    And the classic plus calculation mode is "estimate from salary and service"
    And the classic plus final pensionable earnings are <finalPensionableEarnings>
    And the classic plus pre-2002 reckonable service is <pre2002ServiceYears> years
    And the classic plus post-2002 reckonable service is <post2002ServiceYears> years
    When the classic plus pension pot is calculated
    Then the pre-2002 annual classic plus pension should be <expectedPre2002Pension>
    And the post-2002 annual classic plus pension should be <expectedPost2002Pension>
    And the total unreduced annual classic plus pension should be <expectedTotalPension>
    And the automatic classic plus lump sum should be <expectedAutomaticLumpSum>

    Examples:
      | finalPensionableEarnings | pre2002ServiceYears | post2002ServiceYears | expectedPre2002Pension | expectedPost2002Pension | expectedTotalPension | expectedAutomaticLumpSum |
      | 60000.00                 | 10.0000             | 10.0000              | 7500.00                | 10000.00                | 17500.00             | 22500.00                 |
      | 72000.00                 | 15.0000             | 5.0000               | 13500.00               | 6000.00                 | 19500.00             | 40500.00                 |
      | 54000.00                 | 8.0000              | 12.0000              | 5400.00                | 10800.00                | 16200.00             | 16200.00                 |
      | 85000.00                 | 6.5000              | 8.2500               | 6906.25                | 11687.50                | 18593.75             | 20718.75                 |

  @classic-plus @calculation @manual-entry
  Scenario: Enter known classic plus pension values directly
    Given the user has added a classic plus pension pot
    And the classic plus calculation mode is "enter known pension"
    When the user enters annual classic plus pension of 17500.00
    And the user enters automatic classic plus lump sum of 22500.00
    Then the total unreduced annual classic plus pension should be 17500.00
    And the automatic classic plus lump sum should be 22500.00
    And the modeller should not recalculate classic plus pension from salary and service

  @classic-plus @calculation @breakdown
  Scenario: Show classic plus calculation breakdown
    Given the user has added a classic plus pension pot
    And the classic plus calculation mode is "estimate from salary and service"
    And the classic plus final pensionable earnings are 60000.00
    And the classic plus pre-2002 reckonable service is 10.0000 years
    And the classic plus post-2002 reckonable service is 10.0000 years
    When the classic plus pension pot is calculated
    Then the classic plus calculation breakdown should show:
      | component | annualPension | automaticLumpSum |
      | pre-2002  | 7500.00       | 22500.00         |
      | post-2002 | 10000.00      | 0.00             |
      | total     | 17500.00      | 22500.00         |


  # ---------------------------------------------------------------------------
  # Salary increase / final salary link
  # ---------------------------------------------------------------------------

  @classic @salary-increase @final-salary-link
  Scenario: Classic pension uses projected salary when final salary link is maintained
    Given the user has added a classic pension pot
    And the classic calculation mode is "estimate from salary and service"
    And the classic final salary link is "maintained"
    And the current classic final pensionable earnings are 70000.00
    And the classic salary increase assumption is 3.00%
    And the classic reckonable service is 10.0000 years
    When the user projects the classic pension for 5 years
    Then the final pensionable earnings used for classic should be 81149.19
    And the classic reckonable service should remain 10.0000 years
    And the unreduced annual classic pension should be 10143.65
    And the automatic classic lump sum should be 30430.94

  @classic @salary-increase @final-salary-link
  Scenario: Classic pension uses preserved salary when final salary link is broken
    Given the user has added a classic pension pot
    And the classic calculation mode is "estimate from salary and service"
    And the classic final salary link is "broken"
    And the preserved classic final pensionable earnings are 70000.00
    And the classic salary increase assumption is 3.00%
    And the classic reckonable service is 10.0000 years
    When the user projects the classic pension for 5 years
    Then the final pensionable earnings used for classic should remain 70000.00
    And the classic reckonable service should remain 10.0000 years
    And the unreduced annual classic pension should be 8750.00
    And the automatic classic lump sum should be 26250.00

  @classic-plus @salary-increase @final-salary-link
  Scenario: Classic plus pension uses projected salary when final salary link is maintained
    Given the user has added a classic plus pension pot
    And the classic plus calculation mode is "estimate from salary and service"
    And the classic plus final salary link is "maintained"
    And the current classic plus final pensionable earnings are 70000.00
    And the classic plus salary increase assumption is 3.00%
    And the classic plus pre-2002 reckonable service is 10.0000 years
    And the classic plus post-2002 reckonable service is 5.0000 years
    When the user projects the classic plus pension for 5 years
    Then the final pensionable earnings used for classic plus should be 81149.19
    And the pre-2002 annual classic plus pension should be 10143.65
    And the post-2002 annual classic plus pension should be 6762.43
    And the total unreduced annual classic plus pension should be 16906.08
    And the automatic classic plus lump sum should be 30430.94

  @classic-plus @salary-increase @final-salary-link
  Scenario: Classic plus pension uses preserved salary when final salary link is broken
    Given the user has added a classic plus pension pot
    And the classic plus calculation mode is "estimate from salary and service"
    And the classic plus final salary link is "broken"
    And the preserved classic plus final pensionable earnings are 70000.00
    And the classic plus salary increase assumption is 3.00%
    And the classic plus pre-2002 reckonable service is 10.0000 years
    And the classic plus post-2002 reckonable service is 5.0000 years
    When the user projects the classic plus pension for 5 years
    Then the final pensionable earnings used for classic plus should remain 70000.00
    And the pre-2002 annual classic plus pension should be 8750.00
    And the post-2002 annual classic plus pension should be 5833.33
    And the total unreduced annual classic plus pension should be 14583.33
    And the automatic classic plus lump sum should be 26250.00


  # ---------------------------------------------------------------------------
  # No new accrual
  # ---------------------------------------------------------------------------

  @classic @legacy @no-new-accrual
  Scenario: Classic service does not increase during future alpha employment
    Given the user has added a classic pension pot
    And the classic reckonable service is 10.0000 years
    When the user remains in alpha for 5 further scheme years
    Then the classic reckonable service should remain 10.0000 years
    And no new classic accrual should be added

  @classic-plus @legacy @no-new-accrual
  Scenario: Classic plus service does not increase during future alpha employment
    Given the user has added a classic plus pension pot
    And the classic plus pre-2002 reckonable service is 10.0000 years
    And the classic plus post-2002 reckonable service is 5.0000 years
    When the user remains in alpha for 5 further scheme years
    Then the classic plus pre-2002 reckonable service should remain 10.0000 years
    And the classic plus post-2002 reckonable service should remain 5.0000 years
    And no new classic plus accrual should be added


  # ---------------------------------------------------------------------------
  # CPI on/off
  # ---------------------------------------------------------------------------

  @classic @cpi
  Scenario Outline: CPI increases deferred classic pension before draw age
    Given the user has added a classic pension pot
    And the classic pension is deferred
    And the annual classic pension at deferral is <pensionAtDeferral>
    And the automatic classic lump sum at deferral is <lumpSumAtDeferral>
    And the classic pension is deferred for <deferredYears> years
    And the classic annual CPI assumption is <cpiRate>
    And classic CPI revaluation is <cpiEnabled>
    When the deferred classic pension is projected to draw age
    Then the unreduced annual classic pension at draw age should be <expectedAnnualPension>
    And the automatic classic lump sum at draw age should be <expectedAutomaticLumpSum>

    Examples:
      | pensionAtDeferral | lumpSumAtDeferral | deferredYears | cpiRate | cpiEnabled | expectedAnnualPension | expectedAutomaticLumpSum |
      | 10000.00          | 30000.00          | 5             | 3.00%   | on         | 11592.74              | 34778.22                 |
      | 10000.00          | 30000.00          | 5             | 3.00%   | off        | 10000.00              | 30000.00                 |

  @classic-plus @cpi
  Scenario Outline: CPI increases deferred classic plus pension before draw age
    Given the user has added a classic plus pension pot
    And the classic plus pension is deferred
    And the annual classic plus pension at deferral is <pensionAtDeferral>
    And the automatic classic plus lump sum at deferral is <lumpSumAtDeferral>
    And the classic plus pension is deferred for <deferredYears> years
    And the classic plus annual CPI assumption is <cpiRate>
    And classic plus CPI revaluation is <cpiEnabled>
    When the deferred classic plus pension is projected to draw age
    Then the unreduced annual classic plus pension at draw age should be <expectedAnnualPension>
    And the automatic classic plus lump sum at draw age should be <expectedAutomaticLumpSum>

    Examples:
      | pensionAtDeferral | lumpSumAtDeferral | deferredYears | cpiRate | cpiEnabled | expectedAnnualPension | expectedAutomaticLumpSum |
      | 15000.00          | 24000.00          | 5             | 3.00%   | on         | 17389.11              | 27822.58                 |
      | 15000.00          | 24000.00          | 5             | 3.00%   | off        | 15000.00              | 24000.00                 |


  # ---------------------------------------------------------------------------
  # Early retirement
  # ---------------------------------------------------------------------------

  @classic @early-retirement
  Scenario Outline: Apply early retirement reduction to classic pension
    Given the user has added a classic pension pot
    And the classic normal pension age is 60
    And the unreduced annual classic pension is <unreducedAnnualPension>
    And the unreduced automatic classic lump sum is <unreducedAutomaticLumpSum>
    When the user draws classic pension at age <drawAge>
    Then the annual classic pension payable should be <expectedAnnualPension>
    And the automatic classic lump sum payable should be <expectedAutomaticLumpSum>
    And the annual classic pension reduction should be <expectedAnnualReduction>
    And the automatic classic lump sum reduction should be <expectedLumpSumReduction>

    Examples:
      | unreducedAnnualPension | unreducedAutomaticLumpSum | drawAge | expectedAnnualPension | expectedAutomaticLumpSum | expectedAnnualReduction | expectedLumpSumReduction |
      | 12000.00               | 36000.00                  | 60      | 12000.00              | 36000.00                 | 0.00                    | 0.00                     |
      | 12000.00               | 36000.00                  | 58      | 10800.00              | 32400.00                 | 1200.00                 | 3600.00                  |
      | 12000.00               | 36000.00                  | 55      | 9000.00               | 27000.00                 | 3000.00                 | 9000.00                  |

  @classic-plus @early-retirement
  Scenario Outline: Apply early retirement reduction to classic plus pension
    Given the user has added a classic plus pension pot
    And the classic plus normal pension age is 60
    And the unreduced annual classic plus pension is <unreducedAnnualPension>
    And the unreduced automatic classic plus lump sum is <unreducedAutomaticLumpSum>
    When the user draws classic plus pension at age <drawAge>
    Then the annual classic plus pension payable should be <expectedAnnualPension>
    And the automatic classic plus lump sum payable should be <expectedAutomaticLumpSum>
    And the annual classic plus pension reduction should be <expectedAnnualReduction>
    And the automatic classic plus lump sum reduction should be <expectedLumpSumReduction>

    Examples:
      | unreducedAnnualPension | unreducedAutomaticLumpSum | drawAge | expectedAnnualPension | expectedAutomaticLumpSum | expectedAnnualReduction | expectedLumpSumReduction |
      | 17500.00               | 22500.00                  | 60      | 17500.00              | 22500.00                 | 0.00                    | 0.00                     |
      | 17500.00               | 22500.00                  | 58      | 15750.00              | 20250.00                 | 1750.00                 | 2250.00                  |
      | 17500.00               | 22500.00                  | 55      | 13125.00              | 16875.00                 | 4375.00                 | 5625.00                  |
