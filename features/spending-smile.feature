Feature: Expert Spending Smile retirement strategy

  As an expert retirement modeller user
  I want different spending targets across retirement phases
  So that the projection reflects the lifestyle I want to model

  Background:
    Given a Spending Smile plan with retirement at age 60 and a £40000 flat target

  Scenario Outline: The applicable phase target changes at each boundary
    When the Spending Smile target is resolved at age <age>
    Then the spending phase is "<phase>"
    And the real annual spending target is £<target>

    Examples:
      | age | phase   | target |
      | 60  | GO_GO   | 40000  |
      | 74  | GO_GO   | 40000  |
      | 75  | SLOW_GO | 34000  |
      | 84  | SLOW_GO | 34000  |
      | 85  | NO_GO   | 30000  |

  Scenario: Percentage editing keeps annual amounts canonical
    Given Spending Smile percentage input is selected
    When the Go-go target changes to £50000
    Then the Slow-go annual target is £42500
    And the No-go annual target is £37500
    And the stored Slow-go percentage is 85%
    And the stored No-go percentage is 75%

  Scenario: An annual target updates its displayed percentage
    When the Slow-go annual target changes to £30000
    Then the Slow-go annual target is £30000
    And the stored Slow-go percentage is 75%

  Scenario Outline: Current one-person Retirement Living Standards can initialise a phase
    When the user applies the "<standard>" one-person RLS target to "<phase>"
    Then the selected phase annual target is £<amount>
    And the selected phase source is "<source>"

    Examples:
      | standard    | phase   | amount | source          |
      | Minimum     | noGo    | 13900  | RLS_MINIMUM     |
      | Moderate    | slowGo  | 32700  | RLS_MODERATE    |
      | Comfortable | goGo    | 45400  | RLS_COMFORTABLE |

  Scenario Outline: A phase target is classified against real RLS expenditure
    When an annual target of £<target> is classified for one person
    Then its RLS classification is "<classification>"

    Examples:
      | target | classification          |
      | 12000  | BELOW_MINIMUM           |
      | 20000  | MINIMUM_TO_MODERATE     |
      | 40000  | MODERATE_TO_COMFORTABLE |
      | 50000  | COMFORTABLE_OR_ABOVE    |

  Scenario: Invalid phase ordering is rejected by validation
    When the No-go phase is configured to start at age 74
    Then validation reports "No-go years must start after the Slow-go years."

  Scenario: A phase after life expectancy is not reached
    Given life expectancy is 82
    When Spending Smile phase outcomes are calculated
    Then the No-go phase result is "NOT_REACHED"
    And the No-go phase contributes £0 to target expenditure

  Scenario: Flat spending remains unchanged
    Given the Spending Smile strategy is not active
    When the Spending Smile target is resolved at age 85
    Then the spending phase is "FLAT"
    And the real annual spending target is £40000
