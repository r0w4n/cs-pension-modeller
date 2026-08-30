@expert-journey @two-person @results-chart
Feature: Joint retirement results chart

  The joint results chart keeps the established person chart for each member
  while presenting a read-only, owner-attributed household timeline.

  Scenario: Build the combined household result from calendar-aligned people
    Given a staggered two-person household
    When the joint household projection is calculated
    Then the joint result should retain separate You and Partner projections
    And the joint result should use one canonical household target

  Scenario: Keep a same-month household on the combined timeline
    Given default modeller settings
    And two people retire in the same calendar month
    When the joint household projection is calculated
    Then the joint result should have one household retirement month

  Scenario: Show key retirement markers while retaining Combined period inspection
    Given a staggered two-person household
    When the read-only household chart presentation is prepared
    Then inline household milestone annotations should be disabled
    And key household retirement markers should use the shared chart marker style
    And household period inspection should remain enabled

  Scenario: Group owner-attributed household events for inspection
    Given a staggered two-person household
    When household chart events are projected
    Then household chart events should retain You and Partner ownership
    And simultaneous household events should be grouped by calendar month
