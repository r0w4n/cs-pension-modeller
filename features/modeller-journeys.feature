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
      | journey                              | targetStep                        | planningStep                | resultExpectation            | bridgeFundingExpectation               |
      | Simplified retirement journey        | What would you like to spend each month? | Do you have any other Civil Service pensions? | use the shared bridge answer | hide bridge funding details by default |
      | Work out what I need to retire early | Your retirement target            | Your bridging pots          | show the projection table    | show bridge funding details by default |

  @simple-journey
  Scenario: Start the simplified journey with personal details
    When the "Simplified retirement journey" journey is loaded
    Then the first journey step should be titled "A little about you"
    And the journey should not include a step titled "Alpha pension: the basics"
    And the journey should include a step titled "What would you like to spend each month?"
    And the "What would you like to spend each month?" journey step should contain these fields:
      | field                                                              |
      | How much would you like available to spend each month after tax?   |
      | Income Tax regime                                                  |
    And the "What would you like to spend each month?" journey step should link to the Retirement Living Standards
    And the "What would you like to spend each month?" journey step should place its support link beside the field

  @simple-journey @alpha
  Scenario: Ask when the member would like to retire
    When the "Simplified retirement journey" journey is loaded
    Then the journey should include a step titled "What age would you like to retire?"
    And the "What age would you like to retire?" journey step should contain these fields:
      | field                                            |
      | How old would you like to be when you retire?    |
    And the "What would you like to spend each month?" journey step should appear before the "What age would you like to retire?" journey step
    And the "What age would you like to retire?" journey step should appear before the "Add your Alpha pension details" journey step

  @simple-journey @optional-sections
  Scenario: Explain other Civil Service pensions while keeping Alpha included
    Given default modeller settings
    When the "Simplified retirement journey" journey is loaded
    Then the simplified pension choices should not offer Alpha as an optional pension
    And the simplified pension choices should explain:
      | choice                    |
      | classic pension           |
      | classic plus pension      |
      | nuvos pension             |
      | premium pension           |
      | Civil Service AVC savings |

  @simple-journey
  Scenario: Guide users to enter figures from their Alpha pension statement
    When the "Simplified retirement journey" journey is loaded
    Then the journey should include a step titled "Add your Alpha pension details"
    And the journey should not include a step titled "Do you have an Alpha EPA?"
    And the journey should not include a step titled "Additional guaranteed income"
    And the "Add your Alpha pension details" journey step should contain these fields:
      | field                                              |
      | What year is your latest pension statement?        |
      | Yearly Alpha pension built up so far (£)            |
      | Yearly pay used to build your Alpha pension (£)     |
    And the "Add your Alpha pension details" journey step should link to Annual Benefit Statement help
    And the "Add your Alpha pension details" journey step should appear before the "Do you have any other Civil Service pensions?" journey step

  @simple-journey @alpha
  Scenario: Do not assume pensionable earnings before the member enters them
    Given default modeller settings
    Then pensionable earnings should not have a pre-filled amount

  @simple-journey @tax
  Scenario: Compare a simple spending target with take-home pension income
    Given a retirement spending target of 2000.00 per month after estimated tax
    And projected taxable pension income of 25000.00 per year before tax
    When the retirement outcome is assessed
    Then the gross pension income should exceed the spending target
    But the estimated take-home pension income should be below the spending target
    And the scenario should report a shortfall against the spending target

  @simple-journey @state-pension
  Scenario: Do not present an assumed full State Pension as confirmed
    Given default modeller settings
    When the "Simplified retirement journey" journey is loaded
    Then the journey should include a step titled "Do you know your State Pension forecast?"
    And the "Do you know your State Pension forecast?" journey step should use a yes or no question
    And the "Do you know your State Pension forecast?" journey step should link to the personalised State Pension forecast
    And the "Do you know your State Pension forecast?" journey step should appear before the "Do you have any other Civil Service pensions?" journey step
    Given an unconfirmed full State Pension assumption
    And the assumed State Pension is enough to meet the retirement target
    When the retirement outcome is assessed
    Then the retirement outcome should be labelled "Needs checking"
    And the retirement outcome should explain that the State Pension is unconfirmed

  @simple-journey @optional-sections
  Scenario: Use the retirement target to estimate Added Pension after the basic projection
    When the "Simplified retirement journey" journey is loaded
    Then the journey should include a step titled "Could Added Pension close the gap?"
    And the "Could Added Pension close the gap?" journey step should use a yes or no question

  @expert-journey
  Scenario: Separate the expert retirement target from personal details
    Given default modeller settings
    When the "Expert journey" journey is loaded
    Then the default visible journey steps should be:
      | title                              |
      | Optional sections                  |
      | Personal details                   |
      | Retirement income target           |
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
    And the "Retirement income target" journey step should contain these fields:
      | field                                          |
      | Retirement income target (£ per year)          |
      | Target retirement age                          |
      | What does your retirement income target mean?  |
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
