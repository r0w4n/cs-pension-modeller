@modeller-journeys
Feature: Modeller journeys

  The modeller should offer guided journeys that expose the right level of
  detail while sharing the same comparison result interface.

  @mode-selection
  Scenario: Offer simplified, bridge, and expert planning journeys
    When the modeller journeys are loaded
    Then the available journey titles should include:
      | title                                    |
      | Simplified retirement journey            |
      | Work out what I need to retire early     |
      | Expert journey                           |

  @simple-journey @bridge-journey
  Scenario Outline: Guide users through the inputs needed for their planning journey
    When the "<journey>" journey is loaded
    Then the journey should include a step titled "<targetStep>"
    And the journey should include a step titled "<planningStep>"
    And the journey should include a step titled "Your results"
    And the "<targetStep>" journey step should include the field "Income Tax regime"
    And the journey result should <resultExpectation>
    And the journey should <bridgeFundingExpectation>

    Examples:
      | journey                                 | targetStep                  | planningStep                | resultExpectation            | bridgeFundingExpectation                |
      | Simplified retirement journey           | About you and your target   | Your Civil Service pensions | use the shared bridge answer | hide bridge funding details by default  |
      | Work out what I need to retire early    | Your retirement target      | Your bridging pots          | show the projection table    | show bridge funding details by default  |

  @expert-journey
  Scenario: Separate the expert retirement target from personal details
    Given default modeller settings
    When the "Expert journey" journey is loaded
    Then the default visible journey steps should be:
      | title                              |
      | Optional sections                  |
      | Personal details                   |
      | After-tax retirement income target |
      | Inflation and projection basis     |
      | State pension details              |
      | Alpha pension details              |
      | SIPP details                       |
      | ISA details                        |
      | Tax assumptions                    |
      | Your results                       |
    And the "Personal details" journey step should contain these fields:
      | field                         |
      | Your Birth Month and Year     |
      | Life Expectancy (Age)         |
    And the "After-tax retirement income target" journey step should contain these fields:
      | field                                                |
      | After-tax retirement income target (£ per year)      |
      | Target retirement age                                |
    And the "SIPP details" journey step should include the field "SIPP withdrawal tax treatment"
    And the "SIPP details" journey step should include the field "SIPP tax-free withdrawal share (%)"
    But the "Tax assumptions" journey step should not include the field "SIPP withdrawal tax treatment"
    And the "Tax assumptions" journey step should not include the field "SIPP tax-free withdrawal share (%)"

  @expert-journey @optional-sections
  Scenario: Exclude Alpha pension from an expert scenario
    Given default modeller settings
    When the "Expert journey" journey is loaded
    Then the expert optional sections should allow Alpha pension to be disabled
    When Alpha pension is disabled
    Then the "Alpha pension details" journey step should not be visible

  @defaults
  Scenario: Bridge journey enables bridge pots and Income Tax by default
    Given default modeller settings
    When bridge journey defaults are applied
    Then State Pension, ISA, LISA and SIPP should be included
    And Income Tax modelling should be on
    And ISA, LISA and SIPP withdrawals should use the use-by-age strategy

  @results-chart @chart-key
  Scenario: Exclude disabled income sources from the results chart key
    Given the results chart has these income sources:
      | source              | enabled | active |
      | Alpha pension       | yes     | yes    |
      | Civil Service AVC   | no      | no     |
      | LISA                | no      | no     |
      | SIPP                | yes     | no     |
    When the chart key is prepared without hiding inactive enabled sources
    Then the chart key should include "Alpha pension"
    And the chart key should include "SIPP"
    But the chart key should not include "Civil Service AVC"
    And the chart key should not include "LISA"
