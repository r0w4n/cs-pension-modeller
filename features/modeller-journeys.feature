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
    And the journey result should <resultExpectation>
    And the journey should <bridgeFundingExpectation>

    Examples:
      | journey                                 | targetStep                  | planningStep                | resultExpectation            | bridgeFundingExpectation                |
      | Simplified retirement journey           | About you and your target   | Your Civil Service pensions | use the shared bridge answer | hide bridge funding details by default  |
      | Work out what I need to retire early    | Your retirement target      | Your bridging pots          | show the projection table    | show bridge funding details by default  |

  @defaults
  Scenario: Bridge journey enables bridge pots and disables tax by default
    Given default modeller settings
    When bridge journey defaults are applied
    Then State Pension, ISA, LISA and SIPP should be included
    And Income Tax modelling should be off
    And ISA, LISA and SIPP withdrawals should use the use-by-age strategy
