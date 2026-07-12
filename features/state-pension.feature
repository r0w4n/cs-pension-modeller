@state-pension
Feature: State Pension modelling

  The modeller should include State Pension as a separate secure retirement
  income source using the user's forecast, chosen start date, and growth
  assumptions.

  Background:
    Given State Pension outputs are rounded to 2 decimal places

  @growth @triple-lock
  Scenario Outline: Apply future State Pension growth only when selected
    Given the State Pension forecast is 10000.00 per year
    And the modelling start date is 2026-01-01
    And the State Pension start date is 2028-01-01
    And the State Pension projection basis is "nominal"
    And State Pension CPI growth is 3.00%
    And State Pension earnings growth is 4.00%
    And future State Pension growth is <futureGrowth>
    When the State Pension at the chosen start date is calculated
    Then the annual State Pension at the chosen start date should be <expectedAnnualPension>

    Examples:
      | futureGrowth | expectedAnnualPension |
      | on           | 10816.00              |
      | off          | 10000.00              |

  @growth @real-terms
  Scenario: Remove inflation from State Pension growth in real-terms projections
    Given the State Pension forecast is 10000.00 per year
    And the modelling start date is 2026-01-01
    And the State Pension start date is 2028-01-01
    And the State Pension projection basis is "real"
    And the long-term inflation assumption is 2.50%
    And future State Pension growth is on
    When the State Pension at the chosen start date is calculated
    Then the annual State Pension at the chosen start date should be 10000.00

  @deferral
  Scenario: Add State Pension deferral uplift when the user starts later
    Given the member date of birth is 1987-06-15
    And the State Pension forecast is 12000.00 per year
    And the State Pension start date is 2056-06-14
    And future State Pension growth is off
    When the State Pension at the chosen start date is calculated
    Then the State Pension deferral uplift should be 5.78%
    And the annual State Pension at the chosen start date should be 12693.33

  @start-date
  Scenario: Pay State Pension only from the selected start date
    Given the State Pension forecast is 11500.00 per year
    And the State Pension start date is 2055-06-15
    When the model checks State Pension income around the start date
    Then the monthly State Pension before the start date should be 0.00
    And the monthly State Pension from the start date should be 958.33
