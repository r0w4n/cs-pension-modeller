Feature: Configure a retirement spending strategy

  Background:
    Given the user is configuring their retirement income target
    And the Retirement Living Standards target control is displayed

  Scenario: Retirement Living Standards target is shown before spending strategy
    Then the Retirement Living Standards target should be displayed first
    And the spending strategy dropdown should be displayed beneath it

  Scenario: Flat spending is selected
    Given the user has selected a Retirement Living Standards target of £30000
    When the user selects "Flat spending"
    Then the Go-Go, Slow-Go, No-Go configuration fields should not be displayed
    And the spending target should remain at 100 percent of the selected target

  Scenario: Go-Go, Slow-Go, No-Go spending is selected
    Given the user has selected a Retirement Living Standards target of £30000
    When the user selects "Go-Go, Slow-Go, No-Go"
    Then the Go-Go, Slow-Go, No-Go configuration fields should be displayed
    And the stored phased-spending configuration should contain percentages and phase ages

  Scenario: Separate monetary phase targets are not requested
    When the user selects "Go-Go, Slow-Go, No-Go"
    Then the stored phased-spending configuration should not contain monetary phase targets
    And all phase targets should be calculated from the selected Retirement Living Standards target

  Scenario Outline: Each phased-spending target is calculated from the selected target
    Given the user has selected a Retirement Living Standards target of £30000
    And the user selected "Go-Go, Slow-Go, No-Go"
    And the "<phase>" percentage is <percentage> percent
    When the spending target is calculated at age <age>
    Then the spending phase should be "<resolvedPhase>"
    And the spending target should be £<target> per year

    Examples:
      | phase   | percentage | age | resolvedPhase | target |
      | Go-go   | 100        | 60  | GO_GO        | 30000  |
      | Slow-go | 85         | 75  | SLOW_GO      | 25500  |
      | No-go   | 70         | 85  | NO_GO        | 21000  |

  Scenario: Go-go phase starts at retirement
    Given the user's retirement age is 60
    And the slow-go start age is 70
    When the spending target is calculated at age 69
    Then the spending phase should be "GO_GO"
    When the spending target is calculated at age 70
    Then the spending phase should be "SLOW_GO"

  Scenario: Slow-go phase ends when no-go begins
    Given the slow-go start age is 70
    And the no-go start age is 80
    When the spending target is calculated at age 79
    Then the spending phase should be "SLOW_GO"
    When the spending target is calculated at age 80
    Then the spending phase should be "NO_GO"

  Scenario: Slow-go age is kept after retirement
    Given the user's retirement age is 60
    When the slow-go start age is set to 60
    Then the slow-go start age should be 61
    And validation should not report a phased-spending age error

  Scenario: No-go age is kept after slow-go age
    Given the slow-go start age is 70
    When the no-go start age is set to 69
    Then the no-go start age should be 71
    And validation should not report a phased-spending age error

  Scenario: No-go age follows a reduced life expectancy
    Given the no-go start age is 85
    When the modelled life expectancy is changed to 80
    Then the no-go start age should be 80
    And validation should not report a no-go life expectancy error

  Scenario Outline: Phase percentages must be greater than zero
    When the "<phase>" percentage is set to 0 percent
    Then validation reports "<message>"

    Examples:
      | phase   | message                                      |
      | Go-go   | Go-go percentage must be greater than 0%.   |
      | Slow-go | Slow-go percentage must be greater than 0%. |
      | No-go   | No-go percentage must be greater than 0%.   |

  Scenario Outline: Phase percentages must be whole numbers
    When the "<phase>" percentage is set to 82.5 percent
    Then validation reports "<message>"

    Examples:
      | phase   | message                                      |
      | Go-go   | Go-go percentage must be a whole number.   |
      | Slow-go | Slow-go percentage must be a whole number. |
      | No-go   | No-go percentage must be a whole number.   |

  Scenario: Phased-spending fields do not affect flat spending
    Given the user previously configured a Go-Go, Slow-Go, No-Go strategy
    When the user selects "Flat spending"
    Then the Go-Go, Slow-Go, No-Go configuration fields should not be displayed
    And the spending target should remain at 100 percent of the selected target

  Scenario: Switching back to Go-Go, Slow-Go, No-Go restores the configuration
    Given the user previously configured a Go-Go, Slow-Go, No-Go strategy
    And the user selected "Flat spending"
    When the user selects "Go-Go, Slow-Go, No-Go"
    Then the previously configured phase percentages and ages should be restored

  Scenario: A results-chart phase drag changes only that spending phase
    Given the user previously configured a Go-Go, Slow-Go, No-Go strategy
    When the "Slow-go" results-chart phase is changed to 78 percent
    Then the "Slow-go" percentage should be 78 percent
    And the "Go-go" percentage should be 110 percent
    And the "No-go" percentage should be 68 percent

  Scenario: A results-chart boundary drag changes only that phase start age
    Given the user's retirement age is 60
    And the slow-go start age is 70
    And the no-go start age is 80
    When the "Slow-go" results-chart start age is changed to 74
    Then the slow-go start age should be 74
    And the no-go start age should be 80
