@modeller-journeys
Feature: Modeller journeys

  The modeller should offer guided journeys that expose the right level of
  detail while presenting results appropriate to each journey.

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
    And the journey should <comparisonExpectation>

    Examples:
      | journey                              | targetStep                        | planningStep                | resultExpectation            | bridgeFundingExpectation               | comparisonExpectation       |
      | Simplified retirement journey        | What would you like to spend each month? | Do you have any other Civil Service pensions? | use shared results components | hide bridge funding details by default | hide the comparison section |
      | Work out what I need to retire early | What would you like to spend each month? | Your bridging money         | show the projection table    | show bridge funding details by default | show the comparison section |

  @simple-journey
  Scenario: Start the simplified journey with personal details
    When the "Simplified retirement journey" journey is loaded
    Then the first journey step should be titled "A little about you"
    And the journey should not include a step titled "Alpha pension: the basics"
    And the journey should include a step titled "What would you like to spend each month?"
    And the "What would you like to spend each month?" journey step should contain these fields:
      | field                                                              |
      | How much would you like available to spend each month after tax?   |
      | Which UK tax rules should we use?                                  |
    And the "What would you like to spend each month?" journey step should link to the Retirement Living Standards
    And the "What would you like to spend each month?" journey step should place its support link beside the field

  @simple-journey @results
  Scenario: Use results designed for the simplified journey
    When the "Simplified retirement journey" journey is loaded
    Then the journey result should use the simple results presentation

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

  @results @withdrawal-strategy
  Scenario: Assess the configured withdrawals rather than a hypothetical bridge
    Given a retirement plan with sufficient ISA savings but zero configured withdrawals
    When the retirement outcome is assessed
    Then the retirement outcome should be labelled "Shortfall"
    And the plan status should be "Needs attention"
    And the first projected annual shortfall should be 6000.00

  @simple-journey @state-pension
  Scenario: Keep an otherwise resilient result on track when State Pension is unconfirmed
    Given an unconfirmed full State Pension assumption
    And other retirement income is enough to meet the target without State Pension
    When the retirement outcome is assessed
    Then the retirement outcome should be labelled "Looks workable"
    And the retirement outcome should explain that the State Pension is unconfirmed
    And the retirement outcome should explain that the target remains met without State Pension
    But the retirement outcome should not mention unused bridge withdrawals

  @simple-journey @optional-sections
  Scenario: Keep Added Pension out of the simplified journey
    When the "Simplified retirement journey" journey is loaded
    Then the journey should not include a step titled "Could Added Pension close the gap?"

  @simple-journey @optional-sections
  Scenario: Ask for statement amounts for older Civil Service pensions
    When the "Simplified retirement journey" journey is loaded
    Then the "Copy your classic pension amounts" journey step should contain these fields:
      | field                                                   |
      | Yearly classic pension shown on your statement (£)      |
      | One-off classic payment shown on your statement (£)     |
      | How old would you like to be when this pension starts?  |
      | Allow for this pension rising with prices?              |

  @bridge-journey @optional-sections
  Scenario: Choose which flexible pots and other income are available for an early-retirement bridge
    Given default modeller settings
    When the "Work out what I need to retire early" journey is loaded
    Then the bridge pot choices should explain:
      | choice                   |
      | ISA                      |
      | Lifetime ISA (LISA)      |
      | SIPP or personal pension |
      | Civil Service AVC        |
      | Other guaranteed income  |
    And the "Your ISA" journey step should include the field "ISA withdrawal rate (%)"
    And the "Your ISA" journey step should include the field "ISA use-by age"
    When ISA is excluded from the bridge plan
    Then the "Your ISA" journey step should not be visible

  @bridge-journey
  Scenario: Start with the simple questions and review a bridge plan before calculation
    Given default modeller settings
    When the "Work out what I need to retire early" journey is loaded
    Then the default visible journey steps should start with:
      | title                                         |
      | Your personal details                         |
      | What would you like to spend each month?      |
      | What age would you like to retire?            |
      | Your Civil Service pensions                   |
    And the "What would you like to spend each month?" journey step should use the simple target-income presentation
    And the "What would you like to spend each month?" journey step should link to the Retirement Living Standards
    And the "What would you like to spend each month?" journey step should place its support link beside the field
    And the "State Pension" journey step should appear before the "Your bridging money" journey step
    And the "Your bridging money" journey step should appear before the "How should your bridging money be used?" journey step
    And the "How should your bridging money be used?" journey step should appear before the "Your ISA" journey step
    And the bridge withdrawal-plan step should expose spending and pot-withdrawal strategies
    And the "Check your plan" journey step should appear before the "Your results" journey step

  @bridge-journey @optional-sections
  Scenario: Keep other guaranteed income out until it is selected
    Given default modeller settings
    When the "Work out what I need to retire early" journey is loaded
    Then the "Additional guaranteed income" journey step should not be visible
    When other guaranteed income is included in the bridge plan
    Then the "Additional guaranteed income" journey step should be visible

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
      | State Pension details              |
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
      | field                   |
      | After-tax income target |
      | Target retirement age   |
    And the expert retirement income target should be an after-tax spending target
    And the expert retirement income target should offer these quick-select amounts:
      | amount |
      | 11250  |
      | 13900  |
      | 22700  |
      | 31350  |
      | 32700  |
      | 45400  |
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

  @expert-journey @two-person @retirement-living-standards
  Scenario: Keep two-person household spending quick-selects distinct from one-person amounts
    Then the two-person Retirement Living Standards quick-selects should be:
      | amount |
      | 22500  |
      | 45400  |
      | 62700  |

  @expert-journey @two-person @household-timing
  Scenario: Treat retirement in the same calendar month as simultaneous
    Given default modeller settings
    And two people retire in the same calendar month
    Then the household should not require a transition target
    And the household target should start when both people retire

  @defaults
  Scenario: Bridge journey enables bridge pots and Income Tax by default
    Given default modeller settings
    When bridge journey defaults are applied
    Then State Pension, ISA, LISA and SIPP should be included
    And Income Tax modelling should be on
    And ISA, LISA and SIPP withdrawals should use the use-by-age strategy

  @settings-storage
  Scenario: Keep journey settings separate while supporting older parameter files
    Given each journey has a different retirement age
    When the journey settings are exported and parsed
    Then each journey should retain its own retirement age
    When a legacy flat parameter file with retirement age 64 is parsed
    Then all three journeys should use the legacy retirement age 64

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

  @results-chart @chart-title
  Scenario: Describe the chart as the whole retirement income projection
    When retirement income chart titles are prepared
    Then the standard results chart title should be "Retirement income over time"
    And the simple results chart title should be "How your retirement income may change"
