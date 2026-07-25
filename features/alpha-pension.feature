@alpha-pension
Feature: Alpha pension modelling

  The modeller estimates Alpha outcomes from the member's circumstances and
  published scheme rules. Factor examples use the current GAD consolidated
  workbook, and important decisions should be checked against an official
  pension statement or quotation.

  Rule: Normal Pension Age is linked to State Pension age

  @alpha @normal-pension-age
  Scenario Outline: Derive Alpha Normal Pension Age from date of birth
    Given the member was born on <dateOfBirth>
    When the Alpha Normal Pension Age is determined
    Then the Alpha Normal Pension Age should be <years> years and <months> months

    Examples:
      | dateOfBirth | years | months |
      | 1954-09-06  | 66    | 0      |
      | 1960-04-06  | 66    | 1      |
      | 1977-04-06  | 67    | 1      |
      | 1978-04-06  | 68    | 0      |

  Rule: Active members build career-average pension

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

    Examples: Active revaluation examples
      | startingAlphaPension | startingSalary | salaryIncrease | cpiRate | cpiEnabled | activeYears | expectedAlphaPension | expectedFinalSalary |
      | 10000.00             | 50000.00       | 5.00%          | 4.00%   | on         | 2           | 12824.40             | 55125.00            |
      | 10000.00             | 50000.00       | 5.00%          | 4.00%   | off        | 2           | 12378.00             | 55125.00            |

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

    Examples: Salary growth over five years
      | startingSalary | salaryIncrease | activeYears | expectedFinalSalary | expectedNewAlphaAccrual |
      | 70000.00       | 3.00%          | 5           | 81149.19            | 8622.04                 |


  @alpha @accrual @part-time
  Scenario: Accrue pension from actual part-time pensionable earnings
    Given the member has actual pensionable earnings of 21000.00
    When one year of Alpha pension is accrued
    Then the new annual Alpha pension should be 487.20

  @alpha @accrual @statement
  Scenario: Include accrual since the last Annual Benefit Statement
    Given the last statement recorded Alpha pension of 10000.00 on 2026-04-01
    And the member has actual pensionable earnings of 42000.00
    When the starting Alpha pension is calculated on 2026-10-01
    Then the starting Alpha pension should be 10487.20

  Rule: Alpha pension is adjusted for prices

  @alpha @cpi @active-revaluation
  Scenario Outline: Compare nominal and real-terms active projections
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
      | 10000.00             | 50000.00       | 5.00%          | 4.00%   | on         | 2           | 12824.40             |
      | 10000.00             | 50000.00       | 5.00%          | 4.00%   | off        | 2           | 12378.00             |
      | 20000.00             | 70000.00       | 0.00%          | 2.00%   | on         | 5           | 30100.00             |
      | 20000.00             | 70000.00       | 0.00%          | 2.00%   | off        | 5           | 28120.00             |

  @alpha @cpi @deferred
  Scenario Outline: Compare nominal and real-terms deferred projections
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
  Scenario: Deferred alpha pension continues to use CPI after leaving service
    Given the member is in the alpha scheme
    And the member leaves pensionable service at age 55
    And the member draws pension at age 60
    And the member has alpha pension of 10000.00 at leaving service
    And the annual CPI assumption is 3.00%
    And CPI revaluation is on
    When the deferred pension is projected to draw age
    Then the unreduced pension at draw age should be 11592.74
    And the model should apply CPI revaluation after leaving service


  @alpha @cpi
  Scenario Outline: Apply positive or negative annual price adjustment
    Given annual Alpha pension of 10000.00
    When an annual price adjustment of <adjustment> is applied
    Then the adjusted annual Alpha pension should be <adjustedPension>

    Examples:
      | adjustment | adjustedPension |
      | 2.00%      | 10200.00        |
      | -1.00%     | 9900.00         |

  @alpha @cpi @in-payment
  Scenario: Continue price adjustment after Alpha pension starts
    Given annual Alpha pension in payment of 10000.00
    When an annual price adjustment of 2.00% is applied
    Then the adjusted annual Alpha pension should be 10200.00

  Rule: Leaving service changes how Alpha benefits are held

  @alpha @leaving-service
  Scenario Outline: Determine whether benefits are preserved on leaving
    Given the member has <qualifyingService> years of qualifying service
    When the member leaves Alpha pensionable service
    Then the leaving-service outcome should be <outcome>

    Examples:
      | qualifyingService | outcome            |
      | 1.99              | refund_or_transfer |
      | 2.00              | preserved          |

  Rule: Added Pension is a separately purchased Alpha benefit

  @alpha @added-pension @lump-sum
  Scenario Outline: Buy Added Pension using a lump sum
    Given the member is in the alpha scheme
    And the member buys Added Pension using a lump sum of <lumpSumPayment>
    And the member is age <memberAge> on the purchase date
    And the purchase date is <purchaseDate>
    When the Added Pension purchase is calculated
    Then the purchased annual Added Pension should be <expectedAddedPension>

    Examples:
      | memberAge | purchaseDate | lumpSumPayment | expectedAddedPension |
      | 45        | 2026-04-01   | 6000.00        | 490.00               |
      | 45        | 2026-04-01   | 3000.00        | 245.00               |
      | 50        | 2026-04-01   | 7500.00        | 548.89               |

  @alpha @added-pension @monthly
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
      | 45        | 2026-04-01   | 400.00              | 12         | 4800.00           | 384.55               |
      | 45        | 2026-04-01   | 250.00              | 6          | 1500.00           | 120.17               |
      | 50        | 2026-04-01   | 100.00              | 12         | 1200.00           | 86.06                |

  @alpha @added-pension @dependants
  Scenario Outline: Use the factor for the selected Added Pension benefits
    Given the member selects Added Pension benefits for <benefits>
    When the lump-sum Added Pension factor is selected for age 45 and NPA 68
    Then the Added Pension purchase factor should be <factor>

    Examples:
      | benefits            | factor |
      | self_only           | 7.75   |
      | self_and_dependants | 8.56   |

  @alpha @added-pension @interpolation
  Scenario: Interpolate Added Pension factors for a non-integer NPA
    Given the member selects Added Pension benefits for self_only
    When the lump-sum Added Pension factor is selected for age 45 and NPA 67 years 6 months
    Then the Added Pension purchase factor should be 8.015

  @alpha @added-pension @leaving-service
  Scenario: Stop regular Added Pension purchases after pensionable service ends
    Given the member buys Added Pension using monthly contributions of 100.00
    When the contribution is projected on 2047-06-16 after stopping on 2047-06-15
    Then the new annual Added Pension should be 0.00

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
      | alpha        | 12000.00              | 8400.00             | 3600.00         |
      | addedPension | 400.00                | 280.00              | 120.00          |
      | total        | 12400.00              | 8680.00             | 3720.00         |


  Rule: Early payment permanently reduces Alpha pension

  @alpha @early-retirement
  Scenario Outline: Reduce alpha pension when drawn before normal pension age
    Given the member is in the alpha scheme
    And the member has alpha normal pension age <normalPensionAge>
    And the member has unreduced alpha pension of <unreducedAlphaPension>
    When the member draws alpha pension at age <drawAge> and <drawAgeMonths> months
    Then the annual alpha pension payable should be <expectedAnnualPension>
    And the annual reduction should be <expectedAnnualReduction>

    Examples:
      | normalPensionAge | unreducedAlphaPension | drawAge | drawAgeMonths | expectedAnnualPension | expectedAnnualReduction |
      | 67               | 15000.00              | 67      | 0             | 15000.00              | 0.00                    |
      | 65               | 10000.00              | 55      | 0             | 6320.00               | 3680.00                 |
      | 67               | 15000.00              | 65      | 0             | 13455.00              | 1545.00                 |
      | 67               | 15000.00              | 60      | 0             | 10500.00              | 4500.00                 |
      | 68               | 10000.00              | 60      | 6             | 6770.00               | 3230.00                 |

  @alpha @early-retirement
  Scenario: Early retirement reduction is permanent
    Given the member is in the alpha scheme
    And the member has alpha normal pension age 67
    And the member has unreduced alpha pension of 15000.00
    When the member draws alpha pension at age 60 and 0 months
    Then the annual alpha pension payable at age 60 should be 10500.00
    And the annual alpha pension payable at age 67 before CPI increases should still be 10500.00
    And the model should not remove the early retirement reduction at normal pension age

  Rule: Late payment increases Alpha pension using the member's status

  @alpha @late-retirement
  Scenario Outline: Apply the appropriate late-retirement factor
    Given the member has an Alpha opening balance of 10000.00 at NPA 67
    And the member retires late from <status> status
    When the member claims Alpha pension at age 68 and 0 months
    Then the late-retirement multiplier should be <multiplier>
    And the annual Alpha opening balance with late increase should be <annualPension>

    Examples:
      | status   | multiplier | annualPension |
      | active   | 1.060800   | 10608.00      |
      | deferred | 1.055957   | 10559.57      |

  Rule: EPA creates a separate Alpha tranche with an earlier payable age

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
      | standardAlpha | 10000.00              | 8970.00             | 1030.00         |
      | epaAlpha      | 1200.00               | 1200.00             | 0.00            |
      | total         | 11200.00              | 10170.00            | 1030.00         |

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
      | standardAlpha | 10000.00              | 8510.00             | 1490.00         |
      | epaAlpha      | 1200.00               | 1140.00             | 60.00           |
      | total         | 11200.00              | 9650.00             | 1550.00         |

  @alpha @epa @accrual
  Scenario: Route accrual to EPA while an EPA agreement is active
    Given EPA accrual is active from 2026-04-01 to 2027-03-31
    And the member has actual pensionable earnings of 42000.00
    When Alpha accrual is calculated for 2026-06-01
    Then monthly standard Alpha accrual should be 0.00
    And monthly EPA Alpha accrual should be 81.20

  @alpha @epa @normal-pension-age
  Scenario: Move the EPA date when State Pension age changes Normal Pension Age
    Given the member was born on 1977-04-06
    And the member has selected EPA option NPA-2
    When the EPA payable date is determined
    Then the EPA payable date should be 2042-05-06

  Rule: Members may exchange Alpha pension for a retirement lump sum

  @alpha @commutation
  Scenario Outline: Exchange annual Alpha pension at twelve pounds of lump sum per pound
    Given annual Alpha pension before commutation of 12000.00
    And annual Alpha pension exchanged of <exchangedPension>
    When Alpha commutation is calculated
    Then annual Alpha pension after commutation should be <remainingPension>
    And the Alpha retirement lump sum should be <retirementLumpSum>

    Examples:
      | exchangedPension | remainingPension | retirementLumpSum |
      | 0.00             | 12000.00         | 0.00              |
      | 1000.00          | 11000.00         | 12000.00          |

  Rule: Eligible members may take some Alpha pension and continue working

  @alpha @partial-retirement
  Scenario Outline: Check the minimum pay reduction for partial retirement
    Given the member has accrued Alpha pension of 12000.00
    And the member chooses to take 50.00% of it
    And their pensionable earnings reduce by <payReduction>
    And they have reached minimum pension age
    And their employer agrees to partial retirement
    When Alpha partial retirement is calculated
    Then partial retirement should be <eligibility>
    And annual Alpha pension released should be <releasedPension>
    And annual Alpha pension remaining should be <remainingPension>

    Examples:
      | payReduction | eligibility | releasedPension | remainingPension |
      | 20.00%       | eligible    | 6000.00         | 6000.00          |
      | 19.00%       | ineligible  | 0.00            | 12000.00         |

  @alpha @partial-retirement @accrual
  Scenario: Continue building Alpha pension after partial retirement
    Given the member has actual pensionable earnings of 42000.00
    And the member works at 80.00% of their previous hours after partial retirement
    When one year of Alpha pension is accrued
    Then the new annual Alpha pension should be 779.52

  Rule: Minimum pension access age is date dependent

  @minimum-claim-age
  Scenario Outline: Determine minimum claim age from date of birth
    Given the member's date of birth is <date_of_birth>
    When the minimum claim age is determined
    Then the minimum claim age is <minimum_claim_age>

    Examples:
      | date_of_birth | minimum_claim_age |
      | 1970-04-05    | 55                |
      | 1971-04-05    | 55                |
      | 1972-04-05    | 55                |
      | 1973-04-05    | 55                |
      | 1973-04-06    | 57                |
      | 1974-01-01    | 57                |
      | 1980-01-01    | 57                |

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

  @validation @minimum-pension-age
  Scenario: Explain invalid draw age to the user
    Given the member is in the alpha scheme
    And the member was born on 1977-05-01
    And the member requests to draw pension on 2033-05-01
    And the applicable minimum pension age is 57
    When the draw age is validated
    Then the model should show the validation message:
      """
      Alpha pension draw age must be at least 57 for access dates on or after 6 April 2028.
      """

  Rule: Combined projections retain the separate Alpha components

  @end-to-end @alpha @added-pension @early-retirement @cpi
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
    Then the unreduced standard alpha pension at draw age should be 25962.95
    And the purchased annual Added Pension should be 362.10
    And the combined unreduced annual pension should be 26325.05
    And the reduced annual pension breakdown should be:
      | component     | unreducedAnnualAmount | payableAnnualAmount | annualReduction |
      | standardAlpha | 25962.95              | 18174.06            | 7788.88         |
      | addedPension  | 362.10                | 253.47              | 108.63          |
      | total         | 26325.05              | 18427.53            | 7897.51         |


  Rule: Results explain the material Alpha assumptions and components

  @display @explainability
  Scenario: Show Alpha revaluation assumptions used in the result
    Given the member has completed an alpha pension projection
    When the pension result is displayed
    Then the Alpha revaluation assumptions should include:
      | assumption                    |
      | Inflation                     |
      | Alpha in-service revaluation  |
      | Deferred Alpha increase       |

  @display @explainability
  Scenario: Show Alpha pension components in the projection table
    Given the member has standard alpha pension
    And the member has Added Pension
    And the member has EPA pension
    When the pension result is displayed
    Then the Alpha projection table should include columns:
      | column                                   |
      | Monthly Added Pension                    |
      | Lump sum added pension                   |
      | Standard Alpha Pension                   |
      | EPA Alpha Pension                        |
      | Annual Accrued Alpha Pension             |
      | Annual Alpha Pension Including Reduction |
