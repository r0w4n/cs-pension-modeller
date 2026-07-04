@alpha-pension
Feature: Alpha pension modelling

  The modeller should calculate alpha pension outcomes using predefined scheme
  rules and factor tables.

  The scenarios intentionally assert user-visible monetary results rather than
  exposing actuarial factors in the Gherkin.

  Background:
    Given alpha pension factor tables version "acceptance-v1" are loaded
    And alpha pension purchase factor tables version "acceptance-v1" are loaded
    And pension outputs are rounded to 2 decimal places


  # ---------------------------------------------------------------------------
  # Alpha accrual
  # ---------------------------------------------------------------------------

  @alpha @accrual
  Scenario Outline: Build alpha pension while active
    Given the member is in the alpha scheme
    And the member starts with accrued alpha pension of <startingAlphaPension>
    And the member has pensionable salary of <startingSalary>
    And the annual salary increase assumption is <salaryIncrease>
    And the annual CPI assumption is <cpiRate>
    And CPI revaluation is <cpiEnabled>
    When the member remains active for <activeYears> scheme years
    Then the projected unreduced alpha pension should be <expectedAlphaPension>
    And the final pensionable salary should be <expectedFinalSalary>

    Examples: Passing current alpha accrual examples
      | startingAlphaPension | startingSalary | salaryIncrease | cpiRate | cpiEnabled | activeYears | expectedAlphaPension | expectedFinalSalary |
      | 0.00                 | 60000.00       | 0.00%          | 0.00%   | off        | 3           | 4176.00              | 60000.00            |
      | 0.00                 | 60000.00       | 4.00%          | 0.00%   | off        | 3           | 4345.27              | 67491.84            |

    @pending
    Examples: Pending active revaluation expectation review
      | startingAlphaPension | startingSalary | salaryIncrease | cpiRate | cpiEnabled | activeYears | expectedAlphaPension | expectedFinalSalary |
      | 10000.00             | 50000.00       | 5.00%          | 4.00%   | on         | 2           | 13572.05             | 55125.00            |
      | 10000.00             | 50000.00       | 5.00%          | 4.00%   | off        | 2           | 12697.65             | 55125.00            |

  @alpha @accrual @breakdown
  Scenario: Show year-by-year alpha accrual breakdown
    Given the member is in the alpha scheme
    And the member starts with accrued alpha pension of 0.00
    And the member has pensionable salary of 60000.00
    And the annual salary increase assumption is 4.00%
    And the annual CPI assumption is 0.00%
    And CPI revaluation is off
    When the member remains active for 3 scheme years
    Then the alpha accrual breakdown should be:
      | schemeYear | pensionableSalary | annualAccrual | accruedAlphaPension |
      | 1          | 60000.00          | 1392.00       | 1392.00             |
      | 2          | 62400.00          | 1447.68       | 2839.68             |
      | 3          | 64896.00          | 1505.59       | 4345.27             |


  # ---------------------------------------------------------------------------
  # Salary increase
  # ---------------------------------------------------------------------------

  @alpha @salary-increase
  Scenario Outline: Salary increase affects future alpha accrual
    Given the member is in the alpha scheme
    And the member starts with pensionable salary of <startingSalary>
    And the annual salary increase assumption is <salaryIncrease>
    When the member remains active for <activeYears> scheme years
    Then the final pensionable salary should be <expectedFinalSalary>
    And the total new alpha accrual should be <expectedNewAlphaAccrual>

    Examples: Passing salary increase examples
      | startingSalary | salaryIncrease | activeYears | expectedFinalSalary | expectedNewAlphaAccrual |
      | 60000.00       | 0.00%          | 3           | 60000.00            | 4176.00                 |
      | 60000.00       | 4.00%          | 3           | 67491.84            | 4345.27                 |

    @pending
    Examples: Pending salary rounding expectation review
      | startingSalary | salaryIncrease | activeYears | expectedFinalSalary | expectedNewAlphaAccrual |
      | 70000.00       | 3.00%          | 5           | 81148.19            | 8619.86                 |


  # ---------------------------------------------------------------------------
  # CPI on/off
  # ---------------------------------------------------------------------------

  @alpha @cpi @active-revaluation @pending
  Scenario Outline: CPI can be switched on or off while active
    Given the member is in the alpha scheme
    And the member starts with accrued alpha pension of <startingAlphaPension>
    And the member has pensionable salary of <startingSalary>
    And the annual salary increase assumption is <salaryIncrease>
    And the annual CPI assumption is <cpiRate>
    And CPI revaluation is <cpiEnabled>
    When the member remains active for <activeYears> scheme years
    Then the projected unreduced alpha pension should be <expectedAlphaPension>

    Examples:
      | startingAlphaPension | startingSalary | salaryIncrease | cpiRate | cpiEnabled | activeYears | expectedAlphaPension |
      | 10000.00             | 50000.00       | 5.00%          | 4.00%   | on         | 2           | 13572.05             |
      | 10000.00             | 50000.00       | 5.00%          | 4.00%   | off        | 2           | 12697.65             |
      | 20000.00             | 70000.00       | 0.00%          | 2.00%   | on         | 5           | 33134.97             |
      | 20000.00             | 70000.00       | 0.00%          | 2.00%   | off        | 5           | 30633.41             |

  @alpha @cpi @deferred
  Scenario Outline: CPI can be switched on or off after leaving service
    Given the member is in the alpha scheme
    And the member leaves pensionable service at age <leaveAge>
    And the member draws pension at age <drawAge>
    And the member has alpha pension of <pensionAtLeaving> at leaving service
    And the annual CPI assumption is <cpiRate>
    And CPI revaluation is <cpiEnabled>
    When the deferred pension is projected to draw age
    Then the unreduced pension at draw age should be <unreducedAtDrawAge>

    Examples:
      | leaveAge | drawAge | pensionAtLeaving | cpiRate | cpiEnabled | unreducedAtDrawAge |
      | 55       | 60      | 10000.00         | 3.00%   | on         | 11592.74           |
      | 55       | 60      | 10000.00         | 3.00%   | off        | 10000.00           |

  @alpha @cpi @deferred
  Scenario: Active alpha revaluation premium is not applied after leaving service
    Given the member is in the alpha scheme
    And the member leaves pensionable service at age 55
    And the member draws pension at age 60
    And the member has alpha pension of 10000.00 at leaving service
    And the annual CPI assumption is 3.00%
    And CPI revaluation is on
    When the deferred pension is projected to draw age
    Then the unreduced pension at draw age should be 11592.74
    And the model should not apply active member revaluation after leaving service


  # ---------------------------------------------------------------------------
  # Added Pension
  # ---------------------------------------------------------------------------

  @alpha @added-pension @lump-sum @pending
  Scenario Outline: Buy Added Pension using a lump sum
    Given the member is in the alpha scheme
    And the member buys Added Pension using a lump sum of <lumpSumPayment>
    And the member is age <memberAge> on the purchase date
    And the purchase date is <purchaseDate>
    When the Added Pension purchase is calculated
    Then the purchased annual Added Pension should be <expectedAddedPension>

    Examples:
      | memberAge | purchaseDate | lumpSumPayment | expectedAddedPension |
      | 45        | 2026-04-01   | 6000.00        | 400.00               |
      | 45        | 2026-04-01   | 3000.00        | 200.00               |
      | 50        | 2026-04-01   | 7500.00        | 450.00               |

  @alpha @added-pension @monthly @pending
  Scenario Outline: Buy Added Pension using monthly contributions
    Given the member is in the alpha scheme
    And the member buys Added Pension using monthly contributions of <monthlyContribution>
    And the member pays those contributions for <monthsPaid> months
    And the member is age <memberAge> on the purchase start date
    And the purchase start date is <purchaseDate>
    When the Added Pension purchase is calculated
    Then the total Added Pension contribution should be <totalContribution>
    And the purchased annual Added Pension should be <expectedAddedPension>

    Examples:
      | memberAge | purchaseDate | monthlyContribution | monthsPaid | totalContribution | expectedAddedPension |
      | 45        | 2026-04-01   | 400.00              | 12         | 4800.00           | 300.00               |
      | 45        | 2026-04-01   | 250.00              | 6          | 1500.00           | 93.75                |
      | 50        | 2026-04-01   | 100.00              | 12         | 1200.00           | 72.00                |

  @alpha @added-pension
  Scenario: Added Pension is included in pension payable at normal pension age
    Given the member is in the alpha scheme
    And the member has unreduced alpha pension of 12000.00
    And the member has purchased annual Added Pension of 400.00
    When the member draws pension at normal pension age
    Then the annual pension breakdown should be:
      | component    | annualAmount |
      | alpha        | 12000.00     |
      | addedPension | 400.00       |
      | total        | 12400.00     |

  @alpha @added-pension @early-retirement
  Scenario: Added Pension is reduced when drawn early
    Given the member is in the alpha scheme
    And the member has alpha normal pension age 67
    And the member has unreduced alpha pension of 12000.00
    And the member has purchased annual Added Pension of 400.00
    When the member draws pension at age 60 and 0 months
    Then the reduced annual pension breakdown should be:
      | component    | unreducedAnnualAmount | payableAnnualAmount | annualReduction |
      | alpha        | 12000.00              | 8244.00             | 3756.00         |
      | addedPension | 400.00                | 274.80              | 125.20          |
      | total        | 12400.00              | 8518.80             | 3881.20         |


  # ---------------------------------------------------------------------------
  # Early retirement
  # ---------------------------------------------------------------------------

  @alpha @early-retirement
  Scenario Outline: Reduce alpha pension when drawn before normal pension age
    Given the member is in the alpha scheme
    And the member has date of birth <dateOfBirth>
    And the member has alpha normal pension age <normalPensionAge>
    And the member has unreduced alpha pension of <unreducedAlphaPension>
    When the member draws alpha pension at age <drawAge> and <drawAgeMonths> months
    Then the annual alpha pension payable should be <expectedAnnualPension>
    And the annual reduction should be <expectedAnnualReduction>

    Examples:
      | dateOfBirth | normalPensionAge | unreducedAlphaPension | drawAge | drawAgeMonths | expectedAnnualPension | expectedAnnualReduction |
      | 1977-05-01  | 67               | 15000.00              | 67      | 0             | 15000.00              | 0.00                    |
      | 1977-05-01  | 67               | 15000.00              | 65      | 0             | 13380.00              | 1620.00                 |
      | 1977-05-01  | 67               | 15000.00              | 60      | 0             | 10305.00              | 4695.00                 |
      | 1977-05-01  | 67               | 10000.00              | 60      | 0             | 6870.00               | 3130.00                 |

  @alpha @early-retirement
  Scenario: Early retirement reduction is permanent
    Given the member is in the alpha scheme
    And the member has alpha normal pension age 67
    And the member has unreduced alpha pension of 15000.00
    When the member draws alpha pension at age 60 and 0 months
    Then the annual alpha pension payable at age 60 should be 10305.00
    And the annual alpha pension payable at age 67 before CPI increases should still be 10305.00
    And the model should not remove the early retirement reduction at normal pension age


  # ---------------------------------------------------------------------------
  # EPA
  # ---------------------------------------------------------------------------

  @alpha @epa @validation
  Scenario Outline: Validate EPA option against alpha normal pension age
    Given the member is in the alpha scheme
    And the member has alpha normal pension age <normalPensionAge>
    When the member selects EPA option <epaOption>
    Then the EPA option should be <validationResult>
    And the EPA payable age should be <expectedEpaPayableAge>

    Examples:
      | normalPensionAge | epaOption | validationResult | expectedEpaPayableAge |
      | 67               | NPA-1     | valid            | 66                    |
      | 67               | NPA-2     | valid            | 65                    |
      | 67               | NPA-3     | invalid          |                       |
      | 66               | NPA-1     | valid            | 65                    |
      | 66               | NPA-2     | invalid          |                       |
      | 65               | NPA-1     | invalid          |                       |

  @alpha @epa
  Scenario: Draw at EPA age with standard alpha reduced and EPA portion unreduced
    Given the member is in the alpha scheme
    And the member has alpha normal pension age 67
    And the member has standard alpha pension of 10000.00
    And the member has EPA alpha pension of 1200.00
    And the member has selected EPA option NPA-2
    When the member draws all alpha pension at age 65 and 0 months
    Then the annual pension breakdown should be:
      | component     | unreducedAnnualAmount | payableAnnualAmount | annualReduction |
      | standardAlpha | 10000.00              | 8920.00             | 1080.00         |
      | epaAlpha      | 1200.00               | 1200.00             | 0.00            |
      | total         | 11200.00              | 10120.00            | 1080.00         |

  @alpha @epa @early-retirement
  Scenario: Draw before EPA age and reduce both standard and EPA portions
    Given the member is in the alpha scheme
    And the member has alpha normal pension age 67
    And the member has standard alpha pension of 10000.00
    And the member has EPA alpha pension of 1200.00
    And the member has selected EPA option NPA-2
    When the member draws all alpha pension at age 64 and 0 months
    Then the annual pension breakdown should be:
      | component     | unreducedAnnualAmount | payableAnnualAmount | annualReduction |
      | standardAlpha | 10000.00              | 8440.00             | 1560.00         |
      | epaAlpha      | 1200.00               | 1137.60             | 62.40           |
      | total         | 11200.00              | 9577.60             | 1622.40         |


  # ---------------------------------------------------------------------------
  # Minimum pension age validation
  # ---------------------------------------------------------------------------

  @validation @minimum-pension-age
  Scenario Outline: Validate requested draw age against minimum pension age
    Given the member is in the alpha scheme
    And the member was born on <dateOfBirth>
    And the member requests to draw pension on <drawDate>
    And the applicable minimum pension age is <minimumPensionAge>
    When the draw age is validated
    Then the member's age at draw date should be <ageAtDrawDate>
    And the draw request should be <validationResult>

    Examples:
      | dateOfBirth | drawDate   | minimumPensionAge | ageAtDrawDate | validationResult |
      | 1977-05-01  | 2037-05-01 | 57                | 60            | valid            |
      | 1977-05-01  | 2034-05-01 | 57                | 57            | valid            |
      | 1977-05-01  | 2033-05-01 | 57                | 56            | invalid          |

  @validation @minimum-pension-age @pending
  Scenario: Explain invalid draw age to the user
    Given the member is in the alpha scheme
    And the member was born on 1977-05-01
    And the member requests to draw pension on 2033-05-01
    And the applicable minimum pension age is 57
    When the draw age is validated
    Then the model should show the validation message:
      """
      You cannot draw this pension at age 56. The minimum pension age for this projection is 57.
      """

  # ---------------------------------------------------------------------------
  # End-to-end projection
  # ---------------------------------------------------------------------------

  @end-to-end @alpha @added-pension @early-retirement @cpi @pending
  Scenario: Active alpha member buys Added Pension and retires early
    Given the member is in the alpha scheme
    And the member has date of birth 1977-05-01
    And the member has alpha normal pension age 67
    And the member starts with accrued alpha pension of 16178.00
    And the member has pensionable salary of 70000.00
    And the annual salary increase assumption is 0.00%
    And the annual CPI assumption is 2.00%
    And CPI revaluation is on
    And the member buys Added Pension using monthly contributions of 400.00
    And the member pays those contributions for 12 months
    And the member remains active for 5 scheme years
    When the member draws all alpha pension at age 60 and 0 months
    Then the unreduced standard alpha pension at draw age should be 27923.03
    And the purchased annual Added Pension should be 300.00
    And the combined unreduced annual pension should be 28223.03
    And the reduced annual pension breakdown should be:
      | component     | unreducedAnnualAmount | payableAnnualAmount | annualReduction |
      | standardAlpha | 27923.03              | 20663.04            | 7259.99         |
      | addedPension  | 300.00                | 222.00              | 78.00           |
      | total         | 28223.03              | 20885.04            | 7337.99         |


  # ---------------------------------------------------------------------------
  # Result presentation and explainability
  # ---------------------------------------------------------------------------

  @display @explainability @pending
  Scenario: Show calculation assumptions used in the result
    Given the member has completed an alpha pension projection
    When the pension result is displayed
    Then the result should show:
      | assumption                |
      | scheme                    |
      | current accrued pension    |
      | pensionable salary         |
      | salary increase assumption |
      | CPI assumption             |
      | CPI revaluation on or off  |
      | normal pension age         |
      | draw age                   |
      | added pension contribution |
      | EPA option                 |

  @display @explainability @pending
  Scenario: Show pension components separately before showing total
    Given the member has standard alpha pension
    And the member has Added Pension
    And the member has EPA pension
    When the pension result is displayed
    Then the result should show separate rows for:
      | component       |
      | standardAlpha   |
      | addedPension    |
      | epaAlpha        |
      | total           |
    And each row should show unreduced annual pension
    And each row should show payable annual pension
    And each row should show annual reduction where applicable
