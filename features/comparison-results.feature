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
  Scenario: Hide bridge and flexible asset sections when they are not relevant
    Given a default retirement scenario named "Current model"
    When comparison table rows are built without bridge funding and flexible assets
    Then the comparison should not include the "Bridge funding" section
    And the comparison should not include the "Flexible assets" section

  @legacy-pension
  Scenario: Show nuvos comparison rows only when a compared scenario includes nuvos
    Given a default retirement scenario named "Current model"
    And a retirement scenario named "Saved with nuvos" includes nuvos pension
    When comparison table rows are built
    Then the "nuvos start" comparison value for "Current model" should be "n/a"
    And the "nuvos start" comparison value for "Saved with nuvos" should be "65"
