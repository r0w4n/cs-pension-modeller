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

  Scenario: Keep personal result views independent from household funding
    Given a staggered two-person household
    And Your SIPP and ISA fund Your personal target
    When the joint household projection is calculated
    Then the stand-alone Your projection should contain ISA and SIPP withdrawals
    And the coordinated household projection may allocate Your withdrawals differently

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

  Scenario: Show key retirement markers while retaining household period inspection
    Given a staggered two-person household
    When the editable household chart presentation is prepared
    Then inline household milestone annotations should be disabled
    And key household retirement markers should use the shared chart marker style
    And household period inspection should remain enabled

  Scenario: Group owner-attributed household events for inspection
    Given a staggered two-person household
    When household chart events are projected
    Then household chart events should retain You and Partner ownership
    And simultaneous household events should be grouped by calendar month
