@comparison-results @validation @settings-storage
Feature: Do not endorse invalid saved comparisons
  A comparison must not bypass settings parsing or present invalid calculated
  amounts as a workable retirement plan. Original stored data must remain
  available for recovery when saved comparisons cannot be loaded.

  Scenario: Keep valid comparisons and preserve malformed stored data
    Given browser local storage is available
    And saved comparison data contains a valid plan and a malformed State Pension amount
    When saved comparisons are loaded with recovery information
    Then only the valid saved comparison should be available for calculation
    And the original comparison data should remain unchanged for recovery

  Scenario: Preserve unreadable comparison JSON for recovery
    Given browser local storage is available
    And saved comparison data is unreadable JSON
    When saved comparisons are loaded with recovery information
    Then no saved comparisons should be available for calculation
    And the original comparison data should remain unchanged for recovery

  Scenario Outline: Do not classify non-finite financial results as workable
    Given a "<model>" comparison calculation has a malformed State Pension amount
    When that comparison outcome is assessed
    Then the comparison should say Needs checking rather than Looks workable
    And the invalid comparison should not be selected by comparison insights

    Examples:
      | model         |
      | single-person |
      | household     |
