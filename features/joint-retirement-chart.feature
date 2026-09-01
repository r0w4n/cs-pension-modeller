@expert-journey @two-person @results-chart
Feature: Joint retirement results chart

  The joint results chart presents one editable Household Retirement Plan while
  preserving separate person, source and tax calculations underneath.

  Scenario: Build the combined household result from calendar-aligned people
    Given a staggered two-person household
    When the joint household projection is calculated
    Then the joint result should retain separate You and Partner projections
    And the joint result should use one canonical household target
    And the joint result should contain one row per calendar month
    And the joint result should retain aligned You and Partner age timelines

  Scenario: Flag person-specific target pots that retain contributed savings
    Given a two-person household with more SIPP contributions than the shared target uses
    When the joint household projection is calculated
    Then the joint result should report potential over-saving for Your coordinated SIPP
    And the joint result should report potential over-saving for Partner's coordinated SIPP

  Scenario: Keep a same-month household on the combined timeline
    Given default modeller settings
    And two people retire in the same calendar month
    When the joint household projection is calculated
    Then the joint result should have one household retirement month

  Scenario: Include a later retiree's salary once during the household transition
    Given a staggered household where Partner partially retires after You retire
    When the joint household projection is calculated
    Then Partner employment income should be full salary before partial retirement
    And Partner employment income should be reduced after partial retirement
    And Partner transition salary should be included once in the Income Tax estimate

  Scenario: Preserve an intentional zero-work partial retirement setting
    Given a staggered household where Partner partially retires after You retire
    And Partner's partial-retirement work percentage is 0
    When the joint household projection is calculated
    Then Partner employment income should be zero after partial retirement

  Scenario: Do not report an account that was never funded as depleted
    Given a two-person household with an enabled but never-funded ISA
    When the joint household projection is calculated
    Then the household assessment should not report the ISA as depleted

  Scenario: Project owner-attributed flexible withdrawals into the shared chart
    Given a household chart with owner-attributed flexible withdrawals
    When the joint household results are projected
    Then the chart should match the canonical You and Partner flexible withdrawals
    And the chart timeline should retain You and Partner ages

  Scenario: Keep owner-specific contribution controls on the household chart
    Given a household chart with owner-attributed flexible withdrawals
    When the joint household results are projected
    Then the household chart should expose You and Partner contribution controls

  Scenario: Group owner-attributed household events for inspection
    Given a staggered two-person household
    When household chart events are projected
    Then household chart events should retain You and Partner ownership
    And simultaneous household events should be grouped by calendar month
