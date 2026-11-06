@results @modeller-journeys
Feature: Explain the timing and completeness of retirement income

  Scenario Outline: A missing spending target is different from an explicit zero
    When the spending target draft is "<draft>"
    Then the spending target draft should be "<status>"

    Examples:
      | draft | status      |
      |       | invalid     |
      | 0     | valid-draft |

  Scenario: Lead with income at retirement when pensions start later
    Given retirement at age 60 with only State Pension starting at age 68
    When the Simple income headline is projected monthly
    Then the headline income at retirement should be zero
    And the later pension income should be shown separately at age 68

  Scenario: Keep a funded interval between shortfalls visible
    When chart shortfalls are projected for these ages:
      | age | shortfall |
      | 60  | 1000      |
      | 61  | 0         |
      | 67  | 1000      |
      | 68  | 1000      |
    Then the chart should report two separate shortfall ranges

  Scenario: Use calendar coordinates for household shortfall ranges
    When chart shortfalls are projected for a household calendar timeline
    Then the shortfall range should use years 2030 to 2031
