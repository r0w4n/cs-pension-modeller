@local-privacy
Feature: Local-only preferences and data controls

  The modeller should keep user-entered data local to the browser and allow the
  user to disable or clear local persistence.

  @acknowledgement
  Scenario: Remember that the user has acknowledged the important information notice
    Given browser local storage is available
    When the important information notice is acknowledged
    Then the acknowledgement should be remembered locally

  @analytics-consent
  Scenario Outline: Remember the user's analytics consent choice
    Given browser local storage is available
    When analytics consent is saved as "<consent>"
    Then analytics consent should load as "<consent>"

    Examples:
      | consent  |
      | accepted |
      | rejected |

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
    And no previous analytics consent should be loaded
    And no previous modeller mode should be loaded
    And guidance notes should be shown

  @clear-data
  Scenario: Clear populated local data and reset active values
    Given browser local storage contains populated modeller data
    When local data is cleared through the application action
    Then local saving should be off
    And raw local storage should contain only the disabled saving preference
    And active modeller settings should be reset to their initial values
    And no previous acknowledgement should be loaded
    And no previous analytics consent should be loaded
    And no previous modeller mode should be loaded
    And guidance notes should be shown
    And display preferences should be reset to monthly values
    And saved comparison scenarios should be cleared

  @storage-disabled
  Scenario: Disable saving with existing data and ignore later edits
    Given browser local storage contains populated modeller data
    When local saving is disabled through the application action
    And the user edits settings and saves another comparison while local saving is disabled
    Then no settings or comparison data should be written while saving is disabled
    And raw local storage should contain only the disabled saving preference

  @clear-data
  Scenario: Re-enable saving after clearing and editing without restoring old values
    Given browser local storage contains populated modeller data
    When local data is cleared through the application action
    And the user edits active settings and comparisons while local saving is disabled
    And local saving is re-enabled through the application action
    And the modeller is reloaded from local storage
    Then the reloaded settings should contain the new edits
    And the reloaded comparison scenarios should contain only the new scenario
    And old cleared data should not reload
