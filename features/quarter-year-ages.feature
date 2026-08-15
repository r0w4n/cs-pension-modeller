@quarter-year-ages
Feature: Quarter-year modelling ages

  Numeric ages should use one clear planning precision throughout the modeller.
  The nearest quarter-year value is both the displayed value and the value used
  by calculations. Exact calendar dates and monthly projection rows keep their
  own resolution.

  Rule: Numeric modelling ages use the nearest quarter year

    Scenario Outline: Round numeric age inputs consistently
      When the "<ageSetting>" numeric age is entered as <enteredAge>
      Then the model should use age <modelledAge>

      Examples:
        | ageSetting                  | enteredAge        | modelledAge |
        | target retirement age      | 67.16666666666667 | 67.25       |
        | life expectancy            | 89.9             | 90          |
        | Alpha pension draw age     | 63.1             | 63          |
        | SIPP withdrawal target age | 79.9             | 80          |

    Scenario Outline: Validate manually entered numeric ages
      When the manual numeric age <enteredAge> is checked
      Then the manual age should be <validity>

      Examples:
        | enteredAge | validity |
        | 67         | accepted |
        | 67.25      | accepted |
        | 67.5       | accepted |
        | 67.75      | accepted |
        | 67.2       | rejected |

    @settings-storage
    Scenario: Migrate saved top-level and nested ages to quarter years
      Given a version 14 saved plan contains unrounded top-level and nested ages
      When the saved plan is migrated to the current settings schema
      Then the migrated ages should be:
        | age                         | modelledAge |
        | target retirement age       | 67.25       |
        | life expectancy             | 90          |
        | slow-go start age           | 75          |
        | no-go start age             | 84.5        |
        | additional income start age | 62.25       |
        | additional income end age   | 70.5        |

  Rule: Exact dates keep their calendar precision

    Scenario: Keep the State Pension date when its related numeric age is rounded
      When pension ages and dates are derived for someone born on 1960-04-06
      Then the numeric Alpha Normal Pension Age should be 66
      And the State Pension date should remain 2026-05-06

  Rule: Expert retirement defaults follow Alpha Normal Pension Age

    Scenario Outline: Re-link untouched expert defaults after date of birth changes
      Given an expert plan with untouched retirement age defaults
      When the expert date of birth changes to <dateOfBirth>
      Then the expert default ages should be:
        | normalPensionAge   | targetRetirementAge   | alphaSchemeLeaveAge   | alphaPensionDrawAge   | statePensionStartAge   | sippDrawStartAge   |
        | <normalPensionAge> | <targetRetirementAge> | <alphaSchemeLeaveAge> | <alphaPensionDrawAge> | <statePensionStartAge> | <sippDrawStartAge> |

      Examples:
        | dateOfBirth | normalPensionAge | targetRetirementAge | alphaSchemeLeaveAge | alphaPensionDrawAge | statePensionStartAge | sippDrawStartAge |
        | 1977-06-01  | 67.25            | 67.25               | 67.25               | 67.25               | 67.25                | 67.25            |
        | 1960-04-06  | 66               | 66                  | 66                  | 66                  | 66.25                | 66               |
