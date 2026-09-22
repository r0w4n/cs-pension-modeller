@quick-calculator
Feature: Quick Alpha pension comparisons

  The separate quick calculator should compare Alpha estimates through the
  canonical pension engine without changing full-modeller plans.

  Scenario: Compare the same assumptions at two retirement ages
    Given valid Alpha statement and earnings inputs in the quick calculator
    When the member selects a supported retirement age before normal pension age
    Then estimates are available for both retirement ages
    And each age has standard, added-pension, reduced-hours and combined variants
    And the amounts are labelled annual, before tax and in today's money

  Scenario: Keep full-modeller plans separate
    Given browser local storage contains populated modeller data
    When quick-calculator inputs are saved and the quick calculator storage is reset
    Then all populated full-modeller plans and saved comparisons retain their original values

  Scenario: Apply working percentage to monthly Added Pension
    Given monthly Added Pension payments of 200 pounds
    And working hours reduce to 50 percent before retirement
    When the combined quick-calculator variant is calculated
    Then its regular Added Pension payment after that date is 100 pounds
    And the result explains that reduced payment assumption

  Scenario: Keep State Pension out of income before its start
    Given Alpha starts before the member's State Pension date
    When the quick estimates are displayed
    Then the Alpha-only amount is distinguished from the later combined amount
    And the combined amount states its actual start date

  Scenario: Distinguish an unanswered amount from zero
    Given an unanswered accrued pension field
    Then no current pension estimate is presented as complete
    When the member explicitly enters zero and completes the remaining inputs
    Then the zero accrued amount is used in the canonical calculation

  Scenario: Do not restore cleared quick-calculator data
    Given browser local storage contains populated modeller data
    And retained quick results have been calculated from the stored quick inputs
    When local data is cleared through the application action
    And the member edits quick inputs, enables saving and reloads
    Then cleared values and results do not return

  Scenario: Reject an incomplete enabled EPA schedule before normalisation
    Given valid quick inputs with an enabled EPA purchase period
    When the EPA period start date is cleared
    Then the raw EPA schedule is rejected with an actionable period error
    And no repaired quick-calculator estimate is produced
    When EPA is disabled and then re-enabled
    Then the raw EPA schedule error is restored

  Scenario: Keep future selected retirement available when normal retirement is past
    Given quick inputs for a member born in June 1959 with selected retirement at age 68
    When the quick comparisons are calculated on 22 September 2026
    Then normal-age variants are unavailable as past retirement
    And selected-age variants remain available
