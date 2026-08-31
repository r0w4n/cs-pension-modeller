@comparison-results
Feature: Scenario comparison results

  The modeller should let users compare saved retirement scenarios using
  product-level headings, recurring income units, and only the sections relevant
  to the scenarios being compared.

  Background:
    Given comparison result outputs are rounded to 2 decimal places

  @sections
  Scenario: Show headline comparison sections with product-friendly labels
    Given a default retirement scenario named "Current model"
    When comparison table rows are built
    Then the comparison should include the "Headline outcome" section
    And the comparison should include the "Status" metric
    And the comparison should include the "Target income" metric
    And the comparison should not include the "Overall status" metric

  @display-units
  Scenario Outline: Show recurring comparison values monthly or annually
    Given a default retirement scenario named "Current model"
    When comparison table rows are built using <display> recurring values
    Then the "Target income" comparison value should include "<unit>"
    And the "Alpha income" comparison value should include "<unit>"

    Examples:
      | display | unit   |
      | monthly | /month |
      | annual  | /year  |

  @optional-sections
  Scenario: Hide the flexible asset section when it is not relevant
    Given a default retirement scenario named "Current model"
    When comparison table rows are built without flexible assets
    And the comparison should not include the "Flexible assets" section

  @legacy-pension
  Scenario: Show nuvos comparison rows only when a compared scenario includes nuvos
    Given a default retirement scenario named "Current model"
    And a retirement scenario named "Saved with nuvos" includes nuvos pension
    When comparison table rows are built
    Then the "nuvos start" comparison value for "Current model" should be "n/a"
    And the "nuvos start" comparison value for "Saved with nuvos" should be "65"

  @spending-smile
  Scenario: Show phased-spending assumptions when a compared scenario uses them
    Given a default retirement scenario named "Flat plan"
    And a retirement scenario named "Phased plan" uses Go-Go, Slow-Go, No-Go spending
    When comparison table rows are built
    Then the comparison should include the "Spending target" section
    And the "Spending strategy" comparison value for "Flat plan" should be "Flat spending"
    And the "Spending strategy" comparison value for "Phased plan" should be "Go-Go, Slow-Go, No-Go"
    And the "Slow-go target" comparison value for "Flat plan" should be "n/a"
    And the "Slow-go target" comparison value for "Phased plan" should include "80%"
    And the "No-go starts" comparison value for "Phased plan" should be "84"

  @household
  Scenario: Use household metrics for a two-person scenario
    Given a default two-person retirement scenario named "Household plan"
    When comparison table rows are built
    Then the comparison should include the "Household headline outcome" section
    And the comparison should include the "Both retired" metric
    And the "Target income" comparison value should include "/year"
