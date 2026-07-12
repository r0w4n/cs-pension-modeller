@local-privacy
Feature: Local-only preferences and data controls

  The modeller should keep user-entered data local to the browser and allow the
  user to disable or clear local persistence.

  @acknowledgement
  Scenario: Remember that the user has acknowledged the important information notice
    Given browser local storage is available
    When the important information notice is acknowledged
    Then the acknowledgement should be remembered locally

  @preferences
  Scenario Outline: Store journey and comparison display preferences independently
    Given browser local storage is available
    When the journey retirement income display is saved as "<journeyDisplay>"
    And the comparison retirement income display is saved as "<comparisonDisplay>"
    Then the journey retirement income display should load as "<journeyDisplay>"
    And the comparison retirement income display should load as "<comparisonDisplay>"

    Examples:
      | journeyDisplay | comparisonDisplay |
      | annual         | monthly           |
      | monthly        | annual            |

  @storage-disabled
  Scenario: Use safe defaults when local storage is disabled
    Given browser local storage is disabled
    When the stored modeller preferences are loaded
    Then no previous acknowledgement should be loaded
    And no previous modeller mode should be loaded
    And guidance notes should be shown
