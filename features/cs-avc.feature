@civil-service-pension @cs-avc @avc
Feature: Civil Service AVC modelling

  The modeller should let users model Civil Service Additional Voluntary
  Contributions (CS AVC) as a separate invested defined contribution pension
  pot. CS AVC values should not be mixed into alpha, classic, premium, nuvos,
  Added Pension, EPA, State Pension, SIPP, ISA, or LISA modelling.

  Background:
    Given a default CS AVC modelling scenario

  @scheme-status
  Scenario: Show CS AVC as a separate defined contribution pension pot
    When the CS AVC settings group is inspected
    Then the CS AVC group should be titled "Civil Service AVC"
    And the CS AVC current pot field should explain it is a separate invested defined contribution pot
    And the CS AVC current pot field should not describe alpha, classic, premium or nuvos accrual

  @scheme-status
  Scenario: CS AVC is not treated as Civil Service defined benefit pension accrual
    Given the CS AVC member has alpha pension of 12000.00 per year
    And the member has a CS AVC balance of 30000.00
    When the Civil Service pension projection is calculated for CS AVC
    Then the alpha pension projection should match the same scenario without CS AVC
    And the CS AVC balance should be shown separately from Civil Service pension payable

  @contributions
  Scenario: Project regular CS AVC contributions into the invested pot
    Given the member has a CS AVC balance of 10000.00
    And the member pays CS AVC contributions of 250.00 per month
    And the annual CS AVC net investment return assumption is 0.00%
    When the CS AVC pot is projected for 12 months
    Then the projected CS AVC balance should be 13000.00
    And the total CS AVC contributions paid should be 3000.00

  @contributions
  Scenario: Do not add employer contributions to CS AVC
    Given the member has a CS AVC balance of 10000.00
    And the member pays CS AVC contributions of 250.00 per month
    And the employer Civil Service pension contribution rate is 28.97%
    When the CS AVC pot is projected for 12 months
    Then the projected CS AVC balance should include member CS AVC contributions only
    And the employer contribution added to the CS AVC pot should be 0.00

  @investment-growth
  Scenario Outline: Apply net investment return to the CS AVC pot
    Given the member has a CS AVC balance of <startingBalance>
    And the member pays CS AVC contributions of <monthlyContribution> per month
    And the annual CS AVC net investment return assumption is <netReturn>
    When the CS AVC pot is projected for <projectionYears> years
    Then the projected CS AVC balance should be <expectedBalance>

    Examples:
      | startingBalance | monthlyContribution | netReturn | projectionYears | expectedBalance |
      | 10000.00        | 0.00                | 0.00%     | 5               | 10000.00        |
      | 10000.00        | 200.00              | 0.00%     | 5               | 22000.00        |
      | 10000.00        | 0.00                | 3.50%     | 5               | 11842.86        |

  @access-age
  Scenario: Apply the standard private pension access age to CS AVC drawdown
    Given a CS AVC modelling scenario for someone born on "1972-08-01"
    And provider-confirmed CS AVC protected pension age is off
    When the CS AVC draw start age is 55
    Then CS AVC draw start age validation should pass
    When the CS AVC draw start age is 56
    Then the CS AVC draw start age validation message should be "CS AVC draw start age must be at least 57 for access dates on or after 6 April 2028, unless your provider has confirmed a protected pension age."
    When the CS AVC draw start age is 57
    Then CS AVC draw start age validation should pass

  @access-age
  Scenario: Use a provider-confirmed protected CS AVC access age
    Given a CS AVC modelling scenario for someone born on "1980-08-01"
    And provider-confirmed CS AVC protected access is on
    When the CS AVC draw start age is 50
    Then CS AVC draw start age validation should pass
    And the CS AVC projection should start withdrawals at age 50
    When the CS AVC draw start age is 49
    Then the CS AVC draw start age validation message should be "CS AVC draw start age must not be earlier than the provider-confirmed protected CS AVC access age of 50."

  @access-age
  Scenario: Let CS AVC benefits start independently of Civil Service pension
    Given the CS AVC member has alpha normal pension age 67
    And the member has a CS AVC balance of 60000.00
    And the member draws CS AVC from age 57
    And the CS AVC member draws alpha pension from age 67
    When the retirement income projection is calculated for CS AVC
    Then CS AVC income should be available from age 57
    And CS AVC scenario alpha pension income should start at age 67

  @draw-options
  Scenario: Include taxable CS AVC withdrawals in retirement income tax estimates
    Given CS AVC Income Tax modelling is on
    And the CS AVC tax-free withdrawal share is 25.00%
    And CS AVC monthly Alpha pension income is 2000.00
    And CS AVC monthly State Pension income is 1000.00
    And monthly CS AVC withdrawal income is 800.00
    When monthly Income Tax is calculated for CS AVC
    Then only 600.00 of monthly CS AVC withdrawal income should be taxable
    And the monthly Income Tax estimate should include taxable CS AVC income

  @bridge
  Scenario: Use CS AVC to reduce the early retirement bridge funding gap
    Given the CS AVC bridge plan has Alpha pension of 18000.00 per year from age 67
    And the CS AVC bridge plan has State Pension of 12000.00 per year from age 67
    And the CS AVC bridge plan has a CS AVC balance of 50000.00
    And the CS AVC bridge retirement age is 57
    And the CS AVC bridge life expectancy age is 68
    And the CS AVC bridge target income is 24000.00 per year
    When the CS AVC bridge plan is analysed
    Then at least one CS AVC bridge phase should include "Civil Service AVC"
    And the unfunded bridge shortfall should be lower than the same plan without CS AVC

  @summary
  Scenario: Keep secure pension income separate from flexible CS AVC income
    Given the CS AVC member has alpha pension of 18000.00 per year
    And the CS AVC member has State Pension of 12000.00 per year
    And the member has planned CS AVC withdrawals of 6000.00 per year
    When the retirement income summary is generated for CS AVC
    Then stable annual secure income should include alpha pension and State Pension
    And flexible pension income should include CS AVC withdrawals
    And stable annual secure income should not include CS AVC withdrawals

  @storage
  Scenario: Persist CS AVC settings locally only
    Given the member has a CS AVC balance of 30000.00
    And the member pays CS AVC contributions of 250.00 per month
    And local storage is enabled for CS AVC
    When the CS AVC settings are saved and loaded
    Then the loaded CS AVC settings should include a balance of 30000.00
    And the loaded CS AVC settings should include monthly contributions of 250.00
    And no CS AVC financial information should be transmitted externally

  @copy
  Scenario: Explain CS AVC modelling without regulated advice wording
    When the CS AVC user-facing copy is inspected
    Then the CS AVC copy should include "separate invested defined contribution pot"
    And the CS AVC copy should include "provider has confirmed"
    And the CS AVC copy should not include "you will receive"
    And the CS AVC copy should not include "you should"
    And the CS AVC copy should not imply the modeller is an official Civil Service Pension Scheme calculator
